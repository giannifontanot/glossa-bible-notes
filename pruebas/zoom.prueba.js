/* LA VISTA DE LEJOS: QUE ENTRAR Y SALIR SEAN EL MISMO VIAJE.

   La medida que lo dice todo es una sola: CUÁNTO SE SALE LA LETRA DE SU PAPEL.
   Si el papel de debajo y el bloque de texto no encogen atados, se ve al
   instante —titulillo y renglones escritos sobre el escritorio— y esa fue
   exactamente la queja. Aquí se muestrea el viaje cada 30 ms y se exige
   desborde cero en las dos direcciones.

   Tres cosas que costaron un rato y por eso están puestas a prueba:

   · El punto de partida del papel hay que ASENTARLO con la transición
     apagada. medirZoom lee offsetWidth, y leer una medida obliga a resolver
     los estilos ahí mismo: sin asentar, el papel se animaba de none a grande
     y volvía, quedándose en la práctica quieto.
   · transform-origin vivía dentro de la regla .zoom. Al salir, la clase se va
     en el primer cuadro y el origen saltaba al centro con la matriz todavía
     interpolando: la hoja crecía hacia los cuatro lados y daba un tirón.
   · Y salir se hace tocando EL HUECO, no el libro. Esto estuvo al revés una
     temporada —el miedo era salirse sin querer, porque de lejos hay mucho
     escritorio y poco papel— hasta que se vio lo que costaba: de lejos el
     libro SE USA, se pasa hoja por los filos y se tocan las glosas, así que
     hacerlo botón de salida convertía cada uno de esos toques en una apuesta.

   Y una cosa que esta prueba aprendió de sí misma: EL VIAJE DE SALIDA TIENE
   QUE COMPROBAR QUE SALIÓ. Al invertir el gesto, el muestreo siguió cantando
   verde sin que el zoom se cerrara una sola vez: midiendo una pantalla quieta,
   el desborde es cero y la razón es uno: todo en orden y nada ocurrido. Un
   veredicto que también se cumple cuando no pasa nada no está comprobando
   nada. */
const { abrir, cerrar, conGlosas, di, vale, titulo, ESCRITORIO } = require('./comun');

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  /* CON GLOSAS PUESTAS, y no por adorno: media prueba de esta suite trata de
     lo que la hoja conserva de lejos, y sin una sola glosa en el margen el
     caso de «la glosa se queda con el toque» no tiene dónde tocar —se
     saltaba, y saltarse un caso se lee igual que pasarlo—. De paso el margen
     queda como está de verdad cuando alguien usa el programa.
     Lo medido aquí es geometría y color, así que el contenido no lo mueve. */
  await conGlosas(p);

  /* Muestrea un viaje entero, en la dirección que se le pida. */
  const viaje = sentido => p.evaluate(async dir => {
    const pg = document.getElementById('pg'), z = document.getElementById('zoomPapel');
    const foto = () => {
      if (getComputedStyle(z).display === 'none') return null;
      const t = pg.querySelector('.pg-inner').getBoundingClientRect();
      const r = z.getBoundingClientRect();
      return { texto: Math.round(t.width), papel: Math.round(r.width),
               desborde: Math.round(Math.max(0, r.left - t.left, t.right - r.right,
                                                r.top - t.top, t.bottom - r.bottom)) };
    };
    const visto = [];
    const reloj = setInterval(() => { const f = foto(); if (f) visto.push(f); }, 30);
    if (dir === 'entrar') document.getElementById('btnZoom').click();
    else {
      /* por el hueco de debajo del libro, que es la salida */
      const r = pg.querySelector('.pg-inner').getBoundingClientRect();
      pg.dispatchEvent(new MouseEvent('click', { bubbles:true,
        clientX:Math.round(r.left + r.width/2), clientY:Math.round(r.bottom + 60) }));
    }
    await new Promise(q => setTimeout(q, 700));
    clearInterval(reloj);
    return { muestras: visto.length,
             desbordeMaximo: Math.max(...visto.map(v => v.desborde)),
             enZoom: pg.classList.contains('zoom'),
             razones: visto.map(v => +(v.texto / v.papel).toFixed(3)) };
  }, sentido);

/* LA HOLGURA SALE DE LA MEDIDA, no de lo que parezca razonable — que es la
   tercera regla de esta carpeta y ésta la incumplía.

   Pedía la razón EXACTAMENTE 1 en cada una de las 23 muestras de una
   transición de 460 ms. Y la razón se saca de dos elementos con transiciones
   SEPARADAS —.pg-inner y #zoomPapel, cada uno con su propia declaración—, así
   que basta con que a uno se le caiga un cuadro y al otro no para que esa
   muestra salga distinta. No es que se desaten: es que se leen con un cuadro
   de diferencia.

   MEDIDO, porque si no esto sería otra cifra inventada. 164 viajes de zoom
   —recargando en cada uno, que es la condición que la produce— en tres
   estados: sin filtro, con contrast(1) y con contrast(1.25). Falló 4 veces, y
   LAS CUATRO CON EL MISMO VALOR: 0.9974. Es un cuadro de retraso sobre una
   hoja de 411 px, o sea un píxel. No es una deriva: es una cuantía fija que
   aparece o no aparece.

   Lo que la prueba tiene que cazar está tres órdenes de magnitud más lejos: si
   los dos dejaran de ir atados, el texto se escalaría a 0.585 mientras el
   papel se queda en 1. Con el 1% de holgura —cuatro veces el ruido medido—
   eso se caza igual de bien, y un cuadro perdido ya no canta un fallo que no
   existe. La cuenta de muestras torcidas se IMPRIME siempre: si algún día son
   muchas, se ve en el dato aunque el veredicto siga verde.

   Y ojo con lo que NO se tocó: 'la letra no sale de su hoja' —el desborde en
   cero— no falló ni una vez en esas 164, y ése es el invariante que de verdad
   importa. Se queda exacto. */
