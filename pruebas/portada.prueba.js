/* ============================================================
   LA PORTADA.

   La tapa que se ve al abrir dejó de ser un letrero que se va solo: cuenta
   segundo y tres cuartos, y mientras cuenta se puede parar («hold»), pegarle
   piedras y ponerle una foto. Eso la vuelve una pantalla con estado, y una
   pantalla con estado se prueba.

   POR QUÉ NO USA abrir(). El andamio espera a que la portada SE VAYA antes de
   devolver la página —es lo que quiere el resto de la carpeta—. Aquí hay que
   llegar antes, así que se usa abrirEnPortada(), que abre y devuelve.

   Y POR QUÉ NO HAY QUE CORRER: en cuanto se toca «hold» o cualquiera de los
   dos mandos, el reloj se para y la portada se queda. Solo la primera medida
   —«sigue puesta»— compite contra la cuenta, y por eso mira a los 900 ms de
   los 1750 que dura.
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
  await p.waitForTimeout(900);

  titulo('EL RELOJ Y LOS TRES BOTONES');
  const viva = await p.evaluate(() =>
    !document.getElementById('portada').classList.contains('fuera'));
  vale('a los 900 ms la portada sigue puesta', viva === true, viva);

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
  vale('y dicen lo suyo',
       bot.foto.t === 'foto' && bot.hold.t === 'hold' && bot.piedras.t === 'Piedras',
       [bot.foto.t, bot.hold.t, bot.piedras.t].join(' | '));
  /* 48 px es el suelo de esta aplicación: por encima de los 44 de la WCAG 2.5.5
     y de los 44 de Apple, al nivel de Material 3. */
  vale('y se pueden tocar con el dedo',
       Math.min(bot.foto.alto, bot.hold.alto, bot.piedras.alto) >= 48,
       [bot.foto.alto, bot.hold.alto, bot.piedras.alto].join(' / '));

  titulo('HOLD PARA LA CUENTA');
  await p.click('#btnPortadaHold');
  /* 2600 es más de los 1750 de la cuenta entera: si el reloj siguiera vivo,
     aquí ya no habría portada. */
  await p.waitForTimeout(2600);
  const tras = await p.evaluate(() => ({
    puesta: !document.getElementById('portada').classList.contains('fuera'),
    rotulo: document.getElementById('btnPortadaHold').textContent.trim() }));
  di('tras hold', JSON.stringify(tras));
  vale('HOLD DEJA LA PORTADA ABIERTA', tras.puesta === true, tras);
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

  titulo('LAS PIEDRAS DE LA PORTADA');
  await p.click('[data-pt-listo]'); await p.waitForTimeout(300);
  await p.click('#btnPortadaPiedras'); await p.waitForTimeout(400);
  await p.click('[data-pt-forma="paloma"]'); await p.waitForTimeout(250);
  await p.click('[data-pt-tinta="carmin"]'); await p.waitForTimeout(250);
  /* SE PONEN CON EL PUNTERO Y SIN CLIC, y ésta es la prueba que faltaba.
     La capa donde caen las piedras es un <div> pelado con el oyente delegado
     en la portada, y un teléfono —iOS a la cabeza— solo se inventa el clic
     sobre lo que considera tocable: un control, o algo con su propio oyente.
     Así que en el teléfono el toque en la capa no producía clic y no llegaba
     nunca, mientras con ratón iba bien y esta prueba, que mandaba clics de
     ratón, tampoco lo veía. Ahora manda lo que manda un dedo —pointerdown,
     temblor, pointerup— y NADA MÁS: si el arreglo volviera a apoyarse en el
     clic, esto lo dice. */
  await tocarSinClic(p, 120, 260);
  await tocarSinClic(p, 300, 300);

  /* EL MANDO TAPA LA BANDA DE ABAJO, y por eso lleva «subir». Medido en el
     teléfono de 412×915 ocupa de y=469 a y=811: ahí no se puede dejar una
     piedra, y una puesta no se arrastra después. La prueba mide el estorbo
     antes de mover el mando, para que si mañana el panel encoge y deja de
     tapar, esto lo diga en vez de seguir en verde por casualidad. */
  const tapa = await p.evaluate(() => {
    const r = document.getElementById('portadaMandoPiedras').getBoundingClientRect();
    const t = document.elementFromPoint(206, Math.round(r.top + r.height/2));
    return { y: Math.round(r.top), abajo: Math.round(r.bottom),
             tapando: !!(t && t.closest('.pt-mando')) };
  });
  di('el mando abajo', JSON.stringify(tapa));
  vale('el mando abajo tapa parte de la portada', tapa.tapando === true, tapa);
  await p.click('[data-pt-mover]'); await p.waitForTimeout(300);
  const arriba = await p.evaluate(() => {
    const el = document.getElementById('portadaMandoPiedras');
    return { y: Math.round(el.getBoundingClientRect().top),
             arriba: el.classList.contains('arriba'),
             dice: (el.querySelector('[data-pt-mover]') || {}).textContent,
             libre: (document.elementFromPoint(206, 700) || {}).id };
  });
  di('el mando arriba', JSON.stringify(arriba));
  vale('SUBIR LO MUEVE Y LIBERA LO QUE TAPABA',
       arriba.arriba === true && arriba.y < tapa.y && arriba.libre === 'portadaPiedras', arriba);
  vale('  y el botón pasa a decir «bajar»', arriba.dice === 'bajar', arriba.dice);
  await tocarSinClic(p, 206, 700);
  await p.click('[data-pt-mover]'); await p.waitForTimeout(300);   /* se baja otra vez */

  const pd = await p.evaluate(k => {
    const g = JSON.parse(localStorage.getItem(k) || '{}').piedras || [];
    return { puestas: document.querySelectorAll('.pt-piedra').length,
             guardadas: g.length, forma: (g[0] || {}).forma, color: (g[0] || {}).color,
             /* En fracciones, no en píxeles: la pantalla gira y el píxel no. */
             enFracciones: g.every(x => x.x >= 0 && x.x <= 1 && x.y >= 0 && x.y <= 1) };
  }, LLAVE);
  di('las piedras', JSON.stringify(pd));
  vale('SE PONEN DONDE SE TOCA', pd.puestas === 3 && pd.guardadas === 3, pd);
  vale('  con la figura y el color elegidos',
       pd.forma === 'paloma' && pd.color === 'carmin', [pd.forma, pd.color].join(' / '));
  vale('  y guardadas en fracciones de la portada', pd.enFracciones === true, pd.enFracciones);

  /* Y AHORA EL TRATO DE LAS PIEDRAS DE LA HOJA, que es lo que se pidió: una
     piedra quieta no responde al toque —el doble toque la despierta—, y ya
     despierta el toque le cambia la figura y el arrastre la mueve. Antes, en
     la portada, una piedra puesta solo se podía quitar. */
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
       quieta.n === 3 && quieta.forma === antesQuieta, quieta);

  await p.evaluate(d => {
    const b = document.querySelector('[data-pt-piedra="' + d.id + '"]');
    b.dispatchEvent(new MouseEvent('dblclick', { bubbles:true, cancelable:true,
      detail:2, clientX:d.x, clientY:d.y }));
  }, dondeEsta);
  await p.waitForTimeout(450);
  const edita = await p.evaluate(() => ({
    cerco: !!document.querySelector('.pt-piedra.editando'),
    botones: [...document.querySelectorAll('#portadaMandoPiedras .pt-mini')]
               .map(x => x.textContent.trim()) }));
  di('en edición', JSON.stringify(edita));
  vale('EL DOBLE TOQUE ABRE SU EDICIÓN', edita.cerco === true, edita.cerco);
  vale('  y el mando pasa a ser el suyo: Quitar, Cancelar y OK',
       ['Quitar','Cancelar','OK'].every(x => edita.botones.includes(x)), edita.botones);

  await tocarSinClic(p, dondeEsta.x, dondeEsta.y, 23);
  const otraForma = await p.evaluate(k =>
    (JSON.parse(localStorage.getItem(k)||'{}').piedras||[])[0].forma, LLAVE);
  vale('  y ya en edición, el toque le cambia la figura', otraForma !== antesQuieta,
       antesQuieta + ' → ' + otraForma);

  /* Quitar se pide desde su mando, no con un toque suelto: quitar sin querer
     una piedra que solo se quería mover es lo que esto evita. */
  await p.click('#portadaMandoPiedras [data-pt-quitar-esta]');
  await p.waitForTimeout(400);
  const menos = await p.evaluate(() => document.querySelectorAll('.pt-piedra').length);
  vale('  y «Quitar» del mando la quita', menos === 2, menos);

  titulo('CONTINUE ABRE LA BIBLIA');
  await p.click('[data-pt-listo]'); await p.waitForTimeout(300);
  await p.click('#btnPortadaHold');
  await p.waitForTimeout(2600);
  const fin1 = await p.evaluate(() => {
    const x = document.getElementById('portada');
    return !x || x.classList.contains('fuera');
  });
  vale('CONTINUE TERMINA LA CUENTA Y DESTAPA', fin1 === true, fin1);

  titulo('Y AL VOLVER, EL ADORNO SIGUE');
  await p.reload();
  await p.waitForTimeout(700);
  const vuelta = await p.evaluate(() => ({
    foto: !!document.querySelector('.pt-foto'),
    piedras: document.querySelectorAll('.pt-piedra').length }));
  di('tras recargar', JSON.stringify(vuelta));
  vale('la foto vuelve', vuelta.foto === true, vuelta.foto);
  vale('y las piedras también', vuelta.piedras === 2, vuelta.piedras);

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
