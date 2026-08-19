/* LA CAJA DE ESCRIBIR Y EL VUELO.

   La caja no es un formulario encima de una glosa: ES una glosa. Lleva su
   color, su letra y —esto es lo que costó— el ANCHO QUE VA A TENER en el
   margen. Si el ancho no es el de allá, los renglones parten en otro sitio y
   lo que ves mientras escribes no es un anticipo: es otra cosa.

   Y el vuelo enseña a dónde se guardó. Va lento a propósito —4,5 s— porque lo
   que se está contando no es un cambio de estado, para eso basta un parpadeo,
   sino DÓNDE quedó lo que acabas de escribir. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  titulo('la caja al nacer');
  const caja = await p.evaluate(async () => {
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 20){ n = w.currentNode; break; }
    const r = document.createRange(); r.setStart(n,0); r.setEnd(n,15);
    getSelection().removeAllRanges(); getSelection().addRange(r);
    const rc = r.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:rc.left+2, clientY:rc.top+2 }));
    await new Promise(z => setTimeout(z, 400));
    [...document.querySelectorAll('#menu button')].find(x => /Glosa/.test(x.textContent)).click();
    await new Promise(z => setTimeout(z, 800));
    const c = document.querySelector('.gl-movil'), t = document.querySelector('.gl-tintas');
    if (!c) return null;
    const cs = getComputedStyle(c), rc2 = c.getBoundingClientRect();
    const rt = t && t.getBoundingClientRect();
    const arriba = rt && rt.bottom <= rc2.top + 1;
    return { esGlosa: c.classList.contains('gl'),
             color: [...c.classList].find(x => x.startsWith('g-')),
             letra: cs.fontFamily.split(',')[0],
             sinBoton: !c.querySelector('button'),
             ancho: Math.round(rc2.width),
             izq: Math.round(rc2.left), der: Math.round(window.innerWidth - rc2.right),
             tintas: t ? t.querySelectorAll('[data-color]').length : 0,
             marcada: t ? [...t.querySelectorAll('[data-color]')]
                          .filter(x => x.hasAttribute('data-on')).map(x => x.dataset.color) : null,
             tintasDonde: !rt ? null : (arriba ? 'encima' : 'debajo'),
             tintasSeMontan: rt ? !(rt.bottom <= rc2.top + 1 || rt.top >= rc2.bottom - 1) : null,
             tintasEnPantalla: rt ? rt.top >= 0 && rt.bottom <= window.innerHeight + 1 : null };
  });
  di('medida', caja);
  vale('la caja salió', !!caja);
  vale('es una glosa, no un formulario', caja.esGlosa && caja.sinBoton, caja.letra);
  vale('centrada', Math.abs(caja.izq - caja.der) <= 1, caja.izq + ' / ' + caja.der);
  vale('con los cuatro colores', caja.tintas === 4, caja.marcada);
  vale('la fila de colores no se monta', caja.tintasSeMontan === false, caja.tintasDonde);
  vale('y cabe en la pantalla', caja.tintasEnPantalla);

  titulo('elegir color no cierra la caja');
  di('tras tocar otro color', await p.evaluate(async () => {
    const t = document.querySelector('.gl-tintas');
    const otro = [...t.querySelectorAll('[data-color]')].find(x => !x.hasAttribute('data-on'));
    const ta = document.querySelector('.gl-movil textarea');
    ta.value = 'una nota de otro color';
    const arribaAntes = document.querySelector('.gl-movil').style.top;
    const r = otro.getBoundingClientRect();
    /* pointerdown y no click: si el botón se llevara el foco, el textarea lo
       perdería y perder el foco es lo que cierra la glosa y la echa a volar */
    otro.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerId:41,
      pointerType:'touch', isPrimary:true, clientX:r.left+r.width/2, clientY:r.top+r.height/2 }));
    await new Promise(z => setTimeout(z, 400));
    const c = document.querySelector('.gl-movil');
    const rc = c && c.getBoundingClientRect();
    return { sigueAhi: !!c, pedido: otro.dataset.color,
             color: c && [...c.classList].find(x => x.startsWith('g-')),
             texto: c && c.querySelector('textarea').value,
             noSeMovio: c && c.style.top === arribaAntes,
             sigueCentrada: rc ? Math.abs(rc.left - (window.innerWidth - rc.right)) <= 1 : null };
  }).then(r => {
    vale('la caja sigue abierta', r.sigueAhi);
    vale('cambió de color', r.color === 'g-' + r.pedido, r.color);
    vale('sin perder el texto', r.texto === 'una nota de otro color');
    vale('sin moverse de sitio', r.noSeMovio && r.sigueCentrada);
    return r;
  }));

  titulo('el vuelo');
  const vuelo = await p.evaluate(async () => {
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:200, clientY:700 }));
    await new Promise(z => setTimeout(z, 140));
    const c = document.querySelector('.gl-movil');
    if (!c) return null;
    const an = c.getAnimations()[0];
    if (!an) return null;
    const dur = an.effect.getTiming().duration;
    const donde = f => { an.currentTime = dur*f;
      const m = new DOMMatrix(getComputedStyle(c).transform);
      return { x:Math.round(m.m41), y:Math.round(m.m42) }; };
    const P = [0,.25,.5,.75,1].map(donde);
    an.currentTime = 140; an.play();
    return { dur, curva: an.effect.getTiming().easing, P };
  });
  di('duración', vuelo && vuelo.dur + ' ms, curva ' + vuelo.curva);
  /* EL MARGEN ES ANCHO A PROPÓSITO, y no se estrecha aunque hoy valga 2400.
     Lo que esta prueba tiene que cazar es que alguien devuelva el vuelo a los
     900 ms del principio —que era una nota escapándose—, no afinar el gusto:
     entre 1800 y 3600 la cifra exacta se decide mirando el teléfono, no aquí.
     Una prueba clavada al valor del día falla cada vez que se ajusta algo que
     iba bien, y eso enseña a cambiar el número sin leer el fallo. */
  vale('lento a propósito', vuelo && vuelo.dur >= 1800 && vuelo.dur <= 3600,
       vuelo && vuelo.dur + ' ms');
  if (vuelo){
    const fin = vuelo.P[4], largo = Math.hypot(fin.x, fin.y) || 1;
    /* Sin rodeo: el desvío respecto de la recta salida-llegada. El vuelo pasaba
       por el centro de la hoja y se quitó — a esta velocidad, el rodeo se lee
       como una nota dando un paseo. */
    const desvio = vuelo.P.map(q => Math.abs(q.x*fin.y - q.y*fin.x) / largo);
    di('desvío de la recta', desvio.map(d => Math.round(d) + 'px').join(' · '));
    vale('va derecha a su sitio', Math.max(...desvio) < 24, Math.round(Math.max(...desvio)) + ' px');
    /* Y el reparto: ningún cuarto se come el camino. Con dos tramos, el último
       llegaba a llevarse el 41% —una nota acelerando justo al llegar—. */
    const acum = vuelo.P.map(q => Math.hypot(q.x, q.y) / largo);
    const tramos = acum.slice(1).map((x,i) => Math.round((x - acum[i])*100));
    di('camino por cuarto', tramos.map(x => x + '%').join(' · '));
    vale('sin tirón en ningún cuarto', Math.max(...tramos) <= 40, Math.max(...tramos) + '%');
  }
  await p.waitForTimeout(5200);
  di('al aterrizar', await p.evaluate(() => ({
    cajaFuera: !document.querySelector('.gl-movil'),
    tintasFuera: !document.querySelector('.gl-tintas'),
    ningunaEscondida: [...document.querySelectorAll('.gl')]
      .every(g => getComputedStyle(g).visibility !== 'hidden'),
    guardada: (JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')[0]||{}).nota
  })).then(r => {
    vale('la caja se recoge', r.cajaFuera && r.tintasFuera);
    vale('ninguna glosa queda escondida', r.ningunaEscondida);
    vale('y la nota quedó guardada', !!r.guardada, r.guardada);
    return r;
  }));

  await cerrar(sesion);
})();
