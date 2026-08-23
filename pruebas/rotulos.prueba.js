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

  titulo('los dos siguen al sepia');
  /* ERAN LO ÚNICO DE LA HOJA QUE NO SE MOVÍA CON EL SEPIA. El papel y la tinta
     sí; estos dos llevaban un color escrito a mano, así que según entintas el
     papel se le van acercando. Con los colores de antes el de arriba caía de
     2.91 a 2.12 de contraste y el del pie de 2.07 a 1.51, y el del pie ya
     estaba mal con papel BLANCO: el sepia no lo rompió, solo lo destapó.

     SE MIDE EN LAS DOS ESCALAS, y no por exceso de celo. El ratio de WCAG es
     un cociente de luminancias, así que oscurecer papel y rótulo al mismo
     ritmo lo deja plano POR CONSTRUCCIÓN: una prueba que solo mirase ese
     número daría verde con el contraste real desplomándose, que es justo lo
     que pasaba en la primera versión de este cambio —WCAG clavado en 5.6
     mientras el Lc de APCA caía once puntos—. WCAG sigue estando porque es lo
     que se exige formalmente; Lc está porque es lo que ve el ojo.

     El sepia 6 no es una cifra al azar: es donde el contraste WCAG toca su
     mínimo. Con solo las cifras redondas esa esquina se quedaría entre dos
     muestras, que es la manera más limpia de tener una prueba en verde y un
     rótulo flojo. El de Lc toca fondo en el 100, que ya estaba.

     Y se comprueba que el color de verdad cambie. Sin esto la prueba pasaría
     con un color fijo lo bastante oscuro, y volveríamos a tener una hoja que
     se entinta entera menos dos esquinas. */
  di('el barrido', await p.evaluate(async () => {
    const lum = c => { const [r,g,b] = c.match(/\d+/g).map(Number).map(v => {
      v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); });
      return .2126*r + .7152*g + .0722*b; };
    /* APCA 0.1.9, polaridad normal (tinta oscura sobre papel claro), que es la
       única que se da aquí: el papel nunca baja de rgb(232,211,172). */
    const Yapca = c => { const [r,g,b] = c.match(/\d+/g).map(Number);
      const f = v => Math.pow(v/255, 2.4);
      const y = .2126729*f(r) + .7151522*f(g) + .0721750*f(b);
      return y < .022 ? y + Math.pow(.022 - y, 1.414) : y; };
    const Lc = (tinta, papel) => {
      const yt = Yapca(tinta), yb = Yapca(papel);
      const s = (Math.pow(yb, .56) - Math.pow(yt, .57)) * 1.14;
      return s < .035991 ? 0 : +((s - .027) * 100).toFixed(1);
    };
    const mando = document.getElementById('sepia');
    const antes = mando.value;
    const q = id => { const c = getComputedStyle(document.getElementById(id));
      const L = lum(c.color), f = lum(c.backgroundColor);
      return { tinta:c.color, papel:c.backgroundColor,
               contraste:+((Math.max(L,f)+.05)/(Math.min(L,f)+.05)).toFixed(2),
               lc:Lc(c.color, c.backgroundColor) }; };
    const paso = [];
    for (const v of [0, 6, 25, 50, 75, 100]){
      mando.value = String(v);
      mando.dispatchEvent(new Event('input', { bubbles:true }));
      /* 460 y no 260: el rótulo entra al color nuevo con una transición de
         .34s. Aquí ya no la hay —sinFundido la apaga mientras se mueve el
         sepia— pero la espera se queda: si alguien devuelve el fundido, esta
         prueba tiene que seguir midiendo el color de destino y no el del
         camino, o pasaría a medir otra cosa sin avisar. */
      await new Promise(z => setTimeout(z, 460));
      paso.push({ sepia:v, cabeza:q('pgCabeza'), version:q('pgVersion') });
    }
    mando.value = antes;
    mando.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 460));
    return paso;
  }).then(paso => {
    const flojo = paso.filter(x => x.cabeza.contraste < 4.5 || x.version.contraste < 4.5);
    vale('legibles en todo el recorrido', flojo.length === 0,
         flojo.length ? flojo.map(x => x.sepia + ': ' + x.cabeza.contraste +
                                       ' / ' + x.version.contraste).join(' · ')
                      : paso.map(x => x.cabeza.contraste + '/' + x.version.contraste).join('  '));
    /* Y EN LO QUE VE EL OJO. 60 es el suelo que se fijó: por debajo el rótulo
       deja de sostenerse como texto secundario incluso siendo generoso con el
       tamaño. Los de antes caían a 58.6 aquí, con WCAG diciendo 4.56. */
    const ciego = paso.filter(x => x.cabeza.lc < 60 || x.version.lc < 60);
    vale('y con contraste percibido, no solo con el número',
         ciego.length === 0,
         ciego.length ? ciego.map(x => x.sepia + ': Lc ' + x.cabeza.lc +
                                       ' / ' + x.version.lc).join(' · ')
                      : paso.map(x => x.cabeza.lc + '/' + x.version.lc).join('  '));
    const uno = paso[0], otro = paso[paso.length - 1];
    vale('el papel se entinta', uno.cabeza.papel !== otro.cabeza.papel,
         uno.cabeza.papel + ' -> ' + otro.cabeza.papel);
    vale('y los rótulos con él', uno.cabeza.tinta !== otro.cabeza.tinta &&
                                 uno.version.tinta !== otro.version.tinta,
         uno.cabeza.tinta + ' -> ' + otro.cabeza.tinta);
    /* el de arriba manda sobre el del pie: dónde estás se busca, en qué
       traducción lees se consulta una vez. En las dos escalas, porque una
       jerarquía que solo existe en una de ellas no existe. */
    vale('el de arriba pesa más que el del pie',
         paso.every(x => x.cabeza.contraste > x.version.contraste &&
                         x.cabeza.lc > x.version.lc),
         uno.cabeza.contraste + ' contra ' + uno.version.contraste +
         ' · Lc ' + uno.cabeza.lc + ' contra ' + uno.version.lc);
    return paso;
  }));

  titulo('el color llega a tiempo para la foto del pliegue');
  /* LA FOTO SE TOMA A LOS CERO MILISEGUNDOS. renderPage pide foto nueva del
     pliegue con un setTimeout(0), y la foto se arma leyendo el
     getComputedStyle de cada palabra —rótulos incluidos: el SVG los pinta
     transparentes y quien les pone color es el lienzo—.

     Los rótulos tienen una transición de .34s puesta para cuando los tocas. Si
     el sepia la dispara, a los cero milisegundos se fotografía la tinta VIEJA
     sobre el papel NUEVO, y como la foto queda firmada como al día, el error
     no se corrige solo: se queda hasta el siguiente cambio de estilo. Medido
     antes del arreglo, en un salto de 0 a 100: 4.07 y 3.34 de contraste donde
     tocaban 5.60 y 4.56.

     Por eso esta prueba mira EN EL CERO y no al final. Esperar a que la
     transición acabe daría verde con el fallo puesto, que es justo lo que le
     pasa a la foto. Lo levantó la revisión. */
  di('en el mismo instante en que se pide la foto', await p.evaluate(async () => {
    const mando = document.getElementById('sepia');
    const cab = document.getElementById('pgCabeza'), pie = document.getElementById('pgVersion');
    const antes = mando.value;
    mando.value = '0'; mando.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 600));
    mando.value = '100'; mando.dispatchEvent(new Event('input', { bubbles:true }));
    const cero = await new Promise(z => setTimeout(() => z(
      { cab:getComputedStyle(cab).color, pie:getComputedStyle(pie).color }), 0));
    await new Promise(z => setTimeout(z, 600));
    const fin = { cab:getComputedStyle(cab).color, pie:getComputedStyle(pie).color };
    mando.value = antes; mando.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 600));
    return { cero, fin };
  }).then(r => {
    vale('el titulillo ya está teñido', r.cero.cab === r.fin.cab,
         r.cero.cab + ' contra ' + r.fin.cab);
    vale('y el del pie también', r.cero.pie === r.fin.pie,
         r.cero.pie + ' contra ' + r.fin.pie);
    return r;
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
