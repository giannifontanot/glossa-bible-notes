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
const { abrir, cerrar, di, vale, titulo, ESCRITORIO } = require('./comun');

/* Abrir el panel sobre un tramo SIN ETIQUETAS PUESTAS y dejar una nota
   escrita: sin nota las etiquetas duermen, porque sin nota no se guarda nada
   y una etiqueta puesta ahí se perdería al cerrar.

   Y LO DE «SIN ETIQUETAS PUESTAS» ES NUEVO, porque cambió el gesto. Con la
   selección, señalar encima de una marca que ya existía creaba OTRA que se
   llevaba la de debajo por delante, así que cada bloque podía pedir el tramo
   que quisiera y recibía siempre un panel limpio. Pintando no: el dedo sobre
   una marca hecha la ABRE, que es lo que tiene que hacer. Así que un bloque
   que pide (16,30) después de que otro dejara «reino» en (16,28) recibe el
   panel de aquella glosa, con su etiqueta encendida — y entonces «no se
   aplica sola» sale en rojo diciendo ["reino"], que es verdad y no es el
   fallo que vigila.

   No se arregla repartiendo tramos a mano entre los bloques —eso se descuadra
   en cuanto alguien añade uno—, sino pidiendo lo que de verdad hace falta:
   un panel sin etiquetas encendidas. Si el primer versículo ya está ocupado,
   se prueba el siguiente. */
