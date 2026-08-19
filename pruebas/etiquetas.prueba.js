/* LAS ETIQUETAS: LAS CUATRO MANERAS DE PONERLAS, Y EL DESAJUSTE.

   El fallo que vivió aquí es el que más miedo da de todos: el control decía
   una cosa y el programa hacía otra. Escribías una etiqueta nueva, el
   desplegable volvía a "— ninguna —", y sin embargo la glosa siguiente salía
   etiquetada. No se descubre usando la aplicación —o crees que no funcionó y
   lo repites, o ni miras—; solo se ve comparando el control con el almacén.
   Por eso esta prueba compara siempre las dos cosas. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

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

  titulo('crear una etiqueta y dejarla activa');
  await alPanel();
  di('escribir + Enter', await p.evaluate(async () => {
    const i = document.getElementById('nuevaEtiqueta');
    i.value = 'promesas';
    i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
    await new Promise(z => setTimeout(z, 700));
    const sel = document.getElementById('selActiva');
    return { desplegable: sel.value, campoLimpio: i.value === '',
             banda: !document.getElementById('banda').classList.contains('apagada') };
  }).then(r => {
    vale('el desplegable la enseña', r.desplegable === 'promesas', r.desplegable || '(vacío)');
    vale('la banda se enciende', r.banda);
    return r;
  }));

  titulo('crear no puede depender de Enter');
  /* ENTER FUNCIONA EN EL TECLADO DE VERDAD Y FALLA DONDE SE USA ESTO.
     En Android la tecla de una caja suelta —sin <form> alrededor— viene
     rotulada «Listo» y lo normal es que solo cierre el teclado; y mientras el
     corrector compone, Gboard manda el keydown con key 'Unidentified' y
     keyCode 229, que no es 'Enter' por ningún lado. Colgado solo de ahí, crear
     una etiqueta era imposible en el teléfono, sin decirlo, y el gesto natural
     —escribir y tocar fuera para quitar el teclado— tiraba lo escrito.
     Así que se prueban las cuatro puertas por separado. El keydown de la
     sección anterior es la de escritorio; éstas son las que lo salvan.
     Y se comprueba que el + QUEPA EN LA PANTALLA, que es lo primero que se
     rompió al meterlo: la banda pasó a medir 331 en 412 y el botón salía
     cortado por la derecha, o sea que el único control que avisa de que hay
     algo que pulsar se estrenaba a medias. */
  /* REABRIR MIRANDO LO QUE SE VE, no una clase. alPanel sale antes de hacer
     nada si #etiquetas tiene la clase «abierto», y esa clase se queda puesta
     después de cerrar el panel tocando el papel: el panel estaba cerrado, la
     clase decía que no, y el clic siguiente se quedaba esperando a un campo
     invisible hasta agotar el plazo. Aquí se pregunta por el campo. */
  const asegurarPanel = async () => {
    for (let i = 0; i < 4; i++){
      /* Se le pregunta a Playwright con SU definición de visible, no con una
         mía: un rectángulo con tamaño no basta —el panel se cierra con
         transición y durante ese rato todavía mide—, y comprobarlo a mano daba
         verde justo antes de que el clic se quedara esperando. */
      try {
        await p.waitForSelector('#nuevaEtiqueta', { state:'visible', timeout:2500 });
        return true;
      } catch(e){ /* cerrado: se abre y se vuelve a mirar */ }
      await p.evaluate(async () => {
        const panel = document.getElementById('etiquetas');
        const puesto = () => getComputedStyle(panel).display !== 'none';
        if (!puesto()){
          document.getElementById('pgCabeza').click();
          await new Promise(z => setTimeout(z, 900));
        }
        /* HAY DOS PESTAÑAS «GLOSAS» EN EL DOCUMENTO, no una: el titulillo abre
           Libros y la fila de pestañas está duplicada. Coger la primera con
           find() funcionaba al arrancar y dejaba de funcionar después de tocar
           el papel, porque la que manda pasa a ser la otra. Se prueban todas y
           se para en cuanto el panel aparece. */
        for (const t of document.querySelectorAll('.pestanas button')){
          if (!/glosas/i.test(t.textContent)) continue;
          t.click();
          await new Promise(z => setTimeout(z, 500));
          if (puesto()) return;
        }
      });
    }
    return false;
  };

  const comoQuedo = nombre => p.evaluate(nombre => {
    const i = document.getElementById('nuevaEtiqueta'), s = document.getElementById('selActiva');
    return { activa: s.value, estaEnLaLista: [...s.options].some(o => o.value === nombre),
             campoLimpio: i.value === '' };
  }, nombre);

  /* «TOCAR FUERA» SE TECLEA DE VERDAD, y no es remilgo.
     Poner .value por guion NO marca el campo como editado, así que el
     navegador no manda el change al salir: una prueba que dispare el change a
     mano da verde sin haber comprobado que el navegador lo mandaría. Es el
     mismo atajo que dejó pasar el fallo del panel de la marca, así que aquí se
     teclea con el teclado y se toca fuera con el ratón. */
  await asegurarPanel();
  await p.click('#nuevaEtiqueta');
  await p.keyboard.type('fe', { delay:30 });
  await p.mouse.click(200, 830);
  await p.waitForTimeout(800);
  di('tocar fuera', await comoQuedo('fe').then(r => {
    vale('crea y deja activa · tocar fuera', r.activa === 'fe' && r.estaEnLaLista, r.activa);
    vale('y limpia el campo · tocar fuera', r.campoLimpio);
    return r;
  }));

  for (const [nombre, como] of [['gracia', 'el botón +'],
                                ['paz', 'el intro del móvil']]){
    await asegurarPanel();
    await p.click('#nuevaEtiqueta');
    await p.keyboard.type(nombre, { delay:30 });
    await p.evaluate(async como => {
      const i = document.getElementById('nuevaEtiqueta');
      if (como === 'el botón +') document.getElementById('btnCrearEtiqueta').click();
      if (como === 'el intro del móvil') i.dispatchEvent(new InputEvent('beforeinput',
        { bubbles:true, cancelable:true, inputType:'insertLineBreak' }));
      await new Promise(z => setTimeout(z, 600));
    }, como);
    di(como, await comoQuedo(nombre).then(r => {
      vale('crea y deja activa · ' + como, r.activa === nombre && r.estaEnLaLista, r.activa);
      vale('y limpia el campo · ' + como, r.campoLimpio);
      return r;
    }));
  }
  di('el botón + cabe en la pantalla', await p.evaluate(() => {
    const b = document.getElementById('btnCrearEtiqueta'), r = b.getBoundingClientRect();
    const banda = document.getElementById('banda').getBoundingClientRect();
    return { texto:b.textContent.trim(), mide:Math.round(r.width)+'x'+Math.round(r.height),
             acabaEn:Math.round(r.right), ventana:innerWidth,
             seSale:Math.max(0, Math.round(r.right - innerWidth)),
             bandaSeSale:Math.max(0, Math.round(banda.right - innerWidth)) };
  }).then(r => {
    vale('no se sale por la derecha', r.seSale === 0 && r.bandaSeSale === 0,
         'botón ' + r.acabaEn + ' de ' + r.ventana);
    vale('y es tocable', parseInt(r.mide) >= 30 && parseInt(r.mide.split('x')[1]) >= 30, r.mide);
    return r;
  }));

  titulo('espacios seguidos y comillas');
  /* Un <option> sin value deduce su valor del texto y COLAPSA los espacios; y
     esc() no escapaba comillas, que se meten dentro de atributos. Las dos
     cosas devolvían el desplegable a "— ninguna —" con la banda encendida. */
  for (const raro of ['oración  diaria', 'la "roca"']){
    const r = await p.evaluate(async v => {
      const i = document.getElementById('nuevaEtiqueta');
      i.value = v;
      i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise(z => setTimeout(z, 700));
      return { puesta: document.getElementById('selActiva').value };
    }, raro);
    vale('sobrevive «' + raro + '»', r.puesta === raro, JSON.stringify(r.puesta));
  }
  /* se vuelve a dejar la buena */
  await p.evaluate(async () => {
    const i = document.getElementById('nuevaEtiqueta');
    i.value = 'promesas';
    i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
    await new Promise(z => setTimeout(z, 700));
  });

  titulo('1 · la glosa nueva la hereda');
  di('creada', await p.evaluate(async () => {
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
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
    document.querySelector('.gl-movil textarea').value = 'una nota etiquetada';
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:200, clientY:700 }));
    await new Promise(z => setTimeout(z, 5600));
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]');
    return { etiquetas: g[g.length-1] && g[g.length-1].etiquetas,
             enLaHoja: [...document.querySelectorAll('.gl-tag')].map(x => x.textContent) };
  }).then(r => {
    vale('la lleva puesta', (r.etiquetas||[]).includes('promesas'), r.etiquetas);
    vale('y se ve en la hoja', r.enLaHoja.length > 0, r.enLaHoja);
    return r;
  }));

  titulo('2 · el panel de UNA marca');
  /* Se llega tocando el TEXTO SUBRAYADO, no la tarjeta de la glosa. */
  di('poner y quitar', await p.evaluate(async () => {
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 20){ n = w.currentNode; break; }
    const r = document.createRange(); r.setStart(n,3); r.setEnd(n,4);
    const rc = r.getBoundingClientRect();
    getSelection().removeAllRanges();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:Math.round(rc.left+rc.width/2), clientY:Math.round(rc.top+rc.height/2) }));
    await new Promise(z => setTimeout(z, 600));
    const bt = [...document.querySelectorAll('#menu button')].find(x => /^#/.test(x.textContent.trim()));
    if (!bt) return { menu: document.getElementById('menu').textContent.slice(0,60) };
    bt.click();
    await new Promise(z => setTimeout(z, 500));
    /* crear una desde aquí mismo */
    const i = document.getElementById('tagNueva');
    i.value = 'reino';
    i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
    await new Promise(z => setTimeout(z, 600));
    const tras = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]');
    const puestas = tras[tras.length-1].etiquetas;
    /* y apagar una tocándola */
    const t = [...document.querySelectorAll('#menu .tg')].find(x => x.classList.contains('on'));
    const apagada = t.textContent;
    t.click();
    await new Promise(z => setTimeout(z, 600));
    const fin = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]');
    return { boton: bt.textContent.trim(), puestas, apagada, quedan: fin[fin.length-1].etiquetas };
  }).then(r => {
    vale('el botón # abre el panel', !!r.boton, r.boton);
    vale('crear una desde ahí la pone', (r.puestas||[]).length === 2, r.puestas);
    vale('tocarla la quita', (r.quedan||[]).length === 1, r.apagada + ' → ' + JSON.stringify(r.quedan));
    return r;
  }));

  titulo('la caja del panel de una marca, sin Enter tampoco');
  /* La misma trampa, en la otra caja donde se pueden crear.

     Y AQUÍ HAY UNA SEGUNDA, QUE ESTA PRUEBA NO VEÍA. Tocar fuera del menú lo
     recoge un oyente en fase de CAPTURA que llama a ocultarMenu, y ocultarMenu
     deja menuMarca en null. El change de la caja llega después —el blur es
     posterior al pointerdown—, así que para cuando iba a poner la etiqueta ya
     no había a quién ponérsela y se perdía en silencio: el mismo fallo que
     este cambio venía a quitar, un piso más abajo.
     La primera versión de esta prueba lo dejaba pasar porque disparaba el
     change a mano, sin el toque de fuera que es QUIEN IMPONE EL ORDEN. Por eso
     ahora cada camino abre su panel y el de «tocar fuera» toca de verdad. Un
     atajo en el gesto es un atajo en lo que se prueba.
     Lo levantó la revisión de Codex. */
  const abrirPanelDeMarca = () => p.evaluate(async () => {
    const menu = document.getElementById('menu');
    const cuerpo = document.getElementById('pgBody').getBoundingClientRect();
    for (const v of document.querySelectorAll('#pgBody .v')){
      for (const r of v.getClientRects()){
        for (const f of [.2,.5,.8]){
          const x = Math.round(r.left + r.width*f), y = Math.round(r.top + r.height/2);
          if (x < cuerpo.left || x > cuerpo.right) continue;
          getSelection().removeAllRanges();
          document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
            { bubbles:true, clientX:x, clientY:y }));
          await new Promise(z => setTimeout(z, 130));
          const bt = [...menu.querySelectorAll('button')].find(q => q.dataset.acc === 'tags');
          if (bt && getComputedStyle(menu).display !== 'none'){
            bt.click(); await new Promise(z => setTimeout(z, 500));
            return !!document.getElementById('tagNueva');
          }
        }
      }
    }
    return false;
  });

  di('el panel de la marca se abre', await abrirPanelDeMarca());
  vale('y trae su botón +', await p.evaluate(() =>
    !!document.querySelector('#menu [data-acc="creartag"]')));

  for (const [nombre, como] of [['salmo', 'el botón +'],
                                ['maná', 'tocar fuera de verdad'],
                                ['sion', 'el intro del móvil']]){
    di(como, await p.evaluate(async ([nombre, como]) => {
      const cuantas = t => JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]')
        .filter(m => (m.etiquetas||[]).includes(t)).length;
      const menu = document.getElementById('menu');
      const i = document.getElementById('tagNueva');
      if (!i) return { sinCaja:true };
      i.focus(); i.value = nombre; i.dispatchEvent(new Event('input', { bubbles:true }));
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
      await new Promise(z => setTimeout(z, 1000));
      return { marcasConEsa: cuantas(nombre),
               menuCerrado: getComputedStyle(menu).display === 'none' };
    }, [nombre, como]).then(async r => {
      /* UNA, no dos ni cero: cero era el fallo del orden, y dos sería que el
         repintado volviera a disparar la creación con el mismo texto. */
      vale('la pone en la marca, una sola vez · ' + como,
           !r.sinCaja && r.marcasConEsa === 1, r.sinCaja ? 'sin caja' : r.marcasConEsa);
      if (como === 'tocar fuera de verdad')
        vale('y el menú se cierra igual · ' + como, r.menuCerrado === true);
      return r;
    }));
    /* cada camino empieza con su panel recién abierto: el de tocar fuera lo
       cierra, y sin esto los siguientes se quedarían sin caja */
    await p.evaluate(async () => {
      document.body.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles:true, clientX:20, clientY:830 }));
      await new Promise(z => setTimeout(z, 400));
    });
    if (nombre !== 'sion') di('   panel reabierto', await abrirPanelDeMarca());
  }
  await alPanel();

  titulo('3 · etiquetar un día entero');
  await p.evaluate(() => document.querySelectorAll('#menu button[data-acc="listo"]').forEach(b => b.click()));
  await alPanel();
  di('el botón del día', await p.evaluate(async () => {
    const s = document.getElementById('selDia'), b = document.getElementById('btnEtiquetarDia');
    const sinDia = b.disabled;
    const dia = [...s.options].map(o => o.value).find(v => v);
    s.value = dia; s.dispatchEvent(new Event('change', { bubbles:true }));
    await new Promise(z => setTimeout(z, 1000));
    const dice = b.textContent.trim();
    b.click();
    await new Promise(z => setTimeout(z, 1200));
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]');
    return { sinDia, dia, dice, conLaActiva: g.filter(m => (m.etiquetas||[]).includes('promesas')).length };
  }).then(r => {
    vale('apagado mientras falta el día', r.sinDia);
    vale('dice qué etiqueta pondrá', /promesas/.test(r.dice), r.dice);
    vale('y la pone', r.conLaActiva > 0, r.conLaActiva + ' marca(s)');
    return r;
  }));

  titulo('4 · los chips de «ver» filtran');
  di('apagar un chip', await p.evaluate(async () => {
    const antes = document.querySelectorAll('#pgMargin .gl[data-gl], #pgBody .gl[data-gl]').length;
    const chip = [...document.querySelectorAll('#filtros .chip')].find(c => /reino/.test(c.textContent));
    if (!chip) return { sinChip:true };
    chip.click();
    await new Promise(z => setTimeout(z, 1200));
    const apagado = document.querySelectorAll('#pgMargin .gl[data-gl], #pgBody .gl[data-gl]').length;
    chip.click();
    await new Promise(z => setTimeout(z, 1200));
    return { antes, apagado,
             vuelven: document.querySelectorAll('#pgMargin .gl[data-gl], #pgBody .gl[data-gl]').length };
  }).then(r => {
    vale('esconde', !r.sinChip && r.apagado < r.antes, r.antes + ' → ' + r.apagado);
    vale('y devuelve', !r.sinChip && r.vuelven === r.antes, '→ ' + r.vuelven);
    return r;
  }));

  titulo('la activa sobrevive a cerrar la aplicación');
  await p.reload(); await p.waitForTimeout(2800);
  di('tras recargar', await p.evaluate(() => ({
    activa: document.getElementById('selActiva').value,
    banda: !document.getElementById('banda').classList.contains('apagada'),
    marcas: JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]').length })).then(r => {
    vale('la etiqueta activa sigue puesta', r.activa === 'promesas', r.activa || '(vacío)');
    vale('con su banda encendida', r.banda);
    vale('y las marcas siguen ahí', r.marcas > 0, r.marcas);
    return r;
  }));

  await cerrar(sesion);
})();
