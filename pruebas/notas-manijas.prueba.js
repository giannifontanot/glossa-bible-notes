/* NOTAS: LAS MANIJAS DE LO MARCADO, EL INTERRUPTOR DEL ESTILO Y DESHACER.

   Lo que pidió Gianni después de estrenar el modo formato:
   1. Que la selección no marque cosas raras: «muchísimas más palabras de las
      que yo elegí». Era el segundo toque, que marcaba todo lo de en medio.
      Ahora cada toque marca su palabra y nada más.
   2. Manijas en las puntas de lo marcado, para estirarlo o encogerlo, como
      las del teléfono, sin teclado ni menú de copiar.
   3. El lápiz es el interruptor: con la barra abierta se da estilo a
      toques, con la barra cerrada se escribe. (Hubo un interruptor «Estilo»
      dentro de la barra; Gianni pidió quitarlo, decía lo mismo dos veces.)
      Y con la barra abierta, un toque en el espacio en blanco suelta lo
      marcado, sin cursor ni teclado.
   4. Deshacer y rehacer, cinco pasos, «solo el estilo»: lo escrito no entra.
   5. La brocha de copiar formato, como la de Word, que cuenta para deshacer.

   Todo con el dedo: toques de verdad sobre las palabras, y las manijas
   arrastradas con PointerEvent de tipo touch y un camino torcido. Una de
   ellas, sin pointerdown, que es lo que a veces no llega de un teléfono. */
const { abrir, cerrar, di, vale, titulo, arrastrarManija } = require('./comun');

