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
   · Y salir se hace tocando EL LIBRO, no el hueco. De lejos hay mucho
     escritorio y poco papel, así que salirse por fallarle al libro era
     demasiado fácil. */
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
      const r = pg.querySelector('.pg-inner').getBoundingClientRect();
      pg.dispatchEvent(new MouseEvent('click', { bubbles:true,
        clientX:Math.round(r.left + r.width/2), clientY:Math.round(r.top + r.height/2) }));
    }
    await new Promise(q => setTimeout(q, 700));
    clearInterval(reloj);
    return { muestras: visto.length,
             desbordeMaximo: Math.max(...visto.map(v => v.desborde)),
             razones: visto.map(v => +(v.texto / v.papel).toFixed(3)) };
  }, sentido);

  titulo('entrando');
  const e = await viaje('entrar');
  di('muestreado', { muestras:e.muestras, desbordeMaximo:e.desbordeMaximo,
                     razonMin:Math.min(...e.razones), razonMax:Math.max(...e.razones) });
  vale('la letra no sale de su hoja', e.desbordeMaximo === 0, e.desbordeMaximo + ' px');
  vale('texto y papel van atados', Math.min(...e.razones) === 1 && Math.max(...e.razones) === 1);

  await p.waitForTimeout(500);
  titulo('saliendo');
  const s = await viaje('salir');
  di('muestreado', { muestras:s.muestras, desbordeMaximo:s.desbordeMaximo,
                     razonMin:Math.min(...s.razones), razonMax:Math.max(...s.razones) });
  vale('la letra no sale de su hoja', s.desbordeMaximo === 0, s.desbordeMaximo + ' px');
  vale('es el mismo viaje al revés', e.desbordeMaximo === s.desbordeMaximo);

  titulo('la salida es el libro, no el hueco');
  di('el hueco', await p.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1200));
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:206, clientY:Math.round(r.bottom + 60) }));
    await new Promise(z => setTimeout(z, 700));
    return { sigueEnZoom: document.getElementById('pg').classList.contains('zoom') };
  }).then(r => { vale('tocar el hueco NO cierra', r.sigueEnZoom); return r; }));
  di('los cursores', await p.evaluate(() => ({
    hueco: getComputedStyle(document.getElementById('pg')).cursor,
    papel: getComputedStyle(document.querySelector('#pg .pg-inner')).cursor })));
  vale('tocar el libro sí cierra', await p.evaluate(async () => {
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left+r.width/2), clientY:Math.round(r.top+r.height/2) }));
    await new Promise(z => setTimeout(z, 900));
    return !document.getElementById('pg').classList.contains('zoom');
  }));

  titulo('medir a media salida no contamina');
  /* cerrarZoom apaga zoomActivo en su primer renglón, pero la transición sigue
     460 ms: en esa ventana .pg-inner está a escala intermedia. Si sinZoom no
     cancela el suavizado antes de mirar zoomActivo, lo que se mida sale
     encogido —medido en su día: 255 px donde van 412—. */
  const m = await p.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1200));
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left+r.width/2), clientY:Math.round(r.top+r.height/2) }));
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
