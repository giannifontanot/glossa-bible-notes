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

/* ---------- GLOSAR PINTANDO CON EL DEDO ----------

   El pasaje dejó de seleccionarse: ahora se pinta. Y eso obliga a cambiar los
   sitios de esta carpeta que creaban glosas con getSelection().addRange(),
   porque con user-select:none una selección puesta a mano se serializa VACÍA
   —comprobado, el panel ya no abría— y ese camino dejó de existir.

   El gesto va entero y de verdad, sin atajos:

   · EL DEDO SE QUEDA ANTES DE ARRASTRAR. Por debajo de ESPERA_SELECCION —280
     ms— un desliz de lado PASA LA HOJA, y eso no ha cambiado. Sin la espera,
     lo que se prueba es el pase de hoja y el trazo se va con ella. Esto costó
     una tarde: la sonda pintaba, soltaba, y al tocar encontraba el lienzo del
     pliegue en vez del papel.
   · EL TRAZO VA TORCIDO, como cualquier dedo de esta carpeta.
   · Y SON DOS TIEMPOS: se pinta, se levanta, y se toca encima. El toque es el
     que abre la glosa, igual que antes lo abría el toque sobre lo
     seleccionado.

   Se instala como guion de arranque para que esté en todas las páginas de
   todas las suites sin que cada una tenga que acordarse. */
/* EL PINCEL DICE POR QUÉ NO PUDO, y antes se callaba.

   Devolvía null y el que llamaba respondía { sinTexto:true }, que es una
   suposición y muchas veces era falsa: el gesto no arranca si el punto de
   salida no tiene texto debajo —lo tapan los cantos de pasar hoja, o una capa
   abierta encima de la hoja—, y eso no es «sin texto». Con cuatro bloques en
   rojo diciendo lo mismo no había manera de saber cuál de las causas era.
   Ahora la razón queda en window.__pincelPorque y quien llama la puede
   enseñar. */