async function ir(p, seccion){
  if (await p.locator('#' + seccion).isVisible()) return;
  if (!await p.locator('.rollo:visible .pestanas').count()){
    await p.locator('#pgCabeza').click(); await p.waitForTimeout(900);
  }
  await p.locator('.rollo:visible .pestanas [data-sec="' + seccion + '"]').click();
  await p.locator('#' + seccion).waitFor({ state:'visible' });
  await p.waitForTimeout(650);
}
const guardadas = p => p.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1') || '[]'));
const dondeEsta = (p, palabra) => p.evaluate(palabra => {
  const ed = document.querySelector('#notas .nota-hoja:not([hidden]) .nota-editor');
  const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()){
    const re = new RegExp('(^|[^\\p{L}])' + palabra + '(?![\\p{L}])', 'u');
    const m = re.exec(n.nodeValue); if (!m) continue;
    const i = m.index + m[1].length;
    const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + palabra.length);
    const c = r.getClientRects()[0];
    return { x:Math.round(c.left + c.width * .56), y:Math.round(c.top + c.height * .47),
             izq:c.left, der:c.right, abajo:c.bottom };
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
const manija = (p, punta) => p.evaluate(punta => {
  const m = document.querySelector('#notas .nota-manija[data-punta="' + punta + '"]');
  if (!m || m.hidden) return null;
  const c = m.getBoundingClientRect();
  return { x:c.left + 22, y:c.top };
}, punta);
const boton = (p, orden) => p.locator('#notaFormato [data-orden="' + orden + '"]');
const negritas = p => p.evaluate(() =>
  [...document.querySelectorAll('#notas .nota-hoja:not([hidden]) .nota-editor b')].map(b => b.textContent).join(' '));

(async () => {
  const sesion = await abrir(), p = sesion.pagina;
  const editor = p.locator('#notas .nota-editor:visible');
  const verFormato = p.locator('#notas .nota-ver-formato');

  await ir(p, 'notas');
  await p.locator('#notas .indice-item').first().click();
  await editor.tap();
  await editor.fill('');
  await p.keyboard.type('Bendito sea el Señor que nos guía cada día con su paz');
  await p.waitForTimeout(150);
  await verFormato.tap(); await p.waitForTimeout(400);

  titulo('un toque en otra palabra marca solo esa');
  await tocarPalabra(p, 'sea');
  vale('el primer toque marca «sea»', await marcado(p) === 'sea', await marcado(p));
  await tocarPalabra(p, 'guía');
  vale('el segundo, en otra palabra, marca solo «guía» y no lo de en medio',
       await marcado(p) === 'guía', await marcado(p));
  await tocarPalabra(p, 'día');
  vale('y el tercero, solo «día»', await marcado(p) === 'día', await marcado(p));
  await tocarPalabra(p, 'día');
  vale('tocar otra vez la recién marcada la suelta', await marcado(p) === '', await marcado(p));
  vale('sin nada marcado no hay manijas', !await manija(p, 'ini') && !await manija(p, 'fin'));

  titulo('las manijas estiran y encogen lo marcado');
  await tocarPalabra(p, 'Señor');
  const ini = await manija(p, 'ini'), fin = await manija(p, 'fin'), senor = await dondeEsta(p, 'Señor');
  di('las manijas de «Señor»', { ini, fin, palabra:senor });
  vale('salen las dos, debajo de la primera letra y de la última',
       ini && fin && Math.abs(ini.x - senor.izq) < 3 && Math.abs(fin.x - senor.der) < 3 &&
       Math.abs(ini.y - senor.abajo) < 3 && Math.abs(fin.y - senor.abajo) < 3, JSON.stringify({ ini, fin, senor }));
  await arrastrarManija(p, 'fin', 'guía');
  vale('la de detrás la estira hasta «guía», de palabra entera en palabra entera',
       await marcado(p) === 'Señor que nos guía', await marcado(p));
  await arrastrarManija(p, 'ini', 'sea');
  vale('la de delante la estira hacia atrás hasta «sea»',
       await marcado(p) === 'sea el Señor que nos guía', await marcado(p));
  await arrastrarManija(p, 'fin', 'que');
  vale('y la de detrás la encoge hasta «que»', await marcado(p) === 'sea el Señor que', await marcado(p));
  /* La de delante, llevada más allá de la de detrás, se queda antes: lo
     marcado sigue acabando en «que» y nunca se queda vacío. */
  await arrastrarManija(p, 'ini', 'paz');
  const cruzado = await marcado(p);
  vale('la de delante no pasa de la de detrás', /que$/.test(cruzado) && cruzado.length >= 3, cruzado);
  await arrastrarManija(p, 'ini', 'sea');
  vale('y vuelve atrás sin problema', await marcado(p) === 'sea el Señor que', await marcado(p));
  const finAhora = await manija(p, 'fin'), que = await dondeEsta(p, 'que');
  vale('la manija acompaña a la punta nueva', finAhora && Math.abs(finAhora.x - que.der) < 3,
       JSON.stringify({ finAhora, que }));
  await boton(p, 'bold').tap();
  vale('y la negrita cae en lo estirado', await negritas(p) === 'sea el Señor que', await negritas(p));

  titulo('la manija se arrastra aunque no llegue pointerdown');
  await tocarPalabra(p, 'cada');
  await arrastrarManija(p, 'fin', 'paz', { sinApoyo:true });
  vale('solo con los movimientos del dedo, lo marcado llega a «paz»',
       await marcado(p) === 'cada día con su paz', await marcado(p));

  titulo('tocar una manija no marca nada ni saca el menú');
  const antes = await marcado(p);
  /* La de detrás de «paz», que es lo último de la nota: debajo y a la derecha
     no hay ninguna palabra, así que el toque solo da en la manija. */
  const deLaManija = await manija(p, 'fin');
  await p.touchscreen.tap(Math.round(deLaManija.x + 14), Math.round(deLaManija.y + 14));
  await p.waitForTimeout(150);
  vale('un toque en la manija deja lo marcado como estaba', await marcado(p) === antes, await marcado(p));
  const sinMenu = await p.evaluate(() => {
    const m = document.querySelector('#notas .nota-manija[data-punta="fin"]'), c = m.getBoundingClientRect();
    const ev = new MouseEvent('contextmenu', { bubbles:true, cancelable:true, clientX:c.left + 22, clientY:c.top + 12, button:2 });
    m.dispatchEvent(ev); return ev.defaultPrevented;
  });
  vale('y el toque largo en ella no saca el menú', sinMenu);
  vale('la nota sigue sin escribirse y sin foco',
       await editor.evaluate(e => !e.isContentEditable && document.activeElement !== e));

  titulo('el lápiz es el interruptor del estilo');
  vale('ya no hay interruptor dentro de la barra', await p.locator('#notaFormato .nota-interruptor').count() === 0);
  await tocarPalabra(p, 'Bendito');
  await verFormato.tap();
  await p.locator('#notaFormato').waitFor({ state:'hidden', timeout:2000 });
  const cerrada = await editor.evaluate(e => ({ editable:e.isContentEditable, teclado:e.getAttribute('inputmode'),
    seleccion:getComputedStyle(e).userSelect }));
  di('con el lápiz cerrado', cerrada);
  vale('lápiz cerrado: la nota se escribe y pide teclado otra vez',
       cerrada.editable && cerrada.teclado === null && cerrada.seleccion !== 'none', JSON.stringify(cerrada));
  vale('lo marcado se suelta y las manijas se van',
       await marcado(p) === '' && !await manija(p, 'ini') && !await manija(p, 'fin'));
  await editor.tap();
  await p.keyboard.press('Control+End');
  await p.keyboard.type(' y amén');
  await p.waitForTimeout(150);
  vale('se escribe', /paz y amén$/.test(await editor.evaluate(e => e.innerText.trim())),
       await editor.evaluate(e => e.innerText));
  await verFormato.tap(); await p.waitForTimeout(400);
  vale('lápiz abierto: la nota vuelve a no escribirse',
       await editor.evaluate(e => !e.isContentEditable && e.getAttribute('inputmode') === 'none' &&
                                 document.activeElement !== e));
  await tocarPalabra(p, 'amén');
  vale('y se marca a toques', await marcado(p) === 'amén', await marcado(p));

  /* Lo que pidió Gianni: «un toque en un lugar donde hay espacio en blanco
     quita la selección». Solo la quita: ni cursor ni teclado. */
  titulo('un toque en el espacio en blanco suelta lo marcado');
  await tocarPalabra(p, 'guía');
  vale('«guía» marcada', await marcado(p) === 'guía', await marcado(p));
  const blanco = await editor.evaluate(e => {
    const c = e.getBoundingClientRect();
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let ultimo = null;
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim()) ultimo = n;
    const r = document.createRange(); r.selectNodeContents(ultimo);
    const fin = [...r.getClientRects()].at(-1);
    return { x:Math.round(Math.min(c.right - 8, fin.right + 40)), y:Math.round(fin.top + fin.height / 2),
             hueco:c.right - fin.right };
  });
  di('el toque en blanco, a la derecha del último renglón', blanco);
  vale('(la prueba es válida) queda hueco a la derecha', blanco.hueco > 50, blanco.hueco);
  await p.touchscreen.tap(blanco.x, blanco.y);
  await p.waitForTimeout(150);
  vale('suelta lo marcado y las manijas se van',
       await marcado(p) === '' && !await manija(p, 'ini') && !await manija(p, 'fin'), await marcado(p));
  vale('y no pone cursor ni sube el teclado',
       await editor.evaluate(e => !e.isContentEditable && document.activeElement !== e &&
                                 e.getAttribute('inputmode') === 'none'));
  vale('la barra sigue abierta', await p.locator('#notaFormato').isVisible());
  await tocarPalabra(p, 'guía');
  vale('y otro toque en una palabra la marca otra vez', await marcado(p) === 'guía', await marcado(p));

  titulo('deshacer y rehacer, cinco pasos, solo el estilo');
  await verFormato.tap();
  await p.locator('#notaFormato').waitFor({ state:'hidden', timeout:2000 });
  await editor.tap();
  await editor.fill('');
  await p.keyboard.type('uno dos tres cuatro cinco seis');
  await p.waitForTimeout(150);
  await verFormato.tap(); await p.waitForTimeout(400);
  vale('sin estilo puesto, deshacer y rehacer están apagados',
       await boton(p, 'deshacer').isDisabled() && await boton(p, 'rehacer').isDisabled());
  for (const palabra of ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis']){
    await tocarPalabra(p, palabra);
    await boton(p, 'bold').tap();
  }
  vale('seis negritas puestas', await negritas(p) === 'uno dos tres cuatro cinco seis', await negritas(p));
  await boton(p, 'deshacer').tap();
  vale('deshacer quita la última', await negritas(p) === 'uno dos tres cuatro cinco', await negritas(p));
  vale('y vuelve a marcar lo que estaba marcado entonces', await marcado(p) === 'seis', await marcado(p));
  for (let i = 0; i < 4; i++) await boton(p, 'deshacer').tap();
  vale('cinco deshacer quitan cinco', await negritas(p) === 'uno', await negritas(p));
  vale('y ahí se para: recuerda cinco pasos', await boton(p, 'deshacer').isDisabled());
  await p.waitForTimeout(150);
  vale('lo deshecho se guarda', ((await guardadas(p))[0].html.match(/<b>/g) || []).length === 1,
       (await guardadas(p))[0].html);
  await boton(p, 'rehacer').tap();
  await boton(p, 'rehacer').tap();
  vale('rehacer las vuelve a poner, una a una', await negritas(p) === 'uno dos tres', await negritas(p));
  await tocarPalabra(p, 'seis');
  await boton(p, 'italic').tap();
  vale('un estilo nuevo apaga rehacer', await boton(p, 'rehacer').isDisabled());
  await boton(p, 'deshacer').tap();
  vale('y deshacer quita ese estilo nuevo', await editor.evaluate(e => !e.querySelector('i')));
  vale('lo escrito no se toca: el texto sigue entero',
       await editor.evaluate(e => e.innerText.trim()) === 'uno dos tres cuatro cinco seis');
  await verFormato.tap();
  await p.locator('#notaFormato').waitFor({ state:'hidden', timeout:2000 });
  await editor.tap();
  await p.keyboard.press('Control+End');
  await p.keyboard.type(' siete');
  await p.waitForTimeout(150);
  await verFormato.tap(); await p.waitForTimeout(400);
  vale('escribir vacía deshacer y rehacer: no se puede volver a antes de lo escrito',
       await boton(p, 'deshacer').isDisabled() && await boton(p, 'rehacer').isDisabled());
  vale('y lo escrito se queda', /seis siete$/.test(await editor.evaluate(e => e.innerText.trim())));

  /* La caja de la manija es grande, para el dedo, y cae sobre la línea de
     abajo. Un toque en una palabra de esa línea daba en la manija y no
     marcaba nada (lo vio la revisión de la PR). Ahora la manija deja pasar
     el toque a la palabra que tiene debajo. */
  titulo('un toque en la palabra que tapa la manija la marca');
  await verFormato.tap();
  await p.locator('#notaFormato').waitFor({ state:'hidden', timeout:2000 });
  await editor.tap();
  await editor.fill('');
  await p.keyboard.type('uno');
  await p.keyboard.press('Enter');
  await p.keyboard.type('dos');
  await p.waitForTimeout(150);
  await verFormato.tap(); await p.waitForTimeout(400);
  await tocarPalabra(p, 'uno');
  vale('marca «uno»', await marcado(p) === 'uno', await marcado(p));
  const dos = await dondeEsta(p, 'dos');
  const punto = { x:Math.round(dos.izq + 5), y:Math.round(dos.abajo - 6) };
  const debajo = await p.evaluate(({ x, y }) => {
    const e = document.elementFromPoint(x, y);
    return e && e.closest('.nota-manija') ? 'manija' : (e ? e.className : '');
  }, punto);
  di('lo que hay bajo el dedo, encima de «dos»', debajo);
  vale('el toque cae en la caja de la manija', debajo === 'manija', debajo);
  await p.touchscreen.tap(punto.x, punto.y);
  await p.waitForTimeout(150);
  vale('y marca «dos», la palabra de debajo', await marcado(p) === 'dos', await marcado(p));

  /* LA BROCHA, como la de Word: se marca una palabra con el estilo que
     gusta, se toca la brocha, y cada palabra que se toca después sale con
     ese estilo hasta que se vuelve a tocar la brocha. Pintar pone ESE
     estilo, no lo suma: lo que sobra se quita. */
  titulo('la brocha copia el formato y lo pinta a toques');
  await verFormato.tap();
  await p.locator('#notaFormato').waitFor({ state:'hidden', timeout:2000 });
  await editor.tap();
  await editor.fill('');
  await p.keyboard.type('Gracia sobre gracia para todo aquel que cree');
  await p.waitForTimeout(150);
  await verFormato.tap(); await p.waitForTimeout(400);
  const brocha = boton(p, 'brocha');
  const estiloDe = palabra => p.evaluate(palabra => {
    const ed = document.querySelector('#notas .nota-hoja:not([hidden]) .nota-editor');
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    let letras = [];
    for (let n = w.nextNode(); n; n = w.nextNode()){
      const re = new RegExp('(^|[^\\p{L}])(' + palabra + ')(?![\\p{L}])', 'u');
      if (!re.test(n.nodeValue) && !letras.length) continue;
      letras.push(n);
      if (re.test(n.nodeValue)) break;
    }
    const n = letras.at(-1); if (!n) return null;
    const de = sel => !!n.parentElement.closest(sel) && ed.contains(n.parentElement.closest(sel));
    const dato = d => { const e = n.parentElement.closest('[' + d + ']'); return e && ed.contains(e) ? e.getAttribute(d) : null; };
    return [de('b, strong') ? 'B' : '', de('i, em') ? 'I' : '', dato('data-resalte') || '', dato('data-color') || ''].join('/');
  }, palabra);
  await brocha.tap();
  vale('sin nada marcado, la brocha no se pone', await brocha.getAttribute('aria-pressed') === 'false');
  await tocarPalabra(p, 'Gracia');
  await boton(p, 'bold').tap();
  await boton(p, 'resaltar').tap();
  await p.locator('#notaFormato .nota-tinta[data-valor="amarillo"]').tap();
  await boton(p, 'resaltar').tap();
  vale('«Gracia» en negrita y amarilla', await estiloDe('Gracia') === 'B//amarillo/', await estiloDe('Gracia'));
  await brocha.tap();
  vale('tocar la brocha la pone: se ve hundida', await brocha.getAttribute('aria-pressed') === 'true');
  vale('y suelta lo marcado, para que lo próximo se pinte', await marcado(p) === '', await marcado(p));
  await tocarPalabra(p, 'todo');
  vale('un toque en «todo» le pone el mismo estilo', await estiloDe('todo') === 'B//amarillo/', await estiloDe('todo'));
  await tocarPalabra(p, 'cree');
  vale('y otro en «cree», también: la brocha sigue puesta',
       await estiloDe('cree') === 'B//amarillo/' && await brocha.getAttribute('aria-pressed') === 'true', await estiloDe('cree'));
  vale('lo de en medio no se tocó', await estiloDe('aquel') === '///', await estiloDe('aquel'));
  await boton(p, 'deshacer').tap();
  vale('pintar cuenta para deshacer: «cree» vuelve a estar sin estilo', await estiloDe('cree') === '///', await estiloDe('cree'));
  vale('y «todo» sigue pintado', await estiloDe('todo') === 'B//amarillo/', await estiloDe('todo'));
  await brocha.tap();
  vale('tocar la brocha otra vez la quita', await brocha.getAttribute('aria-pressed') === 'false');
  await tocarPalabra(p, 'para');
  vale('y ya un toque solo marca, sin pintar',
       await marcado(p) === 'para' && await estiloDe('para') === '///', await estiloDe('para'));

  titulo('la brocha pone el estilo exacto: lo que sobra se quita');
  await tocarPalabra(p, 'aquel');
  await brocha.tap();
  await tocarPalabra(p, 'todo');
  vale('copiado de una palabra sin nada, «todo» pierde la negrita y el amarillo',
       await estiloDe('todo') === '///', await estiloDe('todo'));
  await brocha.tap();
  await p.waitForTimeout(150);
  const html = (await guardadas(p))[0].html;
  vale('lo pintado se guarda', (html.match(/<b>/g) || []).length === 1 && /data-resalte="amarillo"/.test(html), html);

  titulo('cerrar el lápiz suelta la brocha');
  await tocarPalabra(p, 'Gracia');
  await brocha.tap();
  vale('puesta', await brocha.getAttribute('aria-pressed') === 'true');
  await verFormato.tap();
  await p.locator('#notaFormato').waitFor({ state:'hidden', timeout:2000 });
  await verFormato.tap(); await p.waitForTimeout(400);
  vale('al volver a abrir, la brocha está quitada', await brocha.getAttribute('aria-pressed') === 'false');
  await tocarPalabra(p, 'cree');
  vale('y un toque solo marca', await marcado(p) === 'cree' && await estiloDe('cree') === '///', await estiloDe('cree'));

  await cerrar(sesion);
})().catch(e => { console.error(e); process.exit(1); });
