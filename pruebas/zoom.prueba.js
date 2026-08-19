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
const { abrir, cerrar, di, vale, titulo, ESCRITORIO } = require('./comun');

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

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

  titulo('la salida es el hueco, y el libro se queda para leerlo');
  /* ESTUVO AL REVÉS UNA TEMPORADA, Y POR ESO AQUÍ SE MIRAN LAS DOS MITADES.
     Que el hueco cierre es la fácil. La que costó el cambio es que el libro NO
     cierre: de lejos se sigue pasando hoja por los filos y tocando las glosas
     del margen —es para lo que uno se aleja—, y con el libro haciendo de botón
     de salida cada uno de esos toques era una apuesta: fallarle al filo por
     dos píxeles no costaba el toque, costaba la vista.
     Una prueba que solo comprobara la salida dejaría volver el problema
     entero sin decir nada. */
  di('tocando el libro', await p.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1200));
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left+r.width/2), clientY:Math.round(r.top+r.height/2) }));
    await new Promise(z => setTimeout(z, 700));
    return { sigueEnZoom: document.getElementById('pg').classList.contains('zoom') };
  }).then(r => { vale('tocar el libro NO cierra', r.sigueEnZoom); return r; }));

  /* Y que de verdad sirva para algo: el filo, recolocado al canto de la hoja
     chica, tiene que seguir pasando hoja sin salirse del zoom. Se espera de
     sobra porque el toque en el filo no mide al soltarlo: aguarda su plazo de
     doble clic y solo entonces pasa. */
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
  vale('tocar el hueco sí cierra', await p.evaluate(async () => {
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:206, clientY:Math.round(r.bottom + 60) }));
    await new Promise(z => setTimeout(z, 900));
    return !document.getElementById('pg').classList.contains('zoom');
  }));

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
