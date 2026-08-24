/* IR A UNA ESCRITURA: LEERLA PRIMERO, SALTAR DESPUÉS, Y PODER VOLVER.

   Tres cosas que hasta ahora eran tres caminos distintos y ahora son uno:

   1. Una referencia dentro de una glosa ya no salta de cabeza. Abre la misma
      ventanita que abre una fila del historial, con el texto del versículo; el
      salto lo dispara el texto de la ventanita. La mayoría de las veces la
      pregunta no es «llévame» sino «qué dice», y contestarla costaba un salto
      entero de ida y otro de vuelta.
   2. Lo mismo dentro de la caja de escribir del panel. Ahí no hay nada que
      tocar —es un textarea— así que se mira en qué carácter cayó el cursor.
   3. El rastro apunta también DE DÓNDE saltaste, y tiene un paso atrás. Sin el
      de dónde, el historial contaba tres destinos sueltos sin el hilo que los
      unía; y el paso atrás no se apunta, porque apuntarlo lo convertiría en un
      columpio entre dos escrituras. */
const { abrir, cerrar, conGlosas, di, vale, titulo } = require('./comun');

const RASTRO = () => JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]')
  .map(h => h.libro + ' ' + h.cap + ':' + h.vers);

/* Los saltos entre libros son largos de verdad —repaginan y voltean un bonche
   entero— y el rastro se apunta al ATERRIZAR, no al pedirlo. Medido: con 2.6 s
   la lista todavía estaba vacía y parecía un fallo del programa. */
