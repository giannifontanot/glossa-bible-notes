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
const { abrir, cerrar, cerrarParcial, conGlosas, di, vale, titulo,
        ESCRITORIO } = require('./comun');

/* EL TELÉFONO MÁS ESTRECHO QUE SE USA, y no está en comun porque sólo hace
   falta aquí: es el peor caso de los letreros de las guías. Los dos puntos de
   arriba viven en medio de sus vecinos, así que sus letreros crecen hacia las
   letras del titulillo, y cuanto más estrecha la pantalla menos hueco hay. A
   320 fue donde el techo de esos letreros se midió; sin esta pantalla en la
   lista, el banco los daba por buenos mirando sólo 412, que es donde sobra
   sitio. */
const ESTRECHO_DEDO = { viewport:{ width:320, height:700 },
                        isMobile:true, hasTouch:true, deviceScaleFactor:2 };

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
    /* EL PASO ATRÁS, SOLO EN SU RENGLÓN, con el rótulo entero por encima.

       Este bloque ha medido tres cosas distintas según iba cambiando el panel:
       primero rótulo y paso atrás en el mismo renglón; luego el paso atrás
       compartiéndolo con los dos botones de poner; y ahora otra vez el paso
       atrás solo, porque los de poner se mudaron DENTRO de sus listas —poner
       una cinta y ver tus cintas son el mismo asunto y estaban en dos sitios—.

       Se mide por los CENTROS y no por el borde de arriba: los botones llevan
       borde y relleno, y estar centrado en su renglón es justo lo que no se ve
       comparando bordes. */
    const tit = document.querySelector('#historial .hs-tit');
    const acciones = document.querySelector('#historial .hs-acciones');
    const tb = tit ? tit.getBoundingClientRect() : null;
    const cab = document.querySelector('#historial .hs-cab');
    const juntos = (tb && acciones) ? {
      /* SOLO ÉL en el renglón: los de poner ya no viven aquí. */
      soloElAtras: [...acciones.children].length === 1 &&
                   b.parentElement === acciones,
      sinLosDePoner: !document.querySelector('#historial [data-sep-nuevo]') &&
                     !document.querySelector('#historial [data-piedra-nueva]'),
      /* el rótulo, entero por encima del renglón */
      bajoElRotulo: tb.bottom <= suyo.top + 1,
      /* EL HUECO DE ARRIBA, Y ESTA LÍNEA YA LLEVA DOS MUDANZAS.

         Se midió contra el filo del panel hasta que la equis se puso en un
         renglón propio encima del rótulo; entonces pasó a medirse contra ese
         renglón. Y ahora el renglón propio se fue: la equis comparte el del
         rótulo, a su misma altura, que es como se pidió.

         Así que vuelve a medirse contra el filo del panel, que es donde
         empezó. Lo que esta línea caza no ha cambiado nunca: que la cabecera
         arranque pegada al filo, o que se abra un hueco que nadie pidió. El
         margen es más ancho que aquel 1–10 porque ahora el renglón lo marca
         una equis de 44 px y el rótulo va centrado en él, así que entre el
         filo y el rótulo cabe media equis. Que la equis esté a ras de su
         esquina, y al nivel del rótulo, lo comprueba separador.prueba.js, que
         es donde vive esa pieza. */
      /* Y AQUÍ HABÍA DOS NOMBRES PARA EL MISMO NÚMERO. Al volver a medirse
         contra el filo del panel, `huecoArriba` pasó a ser exactamente lo
         mismo que `cabezaEntera`, y dos aserciones sobre la misma cuenta no
         vigilan el doble: vigilan lo mismo y hacen creer que no. Se queda una,
         con el margen de la más estricta. */
      cabezaEntera: cab ? Math.round(tb.top - panel.top) : null,
      /* Y PEGADO AL FILO DERECHO. */
      alFilo: Math.round(panel.right - suyo.right)
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
    vale('  y SOLO ÉL en su renglón', !!r.juntos && r.juntos.soloElAtras, r.juntos);
    vale('  los de poner se fueron a sus listas',
         !!r.juntos && r.juntos.sinLosDePoner, r.juntos);
    vale('  con el rótulo entero por encima',
         !!r.juntos && r.juntos.bajoElRotulo, r.juntos);
    vale('  y con el hueco de arriba de siempre, sin hincharse',
         !!r.juntos && r.juntos.cabezaEntera !== null &&
         r.juntos.cabezaEntera >= 1 && r.juntos.cabezaEntera <= 30,
         r.juntos && r.juntos.cabezaEntera + 'px del filo al rótulo');
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
    /* con el dedo: ver PINCEL en comun.js */
    if (!await window.__glosarEn(v, 10, 30)) return { sinTexto:true, porque: window.__pincelPorque };
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
    if (!await window.__glosarEn(v, 10, 30)) return { sinTexto:true, porque: window.__pincelPorque };
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
    if (!await window.__glosarEn(v, 10, 30)) return { sinTexto:true, porque: window.__pincelPorque };
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
      if (!await window.__glosarEn(v, 10, 30)) return false;
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
    const t = document.querySelector('.pestanas button[data-sec="glosas"]');
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

  /* ================================================================
     LAS DOS FLECHAS: UN LETRERO QUE APUNTA AL FILO.

     Nacieron como botones que pasaban hoja y eso se deshizo a propósito. La
     hoja se pasa tocando el filo —o arrastrándolo, que además la pliega con el
     dedo— y ese filo es invisible: quien no lo sabe no lo descubre. Un botón
     encima resolvía el problema de hoy y dejaba el de mañana, porque el lector
     aprendía el botón y nunca el filo. Ahora la flecha es un dibujo rojo con la
     punta pegada al filo, y el que trabaja es el filo.

     LO QUE HAY QUE PROBAR ES QUE NO HAGA NADA, que es lo raro de esta prueba.
     Tres cosas, y las tres se rompen por separado:
     · que bajo su punta esté EL FILO y no ella —si se comiera el toque, el
       lector aprendería a tocar la flecha, que es justo lo contrario—;
     · que tocarla no pase hoja;
     · y que el filo sí la pase, o lo de arriba sería verdad por estar todo
       roto.

     Y se mide dónde cae contra la ESCENA, no contra píxeles escritos: «pegada
     al filo» tiene que seguir siendo verdad en cualquier pantalla. */
  titulo('las flechas de pasar hoja');
  const fl = await abrir();
  const pf = fl.pagina;
  const flechas = await pf.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    /* SE PREGUNTA POR LO QUE SE VE, NO POR EL ATRIBUTO, y esto es una lección
       pagada: la primera versión de esta prueba miraba `.hidden` y daba verde
       con las dos flechas pintadas en la pantalla. El atributo estaba puesto;
       lo que no estaba era el display:none. El atributo dice la intención; el
       display dice la verdad. Se miran los dos. */
    const oculta = id => { const e = document.getElementById(id);
      return e.hidden && getComputedStyle(e).display === 'none' &&
             e.getBoundingClientRect().height === 0; };
    const seVe = id => { const e = document.getElementById(id);
      return !e.hidden && e.getBoundingClientRect().height > 8; };
    /* NACEN ENCENDIDAS, Y ESO ES LO CONTRARIO DE LO QUE PEDÍA ESTA LÍNEA.

       Nacían apagadas mientras el interruptor era sólo el de las flechas: unas
       flechas permanentes sobre el papel son ruido para quien ya sabe pasar la
       hoja. Ahora enciende TODAS las puertas —los cuatro puntos de las
       esquinas y los dos rótulos—, que son justamente las que alguien que abre
       por primera vez no tiene manera de descubrir, así que de fábrica van
       puestas. Lo decidió el dueño del repo.

       Y de paso el andamio mejora: antes daba UN clic y medía: comprobaba que
       la casilla enciende y nada más. Ahora da DOS y mide en los dos sitios,
       así que comprueba el interruptor entero —que apaga y que enciende—, que
       es lo que un interruptor tiene que hacer. */
    /* Y «ENCENDIDAS» NO ES «LAS DOS SE VEN», que es lo que escribí primero y
       lo que la tanda desmintió: al arrancar estamos en la PRIMERA hoja de los
       datos y hacia atrás no hay a dónde ir, así que la izquierda no sale —ni
       debe—. Es lo mismo que este bloque ya sabe unas líneas más abajo, donde
       pasa una hoja antes de medir por esta misma razón.
       Así que se mide contra el FILO, que es el invariante de verdad y el que
       este bloque comprueba al final: cada flecha se ve exactamente cuando hay
       hoja a su lado. Encendido el interruptor, eso es lo que significa. */
    const vivo = id => !document.getElementById(id).classList.contains('off');
    const nacen = { izq: seVe('flechaIzq'), der: seVe('flechaDer'),
                    filoIzq: vivo('edgeL'), filoDer: vivo('edgeR') };
    /* El interruptor vive en LIBROS, que es el panel de moverse por el libro. */
    document.getElementById('pgCabeza').click(); await pausa(700);
    const pest = document.querySelector('.pestanas button[data-sec="libros"]');
    if (pest) pest.click();
    await pausa(700);
    const chk = document.getElementById('chkFlechas');
    if (!chk) return { nacen, sinCasilla:true };
    const rotulo = chk.closest('label').textContent.trim();
    const blanco = Math.round(chk.closest('label').getBoundingClientRect().height);
    /* Primer clic: apaga. Se mide con el panel todavía abierto, que las
       flechas viven en la escena y no dentro de él. */
    chk.click(); await pausa(600);
    const apagadas = { izq: oculta('flechaIzq'), der: oculta('flechaDer') };
    const guardadoApagado = JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}').verFlechas;
    /* Y el segundo las devuelve, que es el estado en el que se mide todo lo
       demás: dónde caen, de qué color son y qué hay bajo su punta. */
    chk.click(); await pausa(500);
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await pausa(700);
    /* SE PASA UNA HOJA ANTES DE MEDIR, y hace falta: en la primera hoja de los
       datos la flecha izquierda no existe —no hay a dónde ir— así que medirla
       ahí daba ceros y hacía fallar «una a cada lado» con el programa
       haciéndolo bien. Con una hoja de por medio las dos están puestas. */
    const filo = document.getElementById('edgeR');
    const rf = filo.getBoundingClientRect();
    const opf = { bubbles:true, cancelable:true, pointerId:661, pointerType:'touch',
                  isPrimary:true, clientX: Math.round(rf.left + rf.width/2), clientY: 420 };
    filo.dispatchEvent(new PointerEvent('pointerdown', opf)); await pausa(60);
    filo.dispatchEvent(new PointerEvent('pointerup', opf));
    await pausa(2800);
    const st = document.querySelector('.stage').getBoundingClientRect();
    const i = document.getElementById('flechaIzq'), d = document.getElementById('flechaDer');
    const ri = i.getBoundingClientRect(), rd = d.getBoundingClientRect();
    const ci = getComputedStyle(i);
    /* LA PUNTA SE MIDE EN LA TINTA, no en la caja. Esto medía el <svg>, que
       llena el <div> y por tanto tiene sus mismos filos: la aserción salía
       verde dijera lo que dijera el dibujo de dentro, y con el galón metido en
       el tercio izquierdo del recuadro la punta habría estado a cuatro píxeles
       del filo sin que nadie se enterara.
       Y NO BASTA CON EL RECUADRO DEL <path>: getBoundingClientRect devuelve la
       caja GEOMÉTRICA del trazado, sin el grosor del trazo. Con 3.4 de grosor y
       remates redondos, la tinta sobresale medio grosor por cada lado —casi
       tres píxeles en pantalla—, que en esta medida es la diferencia entre
       tocar el filo y no tocarlo. Se suma. */
    const tinta = e => {
      const path = e.querySelector('path');
      const r = path.getBoundingClientRect();
      const bb = path.getBBox();
      /* de unidades del recuadro a píxeles de pantalla */
      const escala = bb.width ? r.width / bb.width : 1;
      const medio = parseFloat(getComputedStyle(path).strokeWidth) * escala / 2;
      return { left: r.left - medio, right: r.right + medio };
    };
    const si = tinta(i), sd = tinta(d);
    /* Y QUÉ HAY DEBAJO DE LA PUNTA. Tres píxeles adentro del filo del dibujo,
       a media altura: ahí tiene que responder el filo de pasar hoja. */
    const bajoIzq = document.elementFromPoint(Math.round(si.left + 3),
                                              Math.round(ri.top + ri.height/2));
    const bajoDer = document.elementFromPoint(Math.round(sd.right - 3),
                                              Math.round(rd.top + rd.height/2));
    return { nacen, rotulo, blanco, apagadas, guardadoApagado,
             encendidas: { izq: seVe('flechaIzq'), der: seVe('flechaDer') },
             mitad: Math.round(st.top + st.height/2),
             centroIzq: Math.round(ri.top + ri.height/2),
             izqAlaIzquierda: ri.left - st.left < st.width/2,
             derAlaDerecha: rd.right > st.left + st.width/2,
             /* Pegadas al filo de la escena por fuera y sin salirse. */
             puntaIzq: Math.round(si.left - st.left),
             puntaDer: Math.round(st.right - sd.right),
             /* SOLO EL GALÓN: un trazado de un solo trozo. El asta era un
                segundo «M» dentro del mismo path, así que contarlos dice si
                volvió a colarse el palo horizontal. */
             trozos: (i.querySelector('path').getAttribute('d').match(/M/gi) || []).length,
             /* Y DE DÓNDE SALE EL ROJO. Si la variable está puesta y el color
                pintado es el suyo, el rojo viene de la paleta de piedras y no
                de un número escrito en la hoja de estilos. */
             variable: getComputedStyle(document.documentElement)
                         .getPropertyValue('--rojo-galon').trim(),
             /* Un letrero, no un mando. */
             etiqueta: i.tagName, ojos: ci.pointerEvents, color: ci.color,
             fondo: ci.backgroundColor, borde: parseFloat(ci.borderTopWidth),
             bajoIzq: bajoIzq ? (bajoIzq.id || String(bajoIzq.className)) : null,
             bajoDer: bajoDer ? (bajoDer.id || String(bajoDer.className)) : null,
             guardado: JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}').verFlechas };
  });
  di('las flechas', flechas);
  /* EL RÓTULO CAMBIÓ CON LO QUE HACE LA CASILLA. Decía «ver flechas de pasar
     página» cuando encendía una sola cosa; ahora enciende también los cuatro
     puntos de las esquinas y los dos rótulos de la hoja, y nombrar sólo las
     flechas escondería tres cuartas partes. El porqué de estas palabras está
     escrito donde se escriben, en pintarCanto. */
  vale('la casilla está en LIBROS y dice lo que hace',
       !flechas.sinCasilla && /se puede tocar/i.test(flechas.rotulo || ''),
       flechas.sinCasilla ? 'no hay casilla' : flechas.rotulo);
  vale('  con blanco de toque de dedo', flechas.blanco >= 44, flechas.blanco);
  vale('NACEN ENCENDIDAS, que es lo que ve quien abre por primera vez',
       flechas.nacen.izq === flechas.nacen.filoIzq &&
       flechas.nacen.der === flechas.nacen.filoDer &&
       flechas.nacen.der === true, flechas.nacen);
  vale('y la casilla las APAGA, y entonces no están',
       !!flechas.apagadas && flechas.apagadas.izq === true &&
       flechas.apagadas.der === true, flechas.apagadas);
  vale('  y eso queda guardado', flechas.guardadoApagado === false, flechas.guardadoApagado);
  vale('y el segundo toque las devuelve, y SE VEN',
       flechas.encendidas && flechas.encendidas.izq === true &&
       flechas.encendidas.der === true, flechas.encendidas);
  vale('una a cada lado y a media altura',
       flechas.izqAlaIzquierda && flechas.derAlaDerecha &&
       Math.abs(flechas.mitad - flechas.centroIzq) <= 3,
       flechas.mitad + ' contra ' + flechas.centroIzq);
  vale('LA PUNTA TOCA EL FILO DE LA ESCENA',
       flechas.puntaIzq >= 0 && flechas.puntaIzq <= 2 &&
       flechas.puntaDer >= 0 && flechas.puntaDer <= 2,
       flechas.puntaIzq + ' px por la izquierda, ' + flechas.puntaDer + ' por la derecha');
  vale('SOLO EL GALÓN, SIN ASTA', flechas.trozos === 1,
       flechas.trozos + ' trozo' + (flechas.trozos === 1 ? '' : 's') + ' en el trazado');
  vale('SON UN DIBUJO, NO UN BOTÓN', flechas.etiqueta === 'DIV', flechas.etiqueta);
  vale('  y no reciben ni un toque', flechas.ojos === 'none', flechas.ojos);
  /* EL ROJO SE COMPRUEBA COMO ROJO Y NO COMO UN NÚMERO: el tono se retoca sin
     avisar, lo que no puede cambiar es que el rojo mande sobre los otros dos. */
  vale('  y el rojo sale de la paleta, no de un número suelto',
       !!flechas.variable, flechas.variable || '(sin variable)');
  /* «ROJAS DE VERDAD» ERA UN UMBRAL, Y EL UMBRAL ERA UN NÚMERO DISFRAZADO.
     Pedía R > 170, que es el carmín VIVO —rgb(216, 11, 11)— y no el carmín
     —rgb(155, 42, 42)—. El dueño del repo pidió bajar ese rojo, y esta línea
     llamó fallo al cambio; la de arriba, que mira que el color salga de la
     paleta y no de un número suelto, pasó tan campante. O sea que el bloque se
     contradecía a sí mismo. Lo que dice su propio comentario —el rojo manda
     sobre los otros dos— se pide ahora sin fijar cuánto: que el rojo saque
     buena ventaja al verde, y que el verde y el azul anden juntos, que es lo
     que hace que sea rojo y no naranja ni morado. Es la misma cuenta que usa
     la prueba de la piedra para lo mismo. */
  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(flechas.color || '');
  vale('  rojas de verdad',
       !!rgb && +rgb[1] - +rgb[2] > 45 && Math.abs(+rgb[2] - +rgb[3]) < 26,
       flechas.color);
  vale('  sin disco ni borde',
       flechas.fondo === 'rgba(0, 0, 0, 0)' && flechas.borde === 0,
       flechas.fondo + ' / ' + flechas.borde);
  vale('Y BAJO SU PUNTA ESTÁ EL FILO, no ellas',
       /edge/i.test(String(flechas.bajoIzq)) && /edge/i.test(String(flechas.bajoDer)),
       flechas.bajoIzq + ' | ' + flechas.bajoDer);

  /* Y AHORA LOS DOS LADOS DE LO MISMO: la flecha no pasa hoja, el filo sí. La
     segunda mitad es la que hace que la primera valga algo. */
  const gestos = await pf.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const hoja = () => document.getElementById('pgCabeza').textContent.trim();
    const tocar = async (el, y) => {
      const r = el.getBoundingClientRect();
      const op = { bubbles:true, cancelable:true, pointerId: 640 + Math.random()*50 | 0,
                   pointerType:'touch', isPrimary:true,
                   clientX: Math.round(r.left + r.width/2),
                   clientY: y != null ? y : Math.round(r.top + r.height/2) };
      el.dispatchEvent(new PointerEvent('pointerdown', op)); await pausa(50);
      el.dispatchEvent(new PointerEvent('pointerup', op));
      el.dispatchEvent(new MouseEvent('click', Object.assign({ detail:1 }, op)));
      await pausa(2800);
    };
    const antes = hoja();
    await tocar(document.getElementById('flechaDer'));
    const traFlecha = hoja();
    await tocar(document.getElementById('edgeR'), 420);
    return { antes, traFlecha, traFilo: hoja() };
  });
  di('los dos gestos', gestos);
  vale('TOCAR LA FLECHA NO HACE NADA',
       gestos.antes === gestos.traFlecha, gestos.antes + ' → ' + gestos.traFlecha);
  vale('  Y EL FILO SÍ PASA LA HOJA',
       gestos.traFilo !== gestos.antes, gestos.traFlecha + ' → ' + gestos.traFilo);
  vale('el ajuste se guarda', flechas.guardado === true, flechas.guardado);
  await pf.reload();
  await pf.waitForTimeout(600);
  const tras = await pf.evaluate(() => {
    const alto = id => Math.round(document.getElementById(id).getBoundingClientRect().height);
    return { izq: alto('flechaIzq'), der: alto('flechaDer') };
  });
  di('tras recargar', tras);
  vale('  y sobrevive a recargar', tras.izq > 8 && tras.der > 8, tras);

  /* Y SE QUITAN DONDE NO HAY A DÓNDE IR. Aquí antes se atenuaban, y eso valía
     cuando eran botones: un botón apagado dice «esto existe y ahora no». Un
     letrero que señala una salida que no hay se quita, no se despinta.

     Se compara CONTRA EL FILO y no contra un libro escrito a mano: cuál es la
     primera hoja depende de qué biblias estén cargadas —hoy los datos empiezan
     en Mateo, no en Génesis— y una prueba que diga «Génesis» se cae sola el
     día que alguien baje el Antiguo Testamento. */
  const extremos = await pf.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    /* SE VUELVE AL PRINCIPIO A PROPÓSITO: el bloque de arriba dejó la lectura
       una hoja más allá, y un extremo es lo único que prueba algo aquí. Se
       vuelve por el filo, tantas veces como haga falta y con tope, que cuántas
       hojas hay depende de los datos cargados. */
    const filo = document.getElementById('edgeL');
    for (let i = 0; i < 6; i++){
      if (filo.classList.contains('off')) break;
      const r = filo.getBoundingClientRect();
      const op = { bubbles:true, cancelable:true, pointerId: 670 + i, pointerType:'touch',
                   isPrimary:true, clientX: Math.round(r.left + r.width/2), clientY: 420 };
      filo.dispatchEvent(new PointerEvent('pointerdown', op)); await pausa(60);
      filo.dispatchEvent(new PointerEvent('pointerup', op));
      await pausa(2800);
    }
    const se = id => { const e = document.getElementById(id);
      return e.getBoundingClientRect().height > 8; };
    return { hoja: document.getElementById('pgCabeza').textContent.trim(),
             izq: se('flechaIzq'), der: se('flechaDer'),
             filoIzq: !document.getElementById('edgeL').classList.contains('off'),
             filoDer: !document.getElementById('edgeR').classList.contains('off') };
  });
  di('en la primera hoja de los datos', extremos);
  vale('(la prueba es válida) estamos en un extremo',
       extremos.filoIzq === false, extremos.hoja);
  vale('LA FLECHA DICE LO MISMO QUE EL FILO',
       extremos.izq === extremos.filoIzq && extremos.der === extremos.filoDer, extremos);
  await cerrarParcial(fl, 'las flechas');

  /* ================================================================
     LOS LETREROS DE LAS GUÍAS: QUÉ SE HACE EN CADA PUERTA.

     El rojo decía dónde se puede tocar. No decía QUÉ hacer, y en esta hoja no
     es lo mismo para todos: la perícopa pide un toque SOSTENIDO —uno corto ahí
     no hace nada, y lo que se aprende de eso es que el rojo miente—, el sello
     de la G se JALA, y los demás se tocan y ya.

     Y LA PERÍCOPA ESTRENA ANILLO, que era la puerta que faltaba: un titulillo
     de escena centrado entre versículos se lee como parte del texto —es lo que
     se buscó al componerlo— y el precio era que no se descubría.

     LO QUE DE VERDAD VIGILA ESTE BLOQUE NO ES QUE LAS PALABRAS ESTÉN, es que
     NO PESEN. El alto de un .peri lo mide el paginador en las cuatro versiones
     para cortar la hoja por el mismo sitio, así que un borde de 2 px o un
     letrero en el flujo no son 2 px: son el libro entero repaginado, y encima
     repaginado sólo mientras el interruptor esté encendido —o sea una hoja que
     cambia de contenido al tocar una casilla—. Por eso se mide la hoja con las
     guías puestas y sin ellas y se comparan los versículos que caben, el
     último de ellos y la caja del propio titulillo. Si alguien cambia el
     anillo por un borde, esto se pone rojo antes de que nadie lo vea leyendo.

     Y SE COMPRUEBA QUE NO MIENTEN DE LEJOS. Con el zoom puesto el titulillo no
     abre el panel y el toque largo de la perícopa se para en el guardia del
     zoom —medido—, así que ahí los letreros se apagan. Un letrero encendido
     sobre algo que no responde es lo que enseña a desconfiar del rojo. */
  titulo('los letreros dicen qué se hace en cada puerta');
  const ltr = await abrir();
  const pltr = ltr.pagina;
  const letreros = await pltr.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    /* content devuelve la forma con texto alternativo —«"click" / ""»— y esa
       segunda mitad es justo lo que hay que vigilar: vacía quiere decir que un
       lector de pantalla no lo lee. Sin ella oiría «click» pegado al final de
       cada titulillo, noventa y cinco veces en Lucas. */
    const dice = sel => {
      const e = document.querySelector(sel);
      return e ? getComputedStyle(e, '::after').content : '(no está)';
    };
    const anillo = sel => {
      const e = document.querySelector(sel);
      return e ? getComputedStyle(e).boxShadow : '(no está)';
    };
    const hoja = () => {
      const pe = document.querySelector('#pgBody .peri');
      const r = pe ? pe.getBoundingClientRect() : null;
      const v = [...document.querySelectorAll('#pgBody .v')];
      return { versos: v.length,
               ultimo: v.length ? v[v.length - 1].textContent.trim().slice(0, 30) : null,
               caja: r ? [Math.round(r.left), Math.round(r.top),
                          Math.round(r.width), Math.round(r.height)] : null };
    };
    const guias = () => document.querySelector('.stage').classList.contains('guias');
    const hayPeri = () => !!document.querySelector('#pgBody .peri');

    const con = {
      guias: guias(), hayPeri: hayPeri(),
      peri: dice('#pgBody .peri'),
      cabeza: dice('#pg .pg-cabeza'), version: dice('#pg .pg-version'),
      piedras: dice('#btnPiedras'), cintas: dice('#btnCintas'),
      zoom: dice('#btnZoom'), hist: dice('#btnHistorial'),
      flecha: dice('#flechaDer'), g: dice('#btnGlosas'),
      /* EL ANILLO SE LEE EN .peri-dice Y NO EN LA CAJA: la caja lleva
         arriba la banda que hospeda al letrero, y el anillo abraza sólo
         las letras del título. Ver .peri. */
      anilloPeri: anillo('#pgBody .peri .peri-dice'),
      /* La caja NO lleva anillo: si alguien lo devuelve ahí, el recuadro
         encerraría la banda y saldría un palmo de papel vacío dentro del
         rojo. */
      anilloCaja: anillo('#pgBody .peri'),
      anilloCabeza: anillo('#pg .pg-cabeza'),
      hoja: hoja() };

    /* DE LEJOS. Se entra y se sale por donde se entra y se sale de verdad. */
    document.getElementById('btnZoom').click();
    await pausa(1500);
    const lejos = { peri: dice('#pgBody .peri'), cabeza: dice('#pg .pg-cabeza'),
                    version: dice('#pg .pg-version'),
                    anilloPeri: anillo('#pgBody .peri .peri-dice'),
                    anilloCabeza: anillo('#pg .pg-cabeza') };
    const rr = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(rr.left + rr.width/2),
        clientY:Math.round(rr.bottom + 60) }));
    await pausa(1600);

    /* Y AHORA SIN GUÍAS, por el interruptor de LIBROS, que es por donde se
       apagan de verdad. */
    document.getElementById('pgCabeza').click(); await pausa(800);
    const t = document.querySelector('.pestanas button[data-sec="libros"]');
    if (t) t.click();
    await pausa(800);
    const chk = document.getElementById('chkFlechas');
    if (!chk) return { con, lejos, sinCasilla:true };
    chk.click(); await pausa(700);
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await pausa(1200);
    const sin = { guias: guias(), peri: dice('#pgBody .peri'),
                  anilloPeri: anillo('#pgBody .peri .peri-dice'), hoja: hoja() };
    return { con, lejos, sin };
  });
  di('con guías', JSON.stringify(letreros.con));
  di('de lejos', JSON.stringify(letreros.lejos));
  di('sin guías', JSON.stringify(letreros.sin));
  const c = letreros.con || {}, z = letreros.lejos || {}, n = letreros.sin || {};
  const suena = (v, palabra) => typeof v === 'string' &&
        v.indexOf('"' + palabra + '"') === 0;
  const mudo = v => typeof v === 'string' && /\/\s*""\s*$/.test(v);
  vale('(la prueba es válida) hay perícopa en la hoja y las guías están puestas',
       c.hayPeri === true && c.guias === true,
       'perícopa: ' + c.hayPeri + ' · guías: ' + c.guias);
  vale('LA PERÍCOPA DICE «click largo», que es el gesto que de verdad pide',
       suena(c.peri, 'click largo'), c.peri);
  vale('  y su anillo rojo abraza las LETRAS del título, no la caja',
       /rgb\(155,\s*42,\s*42\)/.test(c.anilloPeri || '') && c.anilloCaja === 'none',
       'renglón: ' + c.anilloPeri + ' · caja: ' + c.anilloCaja);
  vale('LA G DICE «jalar»', suena(c.g, 'jalar'), c.g);
  vale('y los otros cinco dicen «click»',
       [c.version, c.piedras, c.cintas, c.zoom, c.hist]
         .every(x => suena(x, 'click')),
       [c.version, c.piedras, c.cintas, c.zoom, c.hist].join(' · '));
  /* LAS FLECHAS SE QUEDARON SIN PALABRA, pedido por el dueño del repo. Tenían
     menos que decir que las demás y estorbaban más: la flecha YA ES el letrero
     —es un dibujo que señala dónde tocar, no un botón— así que «click» al lado
     repetía en palabras lo que la punta decía señalando, y a cambio era el
     único de los nueve que caía siempre sobre renglón lleno, a media altura de
     la columna. Se afirma que no dice nada, y no se calla: un letrero vacío
     dejaría rastro —la regla compartida le pone relleno y anillo— y esta línea
     es lo que lo caza. */
  vale('  y las flechas no dicen nada, que ellas ya señalan',
       c.flecha === 'none', c.flecha);
  /* EL TITULILLO DE ARRIBA SE QUEDÓ CON SU ANILLO Y SIN PALABRA, pedido por el
     dueño del repo: es el único de los nueve sin sitio donde poner el letrero
     —arriba el canto, a los lados los dos puntos con los suyos, debajo el
     texto—. Se afirma que NO tiene, y no se calla: un letrero vacío sí dejaría
     rastro —la regla compartida le pone relleno y anillo, así que saldría una
     pastilla roja del tamaño de nada— y esta línea es lo que lo caza. */
  vale('  y el titulillo de LIBROS no dice nada',
       c.cabeza === 'none', c.cabeza);
  vale('  pero conserva su anillo, que sigue abriendo el panel',
       /rgb\(155,\s*42,\s*42\)/.test(c.anilloCabeza || ''), c.anilloCabeza);
  /* Decorativos: lo que el lector de pantalla necesita ya se lo dicen
     aria-haspopup y aria-expanded, que están puestos desde antes. */
  vale('  y NINGUNO se lee en voz alta',
       [c.peri, c.g, c.version, c.piedras, c.cintas, c.zoom, c.hist]
         .every(mudo),
       'alternativo vacío en los siete');
  vale('DE LEJOS SE APAGAN, que ahí no responde ninguno',
       z.peri === 'none' && z.cabeza === 'none' && z.version === 'none' &&
       z.anilloPeri === 'none' && z.anilloCabeza === 'none',
       JSON.stringify(z));
  vale('y el interruptor se los lleva a todos',
       n.guias === false && n.peri === 'none' && n.anilloPeri === 'none',
       JSON.stringify(n));
  /* LA QUE IMPORTA. */
  const hc = (c.hoja || {}), hn = (n.hoja || {});
  di('la hoja con guías', JSON.stringify(hc));
  di('la hoja sin guías', JSON.stringify(hn));
  vale('Y LA HOJA NO SE MUEVE NI UN PÍXEL AL ENCENDERLAS',
       hc.versos === hn.versos && hc.ultimo === hn.ultimo &&
       JSON.stringify(hc.caja) === JSON.stringify(hn.caja),
       hc.versos + ' vs ' + hn.versos + ' versículos · titulillo ' +
       JSON.stringify(hc.caja) + ' vs ' + JSON.stringify(hn.caja));
  await cerrarParcial(ltr, 'los letreros');

  /* ================================================================
     Y EL DE LA PERÍCOPA TIENE QUE CABER, HOJA TRAS HOJA.

     Nació encima del recuadro, que es donde se pidió, y encima desaparecía.
     Un .peri lleva 1.5em de aire arriba y de ese margen salía el sitio del
     letrero; pero cuando el titulillo arranca COLUMNA —que pasa a menudo,
     porque break-after:avoid lo empuja junto con su versículo al fragmento
     siguiente— el navegador descarta el margen en el corte. El titulillo queda
     pegado al canto de arriba de #pgBody, el letrero cae fuera, y #pgBody
     recorta con overflow:hidden: el anillo rojo se quedaba y la palabra se iba
     sin decir nada. Seis de las primeras cuarenta hojas de Mateo, una de cada
     siete. Lo levantó la revisión de Codex.

     Ahora va debajo, que está siempre dentro y no por suerte: break-after:avoid
     garantiza que el titulillo nunca cierra columna, o sea que siempre tiene su
     versículo detrás.

     SE RECORREN HOJAS DE VERDAD Y NO UNA SOLA. El fallo no se ve en la primera
     —ahí el titulillo cae a media columna y le sobra margen—; sólo aparece en
     las que arrancan con él. Una prueba que mirara una hoja habría pasado en
     verde con el fallo puesto, que es exactamente lo que pasó.

     Y se mira la caja contra la de #pgBody, no si «se ve»: un pseudo-elemento
     recortado por un ancestro sigue teniendo su tamaño y su opacidad, así que
     preguntarle al estilo no delata nada. Lo que delata es la geometría. */
  titulo('el letrero de la perícopa cabe en todas las hojas');
  const cab = await abrir();
  const pcab = cab.pagina;
  const cabida = await pcab.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const pasarHoja = async () => {
      const f = document.getElementById('edgeR');
      const rf = f.getBoundingClientRect();
      const o = { bubbles:true, cancelable:true, pointerId:314, pointerType:'touch',
                  isPrimary:true, clientX: Math.round(rf.left + rf.width/2), clientY: 420 };
      f.dispatchEvent(new PointerEvent('pointerdown', o)); await pausa(60);
      f.dispatchEvent(new PointerEvent('pointerup', o));
      await pausa(1100);
    };
    /* LA CAJA DEL LETRERO SE LEE, NO SE SUPONE, y esto es la mitad de la
       prueba. Escrita primero dando por hecho que el letrero va debajo
       —«r.bottom + 2»—, la comprobación no miraba el CSS en absoluto: devolví
       la regla a su sitio de antes, el que fallaba, y la prueba siguió en
       verde. Una prueba que calcula ella misma lo que viene a vigilar no
       vigila nada.
       Un ::after no tiene getBoundingClientRect, pero su estilo calculado sí
       trae el `top` YA RESUELTO en píxeles contra su bloque contenedor —el
       .peri, que no lleva borde ni relleno vertical, así que su caja de
       relleno empieza donde empieza su caja de borde—. Sumando uno al otro
       sale la caja de verdad, y con ella el fallo se caza. */
    const cajaLetrero = (e) => {
      const c = getComputedStyle(e, '::after');
      const r = e.getBoundingClientRect();
      /* height/width del estilo calculado son la caja de CONTENIDO: sin
         sumarle los rellenos, la cuenta sale corta justo por el borde que se
         quiere vigilar. */
      const alto = parseFloat(c.height) + parseFloat(c.paddingTop) + parseFloat(c.paddingBottom);
      /* Y EL TRANSFORM SE SUMA APARTE. `top` es la posición ANTES de
         transformar, así que un translate no aparece ahí: medido sin él, un
         letrero centrado con translateY salía de su sitio por media altura y
         la prueba cantaba un desbordamiento que no existe. La matriz lo dice
         sin tener que saber qué transform se escribió. */
      const m = new DOMMatrix(c.transform === 'none' ? '' : c.transform);
      const arriba = r.top + parseFloat(c.top) + m.m42;
      return { arriba, abajo: arriba + alto };
    };
    const mira = () => {
      const body = document.getElementById('pgBody').getBoundingClientRect();
      return [...document.querySelectorAll('#pgBody .peri')].map(e => {
        const r = e.getBoundingClientRect();
        const { arriba, abajo } = cajaLetrero(e);
        return { dice: (e.querySelector('.peri-dice') || e).textContent.trim().slice(0, 24),
                 /* arrancaColumna: el titulillo pegado al canto de arriba, que
                    es el caso que se rompía. Se APUNTA, no se exige: ver abajo. */
                 arrancaColumna: Math.abs(r.top - body.top) < 2,
                 /* Y LA PROPIEDAD QUE DE VERDAD ARREGLA EL FALLO, que se puede
                    mirar en TODAS y no sólo en las que arrancan columna: que
                    el letrero no cuelgue por encima del titulillo. Colgado
                    arriba, su sitio sale del margen de 1.5em, y ese margen es
                    justo lo que el navegador tira en un corte de columna. */
                 cuelgaArriba: arriba < r.top - 0.5,
                 corta: arriba < body.top - 0.5 || abajo > body.bottom + 0.5 };
      });
    };
    let vistas = 0, cortadas = 0, arranques = 0, cuelgan = 0, hojas = 0;
    const malas = [];
    for (let i = 0; i < 26; i++){
      for (const x of mira()){
        vistas++;
        if (x.arrancaColumna) arranques++;
        if (x.cuelgaArriba) cuelgan++;
        if (x.corta){ cortadas++; if (malas.length < 5) malas.push(x); }
      }
      hojas++;
      await pasarHoja();
    }
    return { hojas, vistas, cortadas, arranques, cuelgan, malas };
  });
  di('el recorrido', JSON.stringify(cabida));
  /* CUÁNTAS ARRANCAN COLUMNA SE ENSEÑA Y NO SE EXIGE, y esto costó un rojo.

     Estaba escrito como aserción —«y alguna arranca columna»— con la idea de
     que sin visitar el caso peligroso el verde no significaría nada. La idea
     es buena y el sitio era el equivocado: DÓNDE cae cada titulillo depende de
     dónde corta cada renglón, y eso depende de las fuentes que tenga la
     máquina. Aquí salieron tres de cuarenta y seis; en la máquina que corrió
     la tanda, cero de cuarenta y seis, con el arreglo puesto y funcionando.
     Una prueba que canta fallo según qué tipografías haya instaladas enseña a
     ignorarla, que es peor que no tenerla.

     Lo que sí se afirma, y vale MÁS, es la propiedad que hace correcto el
     arreglo, y se puede mirar en todas las perícopas y no sólo en las que
     arrancan columna: que el letrero no cuelgue por encima del titulillo.
     Colgado arriba, su sitio sale del margen de 1.5em —que es justo lo que el
     navegador tira en un corte de columna— y el fallo vuelve. Eso no depende
     de dónde caiga nada: si alguien lo devuelve arriba, esto se pone rojo en
     la primera hoja con perícopa, haya o no una arrancando columna. */
  vale('(la prueba es válida) se recorrieron hojas con perícopas',
       cabida.hojas >= 20 && cabida.vistas >= 10,
       cabida.hojas + ' hojas · ' + cabida.vistas + ' perícopas · ' +
       cabida.arranques + ' arrancando columna');
  vale('EL LETRERO NO CUELGA DEL MARGEN DE ARRIBA, que es lo que el corte tira',
       cabida.cuelgan === 0,
       cabida.cuelgan + ' de ' + cabida.vistas);
  vale('  y ni uno se sale de la columna',
       cabida.cortadas === 0,
       cabida.cortadas ? JSON.stringify(cabida.malas) : 'ninguno de ' + cabida.vistas);
  await cerrarParcial(cab, 'la cabida del letrero');

  /* ================================================================
     Y NINGUNO SE SALE DE LA ESCENA, TAMPOCO CON LA LETRA GRANDE.

     Los letreros miden lo que mide la letra del libro, así que subirla los
     hace crecer, y hay dos sitios donde crecer se paga:

     · LOS DOS PUNTOS DE ARRIBA viven en top:0 y en pantalla ancha miden 22 px
       —se quedaron ahí para no robarle toques al titulillo—. Un letrero
       centrado sobre un botón más bajo que él sobresale por arriba, y .stage
       recorta con overflow:hidden: subir la letra le cortaba la cabeza a las
       palabras, y sólo en pantalla ancha. El freno es max(0px, …): céntrate
       si cabes, y si no, pégate a tu propio canto de arriba.
     · Y AUN PEGADO AL CANTO, en pantalla ancha el letrero de las cintas le
       caía ENCIMA al titulillo, que empieza 22 px más abajo. Medido: a 15 no
       choca, a 20 sí, a 26 se come 41 por 14 píxeles de «Mateo 1:1». Por eso
       esos dos tienen techo ahí, y sólo ahí.

     Los dos los levantó la revisión de Codex, y los dos tienen la misma forma:
     una regla que era verdad a 15 px y dejaba de serlo más arriba. Por eso
     esta prueba mide al TOPE de la letra y no al tamaño de fábrica: a 15 todo
     esto pasa en verde con el fallo puesto.

     Se mide la caja y no si «se ve»: un pseudo-elemento recortado por un
     ancestro conserva su tamaño y su opacidad. */
  /* ================================================================
     EL PUNTO DE LA IZQUIERDA, EN MEDIO DE SUS DOS VECINOS.

     Es el mismo encargo que ya se le hizo al de la derecha, mirado al revés.
     Vivía pegado al canto izquierdo, a 8 px, y ahí se monta sobre el FILO de
     pasar hoja: medido en un teléfono de 412, el punto ocupaba de 10 a 54 y el
     filo de 0 a 30, o sea veinte píxeles compartidos entre «abre las piedras»
     y «pasa la hoja». Ahora va entre el filo de la hoja y el principio del
     titulillo.

     SE MIDE CONTRA SUS VECINOS Y NO CONTRA UN NÚMERO: dónde empieza el
     titulillo depende del ancho de la columna, de la letra y de la pantalla,
     así que un número escrito aquí sería una prueba que falla en otro aparato
     sin que nada esté mal.

     Y LLEVA SU CONTROL EN PANTALLA ANCHA, que es la mitad que se rompe sola:
     allí el titulillo se va a la esquina de arriba a la derecha y «en medio de
     lo que queda a su izquierda» sería el centro del canto de arriba, un sitio
     sin sentido. Ahí el punto tiene que quedarse en su esquina, y eso se
     comprueba, porque una cuenta sin ese guardia pasaría igual de verde en
     teléfono.
     ================================================================ */
  titulo('el punto de las piedras se queda en medio del filo y el titulillo');
  for (const [comoSeLlama, opciones, enMedio] of [['teléfono', {}, true],
                                                  ['escritorio', ESCRITORIO, false]]){
    const ses = await abrir(opciones);
    const punto = await ses.pagina.evaluate(() => {
      const pg = document.getElementById('pg');
      const inner = pg.querySelector('.pg-inner');
      const cab = pg.querySelector('.pg-cabeza');
      const st = document.querySelector('.stage').getBoundingClientRect();
      const b = document.getElementById('btnPiedras');
      const rb = b.getBoundingClientRect();
      const rc = cab.getBoundingClientRect();
      const ri = inner.getBoundingClientRect();
      const rf = document.getElementById('edgeL').getBoundingClientRect();
      return { centro: Math.round((rb.left + rb.right) / 2 - st.left),
               /* Los dos vecinos en coordenadas de la escena, leídos con
                  rectángulos: es una cuenta distinta de la del programa, que
                  los mide con desplazamientos. */
               filo: Math.round(ri.left - st.left),
               titulillo: Math.round(rc.left - st.left),
               dedo: Math.round(rb.left - st.left) + '–' + Math.round(rb.right - st.left),
               filoDePasar: Math.round(rf.left - st.left) + '–' +
                            Math.round(rf.right - st.left),
               sobreElFilo: rb.left < rf.right - 1,
               hoja: Math.round(inner.offsetWidth),
               enSuEsquina: Math.round(rb.left - st.left) <= 12 };
    });
    di('el punto de piedras · ' + comoSeLlama, JSON.stringify(punto));
    if (enMedio){
      const medio = Math.round((punto.filo + punto.titulillo) / 2);
      vale('(la prueba es válida) el titulillo está centrado sobre la columna · ' +
           comoSeLlama, punto.titulillo > 20 && punto.titulillo < punto.hoja / 2,
           punto.titulillo + ' de una hoja de ' + punto.hoja);
      vale('EL PUNTO CAE EN MEDIO DEL FILO Y EL TITULILLO · ' + comoSeLlama,
           Math.abs(punto.centro - medio) <= 1,
           punto.centro + ' contra ' + medio);
      vale('  y ya no se monta sobre el filo de pasar hoja · ' + comoSeLlama,
           punto.sobreElFilo === false,
           punto.dedo + ' contra el filo ' + punto.filoDePasar);
    } else {
      /* El control: sin él, una cuenta sin guardia pasaría en teléfono y
         dejaría el punto en mitad del canto de arriba en pantalla ancha. */
      vale('(la prueba es válida) en pantalla ancha el titulillo se va a la ' +
           'esquina · ' + comoSeLlama,
           punto.titulillo > punto.hoja / 2,
           punto.titulillo + ' de una hoja de ' + punto.hoja);
      vale('Y AHÍ EL PUNTO SE QUEDA EN SU ESQUINA · ' + comoSeLlama,
           punto.enSuEsquina === true, punto.dedo);
    }
    await cerrarParcial(ses, 'el punto de las piedras, ' + comoSeLlama);
  }

  /* ================================================================
     Y LOS DOS DE ABAJO, CONTRA EL RÓTULO DEL PIE.

     Pedido por el dueño del repo: «a la mitad del titulillo y el borde», que
     es el mismo encargo que el de arriba mirado desde el pie. Estaban
     pegados a las esquinas y el de la izquierda se montaba sobre el filo de
     pasar hoja, igual que le pasaba al de las piedras.

     SE MIDE CONTRA LOS VECINOS, NO CONTRA NÚMEROS ESCRITOS, por lo mismo que
     el bloque de arriba: dónde cae el rótulo del pie depende del ancho de la
     columna, de la letra y de la pantalla.

     Y EL BORDE DE LA DERECHA NO ES EL MISMO EN LAS DOS PANTALLAS, que es lo
     que de verdad vigila este bloque: en teléfono la hoja lleva dentro la
     columna de glosas, que no se ve, así que el borde es el de la columna de
     texto; en escritorio las glosas SÍ se ven y el borde es el de la hoja
     entera. Una cuenta con un solo borde pasa en una pantalla y deja el
     punto en mitad del papel en la otra, así que se comprueban las dos.
     ================================================================ */
  titulo('los dos puntos de abajo caen en medio del rótulo del pie y el borde');
  for (const [comoSeLlama, opciones] of [['teléfono', {}], ['escritorio', ESCRITORIO]]){
    const ses = await abrir(opciones);
    const abajo = await ses.pagina.evaluate(() => {
      const pg = document.getElementById('pg');
      const inner = pg.querySelector('.pg-inner');
      const ver = pg.querySelector('.pg-version');
      const st = document.querySelector('.stage').getBoundingClientRect();
      const rb = el => { const r = el.getBoundingClientRect();
        return { i:Math.round(r.left - st.left), f:Math.round(r.right - st.left),
                 c:Math.round((r.left + r.right)/2 - st.left) }; };
      const z = document.getElementById('btnZoom');
      const h = document.getElementById('btnHistorial');
      const cuerpo = document.getElementById('pgBody');
      /* El borde que se ve: lo que de la hoja asoma por la ventana de #pg.
         Se calcula con rectángulos, que es una cuenta distinta de la del
         programa —él los suma con desplazamientos—. */
      const ri = inner.getBoundingClientRect();
      const rp = pg.getBoundingClientRect();
      return { zoom:rb(z), hist:rb(h), pie:rb(ver), hoja:rb(inner),
               cuerpoDer: Math.round(cuerpo.getBoundingClientRect().right - st.left),
               visibleDer: Math.round(Math.min(ri.right, rp.right) - st.left),
               filoIzq: rb(document.getElementById('edgeL')),
               filoDer: rb(document.getElementById('edgeR')) };
    });
    di('los puntos de abajo · ' + comoSeLlama, JSON.stringify(abajo));
    /* La línea de validez: el rótulo del pie tiene que estar centrado y con
       hueco a los dos lados. Si algún día se va a una esquina, esta cae antes
       que las otras y avisa de que lo que se mide dejó de existir. */
    vale('(la prueba es válida) el rótulo del pie tiene hueco a los dos lados · ' +
         comoSeLlama,
         abajo.pie.i > 40 && abajo.visibleDer - abajo.pie.f > 40,
         abajo.pie.i + ' a la izquierda · ' +
         (abajo.visibleDer - abajo.pie.f) + ' a la derecha');
    const medioIzq = Math.round((abajo.hoja.i + abajo.pie.i) / 2);
    const medioDer = Math.round((abajo.pie.f + abajo.visibleDer) / 2);
    vale('EL DE LA HOJA ENTERA CAE EN MEDIO · ' + comoSeLlama,
         Math.abs(abajo.zoom.c - medioIzq) <= 1,
         abajo.zoom.c + ' contra ' + medioIzq);
    vale('Y EL DEL RASTRO TAMBIÉN · ' + comoSeLlama,
         Math.abs(abajo.hist.c - medioDer) <= 1,
         abajo.hist.c + ' contra ' + medioDer);
    /* Lo que el cambio venía a arreglar: pegado a la esquina, el de la
       izquierda compartía veinte píxeles con el filo de pasar hoja. */
    vale('  y ninguno se monta sobre los filos de pasar hoja · ' + comoSeLlama,
         abajo.zoom.i > abajo.filoIzq.f && abajo.hist.f < abajo.filoDer.i,
         abajo.zoom.i + '>' + abajo.filoIzq.f + ' · ' +
         abajo.hist.f + '<' + abajo.filoDer.i);
    await cerrarParcial(ses, 'los puntos de abajo, ' + comoSeLlama);
  }

  /* ================================================================
     Y LOS CUATRO VIAJAN CON LA HOJA CUANDO SE TIRA DE LA G.

     Pedido por el dueño del repo: «que queden anclados y se muevan con el
     libro cuando abrimos las glosas usando la G». Antes vivían en la escena,
     hermanos de la hoja, y se quedaban flotando sobre el cajón mientras el
     papel se iba: medido, el rótulo del pie se corría 251 px y los cuatro
     puntos no se movían.

     SE COMPARA CONTRA EL RÓTULO DEL PIE y no contra un número: lo que se
     pidió es que se muevan CON el libro, y el rótulo es una pieza del libro
     que ya viajaba bien. Cuánto corra el papel depende del ancho de la
     pantalla, así que un número escrito aquí sería otra prueba de aparato.

     Va solo en teléfono a propósito: en escritorio las glosas se ven sin
     tirar de nada y el papel no corre —el cajón existe donde no caben las
     dos columnas—. Eso también se afirma, que es lo que distingue «no se
     movió porque está anclado» de «no se movió porque no había viaje».
     ================================================================ */
  titulo('los cuatro puntos se van con la hoja al abrir el cajón con la G');
  const conG = await abrir();
  const viaje = await conG.pagina.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    const ids = ['btnZoom','btnHistorial','btnPiedras','btnCintas'];
    const cx = id => { const r = document.getElementById(id).getBoundingClientRect();
                       return Math.round((r.left + r.right) / 2); };
    const pieX = () => Math.round(
      document.querySelector('#pg .pg-version').getBoundingClientRect().left);
    const g = document.getElementById('btnGlosas');
    if (!g || g.hidden) return { sinG:true };
    const antes = Object.fromEntries(ids.map(i => [i, cx(i)]));
    const pieAntes = pieX();
    g.click();
    await z(2600);
    const despues = Object.fromEntries(ids.map(i => [i, cx(i)]));
    return { sinG:false, antes, despues, pieAntes, pieDespues: pieX(),
             scroll: Math.round(document.getElementById('pg').scrollLeft),
             ids };
  });
  di('el viaje de los cuatro', JSON.stringify(viaje));
  vale('(la prueba es válida) hay G que tirar', viaje.sinG === false);
  if (!viaje.sinG){
    const viajePie = viaje.pieDespues - viaje.pieAntes;
    /* Sin viaje del papel esto no distingue nada: los cuatro se estarían
       quietos con razón. */
    vale('(la prueba es válida) el papel corrió de verdad',
         viaje.scroll > 100 && viajePie < -100,
         viaje.scroll + ' de desplazamiento · el rótulo viajó ' + viajePie);
    for (const id of viaje.ids)
      vale('  ' + id + ' viaja lo mismo que el rótulo del pie',
           Math.abs((viaje.despues[id] - viaje.antes[id]) - viajePie) <= 1,
           (viaje.despues[id] - viaje.antes[id]) + ' contra ' + viajePie);
  }
  await cerrarParcial(conG, 'el viaje con la G');

  titulo('con la letra al tope, ningún letrero se sale ni se pisa');
  for (const [comoSeLlama, opciones] of [['escritorio', ESCRITORIO], ['teléfono', {}],
                                        ['teléfono estrecho', ESTRECHO_DEDO]]){
    const ses = await abrir(opciones);
    const pp = ses.pagina;
    const borde = await pp.evaluate(async () => {
      const pausa = ms => new Promise(z => setTimeout(z, ms));
      /* Se sube por el panel, como lo sube un lector. */
      document.getElementById('pgCabeza').click(); await pausa(800);
      const t = document.querySelector('.pestanas button[data-sec="formato"]');
      if (!t) return { sinPestana:true };
      t.click(); await pausa(800);
      const sel = document.getElementById('fsAhora');
      const tope = Math.max(...[...sel.options].map(o => +o.value));
      sel.value = String(tope);
      sel.dispatchEvent(new Event('change', { bubbles:true }));
      await pausa(2200);
      const cerrar = document.querySelector('#ajustes .cerrar-pie');
      if (cerrar) cerrar.click();
      await pausa(1500);

      const st = document.querySelector('.stage').getBoundingClientRect();
      /* La caja del letrero se arma a mano: un ::after no tiene rect propio.
         width/height del estilo calculado son la caja de CONTENIDO, así que
         hay que sumarle sus rellenos o la cuenta sale corta justo por el borde
         que se quiere vigilar. */
      /* Y AQUÍ TAMBIÉN SE LEE LA CAJA EN VEZ DE SUPONERLA. Estuvo escrita
         copiando a mano la colocación —centrado con freno, a tal lado, a tal
         hueco— y eso es escribir la regla dos veces: la prueba habría seguido
         en verde con la regla cambiada, porque estaba comprobando su propia
         copia. El estilo calculado de un ::after trae top y left ya resueltos
         en píxeles contra su bloque contenedor, que aquí es el botón: sin
         borde y sin relleno, su caja de relleno es la que devuelve
         getBoundingClientRect. */
      const caja = id => {
        const e = document.getElementById(id);
        if (!e) return null;
        const r = e.getBoundingClientRect(), c = getComputedStyle(e, '::after');
        const w = parseFloat(c.width) + parseFloat(c.paddingLeft) + parseFloat(c.paddingRight);
        const h = parseFloat(c.height) + parseFloat(c.paddingTop) + parseFloat(c.paddingBottom);
        /* El transform se suma aparte: `top` y `left` son la posición ANTES
           de transformar, así que un translate no aparece en ellos. */
        const m = new DOMMatrix(c.transform === 'none' ? '' : c.transform);
        const top = r.top + parseFloat(c.top) + m.m42;
        const left = r.left + parseFloat(c.left) + m.m41;
        return { left, top, right: left + w, bottom: top + h };
      };
      const dentro = b => !!b && b.top >= st.top - 0.5 && b.bottom <= st.bottom + 0.5 &&
                                b.left >= st.left - 0.5 && b.right <= st.right + 0.5;
      const pisa = (a, b) => !!a && !!b &&
        !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      /* Y EL PUNTO TIENE QUE QUEDAR DENTRO DE SU RECUADRO. Se pidió que el
         borde del letrero alcanzara a contener el punto, para que la palabra y
         la señal se lean como una cosa y no como dos puestas juntas. Se mide
         contra el disco —el ::before del botón, 11 px de lenteja centrada en su
         blanco de toque— y no contra el botón entero: el blanco de toque es
         invisible y contenerlo no prueba nada de lo que se ve. */
      const punto = id => {
        const e = document.getElementById(id);
        const r = e.getBoundingClientRect(), c = getComputedStyle(e, '::before');
        const w = parseFloat(c.width), h = parseFloat(c.height);
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2 };
      };
      const contiene = (a, b) => !!a && !!b && a.left <= b.left + 0.5 &&
        a.right >= b.right - 0.5 && a.top <= b.top + 0.5 && a.bottom >= b.bottom - 0.5;
      /* LO QUE NO SE PUEDE TAPAR SON LAS LETRAS, no la caja. El titulillo lleva
         13 px de relleno a cada lado —es lo que le da su recuadro— y un
         letrero que muerde ese relleno no esconde nada: lo que esconde
         información es meterse en el texto. Medido contra la caja entera, la
         prueba pedía un hueco que no hace falta y que en un teléfono con la
         letra al tope no existe; medido contra las letras, pide justo lo que
         importa. Se descuenta el relleno del propio rótulo y no un número a
         ojo, que si algún día cambia el relleno esta cuenta se entera sola. */
      const rt = document.querySelector('#pg .pg-cabeza').getBoundingClientRect();
      const ct = getComputedStyle(document.querySelector('#pg .pg-cabeza'));
      const tit = { left: rt.left + parseFloat(ct.paddingLeft),
                    right: rt.right - parseFloat(ct.paddingRight),
                    top: rt.top + parseFloat(ct.paddingTop),
                    bottom: rt.bottom - parseFloat(ct.paddingBottom) };
      const pi = caja('btnPiedras'), ci = caja('btnCintas');
      const zo = caja('btnZoom'), hi = caja('btnHistorial');
      return { tope, cuerpo: getComputedStyle(document.getElementById('pgBody')).fontSize,
               fuera: [['piedras', pi], ['cintas', ci], ['zoom', zo], ['historial', hi]]
                 .filter(([, b]) => !dentro(b)).map(([n]) => n),
               pisan: [['piedras', pi], ['cintas', ci]]
                 .filter(([, b]) => pisa(b, tit)).map(([n]) => n),
               sueltos: [['piedras', pi], ['cintas', ci], ['zoom', zo], ['historial', hi]]
                 .filter(([n, b]) => !contiene(b, punto(
                   n === 'piedras' ? 'btnPiedras' : n === 'cintas' ? 'btnCintas'
                   : n === 'zoom' ? 'btnZoom' : 'btnHistorial'))).map(([n]) => n) };
    });
    di('con la letra al tope (' + comoSeLlama + ')', JSON.stringify(borde));
    vale('(la prueba es válida) la letra subió al tope · ' + comoSeLlama,
         !borde.sinPestana && borde.cuerpo === borde.tope + 'px',
         borde.sinPestana ? 'no hay pestaña de la letra' : borde.cuerpo);
    vale('NINGÚN LETRERO SE SALE DE LA ESCENA · ' + comoSeLlama,
         !!borde.fuera && borde.fuera.length === 0,
         (borde.fuera || []).join(' · ') || 'ninguno');
    vale('  y ninguno le tapa las letras al titulillo · ' + comoSeLlama,
         !!borde.pisan && borde.pisan.length === 0,
         (borde.pisan || []).join(' · ') || 'ninguno');
    vale('  y EL RECUADRO ENCIERRA SU PUNTO · ' + comoSeLlama,
         !!borde.sueltos && borde.sueltos.length === 0,
         (borde.sueltos || []).join(' · ') || 'los cuatro');
    await cerrarParcial(ses, 'los letreros con la letra al tope, ' + comoSeLlama);
  }

  await cerrar(sesion);
})();
