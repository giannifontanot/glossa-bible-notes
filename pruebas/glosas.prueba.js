/* EL PANEL DE LA MARCA.

   Toda marca es una glosa: los dos botones no eligen qué clase de cosa
   estás haciendo, sino cómo se dibuja el texto al que la nota se agarra
   —resaltado o subrayado—. De ahí las dos reglas que se prueban aquí y que
   son casi todo el comportamiento:

   · sin texto no se guarda NADA. Subrayar por accidente y tocar fuera tiene
     que dejar la hoja exactamente como estaba.
   · vaciar una glosa que tenía nota es borrarla, y eso avisa para poder
     deshacerlo.

   Y una tercera que no se ve pero se rompe sola: poner una etiqueta NO puede
   repintar el panel, porque el panel lleva dentro la caja de escribir y
   repintarlo se llevaría por delante el foco, el cursor y lo escrito. */
const { abrir, cerrar, conGlosas, di, vale, titulo } = require('./comun');

/* Abrir el panel sobre las primeras letras de un versículo, como lo abre un
   dedo: se selecciona y se suelta encima. */
const ABRIR = `async (desde = 0, hasta = 15) => {
  const v = document.querySelector('#pgBody .v');
  const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
  while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
  if (!n) return null;
  const r = document.createRange(); r.setStart(n,desde); r.setEnd(n,hasta);
  getSelection().removeAllRanges(); getSelection().addRange(r);
  const rc = r.getBoundingClientRect();
  document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
  await new Promise(z => setTimeout(z, 400));
  return true;
}`;
/* Tocar fuera: el gesto que cobra lo escrito y cierra. */
const FUERA = `async () => {
  document.body.dispatchEvent(new PointerEvent('pointerdown',
    { bubbles:true, clientX:5, clientY:5 }));
  await new Promise(z => setTimeout(z, 400));
}`;
/* Tocar una marca que YA existe: sin selección y en mitad de sus letras. Es
   el otro camino que abre el panel, y el único que llega a una marca sin nota
   —que no pinta nada en el margen y por eso no se puede abrir con dos clics. */