const PINCEL = `window.__pincelPorque = null;
window.__pintarGlosa = async (nodo, ini, fin) => {
  const pgBody = document.getElementById('pgBody');
  window.__pincelPorque = null;
  if (!pgBody){ window.__pincelPorque = 'no hay #pgBody'; return false; }
  if (!nodo){ window.__pincelPorque = 'sin nodo de texto'; return false; }
  const pausa = ms => new Promise(z => setTimeout(z, ms));
  const caja = (a, b) => { const r = document.createRange();
    r.setStart(nodo, a); r.setEnd(nodo, b); return r.getBoundingClientRect(); };
  const A = caja(ini, Math.min(ini + 1, fin)), B = caja(Math.max(ini, fin - 1), fin);
  /* EL DEDO TIENE QUE CAER SOBRE EL TEXTO, y el centro de una letra no siempre
     lo hace: los cantos de pasar hoja son dos franjas de 30 px encima de la
     hoja, y la primera letra de un renglon cae debajo del de la izquierda. Ahi
     caretPositionFromPoint devuelve el DIV del canto, puntoA no encuentra
     versiculo y el gesto no llega a empezar — sin error y sin pintar nada.
     Costo cuatro suites en rojo: todas las que pedian un tramo desde la letra
     0. Un lector de verdad tampoco empieza ahi; empieza un poco mas adentro.
     Asi que el punto se corre a la derecha hasta que de verdad haya texto
     debajo, igual que haria un dedo. */
  const sobreTexto = (x, y) => {
    const cp = document.caretPositionFromPoint ? document.caretPositionFromPoint(x, y)
             : (document.caretRangeFromPoint
                ? (function(){ const g = document.caretRangeFromPoint(x, y);
                               return g && { offsetNode: g.startContainer }; })() : null);
    const n = cp && cp.offsetNode;
    return !!(n && n.nodeType === 3 && pgBody.contains(n));
  };
  const acomodar = (c) => {
    let x = Math.round(c.left + c.width / 2), y = Math.round(c.top + c.height / 2);
    for (let i = 0; i < 40 && !sobreTexto(x, y); i++) x += 2;
    return { x, y, vale: sobreTexto(x, y) };
  };
  const a = acomodar(A), b = acomodar(B);
  if (!a.vale){
    /* Quién está encima, que es lo que hace falta saber para arreglarlo. */
    const el = document.elementFromPoint(a.x, a.y);
    window.__pincelPorque = 'el punto de salida (' + a.x + ',' + a.y +
      ') no tiene texto debajo; encima hay ' +
      (el ? (el.tagName + (el.id ? '#' + el.id : '') +
             (el.className ? '.' + String(el.className).split(' ')[0] : '')) : 'nada');
    return false;
  }
  const x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y;
  const op = (x, y) => ({ bubbles:true, cancelable:true, pointerId:64,
                          pointerType:'touch', isPrimary:true, clientX:x, clientY:y });
  pgBody.dispatchEvent(new PointerEvent('pointerdown', op(x0, y0)));
  await pausa(340);
  for (let i = 1; i <= 4; i++){
    const t = i / 4;
    pgBody.dispatchEvent(new PointerEvent('pointermove',
      op(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t + (i % 2 ? 1 : -1)))));
    await pausa(25);
  }
  pgBody.dispatchEvent(new PointerEvent('pointerup', op(x1, y1)));
  await pausa(140);
  /* Se devuelve DÓNDE hay que tocar en vez de tocar aquí: hay pruebas que
     miden el panel a los 45 ms de nacer, y ésas necesitan dar ellas el toque
     para poder mirar justo después. Ver __glosarEn, que es el camino corto. */
  return { x: x0, y: y0 };
};
window.__tocarLoPintado = async (donde) => {
  const pgBody = document.getElementById('pgBody');
  if (!pgBody || !donde) return false;
  const pausa = ms => new Promise(z => setTimeout(z, ms));
  const op = (x, y) => ({ bubbles:true, cancelable:true, pointerId:65,
                          pointerType:'touch', isPrimary:true, clientX:x, clientY:y });
  pgBody.dispatchEvent(new PointerEvent('pointerdown', op(donde.x, donde.y)));
  await pausa(40);
  pgBody.dispatchEvent(new PointerEvent('pointerup', op(donde.x, donde.y)));
  await pausa(520);
  return !!document.getElementById('glosaCaja');
};
/* El atajo de siempre: el primer nodo de texto largo de un versiculo. */
window.__pintarEn = async (v, ini, fin) => {
  window.__pincelPorque = null;
  if (!v){ window.__pincelPorque = 'no se pasó versículo'; return null; }
  const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null, mayor = 0;
  while (w.nextNode()){
    mayor = Math.max(mayor, w.currentNode.textContent.trim().length);
    if (!n && w.currentNode.textContent.trim().length > (fin + 4)) n = w.currentNode;
  }
  if (!n){
    window.__pincelPorque = 'el versículo no tiene un nodo de más de ' + (fin + 4) +
      ' letras; el mayor es de ' + mayor;
    return null;
  }
  return window.__pintarGlosa(n, ini, fin);
};
/* DESPEJAR LA HOJA ANTES DE GLOSAR, y hace falta desde esta rama.

   Con la seleccion, el panel se abria en UN gesto: se soltaba el dedo sobre
   lo apuntado y ya. Pintando son DOS —se pinta, y luego se toca encima para
   confirmar—, y ese segundo toque choca con cualquier capa que hubiera
   quedado abierta: la ventanita del versiculo se lo come para cerrarse, que
   es lo que tiene que hacer una capa, y el panel no llega a abrirse. El
   programa se porta bien; lo que cambio es que ahora hace falta un gesto mas,
   y un bloque que dejaba la ventanita puesta ya no puede glosar detras.

   Medido: con la ventanita abierta, el pincel pinta y el toque no abre nada;
   con un Escape antes, abre. Eso valio diecinueve aserciones de navegar en la
   primera tanda de la rama.

   Es lo mismo que haria un lector: cerrar lo que tiene delante antes de
   marcar. No toca nada del programa.

   Y NO LO HACE EN SILENCIO, que era el peligro de meterlo aqui: un andamio
   que cierra capas por su cuenta puede tapar el dia en que una capa aparezca
   donde no debe. Solo pulsa si de verdad hay algo abierto, y deja apuntado
   que lo pulso en window.__pincelDespejo, para que quien sospeche lo pueda
   mirar. */
window.__capasAbiertas = () => ['versoPleno', 'sepMenu', 'sepOferta', 'escenas']
  .filter(id => { const e = document.getElementById(id);
                  return e && e.classList.contains('visible'); });
window.__despejar = async () => {
  const habia = window.__capasAbiertas();
  if (!habia.length) return habia;
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
  await new Promise(z => setTimeout(z, 260));
  return habia;
};
window.__glosarEn = async (v, ini, fin) => {
  window.__pincelDespejo = await window.__despejar();
  const donde = await window.__pintarEn(v, ini, fin);
  if (!donde) return false;
  const abrio = await window.__tocarLoPintado(donde);
  if (!abrio) window.__pincelPorque = 'se pintó, pero el toque de encima no abrió la caja';
  return abrio;
};`;

