/* CAMBIAR DE TESTAMENTO DESLIZANDO EL DEDO.

   En el panel de Libros, además de las pestañas AT/NT, se pasa de un
   testamento al otro con un desliz de lado: hacia la izquierda al Nuevo,
   hacia la derecha al Antiguo, como se pasa una hoja. La lista sigue al dedo
   y, si no llega, vuelve a su sitio con un resorte.

   Lo que vigila esta prueba:
     · el desliz largo cambia de testamento, en los dos sentidos;
     · donde no hay a dónde ir —el Nuevo hacia la izquierda— no pasa nada;
     · un desliz corto y lento no cambia, y la lista vuelve a su sitio;
     · un desliz que empezó sobre un libro NO abre sus capítulos al soltar,
       aunque detrás llegue el click;
     · un gesto de arriba abajo no es nuestro: no cambia de testamento;
     · y el cambio no parpadea: la lista no se apaga en ningún cuadro.

   Los gestos van como los de un dedo: PointerEvent con su pointerId y su
   pointerType, y el trazo torcido —un dedo no va en línea recta—. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

const IR_A = `async (testa) => {
  const pausa = ms => new Promise(z => setTimeout(z, ms));
  const visible = () => [...document.querySelectorAll('.rollo, #canto')]
    .find(r => getComputedStyle(r).display !== 'none');
  if (!visible()){ document.getElementById('pgCabeza').click(); await pausa(900); }
  const t = (visible() || document).querySelector('.pestanas [data-sec="libros"]');
  if (!t) return false;
  t.click(); await pausa(1100);
  const p = document.querySelector('#canto .canto-tab[data-testa="' + testa + '"]');
  if (!p) return false;
  if (!p.classList.contains('aqui')){ p.click(); await pausa(1100); }
  return true;
}`;

/* Un desliz desde el centro de un libro. «click» decide si detrás llega el
   click que manda el navegador al soltar sobre el mismo botón: en el gesto
   de lado llega, y es justo el que no debe abrir los capítulos. */
