/* LAS ETIQUETAS, DESDE EL PANEL DE LA MARCA.

   Ya no hay etiqueta activa. Aquí vivía el fallo que más miedo daba —el
   desplegable decía "— ninguna —" y la glosa siguiente salía etiquetada
   igual— y se quitó de raíz quitando lo que lo causaba: nada se pone solo.
   Lo único que queda de aquello es que la última que usaste sale en NEGRITA,
   y una negrita no etiqueta a nadie a tus espaldas.

   Lo que sí se conserva entero es la lección de las cuatro puertas: crear una
   etiqueta no puede depender de Enter. En Android la tecla de una caja suelta
   viene rotulada «Listo» y lo normal es que solo cierre el teclado; y mientras
   el corrector compone, Gboard manda el keydown con key 'Unidentified' y
   keyCode 229, que no es 'Enter' por ningún lado. Colgado solo de ahí, crear
   una etiqueta era imposible en el teléfono, sin decirlo.

   Y una regla de método que costó cara: «tocar fuera» se toca DE VERDAD. El
   toque de fuera lo recoge un oyente en fase de captura que cierra el panel,
   y el change de la caja llega después. Disparar el change a mano da verde
   sin haber probado el orden que impone el navegador, que es donde vivía el
   fallo. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

/* Abrir el panel sobre un tramo del primer versículo y dejar una nota escrita:
   sin nota las etiquetas duermen, porque sin nota no se guarda nada y una
   etiqueta puesta ahí se perdería al cerrar. */
