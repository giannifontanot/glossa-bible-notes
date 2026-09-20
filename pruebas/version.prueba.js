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
             notaNormal: parseFloat(getComputedStyle(
               document.querySelector('#respaldo .nota-respaldo')).fontSize) };
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
  vale('más grande que las notas', s.tamano > s.notaNormal,
       s.tamano + ' px contra ' + s.notaNormal);

  titulo('la forma pedida: VERSIÓN DD-MMM-YY HH:MM');
  const t = s.texto || '';
  vale('con la forma exacta', /^VERSIÓN \d{2}-[A-Z]{3}-\d{2} \d{2}:\d{2}$/.test(t), t);
  vale('el mes es uno de los doce', MESES.includes(t.slice(11, 14)), t.slice(11, 14));
  const dia = +t.slice(8, 10), hm = t.slice(-5).split(':');
  vale('el día es un día', dia >= 1 && dia <= 31, dia);
  vale('la hora es una hora', +hm[0] <= 23 && +hm[1] <= 59, hm.join(':'));

  await cerrar(sesion);
})();
