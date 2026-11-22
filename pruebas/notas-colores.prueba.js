/* NOTAS: COLORES, TAMAÑO Y TIPO DE LETRA, Y EL MODO FORMATO QUE LOS DA.

   Gianni pidió, para el editor de las notas:
   1. Resaltar con colores —amarillo, verde, azul, rosa, naranja— y poner la
      letra de colores —rojo, azul, verde, morado, gris—.
   2. Subir y bajar el tamaño de la letra de lo seleccionado.
   3. Cambiar el tipo de letra: la de la nota, Literata o Caveat.
   Y antes que nada, que al marcar una palabra NO salga el teclado del
   teléfono ni el menú de copiar, pegar y cortar: «yo lo único que quiero es
   ponerlo bold». Se resolvió con el modo formato: con la barra abierta la
   nota no se escribe y se marca a toques.

   Lo que aquí se vigila, además de que cada botón haga lo suyo:
   · que todo eso SE GUARDE —la limpieza de las notas tira estilos, y el
     formato nuevo tiene que pasarla—, vuelva al recargar y viaje en el
     respaldo;
   · que un respaldo con valores inventados no cuele nada;
   · que el toque largo marque aunque el teléfono no mande pointerdown —la
     regla que dejó el arreglo de la selección: un evento despachado a mano
     siempre llega, y el de un teléfono no—.

   Todo con el dedo: toques de verdad sobre las palabras y sobre la barra. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

const paneles = { notas:'notas', respaldo:'respaldo' };
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

/* Un toque de dedo un poco a un lado del centro de la palabra. */
const dondeEsta = (p, palabra) => p.evaluate(palabra => {
  const ed = document.querySelector('#notas .nota-hoja:not([hidden]) .nota-editor');
  const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()){
    const re = new RegExp('(^|[^\\p{L}])' + palabra + '(?![\\p{L}])', 'u');
    const m = re.exec(n.nodeValue); if (!m) continue;
    const i = m.index + m[1].length;
    const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + palabra.length);
    const c = r.getClientRects()[0];
    return { x:Math.round(c.left + c.width * .58), y:Math.round(c.top + c.height * .46) };
  }
  return null;
}, palabra);
const tocarPalabra = async (p, palabra) => {
  const d = await dondeEsta(p, palabra);
  if (!d) throw new Error('no encuentro «' + palabra + '» en la nota');
  await p.touchscreen.tap(d.x, d.y);
  await p.waitForTimeout(120);
};
const marcado = p => p.evaluate(() => {
  const h = window.CSS && CSS.highlights && CSS.highlights.get('nota-marcada');
  const r = h && [...h][0];
  return r ? r.toString() : '';
});
const boton = (p, orden) => p.locator('#notaFormato [data-orden="' + orden + '"]');
const tinta = (p, valor) => p.locator('#notaFormato .nota-paleta [data-valor="' + valor + '"]');
/* Lo que se ve de una palabra: su fondo, su tinta, su tamaño y su letra. */
const comoSeVe = (p, palabra) => p.evaluate(palabra => {
  const ed = document.querySelector('#notas .nota-hoja:not([hidden]) .nota-editor');
  const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()){
    if (!n.nodeValue.includes(palabra)) continue;
    const e = n.parentElement, cs = getComputedStyle(e);
    /* El fondo puede venir de un span de más arriba. */
    let fondo = 'rgba(0, 0, 0, 0)';
    for (let a = e; a && a !== ed; a = a.parentElement){
      const f = getComputedStyle(a).backgroundColor; if (f !== 'rgba(0, 0, 0, 0)'){ fondo = f; break; }
    }
    return { fondo, tinta:cs.color, tam:parseFloat(cs.fontSize), letra:cs.fontFamily,
             normal:parseFloat(getComputedStyle(ed).fontSize) };
  }
  return null;
}, palabra);

