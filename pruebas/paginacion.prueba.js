/* LA PAGINACIÓN: QUE EL REPARTO NO SE MUEVA SOLO.

   Es la prueba más vieja y la que más veces ha cazado algo, porque el reparto
   de versículos por hoja depende de casi todo: la letra, las columnas, los
   márgenes, y —esto es lo que sorprende— de si hay una glosa escrita, porque
   una nota al pie ocupa alto y empuja el corte.

   Lo que vigila: que escribir una nota vacía NO mueva nada, que escribir una
   con texto SÍ mueva el corte, y que repintar dos veces seguidas dé el mismo
   reparto —si cambia, es que el mapa de hojas se quedó sucio—. */
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
  const foto = () => p.evaluate(() => ({
    versiculos: document.querySelectorAll('#pgBody .v').length,
    glosasAbajo: document.querySelectorAll('#pgBody .gl, #pgFoot .gl').length,
    altoCuerpo: Math.round(document.getElementById('pgBody').getBoundingClientRect().height)
  }));

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
    await new Promise(z => setTimeout(z, 400));
    [...document.querySelectorAll('#menu button')].find(x => /Glosa/.test(x.textContent)).click();
    await new Promise(z => setTimeout(z, 800));
    /* se cierra sin escribir nada */
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:200, clientY:700 }));
    await new Promise(z => setTimeout(z, 1200));
  });
  const vacia = await foto();
  di('tras la nota vacía', vacia);
  vale('el reparto no se movió', vacia.versiculos === antes.versiculos,
       antes.versiculos + ' → ' + vacia.versiculos);

  titulo('una nota CON TEXTO sí mueve el corte');
  await p.evaluate(async () => {
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 20){ n = w.currentNode; break; }
    const r = document.createRange(); r.setStart(n,0); r.setEnd(n,15);
    getSelection().removeAllRanges(); getSelection().addRange(r);
    const rc = r.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:rc.left+2, clientY:rc.top+2 }));
    await new Promise(z => setTimeout(z, 400));
    [...document.querySelectorAll('#menu button')].find(x => /Glosa/.test(x.textContent)).click();
    await new Promise(z => setTimeout(z, 800));
    const ta = document.querySelector('.gl-movil textarea');
    ta.value = 'una nota que ocupa alto y empuja el corte de la hoja';
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:200, clientY:700 }));
    await new Promise(z => setTimeout(z, 5600));   /* el vuelo dura 4,5 s */
  });
  const escrita = await foto();
  di('tras la nota escrita', escrita);
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
