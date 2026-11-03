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
const DESLIZ = `async ({ dx, dy, pasos, ms, click, quieto, libro }) => {
  const pausa = t => new Promise(z => setTimeout(z, t));
  const el = document.querySelector(libro ? '#canto .tabo[data-libro="' + libro + '"]'
                                          : '#canto .rejilla-libros .tabo.viva');
  if (!el) return { sinLibro: true };
  const q = el.getBoundingClientRect();
  const x0 = q.left + q.width / 2 + 1, y0 = q.top + q.height / 2 - 1;
  const o = (x, y) => ({ bubbles:true, cancelable:true, pointerId:11, pointerType:'touch',
                         isPrimary:true, clientX:x, clientY:y });
  el.dispatchEvent(new PointerEvent('pointerdown', o(x0, y0)));
  /* «quieto»: el dedo se posa y espera antes de moverse, que es como se
     engancha la lupa. */
  /* Y SE ESPERA A QUE LA LUPA ENGANCHE DE VERDAD, no un rato fijo. La lupa
     se arma con un setTimeout de 200 ms, y en una máquina cargada ese reloj
     llega tarde: con una pausa fija el dedo empezaba a moverse antes de que
     enganchara, la lupa se retiraba por el movimiento y la prueba culpaba a
     la app de no abrir los capítulos. Pasó en una corrida del banco. */
  let lupa = null;
  if (quieto){
    await pausa(quieto);
    const t0 = performance.now();
    while (performance.now() - t0 < 1500 && !document.querySelector('#lupaLibro.viva'))
      await pausa(30);
    lupa = !!document.querySelector('#lupaLibro.viva');
  }
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
  /* Con lupa, la cascada puede tardar un poco más en salir: se espera a que
     salga, con tope, en vez de mirar una sola vez. */
  if (quieto){
    const t1 = performance.now();
    while (performance.now() - t1 < 2000 && !(caps && getComputedStyle(caps).display !== 'none'))
      await pausa(50);
  }
  const r = document.querySelector('#canto .rejilla-libros');
  return { testa: (document.querySelector('#canto .canto-tab.aqui') || {}).dataset.testa,
           mitad, lupa, debajo: debajo && debajo.libro, cascada: !!caps && getComputedStyle(caps).display !== 'none',
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
  /* CORTO, Y QUE ARRANQUE ENSEGUIDA. Estuvo a 45 px en 720 ms —doce pasos de
     60—, y eso deja el dedo casi quieto los primeros 200 ms: en el tercer paso
     apenas lleva 11 px, uno más que lo que la lupa perdona. Según cuándo
     llegara su reloj, unas veces era desliz y otras enganchaba la lupa y
     abría capítulos, que es exactamente lo que debe hacer un dedo que se
     posa. Una corrida del banco cayó del lado de la lupa. Lo que esta prueba
     quiere ver es un desliz que no llega: arranca ya —15 px en el primer
     paso, fuera del alcance de la lupa— y se queda en 45, a 0.3 px/ms, por
     debajo del umbral de lanzar (0.45) y lejos del cuarto de ancho. */
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

  titulo('con la lupa enganchada, el gesto es de la lupa');
  /* Dedo quieto 350 ms —la lupa engancha a los 200— y luego de lado, de
     sobra para pasar de testamento si el gesto fuera nuestro. Lo que tiene
     que pasar es lo de la lupa: la lista no se mueve, el testamento no
     cambia y al soltar se abren los capítulos del libro de debajo. */
  /* Desde Números, que está al final del primer renglón: 200 px a la
     izquierda caen sobre otro libro, que es el que la lupa tiene que abrir. */
  const conLupa = await desliz({ dx:-200, dy:4, pasos:10, ms:30, click:true, quieto:350, libro:'NUM' });
  di('el gesto', conLupa);
  vale('(la prueba es válida) la lupa enganchó antes de mover el dedo', conLupa.lupa === true, conLupa.lupa);
  vale('(la prueba es válida) al soltar hay un libro debajo del dedo', !!conLupa.debajo, conLupa.debajo);
  vale('no cambia de testamento', conLupa.testa === 'AT', conLupa.testa);
  vale('  ni corre la lista bajo el globo', !conLupa.mitad, conLupa.mitad);
  vale('  y la lupa abre los capítulos al soltar', conLupa.cascada === true, conLupa.cascada);
  /* Y se cierra la cascada para dejar la lista como estaba. */
  await p.evaluate(async () => {
    const c = document.querySelector('#canto .canto-tab.aqui');
    if (c) c.click();
    await new Promise(z => setTimeout(z, 600));
  });

  titulo('y las pestañas siguen valiendo');
  await p.evaluate(async () => {
    document.querySelector('#canto .canto-tab[data-testa="NT"]').click();
    await new Promise(z => setTimeout(z, 900));
  });
  vale('la pestaña NT lleva al Nuevo', (await testa()) === 'NT');

  await cerrar(sesion);
})();