(async () => {
  const sesion = await abrir(), p = sesion.pagina;
  const editor = p.locator('#notas .nota-editor:visible');
  const verFormato = p.locator('#notas .nota-ver-formato');

  await ir(p, 'notas');
  await p.locator('#notas .indice-item').first().click();
  await editor.tap();
  await editor.fill('');
  await p.keyboard.type('Dios es amor y luz para todos los que creen hoy');
  await p.waitForTimeout(150);

  titulo('el modo formato: ni teclado ni menú de copiar');
  await verFormato.tap(); await p.waitForTimeout(350);
  const enModo = await editor.evaluate(e => ({ editable:e.isContentEditable, foco:document.activeElement === e,
    teclado:e.getAttribute('inputmode'), seleccion:getComputedStyle(e).userSelect,
    callout:getComputedStyle(e).webkitTouchCallout || '(no se lee aquí)' }));
  di('la nota con la barra abierta', enModo);
  vale('la nota no se escribe ni tiene el foco', !enModo.editable && !enModo.foco, JSON.stringify(enModo));
  vale('no pide teclado aunque algo le diera el foco', enModo.teclado === 'none');
  vale('y no se puede seleccionar', enModo.seleccion === 'none', enModo.seleccion);

  /* EL TOQUE LARGO, SIN pointerdown. Es lo que manda Android al sostener el
     dedo: un contextmenu. Se despacha solo, sin el resto del gesto, que es
     justo lo que puede pasar en un teléfono. */
  const largo = await dondeEsta(p, 'amor');
  const cancelado = await p.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    const ev = new MouseEvent('contextmenu', { bubbles:true, cancelable:true, clientX:x, clientY:y, button:2 });
    el.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, largo);
  vale('el toque largo marca la palabra, aunque no llegue pointerdown', await marcado(p) === 'amor', await marcado(p));
  vale('y su menú se cancela: no sale copiar, pegar y cortar', cancelado);
  vale('la nota sigue sin foco', await editor.evaluate(e => document.activeElement !== e));
  await tocarPalabra(p, 'luz');
  vale('un toque en otra palabra marca todo lo de en medio', await marcado(p) === 'amor y luz', await marcado(p));

  titulo('resaltar con los cinco colores');
  await boton(p, 'resaltar').tap();
  vale('el resaltador abre su paleta con cinco colores y uno para quitar',
       await p.locator('#notaFormato .nota-paleta .nota-tinta').count() === 6);
  await tinta(p, 'amarillo').tap();
  let visto = await comoSeVe(p, 'amor');
  di('«amor» resaltado', visto);
  vale('lo marcado se ve en amarillo', visto.fondo === 'rgb(255, 227, 110)', visto.fondo);
  vale('la gota del amarillo se ve elegida', await tinta(p, 'amarillo').getAttribute('aria-pressed') === 'true');
  for (const [valor, rgb] of [['verde', 'rgb(191, 231, 166)'], ['azul', 'rgb(182, 216, 245)'],
                              ['rosa', 'rgb(247, 195, 217)'], ['naranja', 'rgb(255, 201, 140)']]){
    await tinta(p, valor).tap();
    visto = await comoSeVe(p, 'amor');
    vale('cambia a ' + valor, visto.fondo === rgb, visto.fondo);
  }
  vale('cambiar de color no apila spans: queda uno solo',
       await editor.evaluate(e => e.querySelectorAll('[data-resalte]').length === 1 &&
                                  e.querySelector('[data-resalte]').textContent === 'amor y luz'),
       await editor.innerHTML());

  titulo('la letra de colores');
  await tocarPalabra(p, 'Dios');
  await boton(p, 'colorear').tap();
  vale('la paleta de la letra reemplaza a la del resaltador',
       await p.locator('#notaFormato .nota-paleta').getAttribute('data-paleta') === 'color' &&
       await boton(p, 'resaltar').getAttribute('aria-expanded') === 'false');
  for (const [valor, rgb] of [['rojo', 'rgb(179, 38, 30)'], ['azul', 'rgb(31, 95, 168)'],
                              ['verde', 'rgb(46, 125, 50)'], ['morado', 'rgb(106, 61, 154)'],
                              ['gris', 'rgb(111, 106, 98)']]){
    await tinta(p, valor).tap();
    visto = await comoSeVe(p, 'Dios');
    vale('«Dios» en ' + valor, visto.tinta === rgb, visto.tinta);
  }
  await tinta(p, 'rojo').tap();
  /* UNA PARTE DE LO RESALTADO: se marca solo «luz», que vive dentro del
     resaltado de «amor y luz», y se le quita. «amor y» tiene que seguir
     resaltado: el span se parte, no se tira. */
  await tocarPalabra(p, 'luz');
  await boton(p, 'resaltar').tap();
  await tinta(p, '').tap();
  vale('quitar el resaltado de una parte deja resaltado el resto',
       (await comoSeVe(p, 'luz')).fondo === 'rgba(0, 0, 0, 0)' &&
       (await comoSeVe(p, 'amor')).fondo === 'rgb(255, 201, 140)', await editor.innerHTML());

  titulo('agrandar y achicar, solo lo marcado');
  await tocarPalabra(p, 'todos');
  const antes = await comoSeVe(p, 'todos');
  await boton(p, 'agrandar').tap();
  const uno = await comoSeVe(p, 'todos');
  await boton(p, 'agrandar').tap();
  const dos = await comoSeVe(p, 'todos');
  di('tamaños de «todos»', { antes:antes.tam, uno:uno.tam, dos:dos.tam });
  vale('cada toque la agranda', uno.tam > antes.tam && dos.tam > uno.tam);
  vale('y lo de al lado se queda como estaba', (await comoSeVe(p, 'creen')).tam === antes.normal);
  vale('dos toques no anidan dos tamaños: un solo span',
       await editor.evaluate(e => e.querySelectorAll('[data-tam]').length === 1 &&
                                  e.querySelector('[data-tam]').getAttribute('data-tam') === '2'));
  for (let i = 0; i < 6; i++) await boton(p, 'agrandar').tap();
  vale('se para en el más grande', await editor.evaluate(e => e.querySelector('[data-tam]').getAttribute('data-tam') === '3'));
  for (let i = 0; i < 3; i++) await boton(p, 'achicar').tap();
  vale('achicar vuelve al tamaño normal, sin span', await editor.evaluate(e => !e.querySelector('[data-tam]')) &&
       (await comoSeVe(p, 'todos')).tam === antes.normal);
  await tocarPalabra(p, 'hoy');
  await boton(p, 'achicar').tap();
  vale('y achica por debajo del normal', (await comoSeVe(p, 'hoy')).tam < antes.normal);

  titulo('el tipo de letra');
  await tocarPalabra(p, 'para');
  await boton(p, 'tipo').tap();
  const nombres = await p.locator('#notaFormato .nota-paleta .nota-tinta').allTextContents();
  di('las letras', nombres);
  vale('ofrece las tres: la de la nota, Literata y Caveat', nombres.length === 3 &&
       /nota/i.test(nombres[0]) && nombres[1] === 'Literata' && nombres[2] === 'Caveat', nombres.join(' · '));
  await tinta(p, 'caveat').tap();
  vale('«para» en Caveat', /Caveat/.test((await comoSeVe(p, 'para')).letra), (await comoSeVe(p, 'para')).letra);
  await tinta(p, 'literata').tap();
  vale('y en Literata', /Literata/.test((await comoSeVe(p, 'para')).letra));
  await tocarPalabra(p, 'los');
  await tinta(p, 'caveat').tap();
  await tocarPalabra(p, 'los');
  await tinta(p, 'caveat').tap();
  await tinta(p, '').tap();
  vale('«la de la nota» le quita la letra puesta',
       !/Caveat|Literata/.test((await comoSeVe(p, 'los')).letra), (await comoSeVe(p, 'los')).letra);

  titulo('se guarda, vuelve al recargar y viaja en el respaldo');
  await p.waitForTimeout(200);
  let nota = (await guardadas(p))[0];
  di('lo guardado', nota.html);
  vale('el resaltado, el color, el tamaño y la letra se guardan',
       /data-resalte="naranja"/.test(nota.html) && /data-color="rojo"/.test(nota.html) &&
       /data-tam="-1"/.test(nota.html) && /data-letra="literata"/.test(nota.html), nota.html);
  vale('sin un solo style ni class', !/style=|class=/.test(nota.html), nota.html);
  vale('el texto plano sigue igual', nota.texto.trim() === 'Dios es amor y luz para todos los que creen hoy',
       JSON.stringify(nota.texto));
  await verFormato.tap();
  await p.locator('#notaFormato').waitFor({ state:'hidden', timeout:2000 });
  vale('cerrar la barra devuelve la nota a escribirse', await editor.evaluate(e => e.isContentEditable));
  await p.reload(); await ir(p, 'notas');
  await p.locator('#notas .indice-item').first().click();
  vale('al recargar vuelve con sus colores', (await comoSeVe(p, 'Dios')).tinta === 'rgb(179, 38, 30)' &&
       (await comoSeVe(p, 'amor')).fondo === 'rgb(255, 201, 140)' &&
       /Literata/.test((await comoSeVe(p, 'para')).letra) && (await comoSeVe(p, 'hoy')).tam < antes.normal);
  const respaldo = await exportar(p);
  const enRespaldo = respaldo.notas.find(n => n.id === nota.id);
  vale('el respaldo lleva el formato', !!enRespaldo && enRespaldo.html === nota.html,
       enRespaldo && enRespaldo.html);
  const otro = await abrir(), q = otro.pagina;
  await importar(q, respaldo); await ir(q, 'notas');
  await q.locator('#notas .pestanitas [data-nota="' + nota.id + '"]').click();
  await q.waitForTimeout(200);
  vale('y en otro teléfono la nota llega con sus colores',
       await q.locator('#notas .nota-editor:visible [data-color="rojo"]').count() === 1 &&
       await q.locator('#notas .nota-editor:visible [data-resalte="naranja"]').count() === 1);
  vale('el otro navegador no tuvo errores de JavaScript', otro.errores.length === 0, otro.errores);
  await otro.navegador.close();

  titulo('un respaldo con valores inventados no cuela nada');
  await importar(p, { formato:'glossa/marcas', marcas:[], notas:[{ id:'nota-rara', titulo:'Rara',
    texto:'uno dos tres cuatro',
    html:'<span data-color="#f00" style="color:red">uno</span> <span data-resalte="amarillo" onclick="window.__malo=1">dos</span> ' +
         '<span data-tam="99">tres</span> <span data-letra="Comic Sans" class="x">cuatro</span>' }] });
  await ir(p, 'notas');
  await p.locator('#notas .pestanitas [data-nota="nota-rara"]').click();
  await p.waitForTimeout(200);
  const rara = await editor.innerHTML();
  di('limpia', rara);
  vale('solo pasa el valor que está en la lista, sin más atributos',
       rara === 'uno <span data-resalte="amarillo">dos</span> tres cuatro', rara);

  titulo('una nota de antes, sin formato, se sigue viendo igual');
  await importar(p, { formato:'glossa/marcas', marcas:[], notas:[{ id:'nota-vieja', titulo:'Vieja',
    texto:'Línea uno\n  con dos espacios' }] });
  await ir(p, 'notas');
  await p.locator('#notas .pestanitas [data-nota="nota-vieja"]').click();
  vale('su texto llega tal cual', await editor.evaluate(e => e.innerText) === 'Línea uno\n  con dos espacios');

  await cerrar(sesion);
})().catch(e => { console.error(e); process.exit(1); });
