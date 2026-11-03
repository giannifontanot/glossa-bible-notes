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
     · y un gesto de arriba abajo no es nuestro: no cambia de testamento.

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
const DESLIZ = `async ({ dx, dy, pasos, ms, click }) => {
  const pausa = t => new Promise(z => setTimeout(z, t));
  const el = document.querySelector('#canto .rejilla-libros .tabo.viva');
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
  if (click) el.dispatchEvent(new MouseEvent('click', o(x0 + dx, y0 + dy)));
  await pausa(900);
  const caps = document.getElementById('flyCaps');
  const r = document.querySelector('#canto .rejilla-libros');
  return { testa: (document.querySelector('#canto .canto-tab.aqui') || {}).dataset.testa,
           mitad, cascada: !!caps && getComputedStyle(caps).display !== 'none',
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

  titulo('un desliz corto y lento no cambia');
  const corto = await desliz({ dx:-45, dy:4, pasos:12, ms:60, click:true });
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

  titulo('y las pestañas siguen valiendo');
  await p.evaluate(async () => {
    document.querySelector('#canto .canto-tab[data-testa="NT"]').click();
    await new Promise(z => setTimeout(z, 900));
  });
  vale('la pestaña NT lleva al Nuevo', (await testa()) === 'NT');

  await cerrar(sesion);
})();