const DESLIZ = `async ({ dx, dy, pasos, ms, click, libro }) => {
  const pausa = t => new Promise(z => setTimeout(z, t));
  const el = document.querySelector(libro ? '#canto .tabo[data-libro="' + libro + '"]'
                                          : '#canto .rejilla-libros .tabo.viva');
  if (!el) return { sinLibro: true };
  const q = el.getBoundingClientRect();
  const x0 = q.left + q.width / 2 + 1, y0 = q.top + q.height / 2 - 1;
  const o = (x, y) => ({ bubbles:true, cancelable:true, pointerId:11, pointerType:'touch',
                         isPrimary:true, clientX:x, clientY:y });
  el.dispatchEvent(new PointerEvent('pointerdown', o(x0, y0)));
  let mitad = null;
  for (let i = 1; i <= pasos; i++){
    await pausa(ms);
    /* el temblor: medio píxel a cada lado, alternando */
    const tx = x0 + dx * i / pasos + (i % 2 ? .8 : -.6);
    const ty = y0 + dy * i / pasos + (i % 2 ? 1.4 : -1.1);
    el.dispatchEvent(new PointerEvent('pointermove', o(tx, ty)));
    if (i === Math.ceil(pasos / 2)){
      const r = document.querySelector('#canto .rejilla-libros');
      mitad = r ? r.style.transform : null;
    }
  }
  el.dispatchEvent(new PointerEvent('pointerup', o(x0 + dx, y0 + dy)));
  const debajo = (document.elementFromPoint(x0 + dx, y0 + dy) || {}).closest
    ? (document.elementFromPoint(x0 + dx, y0 + dy).closest('.tabo') || {}).dataset : null;
  if (click) el.dispatchEvent(new MouseEvent('click', o(x0 + dx, y0 + dy)));
  await pausa(900);
  const caps = document.getElementById('flyCaps');
  const r = document.querySelector('#canto .rejilla-libros');
  return { testa: (document.querySelector('#canto .canto-tab.aqui') || {}).dataset.testa,
           mitad, debajo: debajo && debajo.libro, cascada: !!caps && getComputedStyle(caps).display !== 'none',
           quieta: r ? (r.style.transform || 'none') : null };
}`;

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  const desliz = o => p.evaluate(`(${DESLIZ})(${JSON.stringify(o)})`);
  const testa = () => p.evaluate(() =>
    (document.querySelector('#canto .canto-tab.aqui') || {}).dataset.testa);

  titulo('desde el Antiguo, hacia la izquierda: el Nuevo');
  vale('se llega a Libros · AT', await p.evaluate(`(${IR_A})('AT')`));
  const alNuevo = await desliz({ dx:-210, dy:9, pasos:10, ms:20, click:true });
  di('el desliz', alNuevo);
  vale('la lista va con el dedo mientras arrastra',
       /translateX\(-\d/.test(alNuevo.mitad || ''), alNuevo.mitad);
  vale('cambia al Nuevo', alNuevo.testa === 'NT', alNuevo.testa);
  vale('y el click de detrás NO abre los capítulos del libro donde empezó',
       alNuevo.cascada === false, alNuevo.cascada);

  titulo('en el Nuevo, hacia la izquierda no hay a dónde ir');
  const tope = await desliz({ dx:-210, dy:-7, pasos:10, ms:20, click:true });
  di('el desliz', tope);
  vale('se resiste: avanza menos que el dedo',
       (() => { const m = /translateX\((-?\d+)/.exec(tope.mitad || '');
                return !!m && Math.abs(+m[1]) < 105 / 2 + 5; })(), tope.mitad);
  vale('y se queda en el Nuevo', tope.testa === 'NT', tope.testa);
  vale('  con la lista de vuelta en su sitio', tope.quieta === 'none' || tope.quieta === '', tope.quieta);

  titulo('hacia la derecha: de vuelta al Antiguo');
  const alAntiguo = await desliz({ dx:200, dy:6, pasos:10, ms:20, click:true });
  di('el desliz', alAntiguo);
  vale('cambia al Antiguo', alAntiguo.testa === 'AT', alAntiguo.testa);

  titulo('un desliz corto no cambia');
  /* CORTO, Y QUE ARRANCA ENSEGUIDA: 15 px en el primer paso y se queda en
     45, a 0.3 px/ms, por debajo del umbral de lanzar (0.45) y lejos del
     cuarto de ancho. Antes estuvo a 45 px en 720 ms, y con la lupa viva eso
     dejaba el dedo casi quieto lo bastante para engancharla según cuándo
     llegara su reloj; la lupa ya no está, pero un desliz que no llega se
     sigue probando así, que es lo que se quiere ver y nada más. */
  const corto = await desliz({ dx:-45, dy:4, pasos:3, ms:50, click:true });
  di('el desliz', corto);
  vale('se queda en el Antiguo', corto.testa === 'AT', corto.testa);
  vale('  y la lista vuelve a su sitio', corto.quieta === 'none' || corto.quieta === '', corto.quieta);
  vale('  y tampoco abre capítulos', corto.cascada === false, corto.cascada);

  titulo('de arriba abajo no es nuestro');
  /* Sin click detrás: en un teléfono, un dedo que desplaza no termina en
     click. Lo que se mira es que el gesto no se tome por un desliz. */
  const vertical = await desliz({ dx:12, dy:-160, pasos:10, ms:20, click:false });
  di('el gesto', vertical);
  vale('no cambia de testamento', vertical.testa === 'AT', vertical.testa);
  vale('  ni mueve la lista de lado', !vertical.mitad, vertical.mitad);

  titulo('el desliz no se apaga y se prende');
  /* EL PARPADEO, medido cuadro a cuadro. La primera versión, al soltar,
     desvanecía la lista hasta cero en su sitio y luego el panel entero
     volvía a encenderse desde cero: «se desliza, se apaga y se prende». Se
     mide la opacidad que de verdad se ve —la del cuerpo por la de la
     lista— en cada cuadro del gesto, y el cuadro en que la lista nueva ya
     está pero sus fondos de sección todavía no, que era el otro destello.
     Con la versión de antes daba un mínimo de 0. */
  const peli = await p.evaluate(async () => {
    const pausa = t => new Promise(z => setTimeout(z, t));
    const c = document.getElementById('cantoCuerpo');
    const el = c.querySelector('.rejilla-libros .tabo.viva');
    if (!el) return { sinLibro: true };
    let vivo = true, minimo = 1, sinFondo = 0, cuadros = 0, vioNT = false;
    (function cuadro(){
      const r = c.querySelector('.rejilla-libros');
      if (r){
        cuadros++;
        const o = +getComputedStyle(c).opacity * +getComputedStyle(r).opacity;
        if (o < minimo) minimo = o;
        if (!r.querySelector('svg.secciones-fondo path')) sinFondo++;
      }
      if ((document.querySelector('#canto .canto-tab.aqui') || {}).dataset.testa === 'NT') vioNT = true;
      if (vivo) requestAnimationFrame(cuadro);
    })();
    const q = el.getBoundingClientRect();
    const x0 = q.left + q.width / 2 + 1, y0 = q.top + q.height / 2 - 1;
    const o = (x, y) => ({ bubbles:true, cancelable:true, pointerId:12, pointerType:'touch',
                           isPrimary:true, clientX:x, clientY:y });
    el.dispatchEvent(new PointerEvent('pointerdown', o(x0, y0)));
    for (let i = 1; i <= 10; i++){
      await pausa(18);
      el.dispatchEvent(new PointerEvent('pointermove', o(x0 - 21 * i + (i % 2 ? .7 : -.5), y0 + (i % 2 ? 1.2 : -.9))));
    }
    el.dispatchEvent(new PointerEvent('pointerup', o(x0 - 210, y0)));
    el.dispatchEvent(new MouseEvent('click', o(x0 - 210, y0)));
    await pausa(1100);
    vivo = false;
    return { minimo: Math.round(minimo * 100) / 100, sinFondo, cuadros, vioNT };
  });
  di('la película', peli);
  vale('(la prueba es válida) el desliz cambió al Nuevo', peli.vioNT === true, peli);
  vale('(la prueba es válida) hubo cuadros que mirar', peli.cuadros > 20, peli.cuadros);
  vale('LA LISTA NUNCA SE APAGA: no baja de .6 en ningún cuadro', peli.minimo >= .6, peli.minimo);
  vale('  y la nueva nunca sale sin sus fondos de sección', peli.sinFondo === 0, peli.sinFondo);
  /* Y de vuelta al Antiguo para lo que sigue. */
  await desliz({ dx:200, dy:-5, pasos:10, ms:20, click:true });

  /* AQUÍ ESTABA «CON LA LUPA ENGANCHADA, EL GESTO ES DE LA LUPA», y se fue
     con la lupa, que el dueño del repo pidió quitar. */

  titulo('y las pestañas siguen valiendo');
  await p.evaluate(async () => {
    document.querySelector('#canto .canto-tab[data-testa="NT"]').click();
    await new Promise(z => setTimeout(z, 900));
  });
  vale('la pestaña NT lleva al Nuevo', (await testa()) === 'NT');

  await cerrar(sesion);
})();
