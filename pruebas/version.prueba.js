/* EL SELLO DE VERSIÓN DEL PANEL DE RESPALDO.

   Contesta una pregunta muy concreta: cuando algo no funciona en un teléfono,
   ¿ese teléfono tiene la versión nueva o una guardada en caché? Por eso tiene
   que verse sin esfuerzo y por eso la hora es la de Dallas y no la del
   aparato: la respuesta se compara con «cuándo lo publiqué yo», que se piensa
   en hora de allá.

   LO QUE DE VERDAD VIGILA ESTA PRUEBA es que la hora no sea la del aparato.
   Es el fallo fácil —getHours() del navegador da una hora perfectamente
   creíble— y es invisible desde el sitio donde se escribe el código, porque
   ahí las dos coinciden. Así que se abre desde Tokio y desde Madrid, que
   están a catorce y a siete horas, y se exige la MISMA cadena que en Dallas.
   Si alguien cambia el formateador por el reloj local, estas dos no cuadran.

   Y una que no se puede sacar de la pantalla: que la fecha enseñada sea la
   del instante que el programa dice haber usado. Se recalcula aquí con otra
   implementación —el Intl de node— y se comparan. Dos maneras distintas de
   llegar al mismo sitio; si solo se mirase el formato con una expresión
   regular, una fecha equivocada con buena pinta pasaría sin más. */
const { abrir, cerrar, cerrarParcial, di, vale, titulo } = require('./comun');

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
/* la cuenta de la casa, hecha aparte del programa */
const enDallas = iso => {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone:'America/Chicago', year:'2-digit', month:'numeric', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(new Date(iso)).reduce((o, x) => (o[x.type] = x.value, o), {});
  return p.day + '-' + MESES[+p.month - 1] + '-' + p.year + ' ' + p.hour + ':' + p.minute;
};

/* Abre el panel de Respaldo como lo abre un dedo —titulillo, pestaña— y
   devuelve lo que se ve. Nada de leer variables por dentro: si la pestaña
   dejara de abrir el panel, el sello podría estar perfecto y no servir. */
const mirarSello = pagina => pagina.evaluate(async () => {
  document.getElementById('pgCabeza').click();
  await new Promise(z => setTimeout(z, 900));
  const t = [...document.querySelectorAll('.pestanas button')]
    .find(x => x.textContent.trim().toLowerCase() === 'respaldo');
  if (!t) return { falta:'la pestaña de Respaldo' };
  t.click();
  await new Promise(z => setTimeout(z, 700));
  const el = document.querySelector('#respaldo .sello-version');
  if (!el) return { falta:'el sello' };
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const chico = el.querySelector('small');
  return { texto: el.firstChild.textContent.trim(),
           pie: chico ? chico.textContent.trim() : null,
           grosor: +cs.fontWeight, tamano: parseFloat(cs.fontSize),
           seVe: r.width > 4 && r.height > 4 && cs.visibility !== 'hidden',
           alFinal: el === el.parentElement.lastElementChild,
           /* con qué se compara: lo que las notas normales del panel miden */
           notaNormal: parseFloat(getComputedStyle(
             document.querySelector('#respaldo .nota-respaldo')).fontSize),
           sello: window.GLOSS_SELLO };
});

(async () => {
  const sesion = await abrir({ timezoneId:'America/Chicago' });
  const casa = await mirarSello(sesion.pagina);

  titulo('el sello está y se ve');
  di('lo que dice', casa.texto || casa);
  vale('está en el panel de Respaldo', !!casa.texto, casa.falta || '');
  vale('es lo último del panel', casa.alFinal);
  vale('en negrita', casa.grosor >= 700, casa.grosor);
  vale('más grande que las notas', casa.tamano > casa.notaNormal,
       casa.tamano + ' px contra ' + casa.notaNormal);
  di('el pie', casa.pie);

  titulo('el formato pedido: VERSIÓN DD-MMM-YY HH:MM');
  vale('con la forma exacta', /^VERSIÓN \d{2}-[A-ZÁÉÍÓÚÑ]{3}-\d{2} \d{2}:\d{2}$/.test(casa.texto || ''),
       casa.texto);
  /* Las 24:00 existen en algunas combinaciones de Intl y no son una hora. */
  const hm = (casa.texto || '').slice(-5).split(':');
  vale('la hora es una hora', +hm[0] >= 0 && +hm[0] <= 23 && +hm[1] >= 0 && +hm[1] <= 59, hm.join(':'));
  vale('el mes es uno de los doce', MESES.includes((casa.texto || '').slice(11, 14)),
       (casa.texto || '').slice(11, 14));

  titulo('la fecha es la del instante que dice usar');
  di('el instante', casa.sello && casa.sello.instante + ' · fuente: ' + casa.sello.fuente);
  vale('cuadra con la cuenta hecha aparte',
       !!casa.sello && casa.texto === 'VERSIÓN ' + enDallas(casa.sello.instante),
       casa.sello ? 'VERSIÓN ' + enDallas(casa.sello.instante) : 'sin sello');
  vale('y la zona declarada es la de Dallas',
       !!casa.sello && casa.sello.zona === 'America/Chicago', casa.sello && casa.sello.zona);

  await cerrarParcial(sesion, 'Dallas');

  titulo('la hora es la de Dallas, no la del aparato');
  /* Catorce husos de diferencia por un lado y siete por el otro: si el sello
     saliera del reloj local, ninguna de las dos daría lo mismo que en casa.
     La última se guarda para el cierre, que es quien resume y decide el código
     de salida: abrir un navegador de más solo para poder cerrar sería pagar
     tres segundos por nada. */
  const zonas = ['Asia/Tokyo', 'Europe/Madrid'];
  let ultima = null;
  for (const zona of zonas){
    const s = await abrir({ timezoneId: zona });
    const fuera = await mirarSello(s.pagina);
    di('desde ' + zona, fuera.texto || fuera);
    vale('dice lo mismo que en Dallas · ' + zona, fuera.texto === casa.texto,
         fuera.texto + '  vs  ' + casa.texto);
    if (zona === zonas[zonas.length - 1]) ultima = s;
    else await cerrarParcial(s, zona);
  }
  await cerrar(ultima);
})();
