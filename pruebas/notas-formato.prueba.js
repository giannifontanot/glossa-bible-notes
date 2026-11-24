/* NOTAS CON FORMATO: LA BARRA, LA FOTO Y LOS DOS PANELITOS.

   Gianni pidió tres cosas a la vez y aquí se vigilan las tres:
   1. Un botón junto al libro de las glosas que abre una barra sencilla
      —negrita, cursiva, subrayado, las dos listas y una foto—.
   2. Que los dos panelitos abran y cierren SUAVECITO, y que solo haya uno
      abierto a la vez.
   3. Que la foto se achique para el teléfono, viaje en el respaldo y no se
      coma el sitio de las glosas.

   Y una cuarta que no se pidió con palabras pero es la que más duele si se
   rompe: que las notas que ya existían se vean exactamente igual que antes.

   Todo se hace tocando. La foto se elige por el selector de archivos de
   verdad —el que abre el botón—, no metiéndola por debajo; el formato se da
   con el dedo en la barra y escribiendo con el teclado, y lo único que se
   sustituye alguna vez es una pieza del navegador (el almacén lleno). */
const { abrir, cerrar, di, vale, titulo, arrastrarManija } = require('./comun');

const paneles = { notas:'notas', glosas:'etiquetas', respaldo:'respaldo' };
async function ir(p, seccion){
  if (await p.locator('#' + paneles[seccion]).isVisible()) return;
  if (!await p.locator('.rollo:visible .pestanas').count()){
    await p.locator('#pgCabeza').click(); await p.waitForTimeout(900);
  }
  await p.locator('.rollo:visible .pestanas [data-sec="' + seccion + '"]').click();
  await p.locator('#' + paneles[seccion]).waitFor({ state:'visible' });
  await p.waitForTimeout(650);
  if (seccion === 'respaldo'){
    await p.locator('#respaldo [data-sub="tools"]').click();
    await p.waitForTimeout(300);
  }
}
async function importar(p, datos){
  await ir(p, 'respaldo');
  await p.locator('#archivoImp').setInputFiles({ name:'notas.json', mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(datos)) });
  await p.waitForTimeout(400);
}
async function exportar(p){
  await ir(p, 'respaldo');
  const esperando = p.waitForEvent('download'); await p.locator('#btnExportar').click();
  const descarga = await esperando; let texto = '';
  for await (const parte of await descarga.createReadStream()) texto += parte.toString();
  return JSON.parse(texto);
}
const guardadas = p => p.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1') || '[]'));
const fotos = p => p.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:fotos:v1') || '{}'));
const bytesDe = datos => Math.floor(datos.split(',')[1].length * 3 / 4);

/* TOCAR UNA PALABRA DE LA NOTA CON EL DEDO, donde se ve: se busca en qué
   renglón quedó, y se toca un poco a un lado del centro, como un dedo. */
const tocarPalabra = async (p, palabra, cual = 0) => {
  const donde = await p.evaluate(([palabra, cual]) => {
    const ed = document.querySelector('#notas .nota-hoja:not([hidden]) .nota-editor');
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    let vistos = 0;
    for (let n = w.nextNode(); n; n = w.nextNode()){
      const re = new RegExp('(^|[^\\p{L}])' + palabra + '(?![\\p{L}])', 'gu'); let m;
      while ((m = re.exec(n.nodeValue))){
        if (vistos++ < cual) continue;
        const i = m.index + m[1].length;
        const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + palabra.length);
        const c = r.getClientRects()[0];
        return { x:c.left + c.width * .55, y:c.top + c.height * .48 };
      }
    }
    return null;
  }, [palabra, cual]);
  if (!donde) throw new Error('no encuentro «' + palabra + '» en la nota');
  await p.touchscreen.tap(Math.round(donde.x), Math.round(donde.y));
  await p.waitForTimeout(120);
};
/* Lo que está marcado, leído del trazo pintado: es lo que el lector ve. */
const marcado = p => p.evaluate(() => {
  const h = window.CSS && CSS.highlights && CSS.highlights.get('nota-marcada');
  const r = h && [...h][0];
  return r ? r.toString() : '';
});
async function cerrarBarra(p){
  if (await p.locator('#notaFormato').isVisible()){
    await p.locator('#notas .nota-ver-formato').tap();
    await p.locator('#notaFormato').waitFor({ state:'hidden', timeout:2000 });
  }
}

