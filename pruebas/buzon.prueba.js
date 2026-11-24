/* ============================================================
   EL BUZÓN: LAS BOLITAS DE LAS CARTAS SIN ABRIR.

   Una nota recibida con la carta cerrada pone en la pantalla una bolita que
   se porta como una canica: cae, rueda hacia donde se inclina el teléfono,
   choca con las otras. Tocarla abre su burbuja; tocar la burbuja la cierra;
   tocar la bolita con la burbuja abierta la desvanece y abre la carta.

   LO ÚNICO QUE SE SUSTITUYE ES EL SENSOR, que es una pieza del navegador: un
   Chromium sin teléfono debajo no manda devicemotion, así que se le mandan a
   mano, como los mandaría el acelerómetro. La aplicación no se toca.

   Y LOS TOQUES SIN CLIC, con su pointerId y torcidos. Uno de ellos sin
   pointerdown: un evento despachado a mano siempre llega, y el de un teléfono
   no.
   ============================================================ */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

const CLAVE = 'glossa:notas:v1';
const PRUEBA = 'glossa:buzon:prueba:v1';

const IR_A = `async sec => {
  const pausa = ms => new Promise(z => setTimeout(z, ms));
  const visible = () => [...document.querySelectorAll('.rollo')]
    .find(r => getComputedStyle(r).display !== 'none');
  if (!visible()){ document.getElementById('pgCabeza').click(); await pausa(900); }
  const t = (visible() || document).querySelector('.pestanas [data-sec="' + sec + '"]');
  if (!t) return false;
  t.click(); await pausa(1200);
  return true;
}`;

/* Lo que mira cómo llega cada bolita: en cuanto una entra en el documento, se
   apunta dónde está en cada cuadro durante un segundo y medio. Solo mira. */
const VIGIA = () => {
  window.__alturas = [];
  new MutationObserver(cambios => {
    for (const c of cambios) for (const n of c.addedNodes){
      if (!(n instanceof HTMLElement) || !n.classList.contains('bola')) continue;
      const fila = []; window.__alturas.push(fila);
      const t0 = performance.now();
      const mira = () => {
        const r = n.getBoundingClientRect();
        fila.push({ t:performance.now() - t0, top:r.top, bottom:r.bottom });
        if (performance.now() - t0 < 1500) requestAnimationFrame(mira);
      };
      requestAnimationFrame(mira);
    }
  }).observe(document, { childList:true, subtree:true });
};

/* Un toque de dedo: baja, tiembla, sube. Sin clic. Con sinApoyo, ni el
   pointerdown. */
async function tocar(p, selector, { sinApoyo = false, pid = 31 } = {}){
  const hecho = await p.evaluate(async ([selector, sinApoyo, pid]) => {
    const el = document.querySelector(selector);
    if (!el) return 'no está ' + selector;
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const o = (cx, cy, b = 1) => ({ bubbles:true, cancelable:true, composed:true, pointerId:pid,
      pointerType:'touch', isPrimary:true, buttons:b, clientX:cx, clientY:cy });
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    if (!sinApoyo){ el.dispatchEvent(new PointerEvent('pointerdown', o(x, y))); await pausa(30); }
    el.dispatchEvent(new PointerEvent('pointermove', o(x + 2, y - 1))); await pausa(25);
    el.dispatchEvent(new PointerEvent('pointerup', o(x + 1, y + 1, 0)));
    return '';
  }, [selector, sinApoyo, pid]);
  if (hecho) throw new Error(hecho);
  await p.waitForTimeout(350);
}

/* El acelerómetro: aceleración con gravedad, en m/s², durante un rato. */
async function inclinar(p, x, y, ms = 1600){
  await p.evaluate(async ([x, y, ms]) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms){
      window.dispatchEvent(new DeviceMotionEvent('devicemotion',
        { accelerationIncludingGravity:{ x, y, z:0 }, acceleration:{ x:0, y:0, z:0 }, interval:16 }));
      await new Promise(z => setTimeout(z, 16));
    }
  }, [x, y, ms]);
}