const HOLGURA = 0.01;
const atados = r => r.every(x => Math.abs(x - 1) <= HOLGURA);
const comoVan = r => {
  const torcidas = r.filter(x => x !== 1);
  return r.length + ' muestras · ' + torcidas.length + ' con un cuadro de retraso' +
         (torcidas.length ? ' (peor ' + Math.min(...torcidas) + ')' : '');
};

  titulo('entrando');
  const e = await viaje('entrar');
  di('muestreado', { muestras:e.muestras, desbordeMaximo:e.desbordeMaximo,
                     razonMin:Math.min(...e.razones), razonMax:Math.max(...e.razones) });
  vale('la letra no sale de su hoja', e.desbordeMaximo === 0, e.desbordeMaximo + ' px');
  vale('texto y papel van atados', atados(e.razones), comoVan(e.razones));
  vale('y entró de verdad', e.enZoom);

  await p.waitForTimeout(500);
  titulo('saliendo');
  const s = await viaje('salir');
  di('muestreado', { muestras:s.muestras, desbordeMaximo:s.desbordeMaximo,
                     razonMin:Math.min(...s.razones), razonMax:Math.max(...s.razones) });
  vale('la letra no sale de su hoja', s.desbordeMaximo === 0, s.desbordeMaximo + ' px');
  vale('texto y papel van atados al volver', atados(s.razones), comoVan(s.razones));
  vale('es el mismo viaje al revés', e.desbordeMaximo === s.desbordeMaximo);
  vale('y salió de verdad', !s.enZoom);

  /* ================================================================
     DE LEJOS, LOS FILOS SE RECORTAN AL PAPEL Y NI UN PÍXEL MÁS.

     Los filos ocupan todo el alto de la pantalla, y de lejos eso invadiría el
     hueco de alrededor —que ahí significa «vuelve»—, así que medirZoom los
     recoloca sobre los cantos de la hoja pequeña. El derecho se coloca
     restando el ancho del filo, y ese ancho estaba ESCRITO A MANO: el día que
     .edge pasó de 24 a 30px, el filo derecho se quedó 6px pasado la orilla,
     comiéndose una tira del hueco. Medido, y por eso esto existe.

     Se comprueba con el rectángulo pintado y contra el papel de lejos, no
     contra la ventana: lo que no puede invadirse es el hueco que hay entre uno
     y otra. Y los dos filos, que el izquierdo se coloca por otra cuenta.
     ================================================================ */
  titulo('de lejos los filos no se salen del papel');
  await p.evaluate(async () => {
    const pg = document.getElementById('pg');
    if (!pg.classList.contains('zoom')){
      document.getElementById('btnZoom').click();
      await new Promise(z => setTimeout(z, 1300));
    }
  });
  const filosDeLejos = await p.evaluate(() => {
    const r = id => document.getElementById(id).getBoundingClientRect();
    const papel = r('zoomPapel'), der = r('edgeR'), izq = r('edgeL');
    return { anchoDer: Math.round(der.width), anchoIzq: Math.round(izq.width),
             /* positivo = se sale */
             sobraDer: Math.round(der.right - papel.right),
             sobraIzq: Math.round(papel.left - izq.left),
             /* y siguen pegados a su canto, no encogidos hacia dentro */
             pegadoDer: Math.round(papel.right - der.right),
             pegadoIzq: Math.round(izq.left - papel.left) };
  });
  di('los filos contra el papel de lejos', filosDeLejos);
  vale('el derecho no se sale del papel', filosDeLejos.sobraDer <= 0,
       filosDeLejos.sobraDer + ' px de más');
  vale('ni el izquierdo', filosDeLejos.sobraIzq <= 0, filosDeLejos.sobraIzq + ' px de más');
  /* Y no basta con que no se salgan: encogerlos hacia dentro los dejaría sin
     tocar el canto, que es justo por donde se pasa la hoja. */
  vale('y los dos quedan pegados a su canto',
       filosDeLejos.pegadoDer >= 0 && filosDeLejos.pegadoDer <= 1 &&
       filosDeLejos.pegadoIzq >= 0 && filosDeLejos.pegadoIzq <= 1,
       'der ' + filosDeLejos.pegadoDer + ' · izq ' + filosDeLejos.pegadoIzq);
  /* No se estrechan con la escala: un filo mide lo que mide un dedo. */
  vale('sin encogerse con la escala',
       filosDeLejos.anchoDer === 30 && filosDeLejos.anchoIzq === 30,
       filosDeLejos.anchoDer + ' · ' + filosDeLejos.anchoIzq);

  titulo('las tres puertas de vuelta, y el contenido que no lo es');
  /* DE LEJOS LA HOJA TIENE DOS ZONAS QUE TAMBIÉN SON PUERTAS, y cada una te
     devuelve mirando otra cosa: el blanco del margen te deja en el cajón de
     glosas, el blanco del libro en el texto, y el hueco de fuera te deja donde
     estabas. La idea es que de lejos ves la hoja entera y eliges a qué
     acercarte, así que el toque que te devuelve dice además a qué.

     LA OTRA MITAD, Y ES LA QUE HAY QUE VIGILAR: el contenido no es puerta. De
     lejos una glosa se sigue abriendo y el texto se sigue seleccionando para
     resaltar. Si eso se pierde, la hoja de lejos deja de ser una hoja y pasa a
     ser un botón grande — y no se notaría en ninguna prueba que solo mirase si
     la vuelta funciona. Por eso aquí hay tantos casos de «no pasa nada» como
     de «vuelve».

     Los puntos se buscan, no se calculan. Los filos de pasar hoja se recolocan
     de lejos sobre los cantos de la hoja —lo que midan, y el derecho cae
     ENCIMA de la columna de glosas—, así que un punto elegido a ojo aterriza
     en el filo y la prueba mide otra cosa. Pasó al escribirla. */
  const enZoom = async () => p.evaluate(async () => {
    const pg = document.getElementById('pg');
    if (!pg.classList.contains('zoom')){
      document.getElementById('btnZoom').click();
      await new Promise(z => setTimeout(z, 1300));
    }
  });
  /* Toca un punto de lejos y cuenta qué pasó. `cajonAntes` es el cajón desde
     el que se entró al zoom, que es lo que el hueco tiene que devolver. */
  const tocarDeLejos = (zona, cajonAntes = 0) => p.evaluate(async ([zona, cajonAntes]) => {
    const pg = document.getElementById('pg');
    /* se sale, se coloca el cajón y se vuelve a entrar, para que cada caso
       empiece igual */
    if (pg.classList.contains('zoom')){
      const q = pg.querySelector('.pg-inner').getBoundingClientRect();
      pg.dispatchEvent(new MouseEvent('click',
        { bubbles:true, clientX:206, clientY:Math.round(q.bottom + 60) }));
      await new Promise(z => setTimeout(z, 1400));
    }
    pg.scrollLeft = cajonAntes;
    await new Promise(z => setTimeout(z, 150));
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1300));

    const inner = pg.querySelector('.pg-inner').getBoundingClientRect();
    const m = document.getElementById('pgMargin').getBoundingClientRect();
    const cuerpo = document.getElementById('pgBody').getBoundingClientRect();
    const filo = 26;                     /* lo que ocupan los filos, con holgura */
    let punto = null;
    if (zona === 'margenVacio')
      punto = [Math.round(m.left + 10), Math.round(m.bottom - 10)];
    else if (zona === 'glosa'){
      const g = document.querySelector('#pgMargin .gl');
      if (g){ const r = g.getBoundingClientRect();
              punto = [Math.round(r.left + 12), Math.round(r.top + 10)]; }
    } else if (zona === 'libroVacio')
      punto = [Math.round(cuerpo.left + cuerpo.width/2), Math.round(cuerpo.bottom - 8)];
    else if (zona === 'bordeArriba')
      punto = [Math.round(inner.left + inner.width/2), Math.round(inner.top + 8)];
    else if (zona === 'hueco')
      punto = [206, Math.round(inner.bottom + 60)];
    else if (zona === 'palabra'){
      /* el trozo de renglón más ancho que caiga lejos de los dos filos */
      let mejor = null;
      for (const v of document.querySelectorAll('#pgBody .v'))
        for (const r of v.getClientRects())
          if (r.left > inner.left + filo && r.right < cuerpo.right - 4 &&
              r.width > 30 && (!mejor || r.width > mejor.width)) mejor = r;
      if (mejor) punto = [Math.round(mejor.left + mejor.width/2),
                          Math.round(mejor.top + mejor.height/2)];
    }
    if (!punto) return { sinPunto: zona };
    const quien = document.elementFromPoint(punto[0], punto[1]);
    (quien || pg).dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:punto[0], clientY:punto[1] }));
    await new Promise(z => setTimeout(z, 1500));
    return { punto: punto.join(','),
             recibio: quien ? (quien.className || quien.id || quien.tagName) : null,
             sigueLejos: pg.classList.contains('zoom'),
             cajon: pg.scrollLeft, tope: pg.scrollWidth - pg.clientWidth };
  }, [zona, cajonAntes]);

  const margen = await tocarDeLejos('margenVacio');
  di('blanco del margen', margen);
  vale('vuelve de cerca', !margen.sigueLejos);
  vale('y deja el cajón en las glosas', margen.cajon === margen.tope,
       margen.cajon + ' de ' + margen.tope);

  const libro = await tocarDeLejos('libroVacio');
  di('blanco del libro', libro);
  vale('vuelve de cerca ·libro', !libro.sigueLejos);
  vale('y deja el cajón en el texto', libro.cajon === 0, libro.cajon);

  const borde = await tocarDeLejos('bordeArriba');
  di('borde de arriba de la hoja', borde);
  vale('el borde también vuelve, por el texto', !borde.sigueLejos && borde.cajon === 0,
       borde.cajon);

  /* LAS DOS DE «NO PASA NADA», que son las que protegen el uso de la hoja. */
  const glosa = await tocarDeLejos('glosa');
  di('encima de una glosa', glosa);
  vale('la glosa se queda con el toque', glosa.sigueLejos);

  const palabra = await tocarDeLejos('palabra');
  di('encima de una palabra', palabra);
  vale('el punto cayó en el texto y no en un filo',
       /\bv\b/.test(String(palabra.recibio || '')), palabra.recibio);
  /* Un toque encima de un renglón es casi siempre el dedo apoyado. Cobrarle la
     vista entera sería el accidente que se quiso evitar. */
  vale('una palabra suelta no te saca', palabra.sigueLejos);

  /* EL HUECO NO APUNTA A NADA, así que devuelve el cajón en el que entraste.
     Se prueba desde los dos, porque desde el del libro daría verde aunque el
     programa lo pusiera siempre en cero. */
  const huecoLibro = await tocarDeLejos('hueco', 0);
  di('hueco, entrando del libro', huecoLibro);
  vale('vuelve al cajón del libro', !huecoLibro.sigueLejos && huecoLibro.cajon === 0,
       huecoLibro.cajon);
  const huecoGlosas = await tocarDeLejos('hueco', 251);
  di('hueco, entrando de las glosas', huecoGlosas);
  vale('vuelve al cajón de las glosas',
       !huecoGlosas.sigueLejos && huecoGlosas.cajon === huecoGlosas.tope,
       huecoGlosas.cajon + ' de ' + huecoGlosas.tope);

  /* UN SOLO MOVIMIENTO, NO DOS ENCADENADOS.
     La hoja crece con la curva del CSS —cubic-bezier(.32,.72,.24,1) en 460 ms—
     y el cajón tiene que ir montado en eso. La primera versión lo movía con la
     curva del arrastre, que arranca despacio a propósito porque está pensada
     para algo que empujas con el dedo; juntas se leían como dos viajes: al 32%
     del tiempo la hoja llevaba el 72% del camino y el cajón el 5%, o sea que
     la hoja terminaba de crecer y ENTONCES la ventana se corría.
     Así que no se mide el final —ése ya salía bien y no habría dicho nada—,
     se mide EL CAMINO: cuánto lleva andado cada uno en el mismo instante. */
  di('la hoja y el cajón, a la par', await p.evaluate(async () => {
    const pg = document.getElementById('pg');
    if (!pg.classList.contains('zoom')){
      document.getElementById('btnZoom').click();
      await new Promise(z => setTimeout(z, 1300));
    }
    const inner = pg.querySelector('.pg-inner');
    const chica = inner.getBoundingClientRect().width, grande = inner.offsetWidth;
    const tope = pg.scrollWidth - pg.clientWidth;
    const m = document.getElementById('pgMargin').getBoundingClientRect();
    if (tope < 10 || grande - chica < 10) return { sinCarrera:true, tope };
    const visto = [];
    const reloj = setInterval(() => {
      const w = inner.getBoundingClientRect().width;
      visto.push({ hoja:(w - chica)/(grande - chica), cajon:pg.scrollLeft/tope });
    }, 25);
    const el = document.elementFromPoint(Math.round(m.left + 10), Math.round(m.bottom - 10));
    el.dispatchEvent(new MouseEvent('click', { bubbles:true,
      clientX:Math.round(m.left + 10), clientY:Math.round(m.bottom - 10) }));
    await new Promise(z => setTimeout(z, 700));
    clearInterval(reloj);
    /* solo el tramo en que algo se mueve; ya parados los dos valen 1 */
    const camino = visto.filter(v => v.hoja > .02 && v.hoja < .98);
    return { muestras: visto.length, enCamino: camino.length,
             desfaseMaximo: camino.length
               ? +(Math.max(...camino.map(v => Math.abs(v.hoja - v.cajon))) * 100).toFixed(1)
               : null,
             cajonFinal: pg.scrollLeft, tope };
  }).then(r => {
    /* El margen es ancho porque lo que hay que cazar es enorme: encadenados
       daban más de sesenta puntos de desfase, y montados el ruido de un cuadro
       de más o de menos anda por seis. Entre seis y sesenta, veinte. */
    vale('van montados en la misma curva',
         r.enCamino > 2 && r.desfaseMaximo !== null && r.desfaseMaximo < 20,
         r.desfaseMaximo + '% en ' + r.enCamino + ' muestras');
    vale('y los dos terminan el viaje', r.cajonFinal === r.tope,
         r.cajonFinal + ' de ' + r.tope);
    return r;
  }));

  /* Y que el texto se siga pudiendo resaltar de lejos, que es la otra cosa que
     la hoja tiene que conservar. */
  await enZoom();
  di('seleccionar y resaltar, de lejos', await p.evaluate(async () => {
    const clave = 'glossa:marcas:v1';
    const cuantas = () => JSON.parse(localStorage.getItem(clave) || '[]').length;
    const antes = cuantas();
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 20){ n = w.currentNode; break; }
    if (!n) return { sinTexto:true };
    const rg = document.createRange(); rg.setStart(n, 0); rg.setEnd(n, 14);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
    const rc = rg.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:Math.round(rc.left + 2), clientY:Math.round(rc.top + 2) }));
    await new Promise(z => setTimeout(z, 500));
    const menu = document.getElementById('menu');
    const salio = getComputedStyle(menu).display !== 'none' && menu.textContent.trim().length > 0;
    /* Toda marca es una glosa: se escribe la nota y se toca fuera, que es lo
       que la guarda. Sin texto no se guardaría nada, y de lejos tampoco. */
    const ta = document.getElementById('glosaCaja');
    if (ta){
      ta.value = 'resaltada de lejos';
      ta.dispatchEvent(new Event('input', { bubbles:true }));
      document.body.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles:true, clientX:5, clientY:5 }));
    }
    await new Promise(z => setTimeout(z, 1000));
    return { salioElMenu:salio, habiaCaja:!!ta, antes, despues:cuantas(),
             sigueLejos: document.getElementById('pg').classList.contains('zoom') };
  }).then(r => {
    vale('sale el panel de lejos', !!r.salioElMenu && r.habiaCaja);
    vale('y resalta de verdad', r.despues === r.antes + 1, r.antes + ' → ' + r.despues);
    vale('sin sacarte de la vista', !!r.sigueLejos);
    return r;
  }));

  /* El filo, recolocado al canto de la hoja chica, sigue pasando hoja. */
  await enZoom();
  di('el filo, de lejos', await p.evaluate(async () => {
    const cab = () => document.getElementById('pgCabeza').textContent.trim();
    const antes = cab();
    const e = document.getElementById('edgeR'), r = e.getBoundingClientRect();
    const op = { bubbles:true, pointerId:31, pointerType:'touch', isPrimary:true,
                 clientX:Math.round(r.left + r.width/2), clientY:Math.round(r.top + r.height/2) };
    e.dispatchEvent(new PointerEvent('pointerdown', op));
    await new Promise(z => setTimeout(z, 70));
    e.dispatchEvent(new PointerEvent('pointerup', op));
    await new Promise(z => setTimeout(z, 2200));
    return { de:antes, a:cab(), paso: cab() !== antes,
             sigueEnZoom: document.getElementById('pg').classList.contains('zoom') };
  }).then(r => { vale('el filo pasa hoja sin salir del zoom', r.paso && r.sigueEnZoom); return r; }));

  di('los cursores', await p.evaluate(() => ({
    hueco: getComputedStyle(document.getElementById('pg')).cursor,
    papel: getComputedStyle(document.querySelector('#pg .pg-inner')).cursor })));
  /* se deja fuera del zoom y con el cajón en el texto para la sección de abajo */
  await p.evaluate(async () => {
    const pg = document.getElementById('pg');
    if (pg.classList.contains('zoom')){
      const r = pg.querySelector('.pg-inner').getBoundingClientRect();
      pg.dispatchEvent(new MouseEvent('click',
        { bubbles:true, clientX:206, clientY:Math.round(r.bottom + 60) }));
      await new Promise(z => setTimeout(z, 1400));
    }
    pg.scrollLeft = 0;
  });

  titulo('de lejos los rótulos se leen');
  /* La vista de lejos existe para orientarse, así que el capítulo y la versión
     son justo lo que hay que poder leer ahí. De lejos la hoja se encoge al
     58% y ellos con ella, y a 21px eso deja 12,3 reales.

     LO QUE ESTA PRUEBA VIGILA DE VERDAD ES QUE LA CAJA NO CREZCA. La letra se
     agranda recortando el relleno interior, no la caja, y no es un capricho:
     de --alto-cabeza (35) y --alto-version (31) sale el relleno con el que el
     texto se aparta de los rótulos. Una caja más alta movería el texto y
     repaginaría el libro entero, y eso no se vería en una prueba que solo
     mirase que la letra es más grande. Se comprueban las dos cosas y también
     que quede hueco entre el rótulo y el texto.

     Y LO SEGUNDO: QUE EL ZOOM NO CAMBIE EL COLOR. Antes sí lo cambiaba —de
     lejos negrita y marrón oscuro, de cerca fino y pálido— y eso era un
     parche: dejaba el rótulo legible solo en la vista donde menos se lee, y
     le hacía pegar un brinco de tinta al entrar y salir. Ahora el contraste lo
     resuelve el sepia, igual en las dos vistas, y aquí se comprueba que el
     zoom lo deje en paz: mismo color y mismo peso de cerca y de lejos, y en
     las dos por encima de 4.5. El contraste se mide contra el fondo REAL del
     rótulo, no contra un papel escrito a mano: el papel se mueve con el sepia
     y una constante aquí mediría el papel de otro día. */
  di('los rótulos', await p.evaluate(async () => {
    const pg = document.getElementById('pg');
    const lum = c => { const [r,g,b] = c.match(/\d+/g).map(Number).map(v => {
      v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); });
      return .2126*r + .7152*g + .0722*b; };
    const leer = () => {
      const inner = pg.querySelector('.pg-inner');
      const esc = inner.getBoundingClientRect().width / inner.offsetWidth;
      const q = id => { const e = document.getElementById(id), c = getComputedStyle(e);
        const L = lum(c.color), papel = lum(c.backgroundColor), r = e.getBoundingClientRect();
        return { efectivo:+(parseFloat(c.fontSize)*esc).toFixed(1), peso:+c.fontWeight,
                 caja:+r.height.toFixed(1), tinta:c.color, fondo:c.backgroundColor,
                 contraste:+((Math.max(L,papel)+.05)/(Math.min(L,papel)+.05)).toFixed(2) }; };
      const cuerpo = document.getElementById('pgBody').getBoundingClientRect();
      return { escala:+esc.toFixed(3), cabeza:q('pgCabeza'), version:q('pgVersion'),
               /* negativo = queda hueco; positivo = el rótulo pisa el texto */
               pisaArriba:+(document.getElementById('pgCabeza').getBoundingClientRect().bottom
                            - cuerpo.top).toFixed(1),
               pisaAbajo:+(cuerpo.bottom
                           - document.getElementById('pgVersion').getBoundingClientRect().top).toFixed(1) };
    };
    if (pg.classList.contains('zoom')){
      const r = pg.querySelector('.pg-inner').getBoundingClientRect();
      pg.dispatchEvent(new MouseEvent('click',
        { bubbles:true, clientX:206, clientY:Math.round(r.bottom + 60) }));
      await new Promise(z => setTimeout(z, 1400));
    }
    pg.scrollLeft = 0;
    const cerca = leer();
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1400));
    const lejos = leer();
    return { cerca, lejos };
  }).then(r => {
    const { cerca, lejos } = r;
    vale('de lejos la hoja se encoge', lejos.escala < .8, lejos.escala);
    /* la caja, al píxel: es de donde sale el relleno del texto */
    vale('la caja del de arriba no crece', lejos.cabeza.caja <= cerca.cabeza.caja * lejos.escala + .5,
         lejos.cabeza.caja + ' px');
    vale('la caja del de abajo no crece', lejos.version.caja <= cerca.version.caja * lejos.escala + .5,
         lejos.version.caja + ' px');
    vale('ninguno pisa el texto', lejos.pisaArriba < 0 && lejos.pisaAbajo < 0,
         lejos.pisaArriba + ' / ' + lejos.pisaAbajo);
    vale('y más grandes de lo que quedarían solos',
         lejos.cabeza.efectivo > cerca.cabeza.efectivo * lejos.escala + 1,
         lejos.cabeza.efectivo + ' px contra los ' +
         (cerca.cabeza.efectivo * lejos.escala).toFixed(1) + ' de antes');
    /* y que de verdad se lean, en las DOS vistas */
    vale('con contraste de sobra de lejos',
         lejos.cabeza.contraste >= 4.5 && lejos.version.contraste >= 4.5,
         lejos.cabeza.contraste + ' / ' + lejos.version.contraste);
    vale('y de cerca también',
         cerca.cabeza.contraste >= 4.5 && cerca.version.contraste >= 4.5,
         cerca.cabeza.contraste + ' / ' + cerca.version.contraste);
    /* EL ZOOM NO ENTINTA. Si alguien devuelve el color a la regla de .zoom,
       estas dos se caen: es justo lo que se quitó. */
    vale('el zoom no cambia la tinta',
         lejos.cabeza.tinta === cerca.cabeza.tinta &&
         lejos.version.tinta === cerca.version.tinta,
         cerca.cabeza.tinta + ' -> ' + lejos.cabeza.tinta);
    vale('ni el grosor', lejos.cabeza.peso === cerca.cabeza.peso &&
                         lejos.version.peso === cerca.version.peso,
         cerca.cabeza.peso + ' -> ' + lejos.cabeza.peso);
    return r;
  }));
  /* se sale para la sección siguiente */
  await p.evaluate(async () => {
    const pg = document.getElementById('pg');
    if (pg.classList.contains('zoom')){
      const r = pg.querySelector('.pg-inner').getBoundingClientRect();
      pg.dispatchEvent(new MouseEvent('click',
        { bubbles:true, clientX:206, clientY:Math.round(r.bottom + 60) }));
      await new Promise(z => setTimeout(z, 1400));
    }
    pg.scrollLeft = 0;
  });

  titulo('el botón dice si el paso automático va solo');
  /* Las dos maneras de pasar hoja se ven igual —hojas que pasan—, así que sin
     una señal no hay forma de saber si aquello sigue andando por su cuenta.
     Se comprueba el color de verdad, no la clase: una clase puesta que ningún
     estilo pintara dejaría esto en verde sin que se viera nada. */
  const MARRON = 'rgb(184, 137, 43)';   /* #b8892b: la pestaña abierta, el libro actual */
  /* SE COMPARA COMO COLOR, NO COMO CADENA. getComputedStyle devuelve unas
     veces 'rgb(184, 137, 43)' y otras 'rgba(184, 137, 43, 1)' para el MISMO
     color: es el mismo píxel escrito de dos maneras, y de cuál te toca decide
     el navegador. Comparando cadenas eso da dos fallos distintos, y el
     peligroso es el de arriba —'ninguno encendido' usa !==, así que con el
     formato largo canta VERDE diciendo que está apagado cuando está pintado—.
     Un falso verde no se descubre nunca. Se sacan los tres números y se
     comparan ésos. */
  const mismoColor = (a, b) => {
    const n = c => (String(c).match(/[\d.]+/g) || []).slice(0, 3).join(',');
    return n(a) === n(b);
  };
  di('el automático', await p.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1200));
    const b = [...document.querySelectorAll('#zoomPasos [data-paso]')];
    const color = i => getComputedStyle(b[i]).backgroundColor;
    const enReposo = [color(0), color(1)];
    /* CORRER EL BOTÓN A SU LADO es todo el gesto: no hay que subirlo antes.
       Se da como lo daría un dedo —down en el centro, dos move y up—, y el
       primer move se queda corto a propósito: seis píxeles es el temblor de un
       toque, así que el botón no se mueve ni arranca nada. Ahí está la
       frontera con el toque, que sigue significando otra cosa.
       `alto` sirve para probar lo que NO arranca: un dedo que solo sube. */
    /* SOSTENIENDO EL DEDO, Y ESTO ES LO QUE CAMBIÓ.

       Antes el empujón terminaba con su pointerup y se miraba el color
       después: valía porque el automático seguía andando tras soltar. Ahora
       soltar APAGA, así que mirar después de soltar diría siempre «apagado» y
       la comprobación pasaría en verde sin haber probado nada —el peor de los
       falsos verdes—. Se sostiene el dedo, se mira, y se suelta aparte. */
    let pendiente = null;
    const empujar = (b, ancho, alto, sostener) => {
      const r = b.getBoundingClientRect();
      const x = r.left + r.width/2, y = r.top + r.height/2;
      const ev = (t, cx, cy) => b.dispatchEvent(new PointerEvent(t,
        { bubbles:true, cancelable:true, pointerId:9, pointerType:'touch',
          clientX:cx, clientY:cy }));
      ev('pointerdown', x, y);
      ev('pointermove', x + Math.min(6, ancho), y);
      const aMedias = b.style.transform;
      ev('pointermove', x + ancho, y - (alto || 0));
      const fin = () => ev('pointerup', x + ancho, y - (alto || 0));
      if (sostener) pendiente = fin; else fin();
      return aMedias;
    };
    const soltar = () => { if (pendiente){ pendiente(); pendiente = null; } };
    /* UN TOQUE DE VERDAD EMPIEZA POR UN pointerdown, y aquí importa: al soltar
       el desliz queda puesto un tragador que se come el clic de ese mismo
       gesto —si no, el clic de levantar el dedo apagaría lo que el desliz
       acaba de encender—, y se quita en cuanto empieza otro toque. Un
       MouseEvent('click') a pelo no empieza ningún toque, así que el tragador
       seguía ahí y se comía también el toque de parar. */
    /* Y TERMINA CON pointerup, que un toque de verdad se acaba. Sin él, el
       desliz se queda abierto y bloquea el siguiente —«un solo desliz a la
       vez»—: de aquí en adelante ningún gesto arrancaba nada, y las
       comprobaciones que venían después pasaban en verde sin haber probado
       nada. Lo destapó la tanda del acelerador. */
    const tocar = el => {
      el.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles:true, cancelable:true, pointerId:11, pointerType:'touch' }));
      el.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
      el.dispatchEvent(new PointerEvent('pointerup',
        { bubbles:true, cancelable:true, pointerId:11, pointerType:'touch' }));
    };
    const aMedias = empujar(b[1], 30, 0, true);
    await new Promise(z => setTimeout(z, 400));
    const enMarcha = [color(0), color(1)];       /* con el dedo todavía puesto */
    /* SOLTAR PARA, y con ello se tiene que apagar. Antes esto lo hacía un
       toque aparte y el automático seguía andando hasta que lo dieras. */
    soltar();
    await new Promise(z => setTimeout(z, 700));
    const trasParar = [color(0), color(1)];
    /* LO QUE NO ARRANCA, que es donde vive el riesgo desde que basta con
       correr el botón. Dos casos, y los dos son gestos que ocurren:
       · SUBIR Y NADA MÁS. Lo que cuenta es alejarse del centro hacia el
         propio lado, y un dedo que solo sube se aleja cero.
       · CORRERLO AL LADO CONTRARIO. Para el otro sentido está el otro botón;
         éste no se pone del revés. */
    /* Los dos se miran CON EL DEDO PUESTO, por lo mismo que arriba: soltando
       primero, un gesto que sí hubiera arrancado saldría apagado y esto pasaría
       en verde justo cuando hay algo que contar. */
    empujar(b[1], 0, 60, true);
    await new Promise(z => setTimeout(z, 500));
    const trasSubir = [color(0), color(1)];
    soltar();
    await new Promise(z => setTimeout(z, 300));
    empujar(b[1], -60, 0, true);
    await new Promise(z => setTimeout(z, 500));
    const trasAlReves = [color(0), color(1)];
    soltar();
    await new Promise(z => setTimeout(z, 300));
    /* Si alguno hubiera arrancado —que es el fallo que esto vigila— se apaga
       antes de seguir: la sección de después mide, y no se mide con hojas
       pasando. */
    if (trasAlReves[1] !== trasParar[1]){
      tocar(b[1]);
      await new Promise(z => setTimeout(z, 700));
    }
    /* SE DEVUELVE EL ESTADO COMO SE ENCONTRÓ. La sección siguiente entra al
       zoom con btnZoom, que es un interruptor: dejándolo puesto, aquel clic
       lo APAGABA y la medición salía a tamaño natural sin que nada estuviera
       roto. Salir por el hueco, que es la puerta. */
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left + r.width/2),
        clientY:Math.round(r.bottom + 60) }));
    await new Promise(z => setTimeout(z, 800));
    /* EL RÓTULO CUENTA EL GESTO QUE EXISTE. Es la única puerta que tiene
       quien no ve la pantalla: aquí no hay nada más que anuncie que existe un
       paso automático. Decía «empuja hacia arriba», que era el desliz de
       antes, y con el cálculo de ahora un dedo que sólo sube se aleja cero del
       centro y no arranca nada: describía un gesto imposible. Lo levantó
       Codex, y por eso se comprueba en los DOS botones y en los dos atributos
       —title para el ratón, aria-label para quien escucha—. */
    const rotulos = b.map(x => ({
      titulo: x.getAttribute('title') || '',
      rotulo: x.getAttribute('aria-label') || ''
    }));
    return { enReposo, aMedias, enMarcha, trasParar, trasSubir, trasAlReves, rotulos,
             seQuedaFuera: !document.getElementById('pg').classList.contains('zoom') };
  }).then(r => {
    vale('en reposo, ninguno encendido',
         mismoColor(r.enReposo[0], r.enReposo[1]) && !mismoColor(r.enReposo[1], MARRON),
         r.enReposo[1]);
    vale('con el dedo puesto, se pinta el suyo', mismoColor(r.enMarcha[1], MARRON), r.enMarcha[1]);
    /* Los otros dos comparan un color leído EN REPOSO contra uno leído con una
       animación en marcha, que es justo cuando cambia el formato. Misma
       trampa, mismo remedio. */
    vale('y solo el suyo', mismoColor(r.enMarcha[0], r.enReposo[0]), r.enMarcha[0]);
    /* AL SOLTAR SE APAGA. Antes hacía falta un toque aparte para pararlo, y
       soltar dejaba las hojas corriendo solas. */
    vale('AL SOLTAR SE APAGA', mismoColor(r.trasParar[1], r.enReposo[1]), r.trasParar[1]);
    /* Seis píxeles es temblor de dedo, no gesto: ni mueve el botón ni arranca.
       Es la frontera con el toque, que significa otra cosa. */
    vale('a seis píxeles el botón no se ha movido', !/translate/.test(r.aMedias || ''),
         r.aMedias || '(nada)');
    vale('y a seis píxeles no arranca', !mismoColor(r.enReposo[1], MARRON), r.enReposo[1]);
    vale('subir y nada más no arranca',
         !mismoColor(r.trasSubir[1], MARRON), r.trasSubir[1]);
    vale('correrlo al lado contrario tampoco',
         !mismoColor(r.trasAlReves[1], MARRON), r.trasAlReves[1]);
    /* Ni rastro del gesto que ya no existe, y sí el que existe: cada botón
       nombra SU lado, que es hacia donde acelera. */
    vale('ningún rótulo manda empujar hacia arriba',
         r.rotulos.every(x => !/arriba/i.test(x.titulo + ' ' + x.rotulo)),
         JSON.stringify(r.rotulos));
    vale('el de retroceder dice izquierda',
         /izquierda/i.test(r.rotulos[0].titulo) && /izquierda/i.test(r.rotulos[0].rotulo),
         r.rotulos[0].rotulo);
    vale('el de avanzar dice derecha',
         /derecha/i.test(r.rotulos[1].titulo) && /derecha/i.test(r.rotulos[1].rotulo),
         r.rotulos[1].rotulo);
    vale('y los dos cuentan que arrastrar más lejos va más deprisa',
         /* Con la tilde contemplada: «Arrástralo» no casa con /arrastr/i, y
            una prueba que falla por su propia expresión no prueba nada. */
         r.rotulos.every(x => /arr[aá]str/i.test(x.rotulo) && /deprisa/i.test(x.rotulo)),
         r.rotulos[1].rotulo);
    vale('y la sección deja el zoom cerrado', r.seQuedaFuera);
    return r;
  }));
  await p.waitForTimeout(400);

  /* ================================================================
     EL ACELERADOR: correr el botón a un lado corre las hojas.

     Existe para buscar una hoja de lejos, que con el paso normal era quedarse
     mirando un minuto largo. Y aquí hay una trampa que conviene tener escrita:
     el ritmo NO lo pone un reloj, lo pone el pliegue —cada hoja espera a que
     la anterior termine de girar—, así que acortar la espera sola no haría
     nada. Lo que acelera es acortar el pliegue: de 620-780 ms a 120.

     Y AQUÍ SE VIGILAN DOS COSAS A LA VEZ, porque la segunda es la que se puede
     perder sin que nadie lo note. Hubo un tramo rápido que no plegaba —se
     repintaba la hoja y a por la siguiente—: era cuatro veces más rápido y se
     quitó, porque lo que se veía era el texto dando saltos y una hoja que
     aparece sin haber girado no se lee como una hoja que pasa. Medido en su
     día: 36 hojas y UN solo pliegue. Así que no basta con contar hojas; hay
     que contar también cuántas se ven girar, o la vuelta de aquel atajo
     pasaría en verde.

     Se cuentan las dos con el DOM: cada repintado rehace #pgBody, y el lienzo
     del pliegue (#fx) se enciende una vez por hoja plegada. Se piden dos
     ventanas del mismo tiempo —la corrida mínima y el tope— y se exige que la
     segunda saque MUCHO más. El margen es de 2x y lo medido son 3.7x: un
     umbral pegado a la medida canta fallos en cuanto la máquina va cargada.

     Ojo con la base: ya no es «sin correr el botón», porque sin correrlo no
     arranca nada. Es la corrida MÍNIMA, apenas pasado el umbral. */
  titulo('el acelerador corre las hojas de verdad');
  di('hojas en la misma ventana', await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    /* El bloque de arriba se fue dejando el zoom cerrado, que es lo correcto.
       Aquí se vuelve a entrar, y el último de esta pareja lo cierra otra vez. */
    document.getElementById('btnZoom').click();
    await pausa(1200);
    const b = [...document.querySelectorAll('#zoomPasos [data-paso]')][1];
    const r = b.getBoundingClientRect();
    const x = r.left + r.width/2, y = r.top + r.height/2;
    const ev = (t, ax, ay) => b.dispatchEvent(new PointerEvent(t,
      { bubbles:true, cancelable:true, pointerId:9, pointerType:'touch',
        clientX:ax, clientY:ay }));
    /* Cada renderPage rehace el cuerpo de la hoja: contamos esos. Y el lienzo
       del pliegue, que se enciende una vez por hoja que se ve girar. */
    const contar = async (corrida, ms) => {
      let n = 0, pliegues = 0, visto = false, vivo = true;
      const obs = new MutationObserver(() => n++);
      obs.observe(document.getElementById('pgBody'), { childList:true });
      const fx = document.getElementById('fx');
      (function mirar(){
        const ahora = getComputedStyle(fx).display === 'block';
        if (ahora && !visto) pliegues++;
        visto = ahora;
        if (vivo) requestAnimationFrame(mirar);
      })();
      ev('pointerdown', x, y);
      ev('pointermove', x + 14, y);            /* pasado el umbral: arranca */
      if (corrida > 14) ev('pointermove', x + corrida, y);
      await pausa(ms);
      ev('pointerup', x + corrida, y);
      obs.disconnect(); vivo = false;
      await pausa(500);
      /* Y se para, que la ventana siguiente empieza limpia. */
      b.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles:true, cancelable:true, pointerId:11, pointerType:'touch' }));
      b.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
      b.dispatchEvent(new PointerEvent('pointerup',
        { bubbles:true, cancelable:true, pointerId:11, pointerType:'touch' }));
      await pausa(700);
      return { n, pliegues };
    };
    const normal = await contar(14, 2500);
    const alTope = await contar(200, 2500);
    return { normal, alTope };
  }).then(r => {
    vale('con la corrida mínima, pasan hojas', r.normal.n > 0, r.normal.n + ' hojas');
    /* Con la normal en cero esto pasaba solo: 0 >= 0. Se exige que la normal
       haya pasado hojas, o la comparación no dice nada. */
    vale('al tope pasan MUCHAS más', r.normal.n > 0 && r.alTope.n >= r.normal.n * 2,
         r.normal.n + ' → ' + r.alTope.n + ' hojas en la misma ventana');
    /* LA OTRA MITAD, y la que se puede perder en silencio: todas se ven girar.
       Se admite una de holgura por los bordes de la ventana —un pliegue puede
       arrancar antes de empezar a contar, o quedarse a medias al acabar—. */
    vale('Y AL TOPE TODAS SE VEN GIRAR',
         r.alTope.pliegues >= r.alTope.n - 1,
         r.alTope.pliegues + ' pliegues / ' + r.alTope.n + ' hojas');
    vale('con la corrida mínima también', r.normal.pliegues >= r.normal.n - 1,
         r.normal.pliegues + ' pliegues / ' + r.normal.n + ' hojas');
    return r;
  }));

  /* La otra mitad del acelerador: es de RESORTE ENTERO. Al soltar, el botón
     vuelve al centro, la velocidad vuelve a la normal Y EL AUTOMÁTICO SE
     APAGA. Hubo una versión intermedia en la que el motor seguía andando tras
     soltar —«lo que se soltó fue el acelerador, no el motor»— y no se
     sostuvo: soltar un mando es decir «ya», y dejar las hojas corriendo
     obligaba a un segundo gesto para deshacer algo que nadie pidió. */
  di('al soltar el acelerador', await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const b = [...document.querySelectorAll('#zoomPasos [data-paso]')][1];
    const r = b.getBoundingClientRect();
    const x = r.left + r.width/2, y = r.top + r.height/2;
    const ev = (t, ax, ay) => b.dispatchEvent(new PointerEvent(t,
      { bubbles:true, cancelable:true, pointerId:9, pointerType:'touch',
        clientX:ax, clientY:ay }));
    ev('pointerdown', x, y);
    ev('pointermove', x + 14, y);
    /* El dedo se va hasta el borde de la pantalla: todo lo que se puede pedir. */
    ev('pointermove', window.innerWidth - 1, y);
    const corrido = b.style.transform;
    /* Y EL BOTÓN NO SE PUEDE SALIR DE LA ESCENA, que lleva overflow:hidden. Con
       un recorrido fijo se salía 39 px en una pantalla de 320, o sea que a la
       máxima velocidad que se podía poner el botón se veía cortado. */
    const rb = b.getBoundingClientRect();
    const st = document.querySelector('.stage').getBoundingClientRect();
    const seSale = Math.round(Math.max(rb.right - st.right, st.left - rb.left));
    /* CON EL DEDO PUESTO, para tener contra qué comparar el después: sin esta
       lectura, «apagado tras soltar» no distingue el arreglo de un gesto que
       no arrancó nunca. */
    await pausa(300);
    const conElDedo = getComputedStyle(b).backgroundColor;
    /* Y LAS HOJAS SE QUEDAN DONDE ESTABAN. Se cuentan los REPINTADOS de
       #pgBody —uno por hoja, que es como los cuenta la sección del acelerador
       ahí arriba— y no la distancia entre las referencias que dice el rótulo.

       Esto último se probó primero y estaba mal de las dos maneras posibles,
       y lo levantó Codex: restando «capítulo por mil más versículo», la única
       hoja que sí puede terminar de girar tras soltar CANTA FALLO si cruza de
       capítulo —el número salta mil de golpe— y varias hojas seguidas dentro
       del mismo capítulo PASAN, porque entre todas no suman los versículos del
       umbral. Un número que no es el que se quiere medir falla en los dos
       sentidos; los repintados sí son hojas.

       El contador se arma ANTES de soltar, para no perderse el primero. */
    let repintados = 0;
    const obs = new MutationObserver(() => repintados++);
    obs.observe(document.getElementById('pgBody'), { childList:true });
    ev('pointerup', window.innerWidth - 1, y);
    await pausa(400);
    const trasSoltar = b.style.transform;
    const sigue = getComputedStyle(b).backgroundColor;
    await pausa(1800);
    obs.disconnect();
    /* EL CANDADO: soltar el dedo FUERA del botón no puede dejar el mando
       muerto. Estos botones se apagan solos al acabarse el libro, y un botón
       deshabilitado no reparte eventos de puntero: quien deja el dedo puesto
       mientras el automático llega al final se encontraba el pointerup sin
       destino, el desliz sin cerrar, y a partir de ahí NINGUNO de los dos
       volvía a armar nada. Aquí se baja el dedo en el botón y se levanta en la
       esquina de la pantalla; después se pide otro arranque, que es lo que
       antes ya no llegaba. */
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true,
      pointerId:9, pointerType:'touch', clientX:x, clientY:y }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, cancelable:true,
      pointerId:9, pointerType:'touch', clientX:5, clientY:5 }));
    await pausa(200);
    ev('pointerdown', x, y); ev('pointermove', x + 14, y); ev('pointermove', x + 40, y);
    await pausa(400);
    const trasSoltarFuera = getComputedStyle(b).backgroundColor;
    ev('pointerup', x + 40, y);
    await pausa(200);
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true,
      pointerId:11, pointerType:'touch' }));
    b.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, cancelable:true,
      pointerId:11, pointerType:'touch' }));
    await pausa(700);
    /* Y se devuelve el estado como se encontró: la sección siguiente entra al
       zoom con btnZoom, que es un interruptor. Salir por el hueco. */
    const rp = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(rp.left + rp.width/2),
        clientY:Math.round(rp.bottom + 60) }));
    await pausa(800);
    return { corrido, trasSoltar, conElDedo, sigue, seSale, trasSoltarFuera,
             repintados };
  }).then(r => {
    vale('el botón se corre con el dedo', /translateX\(\d/.test(r.corrido || ''),
         r.corrido || '(nada)');
    vale('  y no se sale de la escena', r.seSale <= 0, r.seSale + 'px');
    vale('  y al soltar vuelve al centro', !r.trasSoltar, r.trasSoltar || '(sin transform)');
    vale('  con el dedo puesto el motor va', mismoColor(r.conElDedo, MARRON), r.conElDedo);
    vale('  Y AL SOLTAR SE APAGA', !mismoColor(r.sigue, MARRON), r.sigue);
    /* UNA HOJA COMO MUCHO: la que estuviera plegándose termina su giro. Más
       serían las hojas siguiendo solas, que es lo que este cambio vino a
       quitar. Medido en tres tandas y a las dos velocidades —corrida mínima y
       al tope—: siempre 0 ó 1, nunca 2. Con el fallo puesto, en los 2.2 s que
       se miran aquí caben diez o veinte. */
    vale('  y las hojas dejan de pasar: UNA COMO MUCHO',
         r.repintados <= 1, r.repintados + ' hojas tras soltar');
    vale('soltar el dedo fuera no deja el mando muerto',
         mismoColor(r.trasSoltarFuera, MARRON), r.trasSoltarFuera);
    return r;
  }));

  titulo('un botón encendido no parece apagado');
  /* Estaban al 62% de opacidad por discreción, y la discreción se leyó como
     avería: al lado de uno deshabilitado de verdad, un botón a medio encender
     parece otro deshabilitado, solo que menos. Y aquí importa más que en
     ningún otro sitio, porque estos dos SE APAGAN cuando se acaba el libro: si
     el apagado no se distingue del encendido, la única señal que dan deja de
     decir nada. Se mide la luz de los dos y se pide que se separen. */
  di('la luz de los pasos', await p.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1200));
    const b = [...document.querySelectorAll('#zoomPasos [data-paso]')];
    const luz = b.map(x => ({ off: x.disabled, op: +getComputedStyle(x).opacity }));
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left + r.width/2),
        clientY:Math.round(r.bottom + 60) }));
    await new Promise(z => setTimeout(z, 800));
    return luz;
  }).then(luz => {
    const vivos = luz.filter(x => !x.off), muertos = luz.filter(x => x.off);
    vale('hay al menos uno encendido', vivos.length > 0, JSON.stringify(luz));
    vale('y va a plena luz', vivos.every(x => x.op === 1), JSON.stringify(vivos));
    /* Si en esta hoja no hay ninguno apagado no se prueba de más: la sección
       dice lo que puede decir con lo que hay delante. */
    if (muertos.length) vale('el apagado se separa de sobra',
      muertos.every(x => x.op <= 0.35), JSON.stringify(muertos));
    return luz;
  }));
  await p.waitForTimeout(400);

  titulo('medir a media salida no contamina');
  /* cerrarZoom apaga zoomActivo en su primer renglón, pero la transición sigue
     460 ms: en esa ventana .pg-inner está a escala intermedia. Si sinZoom no
     cancela el suavizado antes de mirar zoomActivo, lo que se mida sale
     encogido —medido en su día: 255 px donde van 412—. */
  const m = await p.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1200));
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    /* por el hueco de debajo, que es por donde se sale */
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left+r.width/2), clientY:Math.round(r.bottom+60) }));
    await new Promise(z => setTimeout(z, 40));
    const antes = { suavizando: document.getElementById('pg').classList.contains('suavizando'),
                    ancho: Math.round(document.getElementById('pgBody').getBoundingClientRect().width) };
    /* pasar hoja mide la hoja: fotoDeHoja va envuelto en sinZoom */
    const e2 = document.getElementById('edgeR'), er = e2.getBoundingClientRect();
    const op = { bubbles:true, pointerId:9, pointerType:'touch', isPrimary:true,
                 clientX:er.left + er.width/2, clientY:450 };
    e2.dispatchEvent(new PointerEvent('pointerdown', op));
    await new Promise(z => setTimeout(z, 70));
    e2.dispatchEvent(new PointerEvent('pointerup', op));
    await new Promise(z => setTimeout(z, 300));
    const despues = { suavizando: document.getElementById('pg').classList.contains('suavizando'),
                      ancho: Math.round(document.getElementById('pgBody').getBoundingClientRect().width) };
    await new Promise(z => setTimeout(z, 2500));
    return { antes, despues };
  });
  di('antes de medir', m.antes);
  di('después de medir', m.despues);
  vale('la medición cancela el suavizado', m.antes.suavizando && !m.despues.suavizando);
  vale('y mide a tamaño natural', m.despues.ancho >= 408, m.antes.ancho + ' → ' + m.despues.ancho);

  await cerrar(sesion);
})();
