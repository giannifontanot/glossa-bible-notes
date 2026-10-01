/* EL SELLO DE VERSIÓN DEL PANEL DE RESPALDO.

   Contesta una pregunta concreta: cuando algo no funciona en un teléfono, ¿ese
   teléfono tiene la versión nueva o una guardada en caché? Por eso tiene que
   verse sin buscarlo.

   La fecha va escrita a mano en GLOSS_BUILD, así que lo que esta prueba puede
   vigilar de verdad es LA FORMA. Una cadena que se cambia a mano se estropea
   de una manera muy concreta —un mes mal escrito, un día donde va la hora, un
   dedo de más— y eso sí se caza aquí. Que la fecha sea la correcta no lo puede
   saber nadie más que quien la escribe. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

(async () => {
  const sesion = await abrir();

  /* Se llega al panel como se llega con un dedo —titulillo, pestaña—, no
     leyendo variables por dentro: si la pestaña dejara de abrir Respaldo, el
     sello podría estar perfecto y no servir de nada. */
  const s = await sesion.pagina.evaluate(async () => {
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const t = document.querySelector('.pestanas button[data-sec="respaldo"]');
    if (!t) return { falta:'la pestaña de Respaldo' };
    t.click();
    await new Promise(z => setTimeout(z, 700));
    const el = document.querySelector('#respaldo .sello-version');
    if (!el) return { falta:'el sello' };
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { texto: el.textContent.trim(),
             /* display:none deja el rectángulo en cero, así que entre las tres
                quedan cubiertas las tres maneras de esconderlo. */
             seVe: r.width > 4 && r.height > 4 &&
                   cs.visibility !== 'hidden' && cs.display !== 'none',
             medida: Math.round(r.width) + 'x' + Math.round(r.height),
             opacidad: +cs.opacity, grosor: +cs.fontWeight,
             tamano: parseFloat(cs.fontSize),
             /* «LO ÚLTIMO» YA NO ES EL ÚLTIMO HIJO, y la diferencia importa.
                El panel estrenó un pie con el botón de CERRAR, que va pegado
                al canto de abajo y es el último hijo de los cuatro paneles.
                Con lastElementChild esta línea pasó a preguntar «¿es el sello
                el botón de cerrar?», que no es lo que vino a vigilar: lo que
                se pidió es que el sello sea LO ÚLTIMO QUE SE LEE del panel,
                o sea el final de su contenido. El pie no es contenido del
                panel de Share, es el marco que llevan los cuatro. */
             alFinal: (() => {
               const hs = [...el.parentElement.children]
                            .filter(x => !x.classList.contains('pie-cerrar'));
               return el === hs[hs.length - 1];
             })(),
             tapado: (() => {
               /* Y QUE EL PIE NO SE LO COMA. Un pie pegado al canto de abajo
                  puede quedar ENCIMA del último renglón del contenido, y el
                  sello es justo ese último renglón: la comprobación de arriba
                  seguiría en verde con el sello debajo del botón. Se mira que
                  su mitad de arriba quede por encima del pie. */
               const pie = el.parentElement.querySelector(':scope > .pie-cerrar');
               if (!pie) return false;
               const a = el.getBoundingClientRect(), b = pie.getBoundingClientRect();
               return a.top + a.height / 2 > b.top;
             })(),
             /* EL PANEL SE QUEDÓ SIN NOTAS. Aquí se medía `.nota-respaldo` para
                poder decir que el sello era más grande que ellas, y ese
                elemento ya no existe: el dueño del repo pidió quitar todo el
                texto de explicación del panel —«solo deben estar los botones
                para respaldar, el respaldo, la versión y los copyrights»— y de
                paso subió la letra de lo que queda a la del libro.
                Así que el sello ya no puede distinguirse por ser más grande
                que un texto que no está. Lo que lo hace resaltar hoy es su
                peso y su recuadro, y eso es lo que se mide abajo; del tamaño
                sólo se exige que no sea MENOR que el resto del panel, que es
                lo que de verdad lo estropearía. */
             credTamano: (() => {
               const c = document.querySelector('#respaldo #cred');
               return c ? parseFloat(getComputedStyle(c).fontSize) : 0;
             })(),
             recuadro: (() => {
               const f = getComputedStyle(el);
               const alfa = /rgba?\(([^)]+)\)/.exec(f.backgroundColor);
               const t = alfa ? alfa[1].split(',') : [];
               return { fondo: t.length > 3 ? +t[3] : (alfa ? 1 : 0),
                        borde: parseFloat(f.borderTopWidth) || 0 };
             })(),
             /* Y QUE SIGA SIENDO LA DEL LIBRO, que es lo que se pidió del
                panel entero. Se compara contra la hoja viva y no contra un
                número: el lector puede tener la letra en 10 o en 22. */
             letraDeLaHoja: (() => {
               const b = document.getElementById('pgBody');
               const c = b && getComputedStyle(b);
               return c ? { tamano: parseFloat(c.fontSize),
                            familia: c.fontFamily.split(',')[0].trim() } : null;
             })(),
             familia: cs.fontFamily.split(',')[0].trim(),
             /* EL CRÉDITO DE LICENCIA, QUE AHORA VIVE EN ESTE PANEL. No es
                decoración: la Versión Biblia Libre es CC BY-SA y la atribución
                es obligatoria, así que esto es lo único de la carpeta que falla
                por una razón que no es de gusto ni de comodidad. Estuvo en el
                panel de la letra, se pidió sacarlo de ahí y pasó un rato sin
                enseñarse en ninguna parte; esta prueba es la que no deja que
                eso vuelva a pasar sin avisar.
                Se mide igual que el sello —rectángulo, visibilidad y display—
                porque «está en el DOM» no es «se lee». */
             cred: (() => {
               const c = document.querySelector('#respaldo #cred');
               if (!c) return { hay:false };
               const cs = getComputedStyle(c), r = c.getBoundingClientRect();
               const s = document.querySelector('#respaldo .sello-version');
               return { hay:true, texto:c.textContent.trim(),
                        seVe: r.width > 4 && r.height > 4 &&
                              cs.visibility !== 'hidden' && cs.display !== 'none',
                        medida: Math.round(r.width) + 'x' + Math.round(r.height),
                        /* y ANTES del sello, que es lo último que se lee */
                        antesDelSello: !!s && c.compareDocumentPosition(s) &
                                       Node.DOCUMENT_POSITION_FOLLOWING ? true : false };
             })() };
  });

  titulo('el sello está y se ve');
  di('lo que dice', s.texto || s);
  vale('está en el panel de Respaldo', !!s.texto, s.falta || '');
  /* QUE ESTÉ NO ES QUE SE VEA, y esta prueba se llama «se ve». Comprobando
     solo que el elemento tiene texto, un display:none o un alto de cero la
     dejarían en verde con el sello invisible. Lo levantó la revisión. */
  vale('se ve de verdad', s.seVe, s.medida + ' px');
  /* Y opaco: el sello anterior estaba al 60%, o sea puesto para no molestar,
     que para este dato es justo lo contrario de lo que hace falta. */
  vale('sin atenuar', s.opacidad >= 0.9, s.opacidad);
  vale('es lo último que se lee del panel', s.alFinal);
  vale('  y el pie de CERRAR no se lo come', s.tapado === false, s.tapado);
  vale('en negrita', s.grosor >= 700, s.grosor);
  /* SIN NOTAS QUE COMPARAR, lo que se exige es que no encoja por debajo del
     resto del panel y que conserve el recuadro con el que se encuentra de un
     vistazo. Ver el comentario de arriba, donde se cuenta por qué cambió. */
  vale('no más chico que el resto del panel', s.tamano >= s.credTamano,
       s.tamano + ' px contra ' + s.credTamano);
  vale('y con su recuadro, que es lo que lo hace encontrable',
       s.recuadro.fondo > .05 && s.recuadro.borde > 0, JSON.stringify(s.recuadro));
  /* LA LETRA DEL PANEL ES LA DEL LIBRO, pedido así: «sube el font del respaldo
     al mismo del libro, recuerda que el font y size del libro es el que usa
     toda la aplicación». Se compara con la hoja viva, no con un número: quien
     lea con la letra en 22 tiene que ver este panel en 22. */
  vale('(la prueba es válida) se pudo medir la letra de la hoja',
       !!s.letraDeLaHoja && s.letraDeLaHoja.tamano > 0,
       JSON.stringify(s.letraDeLaHoja));
  vale('EL SELLO SE LEE CON LA LETRA DEL LIBRO',
       !!s.letraDeLaHoja && s.tamano === s.letraDeLaHoja.tamano &&
       s.familia === s.letraDeLaHoja.familia,
       s.familia + ' ' + s.tamano + ' contra ' +
       (s.letraDeLaHoja && s.letraDeLaHoja.familia + ' ' + s.letraDeLaHoja.tamano));

  titulo('el crédito de licencia, que también vive aquí');
  di('lo que dice el crédito', s.cred);
  vale('ESTÁ EN EL PANEL DE SHARE', s.cred.hay === true);
  /* Que esté no es que se vea, y la licencia pide que se vea. */
  vale('  y se ve de verdad', s.cred.hay && s.cred.seVe === true, s.cred.medida);
  vale('  nombra la licencia y de dónde sale el texto',
       /CC BY/.test(s.cred.texto || '') && /eBible/.test(s.cred.texto || ''),
       s.cred.texto);
  /* El sello se viene a buscar con prisa y tiene que quedar el último; el
     crédito se lee una vez. Si algún día se cuelan en el orden contrario, el
     sello deja de ser lo último y eso ya lo vigila la línea de arriba —esta
     dice por qué—. */
  vale('  y va antes del sello, que es lo último que se lee',
       s.cred.hay && s.cred.antesDelSello === true, s.cred.antesDelSello);

  titulo('la forma pedida: VERSIÓN DD-MMM-YY HH:MM');
  const t = s.texto || '';
  vale('con la forma exacta', /^VERSIÓN \d{2}-[A-Z]{3}-\d{2} \d{2}:\d{2}$/.test(t), t);
  vale('el mes es uno de los doce', MESES.includes(t.slice(11, 14)), t.slice(11, 14));
  const dia = +t.slice(8, 10), hm = t.slice(-5).split(':');
  vale('el día es un día', dia >= 1 && dia <= 31, dia);
  vale('la hora es una hora', +hm[0] <= 23 && +hm[1] <= 59, hm.join(':'));

  /* ---------- LA CASILLA DE LOS TIEMPOS, vecina del sello ----------

     Pedido: «un checkbox en RESPALDO para que aparezca y desaparezca la caja
     de PERFORMANCE». La caja es #glosaCrono, el cronómetro temporal que deja
     los últimos tramos abajo a la izquierda para poder leerlos en el teléfono
     sin enchufarlo a una consola.

     SE MIRA EL DOCUMENTO Y NO LA VARIABLE. verCrono vive dentro de la IIFE y
     no se ve desde fuera, que es a propósito; y además lo que hay que vigilar
     no es la variable sino las dos cosas que el lector percibe: que la casilla
     se pueda tocar con un dedo y que la caja salga y se vaya.

     ESTE BLOQUE SE VA CON EL CRONÓMETRO. Cuando se quite la caja se quitan la
     casilla, verCrono, pintarCrono, la clave de los ajustes y esto. Son cinco
     piezas de lo mismo y están nombradas en el comentario de la fila. */
  titulo('la casilla que enseña y esconde la caja de los tiempos');
  const cr = await sesion.pagina.evaluate(() => {
    const c = document.getElementById('chkCrono');
    if (!c) return { falta:'la casilla' };
    const label = c.closest('label');
    const fila = c.closest('.ajuste');
    const rl = label.getBoundingClientRect();
    const rc = c.getBoundingClientRect();
    return {
      enElPanel: !!c.closest('#respaldo'),
      /* Nace apagada, y la caja con ella: una caja de diagnóstico encendida
         de fábrica sería un adorno encima del libro para todo el mundo. */
      marcada: c.checked,
      hayCaja: !!document.getElementById('glosaCrono'),
      rotulo: (label.textContent || '').trim(),
      /* EL RENGLÓN ENTERO ES ZONA DE TOQUE, que es la mitad del encargo: con
         el dedo, un cuadradito de 17px es una lotería. Se mide el LABEL, que
         es lo que recibe el toque, no el input. */
      altoLabel: Math.round(rl.height),
      altoCasilla: Math.round(rc.height),
      /* Y que el rótulo de la fila diga de qué familia es, como las demás. */
      lbl: (fila.querySelector('.lbl').textContent || '').trim()
    };
  });
  di('la casilla', JSON.stringify(cr));
  vale('está en el panel de Share', cr.enElPanel === true, cr.falta || cr.enElPanel);
  vale('  nace apagada, y sin caja', cr.marcada === false && cr.hayCaja === false,
       'marcada ' + cr.marcada + ' · caja ' + cr.hayCaja);
  vale('  el renglón entero se alcanza con el dedo (44px o más)',
       cr.altoLabel >= 44, cr.altoLabel + 'px de alto, casilla de ' + cr.altoCasilla);
  vale('  y su rótulo dice lo que hace', /tiempos/i.test(cr.rotulo || ''), cr.rotulo);

  /* SE TOCA EL RÓTULO Y NO EL CUADRADITO, y esa es la razón de medir el label
     arriba: si el texto no estuviera dentro del label, esto no encendería
     nada y la aserción del dedo sería una mentira cómoda. */
  const encendida = await sesion.pagina.evaluate(async () => {
    const c = document.getElementById('chkCrono');
    const texto = c.closest('label').querySelector('span');
    texto.click();
    await new Promise(z => setTimeout(z, 300));
    const caja = document.getElementById('glosaCrono');
    if (!caja) return { marcada: c.checked, hayCaja:false };
    const cs = getComputedStyle(caja), r = caja.getBoundingClientRect();
    return { marcada: c.checked, hayCaja:true,
             seVe: r.width > 4 && r.height > 4 &&
                   cs.visibility !== 'hidden' && cs.display !== 'none',
             medida: Math.round(r.width) + 'x' + Math.round(r.height),
             /* YA TRAE TRAMOS PUESTOS, y esto es la decisión de diseño que se
                vino a comprobar: el cronómetro sigue contando con la caja
                escondida, así que al encenderla sale con lo último medido en
                vez de en blanco esperando a que vuelvas a hacer algo. Si
                alguien hiciera que apagar la casilla apague la medida, esta
                línea se cae y dirá por qué. */
             texto: (caja.textContent || '').trim(),
             tramos: (caja.textContent || '').trim().split('\n').filter(Boolean).length,
             /* Y QUE NO SE COMA NINGÚN TOQUE. Está fija en una esquina con
                z-index 99999: sin pointer-events:none taparía lo que haya
                debajo, y lo que hay debajo es el libro. */
             pasaElDedo: cs.pointerEvents === 'none' };
  });
  di('con la casilla puesta', JSON.stringify(encendida));
  vale('TOCANDO EL RÓTULO SALE LA CAJA', encendida.marcada === true && encendida.hayCaja === true,
       'marcada ' + encendida.marcada + ' · caja ' + encendida.hayCaja);
  vale('  y se ve de verdad', encendida.hayCaja && encendida.seVe === true, encendida.medida);
  vale('  con lo ya medido dentro, no en blanco',
       encendida.tramos >= 1, encendida.tramos + ' tramos · ' + (encendida.texto || 'vacío'));
  vale('  y no se come los toques del libro que tiene debajo',
       encendida.pasaElDedo === true, encendida.pasaElDedo);

  const apagada = await sesion.pagina.evaluate(async () => {
    const c = document.getElementById('chkCrono');
    c.closest('label').querySelector('span').click();
    await new Promise(z => setTimeout(z, 300));
    return { marcada: c.checked, hayCaja: !!document.getElementById('glosaCrono') };
  });
  vale('  y volviendo a tocarlo se va del documento, no se esconde',
       apagada.marcada === false && apagada.hayCaja === false,
       'marcada ' + apagada.marcada + ' · caja ' + apagada.hayCaja);

  /* Y QUE AGUANTE LA RECARGA, que es lo que la hace servir de algo: medir en
     un teléfono pasa por recargar —los rieles se aplican recargando— y una
     casilla que se apaga en cada recarga habría que volver a encenderla justo
     cuando se está midiendo. */
  const tras = await sesion.pagina.evaluate(async () => {
    document.getElementById('chkCrono').closest('label').querySelector('span').click();
    await new Promise(z => setTimeout(z, 400));
    return !!document.getElementById('glosaCrono');
  });
  await sesion.pagina.reload();
  await sesion.pagina.waitForTimeout(2600);
  const vuelta = await sesion.pagina.evaluate(async () => {
    const antesDeAbrir = !!document.getElementById('glosaCrono');
    /* La casilla se vuelve a mirar abriendo el panel con el dedo, como la
       primera vez: la fila se arma al arrancar pero el panel está cerrado. */
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const t = document.querySelector('.pestanas button[data-sec="respaldo"]');
    if (t) t.click();
    await new Promise(z => setTimeout(z, 700));
    const c = document.getElementById('chkCrono');
    return { antesDeAbrir, marcada: c ? c.checked : null };
  });
  di('tras recargar', JSON.stringify({ seEncendio: tras, ...vuelta }));
  vale('SOBREVIVE A LA RECARGA: la caja vuelve sola',
       tras === true && vuelta.antesDeAbrir === true, 'antes de recargar ' + tras +
       ' · después ' + vuelta.antesDeAbrir);
  vale('  y la casilla vuelve marcada, no sólo la caja',
       vuelta.marcada === true, vuelta.marcada);
  /* Se deja apagada: lo guardado viaja a lo que corra después. */
  await sesion.pagina.evaluate(async () => {
    const c = document.getElementById('chkCrono');
    if (c && c.checked) c.closest('label').querySelector('span').click();
    await new Promise(z => setTimeout(z, 300));
  });

  await cerrar(sesion);
})();
