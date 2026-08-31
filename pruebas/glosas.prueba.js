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
const { abrir, cerrar, cerrarParcial, conGlosas, di, vale, titulo } = require('./comun');

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

  /* ================================================================
     LA SELECCIÓN QUE LLEGA TARDE, que es como llega en el teléfono.

     En escritorio la selección ya existe cuando se suelta el ratón, y el
     gesto la lee ahí mismo. En Android no: el sistema termina de armarla
     DESPUÉS del pointerup —es cuando salen los tiradores— así que al
     preguntar no hay nada y el gesto se va de vacío. El lector hace entonces
     lo natural, tocar lo que acaba de seleccionar para confirmarlo, y ese
     toque la deshace antes de que nadie la lea.

     Medido con el código anterior: seleccionabas, tocabas, se abría una caja
     —la de otra glosa, o ninguna— y lo seleccionado no se guardaba nunca.

     Se prueba en ese orden exacto, con el pointerup ANTES de la selección,
     porque el orden es el fallo. */
  titulo('seleccionar en el teléfono: la selección llega tras soltar');
  const tarde = await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const lee = () => { try { return JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]'); }
                        catch(e){ return []; } };
    const base = lee().length;
    const v = document.querySelectorAll('#pgBody .v')[3];
    const t = [...v.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim().length > 25);
    if (!t) return { error:'sin versículo largo' };
    const rg = document.createRange(); rg.setStart(t, 2); rg.setEnd(t, 18);
    const c = rg.getBoundingClientRect();
    const x0 = c.left + 2, x1 = c.right - 2, y = c.top + c.height/2, mx = (x0 + x1)/2;
    const op = (id, x) => ({ bubbles:true, pointerId:id, pointerType:'touch',
                             isPrimary:true, clientX:x, clientY:y });
    /* El arrastre suelta SIN selección todavía. */
    v.dispatchEvent(new PointerEvent('pointerdown', op(70, x0)));
    v.dispatchEvent(new PointerEvent('pointermove', op(70, x1)));
    v.dispatchEvent(new PointerEvent('pointerup',   op(70, x1)));
    await pausa(150);
    /* Y ahora sí la pone el sistema. */
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
    const texto = sel.toString();
    await pausa(300);
    const trasSoltar = { panel: getComputedStyle(document.getElementById('menu')).display,
                         guardadas: lee().length };
    /* El toque de confirmar, encima de lo seleccionado. Y LA SELECCIÓN SE
       DESHACE EN MEDIO, entre el pointerdown y el pointerup, que es lo que
       hace el navegador de verdad y lo que rompía el guardado. Un
       PointerEvent despachado a mano no trae la acción por defecto que la
       deshace, así que sin esta línea la selección seguiría puesta al
       preguntar: el programa tomaría el camino de siempre —el del
       arrastre— y esta prueba pasaría en verde aunque el arreglo no
       existiera. */
    const el = document.elementFromPoint(mx, y);
    el.dispatchEvent(new PointerEvent('pointerdown', op(71, mx)));
    await pausa(30);
    getSelection().removeAllRanges();
    await pausa(60);
    const deshecha = getSelection().toString();
    el.dispatchEvent(new PointerEvent('pointerup', op(71, mx)));
    await pausa(450);
    const caja = document.getElementById('glosaCaja');
    const abrio = !!caja;
    if (caja){
      caja.value = 'lo que seleccioné';
      caja.dispatchEvent(new Event('input', { bubbles:true }));
      await pausa(200);
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      await pausa(700);
    }
    const puesta = lee().find(m => (m.nota||'') === 'lo que seleccioné') || null;
    return { base, texto, deshecha, trasSoltar, abrio, puesta, guardadas: lee().length };
  });
  di('lo seleccionado', tarde.texto);
  di('la glosa que quedó', tarde.puesta && tarde.puesta.cita);
  vale('y al tocar ya no había selección', tarde.deshecha === '',
       '«' + tarde.deshecha + '»');
  vale('el toque abre la caja', tarde.abrio);
  vale('y lo escrito se guarda', tarde.guardadas === tarde.base + 1,
       tarde.base + ' → ' + tarde.guardadas);
  vale('SOBRE LO QUE SE HABÍA SELECCIONADO',
       !!tarde.puesta && tarde.puesta.cita === tarde.texto,
       (tarde.puesta && tarde.puesta.cita) + '  vs  ' + tarde.texto);

  titulo('y un toque lejos de lo seleccionado no inventa nada');
  /* La otra mitad: la selección recordada solo vale para el toque que cae
     ENCIMA de ella. Tocar en otro sitio sigue queriendo decir lo de siempre. */
  const lejos = await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const lee = () => { try { return JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]'); }
                        catch(e){ return []; } };
    const base = lee().length;
    const v = document.querySelectorAll('#pgBody .v')[5];
    const t = [...v.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim().length > 25);
    const rg = document.createRange(); rg.setStart(t, 2); rg.setEnd(t, 16);
    const c = rg.getBoundingClientRect();
    const op = (id, x, y) => ({ bubbles:true, pointerId:id, pointerType:'touch',
                                isPrimary:true, clientX:x, clientY:y });
    v.dispatchEvent(new PointerEvent('pointerup', op(80, c.right, c.top + c.height/2)));
    await pausa(120);
    getSelection().removeAllRanges(); getSelection().addRange(rg);
    await pausa(300);
    /* Un toque muy por debajo: otro versículo, lejos de lo marcado. Y la
       selección se deshace en medio, como la deshace el navegador: sin eso
       el programa vería una selección viva y estaría probándose el camino
       del arrastre, que no es el de aquí. */
    const otro = document.querySelectorAll('#pgBody .v')[9] ||
                 document.querySelectorAll('#pgBody .v')[7];
    const r2 = otro.getBoundingClientRect();
    const x = Math.round(r2.left + r2.width/2), y = Math.round(r2.top + r2.height/2);
    const el = document.elementFromPoint(x, y) || otro;
    el.dispatchEvent(new PointerEvent('pointerdown', op(81, x, y)));
    await pausa(30);
    getSelection().removeAllRanges();
    await pausa(60);
    el.dispatchEvent(new PointerEvent('pointerup', op(81, x, y)));
    await pausa(450);
    const caja = document.getElementById('glosaCaja');
    if (caja) document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await pausa(500);
    const trasElLejano = lee().length;
    /* Y AHORA LA VUELTA: tocar OTRA VEZ, ya encima de lo que se había
       seleccionado. El toque de antes fue una cancelación —el lector tocó en
       otro sitio—, así que lo apuntado tiene que estar olvidado. Si
       sobreviviera, este segundo toque abriría una glosa sobre unas palabras
       que hace rato dejaron de estar seleccionadas: una marca que nadie
       pidió. */
    const c2 = rg.getBoundingClientRect();
    const vx = Math.round(c2.left + c2.width/2), vy = Math.round(c2.top + c2.height/2);
    const el2 = document.elementFromPoint(vx, vy) || v;
    el2.dispatchEvent(new PointerEvent('pointerdown', op(82, vx, vy)));
    await pausa(30);
    el2.dispatchEvent(new PointerEvent('pointerup', op(82, vx, vy)));
    await pausa(450);
    const caja2 = document.getElementById('glosaCaja');
    const abrioCaja = !!caja2;
    if (caja2) document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await pausa(500);
    return { base, trasElLejano, abrioCaja, guardadas: lee().length };
  });
  vale('no se guarda ninguna glosa nueva', lejos.trasElLejano === lejos.base,
       lejos.base + ' → ' + lejos.trasElLejano);
  vale('y volver a tocarla ya no la resucita', !lejos.abrioCaja &&
       lejos.guardadas === lejos.base, lejos.base + ' → ' + lejos.guardadas +
       (lejos.abrioCaja ? '  (¡abrió la caja!)' : ''));

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
    /* Las MISMAS variables que declara la raíz del SVG del pliegue. La letra
       de la glosa se separó de la del texto (--fs-glosa), y componiendo solo
       con --fs la caja salía del alto que le tocaría a la letra del cuerpo:
       113 contra 310. Si mañana se separa otra, va aquí. */
    const cs = getComputedStyle(document.getElementById('pg'));
    const vars = ['--fs', '--fs-glosa', '--lh', '--ali', '--cols']
      .map(k => k + ':' + cs.getPropertyValue(k).trim())
      .filter(x => !x.endsWith(':')).join(';');
    f.contentDocument.write('<style>' + css + '</style><div id="pg" class="pg" style="' +
      vars + '">' + inner.outerHTML + '</div>');
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

  /* EL ANTICIPO ES LA GLOSA, y eso se comprueba MIDIENDO LAS DOS, no leyendo
     el CSS. Dos cosas tienen que coincidir o esto deja de ser un anticipo: el
     cuerpo de letra —si no, se escribe a un tamaño y se lee a otro— y el
     ANCHO, que es el que decide por dónde parten los renglones. Aquí estuvo el
     fallo viejo: se escribía en una caja de 16px y quedaba una nota de 13.95,
     así que lo que veías mientras escribías no era lo que iba a quedar. */
  di('   de vuelta al principio', await alPrincipio(['eco']));
  /* Las glosas AL MARGEN: es la única disposición donde la comparación
     significa algo, porque es la que tiene un ancho de columna que el
     anticipo debe copiar. */
  await p.evaluate(async () => {
    const b = [...document.querySelectorAll('[data-lay]')].find(x => x.dataset.lay === 'margin');
    if (b) b.click();
    await new Promise(z => setTimeout(z, 1200));
  });
  di('el anticipo mide lo que medirá la glosa', await p.evaluate(async ([abrir, fuera, tocar]) => {
    /* Primero se deja una glosa puesta, para tener con qué comparar; luego se
       vuelve a abrir TOCÁNDOLA y se miden las dos a la vez. Comparar contra
       una glosa cualquiera de la hoja no valdría: hay que comparar el anticipo
       con la nota EN LA QUE SE CONVIERTE. */
    const ok = await eval('(' + abrir + ')')(0, 14);
    if (!ok) return { sinTexto:true };
    const ta0 = document.getElementById('glosaCaja');
    ta0.value = 'para medir contra el margen';
    ta0.dispatchEvent(new Event('input', { bubbles:true }));
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));      /* que aterrice el vuelo */
    const enElMargen = document.querySelector('#pgMargin .gl[data-gl]');
    if (!enElMargen) return { sinMargen:true };
    const rm = enElMargen.getBoundingClientRect();
    const tamMargen = parseFloat(getComputedStyle(enElMargen).fontSize);
    await eval('(' + tocar + ')')(3, 11);
    const vista = document.getElementById('glVista');
    const ta = document.getElementById('glosaCaja');
    if (!vista || !ta) return { sinCaja:true };
    const panel = document.getElementById('menu').getBoundingClientRect();
    const r = vista.getBoundingClientRect();
    return { vista: parseFloat(getComputedStyle(vista).fontSize),
             textarea: parseFloat(getComputedStyle(ta).fontSize),
             margen: tamMargen,
             traeLaNota: ta.value,
             anchoVista: Math.round(r.width),
             anchoMargen: Math.round(rm.width),
             cabeEnElPanel: r.left >= panel.left - 1 && r.right <= panel.right + 1,
             anchoPanel: Math.round(panel.width),
             enPantalla: panel.top >= 0 && panel.bottom <= window.innerHeight + 1 };
  }, [ABRIR, FUERA, TOCAR]).then(r => {
    vale('el panel reabre con su nota', !r.sinTexto && !r.sinMargen && !r.sinCaja &&
         r.traeLaNota === 'para medir contra el margen', r.traeLaNota);
    vale('el mismo cuerpo que la glosa del margen',
         r.margen && Math.abs(r.vista - r.margen) < 0.6,
         r.vista + ' contra ' + r.margen);
    vale('y el textarea con él', Math.abs(r.textarea - r.vista) < 0.6, r.textarea);
    /* Unos píxeles de tolerancia: el margen se mide con su hueco de giro y el
       anticipo lo calcula, así que redondean distinto. */
    vale('y el mismo ancho, que es lo que parte los renglones',
         r.anchoMargen && Math.abs(r.anchoVista - r.anchoMargen) <= 3,
         r.anchoVista + ' contra ' + r.anchoMargen);
    vale('sin salirse del panel', r.cabeEnElPanel);
    vale('que cabe en la pantalla', r.enPantalla);
    /* Y EL PANEL MIDE LO QUE MIDE LA GLOSA. Es lo que lo convierte en «esta
       nota y sus mandos» en vez de en «un panel que además enseña una nota»:
       los dos filos son los mismos de arriba abajo. Lo que sobra es solo el
       relleno del panel. */
    vale('y el panel mide lo que la glosa',
         r.anchoPanel && r.anchoPanel - r.anchoVista <= 24,
         r.anchoPanel + ' contra ' + r.anchoVista);
    return r;
  }));

  titulo('las etiquetas se ven DENTRO de la glosa');
  /* Se pintan con etiquetasHTML, el mismo que usa la hoja: si aquí saliera
     otro marcado, el anticipo y la nota dirían cosas distintas. */
  di('con dos puestas', await p.evaluate(async ([abrir]) => {
    const vista = document.getElementById('glVista');
    if (!vista) return { sinPanel:true };
    const ta = document.getElementById('glosaCaja');
    ta.value = 'una nota con etiquetas dentro';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 200));
    const libres = [...document.querySelectorAll('#menu .taglista .tg')]
      .filter(b => !b.classList.contains('on'));
    for (const b of libres.slice(0,2)){ b.click(); await new Promise(z => setTimeout(z, 120)); }
    const dentro = [...vista.querySelectorAll('.gl-t')].map(x => x.textContent);
    const tag = vista.querySelector('.gl-tag');
    const cs = tag && getComputedStyle(tag);
    return { dentro, alineacion: cs && cs.textAlign, display: cs && cs.display,
             tam: cs && parseFloat(cs.fontSize),
             tamNota: parseFloat(getComputedStyle(vista).fontSize) };
  }, [ABRIR]).then(r => {
    vale('salen dentro del recuadro', !r.sinPanel && (r.dentro||[]).length === 2, r.dentro);
    vale('cada una con su almohadilla', (r.dentro||[]).every(t => t.startsWith('#')));
    vale('en su renglón y a la derecha', r.display === 'block' && r.alineacion === 'right',
         r.display + ' / ' + r.alineacion);
    vale('y más chicas que la nota', r.tam < r.tamNota, r.tam + ' contra ' + r.tamNota);
    return r;
  }));

  titulo('el ancla del anticipo es la de la hoja');
  /* glossHTML le antepone a cada nota un «1a·» que ocupa sitio en el PRIMER
     renglón y por tanto decide dónde parte. Sin ella el anticipo acertaba el
     ancho y erraba el corte, que es la mitad de lo que venía a copiar.
     Y no basta con que salga: tiene que decir LO MISMO, porque la referencia
     se gana por ser una de las notas de ese versículo y el anticipo la calcula
     antes de que la nota exista. */
  di('ancla y sangría', await p.evaluate(async ([abrir, fuera, tocar]) => {
    const ok = await eval('(' + abrir + ')')(0, 14);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinTexto:true };
    const vacia = document.querySelector('#glVista .gl-ref').textContent;
    ta.value = 'una nota larga para ver dónde parte el primer renglón';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 250));
    const conTexto = document.querySelector('#glVista .gl-ref').textContent;
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    /* SE COMPARAN LAS DOS A LA VEZ, reabriendo la glosa ya guardada. Comparar
       a través del guardado no valdría: una marca nueva se lleva las que pisa,
       y llevarse una nota renumera las de ese versículo, así que el anticipo
       puede anunciar «1b» de buena fe y acabar en «1a» porque la que iba
       delante desapareció al guardar. Eso es la regla de los solapes haciendo
       su trabajo, no el ancla equivocándose. Lo que sí tiene que cumplirse
       siempre es esto: con la glosa abierta, el ancla del anticipo y la de la
       hoja dicen lo mismo. */
    const mia = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
      .find(m => (m.nota||'').startsWith('una nota larga para ver'));
    if (!mia) return { sinGuardar:true };
    const enLaHoja = document.querySelector('.gl[data-gl="' + mia.id + '"] .gl-ref');
    await eval('(' + tocar + ')')(3, 11);
    const ancla = document.querySelector('#glVista .gl-ref');
    const ta2 = document.getElementById('glosaCaja');
    if (!ancla || !ta2) return { sinReabrir:true };
    const cs = getComputedStyle(ancla), ch = getComputedStyle(enLaHoja);
    return { vacia, conTexto,
             anticipo: { texto: ancla.textContent,
                         sangria: parseFloat(getComputedStyle(ta2).textIndent),
                         ancho: Math.round(ancla.getBoundingClientRect().width),
                         tam: cs.fontSize, peso: cs.fontWeight, fuera: cs.position },
             enLaHoja: { texto: enLaHoja.textContent, tam: ch.fontSize, peso: ch.fontWeight } };
  }, [ABRIR, FUERA, TOCAR]).then(r => {
    vale('sin texto todavía no hay referencia', !r.sinTexto && r.vacia === '·', r.vacia);
    vale('con texto sale la que le toca', /^\d/.test(r.conTexto || ''), r.conTexto);
    vale('y con la glosa abierta dice lo mismo que la hoja',
         !r.sinGuardar && !r.sinReabrir && r.anticipo.texto === r.enLaHoja.texto,
         (r.anticipo||{}).texto + ' contra ' + (r.enLaHoja||{}).texto);
    vale('del mismo cuerpo y peso',
         r.enLaHoja && r.anticipo.tam === r.enLaHoja.tam &&
         r.anticipo.peso === r.enLaHoja.peso,
         r.anticipo && r.anticipo.tam + ' / ' + r.anticipo.peso);
    /* Fuera del flujo y con el primer renglón sangrado a su ancho: es la única
       manera de que un textarea —que no deja fluir texto alrededor de nada—
       parta el primer renglón donde lo parte la nota de verdad. */
    vale('sangra el primer renglón a su ancho',
         r.anticipo && r.anticipo.fuera === 'absolute' &&
         Math.abs(r.anticipo.sangria - r.anticipo.ancho) <= 1,
         (r.anticipo||{}).sangria + ' contra ' + (r.anticipo||{}).ancho);
    return r;
  }));

  titulo('mirar una glosa no la hace volar');
  /* El vuelo dice «aquí quedó lo que acabas de escribir». Abrirla, leerla y
     salir no tiene nada que contar: animarla igual convierte un vistazo en un
     aviso de guardado, y de paso esconde la nota 2.4 segundos por nada. */
  di('abrir y salir sin tocar', await p.evaluate(async ([fuera]) => {
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]');
    const mia = g.find(m => (m.nota||'').startsWith('una nota larga para ver'));
    if (!mia) return { sinGlosa:true };
    const gl = document.querySelector('.gl[data-gl="' + mia.id + '"]');
    if (!gl) return { sinGlosa:true };
    gl.dispatchEvent(new MouseEvent('dblclick', { bubbles:true }));
    await new Promise(z => setTimeout(z, 450));
    const caja = document.getElementById('glosaCaja');
    const traeLaNota = (caja||{}).value;
    /* Y se puede seguir escribiendo sin tocar nada: el foco dentro, y el
       cursor al FINAL —en la posición cero invitaría a escribir por delante
       de lo que ya hay—. */
    const foco = document.activeElement && document.activeElement.id;
    const cursor = caja ? caja.selectionStart : null;
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 250));
    const calco = [...document.body.children].some(e => e.classList &&
      e.classList.contains('gl-vista') && e.style.position === 'fixed');
    /* y la nota sigue entera y a la vista, no escondida por un vuelo fantasma */
    const sigue = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
      .some(m => m.id === mia.id && m.nota === mia.nota);
    const visible = getComputedStyle(
      document.querySelector('.gl[data-gl="' + mia.id + '"]')).visibility;
    return { traeLaNota, calco, sigue, visible, foco, cursor };
  }, [FUERA]).then(r => {
    vale('el panel reabre con su nota', !r.sinGlosa && !!r.traeLaNota);
    vale('  con el foco puesto y el cursor al final',
         r.foco === 'glosaCaja' && r.cursor === (r.traeLaNota||'').length,
         r.foco + ', cursor ' + r.cursor + ' de ' + (r.traeLaNota||'').length);
    vale('y al salir sin tocar nada no vuela', r.calco === false);
    vale('la nota queda igual', r.sigue);
    vale('y visible, no escondida', r.visible === 'visible', r.visible);
    return r;
  }));

  titulo('la glosa vuela a su sitio al guardarse');
  /* Sin el vuelo la nota desaparece de un lado y aparece en el otro: dos
     cosas, no una. Con él, lo que escribiste y lo que quedó son el mismo
     objeto —que es la verdad— y el ojo aprende dónde buscarlo. */
  di('al cerrar', await p.evaluate(async ([abrir]) => {
    const calco = () => [...document.body.children].find(e => e.classList &&
      e.classList.contains('gl-vista') && e.style.position === 'fixed');
    /* Su propio panel, con su nota y sus dos etiquetas: encadenarlo al de la
       prueba anterior lo dejaba a merced de lo que aquélla hiciera al final. */
    const ok = await eval('(' + abrir + ')')(0, 16);
    if (!ok) return { sinPanel:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = 'una nota con etiquetas dentro';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 200));
    const libres = [...document.querySelectorAll('#menu .taglista .tg')]
      .filter(b => !b.classList.contains('on'));
    for (const b of libres.slice(0,2)){ b.click(); await new Promise(z => setTimeout(z, 120)); }
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 150));
    const c = calco();
    const an = c && c.getAnimations()[0];
    return { hayCalco: !!c,
             /* vuela una GLOSA, no un campo de escribir con el cursor dentro */
             sinTextarea: c ? !c.querySelector('textarea') : null,
             conEtiquetas: c ? c.querySelectorAll('.gl-t').length : null,
             animando: !!an,
             duracion: an ? an.effect.getTiming().duration : null };
  }, [ABRIR]).then(r => {
    vale('el calco despega', !r.sinPanel && r.hayCalco);
    vale('y es una glosa, no un formulario', r.sinTextarea === true);
    vale('con sus etiquetas puestas', r.conEtiquetas === 2, r.conEtiquetas);
    vale('lento a propósito', r.animando && r.duracion >= 1800 && r.duracion <= 3600,
         r.duracion + ' ms');
    return r;
  }));
  await p.waitForTimeout(3200);
  di('al aterrizar', await p.evaluate(() => ({
    calcoFuera: ![...document.body.children].some(e => e.classList &&
      e.classList.contains('gl-vista') && e.style.position === 'fixed'),
    ningunaEscondida: [...document.querySelectorAll('.gl')]
      .every(g => getComputedStyle(g).visibility !== 'hidden'),
    guardada: JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
      .some(m => m.nota === 'una nota con etiquetas dentro')
  })).then(r => {
    vale('el calco se recoge', r.calcoFuera);
    vale('ninguna glosa queda escondida', r.ningunaEscondida);
    vale('y la nota quedó guardada', r.guardada);
    return r;
  }));

  titulo('el anticipo acierta el ancho en las tres disposiciones');
  /* Y CON LA HOJA SIN NINGUNA NOTA, que es el caso que se rompía. Cuando ya hay
     una glosa pintada, anchoVista mide la suya y acierta siempre; la
     estimación solo entra en juego para la PRIMERA de la hoja, así que se
     vacía el almacén para llegar a ella.
     Al pie era donde peor salía: .pg-foot:empty lo pone en display:none, medirlo
     daba cero, y la cuenta se caía al ancho del margen. Lo levantó Codex. */
  for (const lay of ['foot', 'below', 'margin']){
    await p.evaluate(() => localStorage.setItem('glossa:marcas:v1', '[]'));
    await p.reload(); await p.waitForTimeout(2600);
    di('· ' + lay, await p.evaluate(async ([abrir, fuera, lay]) => {
      const b = [...document.querySelectorAll('[data-lay]')].find(x => x.dataset.lay === lay);
      if (b) b.click();
      await new Promise(z => setTimeout(z, 1400));
      const ok = await eval('(' + abrir + ')')(0, 16);
      if (!ok) return { sinTexto:true };
      const vista = document.getElementById('glVista');
      if (!vista) return { sinPanel:true };
      const anticipo = Math.round(vista.getBoundingClientRect().width);
      const ta = document.getElementById('glosaCaja');
      ta.value = 'la primera nota de esta hoja, con texto de sobra para partir renglón';
      ta.dispatchEvent(new Event('input', { bubbles:true }));
      await eval('(' + fuera + ')')();
      await new Promise(z => setTimeout(z, 3300));
      const puesta = document.querySelector(
        '#pgFoot .gl[data-gl], #pgMargin .gl[data-gl], #pgBody .gl[data-gl]');
      return { anticipo,
               real: puesta ? Math.round(puesta.getBoundingClientRect().width) : null };
    }, [ABRIR, FUERA, lay]).then(r => {
      vale('el anticipo mide lo que medirá · ' + lay,
           !r.sinTexto && !r.sinPanel && r.real && Math.abs(r.anticipo - r.real) <= 3,
           r.anticipo + ' contra ' + r.real);
      return r;
    }));
  }

  titulo('una nota larga no se sale de la escena');
  /* Sin tope, el panel crecía más alto que la escena; colocarMenu calculaba
     entonces un tope negativo y, como .stage recorta, lo que quedaba fuera era
     justo lo de arriba —los colores y los dos trazos— sin nada que desplazar
     para llegar a ellos. Lo levantó Codex. */
  di('con una nota larguísima', await p.evaluate(async ([abrir, fuera]) => {
    const ok = await eval('(' + abrir + ')')(0, 16);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = ('una nota francamente larga que sigue y sigue sin parar. ').repeat(30);
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 300));
    const menu = document.getElementById('menu');
    const st = document.getElementById('stage');
    const m = menu.getBoundingClientRect(), s = st.getBoundingClientRect();
    const col = menu.querySelector('.mcolores').getBoundingClientRect();
    const r = { alto: Math.round(m.height), escena: Math.round(s.height),
                cabe: m.top >= s.top - 1 && m.bottom <= s.bottom + 1,
                coloresDentro: col.top >= s.top - 1 && col.bottom <= s.bottom + 1,
                /* y lo que sobra se puede alcanzar desplazando */
                desplazable: menu.scrollHeight > menu.clientHeight + 1 ||
                             ta.scrollHeight > ta.clientHeight + 1 };
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    return r;
  }, [ABRIR, FUERA]).then(r => {
    vale('el panel no se sale de la escena', !r.sinTexto && !r.sinPanel && r.cabe,
         r.alto + ' de ' + r.escena);
    vale('los colores siguen alcanzables', r.coloresDentro);
    vale('y lo que sobra se desplaza', r.desplazable);
    return r;
  }));

  titulo('poner una etiqueta recoloca el panel');
  /* Una etiqueta más puede partir el renglón de las etiquetas DENTRO de la
     glosa y estirar el recuadro. Los otros dos caminos que cambian el alto
     —escribir y crear— ya recolocaban; a éste se le había olvidado, así que un
     panel puesto encima del pasaje crecía hacia abajo y se le echaba encima.
     Lo levantó Codex. */
  di('al alternar etiquetas', await p.evaluate(async ([abrir, fuera]) => {
    /* Se siembra el vocabulario aquí: la prueba del ancho vacía el almacén tres
       veces y con las marcas se van sus etiquetas, así que a estas alturas no
       queda ninguna que alternar. */
    let ok = await eval('(' + abrir + ')')(0, 16);
    if (!ok) return { sinTexto:true };
    let sembrar = document.getElementById('glosaCaja');
    sembrar.value = 'nota que trae vocabulario';
    sembrar.dispatchEvent(new Event('input', { bubbles:true }));
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 200));
    for (const t of ['gozo','fe','paz','reino','luz','camino']){
      const i = document.getElementById('tagNueva');
      i.value = t;
      i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise(z => setTimeout(z, 90));
    }
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    /* y ahora, sobre OTRO tramo, esas etiquetas están libres */
    ok = await eval('(' + abrir + ')')(30, 46);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    ta.value = 'corta'; ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 200));
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 250));
    const menu = document.getElementById('menu'), st = document.getElementById('stage');
    const antes = { top: Math.round(menu.getBoundingClientRect().top),
                    alto: Math.round(menu.getBoundingClientRect().height) };
    const libres = [...document.querySelectorAll('#menu .taglista .tg')]
      .filter(b => !b.classList.contains('on'));
    if (libres.length < 3) return { pocas:true, n:libres.length };
    for (const b of libres.slice(0,4)){ b.click(); await new Promise(z => setTimeout(z, 130)); }
    const m = menu.getBoundingClientRect(), s = st.getBoundingClientRect();
    const r = { antes, alto: Math.round(m.height), top: Math.round(m.top),
                creció: Math.round(m.height) !== antes.alto,
                dentro: m.top >= s.top - 1 && m.bottom <= s.bottom + 1 };
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    return r;
  }, [ABRIR, FUERA]).then(r => {
    vale('el panel cambia de alto al etiquetar', !r.sinTexto && !r.pocas && r.creció,
         (r.antes||{}).alto + ' → ' + r.alto);
    vale('y sigue entero dentro de la escena', r.dentro);
    return r;
  }));

  titulo('el calco se compone como la glosa de la hoja');
  /* En el editor el ancla va en absoluto y el primer renglón se sangra a mano:
     es el apaño para que un textarea parta donde parte la nota. Esa sangría
     vive EN EL TEXTAREA, así que al cambiarlo por su texto se iba con él y el
     ancla se quedaba encima de las primeras palabras. Copiar la sangría al
     calco tampoco vale —el ancla va en su posición estática, así que la sangría
     la corre a ella también—. Sin textarea no hace falta apaño ninguno: ancla y
     texto son dos hijos en línea, como los compone glossHTML.
     Se comprueban los TRES a la vez, que es la única manera de ver que dicen lo
     mismo. Lo levantó Codex. */
  di('ancla en el editor, el calco y la hoja', await p.evaluate(async ([abrir, fuera]) => {
    const ok = await eval('(' + abrir + ')')(0, 16);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = 'una nota con texto de sobra para que el primer renglón se llene y pase al siguiente';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 250));
    const vista = document.getElementById('glVista');
    const vb = vista.getBoundingClientRect();
    const ae = vista.querySelector('.gl-ref').getBoundingClientRect();
    const editor = { izq: Math.round(ae.left - vb.left), der: Math.round(ae.right - vb.left) };
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 200));
    const calco = [...document.body.children].find(e => e.classList &&
      e.classList.contains('gl-vista') && e.style.position === 'fixed');
    if (!calco) return { sinCalco:true };
    const cb = calco.getBoundingClientRect();
    const ancla = calco.querySelector('.gl-ref');
    const span = [...calco.querySelectorAll('span')]
      .find(x => !x.classList.contains('gl-ref') && !x.classList.contains('gl-tags'));
    const a = ancla.getBoundingClientRect();
    const l1 = span ? span.getClientRects()[0] : null;
    const r = { editor,
      calco: { izq: Math.round(a.left - cb.left), der: Math.round(a.right - cb.left),
               primerRenglon: l1 ? Math.round(l1.left - cb.left) : null },
      /* el texto no puede empezar por debajo del ancla */
      sePisan: l1 ? l1.left < a.right - 1 : null };
    await new Promise(z => setTimeout(z, 3300));
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
      .find(m => (m.nota||'').startsWith('una nota con texto de sobra'));
    const dest = g && document.querySelector('.gl[data-gl="' + g.id + '"]');
    if (dest){
      const db = dest.getBoundingClientRect();
      const ad = dest.querySelector('.gl-ref').getBoundingClientRect();
      r.hoja = { izq: Math.round(ad.left - db.left), der: Math.round(ad.right - db.left) };
    }
    return r;
  }, [ABRIR, FUERA]).then(r => {
    vale('el ancla del calco cae donde la del editor',
         !r.sinTexto && !r.sinCalco && r.calco.izq === r.editor.izq &&
         r.calco.der === r.editor.der,
         JSON.stringify(r.calco) + ' contra ' + JSON.stringify(r.editor));
    /* Un píxel de holgura: son medidas redondeadas del mismo texto al mismo
       cuerpo, y la referencia puede no ser la misma letra —«1a» contra «1b»—
       porque guardar una marca nueva se lleva las que pisa y renumera. Lo que
       se vigila es que el ancla ocupe el mismo sitio, no que dos redondeos
       coincidan. */
    vale('y donde la de la hoja', r.hoja && Math.abs(r.calco.izq - r.hoja.izq) <= 1 &&
         Math.abs(r.calco.der - r.hoja.der) <= 1, JSON.stringify(r.hoja));
    vale('el texto no se le monta encima', r.sePisan === false,
         'renglón en ' + (r.calco||{}).primerRenglon + ', ancla acaba en ' + (r.calco||{}).der);
    return r;
  }));

  titulo('reabrir una glosa ancha no deja hueco de más');
  /* .gl-vista lleva max-width:100%, así que mientras el panel conserve su ancho
     de fábrica el recuadro se queda encogido dentro de él. Midiendo el alto en
     ese momento se mide el de un texto que parte donde NO va a partir, y al
     ensanchar el panel después el alto ya está clavado: queda un blanco al pie
     del recuadro hasta que tocas una tecla. Se ve al pie, que es donde la glosa
     es más ancha que el panel de fábrica. Lo levantó Codex. */
  di('al pie, reabriendo', await p.evaluate(async ([abrir, fuera]) => {
    await p_nada();
    function p_nada(){ return Promise.resolve(); }
    const b = [...document.querySelectorAll('[data-lay]')].find(x => x.dataset.lay === 'foot');
    if (b) b.click();
    await new Promise(z => setTimeout(z, 1400));
    const ok = await eval('(' + abrir + ')')(20, 38);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = 'una nota al pie con bastante texto para que ocupe más de un renglón y se note el alto';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
      .find(m => (m.nota||'').startsWith('una nota al pie con bastante'));
    if (!g) return { sinGuardar:true };
    const gl = document.querySelector('.gl[data-gl="' + g.id + '"]');
    if (!gl) return { sinGlosa:true };
    gl.dispatchEvent(new MouseEvent('dblclick', { bubbles:true }));
    await new Promise(z => setTimeout(z, 600));
    const t2 = document.getElementById('glosaCaja');
    if (!t2) return { sinReabrir:true };
    const alAbrir = Math.round(t2.getBoundingClientRect().height);
    /* un recálculo como el que haría una tecla: si el alto estaba mal, cambia */
    t2.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 200));
    const r = { alAbrir, trasTecla: Math.round(t2.getBoundingClientRect().height),
                anchoPanel: Math.round(document.getElementById('menu').getBoundingClientRect().width),
                anchoVista: Math.round(document.getElementById('glVista').getBoundingClientRect().width) };
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    return r;
  }, [ABRIR, FUERA]).then(r => {
    vale('el alto al abrir ya es el bueno',
         !r.sinTexto && !r.sinReabrir && r.alAbrir === r.trasTecla,
         r.alAbrir + ' contra ' + r.trasTecla);
    vale('y el panel ya nació del ancho de la glosa',
         r.anchoPanel && r.anchoPanel - r.anchoVista <= 24,
         r.anchoPanel + ' contra ' + r.anchoVista);
    return r;
  }));

  titulo('el panel de la glosa va centrado');
  /* Iba centrado en el pasaje, y con un panel estrecho eso era un bocadillo
     que apuntaba. Desde que mide lo que mide la glosa ocupa media pantalla y
     ya no apunta a nada: lo único que hacía era saltar de un lado a otro según
     qué palabra hubieras tocado, y pegarse a un filo cuando el pasaje caía en
     una esquina. De dónde sale ya lo cuenta el crecimiento. */
  di('a la izquierda y a la derecha', await p.evaluate(async ([abrir, fuera]) => {
    const menu = document.getElementById('menu');
    const medir = () => {
      const m = menu.getBoundingClientRect(), e = menu.offsetParent.getBoundingClientRect();
      return { izq: m.left - e.left, der: e.right - m.right };
    };
    /* dos tramos bien separados del renglón: antes uno salía a un lado y el
       otro al otro, y eso es justo lo que deja de pasar */
    if (!await eval('(' + abrir + ')')(0, 10)) return { sinTexto:true };
    const cerca = medir();
    await eval('(' + fuera + ')')();
    if (!await eval('(' + abrir + ')')(56, 70)) return { sinTexto:true };
    const lejos = medir();
    /* y el foco cae en la caja, con el cursor al final: se puede escribir sin
       tener que tocar nada más */
    const ta = document.getElementById('glosaCaja');
    const foco = document.activeElement && document.activeElement.id;
    const cursor = ta ? ta.selectionStart : null;
    await eval('(' + fuera + ')')();
    return { cerca, lejos, foco, cursor,
             largo: ta ? ta.value.length : null };
  }, [ABRIR, FUERA]).then(r => {
    if (r.sinTexto) return vale('el panel va centrado', false, 'sin texto');
    vale('centrado tocando al principio del renglón',
         Math.abs(r.cerca.izq - r.cerca.der) <= 2,
         Math.round(r.cerca.izq) + ' / ' + Math.round(r.cerca.der));
    vale('  y en el mismo sitio tocando al final',
         Math.abs(r.lejos.izq - r.lejos.der) <= 2 &&
         Math.abs(r.cerca.izq - r.lejos.izq) <= 2,
         Math.round(r.lejos.izq) + ' / ' + Math.round(r.lejos.der));
    vale('y el foco nace dentro de la caja', r.foco === 'glosaCaja', r.foco);
    vale('  con el cursor al final de lo que hubiera',
         r.cursor === r.largo, r.cursor + ' de ' + r.largo);
    return r;
  }));

  titulo('el panel se recoge por donde salió');
  /* Nacer despacio y desaparecer de golpe es la peor de las dos mitades: el
     corte llama más la atención que el nacimiento. Cuando no se escribió nada
     no hay vuelo que cuente la salida, así que el panel se recoge hacia el
     pasaje del que salió. Con texto NO, que entonces la salida ya la cuenta el
     vuelo y serían dos despedidas para lo mismo. */
  di('salir sin escribir', await p.evaluate(async ([abrir]) => {
    const menu = document.getElementById('menu');
    if (!await eval('(' + abrir + ')')(50, 66)) return { sinTexto:true };
    const m = menu.getBoundingClientRect();
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 40));
    const an = menu.getAnimations()[0];
    const org = getComputedStyle(menu).transformOrigin.split(' ').map(parseFloat);
    const res = {
      animando: !!an,
      duracion: an ? an.effect.getTiming().duration : null,
      /* a media despedida sigue puesto: si ya estuviera en display:none no se
         estaría viendo nada de lo que se anima */
      aunPuesto: getComputedStyle(menu).display !== 'none',
      /* y no se come el toque siguiente mientras se va */
      sinPunteros: getComputedStyle(menu).pointerEvents === 'none',
      /* se recoge por donde nació: el origen cae dentro del panel */
      dentro: org[0] >= -1 && org[0] <= m.width + 1 &&
              org[1] >= -1 && org[1] <= m.height + 1
    };
    await new Promise(z => setTimeout(z, 400));
    /* y al final se recoge DE VERDAD, que es lo que aplazar el vaciado
       pone en riesgo: un panel invisible pero puesto sigue estorbando */
    res.cerrado = getComputedStyle(menu).display === 'none';
    res.vacio = menu.innerHTML === '';
    res.sinAncho = menu.style.width === '';
    res.punterosDevueltos = menu.style.pointerEvents === '';
    return res;
  }, [ABRIR]).then(r => {
    vale('sale sin escribir y se recoge', !r.sinTexto && r.animando &&
         r.duracion === 140, r.duracion + ' ms');
    vale('  hacia el pasaje del que salió', r.dentro);
    vale('  y mientras se va no estorba', r.aunPuesto && r.sinPunteros);
    vale('acaba recogido del todo', r.cerrado && r.vacio && r.sinAncho &&
         r.punterosDevueltos,
         JSON.stringify({ cerrado:r.cerrado, vacio:r.vacio, ancho:r.sinAncho }));
    return r;
  }));

  di('salir CON texto no se despide dos veces', await p.evaluate(async ([abrir]) => {
    const menu = document.getElementById('menu');
    if (!await eval('(' + abrir + ')')(68, 84)) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = 'esta sí se escribe y por eso vuela';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 40));
    return { animaciones: menu.getAnimations().length,
             yaCerrado: getComputedStyle(menu).display === 'none',
             calcosVolando: [...document.body.children].filter(e =>
               e.classList && e.classList.contains('gl-vista')).length };
  }, [ABRIR]).then(r => {
    vale('con texto el panel no se encoge', !r.sinTexto && !r.sinPanel &&
         r.animaciones === 0, r.animaciones);
    vale('  se cierra en seco y vuela el calco',
         r.yaCerrado && r.calcosVolando === 1, r.calcosVolando + ' calco(s)');
    return r;
  }));
  await p.waitForTimeout(2700);              /* que aterrice antes de seguir */

  /* LA REGRESIÓN QUE COSTÓ ENCONTRAR. Aplazar el vaciado abre una rendija:
     reabrir el panel en el instante justo en que la despedida termina. Con
     fill:'forwards' el relleno se quedaba puesto y el panel nuevo salía a
     escala .82 y transparente —abierto y sin verse—. Se prueba con el reabrir
     dentro de la despedida, que es donde se coló. */
  di('reabrir a media despedida', await p.evaluate(async ([abrir]) => {
    const menu = document.getElementById('menu');
    if (!await eval('(' + abrir + ')')(50, 66)) return { sinTexto:true };
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 50));       /* a media despedida */
    if (!await eval('(' + abrir + ')')(20, 38)) return { sinTexto:true };
    await new Promise(z => setTimeout(z, 400));      /* pasado el adiós viejo */
    return { puesto: getComputedStyle(menu).display !== 'none',
             hayCaja: !!document.getElementById('glosaCaja'),
             opacidad: getComputedStyle(menu).opacity,
             transform: getComputedStyle(menu).transform };
  }, [ABRIR]).then(r => {
    vale('el panel reabierto sigue puesto', !r.sinTexto && r.puesto && r.hayCaja);
    vale('  y entero, no fantasma', r.opacidad === '1' && r.transform === 'none',
         'opacidad ' + r.opacidad + ', transform ' + r.transform);
    return r;
  }));
  await p.evaluate(async (fuera) => { await eval('(' + fuera + ')')(); }, FUERA);
  await p.waitForTimeout(300);

  titulo('en una ventana angosta el panel no se sale por la izquierda');
  /* La columna de glosas del teléfono mide 240px clavados, así que en una
     ventana más angosta que eso —pantalla partida, vista incrustada— el panel
     pedía más ancho que la escena y colocarMenu calculaba `s.width - w - 2` en
     NEGATIVO: el filo izquierdo y el principio de cada renglón se quedaban
     fuera, sin nada que desplazar. Es el fallo del alto otra vez, por el otro
     eje. Lo levantó Codex. */
  for (const ancho of [200, 240, 260]){
    const chico = await abrir({ viewport:{ width:ancho, height:760 } });
    di('· ' + ancho + 'px', await chico.pagina.evaluate(async ([abrir]) => {
      const ok = await eval('(' + abrir + ')')(0, 16);
      if (!ok) return { sinTexto:true };
      const menu = document.getElementById('menu');
      const st = document.getElementById('stage');
      if (getComputedStyle(menu).display === 'none') return { sinPanel:true };
      const ta = document.getElementById('glosaCaja');
      ta.value = 'una nota para ver si el recuadro encoge con el panel';
      ta.dispatchEvent(new Event('input', { bubbles:true }));
      await new Promise(z => setTimeout(z, 250));
      const m = menu.getBoundingClientRect(), s = st.getBoundingClientRect();
      const v = document.getElementById('glVista').getBoundingClientRect();
      return { escena: Math.round(s.width), panel: Math.round(m.width),
               vista: Math.round(v.width),
               cabe: m.left >= s.left - 1 && m.right <= s.right + 1,
               /* y el anticipo encoge con él, que es el respaldo honesto */
               vistaDentro: v.left >= m.left - 1 && v.right <= m.right + 1 };
    }, [ABRIR]).then(r => {
      vale('el panel cabe en la escena · ' + ancho,
           !r.sinTexto && !r.sinPanel && r.cabe,
           (r.panel || '?') + ' en ' + (r.escena || '?'));
      vale('  y el anticipo no se le sale', r.vistaDentro, r.vista);
      return r;
    }));
    await cerrarParcial(chico, ancho + 'px');
  }

  await cerrar(sesion);
})();