/* EL ALTO DE UN PANELITO, CUADRO A CUADRO. Se arranca ANTES del toque y se
   recoge después: así se ve el viaje entero, no lo que quedó al final. */
const muestrear = (p, sel, ms = 650) => p.evaluate(([sel, ms]) => new Promise(z => {
  const el = document.querySelector(sel), r = [], t0 = performance.now();
  (function f(){
    r.push(!el || el.hidden ? 0 : Math.round(el.getBoundingClientRect().height * 10) / 10);
    if (performance.now() - t0 < ms) requestAnimationFrame(f); else z(r);
  })();
}), [sel, ms]);
const intermedios = alturas => {
  const max = Math.max(...alturas);
  return alturas.filter(h => h > 1 && h < max - 1).length;
};

/* UNA FOTO GRANDE DE VERDAD, como la de una cámara: 3000 × 2000 y varios
   megas en PNG. Se pinta en el propio navegador porque es lo que hay a mano
   que sabe hacer imágenes; lo que sale es un archivo como cualquier otro. */
const fotoGrande = p => p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 3000; c.height = 2000;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 3000, 2000);
  g.addColorStop(0, '#2b5f8a'); g.addColorStop(.5, '#e8c07a'); g.addColorStop(1, '#6b3d22');
  x.fillStyle = g; x.fillRect(0, 0, 3000, 2000);
  let semilla = 7;
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++){
    x.fillStyle = 'hsla(' + Math.floor(azar() * 360) + ',60%,' + Math.floor(30 + azar() * 50) + '%,.55)';
    x.beginPath(); x.arc(azar() * 3000, azar() * 2000, 10 + azar() * 120, 0, 7); x.fill();
  }
  const img = x.getImageData(0, 0, 3000, 2000);
  for (let i = 0; i < img.data.length; i += 4){ const r = (azar() - .5) * 26;
    img.data[i] += r; img.data[i + 1] += r; img.data[i + 2] += r; }
  x.putImageData(img, 0, 0);
  const blob = await new Promise(z => c.toBlob(z, 'image/png'));
  const b = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
});
async function subirFoto(p, base64){
  if (await p.locator('#notaFormato').isHidden()){
    await p.locator('#notas .nota-ver-formato').tap();
    await p.locator('#notaFormato').waitFor({ state:'visible' });
    await p.waitForTimeout(350);
  }
  const eligiendo = p.waitForEvent('filechooser');
  await p.locator('#notaFormato [data-orden="foto"]').tap();
  const selector = await eligiendo;
  await selector.setFiles({ name:'camara.png', mimeType:'image/png', buffer:Buffer.from(base64, 'base64') });
}

