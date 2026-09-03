/* LAS PIEDRAS: LO QUE SE DEJA SOBRE LA HOJA Y AHÍ SE QUEDA.

   Una cinta SIGUE al lector. Una piedra es lo contrario: se posa donde la
   pones, no se mueve nunca más, y puede haber muchas. Lo que esta prueba
   vigila de verdad son tres cosas que no se ven mirando la pantalla un
   segundo:

   1. QUE SE QUEDE EN SU HOJA. Es toda la diferencia con la cinta, y la única
      manera de comprobarlo es pasar hoja y volver.
   2. QUE EL DEDO DISTINGA TOCAR DE ARRASTRAR. Un toque cambia la forma y un
      arrastre la mueve; los dos empiezan con el mismo pointerdown sobre el
      mismo píxel, así que lo único que los separa es cuánto se movió. Aquí se
      prueban los dos, y que uno no haga lo del otro.
   3. QUE UNA PIEDRA QUIETA NO ESTORBE. Vive encima del papel, que es donde se
      selecciona texto, se abre una glosa y se arrastra la hoja. Una capa que
      se coma esos toques rompe la aplicación entera por un adorno.

   Y la regla de la casa que aquí importa: NADA DE .click() PARA GESTOS. El
   toque y el arrastre van con PointerEvent y su pointerId, porque es
   justamente el camino del puntero lo que se está probando. */
const { abrir, cerrar, cerrarParcial, di, vale, titulo } = require('./comun');

const LLAVE = 'glossa:piedras:v1';