const bola = p => p.evaluate(() => {
  const b = document.querySelector('#buzon .bola:not(.se-va)');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x:r.left + r.width / 2, y:r.top + r.height / 2, d:r.width, top:r.top, bottom:r.bottom,
           color:b.style.getPropertyValue('--bola'), ancho:innerWidth, alto:document.getElementById('buzon').clientHeight };
});
const nota = (p, id) => p.evaluate(([k, id]) =>
  (JSON.parse(localStorage.getItem(k) || '[]').find(n => n.id === id) || null), [CLAVE, id]);

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  /* La nota de Gianni, sembrada como la tendría su teléfono: sin carta, y con
     su título de verdad, «Las celebraciones judías» —la primera versión solo
     buscaba «festividades» y en su teléfono nunca la encontró—. Una
     sola vez, antes de que arranque la página; las recargas de después ya
     traen lo que la aplicación guardó. */
  await p.addInitScript(([k, prueba]) => {
    if (sessionStorage.getItem('buzon-sembrado')) return;
    sessionStorage.setItem('buzon-sembrado', '1');
    localStorage.setItem(k, JSON.stringify([
      { id:'nota-fiestas', titulo:'Las celebraciones judías', filtros:[],
        texto:'Pascua\nPanes sin levadura\nPrimicias\nPentecostés\nTrompetas\nExpiación\nTabernáculos' },
      { id:'nota-otra', titulo:'Otra nota', texto:'Sin carta.', filtros:[] }]));
    localStorage.removeItem(prueba);
    /* Las de goma y pluma de prueba tienen su propia suite
       (buzon-materiales): aquí se dan por vistas hace rato, para que no caigan
       encima de las que esta suite cuenta. */
    localStorage.setItem('glossa:buzon:prueba-materiales:v3', JSON.stringify({ t:1, abiertas:[] }));
  }, [CLAVE, PRUEBA]);
  await p.addInitScript(VIGIA);
  await p.reload();
  await p.waitForTimeout(2600);

  titulo('LA NOTA DE PRUEBA LLEGA COMO CARTA CERRADA');
  const fiestas = await nota(p, 'nota-fiestas');
  di('la carta guardada', fiestas && fiestas.recibida);
  vale('«Las celebraciones judías» queda con la carta cerrada, en azul metálico',
       fiestas && fiestas.recibida && fiestas.recibida.estado === 'cerrada' && fiestas.recibida.color === '#3f6e9e');
  vale('la otra nota no trae carta', !(await nota(p, 'nota-otra')).recibida);
  vale('queda apuntado que la de prueba sigue sin abrir', await p.evaluate(k => localStorage.getItem(k), PRUEBA) === 'cerrada');

  titulo('SU BOLITA CAE DESDE ARRIBA Y SE QUEDA ABAJO');
  const alturas = await p.evaluate(() => window.__alturas);
  const fila = alturas[0] || [];
  di('alturas al llegar (top)', fila.filter((_, i) => i % 8 === 0).map(m => Math.round(m.top)));
  vale('una sola bolita', alturas.length === 1 && await p.locator('#buzon .bola').count() === 1);
  vale('nace por encima de la pantalla', fila.length > 0 && fila[0].bottom <= 1, fila[0]);
  const b0 = await bola(p);
  di('la bolita en reposo', b0);
  /* 40 puntos son 53,3 px; se deja medio píxel de redondeo. */
  vale('mide 40 puntos de diámetro', b0 && Math.abs(b0.d - 40 * 96 / 72) < 0.6, b0 && b0.d);
  vale('lleva el color de la carta', b0 && b0.color === '#3f6e9e', b0 && b0.color);
  vale('descansa en la parte de abajo', b0 && b0.bottom > b0.alto * 0.75, b0);
  await p.waitForTimeout(300);
  const b1 = await bola(p);
  vale('y está quieta', b1 && Math.hypot(b1.x - b0.x, b1.y - b0.y) < 1.5, [b0, b1]);

  titulo('RUEDA HACIA DONDE SE INCLINA EL TELÉFONO');
  /* El sensor mide la reacción a la gravedad: con el lado izquierdo abajo, x
     sale positiva, y la canica se va a la izquierda. */
  await inclinar(p, 9.81, 0);
  const izq = await bola(p);
  await inclinar(p, -9.81, 0);
  const der = await bola(p);
  await inclinar(p, 0, 9.81, 1200);
  di('inclinado a la izquierda y a la derecha (centro x)', [izq && Math.round(izq.x), der && Math.round(der.x)]);
  vale('con el teléfono inclinado a la izquierda se va a la izquierda', izq && izq.x < izq.ancho * 0.3, izq);
  vale('y a la derecha, a la derecha', der && der.x > der.ancho * 0.7, der);
  const pie = await bola(p);
  vale('de pie otra vez, vuelve abajo', pie && pie.bottom > pie.alto * 0.75, pie);

  titulo('TOCARLA ABRE SU BURBUJA, Y SE QUEDA QUIETA');
  await tocar(p, '#buzon .bola');
  const burbuja = await p.evaluate(() => {
    const el = document.querySelector('#buzon .bocadillo.abierto');
    const b = document.querySelector('#buzon .bola');
    if (!el || !b) return null;
    const r = el.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const c = el.querySelector('.bocadillo-cola').getBoundingClientRect();
    return { texto:el.textContent, arriba:r.bottom <= rb.top + 1, cola:c.left + c.width / 2,
             bola:rb.left + rb.width / 2, dentro:r.left >= 0 && r.right <= innerWidth && r.top >= 0 };
  });
  di('la burbuja', burbuja);
  vale('se abre la burbuja con el mensaje', burbuja && /Pascua/.test(burbuja.texto) && /Tabernáculos/.test(burbuja.texto));
  vale('va encima de la bolita y dentro de la pantalla', burbuja && burbuja.arriba && burbuja.dentro);
  vale('su colita apunta a la bolita', burbuja && Math.abs(burbuja.cola - burbuja.bola) < 8, burbuja);
  const quieta0 = await bola(p);
  /* Hacia arriba, y no de lado: la bolita descansa abajo donde le tocó, y
     puede haber quedado en el hueco entre dos botones, con uno más alto al
     lado; de lado no saldría, y la prueba confundiría «quieta» con «atorada».
     Hacia arriba sale siempre. Menos de un segundo, que más rato boca abajo
     el programa entiende que el sensor viene al revés y lo voltea. */
  await inclinar(p, 0, -9.81, 700);
  const quieta1 = await bola(p);
  vale('con la burbuja abierta la bolita no se mueve aunque se incline',
       quieta0 && quieta1 && Math.hypot(quieta1.x - quieta0.x, quieta1.y - quieta0.y) < 1, [quieta0, quieta1]);
  /* De pie otra vez, con la burbuja todavía abierta: el programa se queda con
     la última lectura del sensor, y también se olvida así del rato boca
     abajo. */
  await inclinar(p, 0, 9.81, 1300);

  titulo('TOCAR LA BURBUJA LA CIERRA, Y LA BOLITA VUELVE A RODAR');
  await tocar(p, '#buzon .bocadillo');
  vale('la burbuja se va', await p.locator('#buzon .bocadillo').count() === 0);
  vale('la bolita se queda', await p.locator('#buzon .bola:not(.se-va)').count() === 1);
  vale('la carta sigue cerrada', (await nota(p, 'nota-fiestas')).recibida.estado === 'cerrada');
  await inclinar(p, 0, -9.81, 700);
  const suelta = await bola(p);
  vale('suelta, vuelve a moverse con la inclinación', suelta && quieta1 && suelta.y < quieta1.y - 50, [quieta1, suelta]);
  await inclinar(p, 0, 9.81, 1200);

  titulo('CON LA BURBUJA ABIERTA, TOCAR LA BOLITA ABRE LA CARTA');
  /* Sin pointerdown: el teléfono a veces no lo manda. */
  await tocar(p, '#buzon .bola', { sinApoyo:true, pid:32 });
  vale('el toque sin pointerdown también abre la burbuja', await p.locator('#buzon .bocadillo.abierto').count() === 1);
  await tocar(p, '#buzon .bola', { pid:33 });
  vale('la burbuja se cierra', await p.locator('#buzon .bocadillo').count() === 0);
  vale('la bolita se desvanece', await p.locator('#buzon .bola.se-va').count() === 1);
  await p.waitForTimeout(800);
  vale('y se va del todo', await p.locator('#buzon .bola').count() === 0);
  vale('la carta de la nota queda abierta', (await nota(p, 'nota-fiestas')).recibida.estado === 'abierta');

  titulo('AL VOLVER A ABRIR NO SE VUELVE A CERRAR');
  await p.reload();
  await p.waitForTimeout(1500);
  vale('no hay bolita', await p.locator('#buzon .bola').count() === 0);
  vale('la carta sigue abierta', (await nota(p, 'nota-fiestas')).recibida.estado === 'abierta');

  titulo('QUIEN LA ABRIÓ CON LA MARCA VIEJA NO LA VE CERRARSE CUANDO LLEGA LA NUBE');
  /* Antes la marca guardaba '1' y no decía si la carta se había abierto.
     Con esa marca, si la nube traía la nota sin el campo recibida, la carta
     ya leída se volvía a cerrar. Primero se deja la marca vieja. */
  await p.evaluate(k => localStorage.setItem(k, '1'), PRUEBA);
  await p.reload();
  await p.waitForTimeout(1200);
  vale('la marca vieja se pone al día: abierta', await p.evaluate(k => localStorage.getItem(k), PRUEBA) === 'abierta');
  /* Y ahora la nube: la misma nota, sin el campo recibida. */
  await p.evaluate(k => {
    const lista = JSON.parse(localStorage.getItem(k));
    delete lista.find(n => n.id === 'nota-fiestas').recibida;
    localStorage.setItem(k, JSON.stringify(lista));
  }, CLAVE);
  await p.reload();
  await p.waitForTimeout(1500);
  vale('no sale otra bolita', await p.locator('#buzon .bola').count() === 0);
  vale('y la nota no se vuelve a cerrar', !(await nota(p, 'nota-fiestas')).recibida);
  /* Se deja como estaba, abierta, para lo que sigue. */
  await p.evaluate(k => {
    const lista = JSON.parse(localStorage.getItem(k));
    lista.find(n => n.id === 'nota-fiestas').recibida = { estado:'abierta', color:'#3f6e9e', llegada:1 };
    localStorage.setItem(k, JSON.stringify(lista));
  }, CLAVE);

  titulo('LAS QUE YA ESTABAN APARECEN ABAJO, Y CHOCAN ENTRE ELLAS');
  /* Dos cartas que llegaron antes de abrir, una roja y una verde. */
  await p.evaluate(k => {
    const lista = JSON.parse(localStorage.getItem(k));
    lista.push({ id:'nota-roja', titulo:'Roja', texto:'Una.', filtros:[],
                 recibida:{ estado:'cerrada', color:'#a03028', llegada:1 } });
    lista.push({ id:'nota-verde', titulo:'Verde', texto:'Dos.', filtros:[],
                 recibida:{ estado:'cerrada', color:'#2f7a4a', llegada:2 } });
    localStorage.setItem(k, JSON.stringify(lista));
  }, CLAVE);
  await p.reload();
  await p.waitForTimeout(1800);
  const llegadas = await p.evaluate(() => window.__alturas);
  di('primera altura de cada una (top)', llegadas.map(f => f[0] && Math.round(f[0].top)));
  vale('son dos bolitas', llegadas.length === 2 && await p.locator('#buzon .bola').count() === 2);
  vale('ninguna cae: nacen ya en la parte de abajo',
       llegadas.length === 2 && llegadas.every(f => f[0] && f[0].top > 915 * 0.6), llegadas.map(f => f[0]));
  const dos = await p.evaluate(() => [...document.querySelectorAll('#buzon .bola')].map(b => {
    const r = b.getBoundingClientRect(); return { x:r.left + r.width / 2, y:r.top + r.height / 2, d:r.width,
      color:b.style.getPropertyValue('--bola') };
  }));
  di('las dos', dos);
  vale('cada una con su color', dos.length === 2 && dos.map(b => b.color).sort().join() === '#2f7a4a,#a03028');
  vale('no se enciman', dos.length === 2 && Math.hypot(dos[0].x - dos[1].x, dos[0].y - dos[1].y) > dos[0].d - 1.5, dos);
  /* Hacia la derecha y algo hacia abajo, para que choquen de verdad: la roja
     descansa encima del rótulo de la versión, en medio del pie, y la verde
     en el suelo a su derecha. Hacia la izquierda no chocarían: el rótulo
     detiene a la verde, que es justo lo que tiene que hacer un estorbo. */
  await inclinar(p, -6.9, 6.9, 2000);
  const juntas = await p.evaluate(() => [...document.querySelectorAll('#buzon .bola')].map(b => {
    const r = b.getBoundingClientRect(); return { x:r.left + r.width / 2, y:r.top + r.height / 2, d:r.width,
      color:b.style.getPropertyValue('--bola') };
  }));
  di('inclinadas a la derecha', juntas);
  const roja = juntas.find(b => b.color === '#a03028'), rojaAntes = dos.find(b => b.color === '#a03028');
  vale('la roja baja del rótulo y rueda a la derecha', roja && rojaAntes && roja.x > rojaAntes.x + 30, [rojaAntes, roja]);
  vale('las dos quedan en la mitad derecha', juntas.length === 2 && juntas.every(b => b.x > 412 * 0.5), juntas);
  vale('y chocan sin atravesarse',
       juntas.length === 2 && Math.hypot(juntas[0].x - juntas[1].x, juntas[0].y - juntas[1].y) > juntas[0].d - 1.5, juntas);
  await inclinar(p, 0, 9.81, 1200);

  titulo('EN LA LISTA DE NOTAS, LA CARTA VA EN EL SITIO DE LA FLECHA');
  const llego = await p.evaluate(`(${IR_A})('notas')`);
  vale('(la prueba es válida) se abre NOTAS', llego === true);
  await p.waitForTimeout(400);
  vale('con un panel abierto las bolitas se apartan',
       await p.evaluate(() => document.getElementById('buzon').classList.contains('tapado') &&
                              getComputedStyle(document.getElementById('buzon')).visibility === 'hidden'));
  const filas = await p.evaluate(() => [...document.querySelectorAll('#notas .indice-item')].map(f => {
    const flecha = f.lastElementChild;
    return { nombre:f.querySelector('.indice-nombre').textContent, carta:flecha.dataset.carta || null,
             flecha:flecha.textContent, ultimo:flecha.getBoundingClientRect().right };
  }));
  di('las filas', filas);
  const deFila = nombre => filas.find(f => f.nombre === nombre) || {};
  vale('la de las celebraciones, ya leída, lleva la carta abierta', deFila('Las celebraciones judías').carta === 'abierta');
  vale('la roja, sin leer, lleva la carta cerrada', deFila('Roja').carta === 'cerrada');
  vale('la que no se recibió conserva su flecha', deFila('Otra nota').carta === null && deFila('Otra nota').flecha === '→');
  await p.locator('#notas .indice-item').filter({ hasText:'Roja' }).click();
  await p.waitForTimeout(400);
  vale('dentro de la nota abierta también se ve la carta cerrada',
       await p.locator('#notas .nota-hoja:not([hidden]) .nota-carta[data-carta="cerrada"]').count() === 1);

  titulo('LA HOJA DE LA NOTA DE PRUEBA TAMBIÉN TRAE SU SOBRE, YA EN LA PRIMERA SESIÓN');
  /* La de prueba se marca cuando las hojas ya están pintadas. Lo que se
     vigila es que su hoja reciba el sobre en ese momento, sin esperar a
     recargar. Se deja como la tendría el teléfono antes de esta versión. */
  await p.evaluate(([k, prueba]) => {
    const lista = JSON.parse(localStorage.getItem(k));
    delete lista.find(n => n.id === 'nota-fiestas').recibida;
    localStorage.setItem(k, JSON.stringify(lista));
    localStorage.removeItem(prueba);
  }, [CLAVE, PRUEBA]);
  /* Y CON EL TELÉFONO ACOSTADO: el sensor no marca nada de lado ni de largo.
     Así lo tenía Gianni, y la bolita que llegaba se quedaba flotando encima
     de la pantalla, sin entrar nunca. Y después pidió que las bolitas «sigan
     al teléfono, no pueden caer si el teléfono está horizontal»: acostado,
     «quietas donde están». Así que la que llega entra a la vista y ahí
     espera, arriba, hasta que se levanta el teléfono. Se manda desde antes
     de que arranque, con un poco de temblor, que una mesa nunca da cero. */
  await p.addInitScript(() => {
    if (sessionStorage.getItem('buzon-acostado') !== '1') return;
    let i = 0;
    const manda = () => { i++;
      window.dispatchEvent(new DeviceMotionEvent('devicemotion',
        { accelerationIncludingGravity:{ x:0.12 * Math.sin(i / 3), y:0.15 * Math.cos(i / 5), z:9.81 },
          acceleration:{ x:0, y:0, z:0 }, interval:16 })); };
    window.__acostado = setInterval(manda, 16);
  });
  await p.evaluate(() => sessionStorage.setItem('buzon-acostado', '1'));
  await p.reload();
  await p.waitForTimeout(2200);
  const acostada = await bola(p);
  di('con el teléfono acostado', acostada);
  vale('acostado, la bolita entra a la vista', acostada && acostada.top >= 0, acostada);
  vale('y se queda arriba: no cae', acostada && acostada.bottom < acostada.alto * 0.3, acostada);
  await p.waitForTimeout(1200);
  const acostada2 = await bola(p);
  vale('y quieta donde está, aunque la mesa tiemble un poco',
       acostada && acostada2 && Math.hypot(acostada2.x - acostada.x, acostada2.y - acostada.y) < 3, [acostada, acostada2]);
  await p.evaluate(() => clearInterval(window.__acostado));
  await inclinar(p, 0, 9.81, 1800);
  const levantada = await bola(p);
  di('al levantar el teléfono', levantada);
  vale('al levantar el teléfono, cae al pie de la pantalla', levantada && levantada.bottom > levantada.alto * 0.75, levantada);
  await p.evaluate(() => sessionStorage.removeItem('buzon-acostado'));
  vale('(la prueba es válida) la nota volvió a llegar cerrada',
       ((await nota(p, 'nota-fiestas')).recibida || {}).estado === 'cerrada');
  vale('(la prueba es válida) se abre NOTAS', await p.evaluate(`(${IR_A})('notas')`) === true);
  await p.locator('#notas .indice-item').filter({ hasText:'Las celebraciones judías' }).click();
  await p.waitForTimeout(400);
  const hojaFiestas = await p.evaluate(() => {
    const h = document.querySelector('#notas .nota-hoja[data-nota="nota-fiestas"]');
    if (!h) return null;
    const sobre = h.querySelector(':scope > .nota-carta');
    return { visible:!h.hidden, recibida:h.classList.contains('recibida'), carta:sobre && sobre.dataset.carta,
             antesDelEditor:!!(sobre && sobre.nextElementSibling && sobre.nextElementSibling.classList.contains('nota-editor')) };
  });
  di('la hoja de las celebraciones', hojaFiestas);
  vale('su hoja lleva la carta cerrada, delante del texto',
       hojaFiestas && hojaFiestas.visible && hojaFiestas.recibida && hojaFiestas.carta === 'cerrada' && hojaFiestas.antesDelEditor);

  await cerrar(sesion);
})().catch(e => { console.error(e); process.exit(1); });
