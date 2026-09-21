/* ENCUENTROS: LA QUINTA SECCIÓN, Y EL SIGNO DE COMPARTIR.

   Dos encargos del dueño del repo que se prueban juntos porque tocan la misma
   barra:

   · una sección nueva detrás de Glosas, con una pestaña por encuentro —Zaqueo
     y la mujer samaritana— y el sitio hecho para la historia de cada uno;
   · y la pestaña de Respaldo deja de decir «Share» y pasa a llevar el punto
     que se abre en otros dos, que es el signo de compartir que reconoce
     cualquiera que use internet.

   LO QUE DE VERDAD SE VIGILA AQUÍ ES UNA TRAMPA. ponerBarra rehace la barra de
   secciones en cada apertura, y para quitar la vieja hace
   el.querySelector('.pestanas') DENTRO del panel. Esa búsqueda alcanza a
   cualquier descendiente, así que la barra de pestañas de dentro de Encuentros
   NO se puede llamar .pestanas: se borraría sola en la segunda apertura, sin
   error y sin aviso, dejando la historia de Zaqueo a la vista y ninguna manera
   de llegar a la otra. Por eso aquí se abre, se cierra y se vuelve a abrir, que
   es el gesto que lo destapa. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

/* Abrir la burbuja y tocar una pestaña de sección, como se hace con un dedo.
   LA BARRA DEL PANEL QUE SE VE, no la primera del documento: los paneles
   cerrados se quedan dentro con display:none y van antes en el orden del
   marcado, así que un querySelector suelto toca una barra invisible. */