const ATERRIZA = 7000;

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  await conGlosas(p);

  titulo('una referencia de una glosa abre la ventanita, no salta');
  di('al tocarla', await p.evaluate(async () => {
    const r = document.querySelector('#pgMargin .ref:not(.muerta), ' +
                                     '#pgFoot .ref:not(.muerta), #pgBody .ref:not(.muerta)');
    if (!r) return { sinRef:true };
    const antes = document.querySelectorAll('#pgBody .v').length;
    const primero = (document.querySelector('#pgBody .v')||{}).textContent;
    r.click();
    await new Promise(z => setTimeout(z, 400));
    const vp = document.getElementById('versoPleno');
    return { visible: vp.classList.contains('visible'),
             ref: (vp.querySelector('.vp-ref')||{}).textContent,
             largoTexto: ((vp.querySelector('.vp-txt')||{}).textContent || '').length,
             /* y la hoja sigue donde estaba: leer no es ir */
             sigueAqui: document.querySelectorAll('#pgBody .v').length === antes &&
                        (document.querySelector('#pgBody .v')||{}).textContent === primero };
  }).then(r => {
    vale('sale la ventanita', !r.sinRef && r.visible);
    vale('  con la referencia resuelta', !!r.ref, r.ref);
    vale('  y el texto del versículo', r.largoTexto > 20, r.largoTexto + ' letras');
    vale('  sin haber saltado a ningún sitio', r.sigueAqui);
    return r;
  }));

  titulo('tocar el texto sí salta, y deja el de dónde apuntado');
  di('tras saltar', await p.evaluate(async (espera) => {
    const antes = JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]').length;
    const b = document.querySelector('#versoPleno .vp-txt');
    if (!b) return { sinBoton:true };
    b.click();
    await new Promise(z => setTimeout(z, espera));
    return { antes, rastro: JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]')
      .map(h => h.libro + ' ' + h.cap + ':' + h.vers) };
  }, ATERRIZA).then(r => {
    /* DOS entradas de un solo salto: el destino arriba y de dónde saliste
       justo debajo. Antes se apuntaba solo el destino, y con tres saltos
       tenías tres escrituras sueltas sin el hilo que las unía. */
    vale('el salto apunta dos escrituras', !r.sinBoton && r.rastro.length === r.antes + 2,
         r.antes + ' → ' + r.rastro.length);
    vale('  el destino arriba y el origen debajo',
         r.rastro.length >= 2 && r.rastro[0] !== r.rastro[1], (r.rastro||[]).slice(0,2).join('  ←  '));
    return r;
  }));

  titulo('el paso atrás vuelve, y no se apunta');
  di('atrás', await p.evaluate(async (espera) => {
    document.getElementById('btnHistorial').click();
    await new Promise(z => setTimeout(z, 400));
    const b = document.querySelector('#historial [data-atras]');
    if (!b) return { sinBoton:true };
    const panel = document.getElementById('historial').getBoundingClientRect();
    const suyo = b.getBoundingClientRect();
    const rotulo = b.textContent.trim();
    const antes = JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]');
    b.click();
    await new Promise(z => setTimeout(z, espera));
    const despues = JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]');
    /* ¿llegamos? la fila de «estás aquí» tiene que ser la de atrás */
    document.getElementById('btnHistorial').click();
    await new Promise(z => setTimeout(z, 400));
    const aqui = [...document.querySelectorAll('#historial .hs-fila')]
      .map((f, i) => f.classList.contains('aqui') ? i : -1).filter(i => i >= 0);
    return { rotulo,
             /* pegado al filo derecho, que es donde se pidió */
             aLaDerecha: Math.abs(suyo.right - (panel.right - 6)) < 16,
             destino: antes[1].libro + ' ' + antes[1].cap + ':' + antes[1].vers,
             creció: despues.length - antes.length, aqui };
  }, ATERRIZA).then(r => {
    vale('hay paso atrás y dice a dónde', !r.sinBoton && /\d+:\d+/.test(r.rotulo || ''), r.rotulo);
    vale('  y va a la derecha', r.aLaDerecha);
    vale('el rastro no crece al volver', r.creció === 0, r.creció);
    /* Es lo que lo hace un ATRÁS y no un columpio: apuntando, el sitio de
       atrás pasaría a ser el primero y el siguiente «atrás» te devolvería a
       donde acababas de estar. */
    vale('  y de verdad estamos en la de atrás',
         (r.aqui || []).includes(1), 'filas marcadas: ' + JSON.stringify(r.aqui));
    return r;
  }));

  titulo('una escritura dentro de la caja de escribir');
  /* En la hoja las referencias son spans y se tocan; dentro del panel lo que
     hay es un textarea, que no deja marcar nada por dentro. Se mira en qué
     carácter cayó el cursor, con los mismos límites que tiene la hoja: solo
     por dentro de la referencia, solo sin nada seleccionado, y solo si la
     referencia existe de verdad. */
  di('tocando la referencia escrita', await p.evaluate(async () => {
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
    if (!n) return { sinTexto:true };
    const r = document.createRange(); r.setStart(n, 10); r.setEnd(n, 30);
    getSelection().removeAllRanges(); getSelection().addRange(r);
    const rc = r.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
    await new Promise(z => setTimeout(z, 500));
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = 'ver Mateo 5:9 y también algo más';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 150));
    const i = ta.value.indexOf('Mateo 5:9');
    const vp = document.getElementById('versoPleno');
    const tocar = async (a, b) => {
      vp.classList.remove('visible');
      ta.selectionStart = a; ta.selectionEnd = b === undefined ? a : b;
      ta.dispatchEvent(new MouseEvent('click', { bubbles:true }));
      await new Promise(z => setTimeout(z, 250));
      return vp.classList.contains('visible');
    };
    const dentro = await tocar(i + 4);
    const ref = (vp.querySelector('.vp-ref')||{}).textContent;
    const panelSigue = getComputedStyle(document.getElementById('menu')).display !== 'none';
    const fuera = await tocar(1);
    const enElFilo = await tocar(i);
    const arrastrando = await tocar(i + 1, i + 5);
    return { dentro, ref, panelSigue, fuera, enElFilo, arrastrando };
  }).then(r => {
    vale('por dentro abre la ventanita', !r.sinPanel && r.dentro, r.ref);
    vale('  y el panel sigue abierto detrás', r.panelSigue);
    vale('fuera de la referencia, nada', r.fuera === false);
    /* Los filos se dejan libres para poder corregir lo de al lado sin que se
       abra una ventanita cada vez. */
    vale('  y en el filo tampoco', r.enElFilo === false);
    vale('arrastrando para seleccionar, tampoco', r.arrastrando === false);
    return r;
  }));

  await cerrar(sesion);
})();
