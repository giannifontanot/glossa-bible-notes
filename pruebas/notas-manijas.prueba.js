/* NOTAS: LAS MANIJAS DE LO MARCADO, EL INTERRUPTOR DEL ESTILO Y DESHACER.

   Lo que pidió Gianni después de estrenar el modo formato:
   1. Que la selección no marque cosas raras: «muchísimas más palabras de las
      que yo elegí». Era el segundo toque, que marcaba todo lo de en medio.
      Ahora cada toque marca su palabra y nada más.
   2. Manijas en las puntas de lo marcado, para estirarlo o encogerlo, como
      las del teléfono, sin teclado ni menú de copiar.
   3. Un interruptor dentro de la barra: encendido se da estilo a toques,
      apagado se escribe con la barra abierta. Al abrir la barra, encendido.
   4. Deshacer y rehacer, cinco pasos, «solo el estilo»: lo escrito no entra.

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
  const interruptor = p.locator('#notaFormato .nota-interruptor');

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
  const deLaManija = await manija(p, 'ini');
  await p.touchscreen.tap(Math.round(deLaManija.x), Math.round(deLaManija.y + 12));
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

  titulo('el interruptor del estilo');
  await verFormato.tap();
  await p.locator('#notaFormato').waitFor({ state:'hidden', timeout:2000 });
  await verFormato.tap(); await p.waitForTimeout(400);
  vale('al abrir la barra nace encendido', await interruptor.getAttribute('aria-checked') === 'true');
  vale('y con él encendido la nota no se escribe', await editor.evaluate(e => !e.isContentEditable));
  await tocarPalabra(p, 'Bendito');
  await interruptor.tap(); await p.waitForTimeout(150);
  const apagado = await editor.evaluate(e => ({ editable:e.isContentEditable, teclado:e.getAttribute('inputmode'),
    seleccion:getComputedStyle(e).userSelect }));
  di('con el estilo apagado', apagado);
  vale('apagado, la nota se escribe y pide teclado otra vez',
       apagado.editable && apagado.teclado === null && apagado.seleccion !== 'none', JSON.stringify(apagado));
  vale('la barra sigue abierta', await p.locator('#notaFormato').isVisible());
  vale('lo marcado se suelta y las manijas se van',
       await marcado(p) === '' && !await manija(p, 'ini') && !await manija(p, 'fin'));
  vale('los botones del estilo se ven apagados',
       await p.locator('#notaFormato').evaluate(f => f.classList.contains('escribiendo')));
  await editor.tap();
  await p.keyboard.press('Control+End');
  await p.keyboard.type(' y amén');
  await p.waitForTimeout(150);
  vale('se escribe con la barra abierta', /paz y amén$/.test(await editor.evaluate(e => e.innerText.trim())),
       await editor.evaluate(e => e.innerText));
  const conNegrita = await negritas(p);
  await boton(p, 'bold').tap();
  vale('apagado, la negrita no da formato', await negritas(p) === conNegrita, await negritas(p));
  vale('apagado, tocar una palabra no la marca', (await tocarPalabra(p, 'amén'), await marcado(p)) === '');
  await interruptor.tap(); await p.waitForTimeout(150);
  vale('encendido otra vez, la nota vuelve a no escribirse',
       await editor.evaluate(e => !e.isContentEditable && e.getAttribute('inputmode') === 'none' &&
                                 document.activeElement !== e));
  await tocarPalabra(p, 'amén');
  vale('y se marca a toques', await marcado(p) === 'amén', await marcado(p));

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
  await interruptor.tap(); await p.waitForTimeout(150);
  await editor.tap();
  await p.keyboard.press('Control+End');
  await p.keyboard.type(' siete');
  await p.waitForTimeout(150);
  vale('escribir vacía deshacer y rehacer: no se puede volver a antes de lo escrito',
       await boton(p, 'deshacer').isDisabled() && await boton(p, 'rehacer').isDisabled());
  vale('y lo escrito se queda', /seis siete$/.test(await editor.evaluate(e => e.innerText.trim())));

  await cerrar(sesion);
})().catch(e => { console.error(e); process.exit(1); });
