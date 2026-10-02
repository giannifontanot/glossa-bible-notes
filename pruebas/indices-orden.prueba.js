/* MANIJAS DE NOTAS Y ENCUENTROS. El dedo pasa por CDP, no por eventos
   sintéticos: sólo así touch-action puede cancelar de verdad un gesto.
   Las trayectorias tiemblan y los cambios se leen en lista, pestañas y almacén.
   No se llama a ninguna función de la aplicación. */
const { abrir, cerrar, vale, titulo } = require('./comun');
let sesion;

(async () => {
  sesion = await abrir();
  const p = sesion.pagina;
  const cdp = await p.context().newCDPSession(p);
  const abrirSeccion = async seccion => {
    if (!await p.locator('.rollo:visible').count()){
      await p.locator('#pgCabeza').click(); await p.waitForTimeout(900);
    }
    await p.locator('.rollo:visible .pestanas [data-sec="' + seccion + '"]').click();
    await p.waitForTimeout(1200);
  };
  const leer = seccion => p.evaluate(sec => {
    const c = document.getElementById(sec);
    const almacen = localStorage.getItem(sec === 'notas' ? 'glossa:notas:v1' : 'glossa:encuentros:orden:v1');
    let guardado;
    try { guardado = JSON.parse(almacen || 'null'); } catch(_) { guardado = almacen; }
    return { lista:[...c.querySelectorAll('.indice-fila')].map(f => f.dataset.destino),
      tabs:[...c.querySelectorAll('.pestanitas [data-nota], .pestanitas [data-enc]')]
        .map(t => t.dataset.nota || t.dataset.enc),
      numeros:[...c.querySelectorAll('.indice-numero')].map(n => n.textContent),
      indice:c.querySelector('.indice-tab').getAttribute('aria-pressed'),
      primero:c.querySelector('.indice-barra').firstElementChild.classList.contains('indice-tab'),
      guardado,
      aviso:c.querySelector('.indice-aviso').textContent,
      fantasmas:document.querySelectorAll('.indice-fantasma').length };
  }, seccion);
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const tabOrden = dato => igual(dato.lista, dato.tabs) && dato.primero && dato.indice === 'true';
  const guardadoOrden = (dato, sec) => igual(dato.lista,
    sec === 'notas' ? dato.guardado.map(n => n.id) : dato.guardado);

  /* Se separa iniciar de soltar para poder cancelar un movimiento real o
     comprobar que las pestañas YA cambiaron mientras el dedo sigue apoyado. */
  const llevar = async (sec, desde, hasta, dedo = true) => {
    const asas = p.locator('#' + sec + ' .indice-asa');
    await asas.nth(desde).scrollIntoViewIfNeeded();
    const a = await asas.nth(desde).boundingBox();
    const b = await asas.nth(hasta).boundingBox();
    const x = a.x + a.width / 2, y = a.y + a.height / 2;
    const finX = b.x + b.width / 2, finY = b.y + b.height / 2;
    if (dedo) await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y, id:1 }] });
    else { await p.mouse.move(x, y); await p.mouse.down(); }
    for (let i = 1; i <= 12; i++){
      const px = x + (finX - x) * i / 12 + (i % 2 ? 2 : -2);
      const py = y + (finY - y) * i / 12;
      if (dedo) await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:px, y:py, id:1 }] });
      else await p.mouse.move(px, py);
      await p.waitForTimeout(25);
    }
  };
  const soltar = async (dedo = true, cancelar = false) => {
    if (dedo) await cdp.send('Input.dispatchTouchEvent', { type:cancelar ? 'touchCancel' : 'touchEnd', touchPoints:[] });
    else await p.mouse.up();
    await p.waitForTimeout(350);
  };

  await abrirSeccion('notas');
  titulo('el asa es un botón separado, y activarla sin pointerdown no abre una nota');
  await p.locator('#notas .indice-asa').first().press('Enter');
  vale('la activación de teclado conserva abierto el índice',
       (await leer('notas')).indice === 'true' && await p.locator('#notas .nota-editor:visible').count() === 0);
  const mando = await p.locator('#notas .indice-asa').first().evaluate(a => ({
    etiqueta:a.tagName, anidado:!!a.parentElement.closest('button'),
    nombre:a.getAttribute('aria-label'), ancho:a.getBoundingClientRect().width,
    alto:a.getBoundingClientRect().height, toque:getComputedStyle(a).touchAction
  }));
  vale('el asa tiene nombre, blanco táctil y touch-action:none',
       mando.etiqueta === 'BUTTON' && !mando.anidado && mando.nombre.includes('Mover Nota 1') &&
       mando.ancho >= 40 && mando.alto >= 44 && mando.toque === 'none', mando);
  await p.locator('#notas .indice-item').first().click();
  await p.locator('#notas .nota-editor:visible').fill('Contenido intacto de la nota 1.');
  for (let i = 2; i <= 8; i++){
    await p.locator('#notas .nota-mas').click();
    await p.locator('#notas .nota-editor:visible').fill('Contenido intacto de la nota ' + i + '.');
  }
  await p.locator('#notas .indice-tab').click();
  const notasIniciales = (await leer('notas')).guardado;
  const finales = {};

  for (const sec of ['notas', 'encuentros']){
    await abrirSeccion(sec);
    const inicial = await leer(sec);
    titulo(sec + ': el dedo cambia lista y pestañas, sin abrir hojas');
    await llevar(sec, 0, 1);
    const previa = await leer(sec);
    const esperado = inicial.lista.slice(); [esperado[0], esperado[1]] = [esperado[1], esperado[0]];
    vale('las pestañas se sincronizan durante el arrastre',
         igual(previa.lista, esperado) && tabOrden(previa) && previa.fantasmas === 1, previa);
    vale('no se guarda una posición provisional antes de soltar', igual(previa.guardado, inicial.guardado));
    await soltar();
    const movido = await leer(sec);
    vale('al soltar se guarda el orden y desaparece la tarjeta flotante',
         tabOrden(movido) && guardadoOrden(movido, sec) && movido.fantasmas === 0, movido);

    titulo(sec + ': el ratón también cambia el orden');
    await llevar(sec, 1, 0, false); await soltar(false);
    const raton = await leer(sec);
    vale('el arrastre físico de ratón devuelve el orden original',
         igual(raton.lista, inicial.lista) && tabOrden(raton) && guardadoOrden(raton, sec), raton);

    titulo(sec + ': las flechas y Fin reordenan con foco y aviso accesible');
    await p.emulateMedia({ reducedMotion:'reduce' });
    await p.locator('#' + sec + ' .indice-asa').first().press('ArrowDown');
    const flecha = await leer(sec);
    vale('la flecha actualiza las dos listas y anuncia la posición',
         igual(flecha.lista, esperado) && tabOrden(flecha) && flecha.aviso.includes('posición 2'), flecha);
    await p.locator('#' + sec + ' .indice-asa').nth(1).press('Home');
    await p.locator('#' + sec + ' .indice-asa').first().press('End');
    const teclado = await leer(sec);
    vale('Fin mueve al último lugar y renumera las entradas',
         igual(teclado.lista, inicial.lista.slice(1).concat(inicial.lista[0])) &&
         teclado.numeros.every((n, i) => n === String(i + 1).padStart(2, '0')) &&
         tabOrden(teclado) && guardadoOrden(teclado, sec), teclado);
    vale('el foco sigue en la manija de la entrada movida',
         await p.locator('#' + sec + ' .indice-asa').last().evaluate(a => a === document.activeElement));
    await p.emulateMedia({ reducedMotion:'no-preference' });

    titulo(sec + ': cancelar no persiste ni deja las pestañas en un orden provisional');
    await llevar(sec, 0, 1); await soltar(true, true);
    const cancelado = await leer(sec);
    vale('pointercancel devuelve índice, pestañas y almacén al orden anterior',
         igual(cancelado.lista, teclado.lista) && tabOrden(cancelado) &&
         igual(cancelado.guardado, teclado.guardado) && cancelado.fantasmas === 0, cancelado);
    await llevar(sec, 0, 1, false);
    await p.keyboard.press('Escape'); await soltar(false);
    const escape = await leer(sec);
    vale('Escape cancela el arrastre sin cerrar el panel ni abrir una hoja',
         igual(escape.lista, teclado.lista) && tabOrden(escape) &&
         igual(escape.guardado, teclado.guardado) && escape.fantasmas === 0, escape);
    titulo(sec + ': un fallo del almacén no se presenta como orden guardado');
    await p.evaluate(clave => {
      window.__guardarOrdenOriginal = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, v){
        if (k === clave) throw new DOMException('Almacén lleno', 'QuotaExceededError');
        return window.__guardarOrdenOriginal.call(this, k, v);
      };
    }, sec === 'notas' ? 'glossa:notas:v1' : 'glossa:encuentros:orden:v1');
    await p.locator('#' + sec + ' .indice-asa').first().press('ArrowDown');
    const sinGuardar = await leer(sec);
    vale('lista y pestañas cambian, pero el aviso aclara que no se pudo guardar',
         !igual(sinGuardar.lista, escape.lista) && tabOrden(sinGuardar) &&
         igual(sinGuardar.guardado, escape.guardado) && sinGuardar.aviso.includes('No se pudo guardar'), sinGuardar);
    await p.evaluate(() => {
      Storage.prototype.setItem = window.__guardarOrdenOriginal;
      delete window.__guardarOrdenOriginal;
    });
    if (sec === 'notas'){
      await abrirSeccion('respaldo');
      const esperando = p.waitForEvent('download');
      await p.locator('#btnExportar').click();
      const descarga = await esperando;
      let texto = '';
      for await (const trozo of await descarga.createReadStream()) texto += trozo.toString();
      const exportado = JSON.parse(texto);
      vale('exportar rescata el orden actual desde la memoria aunque no se guardó',
           igual(exportado.notas.map(n => n.id), sinGuardar.lista) && exportado.totalNotas === 8);
      await abrirSeccion('notas');
    }
    await p.locator('#' + sec + ' .indice-asa').nth(1).press('ArrowUp');
    const recuperado = await leer(sec);
    vale('al recuperarse el almacén vuelve a guardar sin perder ninguna entrada',
         igual(recuperado.lista, escape.lista) && tabOrden(recuperado) && guardadoOrden(recuperado, sec), recuperado);
    finales[sec] = escape.lista;
    if (sec === 'encuentros'){
      vale('reordenar no solicita relatos ni hace visible el encuentro oculto',
           await p.locator('#encuentros .enc-marco').evaluateAll(ms => ms.every(m => !m.getAttribute('src'))) &&
           !escape.lista.includes('espalda'));
    }
  }

  titulo('una lista larga se desplaza al sostener el dedo junto al borde');
  await abrirSeccion('notas');
  const primera = p.locator('#notas .indice-asa').first();
  await primera.scrollIntoViewIfNeeded();
  const a = await primera.boundingBox(), caja = await p.locator('#notas .indice-pagina').boundingBox();
  const scrollAntes = await p.locator('#notas .indice-pagina').evaluate(e => e.scrollTop);
  const idAntes = (await leer('notas')).lista[0];
  const x = a.x + a.width / 2, y = a.y + a.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y, id:1 }] });
  for (let i = 1; i <= 12; i++){
    await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{
      x:x + (i % 2 ? 2 : -2), y:y + (caja.y + caja.height - 12 - y) * i / 12, id:1
    }] });
    await p.waitForTimeout(25);
  }
  await p.waitForTimeout(1000);
  const scrollDespues = await p.locator('#notas .indice-pagina').evaluate(e => e.scrollTop);
  await soltar();
  const largo = await leer('notas');
  vale('el borde desplaza la página y permite alcanzar entradas posteriores',
       scrollDespues > scrollAntes + 40 && largo.lista.indexOf(idAntes) > 0 &&
       tabOrden(largo) && guardadoOrden(largo, 'notas'), { scrollAntes, scrollDespues, largo });
  finales.notas = largo.lista;
  vale('ningún arrastre cambió los títulos ni el contenido de las notas',
       igual(largo.guardado.slice().sort((a,b) => a.id.localeCompare(b.id)),
         notasIniciales.slice().sort((a,b) => a.id.localeCompare(b.id))));

  titulo('los dos órdenes sobreviven a recargar');
  await p.reload();
  for (const sec of ['notas', 'encuentros']){
    await abrirSeccion(sec);
    const recargado = await leer(sec);
    vale(sec + ': la lista y las pestañas recuperan el orden guardado',
         igual(recargado.lista, finales[sec]) && tabOrden(recargado), recargado);
  }
  titulo('un orden de Encuentros antiguo o dañado no borra historias');
  for (const valor of ['["agua","agua","espalda","desconocido"]', '{"no":"es una lista"}', 'no es JSON']){
    await p.evaluate(v => localStorage.setItem('glossa:encuentros:orden:v1', v), valor);
    await p.reload(); await abrirSeccion('encuentros');
    const listas = await leer('encuentros');
    const esperado = valor.startsWith('[') ? ['agua', 'zaqueo', 'samaritana', 'centurion'] :
      ['zaqueo', 'samaritana', 'agua', 'centurion'];
    vale('se conservan los cuatro visibles ante ' + valor,
         igual(listas.lista, esperado) && new Set(listas.lista).size === 4 &&
         !listas.lista.includes('espalda') && igual(listas.lista, listas.tabs), listas);
  }
  titulo('el arrastre funciona también entre columnas en pantalla ancha');
  await p.setViewportSize({ width:1100, height:820 }); await p.waitForTimeout(800);
  const anchoAntes = await leer('encuentros');
  const casillas = await p.locator('#encuentros .indice-fila').evaluateAll(fs =>
    fs.slice(0, 2).map(f => ({ x:f.getBoundingClientRect().left, y:f.getBoundingClientRect().top })));
  vale('(la prueba es válida) hay dos columnas para arrastrar de lado',
       Math.abs(casillas[0].x - casillas[1].x) > 20, casillas);
  await llevar('encuentros', 0, 1, false); await soltar(false);
  const anchoDespues = await leer('encuentros');
  const anchoEsperado = anchoAntes.lista.slice();
  [anchoEsperado[0], anchoEsperado[1]] = [anchoEsperado[1], anchoEsperado[0]];
  vale('el movimiento horizontal sincroniza las columnas y las pestañas',
       igual(anchoDespues.lista, anchoEsperado) && tabOrden(anchoDespues) &&
       guardadoOrden(anchoDespues, 'encuentros'), anchoDespues);
  titulo('reordenar no recarga un relato que ya estaba abierto');
  await p.locator('#encuentros .indice-item').first().click();
  await p.waitForFunction(() => {
    const m = document.querySelector('#encuentros .enc-hoja:not([hidden]) .enc-marco');
    return m?.contentDocument?.URL !== 'about:blank' && m?.contentDocument?.readyState === 'complete';
  });
  const marco = await p.locator('#encuentros .enc-hoja:visible .enc-marco').elementHandle();
  const documento = await marco.evaluateHandle(m => m.contentDocument);
  await p.locator('#encuentros .indice-tab').click();
  await p.locator('#encuentros .indice-asa').first().press('ArrowDown');
  vale('el marco conserva el mismo documento tras mover su pestaña',
       await marco.evaluate((m, d) => m.isConnected && m.contentDocument === d, documento));
  await documento.dispose(); await marco.dispose();
  await cerrar(sesion);
})().catch(async e => { console.error(e); await sesion?.navegador.close(); process.exitCode = 1; });
