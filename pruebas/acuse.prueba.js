/* EL ACUSE: «TE OÍ, ESTOY EN ELLO», Y HASTA DÓNDE LLEGA.

   El borde que late al apoyar el dedo existía desde hace tiempo y NO TENÍA
   NI UNA PRUEBA. Se nota en lo que se encontró al ir a ensancharlo: en el
   panel de LIBROS no acusaba absolutamente nada —ni los veintisiete libros,
   ni su propio botón de cerrar— y nadie se había enterado. El botón de
   cerrar es el caso que más enseña: casaba con la regla de CSS, así que
   leyendo la hoja de estilos parecía puesto; lo que faltaba era el oyente,
   porque el bucle que los engancha recorre LOS_ROLLOS y Libros no está en
   esa tabla. Un fallo que solo se ve tocando.

   Así que esta suite prueba las dos mitades, y la segunda es la que de
   verdad cuesta:

   · QUÉ ACUSA. Un libro, un capítulo de la cascada, una glosa del índice,
     una pestaña de Encuentros, un botón y un desplegable.
   · QUÉ NO, Y QUE SIGA SIN HACERLO. Los rieles de AAA, la casilla, el asa de
     arrastrar. Sin esta mitad, «acusa todo» pasaría la prueba, y acusar todo
     es exactamente lo que vacía de sentido la señal.

   Y LAS DOS FORMAS. El acuse macizo rellena el control de dorado; el de aro
   solo dibuja un contorno. No es adorno: una glosa del índice ES su color y
   una pestaña encendida ya es dorada, así que rellenarlas para decir «te oí»
   borra justo lo que se estaba mirando. La prueba de que son dos y no una va
   sobre el FONDO, que es la propiedad en la que se diferencian: el del libro
   cambia a lo largo del latido y el de la glosa no se mueve. Si alguien
   funde las dos formas en una, ahí se cae. */
const { abrir, conGlosas, cerrar, cerrarParcial, di, vale, titulo } = require('./comun');

/* El dedo, como manda la casa: PointerEvent con su pointerId y su
   pointerType, nunca .click(). Y desplazado del centro, que un dedo no cae
   en el píxel exacto del medio. */
const DEDO = `(el, tipo, id) => {
  const b = el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent(tipo, { bubbles:true, cancelable:true,
    pointerId:id, pointerType:'touch', isPrimary:true,
    clientX:b.left + b.width/2 + 1, clientY:b.top + b.height/2 - 1 }));
}`;

