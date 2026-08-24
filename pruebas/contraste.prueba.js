/* EL CONTRASTE DEL PANEL DE FORMATO.

   Es un ajuste de accesibilidad, así que lo que hay que vigilar no es que el
   riel se mueva —eso lo hace el navegador— sino DÓNDE cae el filtro y dónde
   no. Son dos preguntas distintas y las dos se rompen en silencio:

   1. Que lo reciban las dos superficies de lectura, y el mismo número en las
      dos. La hoja viva se esconde al empezar a doblarse y su sitio lo ocupa el
      lienzo del pliegue; si una de ellas se quedara sin filtro, el contraste
      se caería justo al agarrar el papel y volvería al soltarlo. Ese salto no
      lo caza ninguna prueba de las otras, porque para ellas la hoja pasa
      igual de bien.

   2. Que NO lo reciba el panel de Formato. Es el peligro real de aplicar el
      filtro un nivel más arriba: #ajustes, #etiquetas, #canto y el readout
      son hermanos de la hoja dentro de #stage, y un filtro en el padre se los
      lleva a todos. El síntoma sería que el propio riel cambia de color
      mientras lo arrastras.

   Y una tercera que no es de filtros: que sobreviva a la recarga. El sepia se
   guarda de rebote —repagina, y al final de repaginar se guardan los ajustes—
   y éste a propósito NO repagina, así que su guardado es una línea aparte que
   se puede olvidar sin que nada más se entere. */
const { abrir, cerrar, cerrarParcial, di, vale, titulo,
        ESCRITORIO } = require('./comun');

/* getComputedStyle devuelve 'contrast(1.5)' o 'none'. Sacamos el número para
   poder compararlos entre sí; 'none' vale 1, que es lo que hace 'none'. */
const factorDe = css => {
  if (!css || css === 'none') return 1;
  const m = /contrast\(([\d.]+)\)/.exec(css);
  return m ? +m[1] : null;
};

/* Mover el riel COMO LO MUEVE UN DEDO: el valor se escribe y se dispara
   'input', que es el evento que el programa escucha. Con 'change' a secas la
   prueba pasaría aunque el arrastre no enseñara nada hasta soltar, que es
   justo la mitad de lo que se pidió. */
async function ponerContraste(pagina, pct){
  return pagina.evaluate(async v => {
    const r = document.getElementById('contraste');
    r.value = String(v);
    r.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 120));
    const lee = id => getComputedStyle(document.getElementById(id)).filter;
    return { pg: lee('pg'), fx: lee('fx'),
             ajustes: lee('ajustes'), stage: lee('stage'),
             raiz: getComputedStyle(document.documentElement)
                     .getPropertyValue('--contraste').trim(),
             medida: document.getElementById('contrasteAhora').textContent,
             riel: document.getElementById('contraste').value };
  }, pct);
}