const ABRIR = `async (desde, hasta, nota) => {
  const escribir = async () => {
    const ta = document.getElementById('glosaCaja');
    if (!ta) return false;
    ta.value = nota; ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 120));
    const caja = document.querySelector('#menu .tagbox');
    return !!caja && !caja.classList.contains('dormida');
  };
  const cerrar = async () => {
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 450));
  };
  /* SE PRUEBAN VARIOS TRAMOS DENTRO DE CADA VERSICULO, no uno por versiculo.

     Con uno por versiculo, cada bloque que pasa consume el suyo y la hoja se
     acaba: este fichero llama aqui una docena de veces y la hoja tiene
     catorce versiculos, algunos demasiado cortos. El quinto nombre raro se
     quedaba ya sin sitio y devolvia false, y el bloque decia «sinPanel».
     Pero un versiculo mide entre 88 y 245 letras, o sea que caben de sobra
     varias marcas: se corre el tramo a lo largo del versiculo antes de pasar
     al siguiente. Cuando el tramo ya no cabe, el pincel devuelve falso solo y
     se pasa al de al lado. */
  const ancho = hasta - desde;
  for (const v of [...document.querySelectorAll('#pgBody .v')]){
    for (let d = 0; d < 400; d += ancho + 4){
      /* con el dedo: ver PINCEL en comun.js */
      if (!await window.__glosarEn(v, desde + d, hasta + d)) break;
      if (!document.querySelector('#menu .tg.on')) return escribir();
      await cerrar();
    }
  }
  return false;
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
    const t = document.querySelector('.pestanas button[data-sec="glosas"]');
    if (t) t.click();
    await new Promise(z => setTimeout(z, 900));
  });
  /* LA TIRA DE ETIQUETAS NACE APAGADA, así que quien venga a mirarla la
     enciende primero, igual que el lector. Antes salía puesta y esto no hacía
     falta; ahora hace falta en todos los bloques que hablan de los chips, y
     por eso se envuelve en vez de repetir el toque en cada uno. */
  const encenderEtiquetas = () => p.evaluate(async () => {
    const caja = document.getElementById('ctrlEtiquetas');
    if (!caja.classList.contains('sin-chips')) return false;
    document.getElementById('btnVerEtiquetas').click();
    await new Promise(z => setTimeout(z, 420));
    return true;
  });

  titulo('las etiquetas duermen mientras no haya nota');
  di('panel recién abierto', await p.evaluate(async ([abrir, fuera]) => {
    const v = document.querySelector('#pgBody .v');
    await window.__glosarEn(v, 0, 12);
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

  titulo('y la lista sale EN EL ACTO');
  /* ESTE BLOQUE MEDÍA UN DOBLEZ QUE YA NO EXISTE, y merece contarse entero
     porque es la tercera vez que una prueba de esta carpeta se queda
     afirmando lo viejo.

     La lista se doblaba como un papel —el alto de cero a lo que mida— porque
     aparecer de golpe se leía brusco. Después el doblez se ató al VIAJE del
     panel, para que el alto y la posición no se separasen. Y medido, esa
     atadura costaba medio segundo cada vez que el panel tenía que cambiarse
     de lado: 520 ms de mirar crecer un recuadro cuando el trabajo de verdad
     —componer treinta y pico botones y medirlos— son 16-32 ms. Se pidió que
     fuese instantánea, se midió que se podía, y se desató.

     Y ESTA LÍNEA LLEVABA ROTA DESDE ANTES. Exigía dur === 160 y el doblez
     bajó a 110 en el PR de los cinco detalles; nadie corrió `etiquetas`
     entonces —se corrigieron glosas, separador, navegar y piedra, que eran
     las que se buscaron— así que la cifra vieja se quedó ahí esperando. Un
     número exacto de milisegundos dentro de una aserción es justo lo que se
     descuelga en silencio; por eso lo que se vigila ahora no es la duración
     sino LO QUE SE VE: que al primer respiro la lista ya esté entera. */
  di('el doblez', await p.evaluate(async ([abrir, fuera]) => {
    const despierta = await eval('(' + abrir + ')')(0, 12, 'nota para el doblez');
    if (!despierta) return { sinPanel:true };
    const caja = document.querySelector('#menu .tagbox');
    const bot = document.querySelector('#menu .mtags');
    const mitad = (r) => new Promise(z => setTimeout(z, r));

    /* 45 ms es MENOS de lo que duraba el doblez más corto, así que si algún
       día vuelve a doblarse, aquí se verá a medio camino y esto cantará. */
    bot.click(); await mitad(45);
    const an = caja.getAnimations()[0];
    const abriendo = { dur: an ? an.effect.getTiming().duration : 0,
                       alto: caja.getBoundingClientRect().height,
                       recortada: caja.style.overflow === 'hidden',
                       rotulo: bot.textContent.trim() };
    await mitad(300);
    abriendo.altoFinal = caja.getBoundingClientRect().height;
    /* y no deja el alto clavado en el estilo, que congelaría la lista al
       añadir una etiqueta más */
    abriendo.sinRastro = caja.style.height === '' && caja.style.overflow === '';

    bot.click(); await mitad(45);
    const cerrando = { alto45: caja.getBoundingClientRect().height,
                       rotulo: bot.textContent.trim() };
    await mitad(300);
    cerrando.alto = caja.getBoundingClientRect().height;
    cerrando.cerrada = !caja.classList.contains('abierta');

    /* dos toques rápidos: el segundo tiene que alternar sobre lo PEDIDO y no
       sobre lo que se ve, o abrir y cerrar deprisa la deja abierta */
    bot.click(); await mitad(50); bot.click(); await mitad(350);
    const rapido = { cerrada: !caja.classList.contains('abierta'),
                     alto: caja.getBoundingClientRect().height };
    await eval('(' + fuera + ')')();
    return { abriendo, cerrando, rapido };
  }, [ABRIR, FUERA]).then(r => {
    if (r.sinPanel) return vale('el doblez', false, 'sin panel');
    /* ENTERA A LOS 45 ms, y no «creciendo»: es lo contrario exacto de lo que
       pedía la línea de antes, y es el cambio. Se compara contra el alto final
       en vez de contra un número escrito, que es lo que la dejó descolgada. */
    vale('LA LISTA ESTÁ ENTERA AL PRIMER RESPIRO, no creciendo',
         r.abriendo.alto > 0 && r.abriendo.alto === r.abriendo.altoFinal,
         Math.round(r.abriendo.alto) + ' de ' + Math.round(r.abriendo.altoFinal));
    vale('  y el doblez no dura nada', r.abriendo.dur === 0, r.abriendo.dur);
    /* AQUÍ HABÍA UNA TERCERA, «recortando, no aplastando», y se va con el
       doblez. Miraba que durante el crecimiento la caja llevara
       overflow:hidden, para que la lista se descubriera en vez de encogerse.
       Sin crecimiento no hay nada que recortar: el overflow se pone y se
       quita dentro del mismo turno, así que a los 45 ms ya está limpio —y que
       quede limpio es justo lo que vigila la línea de abajo, que es la que
       importa: un overflow olvidado recortaría la lista al añadir una
       etiqueta más—. Medido: recortada:false, sinRastro:true. */
    vale('  y sin dejar el alto ni el recorte clavados', r.abriendo.sinRastro);
    vale('al cerrar se va igual de rápido', r.cerrando.alto45 === 0,
         r.cerrando.alto45);
    vale('  y el rótulo ya dice lo que va a pasar',
         /▸/.test(r.cerrando.rotulo), r.cerrando.rotulo);
    vale('  y acaba cerrada del todo',
         r.cerrando.cerrada && r.cerrando.alto === 0, r.cerrando.alto);
    vale('dos toques rápidos la dejan cerrada',
         r.rapido.cerrada && r.rapido.alto === 0, r.rapido.alto);
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

  titulo('nombres raros: comillas, espacios y barras');
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
     van cada una por su lado.

     Y CADA NOMBRE VIENE CON EL QUE LE TOCA QUEDAR, que antes era el mismo. Las
     etiquetas ya no llevan espacios: al crearlas se juntan en jorobas —pedido
     del dueño del repo— así que «oración  diaria» se guarda «OraciónDiaria».
     Lo que este bloque vigila sigue siendo lo de siempre, que el nombre
     SOBREVIVA EL VIAJE por el atributo y por el almacén; lo que cambia es
     contra qué se compara, y por eso el nombre esperado va escrito al lado y
     no calculado aquí: una prueba que repite la cuenta del programa aprueba
     también sus errores. */
  for (const [raro, queda] of [['oración  diaria', 'OraciónDiaria'],
                               ['la "roca"', 'La"roca"'],
                               ['fe\\esperanza', 'fe\\esperanza'],
                               ['a\\"b', 'a\\"b'],
                               ['promesas\\', 'promesas\\']]){
    const r = await p.evaluate(async ([abrir, fuera, raro, queda]) => {
      const despierta = await eval('(' + abrir + ')')(0, 12, 'nota rara');
      if (!despierta) return { sinPanel:true };
      const i = document.getElementById('tagNueva');
      i.value = raro;
      i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise(z => setTimeout(z, 350));
      /* y se puede volver a tocar: si el nombre no sobrevivió al atributo, el
         chip existe pero no se encuentra por su data-tag */
      /* SE BUSCA POR SU NOMBRE, no «el primero encendido». Lo que este bloque
         vigila es que el nombre sobreviva al viaje por el atributo, y coger el
         primer chip encendido da por hecho que no hay otro — cosa que dejó de
         ser cierta en cuanto el panel puede venir de una glosa con etiquetas
         ya puestas. */
      const chip = [...document.querySelectorAll('#menu .tg')]
        .find(b => b.dataset.tag === queda);
      const seEncuentra = !!chip && chip.classList.contains('on');
      /* volver a crearla NO puede sacar un segundo chip: es la mitad
         silenciosa del fallo del selector */
      const i2 = document.getElementById('tagNueva');
      i2.value = raro;
      i2.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise(z => setTimeout(z, 300));
      const cuantosChips = [...document.querySelectorAll('#menu .tg')]
        .filter(b => b.dataset.tag === queda).length;
      await eval('(' + fuera + ')')();
      const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
      const mia = g.find(m => (m.etiquetas||[]).includes(queda));
      return { seEncuentra, cuantosChips, guardada: !!mia,
               /* ni repetida en la propia marca */
               vecesEnLaMarca: mia ? mia.etiquetas.filter(x => x === queda).length : 0,
               /* y que no haya quedado por ahí el nombre crudo, que sería la
                  otra manera de pasar esto: guardar las dos versiones */
               quedaElCrudo: raro !== queda &&
                 g.some(m => (m.etiquetas||[]).includes(raro)) };
    }, [ABRIR, FUERA, raro, queda]);
    vale('sobrevive «' + raro + '» como «' + queda + '»',
         !r.sinPanel && r.guardada && r.seEncuentra, JSON.stringify(r));
    vale('  y no se duplica el chip', r.cuantosChips === 1 && r.vecesEnLaMarca === 1,
         'chips ' + r.cuantosChips + ' · en la marca ' + r.vecesEnLaMarca);
    vale('  ni queda el nombre con espacios por ningún lado',
         r.quedaElCrudo === false, r.quedaElCrudo);
  }

  /* ================================================================
     LAS ETIQUETAS NO LLEVAN ESPACIOS: SE JUNTAN EN JOROBAS.

     Pedido por el dueño del repo. Una etiqueta se escribe para volver a
     encontrarla, y un espacio la rompe por los dos lados: en la hoja
     «#oración diaria» se lee como una etiqueta y una palabra perdida, y al
     buscarla nadie recuerda si la escribió con uno o con dos espacios.

     SE JUNTAN EN JOROBAS Y NO SE BORRA EL ESPACIO A SECAS: «oracióndiaria» no
     se lee, «OraciónDiaria» sí.

     Y UNA SOLA PALABRA NO SE TOCA, que es la mitad que hay que vigilar de
     verdad: la regla existe para quitar espacios, así que donde no hay
     espacios no debe pasar nada. Sin esta línea, poner mayúsculas «por
     coherencia» convertiría «eco» en «Eco» y nadie se enteraría hasta que un
     filtro guardado dejara de encontrar sus glosas.
     ================================================================ */
  titulo('una etiqueta nueva no puede llevar espacios');
  for (const [crudo, queda] of [['  oración diaria  ', 'OraciónDiaria'],
                                ['Para  El   Estudio', 'ParaElEstudio'],
                                ['eco', 'eco'],
                                ['😀 alegría', '😀Alegría']]){
    const r = await p.evaluate(async ([abrir, fuera, crudo]) => {
      const despierta = await eval('(' + abrir + ')')(0, 12, 'nota con etiqueta');
      if (!despierta) return { sinPanel:true };
      const i = document.getElementById('tagNueva');
      i.value = crudo;
      i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise(z => setTimeout(z, 350));
      await eval('(' + fuera + ')')();
      const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
      /* la última marca tocada es la que acaba de recibirla */
      const puestas = g.flatMap(m => m.etiquetas || []);
      return { puestas };
    }, [ABRIR, FUERA, crudo]);
    vale('«' + crudo + '» se guarda «' + queda + '»',
         !r.sinPanel && (r.puestas || []).includes(queda), JSON.stringify(r.puestas));
    /* El emoji entero, que es lo que se rompe al poner la mayúscula con
       charAt: media pareja suplente son dos rombos de reemplazo. */
    vale('  sin partir nada por la mitad',
         !(r.puestas || []).some(t => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(t) ||
                                      /(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(t)),
         JSON.stringify(r.puestas));
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

  /* ================================================================
     LA TIRA DE ETIQUETAS DEL PANEL: APAGADA AL ENTRAR Y PEGADA AL FILO.

     Tres encargos del dueño del repo sobre el mismo renglón, y los tres son
     el mismo: que la tira no se coma el panel.

     · NACE APAGADA. Salía encendida, y encendida de salida ocupa lo que
       ocupen las etiquetas que hayas usado alguna vez, delante del índice de
       glosas, que es a lo que se entra aquí.
     · VA AL FILO IZQUIERDO. Llevaba delante un rótulo en la columna fija
       de los rótulos —96 px en teléfono— que empujaba la primera pastilla casi
       al centro y repetía la palabra del botón que la enciende.
     · Y LAS PASTILLAS ADELGAZAN. Heredaban el suelo de toque de los paneles,
       40 px de alto, que es el que se puso donde fallar un botón repagina el
       libro; aquí un toque enciende un filtro y se deshace tocando otra vez.

     Se mide el alto PINTADO y no la regla: el suelo de 40 px del bloque del
     teléfono pesa (0,2,0) y ya le ganó una vez a una regla escrita sin peso
     —la del botón de cerrar—, así que preguntar por la hoja de estilos aquí
     sería creerse lo que dice el CSS en vez de mirar lo que se ve.
     ================================================================ */
  titulo('las etiquetas del panel nacen apagadas');
  await alPanel();
  const tira = await p.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    const caja = document.getElementById('ctrlEtiquetas');
    const bot = document.getElementById('btnVerEtiquetas');
    const fila = document.getElementById('filaFiltros');
    const apagada = { clase: caja.classList.contains('sin-chips'),
                      fila: getComputedStyle(fila).display,
                      pulsado: bot.getAttribute('aria-pressed'),
                      encendido: bot.classList.contains('active') };
    bot.click();
    await z(450);
    const f = document.getElementById('filtros');
    const cf = getComputedStyle(f);
    const panel = document.getElementById('etiquetas');
    const rp = panel.getBoundingClientRect();
    const cp = getComputedStyle(panel);
    /* El filo de CONTENIDO del panel, no el de su caja: los 9 px de relleno
       los tienen todos los controles y pedir que la pastilla los pise sería
       pedir que se salga del panel. */
    const filo = rp.left + parseFloat(cp.paddingLeft);
    const cajas = [...f.querySelectorAll('.chip')].map(c => c.getBoundingClientRect());
    const chips = cajas.map(r => ({ alto: Math.round(r.height) }));
    /* EL PRIMERO DE LA TIRA, sea lo que sea: hasta hace poco era una pastilla
       y hoy es el combo de los días, que se mudó aquí porque filtra igual que
       ellas. Se mira lo que hay, no lo que se supone que hay —si esta línea
       siguiera buscando .chip, mediría la primera pastilla DESPUÉS del combo y
       diría que la tira no arranca en el filo cuando arranca—.
       Y del PRIMER RENGLÓN, por eso se filtra por altura: la tira se parte en
       varios y el de más a la izquierda de todos podría ser del segundo. */
    const todos = [...f.children].map(c => c.getBoundingClientRect())
                                 .filter(r => r.width > 0);
    const arriba = todos.length ? Math.min(...todos.map(r => r.top)) : 0;
    const primera = todos.filter(r => Math.abs(r.top - arriba) < 3)
                         .sort((a, b) => a.left - b.left)[0];
    /* EL COMBO DE LOS DÍAS, dentro de la tira y el primero de todo. Vivía en
       la fila de los botones, entre un rótulo y ellos, como si fuera un ajuste
       del panel; filtra exactamente igual que un chip —esconde glosas de la
       hoja y de la lista— y ahora vive donde viven los filtros. */
    const dia = document.getElementById('selDia');
    const rd = dia ? dia.getBoundingClientRect() : null;
    const rst = document.querySelector('.stage').getBoundingClientRect();
    return { apagada,
             /* Y DE PASO EL ALTO: este panel es el único con alto fijo —su
                índice es flexible y necesita de dónde estirarse— y subió del
                95% al 100% de la escena. */
             altoPanel: Math.round(rp.height), escena: Math.round(rst.height),
             encendida: { fila: getComputedStyle(fila).display,
                          pulsado: bot.getAttribute('aria-pressed'),
                          encendido: bot.classList.contains('active') },
             cuantas: chips.length,
             altoMax: chips.length ? Math.max(...chips.map(c => c.alto)) : 0,
             primeraDesdeElFilo: primera ? Math.round(primera.left - filo) : null,
             tope: cf.maxHeight, desborde: cf.overflowY,
             /* EL RIEL NO ESTÁ CUANDO NO SOBRA LISTA, que es lo que impide
                que se vuelva un adorno: un riel con el dedo ocupándolo entero
                dice «esto es todo» con una barra al lado, y enseña a no
                mirarla. Aquí hay tres o cuatro etiquetas y caben. */
             rielSinFalta: +getComputedStyle(document.getElementById('filtrosRiel')).opacity,
             cabeEntera: f.scrollHeight <= f.clientHeight + 2,
             /* Y LA FILA DE LOS BOTONES SE QUEDÓ SIN RÓTULO: decía «etiquetas»
                dentro del panel que se llama GLOSAS, o sea nada que distinga
                esa fila de las demás, y cobraba por ello una columna fija. */
             rotuloFila: !!document.querySelector('.fila-etiq .lbl'),
             /* LOS DOS RÓTULOS, que cambiaron de palabra. Eran «ver» y
                «cambiar» —dos verbos que en una pantalla de glosas valen para
                casi todo— y como los dos botones se excluyen, el lector tiene
                que entender en un vistazo entre qué dos cosas elige. Se miran
                las letras pintadas, que es lo único que el lector lee: los ids
                siguen llamándose como siempre a propósito. */
             rotulos: [bot.textContent.trim(),
                       document.getElementById('btnElegirGlosas').textContent.trim()],
             dia: dia ? { enLaTira: dia.parentElement === f,
                          elPrimero: f.firstElementChild === dia,
                          alto: Math.round(rd.height),
                          desdeElFilo: Math.round(rd.left - filo),
                          enLaFilaVieja: !!document.querySelector('.fila-etiq #selDia') }
                       : null };
  });
  di('la tira', JSON.stringify(tira));
  vale('(la prueba es válida) hay etiquetas que enseñar', tira.cuantas > 0,
       tira.cuantas + ' pastillas');
  vale('AL ENTRAR, LAS ETIQUETAS ESTÁN APAGADAS',
       tira.apagada.clase === true && tira.apagada.fila === 'none' &&
       tira.apagada.pulsado === 'false' && tira.apagada.encendido === false,
       tira.apagada);
  vale('y el botón «filtrar» las enciende',
       tira.encendida.fila !== 'none' && tira.encendida.pulsado === 'true' &&
       tira.encendida.encendido === true, tira.encendida);
  vale('LA TIRA ARRANCA EN EL FILO', Math.abs(tira.primeraDesdeElFilo) <= 1,
       tira.primeraDesdeElFilo + ' px del filo del contenido');
  vale('LA FILA DE LOS BOTONES SE QUEDÓ SIN RÓTULO',
       tira.rotuloFila === false, tira.rotuloFila);
  vale('LOS BOTONES DICEN FILTRAR Y ACTUALIZAR',
       tira.rotulos[0] === 'filtrar' && tira.rotulos[1] === 'actualizar',
       tira.rotulos.join(' · '));
  /* EL DÍA ES UN FILTRO MÁS Y VIVE CON LOS DEMÁS. Se comprueban las dos
     mitades: que esté en la tira Y que ya no esté en la fila de antes. Sólo
     la primera pasaría en verde con el combo duplicado, que es un estado que
     no se ve mirando una pantalla. */
  vale('EL DÍA SE FUE CON LAS ETIQUETAS, Y EL PRIMERO',
       !!tira.dia && tira.dia.enLaTira === true && tira.dia.elPrimero === true &&
       tira.dia.enLaFilaVieja === false, tira.dia);
  vale('  arrancando en el filo, como la tira',
       !!tira.dia && Math.abs(tira.dia.desdeElFilo) <= 1,
       tira.dia && tira.dia.desdeElFilo + ' px');
  /* Y VESTIDO DE PASTILLA: si midiera lo que mide un campo de formulario en
     medio de una fila de pastillas, se leería como un ajuste y no como un
     filtro, que es la confusión que lo tenía en la otra fila. */
  vale('  y del alto de una pastilla',
       !!tira.dia && Math.abs(tira.dia.alto - tira.altoMax) <= 2,
       tira.dia && (tira.dia.alto + ' px contra ' + tira.altoMax));
  vale('LAS PASTILLAS NO SE COMEN UN RENGLÓN ENTERO',
       tira.altoMax > 0 && tira.altoMax <= 32, tira.altoMax + ' px de alto');
  /* Y sigue siendo un blanco que se acierta: bajarlas era el encargo,
     dejarlas en una raya no. */
  vale('  y siguen siendo tocables', tira.altoMax >= 24, tira.altoMax + ' px');
  vale('EL PANEL DE GLOSAS LLENA LA ESCENA A LO ALTO',
       Math.abs(tira.altoPanel - tira.escena) <= 1,
       tira.altoPanel + ' de ' + tira.escena);
  vale('(la prueba es válida) con estas pocas etiquetas la tira cabe entera',
       tira.cabeEntera === true, tira.cabeEntera);
  vale('Y SIN LISTA QUE SOBRE, EL RIEL NO ESTÁ', tira.rielSinFalta < .02,
       tira.rielSinFalta);
  vale('la tira tiene techo y se corre por dentro',
       tira.tope !== 'none' && parseFloat(tira.tope) > 0 &&
       /auto|scroll/.test(tira.desborde),
       tira.tope + ' · ' + tira.desborde);

  /* ================================================================
     LAS PASTILLAS MIDEN LO QUE MIDEN LAS ETIQUETAS DE DENTRO DE LA GLOSA.

     Es la misma palabra en dos sitios: «#estudio» escrito al pie de la nota,
     donde se consulta, y «estudio» en la tira, donde se toca para filtrar. A
     dos tamaños distintos se leen como dos cosas, y la letra de las glosas la
     elige el lector, así que no es cosa de acertar un número una vez: la
     pastilla tiene que seguir a la glosa cada vez que la muevan.

     Estuvo atada a la escala del cromo, que crece con el tamaño del LIBRO, o
     sea que cambiar la letra de las glosas movía la etiqueta de la hoja y
     dejaba la pastilla quieta.

     Se mide a DOS tamaños y se comprueba también que el número cambió: si la
     letra no se moviera —un control que no engancha, un cambio que no llega a
     la tira— las dos medidas seguirían siendo iguales entre sí y la prueba
     pasaría en verde sin haber comprobado nada. Y se mueve por el control de
     GLOSAS, que es por donde lo mueve el lector.
     ================================================================ */
  titulo('la pastilla mide lo que mide la etiqueta de la glosa');
  const letras = await p.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    const mide = () => {
      const enLaHoja = document.querySelector('#pgMargin .gl .gl-tag, #pgBody .gl .gl-tag');
      const chip = document.querySelector('#filtros .chip');
      return { glosa: enLaHoja ? +parseFloat(getComputedStyle(enLaHoja).fontSize).toFixed(2) : null,
               pastilla: chip ? +parseFloat(getComputedStyle(chip).fontSize).toFixed(2) : null,
               alto: chip ? Math.round(chip.getBoundingClientRect().height) : null };
    };
    const sel = document.getElementById('fsGlosaAhora');
    const antes = sel.value;
    const tamanos = [...sel.options].map(o => +o.value);
    const poner = async n => {
      sel.value = String(n);
      sel.dispatchEvent(new Event('change', { bubbles:true }));
      await z(2500);
    };
    await poner(Math.max(...tamanos));
    const grande = mide();
    await poner(Math.min(...tamanos));
    const chica = mide();
    /* Se deja como estaba: los bloques de abajo cuentan glosas y no tienen
       por qué heredar la letra al mínimo. */
    await poner(+antes);
    return { grande, chica, tope: Math.max(...tamanos), suelo: Math.min(...tamanos),
             vuelta: mide() };
  });
  di('las dos letras', JSON.stringify(letras));
  vale('(la prueba es válida) se ve una etiqueta en la hoja y una pastilla',
       letras.grande.glosa !== null && letras.grande.pastilla !== null, letras.grande);
  vale('(la prueba es válida) el tamaño de verdad cambió',
       letras.grande.glosa !== letras.chica.glosa,
       letras.chica.glosa + ' → ' + letras.grande.glosa + ' px');
  vale('CON LA LETRA AL TOPE, LA PASTILLA MIDE LO MISMO QUE LA ETIQUETA',
       Math.abs(letras.grande.pastilla - letras.grande.glosa) <= 0.1,
       letras.grande.pastilla + ' contra ' + letras.grande.glosa);
  vale('  y con la letra al mínimo, también',
       Math.abs(letras.chica.pastilla - letras.chica.glosa) <= 0.1,
       letras.chica.pastilla + ' contra ' + letras.chica.glosa);
  /* Y LA PASTILLA NO SE ENCOGE POR DEBAJO DE UN BLANCO DE DEDO. La letra baja
     hasta 7,8 px si el lector quiere; el botón que la lleva, no. */
  vale('  sin perder el blanco de toque con la letra chica',
       letras.chica.alto >= 26, letras.chica.alto + ' px de alto');

  /* ================================================================
     FILTRAR Y ACTUALIZAR NO PUEDEN ESTAR LOS DOS PUESTOS.

     Son dos maneras de usar la misma lista y se estorban: con las dos
     encendidas, la mitad de arriba del panel pregunta cuáles quieres FILTRAR y
     la de abajo cuáles quieres TOCAR, con los mismos chips a la vista para dos
     cosas distintas. Apagadas las dos sí se puede —es el sitio de fábrica, el
     índice a solas— así que no son un interruptor de dos posiciones: son dos
     que se excluyen, y eso son tres estados de cuatro. Se recorren los tres.
     ================================================================ */
  titulo('filtrar y actualizar se excluyen, pero las dos pueden estar apagadas');
  await alPanel();
  const turnos = await p.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    const ver = document.getElementById('btnVerEtiquetas');   /* dice «filtrar» */
    const cam = document.getElementById('btnElegirGlosas');   /* dice «actualizar» */
    const foto = () => ({
      ver: ver.getAttribute('aria-pressed'), cam: cam.getAttribute('aria-pressed'),
      /* Y lo que cada uno enciende de verdad, no sólo su botón: la tira y la
         barra de elegir. Un par de aria-pressed bien puestos sobre dos
         panales abiertos a la vez seguiría siendo el estado que se prohibió. */
      tira: getComputedStyle(document.getElementById('filaFiltros')).display,
      barra: getComputedStyle(document.getElementById('barraGrupo')).display });
    /* Se parte de las dos apagadas, que es como nace el panel; si algún
       bloque de arriba dejó una puesta, se apaga a mano por su botón. */
    if (ver.getAttribute('aria-pressed') === 'true'){ ver.click(); await z(420); }
    if (cam.getAttribute('aria-pressed') === 'true'){ cam.click(); await z(420); }
    const ninguna = foto();
    ver.click(); await z(450);
    const conVer = foto();
    cam.click(); await z(450);
    const conCambiar = foto();
    ver.click(); await z(450);
    const otraVez = foto();
    ver.click(); await z(450);
    const apagadaOtraVez = foto();
    return { ninguna, conVer, conCambiar, otraVez, apagadaOtraVez };
  });
  di('los turnos', JSON.stringify(turnos));
  vale('(la prueba es válida) se parte con las dos apagadas',
       turnos.ninguna.ver === 'false' && turnos.ninguna.cam === 'false',
       turnos.ninguna);
  vale('  y con las dos apagadas no sale ni la tira ni la barra',
       turnos.ninguna.tira === 'none' && turnos.ninguna.barra === 'none',
       turnos.ninguna);
  vale('FILTRAR ENCIENDE LA TIRA Y DEJA ACTUALIZAR APAGADO',
       turnos.conVer.ver === 'true' && turnos.conVer.cam === 'false' &&
       turnos.conVer.tira !== 'none' && turnos.conVer.barra === 'none',
       turnos.conVer);
  vale('ACTUALIZAR APAGA A FILTRAR, Y CON ÉL LA TIRA',
       turnos.conCambiar.cam === 'true' && turnos.conCambiar.ver === 'false' &&
       turnos.conCambiar.tira === 'none' && turnos.conCambiar.barra !== 'none',
       turnos.conCambiar);
  vale('  y FILTRAR vuelve a apagar a ACTUALIZAR',
       turnos.otraVez.ver === 'true' && turnos.otraVez.cam === 'false' &&
       turnos.otraVez.barra === 'none', turnos.otraVez);
  vale('Y LAS DOS PUEDEN QUEDARSE APAGADAS',
       turnos.apagadaOtraVez.ver === 'false' && turnos.apagadaOtraVez.cam === 'false' &&
       turnos.apagadaOtraVez.tira === 'none' && turnos.apagadaOtraVez.barra === 'none',
       turnos.apagadaOtraVez);

  /* ================================================================
     UN FILTRO PUESTO NUNCA SE QUEDA SIN AVISO NI SIN MANDO.

     La tira se apaga a mano —o la apaga CAMBIAR, que se excluye con ella— y
     los filtros no se van con ella: el índice y la hoja siguen escondiendo lo
     que escondían y en pantalla no queda nada que lo explique. Con las
     etiquetas ya pasaba; con el día empezó a pasar al mudar su combo dentro de
     la tira, que hasta entonces vivía en una fila que no se esconde nunca.

     El mando es el propio botón de FILTRAR —él la vuelve a enseñar— así que el
     aviso se le pone encima. Se comprueban los tres estados que importan:
     con la tira puesta NO hay punto (el filtro se ve solo, un punto sobraría y
     enseñaría a no hacerle caso), escondida SÍ, y sin filtro no lo hay aunque
     la tira esté escondida. La tercera es la que impide que esto se convierta
     en un adorno permanente.

     Se mira el punto PINTADO —el content del ::after— y no la clase que lo
     enciende: la clase es la orden, el punto es lo que se ve.
     ================================================================ */
  titulo('un filtro escondido se anuncia en el botón');
  await alPanel();
  const aviso = await p.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    const ver = document.getElementById('btnVerEtiquetas');   /* dice «filtrar» */
    const cam = document.getElementById('btnElegirGlosas');   /* dice «actualizar» */
    const foto = () => ({
      punto: getComputedStyle(ver, '::after').content,
      voz: ver.getAttribute('aria-label') || '',
      tira: getComputedStyle(document.getElementById('filaFiltros')).display });
    /* SE PIDE EL ESTADO, NO SE CUENTA CLICS. Este bloque enciende y apaga la
       tira seis veces por dos caminos —su botón y CAMBIAR, que se excluyen— y
       escrito a base de «un clic más» se desincroniza en cuanto uno de los dos
       caminos cambie de efecto: se mediría el estado de al lado y la prueba
       diría cosas ciertas sobre el momento equivocado. Pasó al escribirlo. */
    const ponerVer = async on => {
      if ((ver.getAttribute('aria-pressed') === 'true') !== on){
        ver.click(); await z(520);
      }
    };
    await ponerVer(true);
    /* Un filtro de etiqueta, puesto como lo pone un dedo. */
    const chip = [...document.querySelectorAll('#filtros .chip')]
      .find(c => !c.classList.contains('chip-libro') &&
                 !c.classList.contains('chip-mas'));
    if (!chip) return { sinChip:true };
    chip.click(); await z(1200);
    const alaVista = foto();
    await ponerVer(false);
    const escondido = foto();
    await ponerVer(true);
    const devuelto = foto();
    /* Y por el otro camino: CAMBIAR también apaga la tira. */
    cam.click(); await z(620);
    const porCambiar = foto();
    cam.click(); await z(620);
    /* Se quita el filtro y se esconde la tira: sin filtro, sin punto. */
    await ponerVer(true);
    const puesto = [...document.querySelectorAll('#filtros .chip.sel')]
      .find(c => !c.classList.contains('chip-libro'));
    if (puesto){ puesto.click(); await z(1200); }
    await ponerVer(false);
    const limpio = foto();
    /* Y el día, que es el que estrenó el agujero al mudarse aquí dentro. */
    const dia = document.getElementById('selDia');
    const cual = [...dia.options].map(o => o.value).find(Boolean);
    let porDia = null;
    if (cual){
      await ponerVer(true);
      dia.value = cual;
      dia.dispatchEvent(new Event('change', { bubbles:true }));
      await z(1300);
      await ponerVer(false);
      porDia = foto();
      /* Se deja como estaba: el día puesto escondería glosas a los bloques
         de abajo, que cuentan cuántas se ven. */
      await ponerVer(true);
      dia.value = '';
      dia.dispatchEvent(new Event('change', { bubbles:true }));
      await z(1300);
    }
    return { alaVista, escondido, devuelto, porCambiar, limpio, porDia };
  });
  di('el aviso', JSON.stringify(aviso));
  const conPunto = f => /•/.test(f.punto);
  vale('(la prueba es válida) se pudo poner un filtro', !aviso.sinChip, aviso);
  vale('con la tira a la vista NO hay punto, que el filtro se ve solo',
       aviso.alaVista.tira !== 'none' && !conPunto(aviso.alaVista), aviso.alaVista);
  vale('ESCONDER LA TIRA CON UN FILTRO PUESTO LO ANUNCIA EN EL BOTÓN',
       aviso.escondido.tira === 'none' && conPunto(aviso.escondido) &&
       /filtro/i.test(aviso.escondido.voz), aviso.escondido);
  vale('  y el punto se va al volver a enseñarla',
       !conPunto(aviso.devuelto), aviso.devuelto);
  vale('ACTUALIZAR APAGA LA TIRA Y TAMBIÉN LO ANUNCIA',
       aviso.porCambiar.tira === 'none' && conPunto(aviso.porCambiar),
       aviso.porCambiar);
  /* La que impide que el punto se vuelva un adorno permanente. */
  vale('SIN FILTRO NO HAY PUNTO, aunque la tira esté escondida',
       aviso.limpio.tira === 'none' && !conPunto(aviso.limpio), aviso.limpio);
  vale('y el DÍA cuenta como filtro, que para eso se mudó a la tira',
       !!aviso.porDia && aviso.porDia.tira === 'none' && conPunto(aviso.porDia),
       aviso.porDia);

  titulo('los chips de la tira filtran');
  await alPanel();
  await encenderEtiquetas();
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

  titulo('abrir la lista NO mueve el panel');
  /* ESTE BLOQUE AFIRMABA LO CONTRARIO, Y CAMBIÓ CON LA FUNCIÓN.

     Cuando el panel salía pegado al pasaje, su `top` dependía de su propio
     alto: abrir la lista lo estiraba y colocarMenu tenía que recolocarlo,
     casi siempre un empujón corto hacia arriba. Y había un escalón —si arriba
     ya no cabía, el panel se pasaba DEBAJO del pasaje— que no tenía cuadros
     que enseñar: aparecía 309 px más abajo de un cuadro para el siguiente.
     Eso es lo que este bloque vigilaba, y por eso terminaba exigiendo que
     ALGÚN pasaje hiciera al panel cambiarse de lado: sin eso, la comprobación
     del salto pasaba sin haber mirado nada.

     Ahora el panel sale clavado casi arriba, así que la lista lo estira hacia
     ABAJO y el filo de arriba se queda donde está. Medido en los catorce
     pasajes de la hoja: 0 mueven el panel, donde antes lo movían nueve. O sea
     que la premisa de aquella última comprobación ya no se puede cumplir
     nunca, y una prueba que exige lo que el programa dejó de hacer a propósito
     es peor que no tenerla: enseña a ignorar el rojo.

     Así que se le da la vuelta y se afirma lo que pasa —el panel no se mueve—,
     conservando la vigilancia del teletransporte, que sigue teniendo sentido:
     el escalón NO se ha quitado del programa, queda para cuando el panel
     estirado no quepa de arriba abajo, y si alguna vez vuelve a dispararse
     aquí, tiene que ser sin saltos.

     Se recorre la hoja ENTERA y no un pasaje elegido, porque lo que hiciera el
     panel dependía de a qué altura cayera el pasaje: con uno solo, la prueba
     diría una cosa u otra según qué versículo tocara ese día. */
  const saltos = await p.evaluate(async () => {
    const menu = document.getElementById('menu');
    const filas = [];
    const cuantos = document.querySelectorAll('#pgBody .v').length;
    for (let k = 0; k < cuantos; k++){
      document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
        { bubbles:true, clientX:5, clientY:5 }));
      await new Promise(z => setTimeout(z, 700));
      const v = document.querySelectorAll('#pgBody .v')[k]; if (!v) continue;
      if (!await window.__glosarEn(v, 5, 25)) continue;
      const ta = document.getElementById('glosaCaja'); if (!ta) continue;
      ta.value = 'una nota cualquiera';
      ta.dispatchEvent(new Event('input', { bubbles:true }));
      await new Promise(z => setTimeout(z, 200));
      const bot = menu.querySelector('.mtags'); if (!bot) continue;
      const tops = [], altos = []; let vivo = true;
      const mirar = () => { if (!vivo) return;
        const b = menu.getBoundingClientRect();
        tops.push(Math.round(b.top)); altos.push(Math.round(b.height));
        requestAnimationFrame(mirar); };
      requestAnimationFrame(mirar);
      bot.click();
      await new Promise(z => setTimeout(z, 900));
      vivo = false;
      let paso = 0;
      for (let i = 1; i < tops.length; i++) paso = Math.max(paso, Math.abs(tops[i] - tops[i-1]));
      /* SE GUARDA LA GEOMETRÍA, no solo el recorrido. Sin el alto del panel y
         el del escenario no se puede distinguir «el panel se movió sin motivo»
         de «el panel se movió porque ya no cabía», que son un fallo y un
         acierto. La vez que esto salió en rojo, el mensaje decía «56px» y no
         había manera de saber cuál de las dos cosas era. */
      const esc = document.getElementById('stage').getBoundingClientRect();
      filas.push({ pasaje:k, paso, recorrido: Math.abs(tops[tops.length-1] - tops[0]),
                   arribaAntes: tops[0], arriba: tops[tops.length-1],
                   alto: altos[altos.length-1], escenario: Math.round(esc.height) });
    }
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 700));
    return filas;
  });
  const peor = saltos.reduce((a, b) => b.paso > a.paso ? b : a, { paso:0, recorrido:0 });
  const masLejos = saltos.reduce((a, b) => b.recorrido > a.recorrido ? b : a, { recorrido:0 });
  di('el peor cuadro', peor);
  di('el viaje más largo', masLejos);
  vale('la hoja da pasajes que probar', saltos.length > 3, saltos.length + ' pasajes');
  /* El listón está lejos de los 25px que se miden aquí a propósito: en una
     máquina que suelte cuadros el mismo recorrido sale en pasos más largos,
     y lo que esta prueba tiene que cazar es el teletransporte —309px—, no una
     décima de diferencia. */
  vale('ningún cuadro da un salto', peor.paso < 80, peor.paso + 'px en el peor');
  /* LO QUE ESTE BLOQUE VIGILA AHORA, Y POR QUÉ NO ES «NO SE MUEVE» A SECAS.

     Primero puse eso: que el panel no se moviera, con dos píxeles de margen
     para el redondeo. Pasaba en mi máquina —barriendo la hoja entera, 0 de 14—
     y salió en rojo en la tanda completa: «1 de 12 se movieron, 56px». Probé a
     reproducirlo con glosas sembradas, con trescientas etiquetas, con el panel
     de una glosa ya existente en vez de una nueva, y con el cajón lateral
     abierto. Ninguna de las cuatro lo reprodujo. No sé todavía qué estado lo
     provoca.

     Pero el problema estaba en la aserción antes que en el estado, y eso sí lo
     sé: «no se mueve» NO ES LO QUE EL PROGRAMA PROMETE. sitioDelMenu promete
     que el panel va a MENU_ARRIBA del filo *salvo que no quepa*, y cuando no
     cabe tiene que subirlo —el escalón, que se conservó a propósito para las
     pantallas bajas—. O sea que yo estaba afirmando algo más fuerte que la
     función, y un panel que se aparta porque no cabe es un acierto que mi
     línea contaba como fallo.

     Así que se afirma la promesa entera: o el panel se queda, o se movió
     porque topaba con el borde. Eso no depende de en qué estado lo dejen los
     bloques de antes, que es la enfermedad que ya costó dos rojos hoy. Y NO es
     una aserción más floja: un panel que se mueva TENIENDO sitio sigue dando
     rojo, que es el fallo que esto vigila. Lo único que deja de contar como
     fallo es el caso que la función hace a propósito.

     Y se imprime la geometría de cada uno que se mueva, porque el rojo de
     «56px» a secas no dejaba distinguir las dos cosas y costó cuatro sondas. */
  const cabe = f => f.arriba + f.alto + 2 < f.escenario;
  const sospechosos = saltos.filter(f => f.recorrido > 2 && cabe(f));
  for (const f of saltos.filter(f => f.recorrido > 2))
    di('  se movió el pasaje ' + f.pasaje,
       'arriba ' + f.arribaAntes + ' → ' + f.arriba + ' (' + f.recorrido + 'px)' +
       ' · alto ' + f.alto + ' · escenario ' + f.escenario +
       ' · fondo ' + (f.arriba + f.alto) + (cabe(f) ? '  ← CABÍA: no tenía por qué moverse'
                                                    : '  ← topaba con el borde'));
  vale('el panel se queda, salvo que no quepa', sospechosos.length === 0,
       sospechosos.length ? (sospechosos.length + ' se movieron TENIENDO sitio')
                          : (saltos.filter(f => f.recorrido > 2).length + ' de ' + saltos.length +
                             ' se movieron, todos por no caber'));

  /* ================================================================
     Y CON MUCHAS ETIQUETAS, LA TIRA SIGUE SIN COMERSE EL PANEL.

     Ésta es la mitad que de verdad importa del techo, y la que no se ve con
     las tres o cuatro etiquetas que deja el resto de la suite: una tira sin
     tope crece con cada etiqueta que hayas usado alguna vez, empuja al índice
     de glosas hacia abajo y, pasado el tope del panel, lo que sobra se sale
     por fuera de la pantalla sin manera de alcanzarlo.

     Las treinta etiquetas se siembran en el almacén y se recarga, como se
     siembra el estado de partida en las otras suites: no es un simulacro del
     programa —el programa lee su almacén y pinta lo que hay— es la biblioteca
     de alguien que lleva un año etiquetando. Se cuelgan de la marca que ya
     existe para no inventar una: lo que hace falta aquí son etiquetas, no
     glosas.
     ================================================================ */
  titulo('con muchas etiquetas, la tira tiene su sitio y el índice el suyo');
  await p.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    if (!g.length) return false;
    g[0].etiquetas = Array.from({ length:30 }, (_, i) => 'etiqueta' + (i + 1));
    localStorage.setItem('glossa:marcas:v1', JSON.stringify(g));
    return true;
  });
  await p.reload();
  await p.waitForTimeout(2600);
  await alPanel();
  await encenderEtiquetas();
  const muchas = await p.evaluate(() => {
    const f = document.getElementById('filtros');
    const ix = document.getElementById('indice');
    const panel = document.getElementById('etiquetas');
    const rf = f.getBoundingClientRect(), rx = ix.getBoundingClientRect();
    const rp = panel.getBoundingClientRect();
    return { chips: f.querySelectorAll('.chip').length,
             tira: Math.round(rf.height),
             /* EL AVISO DE QUE LA LISTA SIGUE. Un techo sin aviso es una lista
                cortada: el lector ve seis etiquetas y da por hecho que tiene
                seis. Se mira la sombra PINTADA —la opacidad del ::after— y no
                la clase que la enciende: la clase es la orden, la sombra es lo
                que se ve. La barra va aparte, porque en un teléfono es de las
                que sólo aparecen mientras algo se mueve. */
             sombra: +getComputedStyle(document.getElementById('filaFiltros'),
                                       '::after').opacity,
             /* EL RIEL, QUE LO PINTA LA CASA. Aquí se miraba la barra del
                navegador (scrollbarWidth), y se quitó a propósito: en un
                teléfono ésas son de superposición —aparecen mientras algo se
                mueve y se van solas— y lo que se pidió es que se vea SIEMPRE,
                para saber que hay más etiquetas antes de tocar nada. Así que
                ahora hay un riel dibujado, y lo que se mide es él. */
             riel: (() => {
               const r = document.getElementById('filtrosRiel');
               if (!r) return null;
               const dedo = r.firstElementChild;
               const rr = r.getBoundingClientRect(), rd = dedo.getBoundingClientRect();
               return { puesto: +getComputedStyle(r).opacity,
                        alto: Math.round(rr.height),
                        dedo: Math.round(rd.height),
                        dentro: rd.top >= rr.top - 1 && rd.bottom <= rr.bottom + 1,
                        /* Y que no se meta debajo de las pastillas. */
                        libre: [...f.querySelectorAll('.chip')]
                                 .every(c => c.getBoundingClientRect().right <= rr.left + 1) };
             })(),
             /* Lo que la tira mediría suelta, que es contra lo que se compara
                el techo: si no la desborda, el techo no se está probando. */
             suelta: Math.round(f.scrollHeight),
             seCorre: f.scrollHeight > f.clientHeight + 4,
             indice: Math.round(rx.height),
             panel: Math.round(rp.height),
             /* Y nada por debajo del canto del panel. */
             tiraDentro: rf.bottom <= rp.bottom + 1,
             indiceDentro: rx.top < rp.bottom - 20 };
  });
  di('con treinta etiquetas', JSON.stringify(muchas));
  vale('(la prueba es válida) hay etiquetas de sobra para desbordar la tira',
       muchas.chips >= 30 && muchas.suelta > muchas.tira + 20,
       muchas.chips + ' pastillas · ' + muchas.suelta + ' px sueltas contra ' +
       muchas.tira + ' puestas');
  vale('LA TIRA SE QUEDA EN SU SITIO Y SE CORRE POR DENTRO',
       muchas.seCorre === true && muchas.tira < muchas.panel / 3,
       muchas.tira + ' px de ' + muchas.panel);
  vale('  y no se sale del panel', muchas.tiraDentro === true, muchas);
  /* EL ÍNDICE ES A LO QUE SE ENTRA AQUÍ, y es lo que la tira le quitaba. */
  vale('Y EL ÍNDICE DE GLOSAS SIGUE TENIENDO SITIO',
       muchas.indice > 120 && muchas.indiceDentro === true,
       muchas.indice + ' px de alto');
  vale('Y SE AVISA DE QUE LA LISTA SIGUE POR DEBAJO', muchas.sombra > .9,
       'sombra al ' + Math.round(muchas.sombra * 100) + '%');
  vale('EL RIEL SE VE SIN TOCAR NADA', !!muchas.riel && muchas.riel.puesto > .9,
       muchas.riel);
  /* Y DICE CUÁNTO FALTA: un dedo que ocupara el riel entero sería un adorno
     que dice «esto es todo» justo donde no lo es. */
  vale('  con su dedo más corto que el riel, que es lo que dice cuánto falta',
       !!muchas.riel && muchas.riel.dedo < muchas.riel.alto - 8 &&
       muchas.riel.dedo >= 16,
       muchas.riel && (muchas.riel.dedo + ' de ' + muchas.riel.alto));
  vale('  sin salirse del riel ni meterse bajo las pastillas',
       !!muchas.riel && muchas.riel.dentro === true && muchas.riel.libre === true,
       muchas.riel);
  /* Y EL AVISO SE APAGA AL LLEGAR AL FINAL. Es la mitad que se rompe sola:
     una sombra que no se va deja de decir nada, y además diría que hay más
     cuando ya no hay. */
  const alFondo = await p.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    const f = document.getElementById('filtros');
    const fila = document.getElementById('filaFiltros');
    const riel = document.getElementById('filtrosRiel');
    const dedo = () => {
      const rr = riel.getBoundingClientRect();
      const rd = riel.firstElementChild.getBoundingClientRect();
      return { sitio: Math.round(rd.top - rr.top),
               dentro: rd.top >= rr.top - 1 && rd.bottom <= rr.bottom + 1,
               puesto: +getComputedStyle(riel).opacity };
    };
    const arriba = dedo();
    f.scrollTop = f.scrollHeight;
    await z(450);
    const abajo = +getComputedStyle(fila, '::after').opacity;
    const dedoAbajo = dedo();
    f.scrollTop = 0;
    await z(450);
    return { abajo, alVolver: +getComputedStyle(fila, '::after').opacity,
             arriba, dedoAbajo, dedoAlVolver: dedo() };
  });
  di('la sombra al fondo', JSON.stringify(alFondo));
  vale('  y se apaga al llegar al final', alFondo.abajo < .1, alFondo.abajo);
  vale('  y vuelve al subir', alFondo.alVolver > .9, alFondo.alVolver);
  /* EL DEDO SÍ SE QUEDA, que es la diferencia entre el riel y la sombra: la
     sombra dice «queda lista por debajo» y al final es que no; el riel dice
     «esto es más largo de lo que se ve», y eso sigue siendo verdad. */
  vale('EL RIEL SIGUE PUESTO AL LLEGAR AL FONDO',
       alFondo.dedoAbajo.puesto > .9, alFondo.dedoAbajo);
  vale('  y su dedo se ha ido abajo, sin salirse',
       alFondo.dedoAbajo.sitio > alFondo.arriba.sitio &&
       alFondo.dedoAbajo.dentro === true,
       alFondo.arriba.sitio + '  →  ' + alFondo.dedoAbajo.sitio);
  vale('  y vuelve arriba con la tira',
       alFondo.dedoAlVolver.sitio === alFondo.arriba.sitio,
       alFondo.dedoAlVolver.sitio + ' contra ' + alFondo.arriba.sitio);

  /* ================================================================
     EL DÍA FILTRA DESDE SU SITIO NUEVO.

     Se mudó de la fila de los botones a la tira de los filtros, y una mudanza
     de un control con oyente es justo donde se pierde el oyente: se mueve el
     nodo y el manejador viaja con él, pero basta con que alguien lo recree
     para que el combo quede de adorno. Así que no se comprueba que esté, se
     comprueba que FILTRE.

     Hacen falta dos días, y el día sale de la fecha guardada en cada glosa, así
     que se siembra en el almacén y se recarga —el mismo camino que usa este
     fichero para el filtro guardado—. Con todas las glosas del mismo día no
     hay nada que esconder y la comprobación pasaría en verde sin filtrar.
     ================================================================ */
  titulo('el día filtra desde la tira, como una etiqueta más');
  const sembradas = await p.evaluate(() => {
    const ms = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const con = ms.filter(m => m.nota);
    if (con.length < 2) return null;
    /* La primera se va a un día de hace años; las demás se quedan donde
       estén. Así hay dos días y se sabe cuál es cuál. */
    con[0].creada = '2020-01-02';
    localStorage.setItem('glossa:marcas:v1', JSON.stringify(ms));
    return { total: con.length, apartada: con[0].nota };
  });
  await p.reload();
  await p.waitForTimeout(2600);
  await alPanel();
  await encenderEtiquetas();
  const porDia = await p.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    const dia = document.getElementById('selDia');
    const cuantas = () => document.querySelectorAll('#indice .ix-item').length;
    const opcion = [...dia.options].find(o => o.value === '2020-01-02');
    if (!opcion) return { sinDia: [...dia.options].map(o => o.value) };
    const antes = cuantas();
    dia.value = '2020-01-02';
    dia.dispatchEvent(new Event('change', { bubbles:true }));
    await z(1400);
    const filtrado = { n: cuantas(), marcado: dia.classList.contains('sel') };
    dia.value = '';
    dia.dispatchEvent(new Event('change', { bubbles:true }));
    await z(1400);
    return { antes, filtrado, vuelven: cuantas(),
             marcadoAlQuitar: dia.classList.contains('sel') };
  });
  di('por día', JSON.stringify(porDia));
  vale('(la prueba es válida) hay glosas de dos días',
       !!sembradas && !porDia.sinDia && porDia.antes > 1,
       porDia.sinDia ? JSON.stringify(porDia.sinDia) : porDia.antes + ' glosas');
  vale('ELEGIR UN DÍA ESCONDE LAS DEMÁS',
       !porDia.sinDia && porDia.filtrado.n < porDia.antes && porDia.filtrado.n > 0,
       porDia.antes + ' → ' + (porDia.filtrado || {}).n);
  vale('  y el combo se enciende como un chip marcado',
       !porDia.sinDia && porDia.filtrado.marcado === true &&
       porDia.marcadoAlQuitar === false,
       JSON.stringify(porDia.filtrado));
  vale('  y al quitarlo vuelven todas',
       !porDia.sinDia && porDia.vuelven === porDia.antes,
       '→ ' + porDia.vuelven);

  /* ================================================================
     UN FILTRO GUARDADO NO PUEDE QUEDARSE ESCONDIDO.

     La tira nace apagada, y etiquetasVer SE GUARDA en los ajustes: son dos
     verdades que juntas hacen una trampa. Un chip que tocaste hace días sigue
     puesto al abrir y esconde glosas de la hoja y de la lista; con la tira
     apagada desaparece el único sitio donde se ve cuál está puesto y el único
     donde se quita. El lector abre el libro, le faltan notas y no hay nada en
     pantalla que lo explique.

     Lo levantó la revisión de Codex sobre el commit de la tira, o sea que
     esto lo estrenó este mismo cambio: por eso la prueba va aquí y no en el
     bloque de arriba. Se siembra el filtro en los ajustes y se recarga, que es
     el camino real —«vuelves al día siguiente»— y no se llama a nada por
     dentro: lo que se vigila es justamente el arranque.
     ================================================================ */
  titulo('un filtro guardado abre la tira aunque nazca apagada');
  const guardado = await p.evaluate(() => {
    const ms = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const t = ms.flatMap(m => m.etiquetas || [])[0] || null;
    if (!t) return null;
    const a = JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}');
    a.etiquetasVer = [t];
    localStorage.setItem('glossa:ajustes:v1', JSON.stringify(a));
    return t;
  });
  await p.reload();
  await p.waitForTimeout(2600);
  await alPanel();
  const conFiltro = await p.evaluate(t => {
    const b = document.getElementById('btnVerEtiquetas');
    const marcadas = [...document.querySelectorAll('#filtros .chip.sel')]
                       .map(c => c.textContent.trim());
    return { apagada: document.getElementById('ctrlEtiquetas').classList.contains('sin-chips'),
             fila: getComputedStyle(document.getElementById('filaFiltros')).display,
             pulsado: b.getAttribute('aria-pressed'),
             encendido: b.classList.contains('active'),
             /* Y SE VE CUÁL: enseñar la tira sin marcar el chip que filtra
                sería enseñar el cuarto sin decir dónde está la luz. */
             loMarca: marcadas.some(x => x.indexOf(t) === 0), marcadas,
             /* Y EL AVISO DE QUE LA TIRA SIGUE POR DEBAJO, SIN TOCAR NADA.
                Éste es el camino que se colaba: con un filtro guardado la tira
                se enciende al ARRANCAR, con el panel todavía en display:none, y
                ahí scrollHeight y clientHeight valen cero, o sea «no sobra
                nada». Abrir el panel después repintaba el índice y no los
                filtros, así que el riel y la sombra se quedaban apagados
                aunque hubiera treinta etiquetas. Se mide nada más abrir y sin
                desplazar nada, que es lo que ve el lector que vuelve al día
                siguiente. */
             desborda: (() => { const f = document.getElementById('filtros');
                                return f.scrollHeight > f.clientHeight + 2; })(),
             riel: +getComputedStyle(document.getElementById('filtrosRiel')).opacity,
             sombra: +getComputedStyle(document.getElementById('filaFiltros'),
                                       '::after').opacity };
  }, guardado);
  di('con «' + guardado + '» guardada', JSON.stringify(conFiltro));
  vale('(la prueba es válida) había una etiqueta que guardar', !!guardado, guardado);
  vale('LA TIRA SALE PUESTA SI EL FILTRO GUARDADO ESCONDE ALGO',
       conFiltro.apagada === false && conFiltro.fila !== 'none', conFiltro);
  vale('  con su botón encendido',
       conFiltro.pulsado === 'true' && conFiltro.encendido === true, conFiltro);
  vale('  y se ve CUÁL es el filtro puesto', conFiltro.loMarca === true,
       conFiltro.marcadas);
  /* Las tres de abajo van juntas: sin desborde no hay nada que avisar, y sin
     esa validez las dos siguientes pasarían en verde por no haber lista que
     sobre. Las etiquetas las dejó sembradas el bloque de las treinta. */
  vale('(la prueba es válida) con las etiquetas sembradas la tira desborda',
       conFiltro.desborda === true, conFiltro.desborda);
  vale('Y EL RIEL ESTÁ PUESTO NADA MÁS ABRIR, sin tocar nada',
       conFiltro.riel > .9, conFiltro.riel);
  vale('  y la sombra de «hay más», también', conFiltro.sombra > .9,
       conFiltro.sombra);

  /* ================================================================
     CAMBIARLE EL NOMBRE A UNA ETIQUETA, DESDE ACTUALIZAR Y SIN NADA ELEGIDO.

     Una etiqueta no es un rótulo por glosa: es la misma cosa escrita en
     muchas, y hasta ahora no había manera de corregirla. Escribir «Oracion»
     sin tilde en veinte glosas era vivir con ello o volver a etiquetarlas una
     por una.

     EL SITIO ESTABA VACÍO Y POR ESO CABE AQUÍ. Con ACTUALIZAR puesto y NINGUNA
     glosa elegida, el panel no hacía nada: tocar una etiqueta llamaba a una
     función que se iba por su puerta de atrás —sin glosas elegidas no hay a
     quién ponérsela— y el botón de crear tampoco tenía a quién. Una pantalla
     entera sin respuesta. Ahora, sin nada elegido, tocar una etiqueta la baja
     a la caja y el botón pasa a decir ACTUALIZAR.

     Los dos modos no se solapan y eso es lo que los hace legibles: con glosas
     elegidas se pone y se quita, sin ellas se renombra. Por eso la última
     comprobación de aquí es que elegir una glosa CANCELA la edición.
     ================================================================ */
  titulo('renombrar una etiqueta la cambia en todas las glosas que la llevan');
  /* Se siembran tres glosas con etiquetas a mano: hace falta que MÁS DE UNA
     lleve la misma, que es justo lo que la prueba viene a mirar, y ponerlas
     una por una desde el panel sería probar otra cosa por el camino. */
  await p.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    if (g.length < 3) return false;
    g[0].etiquetas = ['Oracion', 'Domingo'];
    g[1].etiquetas = ['oracion', 'Oracion'];   /* lleva las dos: la fusión no puede duplicar */
    g[2].etiquetas = ['oracion'];
    localStorage.setItem('glossa:marcas:v1', JSON.stringify(g));
    return true;
  });
  await p.reload();
  await p.waitForTimeout(2600);
  await alPanel();
  /* Se entra en ACTUALIZAR por su botón, como entra el lector. */
  const aActualizar = () => p.evaluate(async () => {
    const b = document.getElementById('btnElegirGlosas');
    if (b.getAttribute('aria-pressed') !== 'true'){
      b.click(); await new Promise(z => setTimeout(z, 600));
    }
  });
  await aActualizar();
  const foto = () => p.evaluate(() => {
    const caja = document.getElementById('tagboxGrupo');
    const campo = document.getElementById('tagNuevaGrupo');
    const bCrear = caja.querySelector('[data-acc="creartag-grupo"]');
    const bRenom = caja.querySelector('[data-acc="renombrartag"]');
    return { cuenta:document.getElementById('cuentaGrupo').textContent,
             tags:[...caja.querySelectorAll('.tg')].map(b => b.textContent),
             boton:(bRenom || bCrear || {}).textContent,
             /* el dato duro: qué acción cuelga del botón, que es lo que de
                verdad va a pasar cuando se pulse. La palabra del botón se mira
                también, pero una palabra se puede cambiar sin cambiar lo que
                hace, y al revés. */
             accion:bRenom ? 'renombrar' : (bCrear ? 'crear' : null),
             valor:campo ? campo.value : null,
             foco:(document.activeElement || {}).id,
             editando:[...caja.querySelectorAll('.tg.editando')].map(b => b.textContent),
             /* y lo que hay guardado, que es lo que sobrevive a la recarga */
             enMarcas:JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]')
                        .slice(0, 3).map(m => m.etiquetas || []),
             enHoja:[...document.querySelectorAll('#pgMargin .gl-t')].map(x => x.textContent) };
  });
  const antes = await foto();
  di('con ACTUALIZAR puesto y nada elegido', JSON.stringify(antes));
  vale('(la prueba es válida) no hay ninguna glosa elegida',
       antes.cuenta === '0 elegidas', antes.cuenta);
  /* Y la otra validez, la que le da sentido a «en TODAS»: más de una glosa
     lleva la etiqueta que se va a renombrar. Con una sola, la comprobación de
     abajo saldría verde sin haber probado lo que se pidió. */
  vale('(la prueba es válida) más de una glosa lleva #Oracion',
       antes.enMarcas.filter(t => t.includes('Oracion')).length >= 2,
       JSON.stringify(antes.enMarcas));
  vale('el botón empieza diciendo crear', antes.accion === 'crear', antes.boton);

  /* TOCAR LA ETIQUETA LA BAJA A LA CAJA. */
  await p.evaluate(() =>
    document.querySelector('#tagboxGrupo [data-tag-grupo="Oracion"]').click());
  await p.waitForTimeout(400);
  const cargada = await foto();
  di('tras tocar #Oracion', JSON.stringify(cargada));
  vale('LA ETIQUETA BAJA A LA CAJA DE ESCRIBIR',
       cargada.valor === 'Oracion', cargada.valor);
  vale('  y el botón pasa a decir actualizar, no crear',
       cargada.accion === 'renombrar' && /actualizar/i.test(cargada.boton || ''),
       cargada.boton);
  /* El foco en la caja no es comodidad: sin él hay que tocar dos veces para
     escribir, y la segunda es dentro de un campo que ya tiene texto. */
  vale('  con el cursor ya dentro', cargada.foco === 'tagNuevaGrupo', cargada.foco);
  vale('  y la etiqueta marcada en la lista, para saber cuál se está tocando',
       cargada.editando.length === 1 && cargada.editando[0] === '#Oracion',
       cargada.editando);

  /* CAMBIAR EL TEXTO Y PULSAR. */
  await p.evaluate(() => {
    const c = document.getElementById('tagNuevaGrupo');
    c.value = 'OraciónDiaria';
    document.querySelector('#tagboxGrupo [data-acc="renombrartag"]').click();
  });
  await p.waitForTimeout(900);
  const luego = await foto();
  di('tras actualizar', JSON.stringify(luego));
  vale('CAMBIA EN TODAS LAS GLOSAS QUE LA LLEVABAN',
       luego.enMarcas.filter(t => t.includes('OraciónDiaria')).length ===
       antes.enMarcas.filter(t => t.includes('Oracion')).length &&
       luego.enMarcas.every(t => !t.includes('Oracion')),
       JSON.stringify(luego.enMarcas));
  vale('  la lista enseña el nombre nuevo y no el viejo',
       luego.tags.includes('#OraciónDiaria') && !luego.tags.includes('#Oracion'),
       luego.tags.join(' '));
  /* Y EN LA HOJA, que es donde el lector lo ve. El almacén y la lista podrían
     estar al día con el papel enseñando lo de antes: son tres pintados
     distintos y cada uno se puede olvidar por su lado. */
  vale('  Y LA HOJA LO ENSEÑA YA, sin recargar',
       luego.enHoja.includes('#OraciónDiaria'), luego.enHoja.join(' '));
  vale('  y el botón vuelve a ser el de crear',
       luego.accion === 'crear', luego.boton);

  /* FUNDIR DOS EN UNA, que es la razón por la que esto se pidió: «oracion» y
     «Oracion» eran dos, y una glosa llevaba las dos a la vez. */
  await p.evaluate(async () => {
    document.querySelector('#tagboxGrupo [data-tag-grupo="oracion"]').click();
    await new Promise(z => setTimeout(z, 300));
    document.getElementById('tagNuevaGrupo').value = 'OraciónDiaria';
    document.querySelector('#tagboxGrupo [data-acc="renombrartag"]').click();
  });
  await p.waitForTimeout(900);
  const fundida = await foto();
  di('tras fundir #oracion con #OraciónDiaria', JSON.stringify(fundida));
  vale('FUNDIR DOS ETIQUETAS LAS DEJA EN UNA',
       fundida.tags.includes('#OraciónDiaria') && !fundida.tags.includes('#oracion'),
       fundida.tags.join(' '));
  /* LA GLOSA QUE LLEVABA LAS DOS NO ACABA CON LA MISMA DOS VECES. Es el fallo
     natural de renombrar con un map y sin mirar, y en la hoja se vería como
     «#OraciónDiaria #OraciónDiaria» una al lado de la otra. */
  vale('  y la que llevaba las dos no la lleva repetida',
       fundida.enMarcas.every(t => t.length === new Set(t).size),
       JSON.stringify(fundida.enMarcas));

  /* CANCELAR NO TOCA NADA. Con Escape, que es la salida de todas las cajas de
     este programa, y sin que se cierre el panel de paso. */
  await p.evaluate(() =>
    document.querySelector('#tagboxGrupo [data-tag-grupo="Domingo"]').click());
  await p.waitForTimeout(300);
  const antesDeEscape = await foto();
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  const trasEscape = await p.evaluate(() => ({
    panel:getComputedStyle(document.getElementById('etiquetas')).display,
    boton:(document.querySelector('#tagboxGrupo [data-acc="creartag-grupo"]') || {}).textContent,
    editando:document.querySelectorAll('#tagboxGrupo .tg.editando').length,
    enMarcas:JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]')
               .slice(0, 3).map(m => m.etiquetas || []) }));
  di('tras Escape', JSON.stringify(trasEscape));
  vale('(la prueba es válida) antes de Escape se estaba editando',
       antesDeEscape.accion === 'renombrar', antesDeEscape.boton);
  vale('ESCAPE SUELTA LA ETIQUETA SIN CAMBIARLE NADA',
       trasEscape.editando === 0 && /crear/i.test(trasEscape.boton || '') &&
       JSON.stringify(trasEscape.enMarcas) === JSON.stringify(fundida.enMarcas),
       JSON.stringify(trasEscape.enMarcas));
  /* Y SIN CERRAR EL PANEL DE PASO: Escape también cierra los rollos, así que
     sin pararlo aquí la salida de la caja se llevaría por delante la pantalla
     entera. */
  vale('  y el panel sigue abierto', trasEscape.panel !== 'none', trasEscape.panel);

  /* ELEGIR UNA GLOSA CANCELA LA EDICIÓN, que es lo que mantiene separados los
     dos modos: con algo elegido el botón vuelve a ser el de poner etiquetas. */
  await p.evaluate(async () => {
    document.querySelector('#tagboxGrupo [data-tag-grupo="Domingo"]').click();
    await new Promise(z => setTimeout(z, 300));
    const it = document.querySelector('#indice [data-ir]');
    if (it) it.click();
    await new Promise(z => setTimeout(z, 500));
  });
  const conElegida = await foto();
  di('con una glosa elegida', JSON.stringify(conElegida));
  vale('(la prueba es válida) hay una glosa elegida',
       conElegida.cuenta === '1 elegida', conElegida.cuenta);
  vale('ELEGIR UNA GLOSA CANCELA LA EDICIÓN',
       conElegida.accion === 'crear' && conElegida.editando.length === 0,
       conElegida.boton + ' · ' + conElegida.editando.join(' '));

  /* EL FILTRO PUESTO SIGUE AL NOMBRE NUEVO, Y SOBREVIVE A LA RECARGA.

     Es la mitad que no se ve en la pantalla y la que más daño hace: el filtro
     de etiquetas SE GUARDA en los ajustes, así que un filtro por una etiqueta
     que ya no existe vuelve al recargar y esconde todas las glosas sin decir
     por qué. Ya pasó una vez en este programa por otro camino —está contado
     donde se limpian los filtros imposibles— y por eso aquí se comprueba
     después de recargar y no antes.

     LO QUE ESTA PRUEBA NO DEMUESTRA, dicho para que nadie se confíe: no prueba
     que la llamada a guardarAjustes del renombrado sea necesaria HOY. Hoy los
     ajustes se escriben igual por un efecto secundario —renderPage va
     guardando por dónde vas leyendo— así que esto pasaría en verde con esa
     llamada quitada. Lo que garantiza es la CONDUCTA: el día que ese efecto
     secundario se mueva de sitio, esta línea se pone roja y dice dónde.
     Lo levantó la revisión de Codex. */
  await p.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    /* se sale de ACTUALIZAR y se pone el filtro por una etiqueta viva */
    document.getElementById('btnElegirGlosas').click(); await z(500);
    document.getElementById('btnVerEtiquetas').click(); await z(600);
    const c = [...document.querySelectorAll('#filtros .chip')]
      .find(x => x.firstChild && x.firstChild.textContent.trim() === 'OraciónDiaria');
    if (c) c.click();
    await z(700);
    document.getElementById('btnElegirGlosas').click(); await z(700);
  });
  const conFiltroPuesto = await p.evaluate(() => ({
    sel:[...document.querySelectorAll('#filtros .chip.sel')]
          .map(c => c.firstChild.textContent.trim()),
    guardado:(JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}')
                .etiquetasVer) || [] }));
  di('con el filtro puesto', JSON.stringify(conFiltroPuesto));
  vale('(la prueba es válida) el filtro está puesto por #OraciónDiaria y guardado',
       conFiltroPuesto.sel.includes('OraciónDiaria') &&
       conFiltroPuesto.guardado.includes('OraciónDiaria'),
       JSON.stringify(conFiltroPuesto));
  await p.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    document.querySelector('#tagboxGrupo [data-tag-grupo="OraciónDiaria"]').click();
    await z(300);
    document.getElementById('tagNuevaGrupo').value = 'Plegaria';
    document.querySelector('#tagboxGrupo [data-acc="renombrartag"]').click();
    await z(800);
  });
  await p.reload();
  await p.waitForTimeout(2600);
  const trasRecargar = await p.evaluate(() => ({
    guardado:(JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}')
                .etiquetasVer) || [],
    enMarcas:JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]')
               .flatMap(m => m.etiquetas || []),
    /* y que la hoja no se haya quedado vacía, que es lo que de verdad se
       siente cuando un filtro apunta a un fantasma */
    glosasEnHoja:document.querySelectorAll('#pgMargin .gl').length }));
  di('tras recargar', JSON.stringify(trasRecargar));
  vale('EL FILTRO GUARDADO SIGUIÓ AL NOMBRE NUEVO',
       trasRecargar.guardado.includes('Plegaria') &&
       !trasRecargar.guardado.includes('OraciónDiaria'),
       JSON.stringify(trasRecargar.guardado));
  vale('  y la etiqueta vieja no quedó en ninguna glosa',
       !trasRecargar.enMarcas.includes('OraciónDiaria'),
       JSON.stringify(trasRecargar.enMarcas));
  vale('  y la hoja sigue enseñando glosas, no un filtro fantasma',
       trasRecargar.glosasEnHoja > 0, trasRecargar.glosasEnHoja + ' glosas');

  await cerrar(sesion);

  /* ================================================================
     Y EL TECHO DE LA TIRA SE MIDE CONTRA LA ESCENA, NO CONTRA LA VENTANA.

     En teléfono las dos son la misma cosa y por eso esto no se ve allí: la
     escena mide lo que la ventana. En pantalla ancha la escena mide 470 px
     FIJOS dentro de una ventana que puede medir mil y pico, así que un techo
     en vh —que es como se escribió— repartía el monitor en vez del panel: 24vh
     de una ventana de 1440 son 346 px de un panel de 470, o sea la tira
     comiéndose el índice, las pestañas y el pie. Lo levantó la revisión de
     Codex.

     La comprobación se apoya en que la ventana sea MÁS ALTA que la escena: sin
     eso las dos cuentas darían lo mismo y la prueba pasaría en verde con el vh
     puesto. Por eso esa condición se afirma antes, como validez.
     ================================================================ */
  titulo('en pantalla ancha el techo de la tira es del panel, no del monitor');
  const ancha = await abrir(ESCRITORIO);
  const pa = ancha.pagina;
  await pa.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById('pgCabeza').click(); await z(900);
    const t = document.querySelector('.pestanas button[data-sec="glosas"]');
    if (t) t.click(); await z(1000);
  });
  const techo = await pa.evaluate(() => {
    const f = document.getElementById('filtros');
    const st = document.querySelector('.stage').getBoundingClientRect();
    return { tope: parseFloat(getComputedStyle(f).maxHeight),
             escena: Math.round(st.height), ventana: window.innerHeight };
  });
  di('el techo en pantalla ancha', JSON.stringify(techo));
  vale('(la prueba es válida) la ventana es más alta que la escena',
       techo.ventana > techo.escena + 100,
       techo.ventana + ' contra ' + techo.escena);
  vale('EL TECHO SALE DE LA ESCENA', techo.tope <= techo.escena * .3,
       techo.tope + ' px de una escena de ' + techo.escena);
  /* Y por el otro lado: un techo tan bajo que no quepa una pastilla tampoco
     sirve; lo que se quería es repartir, no cerrar. */
  vale('  y da para dos renglones de pastillas', techo.tope >= 66,
       techo.tope + ' px');
  await cerrar(ancha);
})();