const IR_A = `async (sec) => {
  const pausa = ms => new Promise(z => setTimeout(z, ms));
  const visible = () => [...document.querySelectorAll('.rollo, #canto')]
    .find(r => getComputedStyle(r).display !== 'none');
  if (!visible()){ document.getElementById('pgCabeza').click(); await pausa(900); }
  const t = (visible() || document).querySelector('.pestanas [data-sec="' + sec + '"]');
  if (!t) return false;
  t.click();
  await pausa(1100);
  return true;
}`;

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  await conGlosas(p);
  const irA = sec => p.evaluate(`(${IR_A})(${JSON.stringify(sec)})`);

  /* ──────────────────────────────────────────────────────────────
     LIBROS, QUE ERA EL AGUJERO. */
  titulo('el panel de Libros acusa');
  di('   a Libros', await irA('libros'));
  const enLibros = await p.evaluate(`(async () => {
    const dedo = ${DEDO};
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const libro = document.querySelector('#canto .rejilla-libros .tabo.viva');
    const cerrar = document.querySelector('#canto .btn.cerrar-pie');
    const casilla = document.getElementById('chkFlechas');
    const pestana = document.querySelector('#canto .pestanas button');
    const mirar = async (el, id) => {
      if (!el) return null;
      dedo(el, 'pointerdown', id);
      await pausa(40);
      const cs = getComputedStyle(el);
      const r = { acusa:el.classList.contains('obrando'), animacion:cs.animationName };
      dedo(el, 'pointerup', id);
      el.dispatchEvent(new MouseEvent('click', { bubbles:true }));
      await pausa(560);
      return r;
    };
    return {
      hayLibros: document.querySelectorAll('#canto .rejilla-libros .tabo').length,
      libro:   await mirar(libro, 201),
      cerrar:  await mirar(cerrar, 202),
      casilla: await mirar(casilla, 203),
      pestana: await mirar(pestana, 204),
    };
  })()`);
  di('en Libros', JSON.stringify(enLibros));
  /* LA LÍNEA DE VALIDEZ: sin libros en la rejilla, todo lo de abajo mediría
     el vacío y saldría verde por no haber tocado nada. */
  vale('(la prueba es válida) la rejilla trae los libros',
       enLibros.hayLibros > 20, enLibros.hayLibros);
  vale('UN LIBRO ACUSA AL APOYAR EL DEDO',
       !!enLibros.libro && enLibros.libro.acusa === true);
  vale('  y con el acuse macizo, que es el de un botón',
       !!enLibros.libro && enLibros.libro.animacion === 'obrandoBorde',
       enLibros.libro && enLibros.libro.animacion);
  /* El que casaba con el CSS y no tenía oyente. */
  vale('EL CERRAR DE LIBROS TAMBIÉN, que es el que engañaba',
       !!enLibros.cerrar && enLibros.cerrar.acusa === true);
  /* Y LA MITAD QUE HACE QUE LO DE ARRIBA SIGNIFIQUE ALGO. */
  vale('la casilla NO acusa: la palomita ya es su acuse',
       !!enLibros.casilla && enLibros.casilla.acusa === false);
  vale('la pestaña de sección tampoco: tiene el suyo',
       !!enLibros.pestana && enLibros.pestana.acusa === false);

  /* ──────────────────────────────────────────────────────────────
     LA CASCADA DE CAPÍTULOS, que cuelga fuera de todo panel. */
  titulo('la cascada de capítulos acusa');
  const enCascada = await p.evaluate(`(async () => {
    const dedo = ${DEDO};
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const libro = document.querySelector('#canto .rejilla-libros .tabo.viva');
    if (libro) libro.click();
    await pausa(800);
    const caps = [...document.querySelectorAll('#flyCaps .num')]
      .filter(n => n.dataset.cap);
    if (!caps.length) return { cuantos:0 };
    const n = caps[Math.min(2, caps.length - 1)];
    dedo(n, 'pointerdown', 205);
    await pausa(40);
    const cs = getComputedStyle(n);
    const r = { cuantos:caps.length, acusa:n.classList.contains('obrando'),
                animacion:cs.animationName };
    dedo(n, 'pointercancel', 205);
    await pausa(120);
    return r;
  })()`);
  di('en la cascada', JSON.stringify(enCascada));
  /* Sin capítulos desplegados no hay nada que tocar, y la afirmación de
     abajo sería una afirmación sobre null. */
  vale('(la prueba es válida) la cascada se desplegó',
       enCascada.cuantos > 3, enCascada.cuantos);
  vale('UN CAPÍTULO ACUSA', enCascada.acusa === true);
  vale('  y también con el macizo', enCascada.animacion === 'obrandoBorde',
       enCascada.animacion);

  /* ──────────────────────────────────────────────────────────────
     LAS DOS FORMAS, medidas sobre el fondo.

     Se toman ocho fotos a lo largo de un ciclo entero (900 ms) y se cuentan
     los fondos DISTINTOS que salieron. El macizo anima el fondo, así que
     tiene que dar más de uno; el aro no lo toca, así que tiene que dar
     exactamente uno. Contar valores distintos en vez de mirar un instante
     concreto es lo que hace que esto no dependa de en qué punto del latido
     cayó la foto. */
  titulo('el acuse macizo rellena y el de aro no');
  await p.evaluate(() => { document.getElementById('pgCabeza').click(); });
  await p.waitForTimeout(700);
  di('   a Glosas', await irA('glosas'));
  const dosFormas = await p.evaluate(`(async () => {
    const dedo = ${DEDO};
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const glosa = document.querySelector('#etiquetas #indice .ix-item');
    if (!glosa) return { hayGlosa:false };
    dedo(glosa, 'pointerdown', 206);
    await pausa(30);
    const fondos = new Set(), contornos = new Set();
    for (let k = 0; k < 8; k++){
      const cs = getComputedStyle(glosa);
      fondos.add(cs.backgroundColor);
      contornos.add(cs.outlineStyle + ' ' + cs.outlineOffset);
      await pausa(115);
    }
    const cs = getComputedStyle(glosa);
    const r = { hayGlosa:true, acusa:glosa.classList.contains('obrando'),
                animacion:cs.animationName, fondos:[...fondos],
                contornos:[...contornos] };
    /* SE SUELTA EL DEDO ANTES DE SEGUIR. Un bloque que deja el gesto a
       medias le deja al siguiente un acuse encendido y unos oyentes puestos
       en el documento, y el siguiente mide entonces el estropicio del
       anterior. Es lo que hizo fallar a los dos bloques de después. */
    dedo(glosa, 'pointercancel', 206);
    await pausa(120);
    return r;
  })()`);
  di('la glosa del índice', JSON.stringify(dosFormas));
  vale('(la prueba es válida) hay una glosa en el índice',
       dosFormas.hayGlosa === true);
  vale('(la prueba es válida) seguía acusando mientras se medía',
       dosFormas.acusa === true);
  vale('UNA GLOSA ACUSA CON EL ARO', dosFormas.animacion === 'obrandoAro',
       dosFormas.animacion);
  /* LA AFIRMACIÓN QUE DISTINGUE UNA FORMA DE LA OTRA. Si alguien funde el
     aro en el macizo «para tener una sola regla», el fondo de la glosa pasa
     a moverse y esto se cae. */
  vale('  y el aro NO le toca el fondo: la glosa sigue siendo de su color',
       dosFormas.fondos.length === 1, dosFormas.fondos.join(' · '));
  vale('  el contorno va por dentro, que es lo que lo salva del recorte',
       (dosFormas.contornos[0] || '').indexOf('solid -2px') === 0,
       dosFormas.contornos.join(' · '));

  /* EL CONTRAFACTUAL DEL DE ENFRENTE: un control con el acuse macizo SÍ
     mueve el fondo. Sin esto, «el fondo de la glosa no se mueve» podría
     estar diciendo solamente que en esta sesión no se anima nada.

     Y NO SE MIDE SOBRE UN LIBRO, que fue el primer intento y salió verde por
     el motivo equivocado. Un dedo apoyado en un libro y quieto 200 ms gana
     la lupa, y la lupa apaga el acuse a propósito —es lo que se comprueba
     unas líneas más abajo—: para cuando la medición llevaba un ciclo, el
     borde estaba apagado desde hacía rato y los seis fondos distintos que
     contaba eran los de bajoeldedo, no los del latido. Contaba movimiento
     de verdad, del sitio equivocado. La línea de validez es la que lo
     destapó. Así que se mide sobre el botón de cerrar, que está en el mismo
     panel y no lo toca la lupa —solo se arma dentro de .rejilla-libros—.
     Se suelta con pointercancel para no cerrar el panel de paso. */
  await p.evaluate(() => { document.getElementById('pgCabeza').click(); });
  await p.waitForTimeout(700);
  di('   a Libros', await irA('libros'));
  const fondoMacizo = await p.evaluate(`(async () => {
    const dedo = ${DEDO};
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const bot = document.querySelector('#canto .btn.cerrar-pie');
    if (!bot) return { hay:false };
    dedo(bot, 'pointerdown', 207);
    await pausa(30);
    const fondos = new Set();
    for (let k = 0; k < 8; k++){
      fondos.add(getComputedStyle(bot).backgroundColor);
      await pausa(115);
    }
    const acusa = bot.classList.contains('obrando');
    dedo(bot, 'pointercancel', 207);
    await pausa(120);
    return { hay:true, acusa, fondos:[...fondos] };
  })()`);
  di('el botón', JSON.stringify(fondoMacizo));
  vale('(la prueba es válida) el botón seguía acusando al terminar de medir',
       fondoMacizo.acusa === true);
  vale('EL MACIZO SÍ MUEVE EL FONDO (el contrafactual del aro)',
       fondoMacizo.fondos.length > 1, fondoMacizo.fondos.join(' · '));

  /* ──────────────────────────────────────────────────────────────
     LA LUPA APAGA EL ACUSE DEL LIBRO DONDE EMPEZÓ EL DEDO.

     Y las dos mitades van en el MISMO gesto, que es lo que lo convierte en
     una prueba y no en dos medias: primero se ve encendido, y después, sin
     levantar el dedo, apagado. Medido así, «estaba apagado» no puede
     significar «nunca llegó a encenderse». */
  titulo('la lupa retira el acuse del libro de partida');
  const conLupa = await p.evaluate(`(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const libro = document.querySelector('#canto .rejilla-libros .tabo.viva');
    if (!libro) return { hay:false };
    const b = libro.getBoundingClientRect();
    const x = b.left + b.width/2 + 1, y = b.top + b.height/2 - 1;
    libro.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true,
      cancelable:true, pointerId:208, pointerType:'touch', isPrimary:true,
      clientX:x, clientY:y }));
    await pausa(45);
    const antes = libro.classList.contains('obrando');
    /* La lupa se gana con 200 ms de dedo QUIETO; se espera un poco más. */
    await pausa(280);
    const despues = libro.classList.contains('obrando');
    const lupa = !!document.querySelector('#lupaLibro.viva');
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles:true,
      pointerId:208, pointerType:'touch', clientX:x, clientY:y }));
    await pausa(400);
    return { hay:true, antes, despues, lupa };
  })()`);
  di('con la lupa', JSON.stringify(conLupa));
  vale('(la prueba es válida) la lupa llegó a engancharse',
       conLupa.lupa === true);
  vale('(la prueba es válida) al apoyar el dedo el libro SÍ acusaba',
       conLupa.antes === true);
  vale('CON LA LUPA PUESTA YA NO ACUSA: el desenlace será otro libro',
       conLupa.despues === false);

  /* ──────────────────────────────────────────────────────────────
     CANCELAR NO ES SOLTAR. */
  titulo('un gesto cancelado no deja el borde encendido');
  const cancelado = await p.evaluate(`(async () => {
    const dedo = ${DEDO};
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const libro = document.querySelector('#canto .rejilla-libros .tabo.viva');
    if (!libro) return { hay:false };
    dedo(libro, 'pointerdown', 209);
    await pausa(40);
    const antes = libro.classList.contains('obrando');
    dedo(libro, 'pointercancel', 209);
    await pausa(40);
    return { hay:true, antes, despues:libro.classList.contains('obrando') };
  })()`);
  di('cancelado', JSON.stringify(cancelado));
  vale('(la prueba es válida) antes de cancelar acusaba',
       cancelado.antes === true);
  vale('AL CANCELAR SE APAGA, sin esperar a la red de seguridad',
       cancelado.despues === false);

  /* ──────────────────────────────────────────────────────────────
     AAA: EL DESPLEGABLE ACUSA AL ELEGIR, Y LOS RIELES NO ACUSAN. */
  titulo('AAA: el desplegable al elegir, el riel nunca');
  await p.evaluate(() => { document.getElementById('pgCabeza').click(); });
  await p.waitForTimeout(700);
  di('   a Formato', await irA('formato'));
  const enAAA = await p.evaluate(`(async () => {
    const dedo = ${DEDO};
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const sel = document.querySelector('#ajustes select');
    const riel = document.querySelector('#ajustes input[type=range]');
    const boton = [...document.querySelectorAll('#ajustes .btn')]
      .find(b => !b.classList.contains('cerrar-pie'));
    const out = { opciones: sel ? sel.options.length : 0 };
    if (sel){
      /* AL APOYAR EL DEDO NO, que ahí todavía se está decidiendo. */
      dedo(sel, 'pointerdown', 210);
      await pausa(40);
      out.alApoyar = sel.classList.contains('obrando');
      dedo(sel, 'pointerup', 210);
      await pausa(400);
      /* AL ELEGIR SÍ, que ahí empieza el trabajo. */
      /* SE ELIGE EL CAMBIO CARO A PROPÓSITO. Este desplegable es el del
         tamaño de letra y esta sesión trae glosas cargadas, así que el
         onchange repagina el libro entero sin soltar el hilo. Es el caso en
         el que el acuse se caía —y el único en el que la afirmación de abajo
         distingue algo—: con un cambio instantáneo el borde se queda puesto
         solo, y la prueba pasaría sin probar nada. Cuánto tardó se mide y se
         afirma, porque «fue caro» no se supone. */
      const t0 = performance.now();
      sel.value = sel.options[sel.selectedIndex === 0 ? 1 : 0].value;
      sel.dispatchEvent(new Event('change', { bubbles:true }));
      out.tardo = Math.round(performance.now() - t0);
      await pausa(40);
      out.alElegir = sel.classList.contains('obrando');
      out.animacion = getComputedStyle(sel).animationName;
      await pausa(560);
    }
    if (riel){
      dedo(riel, 'pointerdown', 211);
      await pausa(40);
      out.riel = riel.classList.contains('obrando');
      dedo(riel, 'pointerup', 211);
      await pausa(400);
    }
    if (boton){
      dedo(boton, 'pointerdown', 212);
      await pausa(40);
      out.boton = boton.classList.contains('obrando');
      dedo(boton, 'pointerup', 212);
      boton.dispatchEvent(new MouseEvent('click', { bubbles:true }));
      await pausa(560);
    }
    return out;
  })()`);
  di('en AAA', JSON.stringify(enAAA));
  vale('(la prueba es válida) el desplegable tiene más de una opción',
       enAAA.opciones > 1, enAAA.opciones);
  vale('el desplegable NO acusa al apoyar el dedo', enAAA.alApoyar === false);
  /* LA LÍNEA DE VALIDEZ QUE HACE QUE ESTO SIRVA: el cambio bloqueó el hilo
     más de lo que dura el mínimo de permanencia. Si algún día este cambio se
     vuelve barato, esta línea cae antes que la otra y avisa de que la prueba
     dejó de vigilar lo que decía vigilar. */
  vale('(la prueba es válida) el cambio bloqueó el hilo de verdad',
       enAAA.tardo > 60, enAAA.tardo + ' ms');
  /* Y ÉSTA ES LA QUE SE CAYÓ AL ESCRIBIRLA. El borde se ponía y se quitaba
     en el mismo turno sin llegar a pintarse: el mínimo se contaba desde que
     se pedía y el trabajo se lo comía entero. Cuanto más tardaba el cambio
     —o sea, cuanto más falta hacía el aviso— menos se veía. */
  vale('EL DESPLEGABLE ACUSA AL ELEGIR, y sigue puesto tras el trabajo',
       enAAA.alElegir === true);
  vale('  y con el aro, para no taparle el valor elegido',
       enAAA.animacion === 'obrandoAro', enAAA.animacion);
  /* El riel no acusa a propósito: la hoja se repinta debajo del dedo y ésa
     es mejor respuesta que un borde. */
  vale('EL RIEL NO ACUSA: la hoja repintándose ya lo dice', enAAA.riel === false);
  vale('los botones de AAA siguen acusando', enAAA.boton === true);

  /* ──────────────────────────────────────────────────────────────
     EL ASA DE ARRASTRAR NO ES UN BOTÓN. */
  titulo('agarrar una glosa para moverla no acusa');
  await p.evaluate(() => { document.getElementById('pgCabeza').click(); });
  await p.waitForTimeout(700);
  di('   a Glosas', await irA('glosas'));
  const porElAsa = await p.evaluate(`(async () => {
    const dedo = ${DEDO};
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const asa = document.querySelector('#etiquetas #indice .ix-item .ix-asa');
    if (!asa) return { hay:false };
    const pieza = asa.closest('.ix-item');
    dedo(asa, 'pointerdown', 213);
    await pausa(40);
    const r = { hay:true, acusa:pieza.classList.contains('obrando') };
    dedo(asa, 'pointerup', 213);
    await pausa(300);
    return r;
  })()`);
  di('por el asa', JSON.stringify(porElAsa));
  vale('(la prueba es válida) la glosa trae su asa', porElAsa.hay === true);
  vale('AGARRAR POR EL ASA NO ACUSA: un arrastre no es un trabajo',
       porElAsa.acusa === false);

  /* ──────────────────────────────────────────────────────────────
     LAS PESTAÑAS DE ENCUENTROS, que traen un relato de fuera. */
  titulo('una pestaña de Encuentros acusa mientras llega el relato');
  di('   a Encuentros', await irA('encuentros'));
  const enEncuentros = await p.evaluate(`(async () => {
    const dedo = ${DEDO};
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const t = document.querySelector('#encuentros .pestanitas button:not(.aqui)');
    if (!t) return { hay:false };
    dedo(t, 'pointerdown', 214);
    await pausa(40);
    const cs = getComputedStyle(t);
    const r = { hay:true, acusa:t.classList.contains('obrando'),
                animacion:cs.animationName };
    dedo(t, 'pointercancel', 214);
    await pausa(120);
    return r;
  })()`);
  di('en Encuentros', JSON.stringify(enEncuentros));
  vale('(la prueba es válida) hay otra pestaña que tocar',
       enEncuentros.hay === true);
  vale('UNA PESTAÑITA ACUSA', enEncuentros.acusa === true);
  /* Con el aro y no con el macizo: la encendida ya es dorada con su raya
     debajo, y rellenarla borraría justo esa raya. */
  vale('  y con el aro, para no borrarle la raya de encendida',
       enEncuentros.animacion === 'obrandoAro', enEncuentros.animacion);

  await cerrarParcial(sesion, 'el teléfono');

  /* ──────────────────────────────────────────────────────────────
     MOVIMIENTO REDUCIDO: SIN LATIDO, PERO CON AVISO.

     Quien pidió menos movimiento no puede quedarse sin la señal; se queda
     sin la animación. Las dos formas tienen su regla quieta y las dos se
     comprueban, porque es justo el sitio donde se olvida una al añadir la
     otra. */
  titulo('con movimiento reducido el acuse se queda quieto, no desaparece');
  const quieta = await abrir({ reducedMotion:'reduce' });
  const pq = quieta.pagina;
  await conGlosas(pq);
  const irAq = sec => pq.evaluate(`(${IR_A})(${JSON.stringify(sec)})`);
  di('   a Libros', await irAq('libros'));
  const sinMovimiento = await pq.evaluate(`(async () => {
    const dedo = ${DEDO};
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const libro = document.querySelector('#canto .rejilla-libros .tabo.viva');
    if (!libro) return { hay:false };
    dedo(libro, 'pointerdown', 215);
    await pausa(60);
    const cs = getComputedStyle(libro);
    const r = { hay:true, pide:matchMedia('(prefers-reduced-motion: reduce)').matches,
                acusa:libro.classList.contains('obrando'),
                animacion:cs.animationName, sombra:cs.boxShadow,
                fondo:cs.backgroundColor };
    dedo(libro, 'pointercancel', 215);
    await pausa(120);
    return r;
  })()`);
  di('sin movimiento', JSON.stringify(sinMovimiento));
  vale('(la prueba es válida) esta sesión pide menos movimiento',
       sinMovimiento.pide === true);
  vale('sigue acusando', sinMovimiento.acusa === true);
  vale('SIN ANIMACIÓN', sinMovimiento.animacion === 'none',
       sinMovimiento.animacion);
  vale('  pero con el halo puesto, que es lo que lo hace visible',
       /rgba?\(/.test(sinMovimiento.sombra || '') &&
       (sinMovimiento.sombra || '') !== 'none', sinMovimiento.sombra);

  await pq.evaluate(() => { document.getElementById('pgCabeza').click(); });
  await pq.waitForTimeout(700);
  di('   a Glosas', await irAq('glosas'));
  const aroQuieto = await pq.evaluate(`(async () => {
    const dedo = ${DEDO};
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const glosa = document.querySelector('#etiquetas #indice .ix-item');
    if (!glosa) return { hay:false };
    dedo(glosa, 'pointerdown', 216);
    await pausa(60);
    const cs = getComputedStyle(glosa);
    const r = { hay:true, acusa:glosa.classList.contains('obrando'),
                animacion:cs.animationName, ancho:cs.outlineWidth,
                estilo:cs.outlineStyle };
    dedo(glosa, 'pointercancel', 216);
    await pausa(120);
    return r;
  })()`);
  di('el aro quieto', JSON.stringify(aroQuieto));
  vale('(la prueba es válida) la glosa acusaba', aroQuieto.acusa === true);
  vale('EL ARO TAMBIÉN SE QUEDA QUIETO', aroQuieto.animacion === 'none',
       aroQuieto.animacion);
  vale('  y con el contorno puesto, no en cero',
       aroQuieto.estilo === 'solid' && parseFloat(aroQuieto.ancho) >= 2,
       aroQuieto.estilo + ' ' + aroQuieto.ancho);

  await cerrar(quieta);
})();
