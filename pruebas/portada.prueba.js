/* ============================================================
   LA PORTADA.

   La tapa que se ve al abrir dejó de ser un letrero que se va solo: cuenta
   CINCO SEGUNDOS, y mientras cuenta se puede parar, pegarle piedras y ponerle
   una foto. Eso la vuelve una pantalla con estado, y una pantalla con estado
   se prueba.

   La cuenta ha ido cambiando —tres segundos, luego segundo y tres cuartos,
   ahora cinco— y por eso aquí no se escribe el número dos veces: las esperas
   se explican contra PORTADA_ESPERA en el comentario, y lo que se mide es lo
   que se ve.

   POR QUÉ NO USA abrir(). El andamio espera a que la portada SE VAYA antes de
   devolver la página —es lo que quiere el resto de la carpeta—. Aquí hay que
   llegar antes, así que se usa abrirEnPortada(), que abre y devuelve.

   Y POR QUÉ NO HAY QUE CORRER: en cuanto se toca el botón del medio, «foto» o
   «Piedras», el reloj se para y la portada se queda. Solo la primera medida
   —«sigue puesta»— compite contra la cuenta, y por eso mira a los 2000 ms de
   los 5000 que dura.
   ============================================================ */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { abrirEnPortada, cerrar, di, vale, titulo } = require('./comun');

const LLAVE = 'glossa:portada:v1';

/* UN TOQUE DE DEDO, TORCIDO Y SIN CLIC. Lo que manda un teléfono: el puntero
   baja, tiembla un poco —un dedo real no se posa quieto— y sube. El clic
   sintetizado NO se manda a propósito: es justo el que en un teléfono puede no
   llegar, y una prueba que lo mande está probando el ratón. */
async function tocarSinClic(pagina, x, y, pid = 21){
  await pagina.evaluate(async ([x, y, pid]) => {
    const pausa = ms => new Promise(r => setTimeout(r, ms));
    const o = (cx, cy) => ({ bubbles:true, cancelable:true, pointerId:pid,
                             pointerType:'touch', isPrimary:true, clientX:cx, clientY:cy });
    const t = document.elementFromPoint(x, y) || document.getElementById('portadaPiedras');
    t.dispatchEvent(new PointerEvent('pointerdown', o(x, y)));       await pausa(30);
    t.dispatchEvent(new PointerEvent('pointermove', o(x + 2, y - 1))); await pausa(25);
    t.dispatchEvent(new PointerEvent('pointerup',   o(x + 1, y + 1)));
  }, [x, y, pid]);
  await pagina.waitForTimeout(280);
}

