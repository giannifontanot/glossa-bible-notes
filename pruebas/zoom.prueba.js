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

  titulo('entrando');
  const e = await viaje('entrar');
  di('muestreado', { muestras:e.muestras, desbordeMaximo:e.desbordeMaximo,
                     razonMin:Math.min(...e.razones), razonMax:Math.max(...e.razones) });
  vale('la letra no sale de su hoja', e.desbordeMaximo === 0, e.desbordeMaximo + ' px');
  vale('texto y papel van atados', Math.min(...e.razones) === 1 && Math.max(...e.razones) === 1);
  vale('y entró de verdad', e.enZoom);

  await p.waitForTimeout(500);
  titulo('saliendo');
  const s = await viaje('salir');
  di('muestreado', { muestras:s.muestras, desbordeMaximo:s.desbordeMaximo,
                     razonMin:Math.min(...s.razones), razonMax:Math.max(...s.razones) });
  vale('la letra no sale de su hoja', s.desbordeMaximo === 0, s.desbordeMaximo + ' px');
  vale('es el mismo viaje al revés', e.desbordeMaximo === s.desbordeMaximo);
  vale('y salió de verdad', !s.enZoom);

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
     de lejos sobre los cantos de la hoja —24 px a cada lado, y el derecho cae
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
    const bot = [...menu.querySelectorAll('button')].find(x => /Resaltar/.test(x.textContent));
    if (bot) bot.click();
    await new Promise(z => setTimeout(z, 1000));
    return { salioElMenu:salio, antes, despues:cuantas(),
             sigueLejos: document.getElementById('pg').classList.contains('zoom') };
  }).then(r => {
    vale('sale el menú de lejos', !!r.salioElMenu);
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
  di('el automático', await p.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1200));
    const b = [...document.querySelectorAll('#zoomPasos [data-paso]')];
    const color = i => getComputedStyle(b[i]).backgroundColor;
    const enReposo = [color(0), color(1)];
    b[1].dispatchEvent(new MouseEvent('dblclick', { bubbles:true }));
    await new Promise(z => setTimeout(z, 300));
    const enMarcha = [color(0), color(1)];
    /* un toque para, y con él se tiene que apagar */
    b[1].dispatchEvent(new MouseEvent('click', { bubbles:true }));
    await new Promise(z => setTimeout(z, 700));
    /* SE DEVUELVE EL ESTADO COMO SE ENCONTRÓ. La sección siguiente entra al
       zoom con btnZoom, que es un interruptor: dejándolo puesto, aquel clic
       lo APAGABA y la medición salía a tamaño natural sin que nada estuviera
       roto. Salir por el hueco, que es la puerta. */
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left + r.width/2),
        clientY:Math.round(r.bottom + 60) }));
    await new Promise(z => setTimeout(z, 800));
    return { enReposo, enMarcha, trasParar: [color(0), color(1)],
             seQuedaFuera: !document.getElementById('pg').classList.contains('zoom') };
  }).then(r => {
    vale('en reposo, ninguno encendido',
         r.enReposo[0] === r.enReposo[1] && r.enReposo[1] !== MARRON, r.enReposo[1]);
    vale('con el automático, se pinta el suyo', r.enMarcha[1] === MARRON, r.enMarcha[1]);
    vale('y solo el suyo', r.enMarcha[0] === r.enReposo[0], r.enMarcha[0]);
    vale('al parar se apaga', r.trasParar[1] === r.enReposo[1], r.trasParar[1]);
    vale('y la sección deja el zoom cerrado', r.seQuedaFuera);
    return r;
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
