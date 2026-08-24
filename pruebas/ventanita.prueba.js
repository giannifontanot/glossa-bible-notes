/* LA VENTANITA DEL VERSÍCULO, Y LA PUERTA DE SALIDA.

   A la misma ventanita —#versoPleno, la que enseña el texto de una
   referencia— se llega por DOS caminos que no se parecen:

     · el rastro de escrituras, tocando una línea del historial;
     · una referencia dentro de una glosa, en la hoja o en la caja de
       escribir.

   El segundo camino no abre el historial. Y el guardián del toque de fuera
   preguntaba solo por el historial, así que por ese camino la ventanita se
   quedaba sin manera de cerrarse: tocabas fuera y no pasaba nada. No era un
   caso de orilla —basta con que la glosa que abriste lleve una escritura, que
   es justo para lo que sirven las referencias en una glosa—.

   Lo que se vigila aquí es la SALIDA por los dos caminos, que es lo que se
   rompió, y que cerrar por uno no apague de más: cerrar la ventanita que
   salió de una glosa no debe llevarse por delante el panel de la glosa desde
   el que preguntaste. */
const { abrir, cerrar, conGlosas, di, vale, titulo } = require('./comun');

/* Un toque de verdad, con su PointerEvent: el guardián escucha 'pointerdown'
   en captura, y un .click() sintético no dispara ninguno. */
const TOQUE = (x, y) => ({ bubbles:true, cancelable:true, pointerId:3,
                           pointerType:'touch', clientX:x, clientY:y });

