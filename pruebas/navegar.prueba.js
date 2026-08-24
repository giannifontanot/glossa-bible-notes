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
    /* EL RÓTULO Y EL BOTÓN, EN EL MISMO RENGLÓN Y CENTRADOS EL UNO CON EL
       OTRO. Se dieron por compartidos desde que el botón subió aquí y no lo
       estaban: #historial es una columna, así que eran dos hijos uno debajo
       del otro y el margin-left:auto solo corría el botón al filo derecho.
       Se mide por los CENTROS y no por el borde de arriba: el botón lleva
       borde y relleno, así que es más alto, y compartir renglón centrados es
       justo lo que no se ve comparando bordes. */
    const tit = document.querySelector('#historial .hs-tit');
    const tb = tit ? tit.getBoundingClientRect() : null;
    const juntos = tb ? {
      mismoCentro: Math.abs((tb.top+tb.bottom)/2 - (suyo.top+suyo.bottom)/2) < 1.5,
      centros: [Math.round((tb.top+tb.bottom)/2*10)/10,
                Math.round((suyo.top+suyo.bottom)/2*10)/10],
      /* y sin pisarse: el rótulo a la izquierda, el botón a la derecha */
      sinPisarse: tb.right <= suyo.left,
      /* el hueco de arriba es el que ya había */
      huecoArriba: Math.round(Math.min(tb.top, suyo.top) - panel.top)
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
             /* pegado al filo derecho, que es donde se pidió */
             aLaDerecha: Math.abs(suyo.right - (panel.right - 6)) < 16,
             destino: antes[1].libro + ' ' + antes[1].cap + ':' + antes[1].vers,
             creció: despues.length - antes.length, aqui };
  }, ATERRIZA).then(r => {
    vale('hay paso atrás y dice a dónde', !r.sinBoton && /\d+:\d+/.test(r.rotulo || ''), r.rotulo);
    vale('  y va a la derecha', r.aLaDerecha);
    vale('  en el mismo renglón que el rótulo, centrados',
         !!r.juntos && r.juntos.mismoCentro, r.juntos && (r.juntos.centros||[]).join(' vs '));
    vale('  sin pisarlo', !!r.juntos && r.juntos.sinPisarse);
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
    return { hist: await tocar('btnHistorial'), canto: await tocar('pgCabeza') };
  }).then(r => {
    const bien = x => x && !x.sinPleno && x.pleno === false && x.panel === true &&
                      x.historial === false && x.canto === false;
    vale('el botón del historial no llega a abrirlo', bien(r.hist), JSON.stringify(r.hist));
    vale('  ni el rótulo abre el canto de los libros', bien(r.canto), JSON.stringify(r.canto));
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

  await cerrar(sesion);
})();