(async () => {
  const sesion = await abrirEnPortada();
  const p = sesion.pagina;

  titulo('EL BOTÓN DEL MEDIO ES LA CUENTA ATRÁS');
  /* EL BOTÓN DICE CUÁNTO QUEDA. Decía «hold», que hay que entender antes de
     servir de algo; ahora cuenta 5, 4, 3, 2 y en el último segundo dice
     «pausa», encendido. Se muestrea mientras corre en vez de mirar una vez:
     lo que hay que probar es que BAJA, y una foto sola no lo dice.
     Se guarda además el reloj de la página en cada muestra, porque la única
     manera honesta de comprobar que la tapa dura cinco segundos es contra el
     reloj de la página y no contra el de la prueba: entre que el navegador
     abre el archivo y la prueba mira ya ha corrido medio segundo largo. */
  const muestras = [];
  for (let i = 0; i < 13; i++){
    muestras.push(await p.evaluate(() => {
      const b = document.getElementById('btnPortadaHold');
      const pt = document.getElementById('portada');
      return { rot: b ? b.textContent.trim() : null,
               on: b ? b.classList.contains('esperando') : null,
               t: Math.round(performance.now()),
               viva: !!pt && !pt.classList.contains('fuera') };
    }));
    if (!muestras[muestras.length - 1].viva) break;
    await p.waitForTimeout(400);
  }
  const vistos = muestras.filter(m => m.viva).map(m => m.rot);
  di('la cuenta', muestras.map(m => (m.viva ? '' : '(fuera) ') + m.rot +
                                    (m.on ? '*' : '')).join(' · '));
  vale('CUENTA 5, 4, 3, 2 Y LUEGO «pausa»',
       ['5','4','3','2','pausa'].every(x => vistos.includes(x)),
       [...new Set(vistos)].join(' '));
  /* Y NO SUBE. Sin esto, un rótulo que fuera y volviera —o que se repintara
     desde un reloj equivocado— pasaría la de arriba. */
  const numeros = muestras.filter(m => m.viva && /^\d$/.test(m.rot)).map(m => +m.rot);
  vale('  y va bajando, nunca sube',
       numeros.every((n, i) => i === 0 || n <= numeros[i-1]), numeros.join(' '));
  vale('  «pausa» va encendida y los números no',
       muestras.filter(m => m.viva && m.rot === 'pausa').every(m => m.on === true) &&
       muestras.filter(m => m.viva && /^\d$/.test(m.rot)).every(m => m.on === false),
       muestras.filter(m => m.viva).map(m => m.rot + (m.on ? '*' : '')).join(' '));
  /* CINCO SEGUNDOS DE VERDAD, medidos con el reloj de la página. */
  const fuera = muestras.find(m => !m.viva);
  vale('Y LA TAPA DURA CINCO SEGUNDOS',
       !!fuera && fuera.t >= 4800 && fuera.t <= 6600,
       fuera ? 'ya fuera a los ' + fuera.t + ' ms' : 'seguía puesta al acabar el muestreo');

  await p.reload();
  await p.waitForTimeout(2000);

  titulo('EL RELOJ Y LOS TRES BOTONES');
  const viva = await p.evaluate(() =>
    !document.getElementById('portada').classList.contains('fuera'));
  vale('a los 2000 ms la portada sigue puesta', viva === true, viva);

  /* Los tres van al centro de su tercio: 1/6, 1/2 y 5/6 del ancho. Lo pedido
     era «a la mitad horizontal del espacio disponible» a cada lado, y con tres
     columnas iguales eso cae en 17 %, 50 % y 83 %. El margen de 4 puntos es el
     ancho del propio botón, que no es un punto. */
  const bot = await p.evaluate(() => {
    const r = document.getElementById('portada').getBoundingClientRect();
    const c = id => { const e = document.getElementById(id);
                      const x = e.getBoundingClientRect();
                      return { t: e.textContent.trim(),
                               centro: Math.round(((x.left + x.width/2) - r.left) / r.width * 100),
                               alto: Math.round(x.height) }; };
    return { foto:c('btnPortadaFoto'), hold:c('btnPortadaHold'), piedras:c('btnPortadaPiedras') };
  });
  di('los tres botones', JSON.stringify(bot));
  vale('«foto» a la mitad de la izquierda', Math.abs(bot.foto.centro - 17) <= 4, bot.foto.centro + '%');
  vale('«hold» en el centro', Math.abs(bot.hold.centro - 50) <= 2, bot.hold.centro + '%');
  vale('«Piedras» a la mitad de la derecha', Math.abs(bot.piedras.centro - 83) <= 4, bot.piedras.centro + '%');
  /* El del medio ya no dice «hold»: dice lo que queda, o «pausa». Se pide la
     forma y no un valor: qué número toque depende de cuándo mire la prueba. */
  vale('y dicen lo suyo',
       bot.foto.t === 'foto' && /^(\d|pausa)$/.test(bot.hold.t) &&
       bot.piedras.t === 'Piedras',
       [bot.foto.t, bot.hold.t, bot.piedras.t].join(' | '));
  /* 48 px es el suelo de esta aplicación: por encima de los 44 de la WCAG 2.5.5
     y de los 44 de Apple, al nivel de Material 3. */
  vale('y se pueden tocar con el dedo',
       Math.min(bot.foto.alto, bot.hold.alto, bot.piedras.alto) >= 48,
       [bot.foto.alto, bot.hold.alto, bot.piedras.alto].join(' / '));

  titulo('EL BOTÓN DEL MEDIO PARA LA CUENTA');
  await p.click('#btnPortadaHold');
  /* 4500 es casi la cuenta entera OTRA VEZ, y se pulsa pasados ya 2000 de los
     5000: si el reloj siguiera vivo, aquí ya no habría portada ni de lejos.
     Antes eran 3400 sobre una cuenta de 3000, que dejaba 400 ms de margen; con
     la cuenta en 5000 ese número habría pasado igual con el reloj corriendo. */
  await p.waitForTimeout(4500);
  const tras = await p.evaluate(() => ({
    puesta: !document.getElementById('portada').classList.contains('fuera'),
    rotulo: document.getElementById('btnPortadaHold').textContent.trim() }));
  di('tras hold', JSON.stringify(tras));
  vale('PARAR DEJA LA PORTADA ABIERTA', tras.puesta === true, tras);
  vale('  y el botón pasa a «continue»', tras.rotulo === 'continue', tras.rotulo);

  titulo('LA FOTO');
  /* La imagen se dibuja aquí y se escribe en un archivo de verdad: el camino
     que se prueba es el del archivador del navegador, con su FileReader y su
     lienzo, y ese camino necesita un archivo. Lo único que se sustituye en
     esta carpeta son piezas del navegador, y aquí no se sustituye ninguna. */
  const png = await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 400;
    const g = c.getContext('2d');
    g.fillStyle = '#3a6ea5'; g.fillRect(0, 0, 600, 400);
    g.fillStyle = '#e8d5a3'; g.beginPath(); g.arc(300, 200, 120, 0, 7); g.fill();
    return c.toDataURL('image/png');
  });
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'glossa-portada-'));
  const archivo = path.join(carpeta, 'foto.png');
  fs.writeFileSync(archivo, Buffer.from(png.split(',')[1], 'base64'));
  await p.setInputFiles('#portadaArchivo', archivo);
  await p.waitForTimeout(900);

  const f1 = await p.evaluate(k => {
    const el = document.querySelector('.pt-foto');
    const m = document.getElementById('portadaMandoFoto');
    const est = el && getComputedStyle(el);
    return { hay: !!el,
             polaroid: el ? el.classList.contains('polaroid') : null,
             sombra: est && est.boxShadow,
             mando: (m && !m.hidden) ? [...m.querySelectorAll('.pt-mini')].map(x => x.textContent.trim()) : null,
             guardada: !!(JSON.parse(localStorage.getItem(k) || '{}').foto) };
  }, LLAVE);
  di('la foto recién puesta', JSON.stringify(f1.mando));
  vale('LA FOTO APARECE', f1.hay === true, f1.hay);
  vale('  cuadrada, no polaroid', f1.polaroid === false, f1.polaroid);
  /* La misma sombra que lleva una piedra con «sombra» marcada. */
  vale('  con la sombra de las piedras', /5px 5px 10px/.test(f1.sombra || ''), f1.sombra);
  vale('  y ya en modo edición, con sus mandos', Array.isArray(f1.mando) && f1.mando.length >= 4, f1.mando);
  vale('  el botón dice «cambiar a Polaroid»', (f1.mando || [])[0] === 'cambiar a Polaroid', (f1.mando || [])[0]);
  vale('  y queda guardada', f1.guardada === true, f1.guardada);

  await p.click('[data-pt-estilo]'); await p.waitForTimeout(300);
  const f2 = await p.evaluate(() => ({
    polaroid: document.querySelector('.pt-foto').classList.contains('polaroid'),
    fondo: getComputedStyle(document.querySelector('.pt-foto')).backgroundColor,
    rotulo: document.querySelector('[data-pt-estilo]').textContent.trim() }));
  di('en polaroid', JSON.stringify(f2));
  vale('CAMBIA A POLAROID', f2.polaroid === true, f2.polaroid);
  vale('  y el botón dice «cambiar a normal»', f2.rotulo === 'cambiar a normal', f2.rotulo);

  await p.click('[data-pt-estilo]'); await p.waitForTimeout(300);
  const f3 = await p.evaluate(() => ({
    polaroid: document.querySelector('.pt-foto').classList.contains('polaroid'),
    rotulo: document.querySelector('[data-pt-estilo]').textContent.trim() }));
  vale('Y VUELVE A NORMAL', f3.polaroid === false, f3.polaroid);
  vale('  con el botón otra vez en «cambiar a Polaroid»', f3.rotulo === 'cambiar a Polaroid', f3.rotulo);

  /* «Poquito a poquito»: tres grados por toque. Se comprueba lo guardado Y lo
     pintado, que no es lo mismo —el número puede subir sin que la foto gire—. */
  const g0 = await p.evaluate(k => JSON.parse(localStorage.getItem(k)).foto.giro, LLAVE);
  await p.click('[data-pt-giro="3"]'); await p.waitForTimeout(200);
  await p.click('[data-pt-giro="3"]'); await p.waitForTimeout(200);
  const g1 = await p.evaluate(k => ({
    giro: JSON.parse(localStorage.getItem(k)).foto.giro,
    css: document.querySelector('.pt-marco').style.transform }), LLAVE);
  await p.click('[data-pt-giro="-3"]'); await p.waitForTimeout(200);
  const g2 = await p.evaluate(k => JSON.parse(localStorage.getItem(k)).foto.giro, LLAVE);
  di('el giro', JSON.stringify({ g0, g1, g2 }));
  vale('GIRA A LA DERECHA DE TRES EN TRES', g1.giro === g0 + 6, g0 + ' → ' + g1.giro);
  vale('  y a la izquierda igual', g2 === g1.giro - 3, g1.giro + ' → ' + g2);
  vale('  y se ve girada, no solo apuntada', /rotate\(6deg\)/.test(g1.css || ''), g1.css);

  titulo('«PIEDRAS» ES «NUEVA»: DEJA UNA Y ABRE EL MANDO DE SIEMPRE');
  /* Aquí hubo un panel escrito solo para estas piedras, y después un «modo de
     decorar» que encendía la portada entera para tocar donde dejarlas. Las dos
     cosas eran inventos: la aplicación ya sabe poner piedras, y lo hace con un
     botón que deja una y abre su mando. Ahora «Piedras» hace exactamente eso,
     como «Nueva» en la hoja, con EL MISMO mando. Lo que se comprueba es
     justamente que es el mismo. */
  await p.click('[data-pt-listo]'); await p.waitForTimeout(300);
  await p.click('#btnPortadaPiedras'); await p.waitForTimeout(500);
  const nacida = await p.evaluate(k => {
    const m = document.getElementById('piedraMando');
    return { n: document.querySelectorAll('.pt-piedra').length,
             guardadas: (JSON.parse(localStorage.getItem(k) || '{}').piedras || []).length,
             dice: document.getElementById('btnPortadaPiedras').textContent.trim(),
             /* EL MANDO SE MUDA A LA PORTADA. Es el mismo nodo: la tapa es fija
                con z-index 200 y el mando vive en la escena, muy por debajo,
                así que quedarse en su sitio era quedarse tapado. */
             padre: m.parentNode.id,
             visible: m.classList.contains('visible'),
             titulo: (m.querySelector('.sp-tit') || {}).textContent,
             formas: m.querySelectorAll('[data-piedra-forma]').length,
             tintas: m.querySelectorAll('[data-piedra-color]').length,
             contador: (m.querySelector('.pm-tam') || {}).textContent,
             salidas: [...m.querySelectorAll('.pm-btn2')].map(x => x.textContent.trim()),
             cerco: !!document.querySelector('.pt-piedra.editando') };
  }, LLAVE);
  di('la piedra nueva', JSON.stringify(nacida));
  vale('«PIEDRAS» DEJA UNA Y LA ABRE EN EDICIÓN',
       nacida.n === 1 && nacida.guardadas === 1 &&
       nacida.visible === true && nacida.cerco === true, nacida);
  vale('  con el mando de la hoja: catorce figuras, doce colores y su contador',
       nacida.formas === 14 && nacida.tintas === 12 && /\/8$/.test(nacida.contador || ''),
       [nacida.formas, nacida.tintas, nacida.contador].join(' · '));
  /* Y NACE EN EL 8 DE 8, el más grande. En la hoja nace en el 5, y son dos
     números distintos a propósito: en la portada la piedra es adorno y se pone
     para verla, y en la hoja va encima de un renglón que hay que seguir
     leyendo. Los pidió así el dueño del repo. El escalón va escrito aquí y no
     leído de la aplicación, como el asomo de la cinta. */
  vale('  Y NACE EN EL 8 DE 8, que en la portada la piedra es para verla',
       nacida.contador === '8/8', nacida.contador);
  vale('  mudado encima de la tapa', nacida.padre === 'portada', nacida.padre);
  /* La única diferencia con la hoja, y por una razón: la portada no tiene lista
     de piedras de donde borrar, así que la salida de borrar vive en el mando. */
  vale('  y con «Quitar», que en la hoja no hace falta',
       ['Quitar','Cancelar','OK'].every(x => nacida.salidas.includes(x)), nacida.salidas);
  vale('  y el botón no cambia de nombre: no hay modo que apagar',
       nacida.dice === 'Piedras', nacida.dice);

  /* EL PIE SIGUE SIENDO DEL PIE. La capa de las piedras cubre la tapa entera;
     cuando recibía toques —el modo de decorar— se comía los tres botones,
     incluido el único con el que se salía. Ahora no los recibe nunca. */
  const pie = await p.evaluate(() => {
    const quien = id => { const e = document.getElementById(id);
      const r = e.getBoundingClientRect();
      const t = document.elementFromPoint(Math.round(r.left + r.width/2),
                                          Math.round(r.top + r.height/2));
      return t ? (t.id || String(t.className)) : 'nada'; };
    return { foto: quien('btnPortadaFoto'), hold: quien('btnPortadaHold'),
             piedras: quien('btnPortadaPiedras') };
  });
  di('el pie con una piedra en edición', JSON.stringify(pie));
  vale('LOS TRES BOTONES DEL PIE RECIBEN EL TOQUE',
       pie.foto === 'btnPortadaFoto' && pie.hold === 'btnPortadaHold' &&
       pie.piedras === 'btnPortadaPiedras', pie);

  const cambia = await p.evaluate(async k => {
    const pausa = ms => new Promise(r => setTimeout(r, ms));
    const m = document.getElementById('piedraMando');
    const g = () => (JSON.parse(localStorage.getItem(k) || '{}').piedras || [])[0] || {};
    const antes = { forma:g().forma, color:g().color, tam:g().tam };
    m.querySelector('[data-piedra-forma="paloma"]').click(); await pausa(300);
    m.querySelector('[data-piedra-color="carmin"]').click(); await pausa(300);
    /* SE ENCOGE, NO SE AGRANDA, y no es un capricho: desde que la piedra de la
       portada nace en el escalón de arriba, «más» no tiene adónde ir y esta
       línea pedía un cambio que no puede pasar. Para comprobar que el mando
       mueve el tamaño da igual hacia dónde; lo que no da igual es pedirlo
       contra un tope. */
    m.querySelector('[data-piedra-acc="menos"]').click(); await pausa(300);
    return { antes, medio: { forma:g().forma, color:g().color, tam:g().tam } };
  }, LLAVE);
  di('lo que hace el mando', JSON.stringify(cambia));
  vale('EL MANDO LE CAMBIA FIGURA, COLOR Y TAMAÑO A ESA PIEDRA',
       cambia.medio.forma === 'paloma' && cambia.medio.color === 'carmin' &&
       cambia.medio.tam === cambia.antes.tam - 1, cambia.medio);

  /* Se acepta y se deja una segunda: no puede caer encima de la primera. */
  await p.click('#piedraMando [data-piedra-acc="ok"]'); await p.waitForTimeout(350);
  await p.click('#btnPortadaPiedras'); await p.waitForTimeout(500);
  await p.click('#piedraMando [data-piedra-acc="ok"]'); await p.waitForTimeout(350);

  const pd = await p.evaluate(k => {
    const g = JSON.parse(localStorage.getItem(k) || '{}').piedras || [];
    return { puestas: document.querySelectorAll('.pt-piedra').length,
             guardadas: g.length,
             encima: g.length === 2 && Math.abs(g[0].x - g[1].x) < .001 &&
                     Math.abs(g[0].y - g[1].y) < .001,
             forma: (g[0] || {}).forma, color: (g[0] || {}).color,
             /* El tamaño es un PELDAÑO, como en la hoja, no un número de
                píxeles suelto: es lo que deja que el mando sea el mismo. */
             enPeldanos: g.every(x => Number.isInteger(x.tam) && x.tam >= 0 && x.tam < 8),
             /* En fracciones, no en píxeles: la pantalla gira y el píxel no. */
             enFracciones: g.every(x => x.x >= 0 && x.x <= 1 && x.y >= 0 && x.y <= 1) };
  }, LLAVE);
  di('las piedras', JSON.stringify(pd));
  vale('LA SEGUNDA NO CAE ENCIMA DE LA PRIMERA',
       pd.puestas === 2 && pd.guardadas === 2 && pd.encima === false, pd);
  vale('  con lo que se le dejó puesto en el mando',
       pd.forma === 'paloma' && pd.color === 'carmin', [pd.forma, pd.color].join(' / '));
  vale('  el tamaño en peldaños', pd.enPeldanos === true, pd.enPeldanos);
  vale('  y el sitio en fracciones de la portada', pd.enFracciones === true, pd.enFracciones);

  /* Y EL TRATO DE LAS PIEDRAS DE LA HOJA: una piedra quieta no responde al
     toque —el doble toque la despierta—, y ya despierta el toque le cambia la
     figura. */
  const dondeEsta = await p.evaluate(() => {
    const b = document.querySelector('.pt-piedra');
    const r = b.getBoundingClientRect();
    return { id: b.dataset.ptPiedra,
             x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
  });
  const antesQuieta = await p.evaluate(k =>
    (JSON.parse(localStorage.getItem(k)||'{}').piedras||[])[0].forma, LLAVE);
  await tocarSinClic(p, dondeEsta.x, dondeEsta.y, 22);
  const quieta = await p.evaluate(k => ({
    n: document.querySelectorAll('.pt-piedra').length,
    forma: (JSON.parse(localStorage.getItem(k)||'{}').piedras||[])[0].forma }), LLAVE);
  di('la piedra quieta', JSON.stringify(quieta));
  vale('QUIETA, UN TOQUE NO LA CAMBIA NI LA QUITA',
       quieta.n === 2 && quieta.forma === antesQuieta, quieta);

  await p.evaluate(d => {
    const b = document.querySelector('[data-pt-piedra="' + d.id + '"]');
    b.dispatchEvent(new MouseEvent('dblclick', { bubbles:true, cancelable:true,
      detail:2, clientX:d.x, clientY:d.y }));
  }, dondeEsta);
  await p.waitForTimeout(450);
  const edita = await p.evaluate(() => ({
    cerco: !!document.querySelector('.pt-piedra.editando'),
    visible: document.getElementById('piedraMando').classList.contains('visible') }));
  di('en edición', JSON.stringify(edita));
  vale('EL DOBLE TOQUE ABRE SU EDICIÓN', edita.cerco === true && edita.visible === true, edita);

  await tocarSinClic(p, dondeEsta.x, dondeEsta.y, 23);
  const trasTocarla = await p.evaluate(k => ({
    forma: (JSON.parse(localStorage.getItem(k)||'{}').piedras||[])[0].forma,
    /* Y QUE EL TOQUE NO LE CIERRE LA EDICIÓN: el guardián de «un toque fuera
       cierra» no nombraba a las piedras de la portada, así que tocar la que se
       está editando contaba como tocar FUERA. */
    cerco: !!document.querySelector('.pt-piedra.editando'),
    visible: document.getElementById('piedraMando').classList.contains('visible') }), LLAVE);
  di('tras tocarla en edición', JSON.stringify(trasTocarla));
  vale('  y ya en edición, el toque le cambia la figura', trasTocarla.forma !== antesQuieta,
       antesQuieta + ' → ' + trasTocarla.forma);
  vale('  sin cerrarle la edición', trasTocarla.cerco === true && trasTocarla.visible === true,
       trasTocarla);

  /* Quitar vive en el mando y no en un toque suelto. */
  await p.click('#piedraMando [data-piedra-acc="quitar"]');
  await p.waitForTimeout(400);
  const menos = await p.evaluate(() => ({
    n: document.querySelectorAll('.pt-piedra').length,
    mandoFuera: !document.getElementById('piedraMando').classList.contains('visible'),
    /* Y el mando vuelve a la escena, que es su casa: dejarlo dentro de la tapa
       lo dejaría inalcanzable en cuanto la tapa se fuera. */
    devuelto: document.getElementById('piedraMando').parentNode.id !== 'portada' }));
  di('tras quitarla', JSON.stringify(menos));
  vale('  y «Quitar» del mando la quita', menos.n === 1, menos.n);
  vale('  cerrando el mando y devolviéndolo a la escena',
       menos.mandoFuera === true && menos.devuelto === true, menos);

  titulo('CONTINUE ABRE LA BIBLIA');
  await p.click('#btnPortadaHold');
  /* SE ESPERA A QUE PASE, NO UN RATO FIJO. Estuvo en 2600 ms y aguantó
     mientras la cuenta duraba 3000: se paraba hacia los 2000, así que al
     seguir quedaba un segundo largo. Con la cuenta en 5000 lo que queda al
     reanudar son unos tres segundos y los 2600 se quedaron cortos: la prueba
     miraba antes de tiempo y decía que la tapa no se iba. Un número fijo aquí
     es un número que hay que recordar cambiar cada vez que se toca el reloj,
     y nadie lo recuerda. Se espera a la condición, con un tope generoso: si de
     verdad no se destapa, falla igual, solo que siete segundos después. */
  const fin1 = await (async () => {
    for (let i = 0; i < 35; i++){
      const ya = await p.evaluate(() => {
        const x = document.getElementById('portada');
        return !x || x.classList.contains('fuera');
      });
      if (ya) return true;
      await p.waitForTimeout(200);
    }
    return false;
  })();
  vale('CONTINUE TERMINA LA CUENTA Y DESTAPA', fin1 === true, fin1);

  titulo('Y AL VOLVER, EL ADORNO SIGUE');
  await p.reload();
  await p.waitForTimeout(700);
  const vuelta = await p.evaluate(() => ({
    foto: !!document.querySelector('.pt-foto'),
    piedras: document.querySelectorAll('.pt-piedra').length }));
  di('tras recargar', JSON.stringify(vuelta));
  vale('la foto vuelve', vuelta.foto === true, vuelta.foto);
  /* Quedó una: se pusieron dos y «Quitar» se llevó la primera. */
  vale('y la piedra también', vuelta.piedras === 1, vuelta.piedras);

  titulo('UN ADORNO ROTO NO SE LLEVA AL BUENO');
  /* EL FALLO QUE ESTO VIGILA. Las dos mitades —piedras y foto— se leían bajo
     el mismo try. Un null colado en la lista de piedras reventaba en p.forma,
     el catch se comía el cargar entero, y con las piedras desaparecía también
     la foto, que estaba intacta. Y como el programa seguía andando, el
     siguiente guardado escribía la portada vacía encima: el adorno bueno se
     perdía de verdad, no solo por esa sesión.
     Se siembra un almacén con basura de la que sale de un guardado a medias
     —un null, un número, una piedra sin nada— junto a una foto buena. */
  await p.evaluate(k => localStorage.setItem(k, JSON.stringify({
    piedras: [ null, { forma:'piedra', color:'carmin', tam:46, x:.3, y:.3 },
               7, 'ni esto', {}, { forma:'paloma', color:'carmin', tam:60, x:.7, y:.6 } ],
    /* un gif de un píxel: lo que importa es que pase el filtro de data:image/ */
    foto: { src:'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
            estilo:'polaroid', giro:9 }
  })), LLAVE);
  await p.reload();
  await p.waitForTimeout(700);
  const roto = await p.evaluate(() => ({
    foto: !!document.querySelector('.pt-foto'),
    polaroid: !!document.querySelector('.pt-foto.polaroid'),
    piedras: document.querySelectorAll('.pt-piedra').length,
    giro: (document.querySelector('.pt-marco') || {}).style
            ? document.querySelector('.pt-marco').style.transform : '' }));
  di('con el almacén sucio', JSON.stringify(roto));
  vale('LA FOTO SOBREVIVE A UNAS PIEDRAS ROTAS', roto.foto === true, roto);
  vale('  con su estilo y su giro', roto.polaroid === true && /rotate\(9deg\)/.test(roto.giro || ''), roto);
  /* De las seis entradas solo dos son piedras; las otras cuatro se criban. */
  vale('  y se quedan las piedras que sí valen', roto.piedras === 2, roto.piedras);

  titulo('LO QUE YA ESTABA GUARDADO NO PIERDE SU SOMBRA');
  /* Hasta esta versión la sombra la ponía el CSS a TODAS las piedras de la
     portada y no se guardaba en ningún sitio. Leyendo la clave que falta como
     «no» —que es lo natural— abrir la versión nueva se la quitaba a cada
     piedra ya puesta, y el primer guardado lo dejaba escrito para siempre.
     Solo un «false» a conciencia la apaga. */
  await p.evaluate(k => localStorage.setItem(k, JSON.stringify({ piedras:[
    { forma:'piedra', color:'sepia', tam:46, x:.3, y:.3 },
    { forma:'ancla', color:'carmin', tam:60, x:.7, y:.6, sombra:false } ], foto:null })), LLAVE);
  await p.reload();
  await p.waitForTimeout(700);
  const sombras = await p.evaluate(() =>
    [...document.querySelectorAll('.pt-piedra')].map(x => x.classList.contains('con-sombra')));
  di('las sombras al abrir un almacén viejo', JSON.stringify(sombras));
  vale('LA QUE NO TRAÍA SOMBRA ESCRITA LA CONSERVA', sombras[0] === true, sombras);
  vale('  y un «false» a conciencia sí la apaga', sombras[1] === false, sombras);

  titulo('UN ARRASTRE CANCELADO NO DEJA LA PIEDRA MOVIDA');
  /* El arrastre mueve el nodo a mano en cada cuadro —hay que hacerlo así o se
     pierde la captura del puntero—, así que al cancelar la pantalla enseñaba
     el sitio nuevo y lo guardado seguía con el viejo: la piedra daba un salto
     de vuelta en el siguiente repintado o al recargar, sin que nadie hubiera
     tocado nada. */
  const cancelado = await p.evaluate(async k => {
    const pausa = ms => new Promise(r => setTimeout(r, ms));
    document.getElementById('btnPortadaPiedras').click(); await pausa(400);
    const b = document.querySelector('.pt-piedra');
    const r = b.getBoundingClientRect();
    const cx = Math.round(r.left + r.width/2), cy = Math.round(r.top + r.height/2);
    b.dispatchEvent(new MouseEvent('dblclick', { bubbles:true, cancelable:true,
      detail:2, clientX:cx, clientY:cy }));
    await pausa(450);
    const nodo = document.querySelector('.pt-piedra.editando');
    if (!nodo) return { sinEdicion:true };
    const o = (x, y) => ({ bubbles:true, cancelable:true, pointerId:31, pointerType:'touch',
                           isPrimary:true, clientX:x, clientY:y });
    nodo.dispatchEvent(new PointerEvent('pointerdown', o(cx, cy))); await pausa(30);
    /* torcido, como un dedo */
    nodo.dispatchEvent(new PointerEvent('pointermove', o(cx + 68, cy + 122))); await pausa(30);
    nodo.dispatchEvent(new PointerEvent('pointermove', o(cx + 141, cy + 228))); await pausa(30);
    const durante = document.querySelector('.pt-piedra.editando').style.left;
    nodo.dispatchEvent(new PointerEvent('pointercancel', o(cx + 141, cy + 228)));
    await pausa(350);
    return { durante, pintado: document.querySelector('[data-pt-piedra]').style.left,
             guardado: (JSON.parse(localStorage.getItem(k) || '{}').piedras || [])[0].x };
  }, LLAVE);
  di('el arrastre cancelado', JSON.stringify(cancelado));
  vale('LO PINTADO VUELVE A LO GUARDADO',
       !cancelado.sinEdicion &&
       Math.abs(parseFloat(cancelado.pintado) - cancelado.guardado * 100) < .01,
       cancelado.pintado + ' contra ' + (cancelado.guardado * 100).toFixed(3) + '%');
  vale('  y no se queda donde lo llevó el dedo',
       cancelado.pintado !== cancelado.durante,
       'durante ' + cancelado.durante + ' · tras ' + cancelado.pintado);

  titulo('EL FOCO SOBREVIVE AL REPINTADO');
  /* Las dos ramas del teclado rehacen la capa entera con innerHTML, así que el
     botón que tenía el foco deja de existir y el foco se cae al documento:
     quien navega con teclado llegaba a la piedra, la cambiaba UNA vez y se
     quedaba sin dónde estar. Intro sobre un <button> manda un clic con
     detail 0, que es como se distingue del dedo. */
  const foco = await p.evaluate(async () => {
    const pausa = ms => new Promise(r => setTimeout(r, ms));
    const b = document.querySelector('[data-pt-piedra]');
    const id = b.dataset.ptPiedra;
    b.focus();
    const quien = () => { const a = document.activeElement;
      return (a && a.dataset && a.dataset.ptPiedra) || (a || {}).tagName; };
    b.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, detail:0 }));
    await pausa(350);
    const tras = quien();
    const b2 = document.querySelector('[data-pt-piedra="' + id + '"]');
    if (b2) b2.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, detail:0 }));
    await pausa(350);
    return { id, tras, tras2: quien() };
  });
  di('el foco', JSON.stringify(foco));
  vale('TRAS EL REPINTADO EL FOCO SIGUE EN LA PIEDRA', foco.tras === foco.id, foco.tras);
  vale('  y se puede volver a pulsar', foco.tras2 === foco.id, foco.tras2);

  fs.rmSync(carpeta, { recursive:true, force:true });
  await cerrar(sesion);
})();
