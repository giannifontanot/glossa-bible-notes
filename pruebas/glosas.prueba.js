/* LA CAJA DE ESCRIBIR Y EL VUELO.

   La caja no es un formulario encima de una glosa: ES una glosa. Lleva su
   color, su letra y —esto es lo que costó— el ANCHO QUE VA A TENER en el
   margen. Si el ancho no es el de allá, los renglones parten en otro sitio y
   lo que ves mientras escribes no es un anticipo: es otra cosa.

   Y el vuelo enseña a dónde se guardó. Va lento a propósito —4,5 s— porque lo
   que se está contando no es un cambio de estado, para eso basta un parpadeo,
   sino DÓNDE quedó lo que acabas de escribir. */
const { abrir, cerrar, conGlosas, di, vale, titulo } = require('./comun');

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

  titulo('la glosa al margen: nota, ancla y etiqueta');
  /* LAS TRES PARTES SE DISTINGUEN POR FAMILIA Y POSICIÓN, no por peso y
     opacidad. Venían separadas solo por esos dos, que son los recursos más
     débiles que hay: sobre tinte claro la negrita apenas oscurece y la opacidad
     no dice «otra clase de cosa», dice «lo mismo pero apagado». De ahí que la
     etiqueta se leyera como el final de la frase.

     Y aquí van tres comprobaciones que no son de gusto sino de fallo:

     · QUE LA ETIQUETA NO SE SALGA. «#Interesante» es un token sin puntos de
       corte y en el margen se desbordaba; .pg-margin lo recortaba y aparecía
       «#Interesant». Se probó en el teléfono del autor.
     · QUE NO SE ARREGLE CON overflow-wrap. Está prohibido: medirPalabras toma
       solo rects[0], así que una palabra partida pierde su segunda mitad en la
       foto del pliegue. La salida es <wbr>, que parte el nodo de texto.
     · QUE LA ETIQUETA NO USE opacity. La opacidad no viaja al lienzo —solo el
       color calculado—, así que con opacity la etiqueta se veía al 62% en la
       hoja y al 100% en la foto: cambiaba de tono al voltear la hoja. */
  await conGlosas(p);
  di('las tres partes', await p.evaluate(() => {
    const g = document.querySelector('#pgMargin .gl');
    if (!g) return { sinGlosa:true };
    const fam = e => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g,'');
    const ref = g.querySelector('.gl-ref'), tag = g.querySelector('.gl-tag');
    const cs = getComputedStyle(g);
    return { nota:{ familia:fam(g), tam:cs.fontSize, interlinea:cs.lineHeight },
             ancla: ref ? { familia:fam(ref), tam:getComputedStyle(ref).fontSize } : null,
             etiqueta: tag ? { familia:fam(tag), tam:getComputedStyle(tag).fontSize,
                               display:getComputedStyle(tag).display,
                               alineacion:getComputedStyle(tag).textAlign,
                               opacidad:+getComputedStyle(tag).opacity,
                               color:getComputedStyle(tag).color } : null,
             /* la corrección prohibida, por si alguien la reintroduce */
             corteDePalabra: cs.overflowWrap + ' / ' + cs.wordBreak };
  }).then(r => {
    /* UNA ESCALERA DE TAMAÑOS, que es lo que separa las tres partes ahora que
       comparten familia. Se comprueba el orden, no las cifras: los valores van
       en em sobre --fs y cambian con el ajuste de letra del libro. */
    const t = x => parseFloat(x);
    vale('el ancla es más chica que la nota',
         !r.sinGlosa && r.ancla && t(r.ancla.tam) < t(r.nota.tam),
         r.sinGlosa ? 'sin glosa' : r.nota.tam + ' → ' + (r.ancla||{}).tam);
    if (r.etiqueta){
      vale('y la etiqueta más chica que el ancla',
           t(r.etiqueta.tam) < t(r.ancla.tam),
           r.ancla.tam + ' → ' + r.etiqueta.tam);
      vale('va en su propio renglón', r.etiqueta.display === 'block', r.etiqueta.display);
      vale('y alineada a la derecha', r.etiqueta.alineacion === 'right', r.etiqueta.alineacion);
      /* opacity no viaja al lienzo; el alfa tiene que ir DENTRO del color */
      vale('se aclara con color, no con opacity',
           r.etiqueta.opacidad === 1 && /rgba\(/.test(r.etiqueta.color),
           'opacity ' + r.etiqueta.opacidad + ' · ' + r.etiqueta.color);
    }
    vale('sin overflow-wrap, que rompería la foto del pliegue',
         r.corteDePalabra === 'normal / normal', r.corteDePalabra);
    return r;
  }));

  /* QUE NO SE RECORTE, en el margen estrecho y con la letra al máximo, que es
     donde se rompía. Se mide contra la caja Y contra la columna. */
  for (const fs of [15, 26]){
    di('etiqueta larga, letra ' + fs, await p.evaluate(async fs => {
      const clave = Object.keys(localStorage).find(k => /ajuste|cfg/i.test(k)) || 'glossa:ajustes:v1';
      const a = JSON.parse(localStorage.getItem(clave) || '{}');
      a.fontSize = fs; localStorage.setItem(clave, JSON.stringify(a));
      const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
      if (M[0]) M[0].etiquetas = ['ConsideracionesFinales', 'oración diaria'];
      localStorage.setItem('glossa:marcas:v1', JSON.stringify(M));
      location.reload();
      return true;
    }, fs).then(async () => {
      await p.waitForTimeout(2800);
      return p.evaluate(() => {
        const g = document.querySelector('#pgMargin .gl');
        if (!g) return { sinGlosa:true };
        const r = g.getBoundingClientRect();
        const col = document.getElementById('pgMargin').getBoundingClientRect();
        const t = g.querySelector('.gl-tag');
        return { letra:getComputedStyle(g).fontSize,
                 etiquetaSeSaleDeLaCaja: t ? Math.max(0, Math.round(t.getBoundingClientRect().right - r.right)) : null,
                 glosaSeSaleDeLaColumna: Math.max(0, Math.round(r.right - col.right)),
                 conWbr: !!g.querySelector('.gl-tag wbr') };
      });
    }).then(r => {
      vale('la etiqueta no se sale de la caja · ' + fs,
           !r.sinGlosa && r.etiquetaSeSaleDeLaCaja === 0, r.etiquetaSeSaleDeLaCaja);
      vale('ni la glosa de la columna · ' + fs,
           !r.sinGlosa && r.glosaSeSaleDeLaColumna === 0, r.glosaSeSaleDeLaColumna);
      vale('y la etiqueta larga lleva su <wbr> · ' + fs, r.conWbr === true);
      return r;
    }));
  }

  /* LA MEDIDA QUE GUARDA LA FOTO DEL PLIEGUE. La caja de la glosa no se dibuja
     midiendo palabras como el texto: la COMPONE el motor a partir del marcado,
     así que si la letra se resolviera distinto dentro del SVG que en la hoja
     viva, el recuadro saldría de otro alto que sus propias letras. Se compone
     aquí el mismo marcado con la misma hoja de estilos y se comparan los dos
     altos. Cero es lo único que vale. */
  di('la caja compone al mismo alto', await p.evaluate(async () => {
    const vivo = document.querySelector('#pgMargin .gl');
    if (!vivo) return { sinGlosa:true };
    const alto = vivo.getBoundingClientRect().height;
    const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
    const inner = document.querySelector('#pg .pg-inner');
    const f = document.createElement('iframe');
    f.style.cssText = 'position:absolute;left:-9999px;width:' + inner.offsetWidth +
                      'px;height:' + inner.offsetHeight + 'px';
    document.body.appendChild(f);
    f.contentDocument.open();
    f.contentDocument.write('<style>' + css + '</style><div id="pg" class="pg" style="--fs:' +
      getComputedStyle(document.getElementById('pg')).getPropertyValue('--fs') + '">' +
      inner.outerHTML + '</div>');
    f.contentDocument.close();
    await new Promise(z => setTimeout(z, 700));
    const g2 = f.contentDocument.querySelector('.gl');
    const r = g2 ? g2.getBoundingClientRect().height : null;
    const fam = g2 ? getComputedStyle(g2).fontFamily.split(',')[0].replace(/["']/g,'') : null;
    f.remove();
    return { enLaHoja:Math.round(alto), alComponer:r === null ? null : Math.round(r),
             familiaAlComponer:fam };
  }).then(r => {
    vale('el mismo alto a los dos lados',
         !r.sinGlosa && r.alComponer === r.enLaHoja,
         r.enLaHoja + ' contra ' + r.alComponer);
    return r;
  }));

  /* SE VUELVE AL PRINCIPIO ANTES DE SEGUIR. La sección de arriba dejó la letra
     en 26 y las de abajo necesitan una hoja con su glosa a la vista; sin esto
     medían una pantalla sin glosas y cantaban fallos que no existen —pasó al
     escribirlas—. Se comprueba que de verdad hay glosa antes de continuar, que
     es la diferencia entre reiniciar y creer que se reinició. */
  const alPrincipio = async (etiquetas) => {
    await p.evaluate(etiquetas => {
      const clave = Object.keys(localStorage).find(k => /ajuste|cfg/i.test(k)) || 'glossa:ajustes:v1';
      const a = JSON.parse(localStorage.getItem(clave) || '{}');
      a.fontSize = 15; localStorage.setItem(clave, JSON.stringify(a));
      const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
      if (M[0] && etiquetas) M[0].etiquetas = etiquetas;
      localStorage.setItem('glossa:marcas:v1', JSON.stringify(M));
      location.reload();
    }, etiquetas);
    await p.waitForTimeout(2900);
    /* Y SE VUELVE A LA PRIMERA HOJA. Recargar no la devuelve: el programa
       recuerda dónde estabas, así que después de la sección que pasa hoja las
       siguientes empezaban en Mateo 1:15, sin ninguna glosa a la vista, y
       medían una pantalla vacía. */
    await p.evaluate(async () => {
      for (let i = 0; i < 8; i++){
        if (document.getElementById('cantoIzq').classList.contains('viva')) return;
        const e = document.getElementById('edgeL'), r = e.getBoundingClientRect();
        const o = { bubbles:true, pointerId:40+i, pointerType:'touch', isPrimary:true,
                    clientX:Math.round(r.left + r.width/2), clientY:450 };
        e.dispatchEvent(new PointerEvent('pointerdown', o));
        await new Promise(z => setTimeout(z, 70));
        e.dispatchEvent(new PointerEvent('pointerup', o));
        await new Promise(z => setTimeout(z, 1600));
      }
    });
    return p.evaluate(() => ({
      hoja: document.getElementById('pgCabeza').textContent.trim(),
      glosas: document.querySelectorAll('#pgMargin .gl').length,
      letra: getComputedStyle(document.querySelector('#pgMargin .gl') || document.body).fontSize }));
  };

  /* QUE LA FOTO DEL PLIEGUE SE HAGA, que es distinto de que la caja mida bien.

     Aquí falló mi comprobación anterior y por eso esta prueba existe. Medí el
     alto componiendo el marcado en un IFRAME, que usa el parser de HTML y es
     indulgente. Pero la foto no viaja así: buildSVG arma una cadena y la manda
     como data:image/svg+xml, y eso lo lee un parser de XML, donde un elemento
     sin cerrar no es un vacío sino un error FATAL. Con <wbr> el SVG entero
     dispara onerror y se queda sin foto, así que cualquier hoja con una
     etiqueta larga pierde la animación de pasar página. Medir el alto no lo
     habría visto nunca, y por eso esto se prueba DE PUNTA A PUNTA: se pone una
     etiqueta larga, se pasa hoja, y se mira si el lienzo llegó a dibujar.
     Lo levantó la revisión de Codex. */
  di('   de vuelta al principio', await alPrincipio(['ConsideracionesFinales']));
  di('pasar hoja con una etiqueta larga', await (async () => {
    return p.evaluate(async () => {
      const hayEtiquetaLarga = !!document.querySelector('#pgMargin .gl-tag wbr');
      const fx = document.getElementById('fx'), g = fx.getContext('2d');
      const e = document.getElementById('edgeR'), r = e.getBoundingClientRect();
      const op = { bubbles:true, pointerId:55, pointerType:'touch', isPrimary:true,
                   clientX:Math.round(r.left + r.width/2), clientY:450 };
      e.dispatchEvent(new PointerEvent('pointerdown', op));
      await new Promise(z => setTimeout(z, 70));
      e.dispatchEvent(new PointerEvent('pointerup', op));
      /* se retrata muchas veces y se guarda el cuadro con más tinta: el giro no
         empieza en el mismo milisegundo cada vez */
      let mas = 0, seEncendio = false;
      for (let k = 0; k < 30; k++){
        await new Promise(z => setTimeout(z, 40));
        if (getComputedStyle(fx).display === 'none') continue;
        seEncendio = true;
        const d = g.getImageData(0, 0, fx.width, Math.min(fx.height, 1200)).data;
        let n = 0;
        for (let q = 0; q < d.length; q += 32) if (d[q+3] > 40) n++;
        if (n > mas) mas = n;
      }
      await new Promise(z => setTimeout(z, 1500));
      return { hayEtiquetaLarga, seEncendioElLienzo:seEncendio, tinta:mas };
    });
  })().then(r => {
    vale('la hoja lleva de verdad una etiqueta partida', r.hayEtiquetaLarga === true);
    /* Sin foto, el lienzo se queda en blanco: es la señal de que el SVG no
       parseó. Con foto, el giro dibuja papel y letra. */
    vale('la foto del pliegue se dibuja', r.tinta > 500, r.tinta + ' píxeles');
    return r;
  }));

  /* LAS ETIQUETAS SE PARTEN POR GRAFEMAS, no por unidades de UTF-16. length y
     slice cuentan pares de bytes, así que un emoji se puede cortar por la mitad
     y con un <wbr/> en medio los dos trozos ya no se recomponen: salen dos
     rombos de reemplazo. Las escribe el lector y pueden llevar lo que sea.
     Se mira el DOM y no el texto: textContent vuelve a pegar los trozos y
     disimularía el corte. Lo que delata es un nodo de texto que TERMINA en la
     mitad alta de un par suplente, o que EMPIEZA en la baja. */
  di('   de vuelta al principio', await alPrincipio(['abcdefghij\u{1F600}kl']));
  di('una etiqueta con emoji', await (async () => {
    return p.evaluate(() => {
      const t = document.querySelector('#pgMargin .gl-tag .gl-t');
      if (!t) return { sinEtiqueta:true };
      const trozos = [...t.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent);
      return { trozos, texto:t.textContent,
               parSuplentePartido: trozos.some(x => /[\uD800-\uDBFF]$/.test(x)) ||
                                   trozos.some(x => /^[\uDC00-\uDFFF]/.test(x)) };
    });
  })().then(r => {
    vale('el emoji no se parte por la mitad',
         !r.sinEtiqueta && r.parSuplentePartido === false,
         JSON.stringify(r.trozos));
    return r;
  }));

  /* LA CAJA DE ESCRIBIR ES UN ANTICIPO, y solo lo es si la letra coincide. Le
     llega el tamaño por --fs y no como font-size ya hecho: hecho, pisaba el
     factor con el que .gl calcula, y se escribía a 15 para leerse a 13,95 —los
     renglones partían en otro sitio y la caja cambiaba de alto justo al
     cerrar—. */
  di('   de vuelta al principio', await alPrincipio(['eco']));
  di('el editor escribe del tamaño en que se leerá', await p.evaluate(async () => {
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
    const bot = [...document.querySelectorAll('#menu button')].find(x => /Glosa/.test(x.textContent));
    if (!bot) return { sinBoton:true };
    bot.click(); await new Promise(z => setTimeout(z, 800));
    const caja = document.querySelector('.gl-movil');
    if (!caja) return { sinCaja:true };
    const enElMargen = document.querySelector('#pgMargin .gl');
    return { caja: getComputedStyle(caja).fontSize,
             textarea: getComputedStyle(caja.querySelector('textarea')).fontSize,
             margen: enElMargen ? getComputedStyle(enElMargen).fontSize : null };
  }).then(r => {
    vale('la caja y el margen, del mismo cuerpo',
         !r.sinCaja && !r.sinTexto && !r.sinBoton && r.caja === r.margen,
         r.caja + ' contra ' + r.margen);
    vale('y el textarea con ellos', r.textarea === r.caja, r.textarea);
    return r;
  }));

  await cerrar(sesion);
})();
