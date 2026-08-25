/* EL SEPARADOR DE LECTURA: LA CINTA QUE SE DEJA PARA VOLVER.

   Lo que esta prueba vigila de verdad son dos cosas que no se ven mirando la
   pantalla un segundo:

   1. QUE HOJEAR NO SEA LEER. La cinta se ofrece sola, y una oferta que salta
      porque pasaste cuatro hojas de corrido es peor que no ofrecer nada:
      enseña a decir que no sin leer la pregunta. Así que aquí se pasan hojas
      deprisa y se comprueba que NO pregunta, y luego se leen dos de verdad
      —quedándose el rato que hace falta— y se comprueba que SÍ.
      Por eso esta prueba tarda: los segundos son el asunto.
   2. QUE LO GUARDADO SOBREVIVA. Una cinta que se pierde al recargar no es una
      cinta. Se recarga y se vuelve a mirar.

   Y una regla de la casa que aquí importa doble: NADA DE .click() PARA GESTOS.
   La cinta vive dentro del papel, que es lo que se arrastra con el dedo, así
   que se toca como se toca el papel —PointerEvent con su pointerId— para que
   pase por los mismos caminos que un dedo de verdad.

   El reloj no se falsea. Se podría —el navegador deja— y sería mucho más
   rápido; pero el número que se está probando es justo cuánto hay que
   quedarse, y una prueba que cambia el reloj no prueba ese número: prueba que
   el temporizador se llama. */
const { abrir, cerrar, cerrarParcial, di, vale, titulo,
        ESCRITORIO } = require('./comun');

const LLAVE = 'glossa:separadores:v1';

/* El andamio: tocar de verdad, saber en qué hoja estamos y leer lo guardado. */
async function andamio(p){
  await p.evaluate(() => {
    window.__pid = 300;
    window.__pausa = ms => new Promise(z => setTimeout(z, ms));
    window.__hoja = () => (window.__estado || '').split('·')[0].trim();
    window.__toque = async (sel) => {
      const e = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!e) return false;
      const r = e.getBoundingClientRect();
      const op = { bubbles:true, pointerId: ++window.__pid, pointerType:'touch',
                   isPrimary:true, clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
      e.dispatchEvent(new PointerEvent('pointerdown', op));
      await window.__pausa(40);
      e.dispatchEvent(new PointerEvent('pointerup', op));
      e.dispatchEvent(new MouseEvent('click', op));
      return true;
    };
    /* Pasar hoja por el filo, que es como se pasa de verdad. */
    window.__pasar = async (lado) => {
      const e = document.getElementById(lado === 'left' ? 'edgeL' : 'edgeR');
      const r = e.getBoundingClientRect();
      const op = { bubbles:true, pointerId: ++window.__pid, pointerType:'touch',
                   isPrimary:true, clientX: r.left + r.width/2, clientY: 420 };
      e.dispatchEvent(new PointerEvent('pointerdown', op));
      await window.__pausa(60);
      e.dispatchEvent(new PointerEvent('pointerup', op));
      await window.__pausa(1700);
    };
    window.__guardadas = () => {
      try { return JSON.parse(localStorage.getItem('glossa:separadores:v1') || '[]'); }
      catch(e){ return 'ilegible'; }
    };
    window.__cinta = () => {
      const c = document.querySelector('.separador');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      const anfitrion = document.getElementById('sepPercha').parentElement;
      const m = anfitrion.getBoundingClientRect();
      return { id: c.dataset.sep, color: c.style.getPropertyValue('--tela').trim(),
               w: Math.round(r.width), h: Math.round(r.height),
               altoColumna: Math.round(m.height),
               dentro: r.left >= m.left - 1 && r.right <= m.right + 1 &&
                       r.top >= m.top - 1 && r.bottom <= m.bottom + 1,
               corta: r.height <= m.height * 0.25,
               enPantalla: r.left >= -1 && r.right <= window.innerWidth + 1 };
    };
    window.__desborde = () =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth;
    /* Con el cajón abierto se ve la columna de glosas: en teléfono la hoja es
       más ancha que la ventana y la cinta vive allá. */
    window.__abrirCajon = async () => {
      const pg = document.getElementById('pg');
      pg.scrollLeft = pg.scrollWidth;
      await window.__pausa(250);
    };
    window.__oferta = () => {
      const el = document.getElementById('sepOferta');
      return getComputedStyle(el).display !== 'none' && el.classList.contains('visible');
    };
    window.__menu = () => {
      const el = document.getElementById('sepMenu');
      if (getComputedStyle(el).display === 'none' || !el.classList.contains('visible')) return null;
      const r = el.getBoundingClientRect();
      const st = document.getElementById('stage').getBoundingClientRect();
      return { telas: el.querySelectorAll('[data-sep-color]').length,
               filas: el.querySelectorAll('[data-sep-ir]').length,
               borrar: !!el.querySelector('[data-sep-borrar]'),
               dentro: r.left >= st.left - 1 && r.right <= st.right + 1 &&
                       r.top >= st.top - 1 && r.bottom <= st.bottom + 1 };
    };
  });
}
/* Abrir en una hoja concreta: el programa vuelve a donde te quedaste por
   referencia, y eso se siembra en los ajustes. Igual que en filo.prueba.js. */