/* ESPERAR A QUE LA MESA ESTÉ DESTAPADA, no a que pase un rato. La portada
   cubre la pantalla entera con pointer-events puestos hasta que la primera
   hoja está pintada, y tiene además un mínimo de tiempo para que el letrero
   se lea. Un plazo fijo en las pruebas era una carrera: si la portada tardaba
   un milisegundo más, el toque de la prueba se lo comía la portada y el fallo
   salía en cualquier otra parte —la caja que no abre, la marca que no
   responde— sin decir por qué. Esperamos la señal real: la portada fuera. */
/* LA TAPA YA NO SE VA SOLA: HAY QUE DECIRLE «continue».

   Antes esto solo esperaba. La portada contaba cinco segundos y se iba, así
   que el andamio no tenía más que sentarse a mirar. Ahora la tapa espera al
   lector, y un andamio que solo esperara colgaría las veinte pruebas de la
   carpeta contra el tope de doce segundos, cada una.

   Se espera A QUE LA HOJA ESTÉ DETRÁS antes de pulsar, y no a que el botón
   exista: el botón está escrito en el documento desde el primer instante y su
   oyente se pone durante el arranque, así que un clic demasiado pronto cae en
   un botón que todavía no escucha y la prueba se queda con la tapa puesta sin
   entender por qué.

   Y NO SIEMPRE HAY TAPA. Quien estuvo aquí hace menos de cinco minutos entra
   directo, y en una prueba eso pasa en cuanto se recarga: la primera llamada
   pasa la tapa y sella la visita, y de ahí en adelante ya no hay nada que
   pulsar. Las dos ramas terminan igual, así que quien llame no se entera. */
async function listo(pagina, tope = 12000){
  try {
    await pagina.waitForFunction(() => {
      const p = document.getElementById('portada');
      if (!p || p.classList.contains('fuera')) return true;
      return !!document.querySelector('#pgBody .v');
    }, null, { timeout: tope });
    await pagina.evaluate(() => {
      const p = document.getElementById('portada');
      const b = document.getElementById('btnPortadaSeguir');
      if (p && !p.classList.contains('fuera') && b) b.click();
    });
    await pagina.waitForFunction(() => {
      const p = document.getElementById('portada');
      return !p || p.classList.contains('fuera');
    }, null, { timeout: tope });
  } catch (e) { /* si no se va, que falle la prueba diciendo lo suyo */ }
  await pagina.waitForTimeout(120);
}

/* OTRA PESTAÑA EN EL MISMO NAVEGADOR, CON EL PINCEL PUESTO.

   Hay bloques que necesitan una página limpia sin pagar otro arranque de
   navegador, y la pedían con `sesion.navegador.newPage(...)` a pelo. Eso se
   salta el guion del PINCEL, que solo instala abrir(); desde que el texto se
   glosa pintando, una página sin pincel no puede ni abrir el panel, y el
   fallo sale como «window.__pintarGlosa is not a function» a mitad del
   bloque, lejos de donde está la causa. Se envuelve aquí para que no haya que
   acordarse. */
