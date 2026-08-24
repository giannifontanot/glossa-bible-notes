/* LA PAGINACIÓN: QUE EL REPARTO NO SE MUEVA SOLO.

   Es la prueba más vieja y la que más veces ha cazado algo, porque el reparto
   de versículos por hoja depende de casi todo: la letra, las columnas, los
   márgenes, y —esto es lo que sorprende— de si hay una glosa escrita, porque
   una nota al pie ocupa alto y empuja el corte.

   Lo que vigila: que escribir una nota vacía NO mueva nada, que escribir una
   con texto SÍ mueva el corte, y que repintar dos veces seguidas dé el mismo
   reparto —si cambia, es que el mapa de hojas se quedó sucio—.

   POR QUÉ LA NOTA DE PRUEBA ES TAN LARGA. Con una nota corta esta prueba
   pasaba aquí y fallaba en otras máquinas, y no por un fallo del programa: al
   pie de la última columna casi siempre queda un HUECO —lo que sobró después
   de colocar el último versículo que cabía—, y una nota de una línea a veces
   cabe entera en ese hueco. Entonces ocupa alto, sí, pero no tira a nadie
   fuera, y la comprobación canta un fallo que no existe. El hueco es, por
   definición, más pequeño que el versículo que no cupo; así que una nota MÁS
   ALTA QUE EL VERSÍCULO MÁS ALTO DE LA HOJA no cabe en ningún hueco posible y
   tiene que mover el corte en cualquier tipografía y en cualquier pantalla.
   Eso es lo que se comprueba antes, para que si algún día vuelve a fallar se
   vea de un vistazo si falló el reparto o falló la premisa. */
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
  /* El versículo más alto de la hoja se mide sumando sus rectángulos de
     cliente y no con getBoundingClientRect(): un versículo puede partirse en
     varias líneas y hasta saltar de columna, y el rectángulo envolvente de un
     texto repartido en dos columnas mide el ancho de las dos y un alto que no
     existe en ninguna parte. */
  const foto = () => p.evaluate(() => {
    let altoVersMax = 0;
    for (const v of document.querySelectorAll('#pgBody .v')){
      const alto = [...v.getClientRects()].reduce((s, r) => s + r.height, 0);
      if (alto > altoVersMax) altoVersMax = alto;
    }
    return {
      versiculos: document.querySelectorAll('#pgBody .v').length,
      glosasAbajo: document.querySelectorAll('#pgBody .gl, #pgFoot .gl').length,
      altoVersMax: Math.round(altoVersMax),
      altoCuerpo: Math.round(document.getElementById('pgBody').getBoundingClientRect().height)
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
       más abajo es que esta nota mide MÁS que el versículo más alto, y una
       nota justita haría fallar la prueba por dos píxeles en la primera
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
  /* Se compara contra el versículo más alto de LAS DOS fotos: el hueco que
     hay que superar es el de la hoja de antes, pero la de después es la que
     queda a la vista, y quedarse con el mayor de los dos es el lado seguro. */
  const versMax = Math.max(antes.altoVersMax, escrita.altoVersMax);
  di('alto de la nota', altoNota + ' vs versículo ' + versMax);
  vale('la nota no cabe en ningún hueco', altoNota > versMax,
       altoNota + ' > ' + versMax);
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
