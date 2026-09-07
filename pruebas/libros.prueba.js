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

  /* AQUÍ ESTABA LA PRUEBA DE QUE ARRASTRAR POR LOS LIBROS NO SELECCIONABA SUS
     NOMBRES, y se va con la regla que vigilaba: el dueño del repo pidió deshacer
     el user-select:none de la rejilla porque en el aparato de verdad no
     funcionaba bien. Una prueba que exige lo contrario de lo que se decidió no
     es una red, es un obstáculo.
     Si algún día se vuelve a atacar el subrayado azul —por otro camino, ver el
     comentario de .rejilla-libros en index.html— la prueba que hace falta es la
     de aquí abajo: arrastre de ratón TORCIDO y mirar getSelection() al final,
     no la propiedad CSS, que puede estar puesta en un sitio que no cubra el
     hueco entre botones. */
  await cerrarParcial(lup, 'la lupa');

  /* ================================================================
     LAS DOS PESTAÑAS DEL TESTAMENTO.

     El panel enseña UN testamento y una pestaña dice cuál. Es la tercera forma
     de esta lista —los 66 seguidos, luego cada testamento en su mitad, ahora
     uno a la vez— y lo que compra es el alto: con la lista entera para ella,
     los botones de los libros caben AL DOBLE de altura, que es lo que de
     verdad se atina con el dedo.

     Se piden cuatro cosas, y la cuarta es la que no se ve mirando la pantalla:
     que la pestaña elegida SE GUARDE. Quien está leyendo el Antiguo vuelve al
     Antiguo sin tener que volver a decirlo, y eso solo se comprueba yéndose y
     volviendo. */
  titulo('las dos pestañas: Antiguo y Nuevo');
  const pes = await abrir();
  const pp = pes.pagina;
  const tabs = await pp.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const toque = async e => {
      const r = e.getBoundingClientRect();
      const o = { bubbles:true, cancelable:true, pointerId:64, pointerType:'touch',
                  isPrimary:true, clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
      e.dispatchEvent(new PointerEvent('pointerdown', o)); await pausa(30);
      e.dispatchEvent(new PointerEvent('pointerup', o));
      e.dispatchEvent(new MouseEvent('click', Object.assign({ detail:1 }, o)));
    };
    const abrirLibros = async () => {
      document.getElementById('pgCabeza').click(); await pausa(700);
      const pest = [...document.querySelectorAll('.pestanas button')]
                     .find(b => /libros/i.test(b.textContent));
      if (pest) pest.click();
      await pausa(800);
    };
    await abrirLibros();
    const lee = () => {
      const t = [...document.querySelectorAll('.canto-tab')];
      const libros = [...document.querySelectorAll('#canto .tabo')];
      const cab = document.getElementById('cantoCab').getBoundingClientRect();
      return { cuales: t.map(x => x.dataset.testa),
               rotulos: t.map(x => x.textContent.trim()),
               marcada: (t.find(x => x.classList.contains('aqui')) || {}).dataset,
               /* Centradas: el punto medio del grupo contra el de la cabecera. */
               centradas: t.length === 2 && Math.abs(
                 ((t[0].getBoundingClientRect().left +
                   t[1].getBoundingClientRect().right) / 2) -
                 (cab.left + cab.width / 2)) <= 3,
               altoTab: t[0] ? Math.round(t[0].getBoundingClientRect().height) : 0,
               cuantos: libros.length,
               primero: libros[0] && libros[0].textContent.trim(),
               altoLibro: libros[0] ? Math.round(libros[0].getBoundingClientRect().height) : 0 };
    };
    const enNT = lee();
    const bAT = document.querySelector('.canto-tab[data-testa="AT"]');
    await toque(bAT); await pausa(600);
    const enAT = lee();
    return { enNT, enAT,
             marcadaNT: enNT.marcada && enNT.marcada.testa,
             marcadaAT: enAT.marcada && enAT.marcada.testa,
             guardado: (JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}') || {}).cantoTesta };
  });
  di('en el Nuevo', JSON.stringify(tabs.enNT));
  di('en el Antiguo', JSON.stringify(tabs.enAT));
  vale('HAY DOS PESTAÑAS, AT Y NT',
       JSON.stringify(tabs.enNT.cuales) === JSON.stringify(['AT','NT']),
       tabs.enNT.rotulos.join(' · '));
  vale('  centradas en la cabecera, que es donde se leen como interruptor',
       tabs.enNT.centradas === true);
  vale('  y con blanco de dedo, 44 px o más', tabs.enNT.altoTab >= 44,
       tabs.enNT.altoTab + ' px');
  /* Arranca en el Nuevo: es donde arranca la lectura y donde están los datos
     que vienen incluidos. */
  vale('arranca en el NUEVO, con sus 27 libros',
       tabs.marcadaNT === 'NT' && tabs.enNT.cuantos === 27 &&
       tabs.enNT.primero === 'Mateo',
       tabs.enNT.cuantos + ' · ' + tabs.enNT.primero);
  vale('  y NO se ven los del Antiguo mezclados',
       tabs.enNT.cuantos === 27, tabs.enNT.cuantos + ' libros en la lista');
  vale('TOCAR «AT» CAMBIA LA LISTA ENTERA',
       tabs.marcadaAT === 'AT' && tabs.enAT.cuantos === 39 &&
       tabs.enAT.primero === 'Génesis',
       tabs.enAT.cuantos + ' · ' + tabs.enAT.primero);
  /* EL DOBLE DE ALTO, que es lo que compra enseñar un testamento y no dos.
     26 px eran los de antes; 52 son los de ahora. */
  vale('LOS LIBROS VAN AL DOBLE DE ALTO', tabs.enNT.altoLibro === 52,
       tabs.enNT.altoLibro + ' px');
  vale('y la pestaña elegida se guarda', tabs.guardado === 'AT', tabs.guardado);

  /* Y SOBREVIVE A CERRAR EL LIBRO. Guardarlo en los ajustes y no volver a
     leerlo sería exactamente el mismo fallo con más pasos. */
  /* reload() del andamio ya espera a que la portada se vaya. */
  await pp.reload();
  await pp.waitForTimeout(300);
  const trasRecargar = await pp.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    document.getElementById('pgCabeza').click(); await pausa(700);
    const pest = [...document.querySelectorAll('.pestanas button')]
                   .find(b => /libros/i.test(b.textContent));
    if (pest) pest.click();
    await pausa(800);
    return { marcada: (document.querySelector('.canto-tab.aqui') || {}).dataset.testa,
             cuantos: document.querySelectorAll('#canto .tabo').length };
  });
  di('al volver', JSON.stringify(trasRecargar));
  vale('AL VOLVER SIGUE EN EL ANTIGUO',
       trasRecargar.marcada === 'AT' && trasRecargar.cuantos === 39,
       JSON.stringify(trasRecargar));
  await cerrarParcial(pes, 'las pestañas');

  /* ================================================================
     TOCAR EL LIBRO YA TE LLEVA AL LIBRO.

     Antes el toque solo abría la cascada de capítulos: el libro no quedaba
     elegido hasta tocar además un capítulo Y un versículo, o sea tres toques
     para lo que se pide en uno —«pico Marcos, llévame a Marcos»—. Lo levantó
     el dueño del repo usándolo.

     Se piden las TRES cosas a la vez, y ninguna sobra:
     · que se cambie de libro de verdad —no que se marque y ya—;
     · que la cascada de capítulos SIGA puesta, que es lo que hace que no se
       pierda nada: quien quería un capítulo en concreto lo tiene ahí;
     · y que el panel de Libros no se cierre, que es de donde cuelga la
       cascada. Sin esta tercera, «sigue puesta» podría pasar con el panel
       yéndose por debajo.

     El salto entre libros lejanos es LARGO —repagina y voltea un bonche— así
     que se espera de verdad y se mira el rótulo de la cabecera, que es lo que
     el lector ve. */
  titulo('tocar un libro lleva a ese libro');
  const ses2 = await abrir();
  const p2 = ses2.pagina;
  const salto = await p2.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const toque = async e => {
      const r = e.getBoundingClientRect();
      const o = { bubbles:true, cancelable:true, pointerId:91, pointerType:'touch',
                  isPrimary:true, clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
      e.dispatchEvent(new PointerEvent('pointerdown', o));
      await pausa(40);
      e.dispatchEvent(new PointerEvent('pointerup', o));
      e.dispatchEvent(new MouseEvent('click', Object.assign({ detail:1 }, o)));
    };
    const cab = () => document.getElementById('pgCabeza').textContent.trim();
    document.getElementById('pgCabeza').click(); await pausa(800);
    const pest = [...document.querySelectorAll('.pestanas button')]
                   .find(b => /libros/i.test(b.textContent));
    if (pest) pest.click();
    await pausa(900);
    /* El ÚLTIMO de los que sí están en los datos: el salto más largo que hay,
       que es el que peor lo pasa. */
    const vivos = [...document.querySelectorAll('#canto .tabo.viva')];
    if (vivos.length < 2) return { pocos: vivos.length };
    const otro = vivos[vivos.length - 1];
    const pedido = otro.textContent.trim(), antes = cab();
    await toque(otro);
    /* Se espera a que llegue, hasta seis segundos: un salto de punta a punta
       repagina el libro entero antes de voltear nada. */
    for (let i = 0; i < 24 && cab() === antes; i++) await pausa(250);
    const caps = document.getElementById('flyCaps');
    const marca = document.querySelector('#canto .tabo.aqui');
    return { pedido, antes, despues: cab(),
             marcado: marca && marca.textContent.trim(),
             cascada: !!caps && getComputedStyle(caps).display !== 'none',
             panel: getComputedStyle(document.getElementById('canto')).display !== 'none' };
  });
  di('al tocar el libro', JSON.stringify(salto));
  vale('(la prueba es válida) había libros que tocar', salto.pocos === undefined,
       salto.pocos + ' vivos');
  vale('TOCAR EL LIBRO CAMBIA DE LIBRO',
       salto.marcado === salto.pedido && salto.despues !== salto.antes,
       'pedido ' + salto.pedido + ' · marcado ' + salto.marcado +
       '  ·  ' + salto.antes + ' → ' + salto.despues);
  vale('  y la cabecera ya dice el libro nuevo',
       typeof salto.despues === 'string' &&
       salto.despues.indexOf(salto.pedido) === 0,
       salto.despues);
  vale('  con la cascada de capítulos todavía puesta', salto.cascada === true);
  vale('  y el panel de Libros sin cerrarse', salto.panel === true);
  await cerrarParcial(ses2, 'tocar un libro');

  await cerrar(sesion);
})();
