/* CRUZAR DE LIBRO, Y EL TRAZO QUE AVISA DE QUE SE ACABA.

   Al llegar a la última hoja de Mateo se podía tocar el filo y no pasaba nada,
   y no pasar nada se lee como que el toque no entró. Ahora se cruza a Marcos.

   Eso obligó a separar dos preguntas que llevaban toda la vida siendo una, y
   es lo que esta prueba vigila que siga separado:
     · ¿queda hoja en ESTE libro?  → lo dice el CANTO, la raya del margen.
     · ¿hay a dónde ir?            → lo dicen el FILO y los botones de lejos.
   Apagar el filo al final de un libro sería mentir; no pintar el canto sería
   callarse que el texto de la hoja siguiente ya es de otro libro. */
const { abrir, cerrar, cerrarParcial, di, vale, titulo } = require('./comun');

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  titulo('el trazo del principio del libro');
  di('la raya', await p.evaluate(() => {
    const c = getComputedStyle(document.getElementById('cantoIzq'));
    return { ancho: c.width, redondeado: c.borderTopLeftRadius,
             marron: c.backgroundImage.indexOf('184, 137, 43') >= 0,
             puntasLevantadas: (c.maskImage || c.webkitMaskImage || '').indexOf('gradient') >= 0 };
  }).then(r => {
    vale('lleva el marrón del panel de Libros', r.marron);
    vale('con las puntas levantadas', r.puntasLevantadas);
    return r;
  }));
  vale('encendido en la primera hoja', await p.evaluate(() =>
    document.getElementById('cantoIzq').classList.contains('viva') &&
    !document.getElementById('cantoDer').classList.contains('viva')));

  titulo('hasta el final del libro y más allá');
  const cruce = await p.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1200));
    const cab = () => document.getElementById('pgCabeza').textContent.trim();
    const antes = cab();
    let enElFinal = null;
    for (let i = 0; i < 200; i++){
      const bt = document.querySelector('#zoomPasos [data-paso="1"]');
      if (!bt) break;
      /* justo antes de cruzar, se apunta cómo está el canto */
      if (document.getElementById('cantoDer').classList.contains('viva') && !enElFinal)
        enElFinal = { cabeza: cab(), botonVivo: !bt.disabled };
      bt.click();
      await new Promise(z => setTimeout(z, 850));
      if (cab().split(' ')[0] !== antes.split(' ')[0])
        return { cruzo:true, vueltas:i+1, de:antes, a:cab(), enElFinal };
    }
    return { cruzo:false, cabeza:cab(), enElFinal };
  });
  di('el viaje', cruce);
  vale('en la última hoja el canto se enciende', !!cruce.enElFinal, cruce.enElFinal);
  vale('y el botón NO se apaga', cruce.enElFinal && cruce.enElFinal.botonVivo);
  vale('cruza al libro siguiente', cruce.cruzo, cruce.de + ' → ' + cruce.a);
  vale('aterriza en su primera hoja', await p.evaluate(() =>
    document.getElementById('cantoIzq').classList.contains('viva') &&
    document.querySelectorAll('#pgBody .v').length > 0));

  titulo('y vuelve hacia atrás');
  /* Se espera a que pase, no un rato fijo: entrar a un libro POR EL FINAL
     obliga a paginarlo entero, y eso tarda lo que tarde. */
  const vuelta = await p.evaluate(async () => {
    const cab = () => document.getElementById('pgCabeza').textContent.trim();
    const antes = cab(), t0 = performance.now();
    document.querySelector('#zoomPasos [data-paso="-1"]').click();
    while (performance.now() - t0 < 20000 && cab().split(' ')[0] === antes.split(' ')[0])
      await new Promise(z => setTimeout(z, 120));
    await new Promise(z => setTimeout(z, 500));
    return { de:antes, a:cab(), tardo: Math.round(performance.now()-t0) + ' ms',
             cantoDer: document.getElementById('cantoDer').classList.contains('viva') };
  });
  di('la vuelta', vuelta);
  vale('vuelve al libro anterior', vuelta.de.split(' ')[0] !== vuelta.a.split(' ')[0],
       vuelta.de + ' → ' + vuelta.a);
  vale('entra por su ÚLTIMA hoja', vuelta.cantoDer);

  titulo('el panel de Libros se entera');
  di('la marca', await p.evaluate(async () => {
    /* Se sale del zoom por EL HUECO de debajo del libro. Tocar el libro ya no
       cierra —de lejos se pasa hoja y se tocan glosas—, y con el zoom puesto
       el titulillo no responde, así que el panel no llegaba a abrirse y esta
       comprobación contaba cero libros marcados sin que nada estuviera roto. */
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left+r.width/2), clientY:Math.round(r.bottom+60) }));
    await new Promise(z => setTimeout(z, 1000));
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 1000));
    const marcados = [...document.querySelectorAll('#canto [data-libro]')]
      .filter(x => x.classList.contains('aqui'));
    return { cuantos: marcados.length,
             cual: marcados[0] && marcados[0].dataset.libro,
             nombre: marcados[0] && marcados[0].textContent,
             cabeza: document.getElementById('pgCabeza').textContent.trim(),
             sinClasePisada: marcados.every(x => !x.classList.contains('viva')) };
  }).then(r => {
    vale('un solo libro marcado', r.cuantos === 1, r.cual + ' — ' + r.nombre);
    vale('y es el de la hoja', r.nombre && r.cabeza.startsWith(r.nombre), r.cabeza);
    vale('sin clases pisadas', r.sinClasePisada);
    return r;
  }));

  /* ================================================================
     EL LIBRO BAJO EL DEDO CRECE, Y LOS VECINOS SE APARTAN.

     La lista de libros son cuadritos de 26px con el nombre dentro, y con el
     dedo encima el nombre queda tapado justo cuando hay que leerlo. Ya había
     una lupa —un globo que dice qué hay debajo— y se pidió además que el
     cuadrito CREZCA: se arrastra el dedo por la lista y el de debajo se hace
     grande, el anterior vuelve a su tamaño, y los demás se corren un poco para
     dejarle sitio.

     CRECE DE CAJA Y NO CON UN transform, y ahí está la diferencia que se
     prueba. Un transform no ocupa sitio: el cuadrito se vería grande pero
     encima de sus vecinos, tapándolos, y nadie se apartaría. Creciendo de
     caja —letra, alto y relleno— la fila se reacomoda sola, que es justo lo
     que se pidió. Por eso la prueba no mira solo el que crece: mira que el
     de al lado SE MUEVA. Sin esa segunda mitad, un transform pasaría.

     EL GESTO ES EL DE VERDAD, con su pausa. La lupa no se gana moviéndose sino
     quedándose quieto 200 ms —si no, cualquier desliz para desplazar la lista
     la dispararía— así que el dedo se posa, espera, y solo entonces se
     arrastra. Y se arrastra TORCIDO, que una línea recta no es un dedo. */
  titulo('el libro bajo el dedo crece');
  const lup = await abrir();
  const pl = lup.pagina;
  const crecer = await pl.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    document.getElementById('pgCabeza').click(); await pausa(700);
    const pest = [...document.querySelectorAll('.pestanas button')]
                   .find(b => /libros/i.test(b.textContent));
    if (pest) pest.click();
    await pausa(700);
    const libros = [...document.querySelectorAll('#canto .rejilla-libros .tabo')];
    if (libros.length < 6) return { pocos: libros.length };
    const med = e => { const r = e.getBoundingClientRect();
      return { t:e.textContent.trim(), x:Math.round(r.left), y:Math.round(r.top),
               w:Math.round(r.width), h:Math.round(r.height),
               fs: parseFloat(getComputedStyle(e).fontSize) }; };
    /* El tercero y el cuarto: en medio de su renglón, con vecinos a los dos
       lados. El primero de una fila no probaría que nadie se aparta. */
    const uno = libros[2], dos = libros[3];
    const antes = { uno: med(uno), dos: med(dos) };
    const r1 = uno.getBoundingClientRect();
    const op = { bubbles:true, cancelable:true, pointerId:73, pointerType:'touch',
                 isPrimary:true, clientX: Math.round(r1.left + r1.width/2),
                 clientY: Math.round(r1.top + r1.height/2) };
    uno.dispatchEvent(new PointerEvent('pointerdown', op));
    await pausa(340);                       /* el dedo quieto: eso es la lupa */
    /* Y ahora se mueve, torcido, sin salir del mismo cuadrito. */
    document.dispatchEvent(new PointerEvent('pointermove',
      Object.assign({}, op, { clientX: op.clientX + 2, clientY: op.clientY + 1 })));
    await pausa(60);
    document.dispatchEvent(new PointerEvent('pointermove',
      Object.assign({}, op, { clientX: op.clientX + 3, clientY: op.clientY - 1 })));
    await pausa(420);                       /* que termine de crecer */
    const conDedo = { uno: med(uno), dos: med(dos),
                      marcado: uno.classList.contains('bajoeldedo'),
                      lupa: (document.getElementById('lupaLibro') || {}).textContent };
    /* Y el dedo sigue hasta el de al lado. */
    const r2 = dos.getBoundingClientRect();
    document.dispatchEvent(new PointerEvent('pointermove',
      Object.assign({}, op, { clientX: Math.round(r2.left + r2.width/2) + 1,
                              clientY: Math.round(r2.top + r2.height/2) - 1 })));
    await pausa(450);
    const movido = { uno: med(uno), dos: med(dos),
                     marcadoUno: uno.classList.contains('bajoeldedo'),
                     marcadoDos: dos.classList.contains('bajoeldedo') };
    /* Cancelar y no soltar: soltar abriría los capítulos y esto no va de eso. */
    document.dispatchEvent(new PointerEvent('pointercancel', op));
    await pausa(400);
    return { antes, conDedo, movido,
             enReposo: uno.classList.contains('bajoeldedo') ||
                       dos.classList.contains('bajoeldedo') };
  });
  di('antes', crecer.antes);
  di('con el dedo encima', crecer.conDedo);
  di('al pasar al de al lado', crecer.movido);
  vale('(la prueba es válida) la lupa se enganchó',
       crecer.pocos === undefined && crecer.conDedo.marcado === true,
       crecer.pocos !== undefined ? crecer.pocos + ' libros' : crecer.conDedo);
  vale('EL LIBRO BAJO EL DEDO CRECE',
       crecer.conDedo.uno.h > crecer.antes.uno.h + 4 &&
       crecer.conDedo.uno.w > crecer.antes.uno.w + 4 &&
       crecer.conDedo.uno.fs > crecer.antes.uno.fs,
       crecer.antes.uno.w + 'x' + crecer.antes.uno.h + ' → ' +
       crecer.conDedo.uno.w + 'x' + crecer.conDedo.uno.h);
  vale('  Y EL VECINO SE APARTA, o sea que crece de caja y no de transform',
       crecer.conDedo.dos.x !== crecer.antes.dos.x ||
       crecer.conDedo.dos.y !== crecer.antes.dos.y,
       crecer.antes.dos.x + ',' + crecer.antes.dos.y + ' → ' +
       crecer.conDedo.dos.x + ',' + crecer.conDedo.dos.y);
  vale('al pasar al siguiente, el primero vuelve a su tamaño',
       crecer.movido.marcadoUno === false &&
       crecer.movido.uno.h <= crecer.antes.uno.h + 1, crecer.movido.uno);
  vale('  y el nuevo es el que crece',
       crecer.movido.marcadoDos === true &&
       crecer.movido.dos.h > crecer.antes.dos.h + 4, crecer.movido.dos);
  vale('y al levantar el dedo no queda ninguno grande',
       crecer.enReposo === false, crecer.enReposo);
  await cerrarParcial(lup, 'la lupa');

  await cerrar(sesion);
})();