const ABRIR = `async (desde, hasta, nota) => {
  const v = document.querySelector('#pgBody .v');
  const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
  while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
  if (!n) return false;
  const r = document.createRange(); r.setStart(n,desde); r.setEnd(n,hasta);
  getSelection().removeAllRanges(); getSelection().addRange(r);
  const rc = r.getBoundingClientRect();
  document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
  await new Promise(z => setTimeout(z, 450));
  const ta = document.getElementById('glosaCaja');
  if (!ta) return false;
  ta.value = nota; ta.dispatchEvent(new Event('input', { bubbles:true }));
  await new Promise(z => setTimeout(z, 120));
  return !document.querySelector('#menu .tagbox').classList.contains('dormida');
}`;
const FUERA = `async () => {
  document.body.dispatchEvent(new PointerEvent('pointerdown',
    { bubbles:true, clientX:5, clientY:5 }));
  await new Promise(z => setTimeout(z, 450));
}`;

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  const alPanel = () => p.evaluate(async () => {
    if (document.getElementById('etiquetas').classList.contains('abierto')) return;
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const t = [...document.querySelectorAll('.pestanas button')].find(x => /glosas/i.test(x.textContent));
    if (t) t.click();
    await new Promise(z => setTimeout(z, 900));
  });

  titulo('las etiquetas duermen mientras no haya nota');
  di('panel recién abierto', await p.evaluate(async ([abrir, fuera]) => {
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
    const r = document.createRange(); r.setStart(n,0); r.setEnd(n,12);
    getSelection().removeAllRanges(); getSelection().addRange(r);
    const rc = r.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
    await new Promise(z => setTimeout(z, 450));
    const caja = document.querySelector('#menu .tagbox');
    const dormida = caja.classList.contains('dormida');
    const puntero = getComputedStyle(caja).pointerEvents;
    /* se ve, para saber que existe y que ya llegará */
    const seVe = getComputedStyle(caja).display !== 'none' &&
                 parseFloat(getComputedStyle(caja).opacity) > 0;
    await eval('(' + fuera + ')')();
    return { dormida, puntero, seVe };
  }, [ABRIR, FUERA]).then(r => {
    vale('duerme sin nota', r.dormida);
    vale('y no responde al dedo', r.puntero === 'none', r.puntero);
    vale('pero se ve', r.seVe);
    return r;
  }));

  titulo('las cuatro puertas para crear una etiqueta');
  /* Cada una abre su propio panel sobre un tramo distinto del versículo: una
     marca nueva encima de otra se lleva la de debajo, que es el comportamiento
     de siempre y aquí solo estorbaría. */
  const puertas = [['salmo', 'el intro de escritorio', 0, 12],
                   ['reino', 'el botón +', 16, 28],
                   ['maná',  'el intro del móvil', 32, 44],
                   ['sion',  'tocar fuera de verdad', 48, 62]];
  for (const [nombre, como, desde, hasta] of puertas){
    di(como, await p.evaluate(async ([abrir, fuera, nombre, como, desde, hasta]) => {
      const despierta = await eval('(' + abrir + ')')(desde, hasta, 'nota de ' + nombre);
      if (!despierta) return { sinPanel:true };
      const menu = document.getElementById('menu');
      const i = document.getElementById('tagNueva');
      i.focus(); i.value = nombre; i.dispatchEvent(new Event('input', { bubbles:true }));
      if (como === 'el intro de escritorio')
        i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      if (como === 'el botón +') menu.querySelector('[data-acc="creartag"]').click();
      if (como === 'el intro del móvil') i.dispatchEvent(new InputEvent('beforeinput',
        { bubbles:true, cancelable:true, inputType:'insertLineBreak' }));
      if (como === 'tocar fuera de verdad'){
        /* el pointerdown primero —lo recoge la captura— y el blur detrás, que
           es el orden que impone el navegador y el que destapó el fallo */
        document.body.dispatchEvent(new PointerEvent('pointerdown',
          { bubbles:true, clientX:200, clientY:830 }));
        i.blur();
      }
      await new Promise(z => setTimeout(z, 400));
      const campoLimpio = !document.getElementById('tagNueva') ||
                          document.getElementById('tagNueva').value === '';
      /* los tres primeros caminos siguen con el panel abierto: hay que
         cerrarlo para que lo escrito llegue al almacén */
      if (como !== 'tocar fuera de verdad') await eval('(' + fuera + ')')();
      const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
      return { campoLimpio,
               marcasConEsa: g.filter(m => (m.etiquetas||[]).includes(nombre)).length,
               menuCerrado: getComputedStyle(menu).display === 'none' };
    }, [ABRIR, FUERA, nombre, como, desde, hasta]).then(r => {
      /* UNA, no dos ni cero: cero era el fallo del orden, y dos sería que
         algún repintado volviera a disparar la creación con el mismo texto. */
      vale('la pone en la marca, una sola vez · ' + como,
           !r.sinPanel && r.marcasConEsa === 1, r.sinPanel ? 'sin panel' : r.marcasConEsa);
      vale('y limpia el campo · ' + como, r.campoLimpio);
      vale('el panel queda cerrado · ' + como, r.menuCerrado === true);
      return r;
    }));
  }

  titulo('nombres raros: comillas, espacios dobles y barras');
  /* Una etiqueta la escribe una mano y puede llevar lo que sea, así que cada
     sitio por donde pasa el nombre es un sitio donde puede convertirse en
     sintaxis. Ha pasado tres veces:
     · esc() no escapaba comillas, y el nombre va dentro de un atributo;
     · un <option> sin value colapsa los espacios dobles;
     · y el chip se buscaba armando un selector con el nombre dentro. Medido:
       «a\"b» tiraba SyntaxError y abortaba la creación con la caja ya
       vaciada, y «promesas\» no tiraba nada pero no encontraba el botón que
       existía, así que metía un chip repetido en silencio.
     La barra invertida está aquí por eso, y las dos formas de fallar con ella
     van cada una por su lado. */
  for (const raro of ['oración  diaria', 'la "roca"', 'fe\\esperanza',
                      'a\\"b', 'promesas\\']){
    const r = await p.evaluate(async ([abrir, fuera, raro]) => {
      const despierta = await eval('(' + abrir + ')')(0, 12, 'nota rara');
      if (!despierta) return { sinPanel:true };
      const i = document.getElementById('tagNueva');
      i.value = raro;
      i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise(z => setTimeout(z, 350));
      /* y se puede volver a tocar: si el nombre no sobrevivió al atributo, el
         chip existe pero no se encuentra por su data-tag */
      const chip = document.querySelector('#menu .tg.on');
      const seEncuentra = !!chip && chip.dataset.tag === raro;
      /* volver a crearla NO puede sacar un segundo chip: es la mitad
         silenciosa del fallo del selector */
      const i2 = document.getElementById('tagNueva');
      i2.value = raro;
      i2.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise(z => setTimeout(z, 300));
      const cuantosChips = [...document.querySelectorAll('#menu .tg')]
        .filter(b => b.dataset.tag === raro).length;
      await eval('(' + fuera + ')')();
      const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
      const mia = g.find(m => (m.etiquetas||[]).includes(raro));
      return { seEncuentra, cuantosChips, guardada: !!mia,
               /* ni repetida en la propia marca */
               vecesEnLaMarca: mia ? mia.etiquetas.filter(x => x === raro).length : 0 };
    }, [ABRIR, FUERA, raro]);
    vale('sobrevive «' + raro + '»', !r.sinPanel && r.guardada && r.seEncuentra,
         JSON.stringify(r));
    vale('  y no se duplica el chip', r.cuantosChips === 1 && r.vecesEnLaMarca === 1,
         'chips ' + r.cuantosChips + ' · en la marca ' + r.vecesEnLaMarca);
  }

  titulo('la última usada sale en negrita');
  /* Es todo lo que queda de la etiqueta activa: se ve, y no hace nada. */
  di('al abrir otro panel', await p.evaluate(async ([abrir, fuera]) => {
    const despierta = await eval('(' + abrir + ')')(16, 30, 'otra nota');
    if (!despierta) return { sinPanel:true };
    const negrita = document.querySelector('#menu .tg.ultima');
    const peso = negrita && getComputedStyle(negrita).fontWeight;
    /* y NO está puesta: enseñarla no es aplicarla */
    const puestas = [...document.querySelectorAll('#menu .tg.on')].map(x => x.dataset.tag);
    await eval('(' + fuera + ')')();
    return { cual: negrita && negrita.dataset.tag, peso, puestas };
  }, [ABRIR, FUERA]).then(r => {
    vale('hay una en negrita', !r.sinPanel && !!r.cual, r.cual);
    vale('y es negrita de verdad', parseInt(r.peso) >= 700, r.peso);
    vale('pero no se aplica sola', (r.puestas||[]).length === 0, r.puestas);
    return r;
  }));

  titulo('sobrevive a cerrar la aplicación');
  await p.reload(); await p.waitForTimeout(2800);
  di('tras recargar', await p.evaluate(async ([abrir, fuera]) => {
    const marcas = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]').length;
    const despierta = await eval('(' + abrir + ')')(0, 12, 'nota tras recargar');
    const negrita = document.querySelector('#menu .tg.ultima');
    const cual = negrita && negrita.dataset.tag;
    await eval('(' + fuera + ')')();
    return { marcas, despierta, cual };
  }, [ABRIR, FUERA]).then(r => {
    vale('la última usada sigue en negrita', !!r.cual, r.cual || '(ninguna)');
    vale('y las marcas siguen ahí', r.marcas > 0, r.marcas);
    return r;
  }));

  titulo('los chips de «ver» filtran');
  await alPanel();
  di('apagar un chip', await p.evaluate(async () => {
    const cuantas = () =>
      document.querySelectorAll('#pgMargin .gl[data-gl], #pgBody .gl[data-gl]').length;
    const antes = cuantas();
    /* El primero que sea de etiqueta: cuál sobreviva depende de qué marcas
       se pisaron por el camino, y clavar un nombre aquí es escribir una
       prueba que falla por lo que hicieron las de arriba. */
    const chip = [...document.querySelectorAll('#filtros .chip')]
      .find(c => !c.classList.contains('chip-libro') && !c.classList.contains('chip-mas') &&
                 !/sin etiqueta/.test(c.textContent));
    if (!chip) return { sinChip:true, chips:[...document.querySelectorAll('#filtros .chip')]
                                              .map(c => c.textContent.trim()) };
    chip.click(); await new Promise(z => setTimeout(z, 1200));
    const apagado = cuantas();
    chip.click(); await new Promise(z => setTimeout(z, 1200));
    return { antes, apagado, vuelven: cuantas() };
  }).then(r => {
    vale('esconde', !r.sinChip && r.apagado < r.antes,
         r.sinChip ? JSON.stringify(r.chips) : r.antes + ' → ' + r.apagado);
    vale('y devuelve', !r.sinChip && r.vuelven === r.antes, '→ ' + r.vuelven);
    return r;
  }));

  await cerrar(sesion);
})();
