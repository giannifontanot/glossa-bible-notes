/* ============================================================
   EL ANDAMIO DE LAS PRUEBAS.

   Todas las pruebas de esta carpeta manejan la aplicación como la maneja un
   dedo: abren index.html en un navegador de verdad, tocan, arrastran y miden
   lo que queda en pantalla. No hay simulacros ni funciones llamadas por
   dentro, y es a propósito: los fallos que ha tenido este programa —el pliegue
   que reventaba con dos toques seguidos, el rótulo que no respondía con ratón,
   la hoja medida a media transición— no se ven desde dentro. Solo se ven
   tocando.

   Dos reglas que costaron caro y por eso están escritas aquí arriba:

   1. NADA DE .click() PROGRAMÁTICO PARA GESTOS. Un click sintético no pasa por
      la captura del puntero, así que se saltaba justo el camino donde vivía el
      fallo. Para gestos se mandan PointerEvent con su pointerId y su
      pointerType.
   2. LOS GESTOS VAN TORCIDOS. Un arrastre matemáticamente recto no existe:
      un dedo real tiembla, y ese temblor mataba el gesto del cajón. Si una
      prueba dibuja una línea perfecta, está probando otra cosa.

   Y una regla sobre los márgenes: se sacan del RUIDO MEDIDO, no de lo que
   parezca razonable. Una prueba con un umbral por debajo de su propio ruido
   canta fallos que no existen, y eso enseña a ignorarla — que es peor que no
   tenerla.
   ============================================================ */
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const APP = 'file://' + path.join(RAIZ, 'index.html');

/* EL NAVEGADOR, y por qué no basta con dejárselo a Playwright.

   Lo normal es `npx playwright install chromium` y olvidarse. Pero en algunos
   entornos —contenedores con los navegadores ya puestos— el Chromium está
   instalado en otro sitio y con otro número de versión que el que Playwright
   espera, así que su búsqueda falla con un mensaje que invita a reinstalar lo
   que ya está.
   Orden: lo que diga CHROMIUM, si no lo que se encuentre bajo
   PLAYWRIGHT_BROWSERS_PATH, y si no, lo que Playwright resuelva por su cuenta. */
function buscarChromium(){
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base) return undefined;
  try {
    const fs = require('fs');
    for (const d of fs.readdirSync(base).filter(x => /^chromium-/.test(x)).sort().reverse()){
      const c = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(c)) return c;
    }
  } catch(e){ /* que lo resuelva Playwright */ }
  return undefined;
}
const EJECUTABLE = buscarChromium();

/* LOS TRES CONTEXTOS, Y POR QUÉ SON TRES Y NO DOS.

   Casi todo se prueba en el teléfono, que es donde se lee. Pero hay un camino
   del programa —el arrastre del papel— que solo se enciende cuando la hoja es
   MÁS ANCHA que la ventana: `sobraPapel()` mira si hay desbordamiento. En un
   escritorio ancho el papel cabe, no hay arrastre, y con él desaparece la
   captura del puntero. Ahí estuvo escondido meses el fallo de los rótulos: la
   captura reasigna el clic de compatibilidad al elemento que captura, y eso
   pasa CON RATÓN y no con dedo. O sea que solo se veía en la esquina de las
   tres condiciones: ventana estrecha, puntero de ratón, papel desbordado.
   Por eso hace falta el tercero. Probar el ancho y creer que se cubre el
   estrecho es lo que dejó esa esquina sin red.

   isMobile y hasTouch van escritos también en los de ratón: las opciones se
   funden por encima, así que omitirlos dejaba puestos los del teléfono y el
   "escritorio" seguía teniendo dedo. */
const TELEFONO = { viewport:{ width:412, height:915 }, isMobile:true, hasTouch:true };
const ESCRITORIO = { viewport:{ width:1100, height:820 }, isMobile:false, hasTouch:false };
const ESTRECHO_RATON = { viewport:{ width:390, height:844 }, isMobile:false, hasTouch:false };

let fallos = 0, aciertos = 0;
const nombre = path.basename(process.argv[1] || 'prueba');

/* Enseñar un dato medido. No juzga: hay cifras que solo se entienden mirando
   la serie entera, y esconderlas detrás de un OK las pierde. */
function di(rotulo, valor){
  console.log('   ' + String(rotulo).padEnd(34),
              typeof valor === 'string' ? valor : JSON.stringify(valor));
}

/* Juzgar. El detalle se imprime SIEMPRE, no solo al fallar: cuando una prueba
   se rompe dentro de seis meses, la cifra de cuando iba bien es la mitad del
   diagnóstico. */
function vale(rotulo, condicion, detalle){
  const ok = !!condicion;
  ok ? aciertos++ : fallos++;
  console.log('   ' + (ok ? '✓' : '✗') + ' ' + String(rotulo).padEnd(32) +
              (detalle === undefined ? ''
               : (typeof detalle === 'string' ? detalle : JSON.stringify(detalle))));
  return ok;
}

