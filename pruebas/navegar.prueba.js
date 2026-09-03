/* IR A UNA ESCRITURA: LEERLA PRIMERO, SALTAR DESPUÉS, Y PODER VOLVER.

   Tres cosas que hasta ahora eran tres caminos distintos y ahora son uno:

   1. Una referencia dentro de una glosa ya no salta de cabeza. Abre la misma
      ventanita que abre una fila del historial, con el texto del versículo; el
      salto lo dispara el texto de la ventanita. La mayoría de las veces la
      pregunta no es «llévame» sino «qué dice», y contestarla costaba un salto
      entero de ida y otro de vuelta.
   2. Lo mismo dentro de la caja de escribir del panel. Ahí no hay nada que
      tocar —es un textarea— así que se mira en qué carácter cayó el cursor.
   3. El rastro apunta también DE DÓNDE saltaste, y tiene un paso atrás. Sin el
      de dónde, el historial contaba tres destinos sueltos sin el hilo que los
      unía; y el paso atrás no se apunta, porque apuntarlo lo convertiría en un
      columpio entre dos escrituras. */
const { abrir, cerrar, conGlosas, di, vale, titulo } = require('./comun');

const RASTRO = () => JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]')
  .map(h => h.libro + ' ' + h.cap + ':' + h.vers);

/* Los saltos entre libros son largos de verdad —repaginan y voltean un bonche
   entero— y el rastro se apunta al ATERRIZAR, no al pedirlo. Medido: con 2.6 s
   la lista todavía estaba vacía y parecía un fallo del programa. */
