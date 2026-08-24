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
    /* Y NACE CERRADA: lo que la nota lleva puesto se lee dentro de la glosa,
       así que la lista solo hace falta para cambiarlo. El botón la abre. */
    const cerrada = !caja.classList.contains('abierta') &&
                    getComputedStyle(caja).display === 'none';
    const bot = document.querySelector('#menu .mtags');
    const rotulo = bot && bot.textContent;
    await eval('(' + fuera + ')')();
    return { dormida, puntero, cerrada, rotulo };
  }, [ABRIR, FUERA]).then(r => {
    vale('duerme sin nota', r.dormida);
    vale('y no responde al dedo', r.puntero === 'none', r.puntero);
    vale('la lista nace cerrada', r.cerrada);
    vale('y el botón dice de qué va', /etiquetas/.test(r.rotulo || ''), r.rotulo);
    return r;
  }));

  titulo('el botón abre y cierra la lista');
  di('abrir y volver a cerrar', await p.evaluate(async ([abrir, fuera]) => {
    const despierta = await eval('(' + abrir + ')')(0, 12, 'nota para la lista');
    if (!despierta) return { sinPanel:true };
    const caja = document.querySelector('#menu .tagbox');
    const bot = document.querySelector('#menu .mtags');
    const alNacer = getComputedStyle(caja).display;
    bot.click(); await new Promise(z => setTimeout(z, 200));
    const abierta = getComputedStyle(caja).display;
    const rotuloAbierta = bot.textContent;
    bot.click(); await new Promise(z => setTimeout(z, 200));
    const cerrada = getComputedStyle(caja).display;
    await eval('(' + fuera + ')')();
    return { alNacer, abierta, cerrada, rotuloAbierta };
  }, [ABRIR, FUERA]).then(r => {
    vale('cerrada de nacimiento', !r.sinPanel && r.alNacer === 'none', r.alNacer);
    vale('el botón la abre', r.abierta !== 'none', r.abierta);
    vale('y la vuelve a cerrar', r.cerrada === 'none', r.cerrada);
    vale('el rótulo dice que está abierta', /▾/.test(r.rotuloAbierta || ''), r.rotuloAbierta);
    return r;
  }));

  titulo('las puestas se apagan en la lista');
  /* Al revés de como estaban: puestas ya se ven dentro de la glosa, así que
     aquí lo que importa es lo que TODAVÍA se puede añadir. Y va por color, no
     por opacidad: la opacidad ya significa «dormida», y una señal que dice dos
     cosas no dice ninguna. */
  di('color de puesta contra libre', await p.evaluate(async ([abrir, fuera]) => {
    const despierta = await eval('(' + abrir + ')')(0, 12, 'nota para apagar');
    if (!despierta) return { sinPanel:true };
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 200));
    const libre = [...document.querySelectorAll('#menu .taglista .tg')]
      .find(b => !b.classList.contains('on'));
    if (!libre) return { sinLibre:true };
    const nombre = libre.dataset.tag;
    const colorLibre = getComputedStyle(libre).color;
    const opacidadLibre = getComputedStyle(libre).opacity;
    libre.click(); await new Promise(z => setTimeout(z, 200));
    const ahora = [...document.querySelectorAll('#menu .taglista .tg')]
      .find(b => b.dataset.tag === nombre);
    const colorPuesta = getComputedStyle(ahora).color;
    const opacidadPuesta = getComputedStyle(ahora).opacity;
    /* y sigue en la lista, para poder quitarla tocándola otra vez */
    ahora.click(); await new Promise(z => setTimeout(z, 200));
    const trasQuitar = [...document.querySelectorAll('#menu .taglista .tg')]
      .find(b => b.dataset.tag === nombre).classList.contains('on');
    await eval('(' + fuera + ')')();
    return { nombre, colorLibre, colorPuesta, opacidadLibre, opacidadPuesta, trasQuitar };
  }, [ABRIR, FUERA]).then(r => {
    vale('ponerla le cambia el color', !r.sinPanel && !r.sinLibre &&
         r.colorLibre !== r.colorPuesta, r.colorLibre + ' → ' + r.colorPuesta);
    vale('y no por opacidad, que ya significa otra cosa',
         r.opacidadLibre === r.opacidadPuesta, r.opacidadPuesta);
    vale('tocarla otra vez la quita', r.trasQuitar === false);
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
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 200));
    const marcada = document.querySelector('#menu .taglista .tg.ultima');
    const cs = marcada && getComputedStyle(marcada);
    const trazo = cs && (cs.textDecorationLine + ' ' + cs.textDecorationStyle).trim();
    /* y las otras van sin subrayar: la señal es la DIFERENCIA */
    const otra = [...document.querySelectorAll('#menu .taglista .tg')]
      .find(b => b !== marcada);
    const trazoOtra = otra && getComputedStyle(otra).textDecorationLine;
    /* y NO está puesta: enseñarla no es aplicarla */
    const puestas = [...document.querySelectorAll('#menu .taglista .tg.on')].map(x => x.dataset.tag);
    await eval('(' + fuera + ')')();
    return { cual: marcada && marcada.dataset.tag, trazo, trazoOtra, puestas };
  }, [ABRIR, FUERA]).then(r => {
    vale('hay una marcada como la última', !r.sinPanel && !!r.cual, r.cual);
    /* Punteado y no negrita: el peso competía con el oro por decir «ésta es
       especial», y con la etiqueta puesta y última a la vez no se sabía cuál
       decía cuál. Ahora el relleno dice si está puesta y el trazo dice si es
       la última: dos canales que no se pisan. */
    vale('se distingue por el trazo, no por el peso',
         /underline/.test(r.trazo || '') && /dotted/.test(r.trazo || '') &&
         !/underline/.test(r.trazoOtra || ''),
         r.trazo + ' contra ' + r.trazoOtra);
    vale('pero no se aplica sola', (r.puestas||[]).length === 0, r.puestas);
    return r;
  }));

  titulo('se puede cerrar sin puntero');
  /* Con el botón «Listo» quitado, tocar fuera —un pointerdown— era la única
     salida, y quien no tiene puntero se quedaba dentro. Peor que incómodo:
     lo escrito se cobra al cerrar, así que la nota se quedaba sin guardar
     hasta que alguien tocara el papel con un dedo. Escape cierra GUARDANDO,
     igual que tocar fuera: este panel no tiene camino de abandono, y un
     Escape que tirara lo escrito inventaría un gesto destructivo que no
     existe en ningún otro sitio. Lo levantó la revisión de Codex. */
  di('Escape desde la caja de la glosa', await p.evaluate(async ([abrir]) => {
    const despierta = await eval('(' + abrir + ')')(40, 56, 'cerrada con Escape');
    if (!despierta) return { sinPanel:true };
    const menu = document.getElementById('menu');
    /* el foco donde de verdad estaría: dentro de la caja de escribir */
    document.getElementById('glosaCaja').focus();
    const enLaCaja = document.activeElement.id === 'glosaCaja';
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await new Promise(z => setTimeout(z, 400));
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    return { enLaCaja,
             cerrado: getComputedStyle(menu).display === 'none',
             guardada: g.some(m => m.nota === 'cerrada con Escape') };
  }, [ABRIR]).then(r => {
    vale('el foco estaba dentro de la caja', !r.sinPanel && r.enLaCaja);
    vale('Escape cierra el panel', r.cerrado);
    /* Se pregunta por la NOTA y no por cuántas marcas hay: el tramo elegido
       pisa a las de las pruebas de arriba, y una marca nueva encima de otra
       se lleva la de debajo —comportamiento de siempre—, así que la cuenta
       sube y baja por razones que no tienen que ver con Escape. */
    vale('y cobra lo escrito, no lo tira', r.guardada);
    return r;
  }));

  titulo('la lista es un vocabulario, no una fila de pastillas');
  /* DE DÓNDE VIENE ESTO. Primero fueron pastillas que se partían por donde
     caía cada nombre —hasta 175 de 326px vacíos en un renglón—; luego una
     rejilla de dos columnas, que quitó el hueco pero seguía vistiendo de
     control algo que se consulta. Ahora es una lista corrida con almohadilla,
     como el índice de un libro: sin recuadro, cabe al triple de densidad y se
     recorre con la vista.
     Se mide la DENSIDAD, no el número de columnas: cuántas entran por renglón
     depende de los nombres, y clavarlo sería escribir una prueba que falla
     cuando cambie el vocabulario. */
  di('la lista', await p.evaluate(async ([abrir, fuera]) => {
    const despierta = await eval('(' + abrir + ')')(0, 12, 'nota de la lista');
    if (!despierta) return { sinPanel:true };
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 200));
    /* Se siembra el vocabulario aquí mismo: las pruebas de arriba se pisan
       unas a otras las marcas, y con ellas se van sus etiquetas, así que a
       estas alturas quedan dos. Crearlas por la caja es además el camino que
       de verdad usa quien escribe. */
    for (const t of ['gozo', 'fe', 'paz', 'reino', 'luz', 'camino', 'verdad']){
      const i = document.getElementById('tagNueva');
      i.value = t;
      i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise(z => setTimeout(z, 90));
    }
    const lista = document.querySelector('#menu .taglista');
    const items = [...lista.querySelectorAll('.tg')];
    if (items.length < 4) return { pocas:true, n:items.length };
    const cajaLista = lista.getBoundingClientRect();
    /* cuántos caben por renglón, agrupando por su borde superior */
    const filas = new Map();
    for (const b of items){
      const t = Math.round(b.getBoundingClientRect().top);
      filas.set(t, (filas.get(t) || 0) + 1);
    }
    const porFila = [...filas.values()];
    const cs = getComputedStyle(items[0]);
    const r = {
      n: items.length,
      porFila,
      maxPorFila: Math.max(...porFila),
      /* sin recuadro: eso es lo que la separa de un control */
      sinBorde: parseFloat(cs.borderTopWidth) === 0,
      sinFondo: cs.backgroundColor === 'rgba(0, 0, 0, 0)',
      conAlmohadilla: items.every(b => b.textContent.startsWith('#')),
      tam: parseFloat(cs.fontSize),
      /* y nada se sale del panel por la derecha */
      seSale: Math.round(cajaLista.right -
              document.getElementById('menu').getBoundingClientRect().right)
    };
    await eval('(' + fuera + ')')();
    return r;
  }, [ABRIR, FUERA]).then(r => {
    vale('caben varias por renglón', !r.sinPanel && !r.pocas && r.maxPorFila >= 2,
         (r.porFila || []).join(' · '));
    vale('sin recuadro ni relleno', r.sinBorde && r.sinFondo);
    vale('cada una con su almohadilla', r.conAlmohadilla);
    vale('y la letra no es pequeña', r.tam >= 15, r.tam + ' px');
    vale('sin salirse del panel', r.seSale <= 0, r.seSale);
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