const TOCAR = `async (desde, hasta) => {
  const v = document.querySelector('#pgBody .v');
  const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
  while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
  if (!n) return false;
  const r = document.createRange(); r.setStart(n,desde); r.setEnd(n,hasta);
  const rc = r.getBoundingClientRect();
  getSelection().removeAllRanges();
  document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, clientX:Math.round(rc.left + rc.width/2),
      clientY:Math.round(rc.top + rc.height/2) }));
  await new Promise(z => setTimeout(z, 400));
  return true;
}`;
const guardadas = () => {
  try { return JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]'); }
  catch(e){ return []; }
};

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  titulo('el panel al nacer');
  const base = await p.evaluate(
    () => JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length);
  di('glosas de bienvenida', base);
  di('medida', await p.evaluate(async ([abrir, base]) => {
    await eval('(' + abrir + ')')();
    const m = document.getElementById('menu');
    const modos = [...m.querySelectorAll('.mmodos button')];
    const tags = m.querySelector('.tagbox');
    return {
      salio: getComputedStyle(m).display !== 'none',
      colores: m.querySelectorAll('.mc').length,
      modos: modos.map(b => b.dataset.modo),
      encendido: modos.filter(b => b.classList.contains('on')).map(b => b.dataset.modo),
      hayCaja: !!m.querySelector('#glosaCaja'),
      cajaVacia: (m.querySelector('#glosaCaja')||{}).value === '',
      tagsDormidas: !!tags && tags.classList.contains('dormida'),
      /* nada tocó el almacén todavía: las de la bienvenida y ni una más */
      crecio: JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length - base
    };
  }, [ABRIR, base]).then(r => {
    vale('el panel salió', r.salio);
    vale('con los cuatro colores', r.colores === 4);
    vale('y dos botones, no tres', r.modos.length === 2, r.modos.join(' | '));
    vale('resaltado viene puesto', r.encendido.join() === 'fill', r.encendido);
    vale('la caja de escribir está desde el principio', r.hayCaja && r.cajaVacia);
    vale('las etiquetas duermen sin texto', r.tagsDormidas);
    vale('y no se ha guardado nada', r.crecio === 0, r.crecio);
    return r;
  }));

  titulo('escribir despierta las etiquetas');
  di('tras teclear', await p.evaluate(async () => {
    const ta = document.getElementById('glosaCaja');
    ta.value = 'la primera nota';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 120));
    const tags = document.querySelector('#menu .tagbox');
    return { dormidas: tags.classList.contains('dormida'),
             puntero: getComputedStyle(tags).pointerEvents };
  }).then(r => {
    vale('se despiertan al haber texto', r.dormidas === false);
    vale('y vuelven a responder', r.puntero !== 'none', r.puntero);
    return r;
  }));

  titulo('poner una etiqueta no se lleva lo escrito');
  /* El fallo que esta prueba existe para cazar: el menú de antes se repintaba
     entero al tocar un chip. Con una caja de escribir dentro, repintar es
     perder el texto a media palabra. */
  di('tras tocar un chip', await p.evaluate(async () => {
    const caja = document.querySelector('#menu #tagNueva');
    caja.value = 'promesas';
    caja.dispatchEvent(new Event('change', { bubbles:true }));
    await new Promise(z => setTimeout(z, 150));
    const ta = document.getElementById('glosaCaja');
    const antes = ta.value;
    const chip = document.querySelector('#menu .tg[data-tag="promesas"]');
    if (!chip) return { habiaChip:false };
    /* crearla ya la aplica: el primer toque la quita y el segundo la
       devuelve, que es el vaivén que hay que probar */
    const alCrearla = chip.classList.contains('on');
    chip.click(); await new Promise(z => setTimeout(z, 120));
    const trasUno = document.querySelector('#menu .tg[data-tag="promesas"]').classList.contains('on');
    document.querySelector('#menu .tg[data-tag="promesas"]').click();
    await new Promise(z => setTimeout(z, 120));
    const ahora = document.getElementById('glosaCaja');
    return { habiaChip:true, alCrearla, trasUno,
             trasDos: document.querySelector('#menu .tg[data-tag="promesas"]').classList.contains('on'),
             mismoNodo: ahora === ta, texto: ahora && ahora.value, antes,
             enNegrita: !!document.querySelector('#menu .tg.ultima') };
  }).then(r => {
    vale('la etiqueta nueva salió puesta', r.habiaChip && r.alCrearla);
    vale('un toque la quita y otro la devuelve',
         r.trasUno === false && r.trasDos === true, [r.trasUno, r.trasDos]);
    vale('el textarea es el MISMO nodo', r.mismoNodo);
    vale('y conserva lo escrito', r.texto === r.antes && !!r.texto, r.texto);
    vale('la última usada va en negrita', r.enNegrita);
    return r;
  }));

  titulo('tocar fuera con texto guarda');
  di('tras cerrar', await p.evaluate(async ([fuera, base]) => {
    await eval('(' + fuera + ')')();
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const mia = g.find(x => x.nota === 'la primera nota');
    return { crecio: g.length - base, nota: mia && mia.nota, etiquetas: mia && mia.etiquetas,
             estilo: mia && mia.estilo,
             panelCerrado: getComputedStyle(document.getElementById('menu')).display === 'none' };
  }, [FUERA, base]).then(r => {
    vale('quedó una marca más', r.crecio === 1, r.crecio);
    vale('con su nota', r.nota === 'la primera nota', r.nota);
    vale('y su etiqueta', (r.etiquetas||[]).join() === 'promesas', r.etiquetas);
    vale('el panel se cerró', r.panelCerrado);
    return r;
  }));

  titulo('sin texto no se guarda nada');
  /* La regla que sostiene todo lo demás: un subrayado por accidente no puede
     dejar rastro. Antes de este cambio, tocar "Resaltar" creaba la marca en
     el acto y no había manera de deshacer el gesto salvo borrándola. */
  di('abrir y salir sin escribir', await p.evaluate(async ([abrir, fuera]) => {
    const antes = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length;
    await eval('(' + abrir + ')')(22, 34);
    const abierto = getComputedStyle(document.getElementById('menu')).display !== 'none';
    /* mientras está abierto SÍ se ve el ancla, que es media decisión */
    const seVe = document.querySelectorAll('#pgBody .v').length > 0;
    await eval('(' + fuera + ')')();
    return { antes, abierto, seVe,
             despues: JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length };
  }, [ABRIR, FUERA]).then(r => {
    vale('el panel se abrió', r.abierto);
    vale('y al salir sin escribir no queda nada', r.despues === r.antes,
         r.antes + ' → ' + r.despues);
    return r;
  }));

  titulo('los dos trazos');
  di('elegir línea', await p.evaluate(async ([abrir, fuera]) => {
    await eval('(' + abrir + ')')(40, 54);
    document.querySelector('#menu .mmodos button[data-modo="border"]').click();
    await new Promise(z => setTimeout(z, 120));
    const encendido = [...document.querySelectorAll('#menu .mmodos button')]
      .filter(b => b.classList.contains('on')).map(b => b.dataset.modo);
    const ta = document.getElementById('glosaCaja');
    /* la caja sigue estando: el trazo no la esconde, porque toda marca es
       una glosa y sin nota no hay nada que guardar */
    const hayCaja = !!ta;
    ta.value = 'subrayada'; ta.dispatchEvent(new Event('input', { bubbles:true }));
    await eval('(' + fuera + ')')();
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const nueva = g.find(x => x.nota === 'subrayada');
    return { encendido, hayCaja, estilo: nueva && nueva.estilo, cuantas: g.length };
  }, [ABRIR, FUERA]).then(r => {
    vale('línea queda encendida y sola', r.encendido.join() === 'border', r.encendido);
    vale('la caja de escribir no se esconde', r.hayCaja);
    vale('y se guarda con el trazo elegido', r.estilo === 'border', r.estilo);
    return r;
  }));

  titulo('vaciar una glosa la borra');
  /* La única puerta de salida que tiene una marca, y por eso tiene red:
     el aviso de deshacer. */
  di('borrar por vaciado', await p.evaluate(async ([fuera]) => {
    const g0 = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const objetivo = g0.find(x => x.nota === 'subrayada');
    const gl = document.querySelector('#pgMargin .gl[data-gl="' + objetivo.id + '"]') ||
               document.querySelector('#pgBody .gl[data-gl="' + objetivo.id + '"]');
    if (!gl) return { sinGlosa:true };
    gl.dispatchEvent(new MouseEvent('dblclick', { bubbles:true }));
    await new Promise(z => setTimeout(z, 400));
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    const traia = ta.value;
    ta.value = ''; ta.dispatchEvent(new Event('input', { bubbles:true }));
    const dormidasOtraVez = document.querySelector('#menu .tagbox').classList.contains('dormida');
    await eval('(' + fuera + ')')();
    const g1 = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    return { traia, dormidasOtraVez, antes: g0.length, despues: g1.length,
             sigue: g1.some(x => x.id === objetivo.id),
             deshacer: getComputedStyle(document.getElementById('deshacer')).display !== 'none' };
  }, [FUERA]).then(r => {
    vale('el panel abre con la nota puesta', !r.sinGlosa && !r.sinPanel && r.traia === 'subrayada',
         r.traia);
    vale('vaciarla vuelve a dormir las etiquetas', r.dormidasOtraVez);
    vale('la marca se fue', r.sigue === false, r.antes + ' → ' + r.despues);
    vale('y avisa para poder deshacerlo', r.deshacer);
    return r;
  }));

  titulo('una marca vieja sin nota no se borra por mirarla');
  /* Las marcas de antes de este cambio pueden no tener nota. Su caja nace
     vacía sin que nadie la vacíe, así que la regla de arriba —vaciar es
     borrar— las borraría solo por abrirlas. Se fabrica una quitándole la nota
     a la que acabamos de guardar, que es exactamente como llegan las viejas. */
  await p.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const mia = g.find(x => x.nota === 'la primera nota');
    if (mia){ mia.__vieja = 1; delete mia.nota; }
    localStorage.setItem('glossa:marcas:v1', JSON.stringify(g));
  });
  await p.reload();
  await p.waitForTimeout(2600);
  di('abrirla tocándola y salir', await p.evaluate(async ([tocar, fuera]) => {
    const antes = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const vieja = antes.find(x => x.__vieja);
    if (!vieja) return { sinVieja:true };
    /* se toca en mitad de sus letras: no pinta glosa en el margen, así que
       los dos clics no llegan a ella */
    await eval('(' + tocar + ')')(3, 11);
    const m = document.getElementById('menu');
    const abierto = getComputedStyle(m).display !== 'none';
    const ta = document.getElementById('glosaCaja');
    const cajaVacia = ta ? ta.value === '' : null;
    const dormidas = !!m.querySelector('.tagbox.dormida');
    await eval('(' + fuera + ')')();
    const despues = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    return { abierto, cajaVacia, dormidas,
             sigue: despues.some(x => x.id === vieja.id),
             antes: antes.length, despues: despues.length };
  }, [TOCAR, FUERA]).then(r => {
    vale('el panel se abre tocándola', !r.sinVieja && r.abierto);
    vale('con la caja vacía y las etiquetas dormidas', r.cajaVacia === true && r.dormidas);
    vale('y sigue estando después de mirarla', r.sigue,
         r.antes + ' → ' + r.despues);
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

  /* LA CAJA DE ESCRIBIR ES UN ANTICIPO, y solo lo es si la letra coincide con
     la de la glosa que va a quedar. Ya no vuela desde la esquina de arriba:
     nace dentro del panel, junto a lo que estás glosando. Lo que no cambió es
     que escribir y leer después tienen que ser el mismo cuerpo de letra. */
  di('   de vuelta al principio', await alPrincipio(['eco']));
  di('el editor escribe a un tamaño legible', await p.evaluate(async ([abrir]) => {
    const ok = await eval('(' + abrir + ')')(0, 14);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinCaja:true };
    const enElMargen = document.querySelector('#pgMargin .gl');
    const r = ta.getBoundingClientRect();
    const panel = document.getElementById('menu').getBoundingClientRect();
    return { textarea: parseFloat(getComputedStyle(ta).fontSize),
             margen: enElMargen ? parseFloat(getComputedStyle(enElMargen).fontSize) : null,
             cabeEnElPanel: r.left >= panel.left - 1 && r.right <= panel.right + 1,
             enPantalla: panel.top >= 0 && panel.bottom <= window.innerHeight + 1 };
  }, [ABRIR]).then(r => {
    vale('la caja escribe a tamaño de dedo', !r.sinCaja && !r.sinTexto && r.textarea >= 15,
         r.textarea + ' px');
    vale('y no se sale del panel', r.cabeEnElPanel);
    vale('que cabe en la pantalla', r.enPantalla);
    return r;
  }));

  await cerrar(sesion);
})();
