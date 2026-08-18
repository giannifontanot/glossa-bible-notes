/* EL CAJÓN DE LAS GLOSAS: EL PAPEL SE CORRE PARA ENSEÑAR EL MARGEN.

   No es un panel que se abre: es la hoja que se desplaza de lado. Y el gesto
   que lo abre tuvo tres versiones, porque acertar aquí es difícil:

   · Con la palanca floja, sesenta píxeles de dedo abrían el cajón entero de
     golpe. Cualquier roce al pasar hoja lo disparaba.
   · Con el eje decidido en la PRIMERA muestra, un temblor de dos píxeles lo
     mataba para siempre. Un dedo real tiembla: el gesto podría no haberse
     abierto nunca. Por eso el eje se decide después de diez píxeles de
     movimiento, y por eso las pruebas de aquí van TORCIDAS a propósito.
   · Y ahora exige intención —treinta y cuatro píxeles— y luego termina el
     viaje solo, decelerando sin rebote, como un cajón de verdad.

   Se prueba con dedo Y con ratón porque el papel se corre con los dos. */
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
    const alSoltar = pg.scrollLeft;
    pg.dispatchEvent(new PointerEvent('pointerup', op(a.pasos)));
    const traza = [];
    const t0 = performance.now();
    await new Promise(fin => {
      (function mira(){
        traza.push([Math.round(performance.now()-t0), Math.round(pg.scrollLeft)]);
        if (performance.now()-t0 < 900) requestAnimationFrame(mira); else fin();
      })();
    });
    return { alSoltar, tope: pg.scrollWidth - pg.clientWidth,
             final: traza[traza.length-1][1], traza };
  }, { dx, pasos, ms, tipo });

  titulo('un roce corto no lo abre');
  const roce = await arrastrar(-18, 6, 40, 'touch');
  di('18 px de dedo', { tope: roce.tope, alSoltar: roce.alSoltar, final: roce.final });
  vale('el cajón se queda cerrado', roce.final < roce.tope * 0.5,
       Math.round(roce.final/roce.tope*100) + '% abierto');

  titulo('un desliz con intención lo abre entero');
  const envion = await arrastrar(-60, 6, 10, 'touch');
  di('60 px en 60 ms', { tope: envion.tope, alSoltar: envion.alSoltar, final: envion.final });
  vale('termina el viaje solo', envion.final >= envion.tope - 2,
       envion.alSoltar + ' al soltar → ' + envion.final);

  titulo('la forma del viaje: despacio, rápido, despacio');
  /* Sin esto se abriría igual pero se sentiría como un interruptor. Se mide
     cuándo cruza cada cuarto: si el primer cuarto tarda tanto como la mitad,
     hay arranque suave; si el último se estira, hay frenada. */
  const t = envion.traza, tope = envion.tope;
  const cuando = f => { const q = t.find(x => x[1] >= tope*f); return q ? q[0] : null; };
  const marcas = { c25: cuando(.25), c50: cuando(.5), c75: cuando(.75), c100: cuando(.999) };
  di('cruza cada cuarto en', marcas);
  vale('arranca suave', marcas.c25 !== null && marcas.c50 !== null &&
       (marcas.c50 - marcas.c25) < marcas.c25,
       'primer cuarto ' + marcas.c25 + ' ms · segundo ' + (marcas.c50 - marcas.c25) + ' ms');
  vale('y frena al llegar', marcas.c100 !== null && marcas.c75 !== null &&
       (marcas.c100 - marcas.c75) > (marcas.c75 - marcas.c50),
       'tercer cuarto ' + (marcas.c75 - marcas.c50) + ' ms · último ' + (marcas.c100 - marcas.c75) + ' ms');
  vale('sin rebote', t.every(x => x[1] <= tope + 1),
       'máximo ' + Math.max(...t.map(x => x[1])) + ' de ' + tope);

  titulo('el mismo desliz con ratón');
  const raton = await arrastrar(-60, 6, 10, 'mouse');
  di('60 px de ratón', { alSoltar: raton.alSoltar, final: raton.final, tope: raton.tope });
  vale('el ratón también lo abre', raton.final >= raton.tope - 2);

  await cerrar(sesion);
})();