function titulo(t){ console.log('\n  ' + t); }

/* ESPERAR A QUE LA MESA ESTÉ DESTAPADA, no a que pase un rato. La portada
   cubre la pantalla entera con pointer-events puestos hasta que la primera
   hoja está pintada, y tiene además un mínimo de tiempo para que el letrero
   se lea. Un plazo fijo en las pruebas era una carrera: si la portada tardaba
   un milisegundo más, el toque de la prueba se lo comía la portada y el fallo
   salía en cualquier otra parte —la caja que no abre, la marca que no
   responde— sin decir por qué. Esperamos la señal real: la portada fuera. */
async function listo(pagina, tope = 12000){
  try {
    await pagina.waitForFunction(() => {
      const p = document.getElementById('portada');
      return !p || p.classList.contains('fuera');
    }, null, { timeout: tope });
  } catch (e) { /* si no se va, que falle la prueba diciendo lo suyo */ }
  await pagina.waitForTimeout(120);
}

/* Abre la aplicación y devuelve la página, con los errores de JavaScript ya
   recogidos: que el programa no tire una excepción es parte de cada prueba y
   no algo que haya que acordarse de mirar. */
async function abrir(opciones = {}){
  const navegador = await chromium.launch({ executablePath: EJECUTABLE });
  const pagina = await navegador.newPage({ ...TELEFONO, ...opciones });
  const errores = [];
  pagina.on('pageerror', e => errores.push(String(e).split('\n')[0]));
  /* Toda recarga espera también: las pruebas recargan en veinte sitios y
     ninguna tiene por qué acordarse de la portada. */
  const recargar = pagina.reload.bind(pagina);
  pagina.reload = async (...a) => { const r = await recargar(...a); await listo(pagina); return r; };
  await pagina.goto(opciones.url || APP);
  await pagina.waitForTimeout(opciones.espera || 2600);
  await listo(pagina);
  return { navegador, pagina, errores };
}

/* Sembrar glosas de ejemplo antes de arrancar, para las pruebas que necesitan
   notas ya puestas. Se recarga después porque el programa las lee al abrir. */
async function conGlosas(pagina){
  const fs = require('fs');
  const datos = fs.readFileSync(path.join(RAIZ, 'glosas-ejemplo-mateo-apocalipsis.json'), 'utf8');
  await pagina.evaluate(t =>
    localStorage.setItem('glossa:marcas:v1', JSON.stringify(JSON.parse(t).marcas)), datos);
  await pagina.reload();
  await pagina.waitForTimeout(2600);
}

/* CERRAR UNA SESIÓN INTERMEDIA. Las pruebas que abren varios navegadores
   —dedo y ratón, movimiento normal y reducido— tienen que revisar los errores
   de CADA uno. Cerrando a pelo, una excepción que solo ocurriera en el primero
   se perdía entera y la prueba terminaba en verde. */
async function cerrarParcial(sesion, comoSeLlama){
  const { navegador, errores } = sesion;
  vale('sin errores de JavaScript' + (comoSeLlama ? ' (' + comoSeLlama + ')' : ''),
       errores.length === 0, errores.length ? errores : 'ninguno');
  await navegador.close();
}

/* LA CUENTA FINAL, SUELTA DEL NAVEGADOR. Vivía dentro de cerrar(), y una
   prueba que abre y cierra varias sesiones —piedra abre cinco solo para las
   fotos del pliegue— imprimía una cuenta por cada cierre. Leyendo la corrida
   parecía que la prueba había terminado a la mitad, con un total que todavía
   iba a crecer, y una aserción posterior salía DESPUÉS del resumen. La cifra
   final era buena y el código de salida también, pero nadie que lea eso puede
   saberlo. Ahora las sesiones intermedias se cierran con cerrarParcial y la
   cuenta se pide una sola vez, al final. */
function fin(){
  const total = aciertos + fallos;
  console.log('\n  ' + nombre + ': ' + aciertos + '/' + total +
              (fallos ? '  ***  ' + fallos + ' FALLO' + (fallos>1?'S':'') + '  ***' : '  todo bien'));
  process.exitCode = fallos ? 1 : 0;
}

/* El cierre final: comprueba que no hubo excepciones, resume y decide el
   código de salida. Sin esto último las pruebas no sirven para nada
   automático. */
async function cerrar(sesion){
  const { navegador, errores } = sesion;
  vale('sin errores de JavaScript', errores.length === 0,
       errores.length ? errores : 'ninguno');
  await navegador.close();
  fin();
}

module.exports = { abrir, listo, cerrar, cerrarParcial, fin, conGlosas, di, vale, titulo,
                   APP, RAIZ, TELEFONO, ESCRITORIO, ESTRECHO_RATON };