async function abrirEn(p, libro, cap, vers){
  await p.evaluate(a => localStorage.setItem('glossa:ajustes:v1', JSON.stringify(a)),
                   { v:1, libro, cap, vers });
  await p.reload();
  await p.waitForTimeout(3200);
  await andamio(p);
}
/* El botón SEPARADOR vive en el panel del rastro, al lado del paso atrás. */
async function ponerAMano(p){
  return p.evaluate(async () => {
    await window.__toque('#btnHistorial');
    await window.__pausa(420);
    const b = document.querySelector('[data-sep-nuevo]');
    const junto = !!(b && b.parentElement.querySelector('.hs-atras') !== undefined);
    if (!b) return { hubo:false };
    await window.__toque(b);
    await window.__pausa(600);
    return { hubo:true, junto, guardadas: window.__guardadas(), cinta: window.__cinta() };
  });
}

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  await abrirEn(p, 'MAT', 1, 1);

  /* ---------------------------------------------------------------- */
  titulo('sin separadores, la columna está limpia');
  vale('no hay cinta al abrir', await p.evaluate(() => !document.querySelector('.separador')));
  vale('ni nada guardado', await p.evaluate(() => window.__guardadas().length === 0));

  /* ---------------------------------------------------------------- */
  titulo('ponerlo a mano, desde el panel del rastro');
  const mano = await p.evaluate(async () => {
    await window.__toque('#btnHistorial');
    await window.__pausa(420);
    const b = document.querySelector('[data-sep-nuevo]');
    /* Va en su propio renglón, pegado al filo derecho y justo debajo del paso
       atrás: el rótulo y ese botón comparten un renglón que no se toca. */
    const panel = document.getElementById('historial');
    const atras = panel.querySelector('.hs-atras') || panel.querySelector('.hs-tit');
    const rb = b ? b.getBoundingClientRect() : null;
    const ra = atras.getBoundingClientRect();
    const rp = panel.getBoundingClientRect();
    const cab = b && b.closest('#historial') &&
                rb.top >= ra.bottom - 1 && Math.abs(rb.right - (rp.right - 6)) < 16;
    const rotulo = b ? b.textContent.trim() : '';
    await window.__toque(b);
    await window.__pausa(700);
    await window.__abrirCajon();
    return { hubo:!!b, rotulo,
             enLaCabecera: !!cab,
             guardadas: window.__guardadas(), cinta: window.__cinta(),
             desborde: window.__desborde(), hoja: window.__hoja() };
  });
  di('la cinta', mano.cinta);
  vale('el botón está en el panel, bajo el paso atrás',
       mano.hubo && mano.enLaCabecera, mano.rotulo);
  vale('pone un separador', mano.guardadas.length === 1, mano.guardadas);
  vale('y sale la cinta', !!mano.cinta);
  vale('cuelga dentro de la columna', mano.cinta && mano.cinta.dentro);
  vale('es corta', mano.cinta && mano.cinta.corta,
       mano.cinta ? mano.cinta.h + ' de ' + mano.cinta.altoColumna + ' px' : '');
  vale('no se sale de la pantalla', mano.cinta && mano.cinta.enPantalla);
  vale('ni empuja la página a lo ancho', !mano.desborde);

  /* ---------------------------------------------------------------- */
  titulo('el menú de la cinta');
  const menu = await p.evaluate(async () => {
    await window.__toque('.separador');
    await window.__pausa(450);
    const abierto = window.__menu();
    /* El color se cambia y tiene que verse en el acto. */
    const antes = window.__cinta().color;
    const telas = [...document.querySelectorAll('[data-sep-color]')];
    const otra = telas.find(t => t.getAttribute('aria-pressed') !== 'true');
    const nombre = otra.dataset.sepColor;
    await window.__toque(otra);
    await window.__pausa(350);
    return { abierto, antes, nombre, despues: window.__cinta().color,
             guardado: (window.__guardadas()[0] || {}).color,
             marcado: document.querySelector('[data-sep-color="' + nombre + '"]')
                        .getAttribute('aria-pressed') };
  });
  di('el menú', menu.abierto);
  di('el color', menu.antes + '  →  ' + menu.despues + '  (' + menu.nombre + ')');
  vale('se abre al tocar la cinta', !!menu.abierto);
  vale('entero dentro de la escena', menu.abierto && menu.abierto.dentro);
  vale('trae los colores', menu.abierto && menu.abierto.telas >= 3, menu.abierto && menu.abierto.telas);
  vale('y la lista', menu.abierto && menu.abierto.filas === 1);
  vale('el color cambia en el acto', menu.antes !== menu.despues);
  vale('y queda guardado', menu.guardado === menu.nombre, menu.guardado);
  vale('el color elegido se anuncia', menu.marcado === 'true');

  titulo('Escape lo cierra');
  vale('cerrado', await p.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await window.__pausa(400);
    return !window.__menu();
  }));

  /* ---------------------------------------------------------------- */
  titulo('la lista lleva a la hoja guardada');
  /* La segunda cinta se pone en OTRA lectura —se recarga, que es lo que corta
     una sesión— porque dentro de la misma la cinta activa se viene con el
     lector y el botón abriría la suya en vez de poner otra, que es justo lo
     que tiene que hacer. Aquí hacen falta dos cintas en dos sitios. */
  const partida = await p.evaluate(() => window.__hoja());
  await abrirEn(p, 'MAT', 5, 1);
  const lista = await p.evaluate(async () => {
    const segunda = window.__hoja();
    await window.__toque('#btnHistorial');
    await window.__pausa(420);
    await window.__toque('[data-sep-nuevo]');
    await window.__pausa(700);
    await window.__abrirCajon();
    await window.__toque('.separador');
    await window.__pausa(450);
    const m = window.__menu();
    const filas = [...document.querySelectorAll('[data-sep-ir]')]
      .map(f => f.querySelector('.sp-ref').textContent.trim());
    /* La fila que NO es la de aquí: la de la otra hoja. */
    const otra = [...document.querySelectorAll('[data-sep-ir]')]
      .find(f => !f.classList.contains('aqui'));
    await window.__toque(otra);
    await window.__pausa(3600);
    return { segunda, filas, dos: m ? m.filas : 0,
             guardadas: window.__guardadas().length, llegada: window.__hoja() };
  });
  di('las filas', lista.filas);
  di('el viaje', lista.segunda + '  →  ' + lista.llegada);
  vale('la lista enseña las dos', lista.dos === 2 && lista.guardadas === 2,
       lista.dos + ' filas · ' + lista.guardadas + ' guardadas');
  vale('cada una dice libro y capítulo',
       lista.filas.every(f => /^\D+\s\d+:\d+$/.test(f)), lista.filas);
  vale('tocar una lleva a su hoja', lista.llegada === partida,
       lista.llegada + '  vs  ' + partida);
  vale('y no duplica separadores', lista.guardadas === 2);

  /* ---------------------------------------------------------------- */
  titulo('lo guardado sobrevive a recargar');
  await p.reload();
  await p.waitForTimeout(3200);
  await andamio(p);
  const tras = await p.evaluate(async () => {
    await window.__abrirCajon();
    return { guardadas: window.__guardadas(), cinta: window.__cinta(), hoja: window.__hoja() };
  });
  di('tras recargar', tras.hoja + ' · ' + tras.guardadas.length + ' separadores');
  vale('siguen los dos', tras.guardadas.length === 2);
  vale('con su color', tras.guardadas.every(x => !!x.color), tras.guardadas.map(x => x.color));
  vale('cada uno con su identificador', new Set(tras.guardadas.map(x => x.id)).size === 2);
  vale('y la cinta vuelve a colgar', !!tras.cinta);

  /* ---------------------------------------------------------------- */
  titulo('borrar pide confirmación');
  const borrado = await p.evaluate(async () => {
    await window.__toque('.separador');
    await window.__pausa(450);
    const equis = document.querySelector('[data-sep-x]');
    const visibleAntes = equis && getComputedStyle(equis).display !== 'none';
    await window.__toque(equis);
    await window.__pausa(400);
    const pregunta = document.querySelector('.sp-pregunta');
    const texto = pregunta ? pregunta.textContent.trim() : '';
    const cuantas = window.__guardadas().length;
    /* Cancelar no toca nada. */
    await window.__toque('[data-sep-cancelar]');
    await window.__pausa(400);
    const trasCancelar = { guardadas: window.__guardadas().length, cinta: !!window.__cinta(),
                           pregunta: !!document.querySelector('.sp-pregunta') };
    /* Y ahora sí. */
    await window.__toque('[data-sep-x]');
    await window.__pausa(400);
    await window.__toque('[data-sep-borrar]');
    await window.__pausa(600);
    return { visibleAntes, texto, cuantas, trasCancelar,
             guardadas: window.__guardadas().length,
             cinta: !!window.__cinta(), menu: !!window.__menu() };
  });
  di('la pregunta', borrado.texto);
  vale('la equis sale con el menú', borrado.visibleAntes);
  vale('pregunta antes de borrar', /eliminar este separador/i.test(borrado.texto));
  vale('y no borra mientras pregunta', borrado.cuantas === 2);
  vale('cancelar lo deja todo', borrado.trasCancelar.guardadas === 2 &&
       borrado.trasCancelar.cinta && !borrado.trasCancelar.pregunta, borrado.trasCancelar);
  vale('confirmar lo quita del almacén', borrado.guardadas === 1);
  vale('y de la columna', !borrado.cinta);
  vale('el menú se cierra con él', !borrado.menu);

  /* ---------------------------------------------------------------- */
  titulo('hojear deprisa NO es leer');
  /* Seis hojas seguidas sin pararse en ninguna. Si esto ofreciera cinta, la
     oferta no valdría nada. */
  const deprisa = await p.evaluate(async () => {
    for (let i = 0; i < 6; i++) await window.__pasar('right');
    await window.__pausa(1500);
    return { oferta: window.__oferta(), guardadas: window.__guardadas().length };
  });
  vale('no pregunta nada', !deprisa.oferta);
  vale('ni pone cintas solo', deprisa.guardadas === 1, deprisa.guardadas);

  /* ---------------------------------------------------------------- */
  titulo('un salto no arrastra la cinta activa');
  /* El paso atrás del panel del rastro es un salto de verdad, y aquí salta a
     la PRIMERA hoja de otro libro, que es exactamente lo que hace cruzar
     leyendo. Mirando solo números de hoja, las dos cosas son la misma y la
     cinta se mudaba sola a un sitio al que nadie llegó leyendo. */
  await p.evaluate(() => localStorage.setItem('glossa:historial:v1', JSON.stringify([
    { libro:'MAT', cap:1, vers:1, t:Date.now() },
    { libro:'MRK', cap:1, vers:1, t:Date.now() - 1 }])));
  const salto = await p.evaluate(async () => {
    await window.__toque('#btnHistorial');
    await window.__pausa(450);
    await window.__toque('[data-sep-nuevo]');
    await window.__pausa(800);
    const antes = window.__guardadas().map(x => x.libro + ' ' + x.cap + ':' + x.vers);
    await window.__toque('#btnHistorial');
    await window.__pausa(480);
    const atras = document.querySelector('[data-atras]');
    const dice = atras ? atras.textContent.trim() : '(no hay)';
    await window.__toque(atras);
    /* Entrar a un libro nuevo obliga a rearmarlo entero: se espera a que
       llegue, no un rato fijo. */
    const t0 = performance.now();
    while (performance.now() - t0 < 25000 && window.__hoja().indexOf('Marcos') !== 0)
      await window.__pausa(200);
    await window.__pausa(900);
    return { antes, dice, hoja: window.__hoja(),
             despues: window.__guardadas().map(x => x.libro + ' ' + x.cap + ':' + x.vers) };
  });
  di('el salto', salto.dice + '  →  ' + salto.hoja);
  di('las cintas', salto.antes + '  →  ' + salto.despues);
  vale('el salto llega a otro libro', salto.hoja.indexOf('Marcos') === 0, salto.hoja);
  vale('y la cinta no se movió', salto.antes.join('|') === salto.despues.join('|'),
       salto.antes + '  vs  ' + salto.despues);

  await cerrarParcial(sesion, 'teléfono');

  /* ================================================================
     LA LECTURA DE VERDAD. En su propia sesión y desde cero: hacen falta dos
     hojas leídas SEGUIDAS, y cualquier resto de la tanda de arriba las
     contaminaría. Los tiempos salen de LECTURA_MINIMA —20 s— y no se pueden
     acortar sin dejar de probar lo que se viene a probar. */
  const dos = await abrir();
  const q = dos.pagina;
  await abrirEn(q, 'MAT', 1, 1);
  const ESPERA = 21500;

  titulo('dos hojas leídas de verdad, y a la tercera pregunta');
  const leyendo = await q.evaluate(async (espera) => {
    const antesDeLeer = window.__oferta();
    await window.__pausa(espera);        // hoja 1 leída
    await window.__pasar('right');
    const traslaPrimera = window.__oferta();
    await window.__pausa(espera);        // hoja 2 leída
    await window.__pasar('right');       // llega a la tercera
    await window.__pausa(600);
    const hay = window.__oferta();
    const caja = document.getElementById('sepOferta');
    const st = document.getElementById('stage').getBoundingClientRect();
    const r = caja.getBoundingClientRect();
    return { antesDeLeer, traslaPrimera, hay,
             dice: (caja.textContent || '').trim(),
             botones: caja.querySelectorAll('button').length,
             dentro: r.left >= st.left - 1 && r.right <= st.right + 1 && r.bottom <= st.bottom + 1,
             tapaLaHoja: r.top < document.getElementById('pg').getBoundingClientRect().bottom - 120 };
  }, ESPERA);
  di('la oferta', leyendo.dice);
  vale('no pregunta antes de leer nada', !leyendo.antesDeLeer);
  vale('ni con una sola hoja leída', !leyendo.traslaPrimera);
  vale('con dos leídas, pregunta', leyendo.hay);
  vale('con sus dos respuestas', leyendo.botones === 2);
  vale('entera dentro de la escena', leyendo.dentro);
  vale('y sin taparle la lectura', !leyendo.tapaLaHoja);

  titulo('decir que NO no pone nada, y no vuelve a preguntar');
  const queNo = await q.evaluate(async (espera) => {
    await window.__toque('[data-sep-no]');
    await window.__pausa(500);
    const trasNo = { oferta: window.__oferta(), guardadas: window.__guardadas().length };
    /* Y se siguen leyendo dos hojas más: en esta misma lectura ya no pregunta. */
    await window.__pausa(espera);
    await window.__pasar('right');
    await window.__pausa(espera);
    await window.__pasar('right');
    await window.__pausa(700);
    return { trasNo, oferta: window.__oferta(), guardadas: window.__guardadas().length };
  }, ESPERA);
  vale('no pone separador', queNo.trasNo.guardadas === 0);
  vale('y la caja se va', !queNo.trasNo.oferta);
  vale('no vuelve a preguntar en esta lectura', !queNo.oferta, queNo.oferta);

  await cerrarParcial(dos, 'la lectura que dice que no');

  /* ================================================================ */
  const tres = await abrir();
  const p2 = tres.pagina;
  await abrirEn(p2, 'MAT', 1, 1);

  titulo('decir que SÍ pone la cinta, y la cinta sigue al lector');
  const queSi = await p2.evaluate(async (espera) => {
    await window.__pausa(espera);
    await window.__pasar('right');
    await window.__pausa(espera);
    await window.__pasar('right');
    await window.__pausa(600);
    const preguntó = window.__oferta();
    const hojaDeLaCinta = window.__hoja();
    await window.__toque('[data-sep-si]');
    await window.__pausa(700);
    await window.__abrirCajon();
    const puesta = window.__guardadas()[0];
    const cinta = window.__cinta();
    /* Y ahora se sigue leyendo: la cinta activa tiene que venirse. */
    await window.__pasar('right');
    await window.__pausa(600);
    await window.__abrirCajon();
    const seVino = !!window.__cinta();
    const movida = window.__guardadas()[0];
    return { preguntó, hojaDeLaCinta, puesta, cinta, seVino, movida,
             hojaAhora: window.__hoja(), cuantas: window.__guardadas().length };
  }, ESPERA);
  di('la cinta', queSi.puesta);
  vale('preguntó', queSi.preguntó);
  vale('el sí la pone', queSi.cuantas === 1 && !!queSi.cinta);
  vale('en la hoja donde estaba', queSi.puesta &&
       queSi.hojaDeLaCinta.indexOf(String(queSi.puesta.cap) + ':') > 0,
       queSi.hojaDeLaCinta + '  vs  ' + (queSi.puesta && queSi.puesta.cap + ':' + queSi.puesta.vers));
  vale('con fecha de creación y de cambio', queSi.puesta &&
       queSi.puesta.creado > 0 && queSi.puesta.tocado > 0);
  vale('y al seguir leyendo se viene con el lector', queSi.seVino);
  vale('sin duplicarse', queSi.cuantas === 1);
  vale('la referencia cambió', queSi.movida &&
       (queSi.movida.cap !== queSi.puesta.cap || queSi.movida.vers !== queSi.puesta.vers),
       (queSi.puesta && queSi.puesta.cap + ':' + queSi.puesta.vers) + '  →  ' +
       (queSi.movida && queSi.movida.cap + ':' + queSi.movida.vers));

  titulo('la cinta vieja se queda donde la dejaron');
  /* Se retrocede dos hojas —ir hacia atrás no es seguir leyendo, así que la
     cinta activa NO se viene— y allí se pone otra a mano. Desde ese momento
     hay una vieja quieta y una nueva activa, que es el caso que importa. */
  const vieja = await p2.evaluate(async () => {
    await window.__pasar('left');
    await window.__pasar('left');
    const antes = window.__guardadas().map(x => x.id + '@' + x.cap + ':' + x.vers);
    await window.__toque('#btnHistorial');
    await window.__pausa(420);
    await window.__toque('[data-sep-nuevo]');
    await window.__pausa(700);
    const dos = window.__guardadas().length;
    /* Y ahora se lee hacia adelante: solo la nueva debería moverse. */
    for (let i = 0; i < 3; i++) await window.__pasar('right');
    await window.__pausa(400);
    const despues = window.__guardadas().map(x => x.id + '@' + x.cap + ':' + x.vers);
    return { antes, dos, despues, cuantas: window.__guardadas().length };
  });
  di('antes', vieja.antes);
  di('después', vieja.despues);
  vale('hay dos', vieja.dos === 2 && vieja.cuantas === 2, vieja.cuantas);
  vale('la vieja no se movió', vieja.antes.every(x => vieja.despues.includes(x)),
       vieja.antes + '  ⊂  ' + vieja.despues);
  vale('y la nueva sí', vieja.despues.length === 2 &&
       vieja.despues.some(x => !vieja.antes.includes(x)));

  await cerrarParcial(tres, 'la lectura que dice que sí');

  /* ================================================================
     ESCRITORIO. La columna de glosas mide 152px en vez de 240 y la cinta es
     una proporción de ella, así que hay que ver que siga siendo corta, que no
     tape el titulillo y que el menú quepa. */
  const ancho = await abrir(ESCRITORIO);
  const w = ancho.pagina;
  await abrirEn(w, 'MAT', 1, 1);

  titulo('escritorio: la cinta y su menú');
  const esc = await w.evaluate(async () => {
    await window.__toque('#btnHistorial');
    await window.__pausa(420);
    await window.__toque('[data-sep-nuevo]');
    await window.__pausa(700);
    const cinta = window.__cinta();
    const c = document.querySelector('.separador').getBoundingClientRect();
    const cab = document.querySelector('.pg-cabeza').getBoundingClientRect();
    await window.__toque('.separador');
    await window.__pausa(450);
    return { cinta, menu: window.__menu(), desborde: window.__desborde(),
             bajoElTitulillo: c.top >= cab.bottom - 1,
             anchoRelativo: Math.round(c.width) };
  });
  di('la cinta', esc.cinta);
  vale('cuelga dentro de la columna', esc.cinta && esc.cinta.dentro);
  vale('sigue siendo corta', esc.cinta && esc.cinta.corta,
       esc.cinta && esc.cinta.h + ' de ' + esc.cinta.altoColumna + ' px');
  vale('no tapa el titulillo', esc.bajoElTitulillo);
  vale('sin desborde horizontal', !esc.desborde);
  vale('el menú cabe entero', esc.menu && esc.menu.dentro, esc.menu);

  titulo('con menos movimiento, sin recorridos');
  await w.emulateMedia({ reducedMotion: 'reduce' });
  const quieto = await w.evaluate(async () => {
    const cinta = document.querySelector('.separador');
    const menu = document.getElementById('sepMenu');
    return { cinta: getComputedStyle(cinta).animationName,
             transicion: getComputedStyle(menu).transitionDuration,
             sinRecorrido: getComputedStyle(menu).transform };
  });
  di('con movimiento reducido', quieto);
  vale('la cinta no cae', quieto.cinta === 'none');
  vale('y el menú no recorre', quieto.sinRecorrido === 'none' ||
       quieto.sinRecorrido === 'matrix(1, 0, 0, 1, 0, 0)', quieto.sinRecorrido);

  titulo('con teclado, sin ratón');
  /* La cinta es un botón de verdad, así que Intro tiene que abrirla. Quien
     navega con teclado no tiene otra puerta a la lista ni al color. */
  const teclado = await w.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await window.__pausa(400);
    const cinta = document.querySelector('.separador');
    const enfocable = cinta.tagName === 'BUTTON' && !cinta.disabled;
    const rotulo = cinta.getAttribute('aria-label') || '';
    cinta.focus();
    const conFoco = document.activeElement === cinta;
    cinta.click();                       /* lo que hace Intro sobre un botón */
    await window.__pausa(450);
    const m = window.__menu();
    const dentroDelMenu = document.activeElement &&
                          !!document.activeElement.closest('#sepMenu');
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await window.__pausa(400);
    return { enfocable, rotulo, conFoco, abrio: !!m, dentroDelMenu, cerro: !window.__menu() };
  });
  di('la cinta con teclado', teclado);
  vale('es un botón que se enfoca', teclado.enfocable && teclado.conFoco);
  vale('y se anuncia por lo que es', /separador/i.test(teclado.rotulo) &&
       /\d+:\d+/.test(teclado.rotulo), teclado.rotulo);
  vale('Intro abre su menú', teclado.abrio);
  vale('el foco entra al menú', teclado.dentroDelMenu);
  vale('y Escape lo cierra', teclado.cerro);

  titulo('de lejos la cinta no responde');
  const lejos = await w.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await window.__pausa(1300);
    const cinta = document.querySelector('.separador');
    const inerte = getComputedStyle(cinta).pointerEvents === 'none';
    const seVe = cinta.getBoundingClientRect().width > 2;
    /* Y se sale del zoom por el hueco de debajo del libro. */
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left+r.width/2), clientY:Math.round(r.bottom+60) }));
    await window.__pausa(1400);
    return { inerte, seVe, menu: !!window.__menu(),
             cerca: !document.getElementById('pg').classList.contains('zoom') };
  });
  di('de lejos', lejos);
  vale('se sigue viendo', lejos.seVe);
  vale('pero no se toca', lejos.inerte && !lejos.menu);
  vale('y el hueco sigue cerrando el zoom', lejos.cerca);

  titulo('un almacén dañado no rompe nada');
  const danado = await w.evaluate(async () => {
    localStorage.setItem('glossa:separadores:v1',
      JSON.stringify([{ id:'bueno', libro:'MAT', cap:1, vers:1 },      /* sin color ni fechas */
                      { libro:'MAT', cap:2, vers:1 },                  /* sin identificador */
                      { id:'x', libro:'MAT', cap:0, vers:0 },          /* referencia imposible */
                      'esto no es un separador', null,
                      { id:'raro', libro:'MAT', cap:3, vers:1, color:'fucsia' }]));
    return true;
  });
  await w.reload();
  await w.waitForTimeout(3200);
  await andamio(w);
  /* Lo que quedó no se lee del almacén —ahí sigue la basura hasta que algo
     escriba— sino de lo que la aplicación enseña, que es lo que importa: la
     cinta que cuelga y las filas de su lista. Y al tocar un color se reescribe,
     así que ahí se ve también lo que guarda. */
  const tras2 = await w.evaluate(async () => {
    const vivo = document.querySelectorAll('#pgBody .v').length > 0;
    const cinta = window.__cinta();
    if (!cinta) return { vivo, cinta:null };
    await window.__toque('.separador');
    await window.__pausa(450);
    const filas = [...document.querySelectorAll('[data-sep-ir]')]
      .map(f => f.querySelector('.sp-ref').textContent.trim() + ' · ' +
                f.querySelector('.sp-nota').textContent.trim());
    /* Un toque en un color reescribe el almacén con lo que de verdad quedó. */
    const otra = [...document.querySelectorAll('[data-sep-color]')]
      .find(t => t.getAttribute('aria-pressed') !== 'true');
    await window.__toque(otra);
    await window.__pausa(400);
    return { vivo, cinta, filas, guardadas: window.__guardadas() };
  });
  di('lo que sobrevivió', tras2.filas);
  vale('el programa arranca igual', tras2.vivo);
  vale('la cinta que se entendía sigue ahí', !!tras2.cinta);
  vale('se queda con lo que se entiende', tras2.filas && tras2.filas.length === 2,
       tras2.filas);
  vale('y completa lo que falta', tras2.guardadas && tras2.guardadas.length === 2 &&
       tras2.guardadas.every(x => x && x.id && x.color && x.creado > 0 && x.tocado > 0),
       tras2.guardadas);
  vale('un color inventado cae en uno real',
       !!tras2.guardadas && (tras2.guardadas.find(x => x.id === 'raro') || {}).color === 'carmin');

  titulo('una cinta cuyo versículo ya no existe');
  /* Pasa de verdad: cambiar de versión en Formato cambia la numeración y hay
     versiones a las que les faltan versículos. Una cinta perdida no podría ni
     verse ni quitarse, así que se conforma con su capítulo. */
  await w.evaluate(() => localStorage.setItem('glossa:separadores:v1',
    JSON.stringify([{ id:'perdida', libro:'MAT', cap:1, vers:99, color:'indigo',
                      creado:Date.now(), tocado:Date.now() }])));
  await w.evaluate(a => localStorage.setItem('glossa:ajustes:v1', JSON.stringify(a)),
                   { v:1, libro:'MAT', cap:1, vers:1 });
  await w.reload();
  await w.waitForTimeout(3200);
  await andamio(w);
  const perdida = await w.evaluate(async () => {
    const cinta = window.__cinta();
    if (!cinta) return { cinta:null, hoja: window.__hoja() };
    await window.__toque('.separador');
    await window.__pausa(450);
    await window.__toque('[data-sep-x]');
    await window.__pausa(400);
    await window.__toque('[data-sep-borrar]');
    await window.__pausa(600);
    return { cinta, hoja: window.__hoja(), quedan: window.__guardadas().length,
             sigueViva: !!window.__cinta() };
  });
  di('la cinta perdida', perdida.hoja + ' · ' + JSON.stringify(perdida.cinta));
  vale('cae en su capítulo y se ve', !!perdida.cinta);
  vale('y se puede quitar', perdida.quedan === 0 && !perdida.sigueViva);

  titulo('una cinta perdida EN OTRO LIBRO también se alcanza');
  /* El respaldo por capítulo lo calculaba quien solo sabe del libro cargado,
     así que para una cinta de otro libro no llegaba a calcularse nunca: el
     salto recibía el versículo que ya no existe y lo rechazaba por fuera de
     rango, dejando la cinta sin manera de alcanzarse ni de quitarse. */
  await w.evaluate(() => localStorage.setItem('glossa:separadores:v1',
    JSON.stringify([{ id:'aqui',  libro:'MAT', cap:1, vers:1, color:'ocre',
                      creado:Date.now(), tocado:Date.now() },
                    { id:'lejos', libro:'MRK', cap:1, vers:999, color:'oliva',
                      creado:Date.now()-1, tocado:Date.now()-1 }])));
  await w.evaluate(a => localStorage.setItem('glossa:ajustes:v1', JSON.stringify(a)),
                   { v:1, libro:'MAT', cap:1, vers:1 });
  await w.reload();
  await w.waitForTimeout(3200);
  await andamio(w);
  const otroLibro = await w.evaluate(async () => {
    await window.__toque('.separador');
    await window.__pausa(450);
    const fila = document.querySelector('[data-sep-ir="lejos"]');
    const dice = fila ? fila.querySelector('.sp-ref').textContent.trim() : '(no está)';
    if (!fila) return { dice, hoja: window.__hoja() };
    await window.__toque(fila);
    const t0 = performance.now();
    while (performance.now() - t0 < 25000 && window.__hoja().indexOf('Marcos') !== 0)
      await window.__pausa(200);
    await window.__pausa(900);
    return { dice, hoja: window.__hoja(), cinta: !!window.__cinta() };
  });
  di('la fila de lejos', otroLibro.dice + '  →  ' + otroLibro.hoja);
  vale('la lista la enseña igual', otroLibro.dice !== '(no está)', otroLibro.dice);
  vale('y el salto llega a su capítulo', otroLibro.hoja.indexOf('Marcos') === 0,
       otroLibro.hoja);

  titulo('otra pestaña abierta no se pierde al guardar');
  /* De cero: lo de arriba dejó cintas puestas, y aquí lo que se mira es
     exactamente qué hay en el almacén después de cada escritura. */
  await w.evaluate(() => localStorage.removeItem('glossa:separadores:v1'));
  await w.evaluate(a => localStorage.setItem('glossa:ajustes:v1', JSON.stringify(a)),
                   { v:1, libro:'MAT', cap:1, vers:1 });
  await w.reload();
  await w.waitForTimeout(3200);
  await andamio(w);
  /* Dos pestañas con la misma aplicación tienen cada una su lista en memoria,
     la de cuando cargó. Escribir a pelo se lleva por delante lo que la otra
     puso desde entonces. Aquí la otra pestaña se imita escribiendo en el
     almacén por detrás, que es exactamente lo que ella haría. */
  const pestanas = await w.evaluate(async () => {
    await window.__toque('#btnHistorial');
    await window.__pausa(450);
    await window.__toque('[data-sep-nuevo]');
    await window.__pausa(800);
    const mia = window.__guardadas()[0];
    /* La otra pestaña pone la suya, sin que ésta se entere. */
    const ajena = { id:'deLaOtra', libro:'MAT', cap:2, vers:1, color:'indigo',
                    creado: Date.now(), tocado: Date.now() };
    localStorage.setItem('glossa:separadores:v1', JSON.stringify([mia, ajena]));
    /* Y ahora ésta guarda: cambiar el color de la suya. */
    await window.__toque('.separador');
    await window.__pausa(450);
    const otroColor = [...document.querySelectorAll('[data-sep-color]')]
      .find(t => t.getAttribute('aria-pressed') !== 'true');
    await window.__toque(otroColor);
    await window.__pausa(400);
    const trasGuardar = window.__guardadas().map(x => x.id);
    /* Se borra la de aquí. La ajena no se toca. */
    await window.__toque('[data-sep-x]');
    await window.__pausa(400);
    await window.__toque('[data-sep-borrar]');
    await window.__pausa(600);
    const trasBorrar = window.__guardadas().map(x => x.id);
    /* Y si la otra pestaña vuelve a escribir la que aquí se borró, no
       resucita: esta pestaña se acuerda de haberla quitado. */
    localStorage.setItem('glossa:separadores:v1', JSON.stringify(
      [ajena, { ...mia, tocado: Date.now() + 1000 }]));
    await window.__toque('#btnHistorial');
    await window.__pausa(450);
    await window.__toque('[data-sep-nuevo]');
    await window.__pausa(800);
    const trasResucitar = window.__guardadas().map(x => x.id);
    return { mia: mia.id, trasGuardar, trasBorrar, trasResucitar };
  });
  di('los identificadores', pestanas);
  vale('la ajena sobrevive al guardado',
       pestanas.trasGuardar.includes('deLaOtra') && pestanas.trasGuardar.includes(pestanas.mia),
       pestanas.trasGuardar);
  vale('borrar aquí no toca la ajena',
       pestanas.trasBorrar.length === 1 && pestanas.trasBorrar[0] === 'deLaOtra',
       pestanas.trasBorrar);
  vale('y lo borrado no resucita al fundir',
       !pestanas.trasResucitar.includes(pestanas.mia) &&
       pestanas.trasResucitar.includes('deLaOtra'), pestanas.trasResucitar);

  titulo('los otros caminos siguen andando');
  const otros = await w.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await window.__pausa(400);
    const antes = window.__hoja();
    await window.__pasar('right');
    const conFilo = window.__hoja();
    await window.__toque('#btnHistorial');
    await window.__pausa(420);
    const rastro = { abierto: getComputedStyle(document.getElementById('historial')).display !== 'none',
                     filas: document.querySelectorAll('[data-hs]').length,
                     atras: !!document.querySelector('[data-atras]') };
    return { antes, conFilo, rastro };
  });
  di('el rastro', otros.rastro);
  vale('el filo sigue pasando hoja', otros.conFilo !== otros.antes,
       otros.antes + '  →  ' + otros.conFilo);
  vale('y el panel del rastro sigue entero', otros.rastro.abierto);

  await cerrar(ancho);
})();