const IR_A = `async (sec) => {
  const pausa = ms => new Promise(z => setTimeout(z, ms));
  const visible = () => [...document.querySelectorAll('.rollo')]
    .find(r => getComputedStyle(r).display !== 'none');
  if (!visible()){ document.getElementById('pgCabeza').click(); await pausa(900); }
  const t = (visible() || document).querySelector('.pestanas [data-sec="' + sec + '"]');
  if (!t) return false;
  t.click();
  await pausa(1200);
  return true;
}`;

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  const irA = sec => p.evaluate(`(${IR_A})(${JSON.stringify(sec)})`);

  /* EL RELATO NO SE PIDE AL ARRANCAR, y esto se mira ANTES de tocar nada: son
     diecisiete kilobytes y una tipografía de fuera, y al arrancar lo que
     importa es que aparezca la primera hoja del libro. Después de abrir
     Encuentros ya no se puede comprobar. */
  titulo('el relato no se pide hasta que se va a leer');
  const alArrancar = await p.evaluate(() =>
    [...document.querySelectorAll('.enc-marco')].map(m => m.getAttribute('src')));
  di('marcos con src al arrancar', alArrancar);
  /* La línea de validez: si no hubiera marcos, la de abajo saldría verde sobre
     una lista vacía. */
  vale('(la prueba es válida) hay un marco esperando', alArrancar.length === 1,
       alArrancar.length);
  vale('y todavía no ha pedido nada', alArrancar.every(x => x === null),
       JSON.stringify(alArrancar));

  /* ---------------- la barra ---------------- */
  titulo('la barra lleva cinco, y Encuentros va detrás de Glosas');
  await p.evaluate(() => document.getElementById('pgCabeza').click());
  await p.waitForTimeout(1000);
  const barra = await p.evaluate(() => {
    const v = [...document.querySelectorAll('.rollo')]
      .find(r => getComputedStyle(r).display !== 'none');
    const bs = [...v.querySelectorAll('.pestanas button')];
    return { secs: bs.map(b => b.dataset.sec),
             renglones: [...new Set(bs.map(b => Math.round(b.getBoundingClientRect().top)))].length,
             seSalen: bs.some(b => b.getBoundingClientRect().right >
                                   v.getBoundingClientRect().right + 1) };
  });
  di('las secciones, en su orden', barra.secs);
  vale('están las cinco', barra.secs.length === 5, barra.secs.length);
  /* El orden se pidió así —«un tab nuevo después de Glosas»— y es lo único de
     la barra que un cambio de rótulo no puede romper sin que se note. */
  vale('ENCUENTROS VA JUSTO DETRÁS DE GLOSAS',
       barra.secs.indexOf('encuentros') === barra.secs.indexOf('glosas') + 1 &&
       barra.secs.indexOf('glosas') >= 0, barra.secs.join(' · '));
  /* Y que la quinta no haya partido el renglón: en un teléfono de 412 las
     cinco caben en una línea, y si un día dejan de caber es mejor enterarse
     aquí que en una captura. El caso de 320 tiene su propia cuenta escrita en
     el CSS, donde se le bajó el relleno. */
  vale('en un solo renglón y sin salirse',
       barra.renglones === 1 && barra.seSalen === false,
       barra.renglones + ' renglón · se salen: ' + barra.seSalen);

  /* ---------------- el signo de compartir ---------------- */
  titulo('la pestaña de compartir es un signo, no una palabra');
  const signo = await p.evaluate(() => {
    const v = [...document.querySelectorAll('.rollo')]
      .find(r => getComputedStyle(r).display !== 'none');
    const b = v.querySelector('.pestanas [data-sec="respaldo"]');
    const svg = b && b.querySelector('svg.compartir');
    if (!svg) return { falta:true };
    const r = svg.getBoundingClientRect();
    return { texto:b.textContent.trim(), nombre:b.getAttribute('aria-label'),
             titulo:b.getAttribute('title'),
             puntos:svg.querySelectorAll('circle').length,
             varas:svg.querySelectorAll('path').length,
             ancho:Math.round(r.width), alto:Math.round(r.height),
             /* el color se mide en el dibujo, no en el botón: currentColor se
                resuelve al pintar y lo que importa es con qué se pinta */
             relleno:getComputedStyle(svg.querySelector('circle')).fill,
             letra:getComputedStyle(b).color };
  });
  di('el signo', signo);
  vale('la pestaña no dice ninguna palabra', !signo.falta && signo.texto === '',
       JSON.stringify(signo.texto));
  /* Un dibujo sin nombre no dice nada a quien no lo ve, y esta pestaña es por
     donde se sale de tus glosas a otro navegador. */
  vale('  pero tiene nombre para quien no lo ve',
       !signo.falta && !!signo.nombre && signo.nombre === signo.titulo, signo.nombre);
  /* Tres puntos y algo que los una. Las dos varas viajan dentro de UN solo
     path —dos trazos con su M cada uno—, así que aquí se cuentan los puntos,
     que son el signo, y se exige que haya trazo: dos puntos sueltos y uno
     aparte no son el signo de compartir, son tres lunares. Contar dos paths
     sería atar la prueba a cómo está dibujado y no a lo que dice. */
  vale('es un punto que se abre en otros dos',
       !signo.falta && signo.puntos === 3 && signo.varas >= 1,
       signo.puntos + ' puntos · ' + signo.varas + ' path con las varas');
  vale('y se ve de verdad', !signo.falta && signo.ancho > 8 && signo.alto > 8,
       signo.ancho + 'x' + signo.alto);

  /* EL COLOR ES LA MITAD QUE SE ROMPE SOLA. La pestaña encendida se pinta de
     marrón con la letra clara, así que un signo con su color escrito a mano se
     queda oscuro sobre el marrón: invisible justo en la pestaña que estás
     mirando. Se mide apagada y encendida, y se exige que el dibujo lleve el
     mismo color que la letra en las dos. */
  await irA('respaldo');
  const encendida = await p.evaluate(() => {
    const v = [...document.querySelectorAll('.rollo')]
      .find(r => getComputedStyle(r).display !== 'none');
    const b = v.querySelector('.pestanas [data-sec="respaldo"]');
    const svg = b.querySelector('svg.compartir');
    return { aqui:b.classList.contains('aqui'),
             relleno:getComputedStyle(svg.querySelector('circle')).fill,
             trazo:getComputedStyle(svg.querySelector('path')).stroke,
             letra:getComputedStyle(b).color };
  });
  di('apagada y encendida', { apagada:signo.letra, encendida:encendida.letra });
  /* La línea de validez: si los dos colores fueran el mismo, lo de abajo
     saldría verde sin haber probado nada. */
  vale('(la prueba es válida) la pestaña encendida cambia de color de letra',
       encendida.aqui === true && encendida.letra !== signo.letra,
       signo.letra + ' → ' + encendida.letra);
  vale('EL SIGNO SIGUE A LA LETRA, apagado',
       signo.relleno === signo.letra, signo.relleno + ' contra ' + signo.letra);
  vale('  y encendido, que es donde se volvía invisible',
       encendida.relleno === encendida.letra && encendida.trazo === encendida.letra,
       encendida.relleno + ' / ' + encendida.trazo + ' contra ' + encendida.letra);

  /* ---------------- la sección ---------------- */
  titulo('Encuentros trae sus dos, y la historia de Zaqueo');
  vale('se llega a Encuentros desde la barra', await irA('encuentros'));
  const dentro = await p.evaluate(() => {
    const c = document.getElementById('encuentros');
    const hojas = [...c.querySelectorAll('.enc-hoja')];
    const alto = h => Math.round(h.getBoundingClientRect().height);
    return { puesto:getComputedStyle(c).display !== 'none',
             pestanitas:[...c.querySelectorAll('.pestanitas button')]
                          .map(b => ({ enc:b.dataset.enc, rotulo:b.textContent.trim(),
                                       aqui:b.classList.contains('aqui'),
                                       alto:Math.round(b.getBoundingClientRect().height) })),
             /* Una sola barra de SECCIÓN dentro del panel: si la de dentro se
                llamara igual, aquí habría dos y la de ponerBarra borraría la
                que no es. */
             barrasDeSeccion:c.querySelectorAll('.pestanas').length,
             hojas:hojas.map(h => ({ enc:h.dataset.enc, alto:alto(h), oculta:h.hidden })),
             marco:(() => {
               const m = c.querySelector('.enc-marco');
               if (!m) return null;
               const r = m.getBoundingClientRect();
               const pie = c.querySelector(':scope > .pie-cerrar').getBoundingClientRect();
               return { src:m.getAttribute('src'), nombre:m.getAttribute('title'),
                        ancho:Math.round(r.width), alto:Math.round(r.height),
                        sobreElPie:Math.round(pie.top - r.bottom) };
             })(),
             vacia:(() => {
               const v = c.querySelector('.enc-hoja[data-enc="samaritana"] .enc-panel');
               return v ? { hay:true, dice:v.textContent.trim() } : { hay:false };
             })() };
  });
  di('lo que hay dentro', JSON.stringify(dentro));
  vale('el panel está puesto', dentro.puesto === true);
  vale('con una pestaña por encuentro, en su orden',
       dentro.pestanitas.map(x => x.enc).join(',') === 'zaqueo,samaritana',
       dentro.pestanitas.map(x => x.rotulo).join(' · '));
  vale('  y la primera encendida',
       dentro.pestanitas[0] && dentro.pestanitas[0].aqui === true &&
       dentro.pestanitas[1] && dentro.pestanitas[1].aqui === false);
  /* Blancos de dedo: son pestañas de segundo nivel pero se tocan igual. */
  vale('  con alto de dedo', dentro.pestanitas.every(x => x.alto >= 36),
       dentro.pestanitas.map(x => x.alto).join(' · '));
  vale('SOLO HAY UNA BARRA DE SECCIONES EN EL PANEL',
       dentro.barrasDeSeccion === 1, dentro.barrasDeSeccion);
  vale('una hoja a la vista y la otra no',
       dentro.hojas.filter(h => h.alto > 0).length === 1 &&
       dentro.hojas.find(h => h.enc === 'zaqueo').alto > 0,
       JSON.stringify(dentro.hojas));

  /* EL RELATO. Lo que se pidió es que la historia de Zaqueo se jale desde su
     pestaña, así que lo que se mide es que llegue, que quepa y que no se coma
     la salida del panel. */
  vale('la hoja de Zaqueo trae su marco, ya pedido',
       !!dentro.marco && dentro.marco.src === 'encuentros/zaqueo.html', 
       dentro.marco && dentro.marco.src);
  vale('  con nombre, que un marco sin nombre no se anuncia',
       !!dentro.marco && /Zaqueo/.test(dentro.marco.nombre || ''),
       dentro.marco && dentro.marco.nombre);
  vale('  llena el panel a lo ancho y a lo alto',
       !!dentro.marco && dentro.marco.ancho > 200 && dentro.marco.alto > 300,
       dentro.marco && (dentro.marco.ancho + 'x' + dentro.marco.alto));
  /* Y NO SE COME EL CERRAR, que es el fallo que ya costó una vez en los cuatro
     paneles: una caja flex que no baja de su contenido empuja el pie fuera de
     la pantalla. El marco tiene que terminar ANTES de donde empieza el pie. */
  vale('  Y TERMINA ANTES DEL PIE DE CERRAR',
       !!dentro.marco && dentro.marco.sobreElPie >= 0,
       dentro.marco && (dentro.marco.sobreElPie + ' px'));

  /* Lo que se lee dentro del marco se pregunta al marco, no al padre: son dos
     documentos y el de dentro no es de la aplicación. */
  const relato = await (async () => {
    const f = p.frames().find(x => /zaqueo\.html/.test(x.url() || ''));
    if (!f) return { falta:true, marcos:p.frames().map(x => x.url()) };
    return f.evaluate(() => ({
      titulo:document.title,
      encabezado:(document.querySelector('h1') || {}).textContent,
      capitulos:document.querySelectorAll('section.chapter').length,
      largo:document.documentElement.scrollHeight }));
  })();
  di('lo que trae el relato', relato);
  vale('el relato cargó de verdad', !relato.falta, relato.falta ? relato.marcos : 'sí');
  vale('  y es el de Zaqueo, con sus tres capítulos',
       !relato.falta && /Zaqueo/.test(relato.encabezado || '') && relato.capitulos === 3,
       relato.encabezado + ' · ' + relato.capitulos + ' capítulos');

  /* La otra todavía no tiene historia, y el panel lo dice en vez de estar
     vacío: un hueco sin explicar se lee como algo que se rompió al cargar. */
  vale('la samaritana tiene su panel esperando',
       dentro.vacia.hay === true && /historia/i.test(dentro.vacia.dice || ''),
       dentro.vacia.dice);

  /* ---------------- cambiar de encuentro ---------------- */
  titulo('cambiar de encuentro cambia la hoja, y no cierra la sección');
  const cambiada = await p.evaluate(async () => {
    const c = document.getElementById('encuentros');
    c.querySelector('.pestanitas [data-enc="samaritana"]').click();
    await new Promise(z => setTimeout(z, 500));
    const alto = h => Math.round(h.getBoundingClientRect().height);
    return { puesto:getComputedStyle(c).display !== 'none',
             encendidas:[...c.querySelectorAll('.pestanitas button')]
                          .filter(b => b.classList.contains('aqui')).map(b => b.dataset.enc),
             aLaVista:[...c.querySelectorAll('.enc-hoja')]
                        .filter(h => alto(h) > 0).map(h => h.dataset.enc) };
  });
  di('tras tocar la segunda', cambiada);
  vale('se ve la de la samaritana y solo ella',
       cambiada.aLaVista.length === 1 && cambiada.aLaVista[0] === 'samaritana',
       cambiada.aLaVista.join(' · '));
  vale('  y la pestaña encendida es la suya',
       cambiada.encendidas.length === 1 && cambiada.encendidas[0] === 'samaritana',
       cambiada.encendidas.join(' · '));
  /* Cambiar de historia no es cambiar de sección: el panel sigue puesto. */
  vale('EL PANEL NO SE CIERRA AL CAMBIAR DE HISTORIA', cambiada.puesto === true);

  /* ---------------- la trampa ---------------- */
  titulo('y las pestañas de dentro sobreviven a cerrar y volver a abrir');
  /* AQUÍ ES DONDE SE CAE SI ALGUIEN LE PONE .pestanas A LA BARRA DE DENTRO.
     ponerBarra la borraría al rehacer la de secciones, y el panel volvería a
     abrirse con la historia puesta y sin manera de llegar a la otra. La
     primera apertura no lo destapa: hace falta cerrar y volver. */
  await p.evaluate(() =>
    document.querySelector('#encuentros > .pie-cerrar .cerrar-pie').click());
  await p.waitForTimeout(900);
  const cerrado = await p.evaluate(() =>
    getComputedStyle(document.getElementById('encuentros')).display);
  vale('(la prueba es válida) el panel se cerró de verdad', cerrado === 'none', cerrado);
  await irA('encuentros');
  const devuelta = await p.evaluate(() => {
    const c = document.getElementById('encuentros');
    return { pestanitas:[...c.querySelectorAll('.pestanitas button')].map(b => b.dataset.enc),
             barrasDeSeccion:c.querySelectorAll('.pestanas').length,
             hojas:[...c.querySelectorAll('.enc-hoja')].length,
             /* y la que estaba mirándose sigue siendo la que se estaba
                mirando: cerrar un panel no es perder dónde ibas */
             aLaVista:[...c.querySelectorAll('.enc-hoja')]
                        .filter(h => h.getBoundingClientRect().height > 0)
                        .map(h => h.dataset.enc) };
  });
  di('al volver', devuelta);
  vale('LAS DOS PESTAÑAS SIGUEN AHÍ',
       devuelta.pestanitas.join(',') === 'zaqueo,samaritana', devuelta.pestanitas.join(' · '));
  vale('  y siguen siendo dos hojas', devuelta.hojas === 2, devuelta.hojas);
  vale('  y sigue habiendo una sola barra de secciones',
       devuelta.barrasDeSeccion === 1, devuelta.barrasDeSeccion);
  vale('  y se quedó donde se estaba leyendo',
       devuelta.aLaVista.join(',') === 'samaritana', devuelta.aLaVista.join(' · '));

  /* ---------------- la salida de teclado ---------------- */
  titulo('Escape cierra el panel también desde dentro del relato');
  /* CON EL FOCO DENTRO DEL MARCO, EL TECLADO SE QUEDA ALLÍ. El oyente de
     Escape del programa vive en el documento de fuera y no ve pasar la tecla,
     así que leyendo a Zaqueo la tecla que cierra cualquier otro panel dejaba
     de cerrar éste: quien lee con teclado se quedaba dentro. El relato la
     devuelve con un aviso —encuentros/salida.js— y el programa lo recoge.
     Lo levantó la revisión de Codex, y está medido en las dos direcciones:
     quitando salida.js, el panel se queda abierto.

     EL FOCO SE METE TOCANDO EL TEXTO, que es como entra leyendo, y no con un
     focus() a mano: lo que se está probando es justo que la tecla nazca en el
     documento de dentro. */
  await p.evaluate(async () => {
    document.querySelector('#encuentros .pestanitas [data-enc="zaqueo"]').click();
    await new Promise(z => setTimeout(z, 600));
  });
  const marcoZaqueo = p.frames().find(x => /zaqueo\.html/.test(x.url() || ''));
  vale('(la prueba es válida) el relato está a la vista', !!marcoZaqueo);
  if (marcoZaqueo){
    await marcoZaqueo.locator('h1').click();
    const antes = await p.evaluate(() => ({
      panel:getComputedStyle(document.getElementById('encuentros')).display,
      foco:(document.activeElement || {}).className }));
    di('antes de la tecla', antes);
    /* La otra línea de validez: si el foco no hubiera entrado en el marco,
       esto sería la prueba de siempre del Escape y no probaría nada nuevo. */
    vale('(la prueba es válida) el foco entró en el marco',
         /enc-marco/.test(antes.foco || ''), antes.foco);
    vale('(la prueba es válida) y el panel estaba abierto',
         antes.panel !== 'none', antes.panel);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(900);
    const luego = await p.evaluate(() => ({
      panel:getComputedStyle(document.getElementById('encuentros')).display,
      aria:document.getElementById('pgCabeza').getAttribute('aria-expanded') }));
    di('tras la tecla', luego);
    vale('ESCAPE CIERRA EL PANEL DESDE DENTRO DEL RELATO',
         luego.panel === 'none', luego.panel);
    vale('  y el titulillo se entera', luego.aria === 'false', luego.aria);
  }

  await cerrar(sesion);
})();
