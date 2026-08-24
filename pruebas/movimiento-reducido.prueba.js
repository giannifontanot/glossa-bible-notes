/* QUIEN PIDIÓ MENOS MOVIMIENTO NO RECIBE EL DEL ZOOM.

   De todo lo que se mueve en este programa, la hoja entera cambiando de tamaño
   y de sitio durante medio segundo es lo más grande. Es justo la clase de
   movimiento por la que existe la preferencia, y el archivo ya la respeta en
   otros sitios: sería raro apagar el giro de un disco y dejar puesto esto.
   Se apaga la TRANSICIÓN, no el zoom: la hoja sigue viéndose entera y llega
   ahí en un cuadro. */
const { abrir, cerrar, cerrarParcial, di, vale, titulo } = require('./comun');

(async () => {
  let sesion;
  for (const modo of ['no-preference', 'reduce']){
    sesion = await abrir({ reducedMotion: modo });
    const p = sesion.pagina;
    titulo('prefers-reduced-motion: ' + modo);
    const r = await p.evaluate(async () => {
      const inner = document.querySelector('#pg .pg-inner');
      const antes = getComputedStyle(inner).transform;
      document.getElementById('btnZoom').click();
      await new Promise(z => setTimeout(z, 40));
      const dur = getComputedStyle(inner).transitionDuration;
      await new Promise(z => setTimeout(z, 170));
      const medio = getComputedStyle(inner).transform;
      await new Promise(z => setTimeout(z, 900));
      const fin = getComputedStyle(inner).transform;
      return { duracion: dur, interpola: medio !== antes && medio !== fin, destino: fin };
    });
    di('medido', { duracion:r.duracion, interpola:r.interpola });
    if (modo === 'reduce'){
      vale('sin transición', r.duracion.startsWith('0s'), r.duracion);
      vale('y sin interpolar', !r.interpola);
    } else {
      vale('con transición', !r.duracion.startsWith('0s'), r.duracion);
      vale('e interpolando', r.interpola);
    }
    vale('llega al mismo sitio', r.destino !== 'none', r.destino);

    /* Y EL CAJÓN VA CON LA HOJA, TAMBIÉN AQUÍ.
       Volver tocando la columna de glosas corre el papel además de agrandar la
       hoja. Con la transición apagada la hoja llega en un cuadro, así que un
       cajón que siguiera animándose se quedaría corriéndose solo delante de
       una hoja ya quieta: el movimiento del que esta preferencia venía a
       librar, servido a solas y encima más visible. */
    const cajon = await p.evaluate(async () => {
      const pg = document.getElementById('pg');
      if (!pg.classList.contains('zoom')){
        document.getElementById('btnZoom').click();
        await new Promise(z => setTimeout(z, 1300));
      }
      const tope = pg.scrollWidth - pg.clientWidth;
      if (tope < 10) return { sinCarrera:true };
      const m = document.getElementById('pgMargin').getBoundingClientRect();
      const el = document.elementFromPoint(Math.round(m.left + 10), Math.round(m.bottom - 10));
      el.dispatchEvent(new MouseEvent('click', { bubbles:true,
        clientX:Math.round(m.left + 10), clientY:Math.round(m.bottom - 10) }));
      /* Un cuadro largo después: con la preferencia puesta ya tiene que estar
         puesto; sin ella tiene que ir todavía por el camino. */
      await new Promise(z => setTimeout(z, 60));
      const pronto = pg.scrollLeft;
      await new Promise(z => setTimeout(z, 900));
      return { fraccionPronto:+(pronto / tope).toFixed(2), final:pg.scrollLeft, tope };
    });
    di('el cajón al volver', cajon);
    if (!cajon.sinCarrera){
      if (modo === 'reduce')
        vale('el cajón llega de una vez', cajon.fraccionPronto === 1, cajon.fraccionPronto);
      else
        vale('el cajón viaja', cajon.fraccionPronto > 0 && cajon.fraccionPronto < 1,
             cajon.fraccionPronto);
      vale('y acaba en las glosas', cajon.final === cajon.tope,
           cajon.final + ' de ' + cajon.tope);
    }
    /* EL VUELO DE LA GLOSA TAMPOCO. Es la otra animación grande del programa
       —2.4 segundos de nota cruzando la hoja— y la única que no puede apagar
       una regla de CSS: la crea Element.animate(), y a eso no llega ninguna
       media query. Había que preguntarlo desde el guion. Lo levantó Codex. */
    const vuelo = await p.evaluate(async () => {
      const v = document.querySelector('#pgBody .v');
      const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
      while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
      if (!n) return { sinTexto:true };
      const r = document.createRange(); r.setStart(n,0); r.setEnd(n,14);
      getSelection().removeAllRanges(); getSelection().addRange(r);
      const rc = r.getBoundingClientRect();
      document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
        { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
      await new Promise(z => setTimeout(z, 550));
      const ta = document.getElementById('glosaCaja');
      if (!ta) return { sinPanel:true };
      ta.value = 'una nota que quizá vuele';
      ta.dispatchEvent(new Event('input', { bubbles:true }));
      document.body.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles:true, clientX:5, clientY:5 }));
      await new Promise(z => setTimeout(z, 200));
      const calco = [...document.body.children].find(e => e.classList &&
        e.classList.contains('gl-vista') && e.style.position === 'fixed');
      return { hayCalco: !!calco,
               animando: !!(calco && calco.getAnimations().length),
               /* y la nota tiene que estar puesta y visible de todos modos */
               guardada: JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
                 .some(m => m.nota === 'una nota que quizá vuele'),
               ningunaEscondida: [...document.querySelectorAll('.gl')]
                 .every(g => getComputedStyle(g).visibility !== 'hidden') };
    });
    di('el vuelo de la glosa', vuelo);
    if (!vuelo.sinTexto && !vuelo.sinPanel){
      if (modo === 'reduce'){
        vale('la glosa no vuela', vuelo.hayCalco === false);
        vale('y aparece puesta en su sitio',
             vuelo.guardada && vuelo.ningunaEscondida);
      } else {
        vale('la glosa vuela', vuelo.hayCalco && vuelo.animando);
        vale('y queda guardada igual', vuelo.guardada);
      }
    }
    /* Se revisan los errores de ESTA sesión antes de tirarla: cerrando a pelo,
       una excepción que solo ocurriera con la animación puesta se perdía y la
       prueba terminaba en verde. */
    if (modo === 'no-preference') await cerrarParcial(sesion, modo);
  }
  await cerrar(sesion);
})();