async function andamio(p){
  await p.evaluate(() => {
    window.__pid = 900;
    window.__pausa = ms => new Promise(z => setTimeout(z, ms));
    window.__hoja = () => (window.__estado || '').split('·')[0].trim();
    window.__toque = async (sel) => {
      const e = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!e) return false;
      const r = e.getBoundingClientRect();
      const op = { bubbles:true, cancelable:true, pointerId: ++window.__pid,
                   pointerType:'touch', isPrimary:true,
                   clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
      e.dispatchEvent(new PointerEvent('pointerdown', op));
      await window.__pausa(40);
      e.dispatchEvent(new PointerEvent('pointerup', op));
      e.dispatchEvent(new MouseEvent('click', op));
      return true;
    };
    window.__guardadas = () => {
      try { return JSON.parse(localStorage.getItem('glossa:piedras:v1') || '[]'); }
      catch(e){ return 'ilegible'; }
    };
    window.__hayPiedra = () => !!document.querySelector('.piedra-sitio');
    window.__editando = () => !!document.querySelector('.piedra-sitio.editando');
    /* La piedra medida como la ve el ojo: qué forma, qué tamaño, y DÓNDE está
       en fracciones del papel, que es como se guarda. */
    window.__laPiedra = () => {
      const e = document.querySelector('.piedra-sitio');
      if (!e) return null;
      const b = e.querySelector('.piedra');
      const r = b.getBoundingClientRect();
      const inner = document.querySelector('#pg .pg-inner').getBoundingClientRect();
      return { id: e.dataset.piedra, editando: e.classList.contains('editando'),
               forma: (b.getAttribute('aria-label') || '').split(' en ')[0],
               lado: Math.round(r.width),
               fx: +((r.left + r.width/2 - inner.left) / inner.width).toFixed(3),
               fy: +((r.top + r.height/2 - inner.top) / inner.height).toFixed(3),
               mandos: !!e.querySelector('.piedra-mandos') };
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
      await window.__pausa(1800);
    };
  });
}

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  await andamio(p);

  /* ---------------------------------------------------------------- */
  titulo('poner una piedra');
  const puesta = await p.evaluate(async () => {
    const antes = window.__guardadas().length;
    await window.__toque('#btnHistorial');
    await window.__pausa(600);
    const b = document.querySelector('[data-piedra-nueva]');
    if (!b) return { falta:'no hay botón' };
    const rotulo = b.textContent.trim();
    await window.__toque(b);
    await window.__pausa(900);
    return { antes, rotulo, guardadas: window.__guardadas(),
             rastro: document.getElementById('historial').classList.contains('visible'),
             piedra: window.__laPiedra() };
  });
  di('al poner', puesta.piedra);
  vale('el rastro trae el botón, y dice lo que deja',
       puesta.rotulo === 'piedra', puesta.falta || puesta.rotulo);
  vale('deja una guardada', (puesta.guardadas || []).length === puesta.antes + 1,
       (puesta.guardadas || []).length);
  /* ANCLADA A UN VERSÍCULO Y NO A UN NÚMERO DE HOJA: las hojas se rehacen al
     cambiar la letra o la versión, y «la hoja 7» deja de contener lo que
     contenía. Se guarda el versículo y el sitio en fracciones del papel. */
  vale('ANCLADA A UN VERSÍCULO, no a una hoja',
       !!(puesta.guardadas || [])[0] && puesta.guardadas[0].libro === 'MAT' &&
       Number.isFinite(puesta.guardadas[0].cap) &&
       Number.isFinite(puesta.guardadas[0].vers), puesta.guardadas && puesta.guardadas[0]);
  vale('y con el sitio en fracciones, no en píxeles',
       !!(puesta.guardadas || [])[0] && puesta.guardadas[0].x > 0 &&
       puesta.guardadas[0].x <= 1 && puesta.guardadas[0].y > 0 && puesta.guardadas[0].y <= 1,
       puesta.guardadas && (puesta.guardadas[0].x + ',' + puesta.guardadas[0].y));
  vale('se ve en la hoja', !!puesta.piedra, puesta.piedra);
  /* NACE EN EDICIÓN, y eso es media explicación de cómo funciona: aparece con
     su mando puesto, así que se ve de entrada que se puede mover y cambiar. */
  vale('y NACE EN EDICIÓN, con su mando',
       !!puesta.piedra && puesta.piedra.editando === true && puesta.piedra.mandos === true,
       puesta.piedra);
  vale('el rastro se cierra al ponerla', puesta.rastro === false);

  /* ---------------------------------------------------------------- */
  titulo('un toque cambia la forma, un arrastre la mueve');
  const gesto = await p.evaluate(async () => {
    const cuerpo = () => document.querySelector('.piedra');
    const gesto = async (dx, dy, id) => {
      const b = cuerpo();
      const r = b.getBoundingClientRect();
      const x = r.left + r.width/2, y = r.top + r.height/2;
      const ev = (t, ax, ay) => b.dispatchEvent(new PointerEvent(t,
        { bubbles:true, cancelable:true, pointerId:id, pointerType:'touch',
          isPrimary:true, clientX:ax, clientY:ay }));
      ev('pointerdown', x, y);
      /* Torcido, como un dedo: una recta perfecta no existe. */
      if (dx || dy){
        ev('pointermove', x + dx*.3, y + dy*.35);
        ev('pointermove', x + dx*.7, y + dy*.6);
      }
      ev('pointermove', x + dx, y + dy);
      ev('pointerup', x + dx, y + dy);
      await window.__pausa(320);
    };
    const antes = window.__laPiedra();
    /* Dos píxeles es temblor, no arrastre: tiene que contar como toque. */
    await gesto(2, -1, 71);
    const traToque = window.__laPiedra();
    await gesto(0, 0, 72);
    const traOtro = window.__laPiedra();
    await gesto(-61, 52, 73);
    return { antes, traToque, traOtro, traArrastre: window.__laPiedra(),
             guardada: window.__guardadas()[0] };
  });
  di('las tres formas', [gesto.antes.forma, gesto.traToque.forma, gesto.traOtro.forma]);
  vale('un toque da la siguiente forma', gesto.traToque.forma !== gesto.antes.forma,
       gesto.antes.forma + ' → ' + gesto.traToque.forma);
  vale('y otro toque, otra', gesto.traOtro.forma !== gesto.traToque.forma,
       gesto.traToque.forma + ' → ' + gesto.traOtro.forma);
  vale('las tres son distintas',
       new Set([gesto.antes.forma, gesto.traToque.forma, gesto.traOtro.forma]).size === 3);
  vale('ARRASTRARLA LA MUEVE',
       Math.abs(gesto.traArrastre.fx - gesto.traOtro.fx) > .02 ||
       Math.abs(gesto.traArrastre.fy - gesto.traOtro.fy) > .02,
       gesto.traOtro.fx + ',' + gesto.traOtro.fy + '  →  ' +
       gesto.traArrastre.fx + ',' + gesto.traArrastre.fy);
  /* La otra mitad, y la que se pierde en silencio: arrastrar NO puede además
     cambiarle la forma. Los dos gestos empiezan igual. */
  vale('y el arrastre no le cambia la forma',
       gesto.traArrastre.forma === gesto.traOtro.forma, gesto.traArrastre.forma);
  vale('lo movido queda guardado', gesto.guardada &&
       Math.abs(gesto.guardada.x - gesto.traArrastre.fx) < .02,
       gesto.guardada && gesto.guardada.x);

  /* ---------------------------------------------------------------- */
  titulo('el tamaño');
  const tam = await p.evaluate(async () => {
    const antes = window.__laPiedra().lado;
    await window.__toque('[data-piedra-acc="mas"]'); await window.__pausa(250);
    const mas = window.__laPiedra().lado;
    await window.__toque('[data-piedra-acc="menos"]'); await window.__pausa(250);
    await window.__toque('[data-piedra-acc="menos"]'); await window.__pausa(250);
    const menos = window.__laPiedra().lado;
    /* Y en el suelo, el botón se apaga: no hay tamaño más chico que pedir. */
    const b = document.querySelector('[data-piedra-acc="menos"]');
    return { antes, mas, menos, tope: !!(b && b.disabled),
             guardado: window.__guardadas()[0].tam };
  });
  di('los tamaños', tam);
  vale('«más» la agranda', tam.mas > tam.antes, tam.antes + ' → ' + tam.mas + ' px');
  vale('«menos» la encoge', tam.menos < tam.mas, tam.mas + ' → ' + tam.menos + ' px');
  vale('en el suelo el botón se apaga', tam.tope === true);
  vale('y el escalón queda guardado', Number.isInteger(tam.guardado), tam.guardado);

  /* ---------------------------------------------------------------- */
  titulo('el modo edición se abre con dos toques y se cierra tocando fuera');
  const modo = await p.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await window.__pausa(400);
    const traEscape = window.__editando();
    /* QUIETA, UN TOQUE NO HACE NADA. Es lo que la deja convivir con la hoja:
       si un toque simple abriera la edición, tocar cerca del texto sería
       abrirla sin querer. */
    await window.__toque('.piedra'); await window.__pausa(350);
    const traToqueSimple = window.__editando();
    document.querySelector('.piedra')
      .dispatchEvent(new MouseEvent('dblclick', { bubbles:true, cancelable:true }));
    await window.__pausa(350);
    const traDoble = window.__editando();
    const papel = document.getElementById('pgBody').getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, pointerId:88, pointerType:'touch', isPrimary:true,
        clientX: Math.round(papel.left + 20), clientY: Math.round(papel.top + 20) }));
    await window.__pausa(350);
    return { traEscape, traToqueSimple, traDoble, traFuera: window.__editando() };
  });
  di('el modo edición', modo);
  vale('Escape la cierra', modo.traEscape === false);
  vale('QUIETA, UN TOQUE NO LA ABRE', modo.traToqueSimple === false);
  vale('el doble toque sí', modo.traDoble === true);
  vale('y un toque en el papel la cierra', modo.traFuera === false);

  /* ---------------------------------------------------------------- */
  titulo('se queda en SU hoja: es toda la diferencia con la cinta');
  const hojas = await p.evaluate(async () => {
    const aqui = window.__hoja();
    await window.__pasar('right');
    const otra = { hoja: window.__hoja(), hay: window.__hayPiedra() };
    await window.__pasar('left');
    return { aqui, otra, devuelta: { hoja: window.__hoja(), hay: window.__hayPiedra() } };
  });
  di('al pasar hoja', hojas.aqui + '  →  ' + hojas.otra.hoja + '  →  ' + hojas.devuelta.hoja);
  vale('en la hoja siguiente NO está', hojas.otra.hay === false, hojas.otra);
  vale('y al volver sigue donde estaba',
       hojas.devuelta.hay === true && hojas.devuelta.hoja === hojas.aqui, hojas.devuelta);

  /* ---------------------------------------------------------------- */
  titulo('lo guardado sobrevive a recargar');
  await p.reload();
  await p.waitForTimeout(3200);
  await andamio(p);
  const tras = await p.evaluate(() => ({
    hay: window.__hayPiedra(), guardadas: window.__guardadas().length,
    editando: window.__editando(), piedra: window.__laPiedra() }));
  di('tras recargar', tras.piedra);
  vale('sigue puesta', tras.hay === true && tras.guardadas === 1, tras.guardadas);
  /* Y NO vuelve en edición: nace así al ponerla, que es cuando hace falta
     explicarla, no cada vez que se abre el libro. */
  vale('y no vuelve en modo edición', tras.editando === false);

  /* ---------------------------------------------------------------- */
  titulo('la lista de piedras, desde el pie del rastro');
  const lista = await p.evaluate(async () => {
    await window.__toque('#btnHistorial'); await window.__pausa(600);
    const b = document.querySelector('[data-piedra-lista]');
    if (!b) return { falta:true };
    const rotulo = b.textContent.trim();
    await window.__toque(b); await window.__pausa(700);
    const m = document.getElementById('piedraMenu');
    const st = document.querySelector('.stage').getBoundingClientRect();
    const r = m.getBoundingClientRect();
    return { rotulo, visible: m.classList.contains('visible'),
             filas: m.querySelectorAll('[data-piedra-ir]').length,
             dice: (m.querySelector('.sp-ref') || {}).textContent,
             rastro: document.getElementById('historial').classList.contains('visible'),
             cabe: r.top >= st.top - 1 && r.bottom <= st.bottom + 1 &&
                   r.left >= st.left - 1 && r.right <= st.right + 1 };
  });
  di('la lista', lista);
  vale('el pie trae su puerta', lista.rotulo === 'piedras', lista.falta || lista.rotulo);
  vale('y abre la lista', lista.visible === true);
  vale('con su fila y su referencia',
       lista.filas === 1 && /\d+:\d+/.test(lista.dice || ''), lista.dice);
  /* Igual que la de cintas: el rastro se queda detrás, que cerrarlo era
     demasiada carga visual de golpe. */
  vale('el rastro se queda abierto detrás', lista.rastro === true);
  vale('y cabe entera en la escena', lista.cabe === true);

  const quitada = await p.evaluate(async () => {
    await window.__toque('[data-piedra-quitar]'); await window.__pausa(600);
    return { guardadas: window.__guardadas().length, hay: window.__hayPiedra() };
  });
  di('al quitarla', quitada);
  vale('la equis la quita de la hoja y del almacén',
       quitada.guardadas === 0 && quitada.hay === false, quitada);

  await cerrarParcial(sesion, 'la piedra sola');

  /* ================================================================
     QUE NO ESTORBE, que es lo que rompería la aplicación entera por un
     adorno. La piedra vive encima del papel, y el papel es donde se
     selecciona texto, se abre una glosa y se pasa hoja. */
  const dos = await abrir();
  const q = dos.pagina;
  await q.evaluate(() => {
    const hoy = Date.now();
    localStorage.setItem('glossa:piedras:v1', JSON.stringify([
      { id:'q', libro:'MAT', cap:1, vers:1, x:.12, y:.85, forma:'hoja',
        tam:1, creado:hoy, tocado:hoy }]));
  });
  await q.reload();
  await q.waitForTimeout(3200);
  await andamio(q);

  titulo('con una piedra puesta, la hoja sigue haciendo lo suyo');
  const juntos = await q.evaluate(async () => {
    const hayPiedra = window.__hayPiedra();
    /* LA CAPA NO PUEDE COMERSE NADA. Cubre el papel entero para poder colocar
       por porcentaje, así que sin pointer-events:none se quedaría con la
       selección, el arrastre y el toque que abre una glosa. */
    const capa = document.getElementById('piedrero');
    const pasa = capa ? getComputedStyle(capa).pointerEvents : '(sin capa)';
    const antes = window.__hoja();
    await window.__pasar('right');
    const traPasar = window.__hoja();
    await window.__pasar('left');
    await window.__pausa(400);
    const nAntes = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length;
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
    const rg = document.createRange(); rg.setStart(n, 0); rg.setEnd(n, 15);
    getSelection().removeAllRanges(); getSelection().addRange(rg);
    const rc = rg.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX: Math.round(rc.left + 2), clientY: Math.round(rc.top + 2) }));
    await window.__pausa(500);
    const panel = getComputedStyle(document.getElementById('menu')).display !== 'none';
    const ta = document.getElementById('glosaCaja');
    if (ta){ ta.value = 'con piedra delante';
             ta.dispatchEvent(new Event('input', { bubbles:true })); }
    await window.__pausa(150);
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await window.__pausa(600);
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    return { hayPiedra, pasa, antes, traPasar, vuelta: window.__hoja(), panel,
             creo: g.length - nAntes, sigue: window.__hayPiedra() };
  });
  di('con la piedra delante', juntos);
  vale('la piedra está puesta', juntos.hayPiedra === true);
  vale('LA CAPA DEJA PASAR LOS TOQUES', juntos.pasa === 'none', juntos.pasa);
  vale('el filo sigue pasando hoja', juntos.traPasar !== juntos.antes,
       juntos.antes + '  →  ' + juntos.traPasar);
  vale('y el pliegue devuelve la hoja entera', juntos.vuelta === juntos.antes, juntos.vuelta);
  vale('la glosa se sigue abriendo al seleccionar', juntos.panel === true);
  vale('y se guarda', juntos.creo === 1, juntos.creo);
  vale('con la piedra todavía en su sitio', juntos.sigue === true);

  await cerrar(dos);
})();
