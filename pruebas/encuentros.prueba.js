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
const { abrir, cerrar, cerrarParcial, di, vale, titulo, ESCRITORIO } = require('./comun');

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
  titulo('la barra lleva seis, ORACIÓN primero y Encuentros detrás de Glosas');
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
  /* ERAN CINCO Y AHORA SON SEIS, con ORACIÓN delante. El número se afirma
     igual —no «cinco o más»— porque una pestaña que aparece sola es tan
     defecto como una que desaparece, y en esta barra ya han entrado dos por
     encargo: si entra una tercera sin que nadie lo pida, esto lo dice. */
  vale('están las seis', barra.secs.length === 6, barra.secs.length);
  /* Y ORACIÓN LA PRIMERA, pedido así. Va delante de LIBROS porque lo que se
     guarda ahí son oraciones y el encargo fue ponerla al principio. */
  vale('ORACIÓN VA LA PRIMERA', barra.secs[0] === 'oracion', barra.secs.join(' · '));
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

  /* ──────────────────────────────────────────────────────────────
     LA PESTAÑA DE ORACIÓN: UN MARCO, Y QUE NO SE CARGUE HASTA QUE SE MIRA.

     Dentro vive una aplicación entera de otro repo, con su estética de neón.
     Va en un marco por tres motivos contados en .ora-marco, y el que decide es
     que esa aplicación se cree dueña de la ventana: ancla con position:fixed y
     mide en vh.

     Lo que se vigila aquí es lo que se rompe en silencio:

     · QUE NO SE CARGUE AL ARRANCAR. Son 116 kB entre marcado, estilos y tres
       guiones, y lo que importa al abrir el libro es la primera hoja. Se mira
       que el marco EXISTA y no tenga src todavía: las dos cosas, porque «no
       hay src» también sale verde si no hay marco.
     · Y QUE SE CARGUE AL MIRARLA, que es la otra mitad.

     La salida por Escape va en su propio bloque, más abajo. */
  titulo('la pestaña de oración trae su marco, y dormido');
  const ora = await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const m = () => document.querySelector('.ora-marco');
    const antes = { hay: !!m(), src: m() && m().getAttribute('src') };
    const vis = () => [...document.querySelectorAll('.rollo, #canto')]
      .find(r => getComputedStyle(r).display !== 'none');
    const t = (vis() || document).querySelector('.pestanas [data-sec="oracion"]');
    if (!t) return { antes, falta:'no hay pestaña de oración' };
    t.click();
    await pausa(1600);
    const r = m() ? m().getBoundingClientRect() : null;
    return { antes,
             despues: { src: m() && m().getAttribute('src'),
                        alto: r && Math.round(r.height),
                        ancho: r && Math.round(r.width) } };
  });
  di('el marco de oración', JSON.stringify(ora));
  vale('(la prueba es válida) el marco existe desde el arranque',
       !ora.falta && ora.antes.hay === true, JSON.stringify(ora.antes));
  vale('NO SE PIDE HASTA QUE SE MIRA', !ora.falta && !ora.antes.src,
       String(ora.antes.src));
  vale('  y al mirarla sí se pide', !ora.falta && !!ora.despues.src,
       ora.despues && ora.despues.src);
  vale('  y ocupa el panel, no una rendija',
       !ora.falta && ora.despues.alto > 200 && ora.despues.ancho > 200,
       ora.despues && (ora.despues.ancho + ' x ' + ora.despues.alto));

  /* Y LA SALIDA, que es lo único que Glossa le añade a esa aplicación.

     Con el foco dentro de un marco el teclado se queda ahí: el Escape del
     programa no llega, y sin puente la pestaña se queda sin salida. El puente
     avisa hacia arriba y el programa comprueba que quien avisa sea uno de SUS
     marcos —ver el oyente de message—. Esa lista tenía solo los relatos, y por
     eso al entrar este marco la tecla NO cerraba: comprobado antes de tocarlo.

     La tecla se despacha DENTRO del marco, que es donde está el foco cuando se
     usa. La línea de validez es la que salva el bloque: si el panel no hubiera
     estado abierto, «ya no está abierto» saldría verde sin haber probado nada. */
  titulo('Escape desde dentro del árbol cierra el panel');
  const salida = await p.evaluate(() => !![...document.querySelectorAll('.rollo, #canto')]
    .find(r => getComputedStyle(r).display !== 'none'));
  let mandada = false;
  for (const f of p.frames()){
    if (!/oracion/.test(f.url())) continue;
    await f.evaluate(() =>
      dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true })));
    mandada = true;
  }
  await p.waitForTimeout(900);
  const sigue = await p.evaluate(() => !![...document.querySelectorAll('.rollo, #canto')]
    .find(r => getComputedStyle(r).display !== 'none'));
  vale('(la prueba es válida) el panel estaba abierto', salida === true);
  vale('(la prueba es válida) y la tecla se mandó desde dentro del marco', mandada === true);
  vale('ESCAPE DESDE EL MARCO CIERRA EL PANEL', sigue === false);

  /* ──────────────────────────────────────────────────────────────
     Y QUE ESA SALIDA NO SE LLEVE POR DELANTE LO QUE ESCRIBE EL LECTOR.

     Dentro del árbol, Escape ya significaba algo antes de que Glossa lo
     tocara: el texto de una hoja se edita en un <textarea> y esa tecla
     CANCELA la edición y devuelve el texto de antes. Con el puente puesto tal
     cual, la misma pulsación hacía las dos cosas —cancelaba la edición Y
     cerraba la pestaña entera—. Medido antes de arreglarlo: el panel se
     cerraba; después, sigue abierto. Lo levantó la revisión de Codex.

     TRES COSAS DE CÓMO SE PRUEBA, Y NINGUNA ES CAPRICHO:

     · LA TECLA VA DE VERDAD, con p.keyboard. El bloque de arriba despacha un
       KeyboardEvent a mano en window, y ése —con el foco en el <body>— pasa
       igual de verde con el fallo puesto y sin él: no prueba nada de esto. El
       arreglo se apoya en DÓNDE ESTÁ EL FOCO cuando llega la tecla, así que el
       foco tiene que ser el de verdad y la tecla tiene que entrar por donde
       entra la del teclado.
     · EL DOBLE TOQUE VA CON EL RATÓN DE PLAYWRIGHT y no con PointerEvent
       hechos a mano, que es lo que pide esta carpeta para los gestos. Aquí
       sería peor: el árbol llama setPointerCapture(e.pointerId) en su
       pointerdown, y un pointerId inventado no corresponde a ningún puntero
       vivo —el navegador tira NotFoundError y el gesto se queda a medias—. El
       ratón de Playwright manda pulsaciones reales, con su pointerId real, que
       es justo el camino que la regla de la carpeta quiere recorrer.
     · Y EL SEGUNDO TOQUE CAE TORCIDO, dos píxeles al lado. Por debajo de
       dragThreshold (5) sigue siendo un toque; caer dos veces en el mismo
       píxel exacto es lo que no hace ningún dedo.

     La última afirmación es la que impide arreglar esto de más: si el puente se
     callara siempre, la pestaña volvería a quedarse sin salida, que es el fallo
     que el puente vino a arreglar. */
  titulo('Escape dentro del editor del árbol cancela la edición y NO cierra el panel');
  await irA('oracion');
  const mOra = p.frames().find(f => /oracion/.test(f.url()));
  const hayArbol = !!mOra;
  if (hayArbol) await mOra.waitForSelector('#add-btn', { timeout:10000 });
  vale('(la prueba es válida) el árbol está cargado', hayArbol);

  /* El punto medio de algo de dentro del marco, en coordenadas de la ventana:
     el ratón es de la página de fuera y no sabe nada del marco. */
  const enPantalla = async (sel) => {
    const d = await mOra.evaluate(s => {
      const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x:r.x + r.width / 2, y:r.y + r.height / 2 };
    }, sel);
    const m = await p.evaluate(() => {
      const e = document.querySelector('.ora-marco'); const r = e.getBoundingClientRect();
      return { x:r.x, y:r.y };
    });
    return d && { x:m.x + d.x, y:m.y + d.y };
  };
  const dobleToque = async (pt) => {
    await p.mouse.move(pt.x, pt.y);
    await p.mouse.down(); await p.mouse.up();
    await p.mouse.move(pt.x + 2, pt.y - 1);
    await p.mouse.down(); await p.mouse.up();
    await p.waitForTimeout(500);
  };
  const textoHoja = () => mOra.evaluate(() => {
    const e = document.querySelector('.leaf .leaf-text');
    return e ? e.textContent.trim() : null;
  });
  const editores = () => mOra.evaluate(() => document.querySelectorAll('.leaf-editor').length);

  let guardado = null, trasEscape = null, abiertoAntes = null, sigueAbierto = null;
  let editoresAlEditar = 0, editoresTrasEscape = 0, cerradoSinEditor = null;
  if (hayArbol){
    await mOra.evaluate(() => document.getElementById('add-btn').click());
    await p.waitForTimeout(400);
    const hoja = await enPantalla('.leaf');

    /* Primero una hoja CON TEXTO GUARDADO: si se cancelara sobre una hoja
       vacía, «el texto volvió al de antes» saldría verde sin decir nada. */
    await dobleToque(hoja);
    await p.keyboard.type('SEÑOR, ACUÉRDATE');
    await p.keyboard.press('Enter');          // Intro guarda, Escape cancela
    await p.waitForTimeout(400);
    guardado = await textoHoja();

    await dobleToque(hoja);
    editoresAlEditar = await editores();
    await p.keyboard.type('ESTO NO SE DEBE GUARDAR');
    abiertoAntes = await p.evaluate(() => !![...document.querySelectorAll('.rollo, #canto')]
      .find(r => getComputedStyle(r).display !== 'none'));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(900);
    trasEscape = await textoHoja();
    editoresTrasEscape = await editores();
    sigueAbierto = await p.evaluate(() => !![...document.querySelectorAll('.rollo, #canto')]
      .find(r => getComputedStyle(r).display !== 'none'));

    /* Y sin nadie escribiendo, la tecla vuelve a ser la salida. */
    await p.keyboard.press('Escape');
    await p.waitForTimeout(900);
    cerradoSinEditor = await p.evaluate(() => ![...document.querySelectorAll('.rollo, #canto')]
      .find(r => getComputedStyle(r).display !== 'none'));
  }
  di('texto guardado / tras Escape', guardado + ' → ' + trasEscape);
  vale('(la prueba es válida) el doble toque abrió el editor', editoresAlEditar === 1,
       editoresAlEditar);
  vale('(la prueba es válida) y había texto guardado que perder',
       guardado === 'SEÑOR, ACUÉRDATE', String(guardado));
  vale('(la prueba es válida) el panel estaba abierto', abiertoAntes === true);
  vale('la edición se canceló', trasEscape === guardado, String(trasEscape));
  vale('Y EL PANEL NO SE CIERRA CON ESE MISMO ESCAPE', sigueAbierto === true,
       sigueAbierto ? 'abierto' : 'CERRADO — la tecla hizo dos cosas');
  vale('  el editor sí se cerró', editoresTrasEscape === 0, editoresTrasEscape);
  vale('  y sin nadie escribiendo, Escape sigue cerrando el panel',
       cerradoSinEditor === true);

  /* ──────────────────────────────────────────────────────────────
     EL PANEL DE ORACIÓN SE VISTE DE NEGRO, Y LA HOJA NUEVA NACE ARRIBA.

     Dos encargos del dueño del repo que se prueban juntos porque son la misma
     pestaña: «que el background del panel sea el mismo negro que el del árbol
     neón, y el de los tabs y el cerrar gris oscuro, para ocultar los sepia y
     resaltar el neón», y «que la hoja nueva aparezca top center, así el
     teclado no estorba cuando uno pone el texto».

     LO QUE SE VIGILA DEL COLOR no es que sea bonito, que no se mide, sino tres
     cosas que se rompen solas:

     · EL NEGRO ES EL DEL ÁRBOL, #0a0018, el mismo que oracion/config.js. Si
       alguien lo cambia allí y no aquí, vuelve la costura en el canto del
       marco, que es lo que este cambio vino a quitar. Por eso se afirma el
       valor exacto y no «algo oscuro».
     · LA PESTAÑA VIVA NO ES DE ORO. #b8892b es el sepia más fuerte de la barra
       y el color con el que el árbol pinta sus acentos; se cambió por un gris
       más claro que el de reposo. Se afirman las dos cosas —que no es el oro y
       que se distingue de la de al lado—, porque quitar el oro sin poner nada
       en su sitio deja la barra sin decir cuál está abierta.
     · Y EL RESTO DE LOS PANELES SIGUE SIENDO DE PAPEL. Ésta es la que salva el
       bloque: las reglas van dentro de #oracion, y si alguien las saca de ahí
       —o las escribe en .rollo— los cinco paneles se van al negro de golpe.
       Sin esta línea, eso saldría verde.

     Y DE LA HOJA NUEVA, que nazca en el tercio de arriba y centrada, entera
     dentro de la pantalla y sin pisar la columna de botones de la derecha. Se
     mira además su GRUPO: en esta aplicación el sitio ES el grupo —lo decide
     statusAtPoint—, así que moverla arriba la cambia de «Derecha» a «Centro».
     Eso es una consecuencia querida y dicha, no un descuido, y se afirma para
     que el día que alguien mueva el punto se entere de que también mueve eso. */
  titulo('ORACIÓN: el panel en negro y la hoja nueva arriba');
  await irA('oracion');
  const pinta = await p.evaluate(() => {
    const g = e => e ? getComputedStyle(e) : null;
    const panel = document.getElementById('oracion');
    if (!panel) return { falta:'no hay panel de oración' };
    const bs = [...panel.querySelectorAll('.pestanas button')];
    const viva = bs.find(b => b.classList.contains('aqui'));
    const otra = bs.find(b => !b.classList.contains('aqui'));
    const cerrar = panel.querySelector('.cerrar-pie');
    const marco = panel.querySelector('.ora-marco');
    /* El canto es el panel de LIBROS: el testigo de que esto va sólo aquí. */
    const testigo = document.getElementById('canto');
    return { panel: g(panel).backgroundColor, papel: g(panel).backgroundImage,
             marco: marco && g(marco).backgroundColor,
             viva: viva && g(viva).backgroundColor,
             otra: otra && g(otra).backgroundColor,
             cerrar: cerrar && g(cerrar).backgroundColor,
             pie: g(panel.querySelector('.pie-cerrar') || panel).backgroundImage,
             testigo: testigo && g(testigo).backgroundImage };
  });
  di('los colores', JSON.stringify(pinta));
  const NEGRO = 'rgb(10, 0, 24)';
  vale('(la prueba es válida) se pudo mirar el panel', !pinta.falta);
  vale('el panel lleva el negro del árbol', pinta.panel === NEGRO, pinta.panel);
  vale('  sin el degradado de papel debajo', pinta.papel === 'none', pinta.papel);
  vale('  y el marco, el mismo negro', pinta.marco === NEGRO, pinta.marco);
  vale('la pestaña viva ya no es de oro',
       pinta.viva && pinta.viva !== 'rgb(184, 137, 43)', pinta.viva);
  vale('  y aun así se distingue de las otras',
       !!pinta.viva && !!pinta.otra && pinta.viva !== pinta.otra,
       pinta.viva + ' vs ' + pinta.otra);
  vale('el botón de cerrar va del mismo gris que las pestañas',
       pinta.cerrar === pinta.otra, pinta.cerrar);
  vale('y la banda del pie deja de ser de papel',
       /rgba?\(10, 0, 24/.test(String(pinta.pie)), String(pinta.pie).slice(0, 48));
  /* LA LÍNEA QUE SALVA EL BLOQUE. */
  vale('LOS OTROS PANELES SIGUEN SIENDO DE PAPEL',
       /linear-gradient/.test(String(pinta.testigo)), String(pinta.testigo).slice(0, 40));

  /* LA HOJA QUE SE MIDE ES LA QUE CREA ESTE TOQUE, y no «la primera que haya».
     Lo levantó la revisión de Codex: el bloque de Escape, más arriba, deja una
     hoja puesta, así que un querySelector('.leaf') a secas encuentra ÉSA —y
     entonces «se creó» y toda la geometría salen verdes aunque el botón no
     haya hecho nada—. Se apuntan los identificadores de antes y se busca el
     que no estaba. */
  const nacer = async (m) => m.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const antes = new Set([...document.querySelectorAll('.leaf')].map(l => l.dataset.id));
    document.getElementById('add-btn').click();
    await pausa(600);
    const l = [...document.querySelectorAll('.leaf')].find(x => !antes.has(x.dataset.id));
    if (!l) return { falta:'el toque no creó ninguna hoja nueva',
                     habia: antes.size };
    const r = l.getBoundingClientRect();
    const btn = document.getElementById('font-btn').getBoundingClientRect();
    let grupo = null;
    try {
      grupo = ((JSON.parse(localStorage.getItem('sticky-shapes:v2') || '{}')
                 .workspaces || []).flatMap(w => w.nodes || [])
                 .find(n => n.id === l.dataset.id) || {}).status;
    } catch(e){ /* si el almacén no se deja leer, se queda sin grupo */ }
    return { centro: Math.round(r.top + r.height / 2), alto: innerHeight,
             arriba: Math.round(r.top), altoHoja: Math.round(r.height),
             eje: Math.round((r.left + r.right) / 2), ancho: innerWidth,
             pisaBotones: r.right > btn.left && r.top < btn.bottom && r.bottom > btn.top,
             grupo };
  });
  const marcoOra = p.frames().find(f => /oracion/.test(f.url()));
  if (marcoOra) await marcoOra.waitForSelector('#add-btn', { timeout:10000 });
  const hoja = marcoOra ? await nacer(marcoOra) : { falta:'sin marco' };
  di('la hoja nueva', JSON.stringify(hoja));
  vale('(la prueba es válida) se creó una hoja', !hoja.falta, hoja.falta || 'sí');
  vale('LA HOJA NUEVA NACE EN EL TERCIO DE ARRIBA',
       !hoja.falta && hoja.centro < hoja.alto / 3,
       hoja.centro + ' de ' + hoja.alto);
  vale('  entera dentro de la pantalla', !hoja.falta && hoja.arriba >= 0,
       hoja.arriba + ' px del borde');
  vale('  y centrada a lo ancho',
       !hoja.falta && Math.abs(hoja.eje - hoja.ancho / 2) <= 2,
       hoja.eje + ' de ' + (hoja.ancho / 2));
  vale('  sin pisar la columna de botones', !hoja.falta && hoja.pisaBotones === false);
  vale('  y nace en el grupo del centro, que es lo que dice su sitio',
       !hoja.falta && hoja.grupo === 'rama-centro', String(hoja.grupo));

  /* Y EN UNA VENTANA BAJA NO SE SALE POR ARRIBA. Otro hallazgo de Codex: con
     la hoja arriba, 0.18·alto es menos que medio alto de hoja en cuanto la
     ventana baja de unos 417 px —un teléfono tumbado, o este marco dentro de
     una pantalla corta—, y como el documento lleva overflow:hidden, ese trozo
     se recorta y no hay manera de alcanzarlo. Medido antes de arreglarlo:
     nacía en −14 en un marco de 338. createNode topa ahora el centro contra
     los dos bordes.
     Se prueba tumbando la ventana de verdad y devolviéndola después, que es
     lo que hace un lector girando el teléfono; medir sólo de pie dejaría esto
     sin red, porque de pie el defecto no se ve. */
  const DE_PIE = p.viewportSize();
  await p.setViewportSize({ width:740, height:360 });
  await p.waitForTimeout(900);
  const tumbado = marcoOra ? await nacer(marcoOra) : { falta:'sin marco' };
  await p.setViewportSize(DE_PIE);
  await p.waitForTimeout(900);
  di('con la ventana tumbada', JSON.stringify(tumbado));
  vale('(la prueba es válida) la ventana tumbada deja el marco bajo',
       !tumbado.falta && tumbado.alto < tumbado.altoHoja * 3,
       !tumbado.falta && (tumbado.alto + ' px de alto'));
  vale('CON LA VENTANA BAJA, LA HOJA NO SE SALE POR ARRIBA',
       !tumbado.falta && tumbado.arriba >= 0,
       !tumbado.falta && (tumbado.arriba + ' px del borde'));

  /* ---------------- y el árbol no se sale por arriba ---------------- */
  /* «Está muy pegado arriba y hay espacio disponible abajo», dijo el dueño, y
     sus capturas no cuadraban con las mías: en las mías sobraba aire y en su
     teléfono la copa casi tocaba el filo. La diferencia era la FORMA del
     marco, no el teléfono. El SVG lleva preserveAspectRatio="xMidYMax meet"
     sobre un viewBox de 100x170, así que por debajo de una proporción de
     0,588 el dibujo lo limita el ancho —sobra aire arriba— y por encima lo
     limita el alto —no sobra nada—. El #tree llevaba entonces
     transform:translateY(-28px), y esa subida, en los marcos del segundo
     grupo, no creaba aire: empujaba la copa fuera. Medido antes de arreglarlo,
     con el mismo sondeo que hay aquí abajo: 107 px de aire en 412x915, pero
     3 en 412x740 y −4 en un marco aún más corto.

     Por eso el arreglo cambia la CAJA (inset:auto 0 28px 0; height:86%) y no
     el desplazamiento: reducir el alto actúa sobre la escala, y entonces
     vale para las dos formas de marco.

     LA MEDIDA ES DEL DIBUJO, no de la caja del SVG: el <g> activo, que es lo
     que se ve. Y se mide en DOS marcos —uno largo y otro corto— porque en el
     largo el defecto no aparecía: una prueba de pie sola habría salido verde
     con el fallo dentro. El marco corto es el testigo de que esta línea
     prueba algo. */
  titulo('ORACIÓN: el árbol cabe entero, también en pantalla corta');
  const mirarArbol = async (marco) => marco ? marco.evaluate(() => {
    const g = document.querySelector('.tree-variant.active') ||
              document.querySelector('#tree');
    if (!g) return { falta:'no hay árbol' };
    const b = g.getBoundingClientRect();
    const puntos = document.getElementById('ws-dots');
    const d = puntos && puntos.getBoundingClientRect();
    return { aire: Math.round(b.top), base: Math.round(b.bottom),
             aPuntos: d ? Math.round(d.top - b.bottom) : null,
             ancho: Math.round(b.width), marcoAncho: innerWidth,
             alto: innerHeight, proporcion: +(innerWidth / innerHeight).toFixed(3) };
  }) : { falta:'sin marco' };
  const arbolLargo = await mirarArbol(marcoOra);
  await p.setViewportSize({ width: DE_PIE.width, height: 670 });
  await p.waitForTimeout(900);
  const arbolCorto = await mirarArbol(marcoOra);
  await p.setViewportSize(DE_PIE);
  await p.waitForTimeout(900);
  di('árbol en marco largo', JSON.stringify(arbolLargo));
  di('árbol en marco corto', JSON.stringify(arbolCorto));
  vale('(la prueba es válida) se midió el árbol en los dos marcos',
       !arbolLargo.falta && !arbolCorto.falta,
       (arbolLargo.falta || '') + (arbolCorto.falta || '') || 'sí');
  /* El testigo: si el marco corto no pasa de 0,588 no estamos probando el
     caso que se rompía, y entonces el verde de abajo no significa nada. */
  vale('(la prueba es válida) el marco corto es de los que se limitan por alto',
       !arbolCorto.falta && arbolCorto.proporcion > 0.588,
       !arbolCorto.falta && String(arbolCorto.proporcion));
  vale('EL ÁRBOL DEJA AIRE ARRIBA EN PANTALLA CORTA',
       !arbolCorto.falta && arbolCorto.aire > 0,
       !arbolCorto.falta && (arbolCorto.aire + ' px sobre la copa'));
  vale('  y también en la larga',
       !arbolLargo.falta && arbolLargo.aire > 0,
       !arbolLargo.falta && (arbolLargo.aire + ' px sobre la copa'));
  /* Bajarlo no puede llevárselo encima de los puntos: el hueco de abajo es la
     otra mitad del encargo. */
  vale('  sin comerse el hueco de los puntos',
       !arbolCorto.falta && arbolCorto.aPuntos > 0 &&
       !arbolLargo.falta && arbolLargo.aPuntos > 0,
       'corto ' + (arbolCorto.aPuntos) + ' px · largo ' + (arbolLargo.aPuntos) + ' px');
  /* Y a lo ancho: el dibujo mide 374 de 394 en el marco largo, así que un
     alto mayor lo recortaría por los lados. */
  vale('  y sin salirse a lo ancho',
       !arbolLargo.falta && arbolLargo.ancho <= arbolLargo.marcoAncho,
       !arbolLargo.falta && (arbolLargo.ancho + ' de ' + arbolLargo.marcoAncho));

  /* ---------------- la hojita sube a editarse, y vuelve ---------------- */
  /* LO QUE SE PIDIÓ: «cuando se haga doble clic sobre una hojita, esta se va a
     mover al top center y va a permitir la edición del texto», con el mismo
     movimiento lento del resto del programa, y «verifica que tenga suficiente
     aire en el top para que los controles de edición no queden tapados».

     LAS CINCO COSAS QUE SE VIGILAN:

     · QUE SUBA. El doble toque la lleva arriba del todo y centrada.
     · QUE LOS CONTROLES QUEPAN, que es la mitad medible del encargo. El «+»
       vive 52 px por encima del borde de la hoja, así que lo que se afirma no
       es dónde queda la hoja sino dónde queda EL BOTÓN: dentro del marco.
       Medido antes de existir esto: en el sitio donde nacen las hojas, el «+»
       caía en −19, −32 y −44 px en los marcos cortos. Por eso el sitio de
       editar se cuenta desde arriba y no como fracción del alto.
     · CON UNA HOJA GRANDE TAMBIÉN. Lo levantó la revisión de Codex: la hoja se
       engorda hasta 320 px con el «+», y centrarla a secas dejaba fuera los
       botones de los lados. Se engorda por el camino de verdad y se reabre la
       edición, que es el caso que describe.
     · QUE VUELVA A SU SITIO al cerrar la edición. En esta aplicación el sitio
       ES el grupo —finishDrag reclasifica al soltar—, así que una hoja que se
       quedara arriba cambiaría de rama cada vez que se edita su texto. Se
       afirman las dos: que vuelve al píxel de donde salió y que su grupo
       guardado no cambió.
     · Y QUE EL TEXTO SE HAYA GUARDADO, sin la cual todo lo anterior describiría
       un paseo bonito que no edita nada.

     LOS GESTOS VAN CON EL RATÓN DE PLAYWRIGHT, no con PointerEvent hechos a
     mano, y la razón está escrita más arriba en este mismo fichero: el árbol
     llama setPointerCapture(e.pointerId) en su pointerdown, y un pointerId
     inventado no corresponde a ningún puntero vivo —el navegador tira
     NotFoundError—. Lo pagué: la primera versión de este bloque medía bien y
     dejaba tres excepciones en la consola, y la línea de «sin errores de
     JavaScript» las cazó. El ratón manda pulsaciones reales, con su pointerId
     real.

     Y LA HOJA SE ARRASTRA ABAJO ANTES DE EMPEZAR, torcido como un dedo: nace
     arriba, así que sin moverla el viaje sería de cero píxeles y las primeras
     líneas saldrían verdes sin que nada se hubiera movido. */
  titulo('ORACIÓN: la hojita sube a editarse y vuelve a su sitio');
  const marcoEnPantalla = () => p.evaluate(() => {
    const e = document.querySelector('.ora-marco');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x:r.x, y:r.y, w:r.width, h:r.height };
  });
  const nuevaHoja = marcoOra ? await marcoOra.evaluate(async () => {
    const antes = new Set([...document.querySelectorAll('.leaf')].map(x => x.dataset.id));
    document.getElementById('add-btn').click();
    await new Promise(z => setTimeout(z, 700));
    const el = [...document.querySelectorAll('.leaf')].find(x => !antes.has(x.dataset.id));
    return el ? el.dataset.id : null;
  }) : null;
  const SEL = '.leaf[data-id="' + nuevaHoja + '"]';
  /* Todo lo que hay que mirar de la hoja, en una sola pasada. */
  const verHoja = () => marcoOra.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { falta:'no está la hoja' };
    const r = el.getBoundingClientRect();
    const b = (q) => {
      const x = el.querySelector(q);
      if (!x) return null;
      const c = x.getBoundingClientRect();
      return { izq:Math.round(c.left), der:Math.round(c.right),
               top:Math.round(c.top), fondo:Math.round(c.bottom) };
    };
    let nodo = {};
    try {
      nodo = JSON.parse(localStorage.getItem('sticky-shapes:v2') || '{}')
        .workspaces.flatMap(w => w.nodes || []).find(n => n.id === el.dataset.id) || {};
    } catch(e){ /* sin almacén, se queda sin grupo y la línea de validez lo dirá */ }
    return { top:Math.round(r.top), izq:Math.round(r.left), ancho:Math.round(r.width),
             marco:{ w:innerWidth, h:innerHeight },
             viajando: el.classList.contains('viajando'),
             editor: !!el.querySelector('.leaf-editor'),
             mas: b('.size-btn.plus'), menos: b('.size-btn.minus'),
             rotar: b('.size-btn.rotate'), color: b('.size-btn.color'),
             grupo: nodo.status, texto: nodo.text };
  }, SEL);

  let viaje = { falta:'sin marco' };
  if (marcoOra && nuevaHoja){
    /* 1 · abajo, arrastrando torcido */
    const m0 = await marcoEnPantalla();
    const desde = await enPantalla(SEL);
    const hastaY = m0.y + m0.h * 0.72;
    await p.mouse.move(desde.x, desde.y);
    await p.mouse.down();
    for (let i = 1; i <= 8; i++)
      await p.mouse.move(desde.x + Math.sin(i) * 3,
                         desde.y + (hastaY - desde.y) * i / 8);
    await p.mouse.up();
    await p.waitForTimeout(500);
    const abajo = await verHoja();
    /* 2 · doble toque: sube */
    await dobleToque(await enPantalla(SEL));
    const enVuelo = await verHoja();          /* dobleToque deja 500 ms: el
                                                 viaje dura 600, así que aquí
                                                 la clase tiene que seguir */
    await p.waitForTimeout(700);
    const arriba = await verHoja();
    /* 3 · se escribe con el teclado de verdad y se cierra con Intro */
    await p.keyboard.type('TEXTO DE LA PRUEBA');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1100);
    const vuelta = await verHoja();
    viaje = { abajo, enVuelo:enVuelo.viajando, arriba, vuelta };
  }
  di('el viaje de la hojita', JSON.stringify(viaje));
  vale('(la prueba es válida) se pudo crear, bajar y editar una hoja',
       !viaje.falta && viaje.arriba.editor === true,
       viaje.falta || (viaje.arriba && viaje.arriba.editor));
  vale('(la prueba es válida) la hoja estaba abajo antes del doble toque',
       !viaje.falta && viaje.abajo.top > viaje.abajo.marco.h / 2,
       !viaje.falta && (viaje.abajo.top + ' de ' + viaje.abajo.marco.h));
  vale('EL DOBLE TOQUE LA SUBE ARRIBA',
       !viaje.falta && viaje.arriba.top < viaje.abajo.top && viaje.arriba.top <= 60,
       !viaje.falta && (viaje.abajo.top + ' → ' + viaje.arriba.top));
  vale('  y centrada a lo ancho',
       !viaje.falta &&
       Math.abs((viaje.arriba.izq + viaje.arriba.ancho / 2) - viaje.arriba.marco.w / 2) <= 2,
       !viaje.falta && (viaje.arriba.izq + ' de ' + viaje.arriba.marco.w));
  vale('  con el movimiento puesto, no de un salto',
       !viaje.falta && viaje.enVuelo === true, !viaje.falta && viaje.enVuelo);
  vale('LOS CONTROLES DE EDICIÓN CABEN: el botón de arriba no se sale',
       !viaje.falta && viaje.arriba.mas && viaje.arriba.mas.top >= 0,
       !viaje.falta && viaje.arriba.mas && (viaje.arriba.mas.top + ' px del filo'));
  vale('Y AL TERMINAR VUELVE A SU SITIO',
       !viaje.falta && Math.abs(viaje.vuelta.top - viaje.abajo.top) <= 1 &&
       Math.abs(viaje.vuelta.izq - viaje.abajo.izq) <= 1,
       !viaje.falta && (JSON.stringify([viaje.vuelta.top, viaje.vuelta.izq]) +
                        ' contra ' + JSON.stringify([viaje.abajo.top, viaje.abajo.izq])));
  vale('  sin cambiar de grupo, que es lo que el sitio significa aquí',
       !viaje.falta && !!viaje.abajo.grupo && viaje.vuelta.grupo === viaje.abajo.grupo,
       !viaje.falta && (viaje.abajo.grupo + ' → ' + viaje.vuelta.grupo));
  vale('  y con el texto guardado',
       !viaje.falta && viaje.vuelta.texto === 'TEXTO DE LA PRUEBA',
       !viaje.falta && viaje.vuelta.texto);

  /* Y UNA HOJA GRANDE, QUE ES DONDE SE ROMPÍA. Se engorda con el «+» —cuatro
     toques de 25 px— y se vuelve a abrir la edición, que es el caso que
     describe Codex: reabrir una hoja ya grande.

     LA LÍNEA DE VALIDEZ ES LA DEL SITIO: los controles piden el ancho de la
     hoja más 120 px, y si el marco no los tiene no hay colocación que los
     salve —lo único que queda entonces es centrarla, que reparte el recorte
     entre los dos lados en vez de perder un botón entero—. Así que la
     exigencia sólo significa algo cuando caben, y eso se afirma primero. */
  let hojaGrande = { falta:'sin marco' };
  if (marcoOra && nuevaHoja){
    await dobleToque(await enPantalla(SEL));
    /* El botón se busca ANTES DE CADA TOQUE, no una vez: va anclado al centro
       de la hoja, y cada vez que ésta engorda 25 px el botón se corre. Con la
       posición del primero, los toques siguientes caían al lado y la hoja
       llegaba a 200 en vez de 250 —medido—. */
    for (let i = 0; i < 4; i++){
      const btnMas = await enPantalla(SEL + ' .size-btn.plus');
      if (!btnMas) break;
      await p.mouse.move(btnMas.x, btnMas.y);
      await p.mouse.down(); await p.mouse.up();
      await p.waitForTimeout(150);
    }
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1100);
    await dobleToque(await enPantalla(SEL));
    await p.waitForTimeout(700);
    hojaGrande = await verHoja();
  }
  di('la hoja grande y sus controles', JSON.stringify(hojaGrande));
  vale('(la prueba es válida) la hoja creció con el botón',
       !hojaGrande.falta && hojaGrande.ancho > 200,
       hojaGrande.falta || hojaGrande.ancho);
  vale('(la prueba es válida) en este marco los controles caben',
       !hojaGrande.falta && hojaGrande.ancho + 120 <= hojaGrande.marco.w,
       !hojaGrande.falta && (hojaGrande.ancho + ' + 120 contra ' + hojaGrande.marco.w));
  vale('CON UNA HOJA GRANDE, LOS BOTONES DE LOS LADOS NO SE SALEN',
       !hojaGrande.falta && hojaGrande.rotar && hojaGrande.color &&
       hojaGrande.rotar.izq >= 0 && hojaGrande.color.der <= hojaGrande.marco.w,
       !hojaGrande.falta && JSON.stringify({ rotar:hojaGrande.rotar, color:hojaGrande.color }));
  vale('  y el de arriba tampoco',
       !hojaGrande.falta && hojaGrande.mas && hojaGrande.mas.top >= 0,
       !hojaGrande.falta && hojaGrande.mas && hojaGrande.mas.top);
  /* Se cierra la edición para no dejarla abierta al bloque siguiente. */
  if (marcoOra && nuevaHoja){
    await p.keyboard.press('Enter');
    await p.waitForTimeout(900);
  }

  /* ---------------- el cofre enseña lo que guarda ---------------- */
  /* LO QUE SE PIDIÓ: «que al hacer doble clic al cofre en ORACIÓN saliera la
     lista de todas las hojitas que mandamos al cofre… una lista con la forma
     de la hojita reducida en tamaño, seguida de una línea con el contenido».

     Y LO QUE HABÍA QUE ARREGLAR PARA PODERLO HACER, que es la mitad que no se
     ve: el cofre no guardaba nada. Echarle una hoja la BORRABA —el nodo salía
     del escritorio y se guardaba el estado sin él—, así que «todas las
     hojitas que mandamos al cofre» no existía como dato en ninguna parte. Por
     eso la afirmación de abajo tiene dos mitades y las dos hacen falta: que la
     hoja se va del árbol (lo de siempre) Y que se queda en el cofre (lo nuevo).
     Comprobar sólo la lista dejaría pasar un cofre que enseña bien lo que
     guarda mal.

     CON EL RATÓN DE VERDAD Y TORCIDO, por lo de siempre: esta aplicación llama
     a setPointerCapture sin envolver, así que un PointerEvent despachado a
     mano le revienta con NotFoundError —y el banco cuenta esas excepciones—; y
     una recta perfecta no es un dedo.

     LOS COLORES SE AFIRMAN COMO RELACIÓN, no como número: el negro contra el
     negro del propio árbol y el borde contra el dorado del propio cofre,
     leídos los dos en el mismo rato. Se pidió «el mismo negro que el
     background del árbol» y un borde de neón; clavar aquí #0a0018 y #ffd24a
     sería escribir dos veces lo mismo y que el día que el árbol cambie de
     noche esta prueba siga verde diciendo que todo va bien. */
  titulo('ORACIÓN: el cofre guarda lo que se le echa, y lo enseña');
  const dobleEnElMarco = async (sel) => {
    const b = await marcoOra.locator(sel).boundingBox();
    if (!b) return false;
    await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await p.waitForTimeout(60);
    await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await p.waitForTimeout(450);
    return true;
  };
  const mirarCofre = () => marcoOra.evaluate(() => {
    const v = document.getElementById('chest-list');
    const caja = document.querySelector('.chest-box');
    if (!v || !caja) return { falta: 'no está la ventana del cofre' };
    const cs = getComputedStyle(caja);
    const cuerpo = document.querySelector('#treasure .chest-body');
    const filas = [...document.querySelectorAll('.chest-item')].map((f) => {
      const fig = f.querySelector('svg.chest-leaf');
      const cuerpoHoja = fig && fig.querySelector('.leaf-body');
      const t = f.querySelector('.chest-text');
      return { texto: t ? t.textContent : null,
               hoja: !!fig,
               alto: fig ? Math.round(fig.getBoundingClientRect().height) : 0,
               neon: cuerpoHoja ? getComputedStyle(cuerpoHoja).stroke : null };
    });
    let guardadas = null;
    try {
      const st = JSON.parse(localStorage.getItem('sticky-shapes:v2') || 'null');
      if (st) guardadas = { cofre: (st.chest || []).map((h) => h.text),
                            enElArbol: (st.workspaces || [])
                              .flatMap((w) => w.nodes || []).map((n) => n.text) };
    } catch (_) { /* si el almacén no se deja leer, se queda sin cuentas */ }
    return { abierta: !v.hidden, vacio: !document.getElementById('chest-empty').hidden,
             filas, guardadas,
             negro: cs.backgroundColor,
             negroDelArbol: getComputedStyle(document.body).backgroundColor,
             borde: cs.borderTopColor,
             doradoDelCofre: cuerpo ? getComputedStyle(cuerpo).stroke : null };
  });

  const hayCofre = marcoOra ? await dobleEnElMarco('#treasure') : false;
  const vacio = hayCofre ? await mirarCofre() : { falta: 'sin marco' };
  di('el cofre vacío', JSON.stringify(vacio));
  vale('(la prueba es válida) el marco está y el cofre se deja tocar',
       !vacio.falta, vacio.falta || 'sí');
  vale('DOBLE CLIC EN EL COFRE ABRE SU LISTA',
       !vacio.falta && vacio.abierta === true, String(vacio.abierta));
  vale('  y con el cofre vacío lo dice, en vez de enseñar una lista en blanco',
       !vacio.falta && vacio.vacio === true && vacio.filas.length === 0,
       !vacio.falta && (vacio.vacio + ' · ' + vacio.filas.length + ' filas'));
  vale('  la ventana es del negro del propio árbol',
       !vacio.falta && vacio.negro === vacio.negroDelArbol,
       !vacio.falta && (vacio.negro + ' contra ' + vacio.negroDelArbol));
  vale('  y su borde, del dorado del propio cofre',
       !vacio.falta && !!vacio.doradoDelCofre && vacio.borde === vacio.doradoDelCofre,
       !vacio.falta && (vacio.borde + ' contra ' + vacio.doradoDelCofre));

  /* ESCAPE ES LA TECLA QUE MUERDE AQUÍ. Glossa enseña esta aplicación dentro
     de un marco y devuelve el Escape hacia arriba para cerrar la pestaña
     entera; sin el preventDefault de la lista, un Escape cerraría las DOS
     cosas de un golpe —la lista y la pestaña— y el lector se quedaría fuera
     del árbol por haber cerrado una ventanita. Es el mismo defecto que ya
     tuvo el editor de las hojas, arreglado de la misma manera y probado aquí
     por la misma razón. */
  /* SÓLO SI LA LISTA SE ABRIÓ DE VERDAD. Si no llegó a abrirse, esa tecla no
     tiene nada que cerrar y el puente se la lleva arriba: cerraría la pestaña
     de ORACIÓN y todo lo que viene después en esta suite se caería detrás,
     enterrando el fallo de verdad bajo veinte rojas que no son. Una prueba que
     falla tiene que fallar sola. */
  let trasEscapeCofre = { falta: 'la lista no llegó a abrirse' };
  if (!vacio.falta && vacio.abierta === true){
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    trasEscapeCofre = {
      lista: await marcoOra.evaluate(() =>
        document.getElementById('chest-list').hidden),
      pestana: await p.evaluate(() => {
        const r = document.getElementById('oracion');
        return r ? getComputedStyle(r).display : 'no está';
      }) };
  }
  di('tras Escape', JSON.stringify(trasEscapeCofre));
  vale('ESCAPE CIERRA LA LISTA',
       !trasEscapeCofre.falta && trasEscapeCofre.lista === true, String(trasEscapeCofre.lista));
  vale('  Y NO SE LLEVA POR DELANTE LA PESTAÑA DE ORACIÓN',
       !trasEscapeCofre.falta && trasEscapeCofre.pestana !== 'none',
       String(trasEscapeCofre.pestana));

  /* Y CON EL TECLADO, QUE ES LA OTRA MITAD DE «SE ABRE». El cofre era un
     <div> con una etiqueta: para un dedo, un mando; para el teclado, un
     conmutador o un lector de pantalla, nada —ni se llega a él ni se sabe que
     está—. Lo levantó la revisión de Codex y es el mismo defecto que ya tuvo
     el respaldo del día, que colgaba sólo de un pointerup.

     Y SE PIDE UNA SOLA PULSACIÓN, no dos: el doble toque es un gesto del dedo,
     y pedirle a quien navega con el teclado que lo repita sería inventarle un
     gesto que no existe en ninguna otra parte.

     LA ÚLTIMA LÍNEA ES EL CONTRAPESO y sin ella las otras no valen: se puede
     arreglar el teclado abriendo la lista con un clic simple, y entonces esto
     saldría todo verde con el gesto del dedo perdido por el camino. Así que se
     exige también que un solo toque NO abra. */
  let teclado = { falta: 'la lista no llegó a abrirse' };
  if (!vacio.falta && vacio.abierta === true){
    const mando = await marcoOra.evaluate(() => {
      const c = document.getElementById('treasure');
      return { etiqueta: c.tagName, nombre: c.getAttribute('aria-label'),
               anuncia: c.getAttribute('aria-haspopup') };
    });
    await marcoOra.locator('#treasure').focus();
    const enfocado = await marcoOra.evaluate(() =>
      document.activeElement && document.activeElement.id);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(450);
    const conEnter = await marcoOra.evaluate(() => ({
      abierta: !document.getElementById('chest-list').hidden,
      foco: document.activeElement && document.activeElement.id }));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(450);
    const trasCerrar = await marcoOra.evaluate(() => ({
      abierta: !document.getElementById('chest-list').hidden,
      foco: document.activeElement && document.activeElement.id }));
    /* Un solo toque, y a esperar más que la ventana del doble clic.
       Y SE COMPRUEBA QUE EL TOQUE LLEGÓ AL COFRE, que si no esta línea se
       aprueba sola: las hojas de los bloques de arriba andan sueltas por el
       tablero —una de ellas tapaba el botón de nueva hoja, que es lo que tiró
       esta suite la primera vez—, y si una cayera encima del cofre, el toque
       se lo comería ella, la lista seguiría cerrada y el contrapeso diría
       «bien» sin haber tocado nada. Lo que lo demuestra es el foco: en
       Chromium un <button> se queda con él al pulsarlo, así que se aparta
       primero a otro botón y se mira si vuelve. */
    await marcoOra.locator('#add-btn').focus();
    const caja = await marcoOra.locator('#treasure').boundingBox();
    if (caja){
      await p.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await p.waitForTimeout(600);
    }
    const conUno = await marcoOra.evaluate(() => ({
      abierta: !document.getElementById('chest-list').hidden,
      foco: document.activeElement && document.activeElement.id }));
    teclado = { mando, enfocado, conEnter, trasCerrar, conUno };
  }
  di('el cofre con el teclado', JSON.stringify(teclado));
  vale('EL COFRE ES UN MANDO DE VERDAD, con su nombre',
       !teclado.falta && teclado.mando.etiqueta === 'BUTTON' &&
       !!teclado.mando.nombre && teclado.mando.anuncia === 'dialog',
       !teclado.falta && JSON.stringify(teclado.mando));
  vale('  al que se puede llegar con el teclado',
       !teclado.falta && teclado.enfocado === 'treasure',
       !teclado.falta && String(teclado.enfocado));
  vale('  y ENTER ABRE LA LISTA A LA PRIMERA, sin repetir el gesto del dedo',
       !teclado.falta && teclado.conEnter.abierta === true,
       !teclado.falta && String(teclado.conEnter.abierta));
  vale('  con el foco dentro de la ventana, no detrás de ella',
       !teclado.falta && teclado.conEnter.foco === 'chest-close',
       !teclado.falta && String(teclado.conEnter.foco));
  vale('  y al cerrarla el foco vuelve al cofre',
       !teclado.falta && teclado.trasCerrar.abierta === false &&
       teclado.trasCerrar.foco === 'treasure',
       !teclado.falta && JSON.stringify(teclado.trasCerrar));
  vale('  (y la prueba del contrapeso es válida) el toque llegó al cofre',
       !teclado.falta && teclado.conUno.foco === 'treasure',
       !teclado.falta && String(teclado.conUno.foco));
  vale('  (y el contrapeso) un solo toque sigue sin abrirla',
       !teclado.falta && teclado.conUno.abierta === false,
       !teclado.falta && JSON.stringify(teclado.conUno));

  /* Y EL TERCER CAMINO: una ayuda técnica. Un lector de pantalla o un
     conmutador no tocan la pantalla ni pulsan teclas sobre el botón: mandan un
     click a secas, sin puntero detrás, que no cuenta para el doble toque ni es
     el keydown de arriba. Sin su propia línea, el cofre volvería a ser
     inalcanzable para quien lo abre así —que es lo que la revisión de Codex
     hizo arreglar en la entrega anterior— y ninguna de las otras pruebas se
     enteraría.
     AQUÍ SÍ SE DESPACHA UN EVENTO A MANO, y es la excepción que confirma la
     regla de la casa: lo que una ayuda técnica manda ES un click sintético, así
     que despacharlo no es imitar un dedo —eso sería mentir—, es reproducir
     exactamente el gesto que se quiere probar. */
  let ayuda = null;
  if (!teclado.falta){
    /* La lista viene cerrada de la línea de arriba —el toque simple no la
       abrió— así que no hay que apagarla a mano: se activa y se mira. */
    await marcoOra.evaluate(() => document.getElementById('treasure').click());
    await p.waitForTimeout(400);
    ayuda = await marcoOra.evaluate(() =>
      !document.getElementById('chest-list').hidden);
    if (ayuda){
      await p.keyboard.press('Escape');
      await p.waitForTimeout(350);
    }
  }
  vale('UNA AYUDA TÉCNICA TAMBIÉN ABRE EL COFRE, con una sola activación',
       ayuda === true, String(ayuda));

  /* Y AHORA CON UNA HOJA DENTRO. Se escribe, se echa al cofre arrastrando, y
     se mira lo que queda: fuera del árbol y dentro del cofre. */
  const ORACION_DE_PRUEBA = 'por el pan de cada día';
  let conHoja = { falta: 'sin marco' };
  if (!vacio.falta){
    /* LA HOJA NUEVA SE PIDE DESDE EL TECLADO, y no es remilgo: con el ratón
       esta línea se agotaba. Los bloques de arriba dejan sus hojas por el
       tablero y una de ellas se queda encima del botón —«<div
       class="leaf-inner"> … subtree intercepts pointer events», dijo
       Playwright—, así que el clic espera treinta segundos a un botón que
       nunca va a estar libre y se lleva por delante la suite entera.
       Reproducido a mano poniendo una hoja encima a propósito: el clic se
       agota y el teclado crea la hoja igual.
       Y NO ES UN APAÑO PARA ESQUIVAR LA PRUEBA: #add-btn es un <button> de
       verdad, encenderlo con Enter es lo que hace cualquiera que no use el
       ratón, y lo que este bloque viene a probar es el cofre, no dónde
       aparcaron su hoja los bloques de antes. */
    await marcoOra.locator('#add-btn').focus();
    await p.keyboard.press('Enter');
    await p.waitForTimeout(500);
    const nueva = await marcoOra.locator('.leaf').last().boundingBox();
    if (nueva){
      await p.mouse.click(nueva.x + nueva.width / 2, nueva.y + nueva.height / 2);
      await p.waitForTimeout(60);
      await p.mouse.click(nueva.x + nueva.width / 2, nueva.y + nueva.height / 2);
      await p.waitForTimeout(450);
      await p.keyboard.type(ORACION_DE_PRUEBA);
      await p.keyboard.press('Enter');
      await p.waitForTimeout(900);  // la hoja vuelve volando de la edición
      /* La caja se vuelve a preguntar: la hoja acaba de viajar y la de antes
         ya no vale. */
      const donde = await marcoOra.locator('.leaf').last().boundingBox();
      const cofre = await marcoOra.locator('#treasure').boundingBox();
      if (donde && cofre){
        const x0 = donde.x + donde.width / 2, y0 = donde.y + donde.height / 2;
        const x1 = cofre.x + cofre.width / 2, y1 = cofre.y + cofre.height / 2;
        await p.mouse.move(x0, y0);
        await p.mouse.down();
        for (let i = 1; i <= 14; i++){
          const u = i / 14;
          await p.mouse.move(x0 + (x1 - x0) * u + Math.sin(u * 7) * 6,
                             y0 + (y1 - y0) * u + Math.cos(u * 5) * 5);
          await p.waitForTimeout(16);
        }
        await p.mouse.up();
        await p.waitForTimeout(800);   // la tapa, el tragado y el guardado
        await dobleEnElMarco('#treasure');
        conHoja = await mirarCofre();
      }
    }
  }
  di('con una hoja echada', JSON.stringify(conHoja));
  const cuentas = (conHoja.guardadas) || { cofre: [], enElArbol: [] };
  vale('(la prueba es válida) se pudo leer el almacén del árbol',
       !!conHoja.guardadas, conHoja.guardadas ? 'sí' : 'no');
  vale('LA HOJA ECHADA SE VA DEL ÁRBOL',
       !!conHoja.guardadas && !cuentas.enElArbol.includes(ORACION_DE_PRUEBA),
       cuentas.enElArbol.join(' · ') || '(ninguna)');
  vale('  Y SE QUEDA EN EL COFRE, que antes se perdía para siempre',
       !!conHoja.guardadas && cuentas.cofre.includes(ORACION_DE_PRUEBA),
       cuentas.cofre.join(' · ') || '(vacío)');
  vale('la lista enseña su oración',
       !conHoja.falta && conHoja.filas.length === 1 &&
       conHoja.filas[0].texto === ORACION_DE_PRUEBA,
       !conHoja.falta && JSON.stringify(conHoja.filas.map(f => f.texto)));
  /* LA FIGURA, NO UN PUNTO DE COLOR: se pidió «la forma de la hojita reducida
     en tamaño», así que se exige el SVG de la hoja y que su neón sea el de su
     variante —el verde del roble, que es con la que nace— y no un color
     cualquiera heredado. */
  vale('  con la hojita dibujada al lado, y en su neón',
       !conHoja.falta && conHoja.filas.length === 1 && conHoja.filas[0].hoja &&
       conHoja.filas[0].neon === 'rgb(61, 255, 87)',
       !conHoja.falta && JSON.stringify(conHoja.filas[0]));
  vale('  y reducida: no mide lo que una hoja del árbol',
       !conHoja.falta && conHoja.filas.length === 1 &&
       conHoja.filas[0].alto > 0 && conHoja.filas[0].alto <= 60,
       !conHoja.falta && (conHoja.filas[0].alto + ' px'));

  /* SIN TÍTULO, pero con nombre. Se pidió quitarle el rótulo «El cofre» a la
     ventana, y lo que hay que vigilar al quitar un título es que no se lleve
     por delante el nombre: un diálogo sin nombre ninguno es, para un lector de
     pantalla, una ventana que se abre y no dice qué es. El rótulo se mudó al
     aria-label, así que se comprueban las dos cosas a la vez. */
  const sinTitulo = conHoja.falta ? null : await marcoOra.evaluate(() => {
    const v = document.getElementById('chest-list');
    return { rotulo: !!document.querySelector('.chest-head h2'),
             nombre: (v.getAttribute('aria-label') || '').trim(),
             apuntaANadie: v.hasAttribute('aria-labelledby') };
  });
  di('el nombre de la ventana', JSON.stringify(sinTitulo));
  vale('LA VENTANA NO LLEVA TÍTULO ESCRITO',
       !!sinTitulo && sinTitulo.rotulo === false, JSON.stringify(sinTitulo));
  vale('  pero SIGUE TENIENDO NOMBRE para quien no ve la pantalla',
       !!sinTitulo && sinTitulo.nombre.length > 0 && sinTitulo.apuntaANadie === false,
       !!sinTitulo && (sinTitulo.nombre + ' · aria-labelledby ' + sinTitulo.apuntaANadie));

  /* LA LETRA ES LA DEL LIBRO. «Use same font size que tiene el libro», que es
     la misma regla que rige en RESPALDO. El número no existe dentro del marco
     —es otra página— así que Glossa se lo manda; lo que se afirma aquí es la
     RELACIÓN con el libro de arriba, leída en el mismo rato, y no un tamaño
     escrito a mano, que se quedaría viejo en cuanto el lector toque el riel de
     la letra. */
  const letras = conHoja.falta ? null : {
    libro: await p.evaluate(() => getComputedStyle(document.documentElement)
      .getPropertyValue('--fs-libro').trim()),
    fila: await marcoOra.evaluate(() => {
      const t = document.querySelector('.chest-item .chest-text');
      return t ? getComputedStyle(t).fontSize : null; }) };
  di('la letra', JSON.stringify(letras));
  vale('(la prueba es válida) el libro tiene un tamaño de letra que leer',
       !!letras && /^\d/.test(letras.libro || ''), !!letras && letras.libro);
  vale('LA LISTA SE LEE CON LA LETRA DEL LIBRO',
       !!letras && letras.fila === letras.libro,
       !!letras && (letras.fila + ' contra ' + letras.libro));

  /* Y ENTRA POR TURNOS, que es lo que se pidió: «que aparezca bonito, no de una
     vez». Lo que se puede afirmar de una animación sin cronómetro es su
     MECANISMO: que cada fila espera más que la de arriba. Y el tope también,
     porque es lo que separa una entrada elegante de una cuenta atrás: con el
     cofre lleno, las filas del final no pueden estar esperando doscientos
     turnos. */
  const entrada = conHoja.falta ? null : await marcoOra.evaluate(() => {
    /* Se pintan de mentira veinte filas para ver el tope sin tener que echar
       veinte hojas al cofre: no se toca el programa, se leen los retardos que
       el CSS le pone a un elemento con la clase y el turno puestos. */
    const caja = document.createElement('ul');
    caja.className = 'chest-items';
    document.querySelector('.chest-box').appendChild(caja);
    const retardos = [];
    for (const n of [0, 1, 2, 5, 12, 19]){
      const li = document.createElement('li');
      li.className = 'chest-item';
      li.style.setProperty('--turno', Math.min(n, 12));
      caja.appendChild(li);
      retardos.push([n, getComputedStyle(li).animationDelay]);
    }
    caja.remove();
    const ms = (x) => parseFloat(x) * (/ms$/.test(x) ? 1 : 1000);
    return { retardos, en: retardos.map(([, d]) => Math.round(ms(d))) };
  });
  di('los turnos de entrada', JSON.stringify(entrada && entrada.retardos));
  vale('CADA FILA ENTRA DESPUÉS DE LA DE ARRIBA',
       !!entrada && entrada.en[0] < entrada.en[1] && entrada.en[1] < entrada.en[2] &&
       entrada.en[2] < entrada.en[3],
       !!entrada && entrada.en.join(' · '));
  /* Y LA ESPERA MÁS LARGA ES CORTA. Ojo a qué mide esto y qué no: el TOPE de
     doce está en el guion, al pintar cada fila, y aquí los turnos los pongo yo,
     así que lo que se afirma no es el tope sino la ESCALA de la regla —que la
     fila del último turno posible entra antes de un segundo—. Una regla con la
     escala mal puesta convierte una entrada en una espera aunque el tope
     funcione. */
  vale('  y la última en entrar no se hace esperar un segundo',
       !!entrada && entrada.en[4] <= 1000,
       !!entrada && (entrada.en[4] + ' ms en el turno 12'));

  /* Y LOS SEIS NÚMEROS DE LA CACHÉ, TODOS IGUALES. La dirección del documento
     del árbol cuelga del sello de compilación, así que el marcado llega
     siempre fresco; pero su hoja de estilo y sus guiones se piden por su
     propia dirección, y si ese número no sube, el navegador sirve la copia
     vieja y queda lo peor de los dos mundos: el marcado nuevo con el guion de
     antes. Ya pasó —con esta misma aspa, cambiada en la hoja de estilo sin
     subir el número— y lo levantó la revisión de Codex.
     LO QUE ESTA LÍNEA PUEDE GUARDAR es la mitad que se puede comprobar desde
     aquí: que los seis vayan a la una. Un olvido entero no lo ve nadie más que
     quien escribe el cambio; un olvido a medias —subir la hoja de estilo y
     dejarse el guion— es el que de verdad despista, porque entonces media
     aplicación es nueva y la otra media no. */
  const sellos = conHoja.falta ? null : await marcoOra.evaluate(() => {
    const de = (u) => { const m = /[?&]v=([^&]+)/.exec(u || ''); return m ? m[1] : null; };
    /* SÓLO LOS FICHEROS DE ESTA CARPETA. El puente —../encuentros/salida.js—
       entra sin número y a propósito: es de otro módulo, el mismo para los
       cinco relatos, y su caché no es cosa del árbol. Sin este filtro la
       comprobación se caía con todo bien puesto, que es la peor manera de
       fallar: enseña a no hacer caso de las rojas. */
    const fuentes = [...document.querySelectorAll('link[href], script[src]')]
      .map((e) => e.getAttribute('href') || e.getAttribute('src'))
      .filter((u) => u && !/^https?:/.test(u) && !/^\.\./.test(u));
    return { versiones: fuentes.map(de), fuentes };
  });
  di('los números de la caché', JSON.stringify(sellos && sellos.versiones));
  vale('(la prueba es válida) el árbol pide hojas de estilo y guiones propios',
       !!sellos && sellos.fuentes.length >= 4,
       !!sellos && sellos.fuentes.join(' · '));
  vale('TODOS LOS FICHEROS DEL ÁRBOL VAN CON EL MISMO NÚMERO DE CACHÉ',
       !!sellos && sellos.versiones.every((v) => v && v === sellos.versiones[0]),
       !!sellos && sellos.versiones.join(' · '));

  /* EL ASPA: PEQUEÑA, VISIBLE, Y CON SU BLANCO DE TOQUE INTACTO. Tres cosas y
     las tres hacen falta, porque esta ventana ya se pasó de rosca en las dos
     primeras. Se pidió «mucho más pequeña y discreta» y se hizo —14 px, sin
     aro, a media luz—; al verlo puesto, «está demasiado discreta, no se ve
     nada». Así que ahora se afirma el rango y no un extremo: más chica que los
     22 px con aro del principio, pero encendida.
     Y la tercera, que es la que ninguna de las dos vueltas movió: el área que
     atiende al dedo se queda en los 44 px de la casa (CONFIG.minTouchTarget)
     mida lo que mida la tinta. Van las tres en la misma lectura porque
     separarlas es exactamente el error que estas líneas guardan. */
  const aspa = conHoja.falta ? null : await marcoOra.evaluate(() => {
    const x = document.getElementById('chest-close');
    const r = x.getBoundingClientRect();
    const cs = getComputedStyle(x);
    return { toque: [Math.round(r.width), Math.round(r.height)],
             tinta: parseFloat(cs.fontSize),
             borde: parseFloat(cs.borderTopWidth) || 0,
             apagada: parseFloat(cs.opacity) };
  });
  di('el aspa', JSON.stringify(aspa));
  vale('EL ASPA ES PEQUEÑA, más que el botón con aro del que salió',
       !!aspa && aspa.tinta <= 20 && aspa.borde === 0, JSON.stringify(aspa));
  vale('  PERO SE VE, que apagarla del todo fue pasarse',
       !!aspa && aspa.apagada >= 0.8, !!aspa && String(aspa.apagada));
  vale('  PERO NO PIERDE SU BLANCO DE TOQUE, que es lo que no se ve',
       !!aspa && aspa.toque[0] >= 44 && aspa.toque[1] >= 44,
       !!aspa && aspa.toque.join('x'));

  /* EL ANCHO LO MANDA LA ORACIÓN MÁS LARGA. Estuvo fijo en 560 y se pidió que
     midiera su contenido «y nada más». Lo que se afirma es la RELACIÓN, en dos
     mitades que hacen falta las dos:
     · que con una oración corta la ventana NO llene el marco —un ancho fijo
       también pasaría la segunda mitad, así que sin ésta no se prueba nada—, y
     · que al echar una oración más larga, la ventana CREZCA.
     Y no se clava ningún número: el ancho de una letra depende del tipo y del
     tamaño, que el lector mueve. */
  let anchos = null;
  if (!conHoja.falta && conHoja.abierta === true){
    const mide = () => marcoOra.evaluate(() => ({
      caja: Math.round(document.querySelector('.chest-box').getBoundingClientRect().width),
      marco: window.innerWidth }));
    const corta = await mide();
    /* Se cierra, se echa una oración mucho más larga y se vuelve a abrir. */
    await p.keyboard.press('Escape');
    await p.waitForTimeout(350);
    await marcoOra.locator('#add-btn').focus();
    await p.keyboard.press('Enter');
    await p.waitForTimeout(500);
    const otra = await marcoOra.locator('.leaf').last().boundingBox();
    if (otra){
      await p.mouse.click(otra.x + otra.width / 2, otra.y + otra.height / 2);
      await p.waitForTimeout(60);
      await p.mouse.click(otra.x + otra.width / 2, otra.y + otra.height / 2);
      await p.waitForTimeout(450);
      await p.keyboard.type('por los que hoy no tienen a nadie que los nombre');
      await p.keyboard.press('Enter');
      await p.waitForTimeout(900);
      const d = await marcoOra.locator('.leaf').last().boundingBox();
      const c = await marcoOra.locator('#treasure').boundingBox();
      if (d && c){
        const x0 = d.x + d.width / 2, y0 = d.y + d.height / 2;
        const x1 = c.x + c.width / 2, y1 = c.y + c.height / 2;
        await p.mouse.move(x0, y0);
        await p.mouse.down();
        for (let i = 1; i <= 12; i++){
          const u = i / 12;
          await p.mouse.move(x0 + (x1 - x0) * u + Math.sin(u * 6) * 5,
                             y0 + (y1 - y0) * u + Math.cos(u * 4) * 4);
          await p.waitForTimeout(16);
        }
        await p.mouse.up();
        await p.waitForTimeout(800);
        await dobleEnElMarco('#treasure');
        anchos = { corta, larga: await mide() };
      }
    }
  }
  di('el ancho de la ventana', JSON.stringify(anchos));
  vale('(la prueba es válida) se midió con las dos, la corta y la larga',
       !!anchos && anchos.corta.caja > 0 && anchos.larga.caja > 0,
       JSON.stringify(anchos));
  vale('CON UNA ORACIÓN CORTA LA VENTANA NO LLENA EL MARCO',
       !!anchos && anchos.corta.caja < anchos.corta.marco * 0.9,
       !!anchos && (anchos.corta.caja + ' de ' + anchos.corta.marco));
  vale('  Y CRECE CON LA ORACIÓN MÁS LARGA',
       !!anchos && anchos.larga.caja > anchos.corta.caja,
       !!anchos && (anchos.corta.caja + '  →  ' + anchos.larga.caja));

  /* Y SE CIERRA CON LA EQUIS, que es como se pidió y como cierran las demás
     ventanas del programa. */
  /* SE PREGUNTA POR LA VENTANA AHORA, no por cómo estaba hace veinte líneas:
     entre medias se cerró y se volvió a abrir para medir el ancho. Pulsar una
     equis que no está en pantalla es esperar treinta segundos y tirar la suite
     entera, que ya pasó una vez en este mismo bloque. */
  let cerrada = null;
  const sigueAbierta = conHoja.falta ? false : await marcoOra.evaluate(() =>
    !document.getElementById('chest-list').hidden);
  if (sigueAbierta){
    await marcoOra.click('#chest-close');
    await p.waitForTimeout(400);
    cerrada = await marcoOra.evaluate(() =>
      document.getElementById('chest-list').hidden);
  }
  vale('LA EQUIS CIERRA LA LISTA', cerrada === true, String(cerrada));

  /* EL DOBLE TOQUE, CON PAUSA DE DEDO. Aquí está la roja que contó el dueño del
     repo: «no funciona el cofre con doble click». Lo que de verdad le pasaba a
     su teléfono no se sabe —el aparato es suyo y aquí no se pudo reproducir—,
     así que lo que se arregló fue todo lo que podía perderse por el camino: el
     gesto se cuenta ahora por el pointerdown, que es el primero de todos y no
     depende de lo que el navegador decida después, y la ventana pasó de 250 ms
     a 400, que es de pulgar y no de reloj. Esto último es lo que se prueba
     aquí: 300 ms entre los dos toques, que con la ventana de antes no habrían
     abierto nada.
     LO QUE NO SE PRUEBA AQUÍ, y conviene decirlo: el toque movido —el que
     pierde el click— se sondeó a mano con el dedo emulado, y no entra en el
     banco porque mandarlo hay que hacerlo por CDP, ida y vuelta por cada
     movimiento, y esas idas y vueltas se comen la ventana de 400 ms: la prueba
     saldría roja o verde según lo cargada que esté la máquina, que es la peor
     clase de prueba.
     Va detrás de la equis para no dejar la lista cerrada a medias: cierra la
     equis, abre esto, y al final se cierra con Escape para el bloque siguiente. */
  let pausaLarga = null;
  if (cerrada === true){
    const caja = await marcoOra.locator('#treasure').boundingBox();
    if (caja){
      await p.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await p.waitForTimeout(300);
      await p.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await p.waitForTimeout(450);
      pausaLarga = await marcoOra.evaluate(() =>
        !document.getElementById('chest-list').hidden);
      if (pausaLarga){
        await p.keyboard.press('Escape');
        await p.waitForTimeout(350);
      }
    }
  }
  vale('DOS TOQUES CON 300 ms DE PAUSA TAMBIÉN ABREN, que un pulgar no es un reloj',
       pausaLarga === true, String(pausaLarga));

  /* ---------------- y la barra no se mueve con el libro ---------------- */
  /* SE PIDIÓ QUE ESTA BARRA SE SALGA DE «LA INTERFAZ CRECE CON EL LIBRO», y
     eso es justo lo que no se puede comprobar mirando la barra sola: si el
     mando de la letra estuviera roto, la barra tampoco se movería y esto
     saldría verde sin haber probado nada.

     Por eso cada medida de la barra viene con un TESTIGO al lado —un botón
     del panel, que sí escala— y las dos afirmaciones se leen juntas: el
     testigo creció, la barra no. Sin el testigo, esta prueba no vale. */
  titulo('la barra no crece con la letra del libro, y es grande');
  const conLaLetra = async (n) => {
    await irA('formato');
    await p.evaluate(async (v) => {
      const s = document.getElementById('fsAhora');
      s.value = String(v);
      s.dispatchEvent(new Event('change', { bubbles:true }));
      await new Promise(z => setTimeout(z, 700));
    }, n);
    return p.evaluate(() => {
      const v = [...document.querySelectorAll('.rollo')]
        .find(r => getComputedStyle(r).display !== 'none');
      const b = v.querySelector('.pestanas [data-sec="libros"]');
      const svg = b && b.querySelector('svg.signo');
      /* El testigo: un botón del mismo panel, de los que sí crecen. Si algún
         día se le quita a él la escala, esta prueba se queda sin vara y hay
         que buscar otro testigo, no borrar la línea. */
      const testigo = v.querySelector('.rollo-cuerpo .btn, .btn');
      return { signo: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
               alto:  b ? Math.round(b.getBoundingClientRect().height) : 0,
               letraPestana: b ? getComputedStyle(b).fontSize : '?',
               testigo: testigo ? getComputedStyle(testigo).fontSize : '?',
               libro: getComputedStyle(document.documentElement)
                        .getPropertyValue('--fs-libro').trim() };
    });
  };
  const chico  = await conLaLetra(10);
  const grande = await conLaLetra(26);
  di('con el libro en 10', chico);
  di('con el libro en 26', grande);
  /* LAS DOS LÍNEAS DE VALIDEZ, y son dos porque son dos cosas distintas: que
     el mando movió el libro, y que el cromo de alrededor se enteró. */
  vale('(la prueba es válida) el libro cambió de letra',
       chico.libro !== grande.libro, chico.libro + ' → ' + grande.libro);
  vale('(la prueba es válida) y el resto del panel creció con él',
       chico.testigo !== grande.testigo && chico.testigo !== '?',
       chico.testigo + ' → ' + grande.testigo);
  vale('LA BARRA MIDE LO MISMO CON EL LIBRO EN 10 QUE EN 26',
       chico.signo === grande.signo && chico.alto === grande.alto &&
       chico.letraPestana === grande.letraPestana,
       'signo ' + chico.signo + '→' + grande.signo +
       ' · alto ' + chico.alto + '→' + grande.alto +
       ' · letra ' + chico.letraPestana + '→' + grande.letraPestana);
  /* Y QUE SEA GRANDE, que es la otra mitad del encargo. El número no es de
     gusto: 29 px era el techo que daba la barra vieja —el libro en 26, la
     escala en 1.44— y el tamaño fijo se puso ahí a propósito, para que
     congelarlo no le quitara nada al lector que subía la letra porque ve
     peor. Si algún día alguien baja el tamaño fijo por debajo de ese techo,
     esta línea es la que lo dice. */
  vale('  y el signo no baja del techo que daba la barra vieja',
       grande.signo >= 29, grande.signo + ' px');
  /* Se devuelve la letra a la de fábrica: los bloques de más abajo miden el
     relato contra el libro y parten de que nadie ha tocado el riel. */
  await conLaLetra(15);

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

  /* ---------------- los otros tres signos ----------------

     Pedido por el dueño del repo, en el mismo encargo y con la misma razón
     que el de compartir: un libro abierto para Libros, un papelito con la
     esquina doblada para Glosas, y para Encuentros «la mejor figura que
     creas». Con eso, la barra entera deja de tener una sola palabra.

     LO QUE SE VIGILA AQUÍ NO ES EL DIBUJO. Un dibujo se cambia y debe poder
     cambiarse sin que el banco se ponga rojo; atar la prueba a una curva
     concreta sería atarla a un gusto. Lo que se vigila es lo que hace que un
     dibujo sirva de rótulo y se rompe solo:

     · que no quede la palabra suelta a medio quitar,
     · que tenga NOMBRE, porque un dibujo sin nombre no dice nada a quien
       navega sin verlo, y estas tres pestañas son las tres secciones del
       programa,
     · que se pinte con la letra —currentColor—, que es lo que se volvía
       invisible en la pestaña encendida,
     · y que se vea, o sea que ocupe algo.

     Y una más, que es de familia: los cuatro signos van con la misma caja y
     el mismo grosor. Cinco pestañas en un renglón se leen como cinco cosas
     del mismo programa o como cinco pegatinas de cinco sitios, y lo que
     decide cuál de las dos es el grosor de la línea. */
  titulo('las otras tres pestañas también son signos');
  const tres = await p.evaluate(() => {
    const v = [...document.querySelectorAll('.rollo')]
      .find(r => getComputedStyle(r).display !== 'none');
    const mirar = sec => {
      const b = v.querySelector('.pestanas [data-sec="' + sec + '"]');
      const svg = b && b.querySelector('svg.signo');
      if (!svg) return { falta:true };
      const r = svg.getBoundingClientRect();
      const path = svg.querySelector('path');
      return { texto:b.textContent.trim(), nombre:b.getAttribute('aria-label'),
               titulo:b.getAttribute('title'),
               trazos:svg.querySelectorAll('path').length,
               ancho:Math.round(r.width), alto:Math.round(r.height),
               trazo:getComputedStyle(path).stroke,
               grueso:getComputedStyle(path).strokeWidth,
               relleno:getComputedStyle(path).fill,
               letra:getComputedStyle(b).color };
    };
    const compartir = (() => {
      const b = v.querySelector('.pestanas [data-sec="respaldo"]');
      const svg = b.querySelector('svg.compartir');
      const r = svg.getBoundingClientRect();
      return { ancho:Math.round(r.width), alto:Math.round(r.height),
               grueso:getComputedStyle(svg.querySelector('path')).strokeWidth };
    })();
    return { libros:mirar('libros'), glosas:mirar('glosas'),
             encuentros:mirar('encuentros'), compartir };
  });
  di('los tres signos', JSON.stringify(tres));
  for (const [sec, s] of [['Libros', tres.libros], ['Glosas', tres.glosas],
                          ['Encuentros', tres.encuentros]]){
    vale(sec + ': es un signo y no una palabra',
         !s.falta && s.texto === '', s.falta ? 'no hay svg.signo' : '«' + s.texto + '»');
    vale('  con nombre para quien no lo ve',
         !s.falta && !!s.nombre && s.nombre === s.titulo, s.nombre);
    vale('  dibujado y visible',
         !s.falta && s.trazos >= 1 && s.ancho > 8 && s.alto > 8,
         s.trazos + ' trazos · ' + s.ancho + 'x' + s.alto);
    /* De línea y no macizo: relleno, los cuatro se pelearían con el fondo
       dorado de la pestaña encendida en vez de dibujarse encima. */
    vale('  de línea, no macizo',
         !s.falta && s.relleno === 'none', s.relleno);
    vale('  y con el color de la letra',
         !s.falta && s.trazo === s.letra, s.trazo + ' contra ' + s.letra);
  }
  /* LA FAMILIA. Misma caja y mismo grosor que el de compartir, que es el que
     ya estaba. Se compara contra él y no contra un número escrito aquí: si
     un día se decide engordar los signos, se engordan los cuatro y esto
     sigue en verde; si se engorda uno solo, se cae, que es lo que se quiere. */
  vale('LOS CUATRO SON DE LA MISMA FAMILIA',
       [tres.libros, tres.glosas, tres.encuentros].every(s =>
         !s.falta && s.ancho === tres.compartir.ancho &&
         s.alto === tres.compartir.alto && s.grueso === tres.compartir.grueso),
       [tres.libros, tres.glosas, tres.encuentros]
         .map(s => s.ancho + 'x' + s.alto + ' a ' + s.grueso).join(' · ') +
       ' contra ' + tres.compartir.ancho + 'x' + tres.compartir.alto +
       ' a ' + tres.compartir.grueso);
  /* Y QUE NO SEAN EL MISMO DIBUJO. Cinco pestañas con el mismo signo es peor
     que cinco con la misma palabra: la palabra al menos se lee. */
  vale('  y los tres distintos entre sí',
       new Set([tres.libros.trazos + ':' + tres.libros.ancho,
                tres.glosas.trazos + ':' + tres.glosas.ancho,
                tres.encuentros.trazos + ':' + tres.encuentros.ancho]).size >= 2 ||
       new Set([JSON.stringify(tres.libros), JSON.stringify(tres.glosas),
                JSON.stringify(tres.encuentros)]).size === 3,
       'tres dibujos');

  /* ---------------- la sección ---------------- */
  titulo('Encuentros trae sus cinco, y la historia de Zaqueo');
  vale('se llega a Encuentros desde la barra', await irA('encuentros'));
  const dentro = await p.evaluate(() => {
    const c = document.getElementById('encuentros');
    const hojas = [...c.querySelectorAll('.enc-hoja')];
    const alto = h => Math.round(h.getBoundingClientRect().height);
    return { puesto:getComputedStyle(c).display !== 'none',
             pestanitas:[...c.querySelectorAll('.pestanitas button')]
                          .map(b => ({ enc:b.dataset.enc, rotulo:b.textContent.trim(),
                                       titulo:b.getAttribute('title'),
                                       aqui:b.classList.contains('aqui'),
                                       alto:Math.round(b.getBoundingClientRect().height) })),
             /* LA TIRA EN UN SOLO RENGLÓN, se corra o no: es lo que se pidió
                al entrar el quinto —«que sea infinito el número de tabs que
                podamos tener en el mismo renglón»—. Se cuentan los TOPES de
                las pestañas: si alguna se hubiera ido de renglón habría dos. */
             /* todos los src pedidos, para poder afirmar que el escondido no
                pidió el suyo */
             marcosPedidos:[...c.querySelectorAll('.enc-marco')].map(m => m.getAttribute('src')),
             renglonesDePestanitas:(() => {
               const bs = [...c.querySelectorAll('.pestanitas button')];
               return [...new Set(bs.map(b => Math.round(b.getBoundingClientRect().top)))].length;
             })(),
             tira:(() => {
               const b = c.querySelector('.pestanitas');
               const caja = c.querySelector('.enc-barra');
               return { sobra:b.scrollWidth - b.clientWidth,
                        hayDer:caja.classList.contains('hay-der'),
                        hayIzq:caja.classList.contains('hay-izq'),
                        /* la caja de fuera es la que avisa; la de dentro es la
                           que se corre. Si la sombra viviera en la que se
                           corre, se iría de viaje con las pestañas. */
                        sombraFuera:!b.classList.contains('hay-der') };
             })(),
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
  /* EL ORDEN SE PIDIÓ ENTERO Y POR ESO SE ESCRIBE ENTERO: primero Zaqueo,
     luego la samaritana, el agua, el centurión, y AL FINAL el de la espalda,
     que es el único que no es un encuentro sino el día en que ya no lo hay. Un
     orden pedido a mano no se puede comprobar «de alguna manera»: o es ése o
     no es. */
  vale('con una pestaña por encuentro, en el orden pedido',
       dentro.pestanitas.map(x => x.enc).join(',') ===
         'zaqueo,samaritana,agua,centurion',
       dentro.pestanitas.map(x => x.rotulo).join(' · '));
  /* EL ESCONDIDO NO EXISTE, y esto es lo que se pidió del de la espalda: que
     se quite de la vista sin borrarlo. Se comprueba por los tres sitios donde
     podría asomar, porque esconder a medias es el fallo natural: una pestaña
     que no está pero cuya hoja sigue armada, o un marco escondido que
     igualmente pide su relato, son peso muerto que nadie va a leer. */
  vale('EL ENCUENTRO ESCONDIDO NO ASOMA POR NINGÚN LADO',
       !dentro.pestanitas.some(x => x.enc === 'espalda') &&
       !dentro.hojas.some(h => h.enc === 'espalda') &&
       dentro.marcosPedidos.every(src => !/la-espalda/.test(src || '')),
       dentro.pestanitas.map(x => x.enc).join(' · '));
  /* EL RÓTULO SE ACORTA Y EL NOMBRE NO SE PIERDE: la pestaña lleva lo corto y
     el título del ratón lleva lo entero. Se mira la que se acorta de las que
     quedan. */
  vale('  los rótulos largos se acortan sin perder el nombre',
       dentro.pestanitas.find(x => x.enc === 'samaritana').rotulo === 'La samaritana' &&
       dentro.pestanitas.find(x => x.enc === 'samaritana').titulo ===
         'La mujer samaritana',
       JSON.stringify(dentro.pestanitas.find(x => x.enc === 'samaritana')));
  /* Y LA SAMARITANA VA EN MINÚSCULA, corregido a mano por el dueño del repo:
     no es un nombre propio, es de dónde era. Se comprueba el nombre entero,
     que es el que se lee. */
  vale('  y la samaritana va en minúscula',
       dentro.pestanitas.find(x => x.enc === 'samaritana').titulo ===
         'La mujer samaritana',
       dentro.pestanitas.find(x => x.enc === 'samaritana').titulo);
  vale('  y la primera encendida',
       dentro.pestanitas[0] && dentro.pestanitas[0].aqui === true &&
       dentro.pestanitas[1] && dentro.pestanitas[1].aqui === false);
  /* Blancos de dedo: son pestañas de segundo nivel pero se tocan igual. */
  vale('  con alto de dedo', dentro.pestanitas.every(x => x.alto >= 36),
       dentro.pestanitas.map(x => x.alto).join(' · '));
  vale('SOLO HAY UNA BARRA DE SECCIONES EN EL PANEL',
       dentro.barrasDeSeccion === 1, dentro.barrasDeSeccion);
  /* LAS CINCO EN UN SOLO RENGLÓN, Y LA TIRA SE CORRE. Lo pedido fue que quepan
     siempre, cuantas sean: una tira que se arrastra en vez de partirse en dos
     renglones, que le comerían el alto al relato. */
  vale('LAS PESTAÑAS VAN EN UN SOLO RENGLÓN',
       dentro.renglonesDePestanitas === 1, dentro.renglonesDePestanitas + ' renglones');
  /* La línea de validez: en un teléfono las cinco NO caben, y ahí es donde
     esto significa algo. Si un día cupieran —pantalla ancha, o menos
     encuentros—, la de abajo diría lo contrario y tendría razón. */
  di('la tira', JSON.stringify(dentro.tira));
  if (dentro.tira.sobra > 0){
    vale('  y cuando no caben, la tira se corre y lo avisa',
         dentro.tira.hayDer === true && dentro.tira.hayIzq === false,
         JSON.stringify(dentro.tira));
    vale('  con el aviso en la caja de fuera, que no se va de viaje',
         dentro.tira.sombraFuera === true);
  } else {
    di('  (caben todas: no hay nada que avisar)', dentro.tira.sobra);
    vale('  y si caben, no se avisa de nada',
         dentro.tira.hayDer === false && dentro.tira.hayIzq === false,
         JSON.stringify(dentro.tira));
  }
  vale('una hoja a la vista y las demás no',
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
                        .map(h => h.dataset.enc),
             /* Y LA PESTAÑA ENCENDIDA, DENTRO DE LA TIRA. Con la tira corrida,
                volver por la que se estaba leyendo enseñaba el principio y la
                encendida fuera de pantalla: el panel decía que estás en una
                historia y no se veía cuál. */
             vivaALaVista:(() => {
               const b = c.querySelector('.pestanitas');
               const v = b.querySelector('.aqui');
               if (!v) return null;
               const rb = b.getBoundingClientRect(), rv = v.getBoundingClientRect();
               return { rotulo:v.textContent.trim(),
                        dentro: rv.left >= rb.left - 1 && rv.right <= rb.right + 1,
                        corrida:Math.round(b.scrollLeft) };
             })() };
  });
  di('al volver', devuelta);
  vale('LAS PESTAÑAS SIGUEN AHÍ, TODAS Y EN SU ORDEN',
       devuelta.pestanitas.join(',') === 'zaqueo,samaritana,agua,centurion',
       devuelta.pestanitas.join(' · '));
  vale('  y sigue habiendo una hoja por encuentro',
       devuelta.hojas === devuelta.pestanitas.length, devuelta.hojas);
  vale('  y sigue habiendo una sola barra de secciones',
       devuelta.barrasDeSeccion === 1, devuelta.barrasDeSeccion);
  vale('  y se quedó donde se estaba leyendo',
       devuelta.aLaVista.join(',') === 'samaritana', devuelta.aLaVista.join(' · '));
  vale('  Y LA PESTAÑA ENCENDIDA SE VE, con la tira corrida o sin ella',
       !!devuelta.vivaALaVista && devuelta.vivaALaVista.dentro === true,
       JSON.stringify(devuelta.vivaALaVista));

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

  /* ---------------- llegar a lo que queda fuera ---------------- */
  titulo('la tira recortada se puede alcanzar, y avisa cuando cambia de ancho');
  /* DOS MANERAS DE QUEDARSE SIN CAMINO, las dos levantadas por la revisión de
     Codex y las dos medidas aquí:

     · LA RUEDA. Una rueda vertical sobre una caja que solo se desplaza en
       horizontal no hace nada en la mayoría de los navegadores, y girar la
       rueda encima es lo primero que hace quien ve una tira recortada. Se
       traduce a un desplazamiento de lado.
     · EL CAMBIO DE ANCHO. Las sombras se refrescaban solo al correr la tira o
       al abrir el panel, así que con Encuentros abierto y el teléfono girando,
       una tira que antes cabía empezaba a desbordar sin un solo scroll que lo
       contara: el aviso se quedaba apagado. Y al revés, una que dejaba de
       desbordar seguía avisando de algo que ya no hay. */
  await irA('encuentros');
  const tiraAntes = await p.evaluate(() => {
    const b = document.getElementById('encuentros').querySelector('.pestanitas');
    b.scrollLeft = 0;
    const caja = document.getElementById('encuentros').querySelector('.enc-barra');
    return { sobra:b.scrollWidth - b.clientWidth, scroll:Math.round(b.scrollLeft),
             /* SE LEE AQUÍ Y NO DESPUÉS DE LA RUEDA. Lo era, y con cuatro
                pestañas dejó de valer: lo que sobra cabe en un golpe de rueda,
                así que al llegar al final el aviso de la derecha se apaga —con
                razón— y la validez del giro cantaba fallo por un aviso que
                había hecho su trabajo. La foto del «antes» se toma antes. */
             hayDer:caja.classList.contains('hay-der') };
  });
  di('la tira antes de la rueda', JSON.stringify(tiraAntes));
  /* La línea de validez: sin nada que quede fuera, mover la rueda no tiene por
     qué hacer nada y lo de abajo no probaría nada. */
  vale('(la prueba es válida) hay tira fuera de la pantalla',
       tiraAntes.sobra > 0, tiraAntes.sobra + ' px fuera');
  const trasRueda = await p.evaluate(async () => {
    const b = document.getElementById('encuentros').querySelector('.pestanitas');
    const r = b.getBoundingClientRect();
    /* La rueda se manda como la manda un ratón: vertical, encima de la tira.
       Lo que se prueba es justo la traducción, así que un deltaX sería hacer
       trampa. */
    b.dispatchEvent(new WheelEvent('wheel', { bubbles:true, cancelable:true,
      deltaY:120, clientX:Math.round(r.left + 40), clientY:Math.round(r.top + 10) }));
    await new Promise(z => setTimeout(z, 300));
    const caja = document.getElementById('encuentros').querySelector('.enc-barra');
    return { scroll:Math.round(b.scrollLeft),
             hayIzq:caja.classList.contains('hay-izq') };
  });
  di('tras girar la rueda', JSON.stringify(trasRueda));
  vale('LA RUEDA VERTICAL CORRE LA TIRA DE LADO',
       trasRueda.scroll > tiraAntes.scroll, tiraAntes.scroll + ' → ' + trasRueda.scroll);
  vale('  y el aviso del filo se entera',
       trasRueda.hayIzq === true, trasRueda.hayIzq);

  /* Y AL GIRAR EL TELÉFONO CON EL PANEL ABIERTO. Sin cerrar nada: es justo el
     caso que se escapaba. */
  await p.setViewportSize({ width:915, height:412 });
  await p.waitForTimeout(800);
  const girado = await p.evaluate(() => {
    const c = document.getElementById('encuentros');
    const b = c.querySelector('.pestanitas'), caja = c.querySelector('.enc-barra');
    return { puesto:getComputedStyle(c).display !== 'none',
             sobra:b.scrollWidth - b.clientWidth,
             hayIzq:caja.classList.contains('hay-izq'),
             hayDer:caja.classList.contains('hay-der') };
  });
  di('con el teléfono girado', JSON.stringify(girado));
  vale('(la prueba es válida) el panel siguió abierto al girar',
       girado.puesto === true);
  vale('(la prueba es válida) y en vertical sí avisaba',
       tiraAntes.hayDer === true);
  /* Girado cabe todo, así que el aviso tiene que APAGARSE sin que nadie haya
     tocado la tira. Si siguiera encendido estaría señalando pestañas que ya
     se ven. */
  vale('AL CAMBIAR DE ANCHO, EL AVISO SE VUELVE A MEDIR',
       girado.sobra === 0 && girado.hayDer === false && girado.hayIzq === false,
       JSON.stringify(girado));
  await p.setViewportSize({ width:412, height:915 });
  await p.waitForTimeout(800);

  /* La sesión del teléfono se cierra AQUÍ y sin pedir la cuenta: abajo se abre
     otra y el resumen se pide una sola vez, al final. Cerrando con cerrar() se
     imprimirían dos cuentas y la primera parecería el total. Está contado en
     comun.js, donde vive fin(). */
  await cerrarParcial(sesion, 'el teléfono');

  /* ================================================================
     Y CON RATÓN HAY BARRA, que es la única manera de llegar a lo recortado.

     Un dedo arrastra la tira y un trackpad la empuja; un ratón de rueda no
     hace ninguna de las dos cosas —por eso la rueda se traduce, arriba— y
     arrastrar el contenido de una caja con overflow no es algo que hagan los
     navegadores de escritorio. La barra se esconde en el teléfono, donde es de
     superposición y el aviso lo dan las sombras, y se enseña con puntero fino.

     SE MIRA scrollbar-width Y NO SI OCUPA SITIO: si la barra roba alto o se
     pinta encima lo decide el sistema —en este Chromium son de superposición y
     miden cero— y eso no es cosa de este programa. Lo que sí es cosa suya es
     pedirla en escritorio y no pedirla en el teléfono.
     ================================================================ */
  titulo('con ratón la tira lleva barra; con dedo, no');
  const ancha = await abrir(ESCRITORIO);
  const pa = ancha.pagina;
  await pa.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById('pgCabeza').click(); await z(900);
    const t = document.querySelector('.rollo:not([style*="none"]) .pestanas [data-sec="encuentros"]');
    if (t) t.click();
    await z(1500);
  });
  const conRaton = await pa.evaluate(() => {
    const b = document.getElementById('encuentros').querySelector('.pestanitas');
    const cs = getComputedStyle(b);
    return { ancho:cs.scrollbarWidth, color:cs.scrollbarColor,
             puntero:matchMedia('(pointer:fine)').matches };
  });
  di('con ratón', JSON.stringify(conRaton));
  vale('(la prueba es válida) esta sesión es de puntero fino',
       conRaton.puntero === true);
  vale('CON RATÓN, LA TIRA PIDE SU BARRA', conRaton.ancho === 'thin', conRaton.ancho);
  /* Y del marrón de la casa: una barra azul del sistema encima de un panel de
     papel se ve como un trozo de otro programa. */
  vale('  y del color de la casa, no del sistema',
       /140, *116, *68/.test(conRaton.color || ''), conRaton.color);
  await cerrar(ancha);
})();