const ATERRIZA = 7000;

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  await conGlosas(p);

  titulo('una referencia de una glosa abre la ventanita, no salta');
  di('al tocarla', await p.evaluate(async () => {
    const r = document.querySelector('#pgMargin .ref:not(.muerta), ' +
                                     '#pgFoot .ref:not(.muerta), #pgBody .ref:not(.muerta)');
    if (!r) return { sinRef:true };
    const antes = document.querySelectorAll('#pgBody .v').length;
    const primero = (document.querySelector('#pgBody .v')||{}).textContent;
    r.click();
    await new Promise(z => setTimeout(z, 400));
    const vp = document.getElementById('versoPleno');
    return { visible: vp.classList.contains('visible'),
             ref: (vp.querySelector('.vp-ref')||{}).textContent,
             largoTexto: ((vp.querySelector('.vp-txt')||{}).textContent || '').length,
             /* y la hoja sigue donde estaba: leer no es ir */
             sigueAqui: document.querySelectorAll('#pgBody .v').length === antes &&
                        (document.querySelector('#pgBody .v')||{}).textContent === primero };
  }).then(r => {
    vale('sale la ventanita', !r.sinRef && r.visible);
    vale('  con la referencia resuelta', !!r.ref, r.ref);
    vale('  y el texto del versículo', r.largoTexto > 20, r.largoTexto + ' letras');
    vale('  sin haber saltado a ningún sitio', r.sigueAqui);
    return r;
  }));

  titulo('tocar el texto sí salta, y deja el de dónde apuntado');
  di('tras saltar', await p.evaluate(async (espera) => {
    const antes = JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]').length;
    const b = document.querySelector('#versoPleno .vp-txt');
    if (!b) return { sinBoton:true };
    b.click();
    await new Promise(z => setTimeout(z, espera));
    return { antes, rastro: JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]')
      .map(h => h.libro + ' ' + h.cap + ':' + h.vers) };
  }, ATERRIZA).then(r => {
    /* DOS entradas de un solo salto: el destino arriba y de dónde saliste
       justo debajo. Antes se apuntaba solo el destino, y con tres saltos
       tenías tres escrituras sueltas sin el hilo que las unía. */
    vale('el salto apunta dos escrituras', !r.sinBoton && r.rastro.length === r.antes + 2,
         r.antes + ' → ' + r.rastro.length);
    vale('  el destino arriba y el origen debajo',
         r.rastro.length >= 2 && r.rastro[0] !== r.rastro[1], (r.rastro||[]).slice(0,2).join('  ←  '));
    return r;
  }));

  titulo('el paso atrás vuelve, y no se apunta');
  di('atrás', await p.evaluate(async (espera) => {
    document.getElementById('btnHistorial').click();
    await new Promise(z => setTimeout(z, 400));
    const b = document.querySelector('#historial [data-atras]');
    if (!b) return { sinBoton:true };
    const panel = document.getElementById('historial').getBoundingClientRect();
    const suyo = b.getBoundingClientRect();
    const rotulo = b.textContent.trim();
    /* EL PASO ATRÁS COMPARTE RENGLÓN CON EL DE PONER CINTA, y el rótulo se
       queda solo arriba.

       Aquí se midió antes lo contrario —rótulo y paso atrás juntos— porque así
       estaba. Se cambió al acortar «separador» a «nuevo»: con el nombre corto
       los dos botones caben en un renglón, y el panel gana el que ocupaba el
       de abajo. Los tres nunca cupieron.

       Se mide por los CENTROS y no por el borde de arriba: los botones llevan
       borde y relleno, y compartir renglón centrados es justo lo que no se ve
       comparando bordes. */
    const tit = document.querySelector('#historial .hs-tit');
    const nuevo = document.querySelector('#historial [data-sep-nuevo]');
    const tb = tit ? tit.getBoundingClientRect() : null;
    const rn = nuevo ? nuevo.getBoundingClientRect() : null;
    const juntos = (tb && rn) ? {
      mismoCentro: Math.abs((rn.top+rn.bottom)/2 - (suyo.top+suyo.bottom)/2) < 1.5,
      centros: [Math.round((suyo.top+suyo.bottom)/2*10)/10,
                Math.round((rn.top+rn.bottom)/2*10)/10],
      /* y sin pisarse: el atrás a la izquierda, el de poner a la derecha */
      sinPisarse: suyo.right <= rn.left,
      /* el rótulo, entero por encima del renglón */
      bajoElRotulo: tb.bottom <= suyo.top + 1,
      /* EL HUECO DE ARRIBA SE MIDE EN EL RÓTULO, que es lo que ahora toca el
         filo del panel. Sigue siendo el mismo de siempre: lo que se mudó de
         renglón fue el botón, no el relleno. */
      huecoArriba: Math.round(tb.top - panel.top),
      /* Y EL RENGLÓN, PEGADO AL FILO DERECHO. Lo que hay que medir es el
         ÚLTIMO del renglón, que ya no es el paso atrás sino el de poner. */
      alFilo: Math.round(panel.right - rn.right)
    } : null;
    const antes = JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]');
    b.click();
    await new Promise(z => setTimeout(z, espera));
    const despues = JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]');
    /* ¿llegamos? la fila de «estás aquí» tiene que ser la de atrás */
    document.getElementById('btnHistorial').click();
    await new Promise(z => setTimeout(z, 400));
    const aqui = [...document.querySelectorAll('#historial .hs-fila')]
      .map((f, i) => f.classList.contains('aqui') ? i : -1).filter(i => i >= 0);
    return { rotulo, juntos,
             destino: antes[1].libro + ' ' + antes[1].cap + ':' + antes[1].vers,
             creció: despues.length - antes.length, aqui };
  }, ATERRIZA).then(r => {
    vale('hay paso atrás y dice a dónde', !r.sinBoton && /\d+:\d+/.test(r.rotulo || ''), r.rotulo);
    vale('  y su renglón va pegado al filo derecho',
         !!r.juntos && r.juntos.alFilo <= 16, r.juntos && r.juntos.alFilo + 'px del filo');
    vale('  en el mismo renglón que el de poner cinta, centrados',
         !!r.juntos && r.juntos.mismoCentro, r.juntos && (r.juntos.centros||[]).join(' vs '));
    vale('  sin pisarse', !!r.juntos && r.juntos.sinPisarse);
    vale('  con el rótulo entero por encima',
         !!r.juntos && r.juntos.bajoElRotulo, r.juntos);
    vale('  y con el hueco de arriba de siempre',
         !!r.juntos && r.juntos.huecoArriba >= 7 && r.juntos.huecoArriba <= 13,
         r.juntos && r.juntos.huecoArriba + 'px');
    vale('el rastro no crece al volver', r.creció === 0, r.creció);
    /* Es lo que lo hace un ATRÁS y no un columpio: apuntando, el sitio de
       atrás pasaría a ser el primero y el siguiente «atrás» te devolvería a
       donde acababas de estar. */
    vale('  y de verdad estamos en la de atrás',
         (r.aqui || []).includes(1), 'filas marcadas: ' + JSON.stringify(r.aqui));
    return r;
  }));

  titulo('una escritura dentro de la caja de escribir');
  /* En la hoja las referencias son spans y se tocan; dentro del panel lo que
     hay es un textarea, que no deja marcar nada por dentro. Se mira en qué
     carácter cayó el cursor, con los mismos límites que tiene la hoja: solo
     por dentro de la referencia, solo sin nada seleccionado, y solo si la
     referencia existe de verdad. */
  di('tocando la referencia escrita', await p.evaluate(async () => {
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
    if (!n) return { sinTexto:true };
    const r = document.createRange(); r.setStart(n, 10); r.setEnd(n, 30);
    getSelection().removeAllRanges(); getSelection().addRange(r);
    const rc = r.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
    await new Promise(z => setTimeout(z, 500));
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = 'ver Mateo 5:9 y también algo más';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 150));
    const i = ta.value.indexOf('Mateo 5:9');
    const vp = document.getElementById('versoPleno');
    const tocar = async (a, b) => {
      vp.classList.remove('visible');
      ta.selectionStart = a; ta.selectionEnd = b === undefined ? a : b;
      ta.dispatchEvent(new MouseEvent('click', { bubbles:true }));
      await new Promise(z => setTimeout(z, 250));
      return vp.classList.contains('visible');
    };
    const dentro = await tocar(i + 4);
    const ref = (vp.querySelector('.vp-ref')||{}).textContent;
    const panelSigue = getComputedStyle(document.getElementById('menu')).display !== 'none';
    const fuera = await tocar(1);
    const enElFilo = await tocar(i);
    const arrastrando = await tocar(i + 1, i + 5);
    return { dentro, ref, panelSigue, fuera, enElFilo, arrastrando };
  }).then(r => {
    vale('por dentro abre la ventanita', !r.sinPanel && r.dentro, r.ref);
    vale('  y el panel sigue abierto detrás', r.panelSigue);
    vale('fuera de la referencia, nada', r.fuera === false);
    /* Los filos se dejan libres para poder corregir lo de al lado sin que se
       abra una ventanita cada vez. */
    vale('  y en el filo tampoco', r.enElFilo === false);
    vale('arrastrando para seleccionar, tampoco', r.arrastrando === false);
    return r;
  }));

  titulo('las escrituras escritas se subrayan mientras escribes');
  /* Tocar una referencia dentro de la caja abre la ventanita, pero eso no se
     veía: el texto era texto plano y la única manera de descubrirlo era tocar
     por si acaso. En la hoja una referencia se reconoce por su raya de puntos;
     aquí no había ninguna.

     Un textarea no admite marcado por dentro, así que la raya va en una copia
     calcada encima y sin tinta. Toda la dificultad está en que el calco parta
     los renglones DONDE LOS PARTE el textarea, y eso es lo que se mide: el
     alto de contenido de los dos. Si difiere, es que uno dobla el texto en un
     sitio y el otro en otro, y la raya cae bajo las palabras equivocadas. */
  di('el calco', await p.evaluate(async () => {
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
    if (!n) return { sinTexto:true };
    const rg = document.createRange(); rg.setStart(n, 10); rg.setEnd(n, 30);
    getSelection().removeAllRanges(); getSelection().addRange(rg);
    const rc = rg.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
    await new Promise(z => setTimeout(z, 500));
    const ta = document.getElementById('glosaCaja');
    const eco = document.querySelector('#menu .gl-eco');
    if (!ta || !eco) return { falta:{ ta:!!ta, eco:!!eco } };
    const poner = async (t) => {
      ta.value = t; ta.dispatchEvent(new Event('input', { bubbles:true }));
      await new Promise(z => setTimeout(z, 250));
      const r = eco.querySelector('.ref');
      const a = ta.getBoundingClientRect(), b = eco.getBoundingClientRect();
      return { refs: eco.querySelectorAll('.ref').length,
               texto: r ? r.textContent : null,
               raya: r ? getComputedStyle(r).borderBottomStyle : null,
               /* la raya hereda la tinta de la glosa: si se apagara con
                  color:transparent en vez de con text-fill-color, saldría
                  transparente y no se vería nada */
               tinta: r ? getComputedStyle(r).borderBottomColor : null,
               altoTa: ta.scrollHeight, altoEco: eco.scrollHeight,
               encaja: Math.abs(a.left-b.left) < 1 && Math.abs(a.top-b.top) < 1 &&
                       Math.abs(a.width-b.width) < 1,
               sangriaIgual: (ta.style.textIndent||'') === (eco.style.textIndent||'') };
    };
    const res = {
      corta:  await poner('ver Mateo 5:9 aquí'),
      falsa:  await poner('ver Mateo 999:9 aquí'),
      media:  await poner('ver Mateo 5: aquí'),
      dos:    await poner('Mateo 5:9 y también Juan 3:16 al final'),
      larga:  await poner('una nota bien larga que va a partir en varios renglones y que ' +
                          'menciona Mateo 5:9 por el medio, para ver si la raya cae donde ' +
                          'tiene que caer cuando el texto se dobla en cuatro o cinco líneas ' +
                          'seguidas sin ningún salto puesto a mano'),
      saltos: await poner('primera\n\nMateo 5:9\n\n')
    };
    await poner(('renglón de relleno número X. '.repeat(40)) + ' y al final Mateo 5:9 .');
    ta.scrollTop = 400;
    ta.dispatchEvent(new Event('scroll', { bubbles:true }));
    await new Promise(z => setTimeout(z, 200));
    res.desplaza = { desborda: getComputedStyle(ta).overflowY === 'auto',
                     ta: ta.scrollTop, eco: eco.scrollTop };
    /* se cierra sin dejar nota, para no ensuciar lo que venga después */
    ta.value = ''; ta.dispatchEvent(new Event('input', { bubbles:true }));
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:3, clientY:3 }));
    await new Promise(z => setTimeout(z, 800));
    return res;
  }).then(r => {
    const listo = !r.sinTexto && !r.falta;
    vale('una escritura escrita sale subrayada',
         listo && r.corta.refs === 1 && r.corta.raya === 'dotted', r.corta && r.corta.texto);
    vale('  con la tinta de la glosa, no transparente',
         listo && !/transparent|, 0\)/.test(r.corta.tinta || 'transparent'), r.corta && r.corta.tinta);
    /* Las mismas que responden al toque, ni una más: subrayar lo que no lleva
       a ningún sitio sería prometer algo que no pasa al tocarlo. */
    vale('una que no existe no se subraya', listo && r.falsa.refs === 0);
    vale('  ni una a medio escribir', listo && r.media.refs === 0);
    vale('dos escrituras, dos rayas', listo && r.dos.refs === 2, r.dos && r.dos.refs);
    for (const [k, x] of Object.entries(r)){
      if (k === 'desplaza' || !x || x.altoTa === undefined) continue;
      vale('el calco parte igual (' + k + ')', x.altoTa === x.altoEco,
           x.altoTa + ' / ' + x.altoEco);
    }
    vale('y va donde va la caja', listo && r.corta.encaja && r.corta.sangriaIgual);
    vale('con nota larga, el calco se desplaza con ella',
         listo && r.desplaza.desborda && r.desplaza.eco === r.desplaza.ta,
         r.desplaza && (r.desplaza.ta + ' / ' + r.desplaza.eco));
    return r;
  }));

  titulo('la ventanita se cierra tocando fuera, venga de donde venga');
  /* NACIÓ COLGADA DEL HISTORIAL y el oyente del toque de fuera se quedó
     preguntando por el historial. Con las dos puertas nuevas —una referencia
     dentro de una glosa, y la caja de escribir del panel— el historial está
     cerrado, el oyente se rendía en la primera línea y la ventanita se quedaba
     puesta. Y no tiene botón de cerrar: lo único que quedaba era saltar al
     versículo o dar a Escape, o sea irse a otro sitio para poder quedarse. */
  di('abierta desde una referencia', await p.evaluate(async () => {
    const vp = document.getElementById('versoPleno');
    const hs = document.getElementById('historial');
    /* EL HISTORIAL, CERRADO Y COMPROBADO. La sección de arriba lo deja
       abierto para mirar la fila de «estás aquí», y con él abierto el oyente
       del toque de fuera se dispara por SU camino: la ventanita se cerraría
       igual y esta comprobación daría verde sin haber probado nada. Medido
       —quitando el arreglo, con el historial abierto seguía en verde—. */
    if (hs.classList.contains('visible')){
      document.getElementById('btnHistorial').click();
      await new Promise(z => setTimeout(z, 500));
    }
    const historialCerrado = !hs.classList.contains('visible');
    const r = document.querySelector('#pgMargin .ref:not(.muerta), ' +
                                     '#pgFoot .ref:not(.muerta), #pgBody .ref:not(.muerta)');
    if (!r) return { sinRef:true, historialCerrado };
    r.click(); await new Promise(z => setTimeout(z, 400));
    const antes = vp.classList.contains('visible');
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:3, clientY:3 }));
    await new Promise(z => setTimeout(z, 500));
    return { historialCerrado, antes, despues: vp.classList.contains('visible') };
  }).then(r => {
    vale('el historial está cerrado, que es el caso que falla', r.historialCerrado);
    vale('sale y se va tocando fuera', !r.sinRef && r.antes && r.despues === false,
         r.sinRef ? 'no había referencia' : r.antes + ' → ' + r.despues);
    return r;
  }));

  /* Y CON EL PANEL DETRÁS, EL TOQUE ES DE LA VENTANITA. Cerrar las dos de una
     vez es perder el panel por haber querido quitar lo que lo tapaba. Lo
     escrito no se pierde —cerrar guarda— pero hay que volver a abrirlo para
     seguir escribiendo, y eso con la referencia recién consultada delante. */
  di('abierta sobre el panel', await p.evaluate(async () => {
    const vp = document.getElementById('versoPleno');
    const vivo = () => getComputedStyle(document.getElementById('menu')).display !== 'none';
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
    if (!n) return { sinTexto:true };
    const rg = document.createRange(); rg.setStart(n, 10); rg.setEnd(n, 30);
    getSelection().removeAllRanges(); getSelection().addRange(rg);
    const rc = rg.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
    await new Promise(z => setTimeout(z, 500));
    const ta = document.getElementById('glosaCaja'); if (!ta) return { sinPanel:true };
    ta.value = 'ver Mateo 5:9 aquí';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 150));
    const i = ta.value.indexOf('Mateo 5:9');
    ta.selectionStart = ta.selectionEnd = i + 4;
    ta.dispatchEvent(new MouseEvent('click', { bubbles:true }));
    await new Promise(z => setTimeout(z, 350));
    const antes = { pleno: vp.classList.contains('visible'), panel: vivo() };
    const tocarFuera = async () => {
      document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
        { bubbles:true, clientX:3, clientY:3 }));
      await new Promise(z => setTimeout(z, 800));
      return { pleno: vp.classList.contains('visible'), panel: vivo() };
    };
    return { antes, uno: await tocarFuera(), dos: await tocarFuera() };
  }).then(r => {
    const listo = !r.sinTexto && !r.sinPanel;
    vale('la ventanita sale sobre el panel', listo && r.antes.pleno && r.antes.panel);
    vale('  el primer toque se lleva la ventanita, no el panel',
         listo && r.uno.pleno === false && r.uno.panel === true, JSON.stringify(r.uno));
    vale('  y el segundo ya cierra el panel',
         listo && r.dos.panel === false, JSON.stringify(r.dos));
    return r;
  }));

  /* Y EL TOQUE NO LLEGA AL BOTÓN QUE SE HAYA TOCADO. Un toque suelta tres
     eventos —pointerdown, pointerup y click— y son tres: cerrar la ventanita
     en el pointerdown no impide que el click abra el historial o el canto de
     los libros. Sin tragarse ese clic quedaban DOS paneles puestos a la vez,
     el de la glosa y el otro. Lo levantó Codex. */
  di('tocando un botón de verdad', await p.evaluate(async () => {
    const abrirTodo = async () => {
      document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
        { bubbles:true, clientX:3, clientY:3 }));
      await new Promise(z => setTimeout(z, 700));
      const v = document.querySelector('#pgBody .v');
      const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
      while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
      if (!n) return false;
      const rg = document.createRange(); rg.setStart(n, 10); rg.setEnd(n, 30);
      getSelection().removeAllRanges(); getSelection().addRange(rg);
      const rc = rg.getBoundingClientRect();
      document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
        { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
      await new Promise(z => setTimeout(z, 500));
      const ta = document.getElementById('glosaCaja'); if (!ta) return false;
      ta.value = 'ver Mateo 5:9 aquí';
      ta.dispatchEvent(new Event('input', { bubbles:true }));
      await new Promise(z => setTimeout(z, 150));
      const i = ta.value.indexOf('Mateo 5:9');
      ta.selectionStart = ta.selectionEnd = i + 4;
      ta.dispatchEvent(new MouseEvent('click', { bubbles:true }));
      await new Promise(z => setTimeout(z, 350));
      return document.getElementById('versoPleno').classList.contains('visible');
    };
    /* el toque va COMPLETO —pointerdown y su click—, que es justo el par que
       el arreglo tiene que separar; disparando solo el pointerdown la prueba
       daría verde sin haber probado nada. */
    const tocar = async (id) => {
      if (!await abrirTodo()) return { sinPleno:true };
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      const x = Math.round(r.left + r.width/2), y = Math.round(r.top + r.height/2);
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:x, clientY:y }));
      el.dispatchEvent(new MouseEvent('click', { bubbles:true, clientX:x, clientY:y }));
      await new Promise(z => setTimeout(z, 800));
      return { pleno: document.getElementById('versoPleno').classList.contains('visible'),
               panel: getComputedStyle(document.getElementById('menu')).display !== 'none',
               historial: document.getElementById('historial').classList.contains('visible'),
               canto: document.getElementById('canto').classList.contains('visible') };
    };
    /* Y EL BOTÓN DE DENTRO DEL PROPIO PANEL. Es el camino que se escapaba
       cuando esto solo tocaba hueco en blanco: un clic en la parte del panel
       que se sigue viendo —el botón de las etiquetas— quitaba la ventanita y
       de paso desplegaba la lista, que es media cosa de cada. */
    const enElPanel = await (async () => {
      if (!await abrirTodo()) return { sinPleno:true };
      const abiertas = () => !!document.querySelector('#menu .tagbox.abierta');
      const b = document.querySelector('#menu .mtags');
      if (!b) return { sinBoton:true };
      const r = b.getBoundingClientRect();
      const x = Math.round(r.left + r.width/2), y = Math.round(r.top + r.height/2);
      const tocar = async () => {
        b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:x, clientY:y }));
        b.dispatchEvent(new MouseEvent('click', { bubbles:true, clientX:x, clientY:y }));
        await new Promise(z => setTimeout(z, 900));
        return { pleno: document.getElementById('versoPleno').classList.contains('visible'),
                 tags: abiertas(),
                 panel: getComputedStyle(document.getElementById('menu')).display !== 'none' };
      };
      return { uno: await tocar(), dos: await tocar() };
    })();
    return { hist: await tocar('btnHistorial'), canto: await tocar('pgCabeza'), enElPanel };
  }).then(r => {
    const bien = x => x && !x.sinPleno && x.pleno === false && x.panel === true &&
                      x.historial === false && x.canto === false;
    vale('el botón del historial no llega a abrirlo', bien(r.hist), JSON.stringify(r.hist));
    vale('  ni el rótulo abre el canto de los libros', bien(r.canto), JSON.stringify(r.canto));
    const e = r.enElPanel || {};
    vale('  ni el de las etiquetas, que está dentro del panel',
         !e.sinPleno && !e.sinBoton && e.uno &&
         e.uno.pleno === false && e.uno.tags === false && e.uno.panel === true,
         JSON.stringify(e.uno));
    /* y el segundo toque sí hace lo suyo: la cesión es de UN toque, no un
       botón sordo mientras la ventanita haya estado puesta alguna vez */
    vale('  y al segundo toque las etiquetas se abren',
         !!e.dos && e.dos.tags === true, JSON.stringify(e.dos));
    return r;
  }));

  /* El historial sigue haciendo lo de siempre: si está abierto, el toque de
     fuera se los lleva a los dos. Es el camino viejo, y el arreglo no tenía
     por qué tocarlo. */
  di('abierta desde el historial', await p.evaluate(async () => {
    const vp = document.getElementById('versoPleno');
    const hs = document.getElementById('historial');
    document.getElementById('btnHistorial').click();
    await new Promise(z => setTimeout(z, 500));
    const fila = document.querySelector('#historial .hs-fila');
    if (!fila) return { sinFila:true };
    fila.click(); await new Promise(z => setTimeout(z, 450));
    const antes = { pleno: vp.classList.contains('visible'),
                    hist: hs.classList.contains('visible') };
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:3, clientY:3 }));
    await new Promise(z => setTimeout(z, 600));
    return { antes, pleno: vp.classList.contains('visible'),
             hist: hs.classList.contains('visible') };
  }).then(r => {
    vale('el toque de fuera se lleva las dos', !r.sinFila && r.antes.pleno &&
         r.pleno === false && r.hist === false,
         r.sinFila ? 'el historial no tenía filas' : JSON.stringify(r));
    return r;
  }));

  titulo('saltar desde una glosa de las listas apunta también de dónde');
  /* Una referencia dentro de una glosa ya apuntaba las dos escrituras. Las
     LISTAS no: elegir una glosa del índice, o una de las de «citado desde»,
     es un salto igual de largo y el rastro contaba solo el destino. El paso
     atrás te devolvía a lo anterior que hubieras saltado —que puede ser de
     otro rato— en vez de a la hoja que estabas leyendo.

     El índice ha cambiado de gesto desde entonces: elegir ya no salta, saca
     la ventanita, y el salto es tocar su texto. La regla que se vigila aquí
     es la misma —dos escrituras, destino arriba y de dónde debajo—, solo que
     el camino lleva un toque más. */
  di('desde el índice de glosas', await p.evaluate(async () => {
    localStorage.setItem('glossa:historial:v1', '[]');
    const cabeza = document.getElementById('pgCabeza').textContent.trim();
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 700));
    const t = [...document.querySelectorAll('.pestanas button')]
      .find(x => x.textContent.trim().toLowerCase().includes('glosa'));
    if (!t) return { sinPestana:true };
    t.click();
    await new Promise(z => setTimeout(z, 1200));
    const it = [...document.querySelectorAll('#indice .ix-item')];
    if (!it.length) return { sinItems:true };
    /* la última de la lista, que es la que más lejos cae de donde estamos */
    it[it.length - 1].click();
    await new Promise(z => setTimeout(z, 900));
    /* PRIMERO SE LEE, LUEGO SE VA. Elegir del índice ya no salta de golpe:
       saca la ventanita con el versículo, y el salto es tocar su texto —lo
       mismo que hace una referencia dentro de una glosa—. El rastro se apunta
       en el salto, así que sin este segundo toque no hay nada que mirar. */
    const vp = document.querySelector('#versoPleno .vp-txt');
    if (!vp) return { cabeza, sinVentanita:true,
                      rastro: JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]')
                        .map(h => h.libro + ' ' + h.cap + ':' + h.vers) };
    vp.click();
    await new Promise(z => setTimeout(z, 7000));
    return { cabeza, rastro: JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]')
      .map(h => h.libro + ' ' + h.cap + ':' + h.vers) };
  }).then(r => {
    vale('el salto apunta dos escrituras', !r.sinItems && !r.sinPestana &&
         !r.sinVentanita && (r.rastro || []).length === 2, JSON.stringify(r.rastro));
    vale('  y la de debajo es de donde salimos',
         (r.rastro || []).length === 2 && r.rastro[0] !== r.rastro[1],
         (r.rastro || []).join('  ←  '));
    return r;
  }));

  di('desde «citado desde»', await p.evaluate(async () => {
    /* Hace falta una glosa que CITE un versículo de esta hoja: el contador de
       «citado desde» solo sale donde alguien te ha citado. */
    const ms = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    if (!ms.some(m => m.id === 'citadora-1')){
      ms.push({ id:'citadora-1', libro:'MAT', cap:1, vers:6, cita:'MAT 1:6',
                antes:'', despues:'', ini:0, fin:8, versionOrigen:'VBL',
                estilo:'fill', color:'oro', etiquetas:[], creada:'2026-08-24',
                nota:'compárese con Mateo 1:1 y su lista' });
      localStorage.setItem('glossa:marcas:v1', JSON.stringify(ms));
    }
    /* Y HAY QUE VOLVER AL PRINCIPIO. La sección de antes nos dejó en Mateo 28,
       y el contador de esta glosa sale en Mateo 1:1: sin devolver el punto de
       lectura, aquí no hay contador que tocar y la comprobación se saltaría
       sola. Se hace en los ajustes, que es de donde el programa lo lee al
       arrancar, y por eso este trozo va justo antes de recargar. */
    const aj = JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}');
    aj.libro = 'MAT'; aj.cap = 1; aj.vers = 1;
    localStorage.setItem('glossa:ajustes:v1', JSON.stringify(aj));
    return true;
  }).then(async () => {
    await p.reload({ waitUntil:'load' });
    await p.waitForTimeout(2500);
    return p.evaluate(async () => {
      localStorage.setItem('glossa:historial:v1', '[]');
      const b = document.querySelector('#pgBody .back, #pgMargin .back, #pgFoot .back');
      if (!b) return { sinContador:true };
      const desde = b.dataset.back;
      b.click(); await new Promise(z => setTimeout(z, 700));
      const it = document.querySelector('#menu [data-ir]');
      if (!it) return { sinLista:true, desde };
      const llevaDesde = it.dataset.desde || null;
      it.click(); await new Promise(z => setTimeout(z, 6000));
      return { desde, llevaDesde,
               rastro: JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]')
                 .map(h => h.libro + ' ' + h.cap + ':' + h.vers) };
    });
  }).then(r => {
    const listo = !r.sinContador && !r.sinLista;
    /* Que el contador esté ahí es la premisa: sin él no se prueba nada, y sin
       decirlo el fallo saldría como «no lleva el de dónde», que es otra cosa. */
    vale('hay un contador de «citado desde» que tocar', !r.sinContador && !r.sinLista,
         r.sinContador ? 'ninguno en la hoja' : (r.sinLista ? 'lista vacía' : r.desde));
    vale('la lista lleva de qué versículo salió', listo && r.llevaDesde === r.desde,
         r.llevaDesde + ' / ' + r.desde);
    /* Y ese, no el principio de la hoja: la lista se abre desde el contador de
       UN versículo, así que el salto sale de ahí. */
    vale('  y el rastro apunta ese mismo', listo && (r.rastro || []).length === 2 &&
         r.rastro[1].endsWith(' ' + r.desde), JSON.stringify(r.rastro));
    return r;
  }));

  titulo('dos escrituras iguales seguidas se ven una sola vez');
  /* El rastro se guarda tal cual, repetido y todo —es el camino que seguiste—.
     Lo que sobra es verlo dos veces seguidas, y se dan solas: saltar apunta el
     de dónde y el a dónde, así que dos saltos encadenados desde el mismo sitio
     dejan la misma escritura en dos renglones pegados. */
  di('el rastro resumido', await p.evaluate(async () => {
    localStorage.setItem('glossa:historial:v1', JSON.stringify([
      { libro:'MAT', cap:5, vers:9, t:9 }, { libro:'MAT', cap:5, vers:9, t:8 },
      { libro:'MAT', cap:1, vers:1, t:7 }, { libro:'MAT', cap:1, vers:1, t:6 },
      { libro:'MAT', cap:1, vers:1, t:5 }, { libro:'LUK', cap:2, vers:1, t:4 },
      { libro:'MAT', cap:5, vers:9, t:3 }]));
    const hs = document.getElementById('historial');
    if (hs.classList.contains('visible')){
      document.getElementById('btnHistorial').click();
      await new Promise(z => setTimeout(z, 500));
    }
    document.getElementById('btnHistorial').click();
    await new Promise(z => setTimeout(z, 800));
    return { guardadas: JSON.parse(localStorage.getItem('glossa:historial:v1')).length,
             filas: [...document.querySelectorAll('#historial .hs-fila')]
               .map(f => f.querySelector('.hs-ref').textContent.trim()),
             atras: (document.querySelector('#historial [data-atras]') || {}).textContent };
  }).then(r => {
    vale('siete apuntadas, cuatro renglones', r.guardadas === 7 && r.filas.length === 4,
         r.guardadas + ' → ' + r.filas.length + ': ' + r.filas.join(' · '));
    /* Lo guardado NO se toca: reordenarlo o resumirlo al guardar sería mentir
       sobre en qué orden pasaron las cosas. */
    vale('  y las siete siguen guardadas', r.guardadas === 7);
    vale('  sin dos iguales pegadas', r.filas.every((x, i) => i === 0 || x !== r.filas[i-1]),
         r.filas.join(' · '));
    /* El paso atrás lee la MISMA lista resumida: si no, diría «atrás a Mt 5:9»
       estando ya en Mt 5:9, y tocarlo no movería nada. */
    vale('el paso atrás salta la repetida', /1:1/.test(r.atras || ''), r.atras);
    return r;
  }));

  di('y el atrás mueve de verdad', await p.evaluate(async () => {
    const bo = document.querySelector('#historial [data-atras]');
    if (!bo) return { sinBoton:true };
    const rotulo = bo.textContent.trim();
    bo.click(); await new Promise(z => setTimeout(z, 7000));
    return { rotulo, cabeza: document.getElementById('pgCabeza').textContent.trim(),
             guardadas: JSON.parse(localStorage.getItem('glossa:historial:v1')).length };
  }).then(r => {
    vale('llega a la escritura que anunciaba', !r.sinBoton && /1:1/.test(r.cabeza || ''),
         r.rotulo + ' → ' + r.cabeza);
    vale('  y no apunta el regreso', r.guardadas === 7, r.guardadas);
    return r;
  }));

  await cerrar(sesion);
})();
