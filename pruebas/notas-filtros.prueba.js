/* Los filtros viajan desde GLOSAS a una nota concreta, y vuelven con clics
   físicos. Los datos entran por Importar: no se llama a la navegación ni a
   los filtros internos de la aplicación. */
const { abrir, cerrar, vale, titulo } = require('./comun');
const ejemplo = require('../glosas-ejemplo-mateo-apocalipsis.json');
const paneles = { notas:'notas', glosas:'etiquetas', respaldo:'respaldo' };
async function ir(p, seccion){
  if (await p.locator('#' + paneles[seccion]).isVisible()) return;
  if (!await p.locator('.rollo:visible .pestanas').count()){
    await p.locator('#pgCabeza').click(); await p.waitForTimeout(900);
  }
  await p.locator('.rollo:visible .pestanas [data-sec="' + seccion + '"]').click();
  await p.locator('#' + paneles[seccion]).waitFor({ state:'visible' });
  await p.waitForTimeout(650);
  /* Exportar e Importar viven en «Herramientas»: el panel abre en Compartir. */
  if (seccion === 'respaldo'){
    await p.locator('#respaldo [data-sub="tools"]').click();
    await p.waitForTimeout(300);
  }
}
async function importar(p, datos){
  await ir(p, 'respaldo');
  await p.locator('#archivoImp').setInputFiles({ name:'lectura.json', mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(datos)) });
  await p.waitForTimeout(350);
}
async function exportar(p){
  await ir(p, 'respaldo');
  const esperando = p.waitForEvent('download'); await p.locator('#btnExportar').click();
  const descarga = await esperando; let texto = '';
  for await (const parte of await descarga.createReadStream()) texto += parte.toString();
  return JSON.parse(texto);
}
const guardadas = p => p.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1')));
const etiquetas = p => p.locator('#pillsEtiq .chip.sel').allTextContents();
/* Los días y los libros son ahora pastillas, como las etiquetas: se leen las
   puestas. El texto de cada una lleva pegada su cuenta («2020-01-021»). */
const diasPuestos = p => p.locator('#pillsDias .chip.sel').allTextContents();
const librosPuestos = p => p.locator('#pillsLibros .chip.sel').count();
/* CADA SECCIÓN NACE EN «TODOS» y sus pastillas escondidas: para elegir hay que
   apagar su botón, como lo haría el dedo. Se espera a que la fila acabe de
   abrirse suave —260 ms— antes de tocar dentro. */
async function apagarTodos(p, cual){
  const b = p.locator('#filtros [data-todos="' + cual + '"]');
  if (await b.getAttribute('aria-pressed') === 'true'){ await b.click(); await p.waitForTimeout(420); }
}
const pastilla = (p, fila, texto) => p.locator('#' + fila + ' .chip').filter({ hasText:texto });
const filtro = (libro, libros, tags, dia) => ({ libro, libros, etiquetas:tags, dia, fecha:'2026-10-02T20:00:00.000Z' });