async function otraPagina(navegador, opciones = {}){
  const pagina = await navegador.newPage({ ...TELEFONO, ...opciones });
  await pagina.addInitScript(PINCEL);
  return pagina;
}

/* Abre la aplicación y devuelve la página, con los errores de JavaScript ya
   recogidos: que el programa no tire una excepción es parte de cada prueba y
   no algo que haya que acordarse de mirar. */
async function abrir(opciones = {}){
  const navegador = await chromium.launch({ executablePath: EJECUTABLE });
  const pagina = await navegador.newPage({ ...TELEFONO, ...opciones });
  const errores = [];
  pagina.on('pageerror', e => errores.push(String(e).split('\n')[0]));
  await pagina.addInitScript(PINCEL);
  /* Toda recarga espera también: las pruebas recargan en veinte sitios y
     ninguna tiene por qué acordarse de la portada. */
  const recargar = pagina.reload.bind(pagina);
  pagina.reload = async (...a) => { const r = await recargar(...a); await listo(pagina); return r; };
  await pagina.goto(opciones.url || APP);
  await pagina.waitForTimeout(opciones.espera || 2600);
  await listo(pagina);
  return { navegador, pagina, errores };
}

/* ABRIR Y QUEDARSE EN LA PORTADA, que es lo contrario de lo que hace abrir().

   La portada tiene botones propios —continue, foto, Piedras— y para probarlos
   hay que llegar con ella puesta. abrir() hace justo lo contrario: pulsa
   «continue» y espera a que se haya ido. Envolverla con una opción no servía, porque el envoltorio de
   reload() de abrir() también espera a que se vaya, y la prueba de la portada
   recarga para comprobar que el adorno vuelve; con ese envoltorio cada recarga
   se comía los doce segundos del tope antes de seguir. Así que esta abre y
   devuelve, sin esperar a nada, y quien la use decide cuándo mira. */
async function abrirEnPortada(opciones = {}){
  /* visitaHace: milisegundos desde la última visita, sembrados ANTES de que el
     documento arranque. Hace falta así y no de otra manera: el programa decide
     si enseña la tapa en su primer renglón, y tocando el almacén desde la
     página ya cargada se llega tarde. Poniéndolo desde la página tampoco
     valdría para una recarga: al irse, la página sella la visita otra vez y lo
     sembrado se pierde. */
  const { visitaHace, url, ...deNavegador } = opciones;
  const navegador = await chromium.launch({ executablePath: EJECUTABLE });
  const pagina = await navegador.newPage({ ...TELEFONO, ...deNavegador });
  const errores = [];
  pagina.on('pageerror', e => errores.push(String(e).split('\n')[0]));
  await pagina.addInitScript(PINCEL);
  if (visitaHace != null)
    await pagina.addInitScript(([k, t]) => {
      try { localStorage.setItem(k, String(t)); } catch(_){}
    }, ['glossa:visita:v1', Date.now() - visitaHace]);
  else
    /* SIN SELLO, Y EN CADA CARGA. Esta función promete quedarse en la portada,
       y sin esto dejaba de cumplirlo a la primera recarga: la prueba de la
       portada pulsa «continue» a media faena y sigue decorando después, y en
       cuanto la tapa se pasa una vez, la visita queda sellada y las recargas
       siguientes entran directas al libro. Lo que quedaba entonces era una
       tapa invisible: sus piedras y su foto siguen en el documento, así que
       todo lo que mira datos guardados pasaba igual, y solo se caía lo que
       necesita ver —el foco no entra en algo con visibility:hidden—. Tres
       aserciones en rojo y ninguna hablando de la causa.
       Va como guion de arranque porque hay que ganarle a pagehide: la página
       que se va sella la visita, así que borrar el sello desde la página vieja
       no serviría de nada. */
    await pagina.addInitScript(k => { try { localStorage.removeItem(k); } catch(_){} },
                               'glossa:visita:v1');
  await pagina.goto(url || APP);
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

module.exports = { abrir, abrirEnPortada, otraPagina, listo, cerrar, cerrarParcial, fin, conGlosas, di, vale, titulo,
                   APP, RAIZ, TELEFONO, ESCRITORIO, ESTRECHO_RATON };
