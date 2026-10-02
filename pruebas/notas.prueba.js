/* NOTAS: EL CUADERNO QUE VIVE JUNTO A GLOSAS.

   Se vigila el recorrido entero: abrir la sección, crear una pestaña, escribir
   en ella, ponerle nombre con doble clic y comprobar que el almacén conserva
   las dos piezas. Una prueba que sólo mira el textarea no caza el fallo más
   probable: que la tira se redibuje al renombrar y se lleve el texto. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

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
  titulo('una nota nueva conserva su título y su texto');
  const llego = await p.evaluate(`(${IR_A})('notas')`);
  vale('(la prueba es válida) existe la pestaña NOTAS', llego === true);
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
  await cerrar(sesion);
})();
