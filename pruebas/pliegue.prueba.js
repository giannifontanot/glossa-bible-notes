/* EL PLIEGUE: PASAR HOJA SIN TIRAR EL PROGRAMA.

   Aquí vivieron los dos únicos fallos de esta aplicación capaces de dejarla
   muerta en la mano, y los dos se reproducen abajo. Merecen quedar escritos
   porque los dos tenían la misma forma —estado global compartido entre
   animaciones que se solapan— y esa forma volverá.

   1. endFold leía F sin que existiera. animarHojas encendía `folding` y
      `anchor` pero dejaba F en nulo hasta el primer cuadro; un toque en el
      filo dentro de esa ventana llegaba a endFold y reventaba. Catorce pares
      de pulsación y suelta seguidos daban cinco excepciones.
   2. Dos animaciones de hoja a la vez. Cada una corre su bucle leyendo anchor
      y F, que son de todos; la primera en terminar los dejaba en nulo bajo los
      pies de la otra. El botón se protegía con `folding`, pero `folding` no se
      enciende hasta que llega la foto de la hoja destino, y descargarla es
      asíncrono: en ese hueco un segundo toque pasaba el guardia limpiamente.

   Y una tercera cosa que no reventaba pero engañaba: mientras una hoja gira,
   #pg está en visibility:hidden y el lienzo lleva pointer-events:none, así que
   el toque en el centro del papel lo recoge la escena. Cualquier cosa colgada
   de #pg deja de existir para el dedo durante el 90% del paso automático. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  titulo('un toque en el filo pasa una hoja');
  di('pasa', await p.evaluate(async () => {
    const e = document.getElementById('edgeR'), r = e.getBoundingClientRect();
    const antes = document.getElementById('pgCabeza').textContent.trim();
    const op = { bubbles:true, pointerId:5, pointerType:'touch', isPrimary:true,
                 clientX:r.left + r.width/2, clientY:450 };
    e.dispatchEvent(new PointerEvent('pointerdown', op));
    await new Promise(z => setTimeout(z, 80));
    e.dispatchEvent(new PointerEvent('pointerup', op));
    await new Promise(z => setTimeout(z, 1800));
    return { antes, despues: document.getElementById('pgCabeza').textContent.trim() };
  }).then(r => { vale('cambia de hoja', r.antes !== r.despues, r.antes + ' → ' + r.despues); return r; }));

  titulo('catorce toques atropellados en el filo');
  /* El primero de los dos fallos. Los tiempos alternos —120 y 300 ms— son los
     que lo disparaban: caen dentro y fuera de la ventana del doble clic. */
  const antesErr = sesion.errores.length;
  await p.evaluate(async () => {
    const e = document.getElementById('edgeR'), r = e.getBoundingClientRect();
    const op = i => ({ bubbles:true, pointerId:20+i, pointerType:'touch', isPrimary:true,
                       clientX:r.left + r.width/2, clientY:400 });
    for (let i = 0; i < 14; i++){
      e.dispatchEvent(new PointerEvent('pointerdown', op(i)));
      await new Promise(z => setTimeout(z, 40));
      e.dispatchEvent(new PointerEvent('pointerup', op(i)));
      await new Promise(z => setTimeout(z, i % 2 ? 120 : 300));
    }
    await new Promise(z => setTimeout(z, 2600));
  });
  const nuevos = sesion.errores.slice(antesErr);
  vale('ni una excepción', nuevos.length === 0, nuevos.length ? nuevos : 'ninguna');
  vale('el programa sigue vivo', await p.evaluate(() =>
    document.querySelectorAll('#pgBody .v').length > 0 &&
    !document.getElementById('pg').classList.contains('hidden')));

  titulo('cuarenta pasos seguidos con el botón de lejos');
  /* El segundo fallo: dos animaciones solapadas. Se dispara encimando toques
     más rápido de lo que dura una vuelta. */
  const antesErr2 = sesion.errores.length;
  await p.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1200));
    for (let i = 0; i < 40; i++){
      const bt = document.querySelector('#zoomPasos [data-paso="1"]');
      if (!bt || bt.disabled) break;
      bt.click();
      await new Promise(z => setTimeout(z, 130));
    }
    await new Promise(z => setTimeout(z, 3000));
  });
  const nuevos2 = sesion.errores.slice(antesErr2);
  vale('ni una excepción', nuevos2.length === 0, nuevos2.length ? nuevos2 : 'ninguna');
  vale('la hoja vuelve a verse', await p.evaluate(() =>
    !document.getElementById('pg').classList.contains('hidden') &&
    getComputedStyle(document.getElementById('fx')).display === 'none'));

  titulo('el toque llega aunque la hoja esté en el aire');
  /* La tercera. Se espera al instante exacto en que #pg está apagada y se toca
     ahí: el destino es la escena, no #pg, y el paso automático tiene que
     pararse igual. */
  const r = await p.evaluate(async () => {
    const pg = document.getElementById('pg');
    if (!pg.classList.contains('zoom')){
      document.getElementById('btnZoom').click();
      await new Promise(z => setTimeout(z, 1200));
    }
    const bt = document.querySelector('#zoomPasos [data-paso="1"]');
    bt.click(); bt.click(); bt.dispatchEvent(new MouseEvent('dblclick', { bubbles:true }));
    const cab = () => document.getElementById('pgCabeza').textContent.trim();
    let quien = null;
    for (let i = 0; i < 400; i++){
      await new Promise(z => setTimeout(z, 25));
      if (getComputedStyle(pg).visibility === 'hidden'){
        const q = document.querySelector('#pg .pg-inner').getBoundingClientRect();
        const x = Math.round(q.left+q.width/2), y = Math.round(q.top+q.height/2);
        quien = document.elementFromPoint(x, y);
        quien.dispatchEvent(new MouseEvent('click', { bubbles:true, clientX:x, clientY:y }));
        break;
      }
    }
    if (!quien) return { pillado:false };
    await new Promise(z => setTimeout(z, 2200));
    const trasParar = cab();
    await new Promise(z => setTimeout(z, 6000));
    return { pillado:true, loRecibio: quien.id || quien.tagName,
             fueraDePg: !quien.closest('#pg'),
             trasParar, seisSegundosDespues: cab() };
  });
  di('el toque', r);
  vale('lo recibió la escena, no #pg', r.pillado && r.fueraDePg, r.loRecibio);
  vale('el automático se paró', r.pillado && r.trasParar === r.seisSegundosDespues,
       r.trasParar + ' → ' + r.seisSegundosDespues);

  await cerrar(sesion);
})();
