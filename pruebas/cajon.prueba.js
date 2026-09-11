/* EL CAJÓN DE LAS GLOSAS Y EL DESLIZ QUE PASA HOJA.

   Dos cosas, que antes eran una:

   · La G —un círculo con G, carmín de las piedras— abre y cierra el cajón.
     El viaje dura lo que el de una glosa nueva (2400 ms), despacio al
     arrancar y al parar: lo abre una persona, no un interruptor.
   · El desliz de lado, que antes corría el papel, ahora pasa hoja: a la
     izquierda la siguiente, a la derecha la anterior. El umbral es el de
     siempre (34 px de intención, 10 de ruido, y si el dedo se queda era
     para glosar), para no disparar un pliegue con un roce al leer.

   Se prueba con dedo Y con ratón porque el desliz llega con los dos. */
const { abrir, cerrar, conGlosas, di, vale, titulo } = require('./comun');

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  await conGlosas(p);

  /* Un arrastre con temblor. El zigzag no es adorno: sin él, esto probaría un
     gesto que ningún dedo hace. */
  const arrastrar = (dx, pasos, ms, tipo) => p.evaluate(async a => {
    const pg = document.getElementById('pg');
    pg.scrollLeft = 0;
    const y0 = 430, x0 = 330;
    const op = i => ({ bubbles:true, pointerId:7, pointerType:a.tipo, isPrimary:true,
                       clientX: x0 + (a.dx * i / a.pasos),
                       clientY: y0 + (i % 2 ? 2 : -1) });   /* el temblor */
    pg.dispatchEvent(new PointerEvent('pointerdown', op(0)));
    for (let i = 1; i <= a.pasos; i++){
      pg.dispatchEvent(new PointerEvent('pointermove', op(i)));
      await new Promise(z => setTimeout(z, a.ms));
    }
    pg.dispatchEvent(new PointerEvent('pointerup', op(a.pasos)));
    return { tope: pg.scrollWidth - pg.clientWidth, cajon: pg.scrollLeft,
             hoja: window.__estado };
  }, { dx, pasos, ms, tipo });

  titulo('un roce corto no pasa hoja ni abre el cajón');
  const hoja0 = await p.evaluate(() => window.__estado);
  const roce = await arrastrar(-18, 6, 40, 'touch');
  di('18 px de dedo', { tope: roce.tope, cajon: roce.cajon, hoja: roce.hoja });
  vale('el cajón se queda cerrado', roce.cajon < roce.tope * 0.5,
       Math.round(roce.cajon/roce.tope*100) + '% abierto');
  vale('y la hoja no cambió', roce.hoja === hoja0, roce.hoja);

  titulo('un desliz a la izquierda pasa a la hoja siguiente');
  const envion = await arrastrar(-60, 6, 10, 'touch');
  di('60 px a la izquierda', { cajon: envion.cajon, desde: hoja0, hasta: envion.hoja });
  vale('el cajón NO se abre', envion.cajon < 4, envion.cajon);
  await p.waitForFunction(a => window.__estado && window.__estado !== a, hoja0, { timeout: 5000 })
    .catch(() => {});
  const trasIzq = await p.evaluate(() => window.__estado);
  vale('LA HOJA SIGUIENTE', trasIzq !== hoja0, hoja0 + ' → ' + trasIzq);

  titulo('un desliz a la derecha vuelve a la anterior');
  const hoja1 = trasIzq;
  await arrastrar(60, 6, 10, 'touch');
  await p.waitForFunction(a => window.__estado && window.__estado !== a, hoja1, { timeout: 5000 })
    .catch(() => {});
  const trasDer = await p.evaluate(() => window.__estado);
  vale('LA HOJA ANTERIOR', trasDer === hoja0, hoja1 + ' → ' + trasDer);

  titulo('el mismo desliz con ratón también pasa hoja');
  const antesRaton = await p.evaluate(() => window.__estado);
  await arrastrar(-60, 6, 10, 'mouse');
  await p.waitForFunction(a => window.__estado && window.__estado !== a, antesRaton, { timeout: 5000 })
    .catch(() => {});
  const trasRaton = await p.evaluate(() => window.__estado);
  vale('el ratón también pasa hoja', trasRaton !== antesRaton, antesRaton + ' → ' + trasRaton);

  /* DESDE UN VERSÍCULO, no solo desde el blanco. El desliz arranca sobre el
     renglón y tiene que pasar hoja igual —y dejar el cajón en paz. */
  titulo('desde un versículo también se pasa hoja');
  const desdeTexto = await p.evaluate(async () => {
    const pg = document.getElementById('pg');
    pg.scrollLeft = 0;
    const v = document.querySelector('#pgBody .v');
    if (!v) return { sinVerso:true };
    const r = v.getBoundingClientRect();
    const x0 = r.left + Math.min(80, r.width * .4);
    const y0 = r.top + r.height / 2;
    const hoja = window.__estado;
    const op = i => ({ bubbles:true, pointerId:8, pointerType:'touch', isPrimary:true,
                       clientX: x0 - (60 * i / 6),
                       clientY: y0 + (i % 2 ? 2 : -1) });
    v.dispatchEvent(new PointerEvent('pointerdown', op(0)));
    for (let i = 1; i <= 6; i++){
      v.dispatchEvent(new PointerEvent('pointermove', op(i)));
      await new Promise(z => setTimeout(z, 10));
    }
    v.dispatchEvent(new PointerEvent('pointerup', op(6)));
    return { cajon: pg.scrollLeft, sobre: v.dataset.k, hoja };
  });
  di('60 px sobre el versículo', desdeTexto);
  vale('(la prueba es válida) había un versículo de donde jalar',
       !desdeTexto.sinVerso, desdeTexto.sobre);
  vale('el cajón se queda cerrado', desdeTexto.cajon < 4, desdeTexto.cajon);
  await p.waitForFunction(a => window.__estado && window.__estado !== a,
                          desdeTexto.hoja, { timeout: 5000 }).catch(() => {});
  const trasVerso = await p.evaluate(() => window.__estado);
  vale('Y LA HOJA CAMBIÓ', trasVerso !== desdeTexto.hoja, desdeTexto.hoja + ' → ' + trasVerso);

  /* Y SI EL DEDO SE QUEDA, era para glosar: ni cajón ni pliegue. */
  titulo('si el dedo se queda sobre el texto, no es el cajón ni la hoja');
  const seQuedo = await p.evaluate(async () => {
    const pg = document.getElementById('pg');
    pg.scrollLeft = 0;
    const v = document.querySelector('#pgBody .v');
    if (!v) return { sinVerso:true };
    const r = v.getBoundingClientRect();
    const x0 = r.left + Math.min(80, r.width * .4);
    const y0 = r.top + r.height / 2;
    const hoja = window.__estado;
    const op = (x) => ({ bubbles:true, pointerId:9, pointerType:'touch', isPrimary:true,
                         clientX:x, clientY:y0 });
    v.dispatchEvent(new PointerEvent('pointerdown', op(x0)));
    await new Promise(z => setTimeout(z, 340));
    v.dispatchEvent(new PointerEvent('pointermove', op(x0 - 60)));
    v.dispatchEvent(new PointerEvent('pointerup', op(x0 - 60)));
    await new Promise(z => setTimeout(z, 400));
    return { cajon: pg.scrollLeft, tope: pg.scrollWidth - pg.clientWidth, hoja,
             hojaDespues: window.__estado };
  });
  di('tras quedarse 340 ms', seQuedo);
  vale('el cajón se queda cerrado', seQuedo.cajon < seQuedo.tope * 0.5,
       Math.round(seQuedo.cajon/(seQuedo.tope||1)*100) + '% abierto');
  vale('y la hoja no cambió', seQuedo.hojaDespues === seQuedo.hoja, seQuedo.hojaDespues);

  titulo('la G abre el cajón, despacio, como una glosa');
  const g = await p.evaluate(async () => {
    const b = document.getElementById('btnGlosas');
    const pg = document.getElementById('pg');
    pg.scrollLeft = 0;
    if (!b || b.hidden) return { sinG:true };
    const cs = getComputedStyle(b);
    const carmin = cs.color;
    const vivo = carmin === 'rgb(216, 11, 11)';
    const hist = document.getElementById('btnHistorial').getBoundingClientRect();
    const gR = b.getBoundingClientRect();
    const ultimo = document.getElementById('pgBody').lastElementChild;
    const textoAbajo = ultimo.getBoundingClientRect().bottom;
    const gMedio = (gR.top + gR.bottom) / 2;
    const hMedio = (hist.top + hist.bottom) / 2;
    const traza = [];
    const tope = pg.scrollWidth - pg.clientWidth;
    b.click();
    const t0 = performance.now();
    await new Promise(fin => {
      (function mira(){
        traza.push([Math.round(performance.now()-t0), Math.round(pg.scrollLeft)]);
        if (performance.now()-t0 < 2800) requestAnimationFrame(mira); else fin();
      })();
    });
    return {
      letra: b.textContent.trim(),
      familia: cs.fontFamily, peso: cs.fontWeight, tam: cs.fontSize,
      redonda: cs.borderRadius, carmin, vivo,
      tope, final: traza[traza.length-1][1], traza,
      presionada: b.getAttribute('aria-pressed'), abierta: b.classList.contains('abierta'),
      aLaDerecha: Math.abs(gR.right - hist.right) <= 2,
      entre: gMedio >= Math.min(textoAbajo, hMedio) - 2 &&
             gMedio <= Math.max(textoAbajo, hMedio) + 2,
      funde: /opacity/.test(cs.transition),
      halo: (() => {
        const x = gR.left + gR.width / 2, y = gR.top - 12;
        const el = document.elementFromPoint(x, y);
        return !!(el && el.closest && el.closest('#btnGlosas'));
      })()
    };
  });
  di('la G', { letra:g.letra, tam:g.tam, peso:g.peso, carmin:g.carmin, final:g.final });
  vale('(la prueba es válida) hay una G', !g.sinG && g.letra === 'G', g.letra);
  vale('en Segoe', /Segoe/i.test(g.familia || ''), g.familia);
  vale('21 pt', g.tam === '28px', g.tam);
  vale('en negrita', +g.peso >= 700, g.peso);
  vale('en un círculo', parseFloat(g.redonda) >= 14, g.redonda);
  vale('carmín de las piedras, no el vivo',
       /155,\s*42,\s*42/.test(g.carmin || '') && !g.vivo, g.carmin);
  vale('a la derecha, con el historial', g.aLaDerecha === true, g.aLaDerecha);
  vale('a media altura entre el texto y el historial', g.entre === true, g.entre);
  vale('y al pasar hoja se funde', g.funde === true, g.funde);
  vale('y el margen invisible gana el toque', g.halo === true, g.halo);
  vale('EL CAJÓN SE ABRE ENTERO', g.final >= g.tope - 2, g.final + ' de ' + g.tope);
  vale('y queda marcada como abierta', g.presionada === 'true' && g.abierta, g.presionada);
  /* La forma del viaje: despacio, rápido, despacio. Misma medida que cuando
     el desliz abría el cajón; ahora la G es quien lo corre. */
  const t = g.traza || [], topeG = g.tope || 0;
  const cuando = f => { const q = t.find(x => x[1] >= topeG*f); return q ? q[0] : null; };
  const marcas = { c25: cuando(.25), c50: cuando(.5), c75: cuando(.75), c100: cuando(.999) };
  di('cruza cada cuarto en', marcas);
  vale('arranca suave', marcas.c25 !== null && marcas.c50 !== null &&
       (marcas.c50 - marcas.c25) < marcas.c25,
       'primer cuarto ' + marcas.c25 + ' ms · segundo ' + (marcas.c50 - marcas.c25) + ' ms');
  vale('y frena al llegar', marcas.c100 !== null && marcas.c75 !== null &&
       (marcas.c100 - marcas.c75) > (marcas.c75 - marcas.c50),
       'tercer cuarto ' + (marcas.c75 - marcas.c50) + ' ms · último ' + (marcas.c100 - marcas.c75) + ' ms');
  vale('sin rebote', t.every(x => x[1] <= topeG + 1),
       'máximo ' + Math.max(...t.map(x => x[1])) + ' de ' + topeG);
  vale('y no es un interruptor: tarda lo de una glosa',
       marcas.c100 !== null && marcas.c100 >= 1800, marcas.c100 + ' ms');

  titulo('otro toque a la G lo cierra');
  const cierra = await p.evaluate(async () => {
    const b = document.getElementById('btnGlosas');
    const pg = document.getElementById('pg');
    b.click();
    const t0 = performance.now();
    await new Promise(fin => {
      (function mira(){
        if (pg.scrollLeft <= 1 || performance.now()-t0 > 2800) fin();
        else requestAnimationFrame(mira);
      })();
    });
    return { final: pg.scrollLeft, presionada: b.getAttribute('aria-pressed') };
  });
  di('al cerrar', cierra);
  vale('el cajón vuelve al texto', cierra.final <= 2, cierra.final);
  vale('y la G se apaga', cierra.presionada === 'false', cierra.presionada);

  titulo('la página no se desplaza en vertical');
  /* NO HAY NADA QUE DESPLAZAR, y sin embargo se podía. El cuerpo iba en
     min-height:100vh y la escena en height:100dvh, y esas dos NO miden lo
     mismo en un teléfono: 100vh es la pantalla con la barra del navegador
     retraída, 100dvh lo que se ve ahora. Con la barra a la vista el cuerpo
     quedaba más alto que lo visible y sobraban unos 50 px de desplazamiento
     que no llevan a ninguna parte y que arrastran los botones del pie hacia
     abajo. Lo encontró el autor en el navegador de DuckDuckGo.

     AQUÍ NO SE PUEDE REPRODUCIR: un navegador de pruebas no tiene barra que se
     esconda, así que vh y dvh valen lo mismo y el desplazamiento sale cero
     aunque el defecto esté puesto. Por eso se vigila LA UNIDAD, que es la
     causa, y no solo el síntoma. Las dos declaraciones tienen que hablar el
     mismo idioma; si una vuelve a vh, esto canta aunque la pantalla se vea
     perfecta. */
  di('las unidades del alto', await p.evaluate(() => {
    /* Se lee el TEXTO de las hojas, no el CSSOM: el CSSOM se queda solo con
       la última declaración que entiende, así que la cascada de respaldo
       —vh, svh, dvh— se pierde y no se puede comprobar que esté completa. */
    const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
    /* el bloque de body y el de .stage del modo teléfono */
    const bloque = re => { const m = css.match(re); return m ? m[0] : ''; };
    const delCuerpo = bloque(/\bbody\{[^}]*\}/);
    const deLaEscena = bloque(/\.stage\{[^}]*height:100[sd]vh[^}]*\}/);
    const unidades = t => [...t.matchAll(/(?:min-)?height:\s*100(vh|svh|dvh)/g)].map(m => m[1]);
    return { cuerpo: unidades(delCuerpo), escena: unidades(deLaEscena),
             textoCuerpo: (delCuerpo.match(/min-height:[^;]*/g) || []).join(' · ') };
  }).then(r => {
    const dinamica = u => u.includes('dvh') || u.includes('svh');
    vale('el cuerpo mide con unidad dinámica', dinamica(r.cuerpo), r.textoCuerpo);
    vale('la escena también', dinamica(r.escena), r.escena.join(','));
    /* LA COMPROBACIÓN QUE IMPORTA: la última que gana tiene que ser la misma
       en los dos. Si el cuerpo vuelve a quedarse en vh, aquí canta aunque la
       pantalla se vea perfecta en un navegador sin barra retráctil. */
    vale('y la que gana es la misma en los dos',
         r.cuerpo.length > 0 && r.escena.length > 0 &&
         r.cuerpo[r.cuerpo.length-1] === r.escena[r.escena.length-1],
         (r.cuerpo[r.cuerpo.length-1] || '?') + ' / ' + (r.escena[r.escena.length-1] || '?'));
    return r;
  }));

  /* Y el síntoma, en varias ventanas. Aquí siempre sale cero porque no hay
     barra retráctil, pero cazaría cualquier otra cosa que hiciera crecer el
     documento —un relleno olvidado, un elemento que se sale por abajo—. */
  di('lo que sobra por abajo', await p.evaluate(() => ({
    alto: document.documentElement.scrollHeight,
    visible: innerHeight,
    sobra: document.documentElement.scrollHeight - innerHeight,
    rellenoDelCuerpo: getComputedStyle(document.body).padding
  })).then(r => {
    vale('el documento no es más alto que la ventana', r.sobra <= 0,
         r.alto + ' contra ' + r.visible);
    return r;
  }));

  await cerrar(sesion);
})();
