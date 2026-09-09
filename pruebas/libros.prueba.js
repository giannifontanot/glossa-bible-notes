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
    /* LA ENTRADA SE MIRA EN MARCHA, no al final: una animación se comprueba
       mientras corre o no se comprueba. Se lee a los 60 ms, que es dentro de
       los 460 que dura. Y se mira el NOMBRE de la animación, no un número de
       opacidad de mitad de camino: el nombre dice que es la misma que usan
       LIBROS, GLOSAS, FORMATO y RESPALDO, que es justo lo que se pidió —«que
       se abra con un movimiento suave igual que ya se hace»—. Una prueba que
       midiera «se movió algo» pasaría con cualquier movimiento inventado. */
    const cuerpo = document.getElementById('cantoCuerpo');
    /* Y SE CUENTAN LOS ARRANQUES, que es lo que caza el fallo de abajo sin
       depender del reloj: un cambio de testamento tiene que valer UNA
       entrada, ni cero ni dos. */
    const arranques = [];
    cuerpo.addEventListener('animationstart', e => {
      if (e.target === cuerpo) arranques.push(e.animationName);
    });
    await toque(bAT); await pausa(60);
    const entrando = { anim: getComputedStyle(cuerpo).animationName,
                       dir: cuerpo.style.getPropertyValue('--dir') };
    await pausa(600);
    const enAT = lee();
    const reposo = { opacidad: getComputedStyle(cuerpo).opacity,
                     clase: cuerpo.classList.contains('cambia'),
                     arranques: arranques.length };
    /* Y AHORA SE CIERRA Y SE VUELVE A ABRIR SIN TOCAR LAS PESTAÑAS. */
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await pausa(900);
    await abrirLibros();
    const alVolver = { clase: cuerpo.classList.contains('cambia'),
                       arranques: arranques.length };
    return { enNT, enAT, entrando, reposo, alVolver,
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
  /* Y ENTRA CON EL MISMO MOVIMIENTO QUE LAS SECCIONES. La lista se cambiaba de
     golpe: 27 nombres se iban y aparecían 39 en el mismo fotograma, y eso se
     lee como un salto y no como «se abrió otra cosa». Se reusa entraDeLado, la
     animación que ya tenían LIBROS/GLOSAS/FORMATO/RESPALDO, con el sentido
     puesto en --dir: el Antiguo viene por la izquierda y el Nuevo por la
     derecha, que es como están las dos pestañas. */
  di('la entrada', JSON.stringify(tabs.entrando));
  vale('LA LISTA ENTRA CON LA MISMA ANIMACIÓN QUE LAS SECCIONES',
       tabs.entrando.anim === 'entraDeLado', tabs.entrando.anim);
  vale('  y por el lado de su pestaña: el Antiguo, desde la izquierda',
       tabs.entrando.dir === '-1', tabs.entrando.dir);
  vale('  y acaba entera, sin quedarse a medio fundir',
       tabs.reposo.opacidad === '1', tabs.reposo.opacidad);
  /* Y NO SE QUEDA ANIMANDO PARA SIEMPRE. La clase se ponía y no se quitaba
     nunca, y una clase de animación que se queda puesta vuelve a animar sola:
     cerrar LIBROS pone el panel en display:none, y volver a abrirlo REARRANCA
     las animaciones de dentro. O sea que desde el primer AT/NT, cada vez que
     se abría el panel la lista entraba de lado otra vez sin haber cambiado
     nada. Lo cazó Codex en revisión de la PR y se reprodujo contando los
     arranques: dos donde tenía que haber uno.
     Se cuentan y no se cronometran a propósito: un «se ve quieta a los 60 ms»
     pasaría por casualidad según lo que tardara el panel en abrirse. */
  di('al reabrir sin tocar pestañas', JSON.stringify(tabs.alVolver));
  vale('UN CAMBIO DE TESTAMENTO VALE UNA ENTRADA, Y SE LIMPIA AL ACABAR',
       tabs.reposo.arranques === 1 && tabs.reposo.clase === false,
       tabs.reposo.arranques + ' arranques, clase puesta: ' + tabs.reposo.clase);
  vale('  y REABRIR EL PANEL no vuelve a animar la lista',
       tabs.alVolver.arranques === 1 && tabs.alVolver.clase === false,
       tabs.reposo.arranques + ' → ' + tabs.alVolver.arranques + ' arranques');

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
     TOCAR EL LIBRO LO MARCA Y ABRE SUS CAPÍTULOS. NO MUEVE LA HOJA.

     Esto estuvo escrito al revés, y el «al revés» duró un día. La idea era
     buena de leer —«pico Marcos, llévame a Marcos»— y la pidió el dueño del
     repo; en cuanto la usó, la retiró: en un teléfono, el libro se toca de
     paso, buscando, y cada roce se llevaba la hoja a otro sitio y había que
     volver. Elegir libro es el primero de tres pasos —libro, capítulo,
     versículo— y ninguno de los tres debe mover nada por su cuenta.

     Así que ahora el toque hace dos cosas y NINGUNA de ellas es viajar:
     · marca el libro, para que se vea cuál se está eligiendo;
     · y abre la cascada de capítulos, que es el paso siguiente.

     Se comprueban las dos, y sobre todo la que las sostiene: que la cabecera
     no cambie. Y no se mira solo al instante: el salto de antes tardaba —
     repaginaba el libro entero— así que un «no se ha movido» medido a los 200
     ms podría ser un salto en camino. Se espera de verdad y se vuelve a
     mirar. */
  titulo('tocar un libro lo marca, y no mueve la hoja');
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
    /* El ÚLTIMO de los que sí están en los datos: el salto más largo que
       había, o sea el que más se notaría si todavía saltara. */
    const vivos = [...document.querySelectorAll('#canto .tabo.viva')];
    if (vivos.length < 2) return { pocos: vivos.length };
    const otro = vivos[vivos.length - 1];
    const pedido = otro.textContent.trim(), antes = cab();
    /* El aspecto de un NO elegido, para tenerlo con qué comparar: se lee de
       otro cualquiera de la lista y no de un valor escrito aquí. */
    const suelto = vivos[0];
    const sinElegir = { fondo: getComputedStyle(suelto).backgroundColor,
                        color: getComputedStyle(suelto).color };
    await toque(otro);
    await pausa(300);
    const alInstante = { cabeza: cab() };
    /* Y CINCO SEGUNDOS DESPUÉS, que es de sobra para el salto más largo. */
    await pausa(5000);
    const caps = document.getElementById('flyCaps');
    const marca = document.querySelector('#canto .tabo.aqui');
    const tab = document.querySelector('.canto-tab.aqui');
    const otroTab = document.querySelector('.canto-tab:not(.aqui)');
    return { pedido, antes, alInstante, sinElegir,
             despues: cab(),
             marcado: marca && marca.textContent.trim(),
             fondo: getComputedStyle(otro).backgroundColor,
             color: getComputedStyle(otro).color,
             tabFondo: tab ? getComputedStyle(tab).backgroundColor : null,
             tabColor: tab ? getComputedStyle(tab).color : null,
             tabSueltoFondo: otroTab ? getComputedStyle(otroTab).backgroundColor : null,
             cascada: !!caps && getComputedStyle(caps).display !== 'none',
             panel: getComputedStyle(document.getElementById('canto')).display !== 'none' };
  });
  di('al tocar el libro', JSON.stringify(salto));
  vale('(la prueba es válida) había libros que tocar', salto.pocos === undefined,
       salto.pocos + ' vivos');
  vale('TOCAR EL LIBRO NO MUEVE LA HOJA, ni al momento ni cinco segundos después',
       salto.alInstante.cabeza === salto.antes && salto.despues === salto.antes,
       salto.antes + ' → ' + (salto.alInstante || {}).cabeza + ' → ' + salto.despues);
  vale('  pero SÍ lo marca', salto.marcado === salto.pedido,
       'pedido ' + salto.pedido + ' · marcado ' + salto.marcado);
  /* EL PAR DE TONOS: BLANCO LO QUE NO ESTÁ ELEGIDO, SEPIA LO QUE SÍ, Y SOBRE
     EL SEPIA LA LETRA BLANCA. Aquí decía lo contrario —«sin que el nombre se
     ponga blanco»— y no era un error de entonces: era lo que el dueño del repo
     había pedido cuando la marca era un fondo dorado y la letra en crema, dos
     estados parecidos donde el cambio de letra se leía como un parpadeo.
     Mirándolo puesto pidió otra cosa: cambiar el par entero. Con un claro y un
     oscuro ya no hay parpadeo que evitar, y la letra blanca es lo que hace
     legible el sepia. Una prueba que siguiera pidiendo lo de antes llamaría
     fallo al cambio que se pidió, que en este repo ya ha pasado cuatro veces.

     Se mide REPOSADO: .tabo lleva una transición de .34s y a medio camino da
     un sepia a medias.

     Y NO SE COMPARA CONTRA UN HEXADECIMAL ESCRITO AQUÍ salvo el blanco, que es
     el blanco. Lo que se pide es la RELACIÓN: que el elegido sea oscuro, que
     los demás sean claros, y que la letra de cada uno sea lo contrario de su
     fondo. Así el día que el sepia de la paleta se retoque, esto sigue
     diciendo lo que tiene que decir. */
  const luz = c => { const m = (String(c).match(/[\d.]+/g) || []).map(Number);
                     return m.length >= 3 ? (m[0] + m[1] + m[2]) / 3 : null; };
  vale('  EL ELEGIDO VA EN SEPIA, oscuro, y los demás en blanco',
       luz(salto.fondo) < 150 && luz(salto.sinElegir.fondo) > 230,
       'elegido ' + salto.fondo + ' · suelto ' + salto.sinElegir.fondo);
  vale('  Y SU LETRA VA EN BLANCO, que es lo que lo hace legible',
       luz(salto.color) > 230 && luz(salto.sinElegir.color) < 150,
       'elegido ' + salto.color + ' · suelto ' + salto.sinElegir.color);
  /* Y LA PESTAÑA AT/NT LLEVA EL MISMO PAR, que era la mitad del encargo: dos
     maneras de marcar en el mismo panel son dos cosas que aprender. */
  vale('  y la pestaña AT/NT marca igual: sepia con letra blanca',
       luz(salto.tabFondo) < 150 && luz(salto.tabColor) > 230 &&
       luz(salto.tabSueltoFondo) > 230,
       'pestaña ' + salto.tabFondo + ' / ' + salto.tabColor +
       ' · la otra ' + salto.tabSueltoFondo);

  /* ================================================================
     LOS BOTONES SON CHICLETS: ESQUINA REDONDA Y RELIEVE.

     Pedido por el dueño del repo, y son las DOS cosas: con solo la esquina se
     quedan en botones redonditos y planos; lo que los convierte en pastillas
     es el relieve —una sombra blanca dentro por arriba, una tostada dentro por
     abajo, y una de fuera corta que los despega del papel—. Se piden las dos
     porque quitar cualquiera de ellas deshace el encargo sin romper la otra.

     Y SE PIDE EL MISMO TRATO EN LAS PESTAÑAS AT/NT, que es donde el encargo se
     paró: no en las de arriba —LIBROS, GLOSAS, FORMATO, RESPALDO—, que siguen
     siendo pestañas con su esquina de abajo recta. Se comprueba también eso,
     que si no «lo mismo en todas partes» pasaría igual de verde.

     Los números no se leen de la hoja de estilos sino que se piden por
     encima: la esquina, que llegue a 10 px —por debajo la curva no se lee a la
     altura que tienen en el teléfono—; y del relieve, que HAYA sombra dentro y
     fuera, sin exigir cuántas ni de qué tono, que eso es la técnica y puede
     cambiar. */
  const chiclets = await p2.evaluate(() => {
    const lee = e => {
      if (!e) return null;
      const c = getComputedStyle(e);
      return { radio: parseFloat(c.borderTopLeftRadius) || 0,
               abajo: parseFloat(c.borderBottomLeftRadius) || 0,
               sombra: c.boxShadow || 'none' };
    };
    const libro = document.querySelector('#canto .tabo.viva') ||
                  document.querySelector('#canto .tabo');
    const tab = document.querySelector('.canto-tab');
    const seccion = [...document.querySelectorAll('.pestanas button')]
                      .find(b => /libros/i.test(b.textContent));
    return { libro: lee(libro), tab: lee(tab), seccion: lee(seccion) };
  });
  di('los chiclets', JSON.stringify(chiclets));
  const tieneDentro = s => /inset/.test(s || '');
  const tieneFuera  = s => (s || '').split(/,(?![^()]*\))/).some(t => !/inset/.test(t) && /px/.test(t));
  vale('LOS LIBROS TIENEN LA ESQUINA REDONDA DE UN CHICLET, arriba y abajo',
       !!chiclets.libro && chiclets.libro.radio >= 10 && chiclets.libro.abajo >= 10,
       chiclets.libro && (chiclets.libro.radio + ' / ' + chiclets.libro.abajo + ' px'));
  vale('  Y RELIEVE: sombra por dentro y por fuera, que es lo que los abomba',
       !!chiclets.libro && tieneDentro(chiclets.libro.sombra) &&
       tieneFuera(chiclets.libro.sombra), chiclets.libro && chiclets.libro.sombra);
  vale('  y las pestañas AT/NT llevan el mismo trato',
       !!chiclets.tab && chiclets.tab.radio >= 10 && chiclets.tab.abajo >= 10 &&
       tieneDentro(chiclets.tab.sombra),
       chiclets.tab && (chiclets.tab.radio + ' / ' + chiclets.tab.abajo + ' px · ' +
                        chiclets.tab.sombra));
  /* Y EL CONTROL, que es lo que hace que lo de arriba signifique algo: las
     pestañas de SECCIÓN no son chiclets. Sin esta línea, redondearlo todo
     pasaría las tres comprobaciones anteriores. */
  vale('  CONTROL: las de arriba siguen siendo pestañas, con la esquina de abajo recta',
       !!chiclets.seccion && chiclets.seccion.abajo <= 4,
       chiclets.seccion && (chiclets.seccion.radio + ' / ' + chiclets.seccion.abajo + ' px'));
  vale('  con la cascada de capítulos abierta, que es el paso siguiente',
       salto.cascada === true);
  vale('  y el panel de Libros sin cerrarse', salto.panel === true);

  /* ================================================================
     Y LA MARCA AGUANTA LOS REPINTADOS.

     Ésta es la otra mitad de que tocar un libro ya no salte, y faltaba. La
     marca dorada la pintaba refrescarLibroActual leyendo LIBRO —«aquí estás
     leyendo»—, y desde que el toque no salta, LIBRO no cambia: la marca que
     pone el toque la borraba el primer repintado que pasara por ahí. Y por ahí
     pasa cualquier cosa —pasar de hoja, un resize—, que en un teléfono salta
     solo cada vez que el navegador esconde o enseña su barra de direcciones.
     El dueño del repo lo dijo corto: «al tocar un libro no se marca». Aquí
     aguantaba, porque entre el toque y la comprobación no pasaba nada.

     Así que se hace que pase: dos resize y una rodada de la lista, con el
     panel abierto. Y se comprueba también lo contrario —cerrar el panel
     OLVIDA la elección—, que sin eso «la marca aguanta» se cumpliría con una
     marca pegada para siempre, que es otro fallo con el mismo aspecto. */
  const aguanta = await p2.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const toque = async e => {
      const r = e.getBoundingClientRect();
      const o = { bubbles:true, cancelable:true, pointerId:92, pointerType:'touch',
                  isPrimary:true, clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
      e.dispatchEvent(new PointerEvent('pointerdown', o));
      await pausa(40);
      e.dispatchEvent(new PointerEvent('pointerup', o));
      e.dispatchEvent(new MouseEvent('click', Object.assign({ detail:1 }, o)));
    };
    const marca = () => (document.querySelector('#canto .tabo.aqui') || {}).textContent || 'ninguna';
    const abierto = () => getComputedStyle(document.getElementById('canto')).display !== 'none';
    const vivos = [...document.querySelectorAll('#canto .tabo.viva')];
    if (!vivos.length) return { pocos:true };
    const otro = vivos[vivos.length - 1], pedido = otro.textContent.trim();
    await toque(otro); await pausa(300);
    const traTocar = marca();
    window.dispatchEvent(new Event('resize')); await pausa(400);
    window.dispatchEvent(new Event('resize')); await pausa(400);
    document.getElementById('cantoCuerpo').scrollTop = 200; await pausa(400);
    const traZarandear = marca();
    const sigueAbierto = abierto();
    /* Y ahora se cierra, que tiene que olvidarla. */
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await pausa(900);
    document.getElementById('pgCabeza').click(); await pausa(800);
    const pest = [...document.querySelectorAll('.pestanas button')]
                   .find(b => /libros/i.test(b.textContent));
    if (pest) pest.click();
    await pausa(900);
    return { pedido, traTocar, traZarandear, sigueAbierto, alVolverAAbrir: marca() };
  });
  di('la marca zarandeada', JSON.stringify(aguanta));
  vale('LA MARCA AGUANTA LOS REPINTADOS: dos resize y una rodada',
       !aguanta.pocos && aguanta.traTocar === aguanta.pedido &&
       aguanta.traZarandear === aguanta.pedido && aguanta.sigueAbierto === true,
       aguanta.pedido + ': ' + aguanta.traTocar + ' → ' + aguanta.traZarandear);
  vale('  y CERRAR EL PANEL la olvida, que es lo contrario y también hace falta',
       aguanta.alVolverAAbrir !== aguanta.pedido, aguanta.alVolverAAbrir);

  /* ================================================================
     LA CASCADA DE CAPÍTULOS SE ABRE DEBAJO DEL LIBRO, SIN TAPARLO.

     Iba al lado, alineando su cabecera con la del libro… salvo que no
     cupiera, que en un teléfono es casi siempre: la lista ocupa el ancho, así
     que la cajita no tenía sitio a ningún lado. Y como además se recolocaba
     hacia arriba para caber entera, con un libro de la mitad de abajo subía y
     tapaba justamente el libro recién tocado. Medido antes del arreglo: con
     Apocalipsis, la cascada de 461 a 720 sobre un libro de 465 a 517.

     Se prueban los TRES sitios que se comportan distinto —el primer libro, uno
     de en medio y el último—, porque el fallo solo salía abajo: una prueba con
     el primero habría pasado siempre. Y se pide lo que el dueño del repo
     pidió: que el libro elegido se siga viendo. */
  const cascada = await p2.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const toque = async e => {
      const r = e.getBoundingClientRect();
      const o = { bubbles:true, cancelable:true, pointerId:93, pointerType:'touch',
                  isPrimary:true, clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
      e.dispatchEvent(new PointerEvent('pointerdown', o));
      await pausa(40);
      e.dispatchEvent(new PointerEvent('pointerup', o));
      e.dispatchEvent(new MouseEvent('click', Object.assign({ detail:1 }, o)));
    };
    const libros = [...document.querySelectorAll('#canto .tabo.viva, #canto .tabo.aqui')];
    if (libros.length < 3) return { pocos: libros.length };
    const malas = [], vistos = [];
    for (const i of [0, Math.floor(libros.length / 2), libros.length - 1]){
      const b = libros[i];
      b.scrollIntoView({ block:'nearest' }); await pausa(250);
      await toque(b); await pausa(700);
      const rb = b.getBoundingClientRect();
      const f = document.getElementById('flyCaps');
      if (!f || getComputedStyle(f).display === 'none'){ malas.push({ libro:b.textContent.trim(), sinCascada:true }); continue; }
      const rf = f.getBoundingClientRect();
      const tapa = !(rf.right <= rb.left || rf.left >= rb.right ||
                     rf.bottom <= rb.top || rf.top >= rb.bottom);
      /* Y CABE ENTERA EN LA ESCENA, que es la otra mitad: abrirla debajo sin
         recortarla la dejaría con la mitad fuera de la pantalla. */
      const esc = document.querySelector('.stage').getBoundingClientRect();
      const dentro = rf.top >= esc.top - 1 && rf.bottom <= esc.bottom + 1;
      vistos.push({ libro: b.textContent.trim(),
                    debajo: Math.round(rf.top - rb.bottom),
                    alto: Math.round(rf.height) });
      if (tapa || !dentro)
        malas.push({ libro: b.textContent.trim(), tapa, dentro,
                     libro_top: Math.round(rb.top), libro_bottom: Math.round(rb.bottom),
                     casc_top: Math.round(rf.top), casc_bottom: Math.round(rf.bottom) });
    }
    return { malas, vistos };
  });
  di('la cascada', JSON.stringify(cascada));
  vale('(la prueba es válida) se probaron tres libros de la lista',
       !cascada.pocos && cascada.vistos.length === 3,
       cascada.pocos !== undefined ? cascada.pocos + ' libros' : cascada.vistos.length + ' probados');
  vale('LA CASCADA NUNCA TAPA EL LIBRO QUE SE ACABA DE TOCAR, y cabe entera',
       !!cascada.malas && cascada.malas.length === 0,
       cascada.malas && cascada.malas.length ? JSON.stringify(cascada.malas)
                                             : JSON.stringify(cascada.vistos));
  await cerrarParcial(ses2, 'tocar un libro');

  await cerrar(sesion);
})();
