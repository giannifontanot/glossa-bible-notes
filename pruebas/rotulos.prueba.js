/* LOS DOS RÓTULOS DE LA HOJA.

   El de arriba dice dónde estás y abre Libros. El del pie dice en qué versión
   lees: un toque abre la lista de versiones, dos abren Libros.

   Dos cosas que fallaron aquí y por eso se prueban con DEDO Y CON RATÓN:

   · Con ratón y ventana estrecha no respondían. La captura del puntero sobre
     #pg reasigna el click de compatibilidad al elemento que captura —con ratón
     sí, con dedo no—, así que el toque nunca llegaba al rótulo. Llevaba roto
     desde que existe el arrastre del papel, y solo se veía con ratón.
   · El del pie se quedaba BLANCO. Tenía un :hover con fondo, y en un teléfono
     ese estado no existe: el navegador lo aplica al tocar y lo deja puesto.
     El rótulo tiene dos estados, no tres. */
const { abrir, cerrar, cerrarParcial, di, vale, titulo,
        ESCRITORIO, ESTRECHO_RATON } = require('./comun');

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  titulo('el del pie: un toque abre versiones');
  vale('se abre el globo', await p.evaluate(async () => {
    document.getElementById('pgVersion').click();
    await new Promise(z => setTimeout(z, 700));
    return document.getElementById('burbujaVersion').classList.contains('visible');
  }));
  di('estados de color', await p.evaluate(() => ({
    abierto: getComputedStyle(document.getElementById('pgVersion')).backgroundColor })));
  vale('encendido no es blanco', await p.evaluate(() =>
    getComputedStyle(document.getElementById('pgVersion')).backgroundColor !== 'rgb(255, 253, 246)'));

  titulo('dos toques abren Libros');
  di('doble clic humano, 380 ms', await p.evaluate(async () => {
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:20, clientY:300 }));
    await new Promise(z => setTimeout(z, 600));
    const el = document.getElementById('pgVersion');
    el.click();
    await new Promise(z => setTimeout(z, 380));
    el.click(); el.dispatchEvent(new MouseEvent('dblclick', { bubbles:true }));
    await new Promise(z => setTimeout(z, 1000));
    return { libros: document.getElementById('canto').classList.contains('abierto'),
             globoNoSeColo: !document.getElementById('burbujaVersion').classList.contains('visible') };
  }).then(r => {
    vale('abre Libros', r.libros);
    vale('y el globo no se cuela en medio', r.globoNoSeColo);
    return r;
  }));

  titulo('con un panel abierto, el rótulo lo cierra');
  /* El rótulo vive en la hoja, y con el panel encima la hoja es justo lo que
     no se ve: el gesto es "quítame esto de delante". */
  di('con Libros abierto', await p.evaluate(async () => {
    const abierto = document.getElementById('canto').classList.contains('abierto');
    document.getElementById('pgVersion').click();
    await new Promise(z => setTimeout(z, 900));
    return { panelEstaba: abierto,
             seCerro: !document.getElementById('canto').classList.contains('abierto'),
             noAbrioElGlobo: !document.getElementById('burbujaVersion').classList.contains('visible') };
  }).then(r => {
    vale('cierra el panel', r.panelEstaba && r.seCerro);
    vale('sin abrir el globo', r.noAbrioElGlobo);
    return r;
  }));

  titulo('el de arriba abre Libros');
  vale('abre', await p.evaluate(async () => {
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const ok = document.getElementById('canto').classList.contains('abierto');
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 700));
    return ok;
  }));

  titulo('y con RATÓN, que es donde estuvo roto');
  await cerrarParcial(sesion, 'dedo');

  /* LOS DOS ANCHOS, y el estrecho es el que importa.

     El fallo vivía en la esquina de tres condiciones: ventana estrecha, puntero
     de ratón, y papel más ancho que la ventana. Solo entonces se enciende el
     arrastre, y solo entonces la captura del puntero reasigna el clic al
     elemento que captura —con ratón sí, con dedo no—, dejando los rótulos
     mudos. En una ventana ancha el papel cabe, no hay arrastre y no hay
     captura: el rótulo responde aunque el fallo esté puesto.
     Probar solo el ancho es lo que dejó esa esquina sin red durante meses. */
  let ultima;
  for (const [comoSeLlama, contexto] of [['ratón, ventana estrecha', ESTRECHO_RATON],
                                         ['ratón, escritorio', ESCRITORIO]]){
    const s = await abrir(contexto);
    const q = s.pagina;
    ultima = s;
    di(comoSeLlama, await q.evaluate(() => ({
      anchoVentana: window.innerWidth,
      sobraPapel: document.getElementById('pg').scrollWidth -
                  document.getElementById('pg').clientWidth > 4,
      conDedo: 'ontouchstart' in window })));
    for (const [id, comprueba] of [['pgCabeza', 'canto'], ['pgVersion', 'burbujaVersion']]){
      const caja = await q.evaluate(i => {
        const r = document.getElementById(i).getBoundingClientRect();
        return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
      }, id);
      await q.mouse.click(caja.x, caja.y);
      await q.waitForTimeout(900);
      const abierto = await q.evaluate(c => {
        const el = document.getElementById(c);
        return el.classList.contains('abierto') || el.classList.contains('visible');
      }, comprueba);
      vale('#' + id + ' responde · ' + comoSeLlama, abierto);
      await q.evaluate(() => document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles:true, clientX:20, clientY:300 })));
      await q.waitForTimeout(700);
      if (id === 'pgCabeza'){
        await q.evaluate(() => { const c = document.getElementById('canto');
          if (c.classList.contains('abierto')) document.getElementById('pgCabeza').click(); });
        await q.waitForTimeout(800);
      }
    }
    vale('no se pone blanco · ' + comoSeLlama, await q.evaluate(() =>
      getComputedStyle(document.getElementById('pgVersion')).backgroundColor !== 'rgb(255, 253, 246)'),
      await q.evaluate(() => getComputedStyle(document.getElementById('pgVersion')).backgroundColor));
    if (contexto === ESTRECHO_RATON) await cerrarParcial(s, comoSeLlama);
  }

  await cerrar(ultima);
})();
