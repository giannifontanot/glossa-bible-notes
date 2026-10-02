/* NOTAS: EL CUADERNO QUE VIVE JUNTO A GLOSAS.

   Se vigila el recorrido entero: abrir la sección, crear una pestaña, escribir
   en ella, ponerle nombre con doble clic y comprobar que el almacén conserva
   las dos piezas. Una prueba que sólo mira el textarea no caza el fallo más
   probable: que la tira se redibuje al renombrar y se lleve el texto. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');
const { probarMovimientoIndice } = require('./tira-indice');

const IR_A = `async sec => {
  const pausa = ms => new Promise(z => setTimeout(z, ms));
  const visible = () => [...document.querySelectorAll('.rollo')]
    .find(r => getComputedStyle(r).display !== 'none');
  if (!visible()){ document.getElementById('pgCabeza').click(); await pausa(900); }
  const t = (visible() || document).querySelector('.pestanas [data-sec="' + sec + '"]');
  if (!t) return false;
  t.click(); await pausa(1200); return true;
}`;

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  const abrirNotas = async pagina => {
    await pagina.evaluate(`(${IR_A})('notas')`);
    if (await pagina.locator('#notas .indice-pagina').isVisible())
      await pagina.locator('#notas .pestanitas [data-nota]').first().click();
  };
  titulo('una nota nueva conserva su título y su texto');
  const llego = await p.evaluate(`(${IR_A})('notas')`);
  vale('(la prueba es válida) existe la pestaña NOTAS', llego === true);
  titulo('el cuaderno empieza por su índice, que no es una nota');
  vale('Índice es la primera pestaña y empieza seleccionada',
       await p.locator('#notas .indice-barra > button').first().textContent() === 'Índice' &&
       await p.locator('#notas .indice-tab').getAttribute('aria-pressed') === 'true');
  vale('la página de índice lista la nota de fábrica y oculta los editores',
       await p.locator('#notas .indice-pagina').isVisible() &&
       await p.locator('#notas .indice-item').count() === 1 &&
       await p.locator('#notas .nota-editor:visible').count() === 0);
  await p.locator('#notas .indice-item').first().press('Enter');
  vale('la entrada abre la nota con teclado y lleva el foco a su pestaña',
       await p.locator('#notas .nota-editor:visible').count() === 1 &&
       await p.locator('#notas .pestanitas [data-nota]').first().evaluate(t => t === document.activeElement));
  const antes = await p.evaluate(() => ({
    pestañas:document.querySelectorAll('#notas .enc-barra [data-nota]').length,
    editor:!!document.querySelector('#notas .nota-editor:enabled')
  }));
  di('la nota que nace', antes);
  vale('(la prueba es válida) trae una pestaña y un área para escribir',
       antes.pestañas === 1 && antes.editor === true, JSON.stringify(antes));

  await p.locator('#notas .nota-mas').click();
  await p.locator('#notas .nota-editor:visible').fill('Memoria para la próxima lectura.');
  p.once('dialog', d => d.accept('Estudio'));
  await p.locator('#notas .enc-barra [data-nota]').filter({ hasText:'Nota 2' }).dblclick();
  await p.waitForTimeout(180);
  const despues = await p.evaluate(() => {
    const guardadas = JSON.parse(localStorage.getItem('glossa:notas:v1') || '[]');
    const visibles = [...document.querySelectorAll('#notas .nota-hoja')]
      .filter(h => !h.hidden);
    return { pestañas:[...document.querySelectorAll('#notas .enc-barra [data-nota]')]
                        .map(x => x.textContent),
             texto:visibles[0] && visibles[0].querySelector('.nota-editor').value,
             guardadas };
  });
  di('la nota renombrada', despues);
  vale('el + añade una segunda pestaña', despues.pestañas.length === 2,
       despues.pestañas.join(' · '));
  vale('el doble clic cambia su título', despues.pestañas[1] === 'Estudio',
       despues.pestañas[1]);
  vale('el texto sigue en la pestaña renombrada',
       despues.texto === 'Memoria para la próxima lectura.', despues.texto);
  vale('título y texto quedan guardados',
       despues.guardadas.length === 2 && despues.guardadas[1].titulo === 'Estudio' &&
       despues.guardadas[1].texto === 'Memoria para la próxima lectura.',
       JSON.stringify(despues.guardadas));

  titulo('el doble clic físico renombra también una pestaña inactiva');
  const primera = p.locator('#notas .enc-barra [data-nota]').first();
  const nodo = await primera.elementHandle();
  await primera.click();
  vale('seleccionar conserva el nodo que recibirá el segundo clic',
       await nodo.evaluate(n => n.isConnected));
  await p.locator('#notas .enc-barra [data-nota]').nth(1).click();
  let dialogos = 0;
  const nombrar = async d => { dialogos++; await d.accept('Lectura'); };
  p.on('dialog', nombrar);
  await primera.dblclick({ delay:150 });
  p.off('dialog', nombrar);
  vale('un doble clic sobre la inactiva abre el diálogo una sola vez', dialogos === 1, dialogos);
  vale('la primera nota se renombró de verdad',
       await primera.textContent() === 'Lectura');
  await p.locator('#notas .nota-editor:visible').fill('Texto de la primera nota.');
  await p.reload();
  await abrirNotas(p);
  vale('las dos notas sobreviven a recargar',
       await p.locator('#notas .enc-barra [data-nota]').count() === 2);
  vale('y la primera conserva su título y texto',
       await p.locator('#notas .enc-barra [data-nota]').first().textContent() === 'Lectura' &&
       await p.locator('#notas .nota-editor:visible').inputValue() === 'Texto de la primera nota.');

  /* Descargas y selector reales: no se llama a ninguna función de la app.
     El contenido se lee del archivo que exportó el navegador en esta corrida. */
  const descargar = async pagina => {
    await pagina.evaluate(`(${IR_A})('respaldo')`);
    const esperando = pagina.waitForEvent('download');
    await pagina.locator('#btnExportar').click();
    const descarga = await esperando;
    let texto = '';
    for await (const trozo of await descarga.createReadStream()) texto += trozo.toString();
    return JSON.parse(texto);
  };
  const importar = async (pagina, datos) => {
    await pagina.evaluate(`(${IR_A})('respaldo')`);
    await pagina.locator('#archivoImp').setInputFiles({
      name:'respaldo.json', mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(datos))
    });
    await pagina.waitForTimeout(300);
  };
  titulo('el respaldo lleva las notas a otro navegador sin borrar las existentes');
  const respaldo = await descargar(p);
  vale('el archivo exporta títulos y textos de las dos notas',
       respaldo.totalNotas === 2 && respaldo.notas.length === 2 &&
       respaldo.notas[0].titulo === 'Lectura' &&
       respaldo.notas[1].texto === 'Memoria para la próxima lectura.');
  const destino = await abrir();
  const q = destino.pagina;
  await abrirNotas(q);
  await q.locator('#notas .nota-editor:visible').fill('Esta nota ya estaba en el destino.');
  const existentes = await q.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1')));
  vale('las notas de fábrica de dos dispositivos tienen ids distintos',
       existentes[0].id !== respaldo.notas[0].id);
  await importar(q, respaldo);
  await abrirNotas(q);
  const restauradas = await q.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1')));
  vale('importar añade ambas notas y mantiene la que ya estaba',
       restauradas.length === 3 && restauradas[0].texto === existentes[0].texto &&
       restauradas[1].titulo === 'Lectura' && restauradas[1].texto === respaldo.notas[0].texto &&
       restauradas[2].titulo === 'Estudio' && restauradas[2].texto === respaldo.notas[1].texto);
  vale('las notas importadas aparecen en el panel sin recargar',
       await q.locator('#notas .enc-barra [data-nota]').count() === 3);
  await importar(q, respaldo);
  vale('reimportar no duplica las notas',
       await q.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1')).length) === 3);
  await q.reload();
  await abrirNotas(q);
  vale('el respaldo restaurado también sobrevive a recargar',
       await q.locator('#notas .enc-barra [data-nota]').count() === 3);

  titulo('los respaldos viejos siguen importando glosas sin cambiar las notas');
  await q.evaluate(() => localStorage.setItem('glossa:marcas:v1', '[]'));
  await q.reload();
  const viejo = { ...respaldo }; delete viejo.notas; delete viejo.totalNotas;
  await importar(q, viejo);
  vale('se restauran las glosas de un respaldo sin campo notas',
       await q.evaluate(() => JSON.parse(localStorage.getItem('glossa:marcas:v1')).length) === respaldo.marcas.length &&
       respaldo.marcas.length > 0);
  await q.evaluate(() => localStorage.setItem('glossa:marcas:v1', '[]'));
  await q.reload();
  await importar(q, respaldo.marcas);
  vale('también se restaura el formato antiguo de lista de glosas',
       await q.evaluate(() => JSON.parse(localStorage.getItem('glossa:marcas:v1')).length) === respaldo.marcas.length);
  vale('ninguno de esos formatos borra las notas del destino',
       await q.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1')).length) === 3);
  await importar(q, { ...respaldo, notas:{} });
  vale('un campo notas ilegible se rechaza con aviso',
       /no parece una exportación/i.test(await q.locator('#respaldoFallo').textContent()));

  titulo('las notas se pueden exportar incluso sin glosas');
  await q.evaluate(() => localStorage.setItem('glossa:marcas:v1', '[]'));
  await q.reload();
  const soloNotas = await descargar(q);
  vale('el respaldo sin glosas conserva todas las notas',
       soloNotas.marcas.length === 0 && soloNotas.notas.length === 3);

  titulo('si el almacén falla, el aviso permanece y el respaldo rescata lo escrito');
  for (const error of ['QuotaExceededError', 'SecurityError']){
    /* Se fuerza un fallo del NAVEGADOR, no de la aplicación. Sólo falla su
       escritura de notas; se conserva el resto del almacén y se restaura al
       terminar para poder probar después que un guardado bueno funciona. */
    await q.evaluate(nombre => {
      window.__guardarStorageOriginal = Storage.prototype.setItem;
      Storage.prototype.setItem = function(clave, valor){
        if (clave === 'glossa:notas:v1') throw new DOMException('Almacén no disponible', nombre);
        return window.__guardarStorageOriginal.call(this, clave, valor);
      };
    }, error);
    await abrirNotas(q);
    const texto = 'Texto aún no guardado: ' + error;
    await q.locator('#notas .nota-editor:visible').fill(texto);
    const aviso = await q.locator('#readout').textContent();
    vale(error + ': el aviso dice que no se guardó y pide exportar',
         /NO SE PUDO GUARDAR LAS NOTAS/.test(aviso) && aviso.includes(error) && /exporta/.test(aviso), aviso);
    await q.evaluate(`(${IR_A})('respaldo')`);
    vale(error + ': queda escrito junto al botón Exportar',
         await q.locator('#respaldoFallo').isVisible() &&
         (await q.locator('#respaldoFallo').textContent()).includes(error));
    const rescate = await descargar(q);
    vale(error + ': la exportación rescata lo nuevo desde memoria',
         rescate.notas[0].texto === texto);
    vale(error + ': el almacén todavía contiene la copia anterior',
         await q.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1'))[0].texto) !== texto);
    await q.evaluate(() => {
      Storage.prototype.setItem = window.__guardarStorageOriginal;
      delete window.__guardarStorageOriginal;
    });
    await abrirNotas(q);
    await q.locator('#notas .nota-editor:visible').fill('Guardado tras recuperar el almacén.');
    vale(error + ': al recuperarse el almacén vuelve a guardar',
         await q.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1'))[0].texto) ===
         'Guardado tras recuperar el almacén.');
  }
  await destino.navegador.close();
  vale('el navegador de destino no tuvo errores de JavaScript', destino.errores.length === 0,
       destino.errores);

  titulo('el índice permite llegar a notas que quedaron fuera de la tira');
  const adicionales = Array.from({ length:18 }, (_, i) => ({
    id:i === 17 ? 'indice' : 'nota-del-indice-' + i,
    titulo:i === 17 ? '<b>Una nota llamada índice</b>' : 'Apunte de lectura ' + (i + 1),
    texto:'Contenido conservado del apunte ' + (i + 1)
  }));
  await importar(p, { ...respaldo, notas:adicionales });
  await abrirNotas(p);
  const ultima = p.locator('#notas .pestanitas [data-nota="indice"]');
  await ultima.click();
  const tira = await p.evaluate(() => {
    const b = document.querySelector('#notas .pestanitas');
    const indice = document.querySelector('#notas .indice-tab').getBoundingClientRect();
    return { sobra:b.scrollWidth - b.clientWidth, corrida:b.scrollLeft,
      indiceVisible:indice.left >= 0 && indice.right <= innerWidth };
  });
  vale('(la prueba es válida) las veinte notas desbordan y la tira se corrió',
       tira.sobra > 0 && tira.corrida > 0, tira);
  vale('la pestaña Índice sigue visible al final de la tira', tira.indiceVisible, tira);
  await p.locator('#notas .indice-tab').click();
  vale('el índice se actualizó tras importar y enumera todas las notas',
       await p.locator('#notas .indice-item').count() === 20);
  vale('los títulos con marcado se muestran como texto, no como HTML',
       await p.locator('#notas .indice-nombre').last().textContent() === adicionales[17].titulo &&
       await p.locator('#notas .indice-lista b').count() === 0);
  vale('el índice tiene desplazamiento vertical para alcanzar la última entrada',
       await p.locator('#notas .indice-pagina').evaluate(i => i.scrollHeight > i.clientHeight));
  await p.locator('#notas .indice-item').last().click();
  vale('la última entrada abre la nota correcta, aunque su id sea indice',
       await p.locator('#notas .nota-editor:visible').inputValue() === adicionales[17].texto &&
       await ultima.getAttribute('aria-pressed') === 'true' &&
       await p.locator('#notas .indice-tab').getAttribute('aria-pressed') === 'false');
  p.once('dialog', d => d.accept('Última nota renombrada'));
  await ultima.dblclick();
  await p.locator('#notas .nota-editor:visible').fill('Texto actualizado desde la nota.');
  await p.locator('#notas .indice-tab').click();
  vale('el índice refleja el cambio de título y el nuevo texto',
       await p.locator('#notas .indice-nombre').last().textContent() === 'Última nota renombrada' &&
       await p.locator('#notas .indice-detalle').last().textContent() === 'Texto actualizado desde la nota.');
  await p.locator('#notas .indice-crear').click();
  vale('Nueva nota crea y abre una nota desde el índice',
       await p.locator('#notas .pestanitas [data-nota]').count() === 21 &&
       await p.locator('#notas .nota-editor:visible').inputValue() === '');
  await p.locator('#notas .indice-tab').click();
  vale('el índice se actualiza también después de crear',
       await p.locator('#notas .indice-item').count() === 21);
  const actualizado = await descargar(p);
  vale('el respaldo incluye solo notas, nunca la página del índice',
       actualizado.totalNotas === 21 && actualizado.notas.length === 21);
  await p.reload();
  await p.evaluate(`(${IR_A})('notas')`);
  vale('al recargar vuelve al índice completo sin perder lo escrito',
       await p.locator('#notas .indice-pagina').isVisible() &&
       await p.locator('#notas .indice-item').count() === 21 &&
       await p.locator('#notas .indice-detalle').nth(19).textContent() === 'Texto actualizado desde la nota.');
  await probarMovimientoIndice(p, 'notas');
  await cerrar(sesion);
})();
