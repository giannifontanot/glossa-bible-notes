/* LA PAGINACIÓN: QUE EL REPARTO NO SE MUEVA SOLO.

   Es la prueba más vieja y la que más veces ha cazado algo, porque el reparto
   de versículos por hoja depende de casi todo: la letra, las columnas, los
   márgenes, y —esto es lo que sorprende— de si hay una glosa escrita, porque
   una nota al pie ocupa alto y empuja el corte.

   Lo que vigila: que escribir una nota vacía NO mueva nada, que escribir una
   con texto SÍ mueva el corte, y que repintar dos veces seguidas dé el mismo
   reparto —si cambia, es que el mapa de hojas se quedó sucio—.

   POR QUÉ LA NOTA DE PRUEBA ES TAN LARGA, Y POR QUÉ SE MIDE EL HUECO. Con una
   nota corta esta prueba pasaba aquí y fallaba en otras máquinas, y no por un
   fallo del programa: al pie de la última columna queda un HUECO, y una nota
   de una línea a veces cabe entera dentro de él. Entonces ocupa alto, sí,
   pero no tira a nadie fuera, y la comprobación canta un fallo que no existe.

   Y el hueco NO es pequeño, que era la tentación: parece que tenga que ser
   menos que el versículo que no cupo, pero el corte de esta Biblia es
   SINCRONIZADO —`unCorteMas` corta donde quepa en TODAS las versiones y se
   queda con el mínimo—, así que en la versión de texto más corto sobra sitio
   de verdad. Medido: 217 px de hueco en una ventana donde el versículo más
   alto media 128. O sea que el versículo más alto no sirve de vara.

   Así que se mide el hueco tal cual —lo que queda libre al pie de la última
   columna, más las columnas que hayan quedado vacías— y se exige que la nota
   NO QUEPA en él. Eso sí implica que el corte tiene que moverse, en cualquier
   tipografía y en cualquier pantalla. Se comprueba antes que el reparto, para
   que si algún día vuelve a fallar se vea de un vistazo si falló el mapa de
   hojas o falló la premisa. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  /* LAS GLOSAS, ABAJO. Es el paso sin el cual esta prueba no prueba nada: al
     MARGEN una nota no le quita alto a la columna de texto, así que el reparto
     no se mueve por mucho que escribas, y la comprobación de más abajo pasaría
     siempre por el motivo equivocado. Abajo sí empuja, que es el caso donde el
     mapa de hojas puede quedarse sucio. */
  await p.evaluate(() => {
    const x = [...document.querySelectorAll('[data-lay]')].find(y => y.dataset.lay === 'below');
    if (x) x.click();
  });
  await p.waitForTimeout(1400);
  vale('las glosas van abajo', await p.evaluate(() =>
    [...document.querySelectorAll('[data-lay]')].some(x =>
      x.dataset.lay === 'below' && x.classList.contains('active'))));
  /* EL HUECO QUE QUEDA AL PIE. Es lo que la nota tiene que desbordar para que
     caiga un versículo, así que se mide en vez de suponerlo.

     Se recorre por RECTÁNGULOS DE CLIENTE y no con getBoundingClientRect():
     el cuerpo va en dos columnas, y el rectángulo envolvente de algo partido
     entre dos columnas mide el ancho de las dos y un alto que no existe en
     ninguna parte. Cada rectángulo se asigna a su columna por dónde empieza,
     se busca el fondo más bajo de la última columna con contenido, y se le
     suman enteras las columnas que hayan quedado sin estrenar. */
  const foto = () => p.evaluate(() => {
    const body = document.getElementById('pgBody');
    const cs = getComputedStyle(body), r = body.getBoundingClientRect();
    const padT = parseFloat(cs.paddingTop) || 0, padB = parseFloat(cs.paddingBottom) || 0;
    const padI = parseFloat(cs.paddingLeft) || 0, padD = parseFloat(cs.paddingRight) || 0;
    const nCol = parseInt(cs.columnCount) || 1;
    const separacion = parseFloat(cs.columnGap) || 0;
    const anchoCol = (r.width - padI - padD - separacion * (nCol - 1)) / nCol;
    const arriba = r.top + padT, abajo = r.bottom - padB;
    let ultima = 0, fondo = arriba;
    for (const el of body.children){
      for (const caja of el.getClientRects()){
        if (caja.height <= 0) continue;
        const col = Math.max(0, Math.min(nCol - 1,
          Math.round((caja.left - (r.left + padI)) / (anchoCol + separacion))));
        if (col > ultima){ ultima = col; fondo = caja.bottom; }
        else if (col === ultima && caja.bottom > fondo) fondo = caja.bottom;
      }
    }
    return {
      versiculos: body.querySelectorAll('.v').length,
      glosasAbajo: document.querySelectorAll('#pgBody .gl, #pgFoot .gl').length,
      hueco: Math.round((abajo - fondo) + (nCol - 1 - ultima) * (abajo - arriba)),
      altoCuerpo: Math.round(r.height)
    };
  });

  titulo('el reparto de partida');
  const antes = await foto();
  di('al abrir', antes);
  vale('la hoja trae versículos', antes.versiculos > 0, antes.versiculos + ' versículos');

  titulo('una nota VACÍA no mueve nada');
  await p.evaluate(async () => {
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 20){ n = w.currentNode; break; }
    const r = document.createRange(); r.setStart(n,0); r.setEnd(n,15);
    getSelection().removeAllRanges(); getSelection().addRange(r);
    const rc = r.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:rc.left+2, clientY:rc.top+2 }));
    await new Promise(z => setTimeout(z, 450));
    /* se cierra sin escribir nada: el panel trae la caja puesta desde el
       principio, y sin texto no llega a guardarse ninguna marca */
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:200, clientY:700 }));
    await new Promise(z => setTimeout(z, 1200));
  });
  const vacia = await foto();
  di('tras la nota vacía', vacia);
  vale('el reparto no se movió', vacia.versiculos === antes.versiculos,
       antes.versiculos + ' → ' + vacia.versiculos);

  titulo('una nota CON TEXTO sí mueve el corte');
  /* Los identificadores de antes, para saber después cuál es la nota nueva.
     Por id y no por fecha: `creada` es un día suelto —"2026-08-24"—, así que
     todas las marcas de una sesión de prueba empatan y "la más reciente"
     acaba siendo cualquiera, normalmente una de las tres de estreno. */
  const idsAntes = await p.evaluate(() =>
    JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').map(m => m.id));
  await p.evaluate(async () => {
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 20){ n = w.currentNode; break; }
    const r = document.createRange(); r.setStart(n,0); r.setEnd(n,15);
    getSelection().removeAllRanges(); getSelection().addRange(r);
    const rc = r.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:rc.left+2, clientY:rc.top+2 }));
    await new Promise(z => setTimeout(z, 450));
    const ta = document.getElementById('glosaCaja');
    /* Larga a propósito, y con holgura de sobra: la premisa que se comprueba
       más abajo es que esta nota NO CABE en el hueco que quedaba al pie, y
       una nota justita haría fallar la prueba por dos píxeles en la primera
       pantalla con otra letra. */
    ta.value = 'una nota deliberadamente larga, escrita para que ocupe más ' +
      'alto que el versículo más alto de la hoja y por lo tanto más que ' +
      'cualquier hueco que pudiera quedar suelto al pie de la columna, de ' +
      'modo que el corte tenga que moverse sí o sí en cualquier tipografía y ' +
      'en cualquier pantalla, sin depender de la suerte del reparto. Sigue, ' +
      'porque el objetivo no es decir algo sino ocupar sitio: cada renglón ' +
      'que se añade aquí es un renglón que la columna de versículos pierde.';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:200, clientY:700 }));
    await new Promise(z => setTimeout(z, 1400));
  });
  const escrita = await foto();
  di('tras la nota escrita', escrita);

  /* La premisa, medida sobre la nota recién puesta: la que no estaba antes,
     no la última del montón —las glosas salen ordenadas por dónde ancla cada
     una, no por cuándo se escribió—. Se suman sus rectángulos por lo mismo
     que en los versículos: abajo la nota va en el flujo de columnas y puede
     partirse en dos, y entonces el rectángulo envolvente miente. */
  const altoNota = await p.evaluate((previos) => {
    const antiguas = new Set(previos);
    const nueva = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]')
      .find(m => !antiguas.has(m.id));
    if (!nueva) return 0;
    const el = document.querySelector('.gl[data-gl="' + nueva.id + '"]');
    if (!el) return 0;
    return Math.round([...el.getClientRects()].reduce((s, r) => s + r.height, 0));
  }, idsAntes);
  /* Contra el hueco de la hoja de ANTES de escribir —el de `vacia`, que es el
     mismo que el de partida porque la nota vacía no movió nada—: ese es el
     sitio libre que la nota tenía para caber. El de después ya no vale de
     nada, es el que dejó el reparto nuevo. */
  di('alto de la nota', altoNota + ' contra un hueco de ' + vacia.hueco);
  vale('la nota no cabe en el hueco', altoNota > vacia.hueco,
       altoNota + ' > ' + vacia.hueco);
  vale('caben menos versículos', escrita.versiculos < antes.versiculos,
       antes.versiculos + ' → ' + escrita.versiculos);

  titulo('repintar dos veces da lo mismo');
  /* Si el mapa de hojas se quedó sucio, el segundo repintado reparte distinto.
     Se fuerza tocando un ajuste y devolviéndolo, que es el camino que de
     verdad repagina. */
  const b = await p.evaluate(async () => {
    const btn = document.getElementById('btnAire');
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const t = [...document.querySelectorAll('.pestanas button')]
      .find(x => x.textContent.trim().toLowerCase() === 'formato');
    if (t) t.click();
    await new Promise(z => setTimeout(z, 900));
    const dice = () => btn.textContent.trim();
    const partida = dice();
    do { btn.click(); await new Promise(z => setTimeout(z, 1300)); } while (dice() !== partida);
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    return document.querySelectorAll('#pgBody .v').length;
  });
  di('tras dar la vuelta a la interlínea', b);
  vale('el mismo reparto', b === escrita.versiculos, escrita.versiculos + ' → ' + b);

  await cerrar(sesion);
})();