(async () => {
  const sesion = await abrir();
  const pagina = sesion.pagina;

  /* ---------- dónde está, y que sea el mismo control que el sepia ---------- */
  titulo('el control vive entre el sepia y la versión');
  /* CON EL PANEL ABIERTO, y no es un detalle: cerrado va en display:none y
     todo lo que se mida ahí sale en cero, incluida la comparación de largos
     entre los dos rieles —que saldría verde por empate a nada—. Se abre como
     se abre con un dedo: titulillo y pestaña. */
  const abrioAlPrincipio = await pagina.evaluate(async () => {
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const t = [...document.querySelectorAll('.pestanas button')]
      .find(x => x.textContent.trim().toLowerCase() === 'formato');
    if (!t) return false;
    t.click();
    await new Promise(z => setTimeout(z, 800));
    return getComputedStyle(document.getElementById('ajustes')).display !== 'none';
  });
  vale('el panel de Formato abre', abrioAlPrincipio === true);
  const sitio = await pagina.evaluate(() => {
    const r = document.getElementById('contraste');
    if (!r) return { falta:'el riel' };
    const fila = r.closest('.ajuste');
    const filas = [...document.querySelectorAll('#ctrlConfig .ajuste')];
    const nombre = f => (f.querySelector('.lbl') || {}).textContent;
    const i = filas.indexOf(fila);
    return { orden: filas.slice(Math.max(0,i-1), i+2).map(nombre),
             ancho: fila.classList.contains('ancho'),
             clases: [...fila.classList].join(' '),
             rotulo: nombre(fila),
             tieneMedida: !!fila.querySelector('.medida'),
             aria: r.getAttribute('aria-label'),
             min: r.min, max: r.max, step: r.step,
             /* el riel tiene que ser tan largo como el del sepia o el pulgar
                no lo atina igual */
             largo: Math.round(r.getBoundingClientRect().width),
             largoSepia: Math.round(document.getElementById('sepia')
                                      .getBoundingClientRect().width) };
  });
  di('la vecindad', sitio.orden);
  vale('sepia · contraste · versión',
       JSON.stringify(sitio.orden) === JSON.stringify(['sepia','contraste','versión']),
       sitio.orden);
  vale('con las clases de siempre', sitio.clases === 'ajuste ancho', sitio.clases);
  vale('rótulo en minúsculas', sitio.rotulo === 'contraste', sitio.rotulo);
  vale('lleva su .medida', sitio.tieneMedida === true);
  vale('tiene nombre accesible', sitio.aria === 'contraste', sitio.aria);
  vale('rango 50–200 de uno en uno',
       sitio.min === '50' && sitio.max === '200' && sitio.step === '1',
       sitio.min + '–' + sitio.max + ' paso ' + sitio.step);
  /* El margen sale de la medida, no de lo que suene razonable: el riel del
     contraste es 17 px más corto que el del sepia y no puede no serlo —el
     rótulo "CONTRASTE" es cuatro letras más largo que "SEPIA" y su columna se
     estira para no partirlo, más los 5 px que se lleva el signo de por ciento
     del número—. Lo que se vigila es que siga siendo un riel largo, de los que
     se atinan con el pulgar, y que nadie le meta un control al lado que lo
     estruje: 20 px de holgura sobre los 17 medidos. */
  vale('riel tan largo como el del sepia',
       sitio.largo > 200 && (sitio.largoSepia - sitio.largo) <= 20,
       sitio.largo + ' contra ' + sitio.largoSepia);
  /* Y QUE NO SE MUEVA MIENTRAS SE ARRASTRA. Con el número creciendo de "50%"
     a "100%", el riel se encogía debajo del pulgar. */
  const estable = await pagina.evaluate(async () => {
    const r = document.getElementById('contraste');
    const ancho = async v => { r.value = String(v);
      r.dispatchEvent(new Event('input', { bubbles:true }));
      await new Promise(z => setTimeout(z, 100));
      return Math.round(r.getBoundingClientRect().width); };
    return { c50: await ancho(50), c100: await ancho(100), c200: await ancho(200) };
  });
  di('el riel a 50, 100 y 200', estable);
  vale('el riel no se encoge con el número',
       estable.c50 === estable.c100 && estable.c100 === estable.c200, estable);

  /* ---------- los cuatro valores pedidos ---------- */
  titulo('50, 100, 150 y 200');
  for (const [pct, factor] of [[50,.5],[100,1],[150,1.5],[200,2]]){
    const s = await ponerContraste(pagina, pct);
    di(pct + '%', s);
    vale('la hoja viva lo recibe · ' + pct + '%',
         factorDe(s.pg) === factor, s.pg);
    vale('y el lienzo el mismo · ' + pct + '%',
         factorDe(s.fx) === factorDe(s.pg), s.fx);
    vale('el número dice el % · ' + pct + '%',
         s.medida === pct + '%', s.medida);
    vale('FORMATO se queda limpio · ' + pct + '%',
         factorDe(s.ajustes) === 1, s.ajustes);
    /* .stage sí trae filtro propio —la sombra de hoja flotando en
       escritorio— pero NO puede traer contraste: ahí dentro está #ajustes. */
    vale('#stage no lo lleva · ' + pct + '%',
         !/contrast/.test(s.stage), s.stage);
  }

  /* ---------- fuera del riel no se sale ---------- */
  titulo('los topes aguantan');
  for (const [pide, queda] of [[10,50],[500,200]]){
    const s = await pagina.evaluate(async v => {
      const r = document.getElementById('contraste');
      /* saltándose el riel a propósito: el atributo min/max del input es la
         puerta normal, no la única */
      r.value = String(v);
      r.dispatchEvent(new Event('input', { bubbles:true }));
      await new Promise(z => setTimeout(z, 80));
      return { medida: document.getElementById('contrasteAhora').textContent,
               pg: getComputedStyle(document.getElementById('pg')).filter };
    }, pide);
    vale('pedir ' + pide + '% se queda en ' + queda + '%',
         s.medida === queda + '%', s.medida + ' / ' + s.pg);
  }

  /* ---------- el sepia y el contraste no se pisan ---------- */
  titulo('el sepia y el contraste son dos');
  const cruce = await pagina.evaluate(async () => {
    const meter = (id, v) => { const r = document.getElementById(id);
                               r.value = String(v);
                               r.dispatchEvent(new Event('input', { bubbles:true })); };
    const foto = () => ({
      contraste: getComputedStyle(document.getElementById('pg')).filter,
      medidaC: document.getElementById('contrasteAhora').textContent,
      sepia: document.getElementById('sepiaAhora').textContent,
      papel: getComputedStyle(document.getElementById('pg')).backgroundColor });
    meter('contraste', 150);
    await new Promise(z => setTimeout(z, 200));
    const trasContraste = foto();
    meter('sepia', 20);
    await new Promise(z => setTimeout(z, 500));
    const trasSepia = foto();
    return { trasContraste, trasSepia };
  });
  di('tras mover el contraste', cruce.trasContraste);
  di('y luego el sepia', cruce.trasSepia);
  vale('mover el sepia no borra el contraste',
       cruce.trasSepia.contraste === cruce.trasContraste.contraste,
       cruce.trasSepia.contraste);
  vale('mover el contraste no movió el sepia',
       cruce.trasContraste.sepia === '75', cruce.trasContraste.sepia);
  vale('el sepia sigue entintando el papel',
       cruce.trasSepia.papel !== cruce.trasContraste.papel,
       cruce.trasContraste.papel + ' → ' + cruce.trasSepia.papel);

  /* ---------- el recorrido que se pidió, con el panel abierto ---------- */
  titulo('150%, cerrar Formato, pasar hoja, mirar de lejos y recargar');
  await pagina.evaluate(() => localStorage.removeItem('glossa:ajustes:v1'));
  await pagina.reload();
  await pagina.waitForTimeout(2600);

  /* Se llega al panel como se llega con un dedo: titulillo y pestaña. */
  const abierto = await pagina.evaluate(async () => {
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const t = [...document.querySelectorAll('.pestanas button')]
      .find(x => x.textContent.trim().toLowerCase() === 'formato');
    if (!t) return { falta:'la pestaña de Formato' };
    t.click();
    await new Promise(z => setTimeout(z, 800));
    const p = document.getElementById('ajustes');
    return { visible: getComputedStyle(p).display !== 'none',
             veElRiel: !!p.querySelector('#contraste') ||
                       !!document.getElementById('contraste').closest('#ajustes') };
  });
  vale('el panel de Formato abre', abierto.visible === true, abierto);

  const conPanel = await ponerContraste(pagina, 150);
  di('con el panel delante', conPanel);
  vale('la hoja está a 150%', factorDe(conPanel.pg) === 1.5, conPanel.pg);
  vale('y el panel que lo manda, intacto', factorDe(conPanel.ajustes) === 1, conPanel.ajustes);
  /* Los colores del panel se miden de verdad, no por el nombre del filtro:
     un filtro heredado se vería aquí aunque la propiedad dijera 'none'. */
  const colorPanel = await pagina.evaluate(() => {
    const b = document.querySelector('#ajustes .btn');
    return { fondo: getComputedStyle(b).backgroundColor, tinta: getComputedStyle(b).color };
  });
  di('un botón del panel', colorPanel);

  /* cerrar el panel tocando fuera, como se cierra de verdad */
  await pagina.evaluate(async () => {
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
  });

  /* pasar hoja con clic en el filo derecho */
  const clic = await pagina.evaluate(async () => {
    const antes = document.getElementById('pgCabeza').textContent;
    const e = document.getElementById('edgeR');
    const r = e.getBoundingClientRect();
    const o = { bubbles:true, cancelable:true, pointerId:1, pointerType:'touch',
                clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
    e.dispatchEvent(new PointerEvent('pointerdown', o));
    e.dispatchEvent(new PointerEvent('pointerup', o));
    await new Promise(z => setTimeout(z, 1400));
    return { antes, despues: document.getElementById('pgCabeza').textContent,
             pg: getComputedStyle(document.getElementById('pg')).filter };
  });
  di('hoja pasada con clic', clic);
  vale('el clic pasó hoja', clic.antes !== clic.despues, clic.antes + ' → ' + clic.despues);
  vale('y el contraste sigue puesto', factorDe(clic.pg) === 1.5, clic.pg);

  /* pasar hoja arrastrando, y mirar el filtro EN PLENO PLIEGUE: es el momento
     en que la hoja viva se esconde y manda el lienzo. Un arrastre torcido, que
     es como los hace un dedo. */
  const arrastre = await pagina.evaluate(async () => {
    const antes = document.getElementById('pgCabeza').textContent;
    const e = document.getElementById('edgeR');
    const r = e.getBoundingClientRect();
    const y = r.top + r.height * .55;
    const x0 = r.left + r.width/2;
    const ev = (t, x, yy) => e.dispatchEvent(new PointerEvent(t,
        { bubbles:true, cancelable:true, pointerId:2, pointerType:'touch',
          clientX:x, clientY:yy }));
    ev('pointerdown', x0, y);
    let enVuelo = null;
    for (let i = 1; i <= 14; i++){
      /* torcido a propósito: un dedo real tiembla */
      ev('pointermove', x0 - i * 22, y + Math.sin(i) * 3);
      await new Promise(z => setTimeout(z, 26));
      if (i === 8){
        const pg = document.getElementById('pg'), fx = document.getElementById('fx');
        enVuelo = { pgOculta: getComputedStyle(pg).visibility === 'hidden',
                    lienzoVisible: getComputedStyle(fx).display !== 'none',
                    pg: getComputedStyle(pg).filter,
                    fx: getComputedStyle(fx).filter };
      }
    }
    ev('pointerup', x0 - 14 * 22, y);
    await new Promise(z => setTimeout(z, 1600));
    return { antes, despues: document.getElementById('pgCabeza').textContent, enVuelo,
             alSoltar: getComputedStyle(document.getElementById('pg')).filter };
  });
  di('en pleno pliegue', arrastre.enVuelo);
  vale('el arrastre pasó hoja', arrastre.antes !== arrastre.despues,
       arrastre.antes + ' → ' + arrastre.despues);
  vale('con la hoja en el aire, el lienzo manda',
       arrastre.enVuelo && arrastre.enVuelo.lienzoVisible === true, arrastre.enVuelo);
  vale('y hoja y lienzo llevan el mismo contraste',
       arrastre.enVuelo && factorDe(arrastre.enVuelo.fx) === 1.5 &&
       factorDe(arrastre.enVuelo.pg) === factorDe(arrastre.enVuelo.fx),
       arrastre.enVuelo && (arrastre.enVuelo.pg + ' / ' + arrastre.enVuelo.fx));
  vale('al aterrizar no hay salto', factorDe(arrastre.alSoltar) === 1.5, arrastre.alSoltar);

  /* ver la hoja entera */
  const lejos = await pagina.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 900));
    const pg = document.getElementById('pg');
    return { enZoom: pg.classList.contains('zoom'),
             pg: getComputedStyle(pg).filter,
             /* el papel de debajo vive DENTRO de #pg, así que le llega el
                mismo filtro sin decirle nada */
             papel: getComputedStyle(document.getElementById('zoomPapel')).filter,
             ajustes: getComputedStyle(document.getElementById('ajustes')).filter };
  });
  di('ver la hoja entera', lejos);
  vale('entró en la vista de lejos', lejos.enZoom === true);
  vale('y la hoja entera también lo respeta', factorDe(lejos.pg) === 1.5, lejos.pg);
  await pagina.evaluate(async () => {
    document.getElementById('btnZoom').click();
    await new Promise(z => setTimeout(z, 900));
  });

  /* ---------- y sobrevive a la recarga ---------- */
  titulo('sigue en 150% después de recargar');
  const guardado = await pagina.evaluate(() =>
    JSON.parse(localStorage.getItem('glossa:ajustes:v1') || 'null'));
  di('lo guardado', { v: guardado && guardado.v, sepia: guardado && guardado.sepia,
                      contraste: guardado && guardado.contraste });
  vale('el ajuste se guardó', guardado && guardado.contraste === 150, guardado && guardado.contraste);
  vale('sin cambiar la versión del objeto', guardado && guardado.v === 1, guardado && guardado.v);

  await pagina.reload();
  await pagina.waitForTimeout(2600);
  const tras = await pagina.evaluate(() => ({
    riel: document.getElementById('contraste').value,
    medida: document.getElementById('contrasteAhora').textContent,
    pg: getComputedStyle(document.getElementById('pg')).filter,
    fx: getComputedStyle(document.getElementById('fx')).filter,
    ajustes: getComputedStyle(document.getElementById('ajustes')).filter }));
  di('tras recargar', tras);
  vale('el riel vuelve en 150', tras.riel === '150', tras.riel);
  vale('el número también', tras.medida === '150%', tras.medida);
  vale('y la hoja nace ya con el filtro', factorDe(tras.pg) === 1.5, tras.pg);
  vale('FORMATO nunca lo recibió', factorDe(tras.ajustes) === 1, tras.ajustes);

  /* ---------- unos ajustes viejos, sin contraste ---------- */
  titulo('unos ajustes de antes de que esto existiera');
  const viejo = await pagina.evaluate(async () => {
    const c = 'glossa:ajustes:v1';
    const a = JSON.parse(localStorage.getItem(c));
    delete a.contraste;                 /* como los guardó la versión anterior */
    localStorage.setItem(c, JSON.stringify(a));
    return a.v;
  });
  await pagina.reload();
  await pagina.waitForTimeout(2600);
  const fabrica = await pagina.evaluate(() => ({
    riel: document.getElementById('contraste').value,
    medida: document.getElementById('contrasteAhora').textContent,
    sepia: document.getElementById('sepiaAhora').textContent,
    pg: getComputedStyle(document.getElementById('pg')).filter }));
  di('con ajustes viejos (v' + viejo + ')', fabrica);
  vale('se queda en el 100 de fábrica', fabrica.riel === '100' && fabrica.medida === '100%',
       fabrica.riel + ' / ' + fabrica.medida);
  /* 75 y no 20: el recorrido de más arriba empieza borrando los ajustes, así
     que el sepia volvió a su valor de fábrica antes de guardarse. Lo que aquí
     se comprueba es que quitarle el contraste al archivo no se lleva por
     delante lo demás. */
  vale('y el resto del archivo se respetó', fabrica.sepia === '75', fabrica.sepia);
  vale('sin filtro visible a 100%', factorDe(fabrica.pg) === 1, fabrica.pg);

  /* ---------- el texto se sigue pudiendo agarrar ---------- */
  titulo('un filtro no convierte la hoja en una estampa');
  const seleccion = await pagina.evaluate(async () => {
    const r = document.getElementById('contraste');
    r.value = '200'; r.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 150));
    const v = document.querySelector('#pgBody .v');
    if (!v) return { falta:'un versículo' };
    const rg = document.createRange();
    rg.selectNodeContents(v);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
    const cs = getComputedStyle(v);
    return { texto: String(sel).slice(0, 28),
             /* si alguien hubiera apagado la selección para "proteger" el
                filtro, se vería aquí */
             seleccionable: cs.userSelect !== 'none' &&
                            cs.webkitUserSelect !== 'none',
             /* y la hoja tiene que seguir recibiendo el dedo: un filtro no
                cambia pointer-events, pero apagarlo es la manera fácil de
                "arreglar" un filtro que estorba, y sería un desastre */
             recibeElDedo: getComputedStyle(document.getElementById('pg'))
                             .pointerEvents !== 'none' };
  });
  di('seleccionando a 200%', seleccion);
  vale('se puede seleccionar texto', (seleccion.texto || '').length > 3, seleccion.texto);
  vale('nadie apagó user-select', seleccion.seleccionable === true);
  vale('y la hoja sigue recibiendo el dedo', seleccion.recibeElDedo === true);

  await cerrarParcial(sesion, 'teléfono');

  /* ---------- y en escritorio, donde .stage SÍ trae filtro propio ---------- */
  titulo('en escritorio la sombra de .stage no se pierde');
  /* Es el único sitio del programa donde ya vivía un filter, y está justo
     encima de la hoja. Si alguien resolviera el contraste escribiendo el
     filter en .stage, aquí desaparecería el drop-shadow —y de paso el panel
     de Formato se teñiría—. Las dos cosas se miran de una vez. */
  const escritorio = await abrir(ESCRITORIO);
  const esc = await escritorio.pagina.evaluate(async () => {
    const r = document.getElementById('contraste');
    r.value = '200'; r.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 200));
    const f = id => getComputedStyle(document.getElementById(id)).filter;
    return { stage: f('stage'), pg: f('pg'), fx: f('fx'), ajustes: f('ajustes') };
  });
  di('en escritorio a 200%', esc);
  vale('.stage conserva su sombra', /drop-shadow/.test(esc.stage), esc.stage);
  vale('y no se le pegó el contraste', !/contrast/.test(esc.stage), esc.stage);
  vale('la hoja sí lo lleva', factorDe(esc.pg) === 2, esc.pg);
  vale('el lienzo también', factorDe(esc.fx) === 2, esc.fx);
  vale('y FORMATO sigue limpio', factorDe(esc.ajustes) === 1, esc.ajustes);

  await cerrar(escritorio);
})();