(async () => {
  const sesion = await abrir(), p = sesion.pagina;
  const editor = p.locator('#notas .nota-editor:visible');
  const formato = p.locator('#notas .nota-ver-formato');
  const libro = p.locator('#notas .nota-ver-glosas');

  titulo('el botón del formato vive junto al libro de las glosas');
  await ir(p, 'notas');
  vale('en el índice no hay nota a la que darle formato', await formato.isDisabled());
  await p.locator('#notas .indice-item').first().click();
  vale('dentro de una nota se puede usar', await formato.isEnabled());
  /* Los tres van en su propio renglón, debajo de las pestañas, en el orden
     Glosas · Formato · Enviar, cada uno con su dibujo y su palabra al lado. */
  const vecinos = await p.evaluate(() => {
    const b = document.querySelector('#notas .nota-ver-formato');
    const fila = b.parentElement, tira = document.querySelector('#notas .indice-barra');
    const caja = r => r.getBoundingClientRect();
    const svg = b.querySelector('svg'), txt = b.querySelector('.nota-accion-texto');
    return { anterior:b.previousElementSibling && b.previousElementSibling.className,
             siguiente:b.nextElementSibling && b.nextElementSibling.className,
             fila:fila.className, trasLaTira:fila.previousElementSibling === tira,
             debajo:Math.round(caja(fila).top) >= Math.round(caja(tira).bottom),
             enLaTira:tira.querySelectorAll('.nota-ver-glosas, .nota-ver-formato, .nota-ver-enviar').length,
             texto:txt && txt.textContent, textoALaDerecha:!!(svg && txt) && caja(txt).left >= caja(svg).right,
             alto:Math.round(caja(b).height),
             altoLibro:Math.round(caja(document.querySelector('#notas .nota-ver-glosas')).height) };
  });
  di('el botón', vecinos);
  vale('va entre el libro y el avioncito, en su renglón propio',
       vecinos.anterior === 'nota-ver-glosas' && vecinos.siguiente === 'nota-ver-enviar' &&
       vecinos.fila === 'nota-acciones', JSON.stringify(vecinos));
  vale('el renglón va justo debajo de las pestañas, y en la tira ya no queda ninguno',
       vecinos.trasLaTira && vecinos.debajo && vecinos.enLaTira === 0, JSON.stringify(vecinos));
  vale('lleva su palabra al lado del dibujo', vecinos.texto === 'Formato' && vecinos.textoALaDerecha,
       JSON.stringify(vecinos));
  vale('y tiene el mismo alto que el libro', vecinos.alto === vecinos.altoLibro, vecinos.alto + ' / ' + vecinos.altoLibro);

  titulo('la barra abre suavecito y cierra suavecito');
  let m = muestrear(p, '#notaFormato');
  await formato.tap();
  let alturas = await m;
  di('al abrir', alturas.join(' '));
  vale('crece pasando por alturas de en medio, no de golpe', intermedios(alturas) >= 2, intermedios(alturas));
  vale('y termina abierta', alturas.at(-1) > 20 && alturas.at(-1) === Math.max(...alturas), alturas.at(-1));
  vale('el botón dice que está abierta', await formato.getAttribute('aria-expanded') === 'true');
  vale('trae los catorce botones', await p.locator('#notaFormato .nota-orden').count() === 14,
       await p.locator('#notaFormato .nota-orden').count());
  const renglones = await p.evaluate(() => [...document.querySelectorAll('#notaFormato .nota-renglon')]
    .map(r => [...r.querySelectorAll('.nota-grupo')].map(g =>
      [...g.querySelectorAll('.nota-orden')].map(b => b.dataset.orden).join(' ')).join(' | ')));
  di('los dos renglones', renglones);
  vale('en dos renglones, como dijo el panel',
       renglones.length === 2 &&
       renglones[0] === 'deshacer rehacer | bold italic underline | resaltar colorear' &&
       renglones[1] === 'brocha | achicar agrandar tipo | insertUnorderedList insertOrderedList | foto', JSON.stringify(renglones));
  const caben = await p.evaluate(() => [...document.querySelectorAll('#notaFormato .nota-renglon')].map(r => {
    const tops = new Set([...r.querySelectorAll('.nota-orden')].map(b => Math.round(b.getBoundingClientRect().top)));
    const bs = [...r.querySelectorAll('.nota-orden')], u = bs[0], z = bs.at(-1), caja = r.getBoundingClientRect();
    /* Los huecos entre lo que hay en el renglón —grupo, rayita, grupo…— */
    const hijos = [...r.children].map(h => h.getBoundingClientRect());
    const huecos = hijos.slice(1).map((h, i) => Math.round((h.left - hijos[i].right) * 10) / 10);
    return { lineas:tops.size, ancho:Math.round(caja.width), huecos,
             primeroALaIzquierda: u.getBoundingClientRect().left - caja.left < 2,
             ultimoALaDerecha: caja.right - z.getBoundingClientRect().right < 2 };
  }));
  vale('cada renglón cabe entero en el teléfono, sin partirse', caben.every(c => c.lineas === 1), JSON.stringify(caben));
  /* Repartidos a lo ancho, lo eligió Gianni: los dos renglones del mismo
     ancho, de orilla a orilla, y el mismo hueco entre grupos. */
  vale('repartidos: cada renglón va de la orilla izquierda a la derecha',
       caben.every(c => c.primeroALaIzquierda && c.ultimoALaDerecha), JSON.stringify(caben));
  vale('los dos renglones miden lo mismo', caben.length === 2 && caben[0].ancho === caben[1].ancho, JSON.stringify(caben));
  vale('dentro de cada renglón, el mismo hueco a cada lado de cada rayita',
       caben.every(c => Math.max(...c.huecos) - Math.min(...c.huecos) <= 1.5), JSON.stringify(caben.map(c => c.huecos)));
  vale('(la prueba es válida) los huecos son más que el mínimo: de verdad se repartieron',
       caben.every(c => Math.min(...c.huecos) > 5), JSON.stringify(caben.map(c => c.huecos)));
  vale('ya no hay interruptor «Estilo»: el lápiz lo es',
       await p.locator('#notaFormato .nota-interruptor').count() === 0);
  m = muestrear(p, '#notaFormato');
  await formato.tap();
  alturas = await m;
  di('al cerrar', alturas.join(' '));
  vale('se encoge pasando por alturas de en medio', intermedios(alturas) >= 2, intermedios(alturas));
  vale('y termina escondida', alturas.at(-1) === 0 && await p.locator('#notaFormato').isHidden());

  titulo('el de las glosas también cierra suave, y solo hay uno a la vez');
  m = muestrear(p, '#notaFiltros');
  await libro.tap();
  alturas = await m;
  vale('el libro abre suave', intermedios(alturas) >= 2, alturas.join(' '));
  m = muestrear(p, '#notaFiltros');
  await formato.tap();
  alturas = await m;
  di('el libro mientras se abre el formato', alturas.join(' '));
  vale('abrir el formato cierra el de las glosas, y suave', intermedios(alturas) >= 2 && alturas.at(-1) === 0,
       alturas.join(' '));
  vale('el formato queda abierto y el libro dice que se cerró',
       await p.locator('#notaFormato').isVisible() && await libro.getAttribute('aria-expanded') === 'false');
  await libro.tap();
  await p.waitForTimeout(500);
  vale('y al revés: abrir las glosas cierra el formato',
       await p.locator('#notaFiltros').isVisible() && await p.locator('#notaFormato').isHidden() &&
       await formato.getAttribute('aria-expanded') === 'false');
  await p.keyboard.press('Escape');
  await p.locator('#notaFiltros').waitFor({ state:'hidden', timeout:2000 }).catch(() => {});
  vale('Escape sigue cerrando el de las glosas', await p.locator('#notaFiltros').isHidden());
  m = muestrear(p, '#notaFormato', 900);
  await formato.tap(); await p.waitForTimeout(60); await formato.tap(); await p.waitForTimeout(60); await formato.tap();
  alturas = await m;
  vale('tres toques seguidos a media animación la dejan abierta y entera',
       await p.locator('#notaFormato').isVisible() && alturas.at(-1) === Math.max(...alturas) && alturas.at(-1) > 20,
       alturas.join(' '));

  /* EL MODO FORMATO: con la barra abierta la nota no se escribe, se marca
     con el dedo. Antes esta parte escribía con la barra abierta —tocar B y
     seguir tecleando—, y eso es justo lo que Gianni pidió quitar: el toque
     largo sacaba el teclado y el menú de copiar. Ahora se escribe con la
     barra cerrada, y se da formato con ella abierta. */
  titulo('con la barra abierta la nota no se escribe: se marca tocando palabras');
  await cerrarBarra(p);
  await editor.tap();
  await editor.fill('');
  await p.keyboard.type('Texto normal negrita doble'); await p.keyboard.press('Enter');
  await p.keyboard.type('uno'); await p.keyboard.press('Enter');
  await p.keyboard.type('dos'); await p.keyboard.press('Enter');
  await p.keyboard.type('primero');
  await formato.tap(); await p.waitForTimeout(350);
  const enModo = await editor.evaluate(e => ({ editable:e.isContentEditable, foco:document.activeElement === e,
    teclado:e.getAttribute('inputmode'), seleccion:getComputedStyle(e).userSelect }));
  di('la nota con la barra abierta', enModo);
  vale('no se puede escribir, no tiene el foco y no pide teclado',
       !enModo.editable && !enModo.foco && enModo.teclado === 'none', JSON.stringify(enModo));
  vale('y no se selecciona (no sale el menú de copiar)', enModo.seleccion === 'none', enModo.seleccion);
  vale('sin nada marcado, los botones se ven apagados',
       await p.locator('#notaFormato').evaluate(f => f.classList.contains('sin-marca')));
  await tocarPalabra(p, 'negrita');
  vale('un toque marca la palabra entera', await marcado(p) === 'negrita', await marcado(p));
  await p.locator('#notaFormato [data-orden="bold"]').tap();
  const trasNegrita = await editor.evaluate(e => ({ foco:document.activeElement === e, editable:e.isContentEditable,
    sel:String(getSelection()), html:e.innerHTML }));
  di('tras la negrita', trasNegrita);
  vale('la negrita cae en lo marcado', /<b>negrita<\/b>/.test(trasNegrita.html), trasNegrita.html);
  vale('y la nota sigue quieta: sin foco, sin escribir, sin selección del navegador',
       !trasNegrita.foco && !trasNegrita.editable && trasNegrita.sel === '', JSON.stringify(trasNegrita));
  vale('lo marcado sigue marcado para darle más formato', await marcado(p) === 'negrita', await marcado(p));
  vale('el botón de la negrita se ve hundido',
       await p.locator('#notaFormato [data-orden="bold"]').getAttribute('aria-pressed') === 'true');
  await tocarPalabra(p, 'doble');
  await p.locator('#notaFormato [data-orden="italic"]').tap();
  await p.locator('#notaFormato [data-orden="underline"]').tap();
  vale('cursiva y subrayado, uno detrás de otro, se quedan los dos',
       await editor.evaluate(e => !!e.querySelector('i u, u i') && /doble/.test((e.querySelector('i u, u i') || {}).textContent || '')),
       await editor.innerHTML());
  await tocarPalabra(p, 'uno');
  await arrastrarManija(p, 'fin', 'dos');
  vale('la manija lleva lo marcado al renglón de abajo', /^uno\s*dos$/.test(await marcado(p)),
       JSON.stringify(await marcado(p)));
  await p.locator('#notaFormato [data-orden="insertUnorderedList"]').tap();
  vale('el botón de la lista se ve hundido dentro de la lista',
       await p.locator('#notaFormato [data-orden="insertUnorderedList"]').getAttribute('aria-pressed') === 'true');
  await tocarPalabra(p, 'primero');
  await p.locator('#notaFormato [data-orden="insertOrderedList"]').tap();
  await tocarPalabra(p, 'normal');
  await tocarPalabra(p, 'normal');
  vale('tocar otra vez la palabra marcada sola la suelta', await marcado(p) === '', await marcado(p));
  await p.waitForTimeout(150);
  let nota = (await guardadas(p))[0];
  di('lo guardado', nota.html);
  vale('se guarda la negrita', /<b>negrita<\/b>/.test(nota.html), nota.html);
  vale('la lista con viñetas, con sus dos puntos', /<ul><li>uno(<br>)?<\/li><li>dos(<br>)?<\/li><\/ul>/.test(nota.html), nota.html);
  vale('y la numerada', /<ol><li>primero(<br>)?<\/li><\/ol>/.test(nota.html), nota.html);
  vale('el texto plano sigue al día, con sus saltos', /Texto normal negrita/.test(nota.texto) &&
       /uno\ndos/.test(nota.texto), JSON.stringify(nota.texto));
  vale('nada de estilos ni atributos en lo guardado', !/style=|class=|<span/.test(nota.html), nota.html);
  await cerrarBarra(p);
  vale('cerrar la barra devuelve la nota a escribirse',
       await editor.evaluate(e => e.isContentEditable && !e.hasAttribute('inputmode')));
  vale('y suelta lo marcado', await marcado(p) === '');
  await p.reload(); await ir(p, 'notas');
  await p.locator('#notas .indice-item').first().click();
  vale('al recargar la nota vuelve con su formato',
       await editor.evaluate(e => !!e.querySelector('b') && e.querySelectorAll('ul li').length === 2 &&
                                 e.querySelectorAll('ol li').length === 1));

  titulo('una nota de antes se ve exactamente igual que antes');
  const vieja = 'Línea uno\n   con tres espacios delante\n\n<b>esto no es negrita</b>\tfin';
  await importar(p, { formato:'glossa/marcas', marcas:[],
    notas:[{ id:'nota-de-antes', titulo:'De antes', texto:vieja }] });
  await ir(p, 'notas');
  await p.locator('#notas .pestanitas [data-nota="nota-de-antes"]').click();
  const comoSeVe = await editor.evaluate(e => ({ texto:e.innerText, negritas:e.querySelectorAll('b').length,
    ws:getComputedStyle(e).whiteSpace }));
  di('la vieja', comoSeVe);
  vale('los saltos y los espacios llegan tal cual', comoSeVe.texto === vieja, JSON.stringify(comoSeVe.texto));
  vale('y lo que parecía marcado sigue siendo texto', comoSeVe.negritas === 0);
  vale('mirarla no la reescribe', (await guardadas(p)).find(n => n.id === 'nota-de-antes').html === undefined);

  titulo('un respaldo con HTML de más llega limpio');
  await p.evaluate(() => { delete window.__malo; });
  await importar(p, { formato:'glossa/marcas', marcas:[], notas:[{ id:'nota-sucia', titulo:'Sucia',
    texto:'bien rojo enlace',
    html:'<b onclick="window.__malo=1">bien</b><img src="x" onerror="window.__malo=2">' +
         '<script>window.__malo=3<\/script><span style="color:red">rojo</span>' +
         '<a href="javascript:window.__malo=4">enlace</a><iframe src="about:blank"></iframe>' }] });
  await ir(p, 'notas');
  await p.locator('#notas .pestanitas [data-nota="nota-sucia"]').click();
  await p.waitForTimeout(200);
  const sucia = await editor.evaluate(e => ({ html:e.innerHTML, malo:window.__malo }));
  di('limpia', sucia.html);
  vale('no corrió nada de lo que traía', sucia.malo === undefined, sucia.malo);
  vale('queda la negrita y el texto, sin un solo atributo',
       sucia.html === '<b>bien</b>rojoenlace', sucia.html);

  titulo('pegar trae el texto, no la ropa de la otra página');
  await p.locator('#notas .indice-tab').click();
  await p.locator('#notas .indice-crear').click();
  await editor.tap();
  await editor.evaluate(e => {
    const d = new DataTransfer();
    d.setData('text/html', '<span style="font-size:40px;color:red"><b>Pegado</b> grande</span>');
    d.setData('text/plain', 'Pegado grande');
    e.dispatchEvent(new ClipboardEvent('paste', { clipboardData:d, bubbles:true, cancelable:true }));
  });
  vale('entra solo el texto', await editor.innerText() === 'Pegado grande' &&
       await editor.evaluate(e => !e.querySelector('b, span')), await editor.innerHTML());

  titulo('la foto se achica para el teléfono');
  const base64 = await fotoGrande(p);
  const pesoOriginal = Buffer.from(base64, 'base64').length;
  di('la foto de la cámara', { ancho:3000, alto:2000, kb:Math.round(pesoOriginal / 1024) });
  vale('(la prueba es válida) la foto de partida pesa más de un mega', pesoOriginal > 1024 * 1024, pesoOriginal);
  await editor.fill('Antes de la foto. ');
  await subirFoto(p, base64);
  const img = editor.locator('img');
  await img.waitFor({ timeout:15000 });
  const medida = await img.evaluate(async i => { await i.decode().catch(() => {}); return { w:i.naturalWidth, h:i.naturalHeight }; });
  const almacen = await fotos(p);
  const ids = Object.keys(almacen);
  const peso = ids.length ? bytesDe(almacen[ids[0]]) : 0;
  di('la foto guardada', { ...medida, kb:Math.round(peso / 1024), tipo:ids.length && almacen[ids[0]].slice(5, 15) });
  vale('entra en la nota', medida.w > 0);
  vale('su lado largo no pasa de 1080 px', Math.max(medida.w, medida.h) <= 1080, medida.w + '×' + medida.h);
  vale('y conserva la forma de la original', Math.abs(medida.w / medida.h - 1.5) < .02, medida.w / medida.h);
  vale('se guarda una sola, aparte de la nota', ids.length === 1, ids.length);
  vale('pesa unos 140 KB o menos', peso > 0 && peso <= 140 * 1024, Math.round(peso / 1024) + ' KB');
  await p.waitForTimeout(150);
  nota = (await guardadas(p)).find(n => n.texto.startsWith('Antes de la foto'));
  vale('la nota guarda solo el número de la foto, no la foto',
       !!nota && nota.html.includes('data-foto="' + ids[0] + '"') && !nota.html.includes('base64'),
       nota && nota.html.slice(0, 200));
  await p.reload(); await ir(p, 'notas');
  await p.locator('#notas .indice-item').filter({ hasText:'Antes de la foto' }).click();
  vale('al recargar la foto sigue ahí',
       await editor.locator('img').evaluate(i => i.decode().then(() => i.naturalWidth > 0, () => false)));

  titulo('el respaldo lleva la foto y la trae de vuelta');
  const respaldo = await exportar(p);
  vale('el archivo trae la foto que usa la nota',
       respaldo.totalFotos === 1 && respaldo.fotos && respaldo.fotos[ids[0]] === almacen[ids[0]],
       respaldo.totalFotos);
  const destino = await abrir(), q = destino.pagina;
  await importar(q, respaldo); await ir(q, 'notas');
  await q.locator('#notas .indice-item').filter({ hasText:'Antes de la foto' }).click();
  vale('en otro teléfono la nota llega con su foto',
       await q.locator('#notas .nota-editor:visible img').evaluate(i => i.decode().then(() => i.naturalWidth > 0, () => false)));
  vale('y la foto queda guardada allí también', Object.keys(await fotos(q)).length === 1);
  await q.reload(); await ir(q, 'notas');
  await q.locator('#notas .indice-item').filter({ hasText:'Antes de la foto' }).click();
  vale('y sobrevive a recargar', await q.locator('#notas .nota-editor:visible img').count() === 1);
  vale('el otro navegador no tuvo errores de JavaScript', destino.errores.length === 0, destino.errores);
  await destino.navegador.close();

  titulo('si ya no cabe, la foto no entra y se dice');
  /* Se llena el ALMACÉN, que es del navegador: la aplicación no se toca. */
  await p.evaluate(() => {
    window.__setItemOriginal = Storage.prototype.setItem;
    Storage.prototype.setItem = function(clave, valor){
      if (clave === 'glossa:notas:fotos:v1') throw new DOMException('Almacén lleno', 'QuotaExceededError');
      return window.__setItemOriginal.call(this, clave, valor);
    };
  });
  await ir(p, 'notas');
  await subirFoto(p, base64);
  /* El aviso se apaga solo a los pocos segundos: se recoge en cuanto sale. */
  const aviso = await p.waitForFunction(() => {
    const t = document.getElementById('readout').textContent;
    return /NO CABEN MÁS FOTOS/.test(t) ? t : false;
  }, null, { timeout:15000 }).then(h => h.jsonValue(), () => '(no salió ningún aviso)');
  vale('el aviso lo dice', /NO CABEN MÁS FOTOS/.test(aviso), aviso);
  vale('y la nota no enseña una foto que no se guardó', await editor.locator('img').count() === 1);
  vale('la que ya estaba sigue guardada', Object.keys(await fotos(p)).length === 1);
  await p.evaluate(() => { Storage.prototype.setItem = window.__setItemOriginal; delete window.__setItemOriginal; });

  titulo('quitar la foto de la nota la quita del almacén al volver');
  await cerrarBarra(p);
  await editor.fill('Sin foto ya.');
  await p.waitForTimeout(150);
  await p.reload();
  vale('la foto que ya no usa nadie se va al arrancar', Object.keys(await fotos(p)).length === 0);

  /* Y AL REVÉS: CON LAS NOTAS ROTAS NO SE TIRA NINGUNA. Si no se pudieron
     leer las notas, nadie sabe qué fotos usaban, y «ninguna nota la usa»
     sería mentira. Se escribe a mano una foto válida y unas notas que no son
     JSON, y se arranca. */
  titulo('con las notas ilegibles, las fotos se quedan');
  await p.evaluate(() => {
    localStorage.setItem('glossa:notas:fotos:v1', JSON.stringify({ 'foto-de-prueba': 'data:image/png;base64,iVBORw0KGgo=' }));
    localStorage.setItem('glossa:notas:v1', '{esto no es json');
  });
  await p.reload();
  await p.locator('#notas').waitFor({ state:'attached' });
  vale('la foto sigue en su sitio', Object.keys(await fotos(p)).includes('foto-de-prueba'),
    Object.keys(await fotos(p)));

  vale('sin errores de JavaScript', sesion.errores.length === 0, sesion.errores);
  await sesion.navegador.close();

  titulo('quien pidió menos movimiento los recibe sin viaje');
  const quieta = await abrir({ reducedMotion:'reduce' }), r = quieta.pagina;
  await ir(r, 'notas');
  await r.locator('#notas .indice-item').first().click();
  m = muestrear(r, '#notaFormato', 400);
  await r.locator('#notas .nota-ver-formato').tap();
  alturas = await m;
  vale('abre sin alturas de en medio', intermedios(alturas) === 0 && alturas.at(-1) > 20, alturas.join(' '));
  m = muestrear(r, '#notaFormato', 400);
  await r.locator('#notas .nota-ver-formato').tap();
  alturas = await m;
  vale('y cierra igual', intermedios(alturas) === 0 && alturas.at(-1) === 0, alturas.join(' '));
  await cerrar(quieta);
})().catch(e => { console.error(e); process.exit(1); });
