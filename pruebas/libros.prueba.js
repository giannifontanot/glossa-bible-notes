/* CRUZAR DE LIBRO, Y EL TRAZO QUE AVISA DE QUE SE ACABA.

   Al llegar a la última hoja de Mateo se podía tocar el filo y no pasaba nada,
   y no pasar nada se lee como que el toque no entró. Ahora se cruza a Marcos.

   Eso obligó a separar dos preguntas que llevaban toda la vida siendo una, y
   es lo que esta prueba vigila que siga separado:
     · ¿queda hoja en ESTE libro?  → lo dice el CANTO, la raya del margen.
     · ¿hay a dónde ir?            → lo dicen el FILO y los botones de lejos.
   Apagar el filo al final de un libro sería mentir; no pintar el canto sería
   callarse que el texto de la hoja siguiente ya es de otro libro. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  titulo('el trazo del principio del libro');
  di('la raya', await p.evaluate(() => {
    const c = getComputedStyle(document.getElementById('cantoIzq'));
    return { ancho: c.width, redondeado: c.borderTopLeftRadius,
             marron: c.backgroundImage.indexOf('184, 137, 43') >= 0,
             puntasLevantadas: (c.maskImage || c.webkitMaskImage || '').indexOf('gradient') >= 0 };
  }).then(r => {
    vale('lleva el marrón del panel de Libros', r.marron);
    vale('con las puntas levantadas', r.puntasLevantadas);
    return r;
  }));
  vale('encendido en la primera hoja', await p.evaluate(() =>
    document.getElementById('cantoIzq').classList.contains('viva') &&
    !document.getElementById('cantoDer').classList.contains('viva')));

  titulo('hasta el final del libro y más allá');
  const cruce = await p.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 1200));
    const cab = () => document.getElementById('pgCabeza').textContent.trim();
    const antes = cab();
    let enElFinal = null;
    for (let i = 0; i < 200; i++){
      const bt = document.querySelector('#zoomPasos [data-paso="1"]');
      if (!bt) break;
      /* justo antes de cruzar, se apunta cómo está el canto */
      if (document.getElementById('cantoDer').classList.contains('viva') && !enElFinal)
        enElFinal = { cabeza: cab(), botonVivo: !bt.disabled };
      bt.click();
      await new Promise(z => setTimeout(z, 850));
      if (cab().split(' ')[0] !== antes.split(' ')[0])
        return { cruzo:true, vueltas:i+1, de:antes, a:cab(), enElFinal };
    }
    return { cruzo:false, cabeza:cab(), enElFinal };
  });
  di('el viaje', cruce);
  vale('en la última hoja el canto se enciende', !!cruce.enElFinal, cruce.enElFinal);
  vale('y el botón NO se apaga', cruce.enElFinal && cruce.enElFinal.botonVivo);
  vale('cruza al libro siguiente', cruce.cruzo, cruce.de + ' → ' + cruce.a);
  vale('aterriza en su primera hoja', await p.evaluate(() =>
    document.getElementById('cantoIzq').classList.contains('viva') &&
    document.querySelectorAll('#pgBody .v').length > 0));

  titulo('y vuelve hacia atrás');
  /* Se espera a que pase, no un rato fijo: entrar a un libro POR EL FINAL
     obliga a paginarlo entero, y eso tarda lo que tarde. */
  const vuelta = await p.evaluate(async () => {
    const cab = () => document.getElementById('pgCabeza').textContent.trim();
    const antes = cab(), t0 = performance.now();
    document.querySelector('#zoomPasos [data-paso="-1"]').click();
    while (performance.now() - t0 < 20000 && cab().split(' ')[0] === antes.split(' ')[0])
      await new Promise(z => setTimeout(z, 120));
    await new Promise(z => setTimeout(z, 500));
    return { de:antes, a:cab(), tardo: Math.round(performance.now()-t0) + ' ms',
             cantoDer: document.getElementById('cantoDer').classList.contains('viva') };
  });
  di('la vuelta', vuelta);
  vale('vuelve al libro anterior', vuelta.de.split(' ')[0] !== vuelta.a.split(' ')[0],
       vuelta.de + ' → ' + vuelta.a);
  vale('entra por su ÚLTIMA hoja', vuelta.cantoDer);

  titulo('el panel de Libros se entera');
  di('la marca', await p.evaluate(async () => {
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left+r.width/2), clientY:Math.round(r.top+r.height/2) }));
    await new Promise(z => setTimeout(z, 1000));
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 1000));
    const marcados = [...document.querySelectorAll('#canto [data-libro]')]
      .filter(x => x.classList.contains('aqui'));
    return { cuantos: marcados.length,
             cual: marcados[0] && marcados[0].dataset.libro,
             nombre: marcados[0] && marcados[0].textContent,
             cabeza: document.getElementById('pgCabeza').textContent.trim(),
             sinClasePisada: marcados.every(x => !x.classList.contains('viva')) };
  }).then(r => {
    vale('un solo libro marcado', r.cuantos === 1, r.cual + ' — ' + r.nombre);
    vale('y es el de la hoja', r.nombre && r.cabeza.startsWith(r.nombre), r.cabeza);
    vale('sin clases pisadas', r.sinClasePisada);
    return r;
  }));

  await cerrar(sesion);
})();