(async () => {
  const sesion = await abrir(), p = sesion.pagina;
  const base = ejemplo.marcas.filter(m => m.libro === 'MAT').slice(0, 2);
  const apocalipsis = ejemplo.marcas.find(m => m.libro === 'REV');
  const marcas = [...base, apocalipsis].map((m, i) => ({ ...m, id:'lectura-filtro-' + i,
    nota:'Glosa para el filtro ' + i, etiquetas:[i === 1 ? 'LecturaDos' : 'LecturaUno'],
    creada:i === 1 ? '2020-01-03' : '2020-01-02' }));
  await importar(p, { formato:'glossa/marcas', marcas });
  await ir(p, 'notas');
  const libro = p.locator('#notas .nota-ver-glosas');
  titulo('el libro vive en el renglón de la nota y cada nota empieza sin historial');
  vale('el Índice no ofrece filtros de una nota inexistente', await libro.isDisabled());
  await p.locator('#notas .indice-item').first().click();
  await p.locator('#notas .nota-editor:visible').fill('Reflexión que conserva su lectura.');
  const idPrimera = (await guardadas(p))[0].id;
  await libro.click();
  vale('sin historial explica cómo guardar una lectura',
    await p.locator('.nota-filtros-vacio').isVisible() &&
    await p.locator('#notaFiltros .nota-filtro').count() === 0);
  await p.keyboard.press('Escape');
  /* La lista ya no se va de golpe: se encoge suave, y hasta que termina
     sigue en pantalla. Se espera a que acabe de irse. */
  await p.locator('#notaFiltros').waitFor({ state:'hidden', timeout:2000 }).catch(() => {});
  vale('Escape cierra sólo la lista y devuelve el foco al libro',
    await p.locator('#notas').isVisible() && await p.locator('#notaFiltros').isHidden() &&
    await libro.evaluate(b => document.activeElement === b));

  titulo('GLOSAS guarda libro, libros elegidos, etiquetas y días en la nota abierta');
  await ir(p, 'glosas');
  await p.locator('#btnVerEtiquetas').click();
  await apagarTodos(p, 'etiq');
  await pastilla(p, 'pillsEtiq', 'LecturaUno').click();
  /* Apagar «Todos los libros» deja puesto el abierto, Mateo; se añade
     Apocalipsis. */
  await apagarTodos(p, 'libros');
  vale('apagar «Todos los libros» deja puesto el libro abierto',
    await librosPuestos(p) === 1 &&
    (await p.locator('#pillsLibros .chip.sel').textContent()).includes('Mateo'));
  await pastilla(p, 'pillsLibros', 'Apocalipsis').click();
  await apagarTodos(p, 'dias');
  await pastilla(p, 'pillsDias', '2020-01-02').click();
  vale('el filtro de partida muestra las dos glosas previstas', await p.locator('#indice .ix-item').count() === 2);
  await ir(p, 'notas');
  let historial = (await guardadas(p))[0].filtros;
  vale('se guarda sólo el filtro y su fecha, sin copias ni ids de glosas',
    historial.length === 1 && historial[0].libro === 'MAT' && historial[0].libros.join() === 'MAT,REV' &&
    historial[0].todosLibros === false &&
    historial[0].etiquetas.join() === 'LecturaUno' && historial[0].dias.join() === '2020-01-02' &&
    historial[0].dia === '2020-01-02' &&
    Object.keys(historial[0]).sort().join() === 'dia,dias,etiquetas,fecha,libro,libros,todosLibros',
    JSON.stringify(historial[0]));
  const fecha = historial[0].fecha;
  await ir(p, 'glosas'); await ir(p, 'notas');
  historial = (await guardadas(p))[0].filtros;
  vale('visitas consecutivas iguales actualizan la fecha sin duplicar',
    historial.length === 1 && historial[0].fecha > fecha);
  await p.locator('#notas .nota-mas').click();
  await libro.click();
  vale('otra nota tiene su propio historial vacío', await p.locator('.nota-filtros-vacio').isVisible());
  await p.keyboard.press('Escape');
  await ir(p, 'glosas'); await ir(p, 'notas');
  vale('volver de GLOSAS vincula el filtro a la segunda nota',
    (await guardadas(p))[1].filtros.length === 1 && (await guardadas(p))[0].filtros.length === 1);

  await p.locator('#notas .indice-tab').click();
  await ir(p, 'glosas'); await ir(p, 'notas');
  await p.locator('#notas .indice-item').first().click();
  vale('pasar por el Índice espera a elegir una nota y evita duplicados',
    (await guardadas(p))[0].filtros.length === 1 && (await guardadas(p))[1].filtros.length === 1);
  await ir(p, 'glosas');
  await pastilla(p, 'pillsEtiq', 'LecturaUno').click();
  await pastilla(p, 'pillsEtiq', 'LecturaDos').click();
  await pastilla(p, 'pillsLibros', 'Apocalipsis').click();
  await pastilla(p, 'pillsDias', '2020-01-02').click();
  await pastilla(p, 'pillsDias', '2020-01-03').click();
  await ir(p, 'notas'); await libro.click();
  vale('la lista ofrece ambos filtros, con el más reciente primero',
    await p.locator('#notaFiltros .nota-filtro').count() === 2 &&
    (await p.locator('#notaFiltros .nota-filtro').first().textContent()).includes('LecturaDos'));
  vale('abrir la lista conserva los filtros actuales', (await etiquetas(p)).join().includes('LecturaDos'));
  await p.locator('#notaFiltros .nota-filtro').last().press('Enter');
  await p.locator('#etiquetas').waitFor({ state:'visible' }); await p.waitForTimeout(700);
  vale('elegir con teclado abre GLOSAS y aplica el filtro completo',
    await p.locator('#etiquetas .pestanas [data-sec="glosas"]').getAttribute('class') === 'aqui' &&
    (await etiquetas(p)).join().includes('LecturaUno') &&
    (await diasPuestos(p)).length === 1 && (await diasPuestos(p))[0].startsWith('2020-01-02') &&
    await librosPuestos(p) === 2 && await p.locator('#indice .ix-item').count() === 2);

  titulo('los filtros recuperados consultan las glosas de ahora');
  await importar(p, { formato:'glossa/marcas', marcas:[{ ...marcas[0], id:'lectura-filtro-nueva', nota:'Glosa incorporada después.' }] });
  await ir(p, 'glosas');
  vale('una glosa nueva que coincide aparece sin cambiar el historial', await p.locator('#indice .ix-item').count() === 3);
  await p.locator('#btnElegirGlosas').click();
  await p.locator('#filtros [data-tag-grupo="LecturaUno"]').click();
  await p.locator('#tagNuevaGrupo').fill('LecturaRenombrada');
  await p.locator('#tagboxGrupo [data-acc="renombrartag"]').click();
  await ir(p, 'notas'); await libro.click();
  const antiguo = p.locator('#notaFiltros .nota-filtro').filter({ hasText:'#LecturaUno' }).last();
  await antiguo.click(); await p.locator('#etiquetas').waitFor({ state:'visible' }); await p.waitForTimeout(700);
  vale('renombrar etiquetas no reescribe los filtros guardados: el antiguo ya no coincide',
    await p.locator('#indice .ix-item').count() === 0 && (await etiquetas(p)).join().includes('LecturaUno0'));
  await p.reload(); await ir(p, 'glosas');
  vale('libros, etiqueta ausente y día restaurados sobreviven a recargar',
    await librosPuestos(p) === 2 &&
    (await etiquetas(p)).join().includes('LecturaUno0') &&
    (await diasPuestos(p)).join() === '2020-01-020' && await p.locator('#indice .ix-item').count() === 0);

  titulo('historial importado, datos dañados y condiciones sin coincidencias');
  const notasImportadas = [
    { id:'filtros-ausentes', titulo:'Lectura ausente', texto:'No ampliar mis filtros.',
      filtros:[filtro('MAT', ['REV'], ['EtiquetaAusente'], '1999-01-02')] },
    { id:'filtros-sin-etiqueta', titulo:'Sin etiquetas', texto:'Conservar este caso especial.',
      filtros:[filtro('MAT', [], ['(sin etiqueta)'], '')] },
    { id:'filtros-otro-libro', titulo:'Apocalipsis', texto:'Volver al libro correcto.',
      filtros:[filtro('REV', ['MAT'], ['LecturaRenombrada'], '2020-01-02')] },
    { id:'filtros-malformados', titulo:'<b>Nota íntegra</b>', texto:'El texto se conserva.',
      filtros:[null, { libro:'MAT' }, filtro('DESCONOCIDO', [], [], ''),
        { ...filtro('MAT', [], [], ''), etiquetas:[null] }] },
    ...Array.from({ length:15 }, (_, i) => ({ id:'larga-' + i, titulo:'Nota larga ' + i, texto:'' }))
  ];
  await importar(p, { formato:'glossa/marcas', marcas:[], notas:notasImportadas });
  await ir(p, 'notas'); await p.locator('#notas .indice-item').filter({ hasText:'Lectura ausente' }).click();
  await libro.click(); await p.locator('#notaFiltros .nota-filtro').click();
  await p.locator('#etiquetas').waitFor({ state:'visible' }); await p.waitForTimeout(700);
  /* Este registro es de los de antes —`libros` eran los AÑADIDOS al abierto—:
     se lee como Mateo más Apocalipsis, no como «Apocalipsis solo». */
  vale('un registro viejo se traduce: el libro abierto más los añadidos',
    await librosPuestos(p) === 2 &&
    await p.locator('#filtros [data-todos="libros"]').getAttribute('aria-pressed') === 'false');
  vale('día y etiqueta desaparecidos se muestran con cero y no se eliminan',
    (await diasPuestos(p)).join() === '1999-01-020' &&
    (await etiquetas(p)).join().includes('EtiquetaAusente0') && await p.locator('#indice .ix-item').count() === 0);
  await p.reload(); await ir(p, 'glosas');
  vale('un día sin glosas tampoco desaparece al recargar',
    (await diasPuestos(p)).join() === '1999-01-020' && await p.locator('#indice .ix-item').count() === 0);
  await ir(p, 'notas');
  await p.locator('#notas .indice-item').filter({ hasText:'Sin etiquetas' }).click();
  await libro.click();
  vale('una lectura nueva se añade junto al historial importado de la nota elegida',
    await p.locator('#notaFiltros .nota-filtro').count() === 2);
  await p.locator('#notaFiltros .nota-filtro').filter({ hasText:'(sin etiqueta)' }).click();
  await p.locator('#etiquetas').waitFor({ state:'visible' }); await p.waitForTimeout(700);
  await p.reload(); await ir(p, 'glosas');
  vale('el filtro especial sin etiqueta conserva su significado tras recargar',
    (await etiquetas(p)).join().includes('(sin etiqueta)') &&
    !(await etiquetas(p)).join().includes('SinEtiqueta'));
  await ir(p, 'notas'); await p.locator('#notas .indice-item').filter({ hasText:'Apocalipsis' }).click();
  await libro.click();
  /* EL RASTRO, DESDE AQUÍ: este clic cruza de MAT —donde ha estado toda la
     prueba, sin que nada lo haya movido— a REV, y cruzar de libro a propósito
     es justo lo que «lo que has visto» existe para guardar. */
  const rastroAntesDeCruzar = await p.evaluate(() =>
    JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]'));
  /* Y LOS DOS FILTROS DE MAT A MAT DE MÁS ARRIBA NO DEBIERON APUNTAR NADA:
     quedarse en el mismo libro no es un salto, es ajustar qué glosas se ven.
     Se limpia después de comprobarlo para que la fila de abajo mida solo este
     cruce y no herede nada de los dos anteriores. */
  vale('  restaurar un filtro del MISMO libro no toca el rastro',
    rastroAntesDeCruzar.length === 0, rastroAntesDeCruzar);
  await p.evaluate(() => localStorage.setItem('glossa:historial:v1', '[]'));
  await p.locator('#notaFiltros .nota-filtro').filter({ hasText:'#LecturaRenombrada' }).click();
  await p.locator('#etiquetas').waitFor({ state:'visible' }); await p.waitForTimeout(900);
  vale('restaurar desde otro libro abre GLOSAS con el libro guardado y sus añadidos',
    (await p.locator('#pillsLibros .chip.abierto').textContent()).includes('Apocalipsis') &&
    await librosPuestos(p) === 2 && await p.locator('#indice .ix-item').count() === 3);
  const rastroTrasRestaurar = await p.evaluate(() =>
    JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]')
      .map(h => h.libro + ' ' + h.cap + ':' + h.vers));
  /* DOS FILAS, COMO CUALQUIER SALTO: el destino arriba —la primera hoja de
     Apocalipsis, que es donde aterriza siempre un filtro restaurado— y el
     libro del que se salió debajo. Antes de este arreglo esta lista se
     quedaba vacía: restaurar un filtro de otro libro era invisible para «lo
     que has visto», y el botón de atrás no sabía que habías pasado por aquí. */
  vale('  y RESTAURARLO DESDE OTRO LIBRO QUEDA EN EL RASTRO, que es lo que se le olvidaba',
    rastroTrasRestaurar.length === 2 && rastroTrasRestaurar[0].startsWith('REV ') &&
    rastroTrasRestaurar[1].startsWith('MAT '), rastroTrasRestaurar.join('  ←  '));
  await ir(p, 'notas'); await p.locator('#notas .indice-tab').click();
  await p.locator('#notas .indice-item').filter({ hasText:'<b>Nota íntegra</b>' }).click();
  await libro.click();
  vale('registros dañados se descartan sin perder título o texto ni interpretar marcado',
    await p.locator('.nota-filtros-vacio').isVisible() &&
    await p.locator('#notas .nota-editor:visible').innerText() === 'El texto se conserva.' &&
    (await p.locator('#notaFiltros h3').textContent()).includes('<b>Nota íntegra</b>') &&
    await p.locator('#notaFiltros b').count() === 0);
  await p.keyboard.press('Escape');
  /* Se mide con la lista YA ida. Mientras se encoge sigue ocupando su alto,
     y con ella abierta la hoja puede llevar barra de desplazamiento, que le
     quita ancho a la fila y corre el libro unos píxeles a la izquierda: se
     estaría comparando la fila con barra contra la fila sin ella. */
  await p.locator('#notaFiltros').waitFor({ state:'hidden', timeout:2000 }).catch(() => {});
  const posicion = await libro.boundingBox();
  await p.locator('#notas .indice-tab').click();
  await p.locator('#notas .indice-item').last().click(); await p.waitForTimeout(650);
  const final = await libro.boundingBox();
  const corrida = await p.locator('#notas .pestanitas').evaluate(b => b.scrollLeft);
  vale('el libro no se mueve cuando la tira de pestañas se desplaza',
    Math.abs(posicion.x - final.x) <= 1 && final.x + final.width <= 412 && corrida > 0,
    'antes x=' + Math.round(posicion.x) + ' · después x=' + Math.round(final.x) +
    ' ancho=' + Math.round(final.width) + ' · tira corrida ' + Math.round(corrida));

  titulo('el historial acompaña a la nota al renombrar, reordenar y respaldar');
  await p.locator('#notas .indice-tab').click();
  await p.locator('#notas .indice-asa').first().focus(); await p.keyboard.press('End');
  const movida = (await guardadas(p)).find(n => n.id === idPrimera);
  vale('reordenar conserva todos los filtros de la nota original', movida.filtros.length >= 2);
  await p.locator('#notas .indice-item').filter({ hasText:'Reflexión que conserva' }).click();
  p.once('dialog', d => d.accept('Mi estudio'));
  await p.locator('#notas .pestanitas [data-nota]').filter({ hasText:'Nota 1' }).dblclick();
  await libro.click();
  vale('renombrar mantiene el historial y actualiza el encabezado',
    await p.locator('#notaFiltros h3').textContent() === 'Glosas de Mi estudio' &&
    await p.locator('#notaFiltros .nota-filtro').count() === movida.filtros.length);
  const respaldo = await exportar(p);
  const fuente = respaldo.notas.find(n => n.id === idPrimera);
  vale('el respaldo conserva el historial completo junto al texto',
    fuente.texto === 'Reflexión que conserva su lectura.' && fuente.filtros.length === movida.filtros.length);
  const destino = await abrir(), q = destino.pagina;
  await importar(q, respaldo); await ir(q, 'notas');
  await q.locator('#notas .indice-item').filter({ hasText:'Mi estudio' }).click();
  await q.locator('#notas .nota-ver-glosas').click();
  vale('importar en otro navegador recupera el historial de esa nota',
    await q.locator('#notaFiltros .nota-filtro').count() === fuente.filtros.length);
  await q.reload(); await ir(q, 'notas');
  await q.locator('#notas .indice-item').filter({ hasText:'Mi estudio' }).click();
  await q.locator('#notas .nota-ver-glosas').click();
  vale('el historial importado sobrevive a recargar',
    await q.locator('#notaFiltros .nota-filtro').count() === fuente.filtros.length);

  titulo('un fallo del almacén conserva el historial en memoria y permite rescatarlo');
  await q.locator('#notaFiltros .nota-filtro').first().click();
  await q.locator('#etiquetas').waitFor({ state:'visible' }); await q.waitForTimeout(700);
  /* Se cambia el filtro de días, sea cual sea el que trajo el registro: si
     venía con días, se enciende «Todos los días»; si no, se elige uno. */
  {
    const tDias = q.locator('#filtros [data-todos="dias"]');
    await tDias.click(); await q.waitForTimeout(420);
    if (await tDias.getAttribute('aria-pressed') === 'false')
      await q.locator('#pillsDias .chip').first().click();
  }
  await q.evaluate(() => {
    window.__guardarNotasOriginal = Storage.prototype.setItem;
    Storage.prototype.setItem = function(clave, valor){
      if (clave === 'glossa:notas:v1') throw new DOMException('Almacén lleno', 'QuotaExceededError');
      return window.__guardarNotasOriginal.call(this, clave, valor);
    };
  });
  await ir(q, 'notas'); await q.locator('#notas .nota-ver-glosas').click();
  vale('el filtro nuevo sigue disponible aunque falle su guardado',
    await q.locator('#notaFiltros .nota-filtro').count() === fuente.filtros.length + 1 &&
    (await q.locator('#readout').textContent()).includes('NO SE PUDO GUARDAR LAS NOTAS'));
  const rescatado = await exportar(q);
  vale('Exportar rescata el historial que no llegó al almacén',
    rescatado.notas.find(n => n.id === idPrimera).filtros.length === fuente.filtros.length + 1);
  await q.evaluate(() => { Storage.prototype.setItem = window.__guardarNotasOriginal; delete window.__guardarNotasOriginal; });
  await ir(q, 'glosas'); await ir(q, 'notas');
  vale('al recuperar el almacén se guarda sin duplicar la visita fallida',
    (await guardadas(q)).find(n => n.id === idPrimera).filtros.length === fuente.filtros.length + 1);

  titulo('cambiar los libros de un filtro restaurado también se guarda');
  await ir(q, 'glosas');
  await pastilla(q, 'pillsLibros', 'Apocalipsis').click();
  await q.reload(); await ir(q, 'glosas');
  vale('quitar un libro no lo resucita al recargar', await librosPuestos(q) === 1);
  await pastilla(q, 'pillsLibros', 'Apocalipsis').click();
  await q.reload(); await ir(q, 'glosas');
  vale('añadir un libro queda guardado sin necesitar otro cambio de filtro',
    await librosPuestos(q) === 2);

  titulo('«Todos los libros» enciende la Biblia entera y se guarda así');
  await q.locator('#filtros [data-todos="libros"]').click(); await q.waitForTimeout(420);
  vale('encender «Todos los libros» suelta los elegidos y esconde sus pastillas',
    await librosPuestos(q) === 0 && await q.locator('#pillsLibros').isHidden());
  await q.reload(); await ir(q, 'glosas');
  vale('y al recargar sigue siendo la Biblia entera',
    await q.locator('#filtros [data-todos="libros"]').getAttribute('aria-pressed') === 'true' &&
    await librosPuestos(q) === 0);

  titulo('los ajustes de antes se traducen a las tres secciones');
  /* Una instalación de antes guardaba los libros AÑADIDOS al abierto
     (librosFiltro) y un solo día (diaFiltro). Al abrir con esta versión, los
     libros son el abierto más los añadidos y el día queda como el elegido, con
     sus dos «todos» apagados. Se siembra en el almacén y se recarga, que es el
     camino real: abrir el programa al día siguiente de actualizarlo. */
  await q.evaluate(() => {
    const a = JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}');
    for (const k of ['librosVer', 'diasVer', 'todosLibros', 'todosDias', 'todasEtiquetas']) delete a[k];
    Object.assign(a, { libro:'MAT', cap:1, vers:1, librosFiltro:['REV'], diaFiltro:'2020-01-02', etiquetasVer:[] });
    localStorage.setItem('glossa:ajustes:v1', JSON.stringify(a));
  });
  await q.reload(); await ir(q, 'glosas');
  const viejos = await q.evaluate(() => ({
    libros: [...document.querySelectorAll('#pillsLibros .chip.sel')].map(c => c.dataset.clave),
    dias: [...document.querySelectorAll('#pillsDias .chip.sel')].map(c => c.dataset.clave),
    todos: [...document.querySelectorAll('#filtros .fsec-todos')]
             .map(b => b.dataset.todos + ':' + b.getAttribute('aria-pressed')) }));
  vale('los libros añadidos se suman al abierto y el día queda elegido',
    viejos.libros.join() === 'libro:MAT,libro:REV' && viejos.dias.join() === 'dia:2020-01-02' &&
    viejos.todos.join() === 'dias:false,libros:false,etiq:true', JSON.stringify(viejos));
  await cerrar(destino); await cerrar(sesion);
})().catch(e => { console.error(e); process.exit(1); });