(async () => {
  const sesion = await abrir();
  const pagina = sesion.pagina;
  await conGlosas(pagina);

  /* ---------- desde una glosa de la hoja ---------- */
  titulo('la ventanita que sale de una glosa se cierra tocando fuera');
  const desdeGlosa = await pagina.evaluate(async () => {
    const toque = (el, x, y) => el.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, cancelable:true, pointerId:3, pointerType:'touch',
        clientX:x, clientY:y }));
    const ref = document.querySelector('#pgMargin .ref:not(.muerta), ' +
                                       '#pgFoot .ref:not(.muerta), ' +
                                       '#pgBody .ref:not(.muerta)');
    if (!ref) return { falta:'una referencia en una glosa de esta hoja' };
    const cual = ref.dataset.ref;
    ref.click();
    await new Promise(z => setTimeout(z, 400));
    const vp = document.getElementById('versoPleno');
    const abierta = getComputedStyle(vp).display !== 'none' &&
                    vp.classList.contains('visible');
    /* y el historial NO se abrió: este camino no pasa por él, que es
       exactamente lo que hacía fallar al guardián */
    const rastro = getComputedStyle(document.getElementById('historial')).display;
    const texto = (vp.textContent || '').slice(0, 40);

    /* AHORA EL TOQUE DE FUERA. Sobre la hoja, lejos de la ventanita: se elige
       un punto de la esquina de arriba a la izquierda, que la ventanita nunca
       ocupa —vive centrada—. */
    const p = document.getElementById('pg');
    const r = p.getBoundingClientRect();
    const x = r.left + 12, y = r.top + 12;
    toque(document.elementFromPoint(x, y) || p, x, y);
    await new Promise(z => setTimeout(z, 400));
    return { cual, abierta, rastro, texto,
             sigueVisible: vp.classList.contains('visible'),
             display: getComputedStyle(vp).display };
  });
  di('desde la glosa', desdeGlosa);
  vale('la referencia abre la ventanita', desdeGlosa.abierta === true, desdeGlosa.texto);
  vale('sin abrir el rastro', desdeGlosa.rastro === 'none', desdeGlosa.rastro);
  vale('y el toque de fuera la cierra', desdeGlosa.sigueVisible === false,
       'display ' + desdeGlosa.display);

  /* ---------- desde el rastro, que es el camino que sí funcionaba ---------- */
  titulo('la que sale del rastro sigue cerrándose, y se lleva el rastro');
  /* EL RASTRO HAY QUE SEMBRARLO. Un lector recién abierto no ha saltado a
     ningún sitio, así que la lista está vacía y no hay línea que tocar: sin
     esto la sección se saltaba entera y cantaba verde sin haber probado nada.
     Se siembra por el almacén y se recarga, que es de donde el programa lo
     lee al arrancar. */
  await pagina.evaluate(() => localStorage.setItem('glossa:historial:v1',
    JSON.stringify([{ libro:'MAT', cap:5, vers:4, cuando: Date.now() },
                    { libro:'REV', cap:21, vers:4, cuando: Date.now() - 9000 }])));
  await pagina.reload();
  await pagina.waitForTimeout(2600);

  const desdeRastro = await pagina.evaluate(async () => {
    const toque = (el, x, y) => el.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, cancelable:true, pointerId:4, pointerType:'touch',
        clientX:x, clientY:y }));
    document.getElementById('btnHistorial').click();
    await new Promise(z => setTimeout(z, 500));
    const linea = document.querySelector('#historial [data-hs]');
    if (!linea) return { falta:'una línea en el rastro' };
    linea.click();
    await new Promise(z => setTimeout(z, 400));
    const vp = document.getElementById('versoPleno');
    const hs = document.getElementById('historial');
    const antes = { ventanita: vp.classList.contains('visible'),
                    rastro: getComputedStyle(hs).display !== 'none' };
    const p = document.getElementById('pg').getBoundingClientRect();
    const x = p.left + 12, y = p.top + 12;
    toque(document.elementFromPoint(x, y) || document.body, x, y);
    await new Promise(z => setTimeout(z, 500));
    return { antes, ventanita: vp.classList.contains('visible'),
             rastro: hs.classList.contains('visible') };
  });
  di('desde el rastro', desdeRastro);
  vale('el rastro abre la ventanita',
       desdeRastro.antes && desdeRastro.antes.ventanita === true, desdeRastro.antes);
  vale('el toque de fuera cierra la ventanita', desdeRastro.ventanita === false);
  vale('y también el rastro, que es de donde salió', desdeRastro.rastro === false);

  /* ---------- cerrar la ventanita no apaga el panel de la glosa ---------- */
  titulo('cerrar la ventanita no se lleva la glosa de debajo');
  /* ES EL CASO NORMAL, no un rincón: la ventanita salió de una referencia de
     una glosa, así que lo más probable es que el panel de esa glosa esté
     delante y que el toque de "fuera" caiga justo encima de él. Cerrar ahí el
     panel dejaría al lector sin aquello desde lo que preguntó. */
  const conPanel = await pagina.evaluate(async () => {
    const toque = (el, x, y) => el.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, cancelable:true, pointerId:5, pointerType:'touch',
        clientX:x, clientY:y }));
    const menu = document.getElementById('menu');
    /* dos toques sobre la glosa abren su panel, que es como se abre de verdad */
    const gl = document.querySelector('#pgMargin .gl, #pgFoot .gl, #pgBody .gl');
    if (!gl) return { falta:'una glosa en esta hoja' };
    gl.dispatchEvent(new MouseEvent('dblclick', { bubbles:true }));
    await new Promise(z => setTimeout(z, 600));
    const panelAbierto = getComputedStyle(menu).display !== 'none';
    const ref = document.querySelector('#pgMargin .ref:not(.muerta), ' +
                                       '#pgFoot .ref:not(.muerta), ' +
                                       '#pgBody .ref:not(.muerta)');
    if (!ref) return { panelAbierto, falta:'una referencia' };
    ref.click();
    await new Promise(z => setTimeout(z, 400));
    const vp = document.getElementById('versoPleno');
    const abierta = vp.classList.contains('visible');
    /* el toque cae SOBRE el panel de la glosa */
    const r = menu.getBoundingClientRect();
    const x = r.left + 6, y = r.top + 6;
    toque(document.elementFromPoint(x, y) || menu, x, y);
    await new Promise(z => setTimeout(z, 400));
    return { panelAbierto, abierta,
             ventanita: vp.classList.contains('visible'),
             panelSigue: getComputedStyle(menu).display !== 'none' };
  });
  di('con el panel de la glosa delante', conPanel);
  vale('el panel de la glosa se abrió', conPanel.panelAbierto === true, conPanel.falta || '');
  vale('la ventanita se abrió', conPanel.abierta === true);
  vale('y se cierra tocando encima del panel', conPanel.ventanita === false);
  vale('sin apagar el panel de la glosa', conPanel.panelSigue === true);

  await cerrar(sesion);
})();
