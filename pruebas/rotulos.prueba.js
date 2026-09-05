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

     SE MIRAN LAS DOS HOJAS, LA VIVA Y EL MOLDE, y la segunda es la que faltaba.
     La primera versión de esta prueba solo consultaba pgCabeza y pgVersion, y
     con eso daba verde teniendo el fallo puesto en las hojas VECINAS: sus
     fotos se miden después, desde #ghost, dentro del mismo setTimeout(0), y
     ese camino no estaba cubierto. Lo levantó la revisión, y es el mismo fallo
     dos veces —medir mientras algo se mueve— en dos sitios distintos.
     (El molde no lleva rótulo de pie, solo titulillo; por eso aquí solo se
     pregunta por ghostCabeza.)

     Se mira EN EL CERO y no al final. Esperar a que la transición acabe daría
     verde con el fallo puesto, que es justo lo que le pasa a la foto. */
  di('en el mismo instante en que se pide la foto', await p.evaluate(async () => {
    const mando = document.getElementById('sepia');
    const cab = document.getElementById('pgCabeza'), pie = document.getElementById('pgVersion');
    const molde = document.getElementById('ghostCabeza');
    const antes = mando.value;
    mando.value = '0'; mando.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 900));
    mando.value = '100'; mando.dispatchEvent(new Event('input', { bubbles:true }));
    /* Este setTimeout(0) se registra DESPUÉS del de invalidateSnapshot, así que
       corre justo después de que la foto haya medido las dos hojas. */
    const cero = await new Promise(z => setTimeout(() => z(
      { cab:getComputedStyle(cab).color, pie:getComputedStyle(pie).color,
        molde:getComputedStyle(molde).color }), 0));
    await new Promise(z => setTimeout(z, 900));
    const fin = { cab:getComputedStyle(cab).color, pie:getComputedStyle(pie).color,
                  molde:getComputedStyle(molde).color };
    mando.value = antes; mando.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 900));
    return { cero, fin };
  }).then(r => {
    vale('el titulillo ya está teñido', r.cero.cab === r.fin.cab,
         r.cero.cab + ' contra ' + r.fin.cab);
    vale('y el del pie también', r.cero.pie === r.fin.pie,
         r.cero.pie + ' contra ' + r.fin.pie);
    /* el molde, que es de donde salen las fotos de las hojas vecinas */
    vale('y el molde, que es lo que se ve al pasar de página',
         r.cero.molde === r.fin.molde, r.cero.molde + ' contra ' + r.fin.molde);
    return r;
  }));

  /* ================================================================
     Y SIN PUNTERO NINGUNO: TECLADO SOLO.

     Los dos rótulos son <div>, y un div no entra en el recorrido del tabulador
     ni responde a Enter. Como son la ÚNICA puerta de la burbuja, quien navega
     con teclado o con conmutador se quedaba sin Libros, sin Glosas, sin
     Formato y sin Respaldo, y —desde que Formato dejó de tener su propia fila
     de versiones— sin ninguna forma de cambiar de versión. No era que costara
     llegar: no había camino. Lo levantó la revisión de Codex.

     Esta prueba lo recorre entero con el teclado y nada más: tabular hasta el
     rótulo, abrir, elegir otra versión, y comprobar que la versión CAMBIÓ DE
     VERDAD. Quedarse en «se abrió el globo» dejaría pasar un globo que se abre
     y del que no se puede salir eligiendo nada, que es medio arreglo.
     ================================================================ */
  titulo('sin puntero: los dos rótulos se alcanzan y se abren con el teclado');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  const recorrido = [];
  for (let i = 0; i < 6; i++){
    await p.keyboard.press('Tab');
    recorrido.push(await p.evaluate(() => {
      const a = document.activeElement;
      return !a || a === document.body ? 'BODY' : (a.id || a.tagName);
    }));
  }
  di('el recorrido del tabulador', recorrido.join(' → '));
  vale('el tabulador llega al titulillo', recorrido.includes('pgCabeza'), recorrido);
  vale('y al rótulo del pie', recorrido.includes('pgVersion'), recorrido);

  /* LAS TECLAS SE MANDAN CON EL TECLADO DE VERDAD, no con dispatchEvent. Es
     la misma regla que en los gestos y por el mismo motivo: un KeyboardEvent
     despachado a mano SIEMPRE llega y no trae la acción por defecto, así que
     una prueba escrita así pasaría en verde aunque el rótulo no fuera
     alcanzable ni el espacio dejara de desplazar la página. Aquí se pone el
     foco y se pulsa; lo demás lo pone el navegador. */
  const foco = () => p.evaluate(() => {
    const a = document.activeElement;
    return !a || a === document.body ? 'BODY' : (a.id || a.className || a.tagName);
  });
  const leerRotulo = () => p.evaluate(() => {
    const rot = document.getElementById('pgVersion');
    const globo = document.getElementById('burbujaVersion');
    return { ver: rot.textContent.trim(), aria: rot.getAttribute('aria-expanded'),
             visible: globo.classList.contains('visible'),
             dentro: globo.contains(document.activeElement),
             enLaDeAhora: !!(document.activeElement.classList &&
                             document.activeElement.classList.contains('aqui')),
             filas: globo.querySelectorAll('.bv-fila').length };
  });

  await p.evaluate(() => document.getElementById('pgVersion').focus());
  const antesDeAbrir = await leerRotulo();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(600);
  const abierto = await leerRotulo();
  di('la versión de partida', antesDeAbrir.ver);
  vale('empieza diciendo que está cerrado', antesDeAbrir.aria === 'false', antesDeAbrir.aria);
  vale('Enter abre el globo', abierto.visible === true);
  vale('y lo cuenta con aria-expanded', abierto.aria === 'true', abierto.aria);
  vale('el foco entra en el globo', abierto.dentro === true);
  vale('y aterriza en la versión que se está leyendo', abierto.enLaDeAhora === true);
  vale('con una fila por versión', abierto.filas >= 2, abierto.filas);

  /* Tabular a otra versión y entrar. Sin ratón en ningún paso. */
  await p.keyboard.press('Tab');
  const enOtra = await foco();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1800);
  const cambiada = await leerRotulo();
  di('a dónde saltó el tabulador', enOtra);
  di('la versión', antesDeAbrir.ver + ' → ' + cambiada.ver);
  /* LA QUE IMPORTA: que se pueda CAMBIAR de versión sin tocar nada. Quedarse
     en «se abrió el globo» dejaría pasar un globo que se abre y del que no se
     puede salir eligiendo nada, que es medio arreglo. */
  vale('SE CAMBIA DE VERSIÓN SIN PUNTERO',
       !!cambiada.ver && cambiada.ver !== antesDeAbrir.ver,
       antesDeAbrir.ver + ' → ' + cambiada.ver);
  vale('y el globo se cierra al elegir', cambiada.visible === false);
  vale('y vuelve a decir que está cerrado', cambiada.aria === 'false', cambiada.aria);

  /* Escape cierra y DEVUELVE EL FOCO. Un globo que se va con el foco puesto
     dentro lo deja en un elemento oculto y el navegador lo manda al <body>: el
     siguiente tabulador arranca otra vez desde arriba y se pierde el sitio. */
  await p.evaluate(() => document.getElementById('pgVersion').focus());
  await p.keyboard.press('Enter');
  await p.waitForTimeout(600);
  const dentroAntesDeEscape = (await leerRotulo()).dentro;
  await p.keyboard.press('Escape');
  await p.waitForTimeout(600);
  const trasEscape = await p.evaluate(() => ({
    enElRotulo: document.activeElement === document.getElementById('pgVersion'),
    aria: document.getElementById('pgVersion').getAttribute('aria-expanded'),
    visible: document.getElementById('burbujaVersion').classList.contains('visible') }));
  vale('Escape cierra el globo',
       dentroAntesDeEscape === true && trasEscape.visible === false &&
       trasEscape.aria === 'false', JSON.stringify(trasEscape));
  vale('y el foco vuelve al rótulo', trasEscape.enElRotulo === true);

  /* EL ESPACIO TAMBIÉN, y sin llevarse la página por delante: la barra
     espaciadora desplaza por defecto, y un rótulo que abre el globo Y baja la
     hoja hace dos cosas cuando se le pidió una. */
  await p.evaluate(() => { document.getElementById('pgVersion').focus();
                           window.__desplazo = window.scrollY; });
  await p.keyboard.press(' ');
  await p.waitForTimeout(600);
  const conEspacio = await p.evaluate(() => ({
    visible: document.getElementById('burbujaVersion').classList.contains('visible'),
    movio: window.scrollY !== window.__desplazo }));
  vale('el espacio también abre', conEspacio.visible === true);
  vale('y no desplaza la página', conEspacio.movio === false);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);

  /* Y EL DE ARRIBA, que es la puerta de los cuatro paneles —Formato incluido,
     que es donde vivían las versiones—. */
  await p.evaluate(() => document.getElementById('pgCabeza').focus());
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1000);
  const cabeza = await p.evaluate(() => ({
    canto: getComputedStyle(document.getElementById('canto')).display,
    aria: document.getElementById('pgCabeza').getAttribute('aria-expanded'),
    pestanas: [...document.querySelectorAll('.pestanas button')]
                .map(b => b.textContent.trim().toLowerCase()) }));
  di('las pestañas que quedan a mano', cabeza.pestanas);
  vale('Enter en el titulillo abre la burbuja',
       cabeza.canto !== 'none' && cabeza.aria === 'true',
       cabeza.canto + ' · ' + cabeza.aria);
  vale('y desde ahí se llega a Formato',
       cabeza.pestanas.includes('formato'), cabeza.pestanas);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(800);
  vale('Escape la cierra', await p.evaluate(() =>
       document.getElementById('pgCabeza').getAttribute('aria-expanded')) === 'false');

  /* El aro del foco tiene que VERSE, que si no se navega a ciegas. Y solo con
     :focus-visible: quien acaba de tocar el rótulo con el dedo no lo quiere
     pintado encima, que es lo que pasaba con el :hover del que habla la
     cabecera de este archivo. */
  const aro = await p.evaluate(() => {
    const reglas = [...document.styleSheets].flatMap(h => {
      try { return [...h.cssRules]; } catch(e){ return []; } });
    const r = reglas.find(x => x.selectorText &&
                x.selectorText.includes('.pg-version:focus-visible'));
    return { hayRegla: !!r, dibujo: r ? r.style.outline : null,
             cabeza: !!(r && r.selectorText.includes('.pg-cabeza:focus-visible')),
             reposo: getComputedStyle(document.getElementById('pgVersion')).outlineStyle };
  });
  vale('hay aro de foco para el teclado', aro.hayRegla === true);
  vale('para los dos rótulos', aro.cabeza === true, aro.hayRegla ? 'solo el del pie' : '');
  vale('y dibuja algo', !!aro.dibujo && aro.dibujo !== 'none', aro.dibujo);
  vale('en reposo no hay aro', aro.reposo === 'none', aro.reposo);

  /* ================================================================
     EL RÓTULO DEL PIE TIENE QUE ESTAR TAMBIÉN EN LA FOTO DE LA VECINA.

     Al pasar hoja no se ve la hoja: se ve un RETRATO de la de al lado,
     dibujado sobre el lienzo del pliegue a partir del molde #ghost. El molde
     tenía su titulillo de arriba pero no el rótulo de la versión, así que
     durante todo el giro el rótulo desaparecía y volvía a aparecer al
     aterrizar. Se ve pasando hoja y mirando abajo.

     SE MIRA LA TINTA DEL LIENZO Y NO EL DOM, porque en el DOM el rótulo del
     molde puede estar y aun así no salir pintado: lo que se enseña son
     píxeles. Se cuenta la tinta oscura en la banda de abajo, la que ocupa el
     rótulo en la hoja viva.

     Y SE MIRA UNA SERIE, NO UN INSTANTE. Esta prueba se escribió primero con
     una sola foto a los 320 ms y salía en cero: a esa altura el pliegue aún
     no había empezado a pintar. El fallo era del reloj, no del programa —el
     mismo error del umbral de 160 ms que ya nos costó una tarde—. Se muestrea
     todo el giro y se pregunta por el máximo, que es lo que el ojo ve. */
  titulo('el rótulo de la versión, durante el giro');
  const enElGiro = await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const ver = document.querySelector('#pg .pg-version');
    const inner = document.querySelector('#pg .pg-inner');
    if (!ver || !inner) return { sinRotulo:true };
    const ri = inner.getBoundingClientRect(), rv = ver.getBoundingClientRect();
    const y0 = (rv.top - ri.top) / ri.height, y1 = (rv.bottom - ri.top) / ri.height;
    /* Tinta oscura dentro de la banda del rótulo, con cuatro píxeles de
       holgura por el redondeo del lienzo. */
    const tinta = () => {
      const fx = document.getElementById('fx');
      if (!fx || !fx.width) return 0;
      const g = fx.getContext('2d', { willReadFrequently:true });
      const a0 = Math.max(0, Math.round(fx.height * y0) - 4);
      const alto = Math.min(Math.max(6, Math.round(fx.height * (y1 - y0)) + 8), fx.height - a0);
      const d = g.getImageData(0, a0, fx.width, alto).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4){
        if (d[i+3] < 40) continue;
        if (d[i] < 200 && d[i+1] < 190) n++;
      }
      return n;
    };
    const e = document.getElementById('edgeR');
    const rc = e.getBoundingClientRect();
    const op = { bubbles:true, pointerId:680, pointerType:'touch', isPrimary:true,
                 clientX: rc.left + rc.width/2, clientY: 420 };
    e.dispatchEvent(new PointerEvent('pointerdown', op));
    await pausa(60);
    e.dispatchEvent(new PointerEvent('pointerup', op));
    let pico = 0;
    for (let k = 0; k < 14; k++){ await pausa(90); pico = Math.max(pico, tinta()); }
    await pausa(1500);
    return { pico, enElMolde: !!document.querySelector('#ghost .pg-version'),
             enLaHoja: !!document.querySelector('#pg .pg-version') };
  });
  di('la tinta del rótulo en el giro', enElGiro);
  vale('(comprobación) la hoja viva lo tiene', enElGiro.enLaHoja === true, enElGiro);
  vale('el molde de la vecina lo tiene', enElGiro.enElMolde === true, enElGiro);
  vale('Y SE VE DURANTE EL GIRO', enElGiro.pico > 40,
       enElGiro.pico + ' px de tinta en su banda');

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
