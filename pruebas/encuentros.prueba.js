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
  const alArrancar = await p.evaluate(() => {
    const hojas = [...document.querySelectorAll('#encuentros .enc-hoja')];
    return { hojas:hojas.length,
             /* CADA HOJA ES DE UNA DE LAS DOS CLASES: la que tiene relato lleva
                su marco, y la que todavía no lo tiene lleva el cartel que lo
                dice. No hay una tercera. */
             conMarco:hojas.filter(h => h.querySelector('.enc-marco')).length,
             conCartel:hojas.filter(h => h.querySelector('.enc-panel')).length,
             pedidos:[...document.querySelectorAll('#encuentros .enc-marco')]
                       .map(m => m.getAttribute('src')) };
  });
  di('las hojas al arrancar', alArrancar);
  /* LA LÍNEA DE VALIDEZ NO CUENTA PESTAÑAS, Y ÉSA FUE LA PRIMERA VERSIÓN: decía
     «un marco por pestaña», que hoy es verdad y mañana no. El día que entre un
     encuentro sin historia escrita —que es un estado previsto y está explicado
     en armarEncuentros— tendría su pestaña y su cartel, y ningún marco: la
     prueba habría cantado fallo con el programa haciendo exactamente lo que se
     le pidió. Lo levantó la revisión de Codex.
     Lo que se exige es la regla: cada hoja es de una clase o de la otra, y hay
     al menos un relato de verdad, que es lo que estas líneas vienen a mirar. */
  vale('(la prueba es válida) cada hoja lleva su relato o su cartel, y ninguna las dos',
       alArrancar.conMarco + alArrancar.conCartel === alArrancar.hojas &&
       alArrancar.hojas >= 2,
       alArrancar.conMarco + ' con relato · ' + alArrancar.conCartel +
       ' esperando · ' + alArrancar.hojas + ' hojas');
  vale('(la prueba es válida) y hay al menos un relato que pedir',
       alArrancar.conMarco >= 1, alArrancar.conMarco);
  vale('y ninguno ha pedido nada todavía',
       alArrancar.pedidos.every(x => x === null), JSON.stringify(alArrancar.pedidos));

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
             /* Y EL DE LA OTRA SIGUE SIN PEDIR NADA. Cada relato se carga
                cuando su pestaña se mira, no cuando se abre la sección: abrir
                Encuentros no puede costar los dos documentos. */
             otroMarco:(() => {
               const m = c.querySelector('.enc-hoja[data-enc="samaritana"] .enc-marco');
               return m ? { hay:true, src:m.getAttribute('src') } : { hay:false };
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
      /* LOS CAPÍTULOS SE CUENTAN POR SUS TÍTULOS, no por un envoltorio.
         Esta línea pedía `section.chapter` y cantó fallo con cero capítulos
         cuando entró el relato nuevo: el texto era el mismo y los tres
         capítulos estaban ahí, pero ya no venían envueltos en secciones. La
         prueba estaba atada a cómo estaba armado el documento de entonces, y
         eso no es lo que vino a vigilar: lo que importa es que el marco traiga
         ESTE relato entero y no otra cosa, o media.
         Un rótulo es lo que un capítulo tiene siempre, lo envuelva quien lo
         envuelva. */
      capitulos:[...document.querySelectorAll('h2 .num')].map(x => x.textContent.trim()),
      largo:document.documentElement.scrollHeight }));
  })();
  di('lo que trae el relato', relato);
  vale('el relato cargó de verdad', !relato.falta, relato.falta ? relato.marcos : 'sí');
  vale('  y es el de Zaqueo, con sus tres capítulos',
       !relato.falta && /Zaqueo/.test(relato.encabezado || '') &&
       (relato.capitulos || []).length === 3,
       relato.encabezado + ' · ' + (relato.capitulos || []).join(' / '));
  /* Y ENTERO, que es lo que de verdad se quiere saber. Un marco que cargara a
     medias —la portada sí y el cuerpo no— pasaría la línea de arriba con sus
     tres rótulos. El largo lo delata: son miles de píxeles de texto. */
  vale('  y llegó entero, no solo la portada',
       !relato.falta && relato.largo > 3000, relato.largo + ' px de alto');

  /* La otra todavía no tiene historia, y el panel lo dice en vez de estar
     vacío: un hueco sin explicar se lee como algo que se rompió al cargar. */
  vale('la samaritana tiene su marco puesto',
       dentro.otroMarco.hay === true, dentro.otroMarco);
  /* LA CARGA ES POR RELATO Y NO POR SECCIÓN. Es la línea que se cae el día que
     alguien mueva el despertar de sitio para «simplificar»: abrir Encuentros
     traería los dos documentos, y con cinco encuentros serían cinco. */
  vale('  y todavía sin pedir, que a ella no la están mirando',
       dentro.otroMarco.src === null, dentro.otroMarco.src);

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

  /* ---------------- el relato se viste con la ropa del libro ---------------- */
  titulo('el relato toma la letra, la tinta y el papel del libro');
  /* UN MARCO ES OTRO DOCUMENTO Y NO HEREDA NADA. Ni el tamaño de letra de AAA
     ni el sepia del riel: sin que alguien se lo diga, la historia se lee a los
     dieciséis píxeles de fábrica con tinta negra mientras el libro de al lado
     está en veintidós y en marrón. Se pidió que creciera con el libro y que
     tomara su papel, y la única manera es decírselo —el puente está en
     encuentros/salida.js—, así que lo que se mide aquí es que se lo digan Y
     que le llegue.

     Se compara CONTRA EL LIBRO y no contra un número escrito: lo que se pidió
     es que vayan juntos, y un número aquí sería otra cosa, y encima una que
     cambia con el ajuste del lector. */
  const vestido = async () => {
    const f = p.frames().find(x => /zaqueo\.html/.test(x.url() || ''));
    if (!f) return { falta:true };
    const dentro = await f.evaluate(() => ({
      raiz:getComputedStyle(document.documentElement).fontSize,
      /* EL TEXTO COMPUESTO, que es lo que se lee. La raíz sola no basta y esto
         costó un fallo: el relato recibía la raíz correcta y encima la
         multiplicaba por 1,05, así que un libro de 15 se leía a 15,75 y la
         prueba —que miraba la raíz— decía que iban iguales. Lo levantó la
         revisión de Codex. */
      texto:getComputedStyle(document.body).fontSize,
      familia:getComputedStyle(document.body).fontFamily,
      familiaTitulo:getComputedStyle(document.querySelector('h1')).fontFamily,
      familiaNum:getComputedStyle(document.querySelector('h2 .num')).fontFamily,
      tinta:getComputedStyle(document.body).color,
      papel:getComputedStyle(document.body).backgroundColor,
      papelRaiz:getComputedStyle(document.documentElement).backgroundColor,
      oro:getComputedStyle(document.querySelector('h2 .num')).color }));
    const fuera = await p.evaluate(() => {
      const v = getComputedStyle(document.documentElement);
      const m = document.querySelector('.enc-marco');
      const cap = document.querySelector('#pgBody .cap');
      const verso = document.querySelector('#pgBody .v');
      return { letra:v.getPropertyValue('--fs-libro').trim(),
               /* y el tamaño al que se lee el libro de verdad, para comparar
                  texto con texto y no variable con raíz */
               texto:verso ? getComputedStyle(verso).fontSize : null,
               tinta:v.getPropertyValue('--tinta').trim(),
               /* la familia se lee del VERSÍCULO, que es el texto del libro:
                  es lo que el lector ve cuando elige el tipo en AAA */
               familia:verso ? getComputedStyle(verso).fontFamily : null,
               familiaCap:cap ? getComputedStyle(cap).fontFamily : null,
               marco:getComputedStyle(m).backgroundColor,
               /* EL PAPEL DEL PANEL, que es lo que tiene que verse a través, y
                  se mira el DIBUJO y no el color: el papel de los rollos es un
                  degradado, así que backgroundColor devuelve transparente
                  también ahí. Preguntando por el color, la línea de validez
                  decía que el panel no tiene papel —y lo tiene, es el que se
                  ve—. */
               panel:getComputedStyle(document.getElementById('encuentros')).backgroundImage,
               capitulo:cap ? getComputedStyle(cap).color : null };
    });
    return { dentro, fuera };
  };
  /* Los colores se comparan sin espacios: la variable del programa viene
     escrita «rgb(59,43,24)» y el navegador la devuelve «rgb(59, 43, 24)». */
  const pelado = x => String(x || '').replace(/\s+/g, '');

  await p.evaluate(() =>
    document.querySelector('#encuentros .pestanitas [data-enc="zaqueo"]').click());
  await p.waitForTimeout(500);
  const antes = await vestido();
  di('de fábrica', antes);
  vale('(la prueba es válida) se pudo mirar dentro del relato', !antes.falta);
  if (!antes.falta){
    /* SE COMPARA TEXTO CONTRA TEXTO: lo que mide un renglón del relato contra
       lo que mide un versículo en la hoja. Comparar la raíz del relato con la
       variable del programa deja pasar cualquier cosa que el relato haga
       después con ese número, y eso fue justo lo que pasó. */
    vale('LA LETRA DEL RELATO ES LA DEL LIBRO',
         !!antes.fuera.texto && antes.dentro.texto === antes.fuera.texto,
         antes.dentro.texto + ' contra ' + antes.fuera.texto);
    vale('  y le llegó por la raíz, que es de donde cuelga su hoja',
         antes.dentro.raiz === antes.fuera.letra,
         antes.dentro.raiz + ' contra ' + antes.fuera.letra);
    vale('Y EL TIPO DE LETRA, el que esté puesto en AAA',
         !!antes.fuera.familia && antes.dentro.familia === antes.fuera.familia,
         antes.dentro.familia + ' contra ' + antes.fuera.familia);
    /* Los títulos del relato no llevan familia propia: un relato en Verdana
       con los títulos en Georgia sería otra página. */
    vale('  y los títulos del relato van con ella',
         antes.dentro.familiaTitulo === antes.fuera.familia,
         antes.dentro.familiaTitulo);
    /* LA ÚNICA EXCEPCIÓN, y es una copia del libro: .cap lleva su familia
       clavada, así que el número de capítulo no cambia de tipo cuando el
       lector cambia el de AAA. El «Capítulo I» del relato hace lo mismo. */
    vale('  salvo el «Capítulo I», que copia al número de capítulo',
         !!antes.fuera.familiaCap && antes.dentro.familiaNum === antes.fuera.familiaCap,
         antes.dentro.familiaNum + ' contra ' + antes.fuera.familiaCap);
    vale('Y LA TINTA TAMBIÉN',
         pelado(antes.dentro.tinta) === pelado(antes.fuera.tinta),
         antes.dentro.tinta + ' contra ' + antes.fuera.tinta);
    /* TRANSPARENTE DE LOS DOS LADOS. No basta con que lo sea el documento de
       dentro: el marco tuvo un fondo crema propio y era justo lo que se pidió
       quitar —un recuadro más claro flotando sobre la hoja—. Alfa cero es lo
       único que vale; un color «casi igual» al del panel se separa en cuanto
       el lector mueve el sepia. */
    const transparente = c => /rgba\(0,0,0,0\)|transparent/.test(pelado(c));
    vale('EL RELATO NO TRAE PAPEL PROPIO: se ve el del panel',
         transparente(antes.dentro.papel) && transparente(antes.dentro.papelRaiz) &&
         transparente(antes.fuera.marco),
         'body ' + antes.dentro.papel + ' · html ' + antes.dentro.papelRaiz +
         ' · marco ' + antes.fuera.marco);
    /* La línea de validez de la de arriba: transparente sobre nada no es
       tomar el papel del libro, es no tener ninguno. El panel sí tiene. */
    vale('(la prueba es válida) y el panel de debajo sí tiene papel',
         /gradient|rgb/.test(antes.fuera.panel || ''),
         (antes.fuera.panel || '').slice(0, 48));
    /* EL ORO ES EL DEL NÚMERO DE CAPÍTULO DEL LIBRO. Lo pidió así el dueño del
       repo al reconocerlo —«me recuerdan el sepia del número de capítulo»—, y
       se comprueba contra el número de verdad, no contra el hexadecimal: lo
       que se quiere es que sean el mismo, no que uno de ellos sea un valor. */
    vale('los títulos llevan el oro del número de capítulo',
         !!antes.fuera.capitulo &&
         pelado(antes.dentro.oro) === pelado(antes.fuera.capitulo),
         antes.dentro.oro + ' contra ' + antes.fuera.capitulo);
  }

  /* Y QUE SIGA AL LIBRO CUANDO EL LECTOR LO MUEVE, que es la mitad que se
     rompe sola: mandar el estilo una vez al cargar es fácil, acordarse de
     mandarlo otra vez cuando cambia el riel es lo que se olvida. */
  await irA('formato');
  await p.evaluate(async () => {
    for (let i = 0; i < 4; i++){
      document.getElementById('fsUp').click();
      await new Promise(z => setTimeout(z, 450));
    }
  });
  await p.waitForTimeout(700);
  await irA('encuentros');
  const luegoDeAA = await vestido();
  di('tras subir la letra cuatro puntos', luegoDeAA);
  /* La línea de validez: si el libro no hubiera cambiado de tamaño, la de
     abajo saldría verde sin haber probado nada. */
  vale('(la prueba es válida) el libro cambió de letra',
       !luegoDeAA.falta && luegoDeAA.fuera.letra !== antes.fuera.letra,
       antes.fuera.letra + ' → ' + (luegoDeAA.falta ? '?' : luegoDeAA.fuera.letra));
  vale('EL RELATO CRECIÓ CON EL LIBRO, Y AL MISMO TAMAÑO',
       !luegoDeAA.falta && luegoDeAA.dentro.texto === luegoDeAA.fuera.texto,
       luegoDeAA.falta ? 'sin marco' : luegoDeAA.dentro.texto + ' contra ' + luegoDeAA.fuera.texto);

  /* Y lo mismo con el TIPO, que viaja por otro camino: el tamaño pasa por
     escalarInterfaz y el tipo no pasa por ahí, así que son dos avisos
     distintos y se olvida uno sin que el otro se entere. */
  await irA('formato');
  await p.evaluate(async () => {
    const s = document.getElementById('selFuente');
    /* La última de la lista, que es la que menos se parece a la de fábrica:
       si el relato se quedara con la suya, se vería a la legua. */
    s.value = String(s.options.length - 1);
    s.dispatchEvent(new Event('change', { bubbles:true }));
    await new Promise(z => setTimeout(z, 1200));
  });
  await irA('encuentros');
  const luegoDeTipo = await vestido();
  di('tras cambiar el tipo de letra', luegoDeTipo && luegoDeTipo.dentro);
  vale('(la prueba es válida) el libro cambió de tipo',
       !luegoDeTipo.falta && luegoDeTipo.fuera.familia !== antes.fuera.familia,
       antes.fuera.familia + ' → ' + (luegoDeTipo.falta ? '?' : luegoDeTipo.fuera.familia));
  vale('EL RELATO CAMBIÓ CON ÉL',
       !luegoDeTipo.falta && luegoDeTipo.dentro.familia === luegoDeTipo.fuera.familia,
       luegoDeTipo.falta ? 'sin marco' : luegoDeTipo.dentro.familia);
  vale('  y el «Capítulo I» siguió quieto, como el número de capítulo',
       !luegoDeTipo.falta && luegoDeTipo.dentro.familiaNum === luegoDeTipo.fuera.familiaCap,
       luegoDeTipo.falta ? 'sin marco' : luegoDeTipo.dentro.familiaNum);

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
