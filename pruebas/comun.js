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

/* Un teléfono y un escritorio. Casi todo se prueba en el teléfono, porque es
   donde se lee; el escritorio entra donde el ancho cambia el comportamiento. */
const TELEFONO = { viewport:{ width:412, height:915 }, isMobile:true, hasTouch:true };
const ESCRITORIO = { viewport:{ width:1100, height:820 } };

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

/* Abre la aplicación y devuelve la página, con los errores de JavaScript ya
   recogidos: que el programa no tire una excepción es parte de cada prueba y
   no algo que haya que acordarse de mirar. */
async function abrir(opciones = {}){
  const navegador = await chromium.launch({ executablePath: EJECUTABLE });
  const pagina = await navegador.newPage({ ...TELEFONO, ...opciones });
  const errores = [];
  pagina.on('pageerror', e => errores.push(String(e).split('\n')[0]));
  await pagina.goto(opciones.url || APP);
  await pagina.waitForTimeout(opciones.espera || 2600);
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

/* El cierre: comprueba que no hubo excepciones, resume y decide el código de
   salida. Sin esto último las pruebas no sirven para nada automático. */
async function cerrar(sesion){
  const { navegador, errores } = sesion;
  vale('sin errores de JavaScript', errores.length === 0,
       errores.length ? errores : 'ninguno');
  await navegador.close();
  const total = aciertos + fallos;
  console.log('\n  ' + nombre + ': ' + aciertos + '/' + total +
              (fallos ? '  ***  ' + fallos + ' FALLO' + (fallos>1?'S':'') + '  ***' : '  todo bien'));
  process.exitCode = fallos ? 1 : 0;
}

module.exports = { abrir, cerrar, conGlosas, di, vale, titulo, APP, RAIZ, TELEFONO, ESCRITORIO };
