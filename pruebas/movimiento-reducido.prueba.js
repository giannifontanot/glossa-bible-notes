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
    /* EL PANEL NACE CRECIENDO DESDE LO SEÑALADO, y eso también es movimiento.
       Es corto —170ms, solo para que no dé el salto— pero lo crea
       Element.animate() igual que el vuelo, así que ninguna regla de CSS puede
       apagarlo y hay que preguntarlo desde el guion. */
    const nacer = await p.evaluate(async () => {
      const v = document.querySelector('#pgBody .v');
      /* SE PINTA Y SE TOCA APARTE, y aquí la separación hace falta de verdad:
         lo que se mide es el panel a los 45 ms de NACER, así que el toque que
         lo abre tiene que darlo esta prueba para poder mirar justo después.
         Ver __pintarEn y __tocarLoPintado en comun.js. */
      const donde = await window.__pintarEn(v, 0, 20);
      if (!donde) return { sinTexto:true, porque: window.__pincelPorque };
      const centro = { x: donde.x, y: donde.y };
      const pgB = document.getElementById('pgBody');
      const op = (x, y) => ({ bubbles:true, cancelable:true, pointerId:65,
                              pointerType:'touch', isPrimary:true, clientX:x, clientY:y });
      pgB.dispatchEvent(new PointerEvent('pointerdown', op(donde.x, donde.y)));
      await new Promise(z => setTimeout(z, 20));
      pgB.dispatchEvent(new PointerEvent('pointerup', op(donde.x, donde.y)));
      await new Promise(z => setTimeout(z, 45));
      const menu = document.getElementById('menu');
      const an = menu.getAnimations()[0];
      const m = menu.getBoundingClientRect();
      const org = getComputedStyle(menu).transformOrigin.split(' ').map(parseFloat);
      /* El origen se pega al filo más cercano a lo señalado cuando queda fuera
         del panel, así que lo que se comprueba es que esté DENTRO de la caja y
         del lado bueno, no que caiga en el punto exacto. */
      const dentro = org[0] >= -1 && org[0] <= m.width + 1 &&
                     org[1] >= -1 && org[1] <= m.height + 1;
      const haciaElPasaje = centro.y <= m.top + 1 ? org[1] <= 1
                          : centro.y >= m.bottom - 1 ? org[1] >= m.height - 1
                          : true;
      const res = { animando: !!an, duracion: an ? an.effect.getTiming().duration : null,
                    dentro, haciaElPasaje };
      await new Promise(z => setTimeout(z, 420));
      res.acabaQuieto = getComputedStyle(menu).transform === 'none';
      res.opacidad = getComputedStyle(menu).opacity;
      /* se recoge para no dejar el panel abierto en la prueba siguiente */
      document.body.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles:true, clientX:5, clientY:5 }));
      await new Promise(z => setTimeout(z, 300));
      return res;
    });
    di('el panel al nacer', nacer);
    if (!nacer.sinTexto){
      if (modo === 'reduce'){
        vale('el panel no crece, aparece', nacer.animando === false);
      } else {
        vale('el panel crece desde el pasaje', nacer.animando &&
             nacer.duracion === 170, nacer.duracion + ' ms');
        vale('y crece desde el lado que le toca', nacer.dentro && nacer.haciaElPasaje);
      }
      vale('en los dos casos acaba quieto y entero',
           nacer.acabaQuieto && nacer.opacidad === '1', nacer.opacidad);
    }

    /* EL PANEL YA NO SE DESLIZA AL ABRIR LAS ETIQUETAS, Y ESO ES LO NUEVO.

       Aquí se afirmaba lo contrario, y con razón mientras el panel perseguía
       al pasaje: abrir la lista lo estiraba, a veces ya no cabía encima de lo
       señalado y tenía que cambiarse al otro lado, y ese salto de trescientos
       píxeles había que enseñarlo en vez de darlo.

       Desde que el panel sale casi arriba del todo y se queda ahí —lo mueve el
       lector por su manija, y solo si le estorba—, no hay a dónde saltar: la
       lista lo estira hacia abajo y el filo de arriba no se mueve. Barridos
       los catorce pasajes de la hoja, NINGUNO lo mueve, donde antes lo movían
       nueve. Lo que se prueba ahora es eso.

       El deslizamiento no se ha quitado del programa y no es código muerto:
       sigue estando para cuando el panel estirado no quepa de arriba abajo
       —una pantalla muy baja—, que es el único caso que queda en el que
       colocarMenu tiene que subirlo. Aquí no se da, y por eso esta prueba
       afirma lo que sí se da. */
    const pliegue = await p.evaluate(async () => {
      const pausa = ms => new Promise(z => setTimeout(z, ms));
      const menu = document.getElementById('menu');
      /* CON EL DEDO, que la selección ya no existe. El cuerpo del pasaje
         lleva user-select:none desde que se glosa pintando, así que el
         addRange de antes no armaba nada y el toque no abría el panel: se
         pinta y se toca encima, que es el gesto de verdad. Lo pone el
         andamio, ver PINCEL en comun.js.

         Y lo que se afirma abajo es lo del PR #97, no lo que traía la rama de
         pintar: mientras el panel perseguía al pasaje había que buscar cuál
         de los catorce lo obligaba a moverse, y desde que sale casi arriba y
         se queda ahí NINGUNO lo mueve. Las dos ramas cambiaron este bloque a
         la vez y en sentidos contrarios; manda la del panel, que es la que
         cambió el programa. */
      const v = document.querySelectorAll('#pgBody .v')[1] ||
                document.querySelector('#pgBody .v');
      if (!v) return { sinTexto:true };
      if (!await window.__glosarEn(v, 5, 25))
        return { sinTexto:true, porque: window.__pincelPorque };
      const ta = document.getElementById('glosaCaja'); if (!ta) return { sinPanel:true };
      ta.value = 'una nota cualquiera';
      ta.dispatchEvent(new Event('input', { bubbles:true }));
      await pausa(200);
      const bot = menu.querySelector('.mtags'); if (!bot) return { sinBoton:true };
      const antes = menu.getBoundingClientRect();
      bot.click();
      /* cuadro a cuadro, que es como se mira un movimiento que no debe haber */
      const paso = [], t0 = performance.now();
      await new Promise(z => {
        const mirar = () => {
          paso.push(Math.round(menu.getBoundingClientRect().top));
          if (performance.now() - t0 < 700) requestAnimationFrame(mirar); else z();
        };
        requestAnimationFrame(mirar);
      });
      const fin = menu.getBoundingClientRect();
      return { arriba: Math.round(antes.top), arribaFin: Math.round(fin.top),
               altoAntes: Math.round(antes.height), altoFin: Math.round(fin.height),
               cuadros: paso.length, distintos: [...new Set(paso)].length,
               acabaQuieto: getComputedStyle(menu).transform === 'none',
               listaAbierta: !!menu.querySelector('.tagbox.abierta') };
    });
    di('el panel al abrir las etiquetas', pliegue);
    if (!pliegue.sinTexto && !pliegue.sinPanel && !pliegue.sinBoton){
      /* Si la lista no llegara a abrirse, todo lo de abajo pasaría en verde
         sin haber mirado nada. */
      vale('(la prueba es válida) la lista se abre y el panel crece',
           pliegue.listaAbierta === true && pliegue.altoFin > pliegue.altoAntes,
           pliegue.altoAntes + ' → ' + pliegue.altoFin + ' px');
      vale('EL PANEL NO SE MUEVE: CRECE HACIA ABAJO Y SE QUEDA ARRIBA',
           pliegue.arriba === pliegue.arribaFin && pliegue.distintos === 1,
           'arriba ' + pliegue.arriba + ' → ' + pliegue.arribaFin +
           ' · ' + pliegue.distintos + ' sitio(s) en ' + pliegue.cuadros + ' cuadros');
      vale('  y acaba sin transformación pendiente', pliegue.acabaQuieto === true);
    }

    /* EL VUELO DE LA GLOSA TAMPOCO. Es la otra animación grande del programa
       —2.4 segundos de nota cruzando la hoja— y la única que no puede apagar
       una regla de CSS: la crea Element.animate(), y a eso no llega ninguna
       media query. Había que preguntarlo desde el guion. Lo levantó Codex. */
    const vuelo = await p.evaluate(async () => {
      const v = document.querySelector('#pgBody .v');
      if (!await window.__glosarEn(v, 0, 14)) return { sinTexto:true, porque: window.__pincelPorque };
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
    /* EL SELLO DE LAS GLOSAS VUELVE CON EL CAJÓN, NO POR SU CUENTA.

       Al soltar un jalón, irA mira la preferencia y cierra el cajón en el
       acto; si la transición del dibujo sobreviviera, el sello seguiría
       viajando 230 ms solo y se vería despegado de lo que abrió. Pasaba:
       #btnGlosas.volviendo pesa más que #btnGlosas, así que la regla de
       movimiento reducido no lo alcanzaba. Medido entonces: cajón en 0 y
       sello en -54.9 a los 60 ms. Lo levantó Codex revisando el PR #91. */
    const sello = await p.evaluate(async () => {
      const pausa = ms => new Promise(z => setTimeout(z, ms));
      const g = document.getElementById('btnGlosas');
      const pgEl = document.getElementById('pg');
      if (!g || g.hidden) return { sinG:true };
      /* SE CIERRA EL CAJÓN ANTES DE JALAR, y esto no estaba. El bloque de
         arriba lo deja ABIERTO DEL TODO —«y acaba en las glosas», cajón en
         el tope—, y desde el tope un jalón hacia la izquierda no mueve nada:
         el sello se quedaba quieto en 0 con toda la razón del mundo y la
         prueba leía ese 0 como un desacuerdo. Falló así las dos veces en el
         entorno de Codex. Aquí no salía porque la sonda suelta con la que lo
         comprobé empezaba con el cajón cerrado: la sonda probaba otra cosa
         que la prueba, y ésa era toda la diferencia, no la máquina.
         Se pone el papel a la izquierda a pelo en vez de tocar la G: el toque
         abre y cierra con un vuelo de 2400 ms, y aquí lo que hace falta es el
         punto de partida, no el viaje. */
      pgEl.scrollLeft = 0;
      await pausa(60);
      const partida = Math.round(pgEl.scrollLeft);
      const r = g.getBoundingClientRect();
      const x = r.left + r.width/2, y = r.top + r.height/2;
      const op = () => ({ bubbles:true, cancelable:true, pointerId:83,
                          pointerType:'touch', isPrimary:true });
      const donde = () => +(new DOMMatrix(getComputedStyle(g).transform).m41).toFixed(1);
      g.dispatchEvent(new PointerEvent('pointerdown',
        Object.assign(op(), { clientX:x, clientY:y })));
      for (const dx of [-20, -60, -100]){
        g.dispatchEvent(new PointerEvent('pointermove',
          Object.assign(op(), { clientX:x + dx, clientY:y + (dx % 3 ? 2 : -1) })));
        await pausa(26);
      }
      const jalado = { cajon: Math.round(pgEl.scrollLeft), sello: donde() };
      g.dispatchEvent(new PointerEvent('pointerup',
        Object.assign(op(), { clientX:x - 100, clientY:y })));
      await pausa(60);
      return { partida, jalado,
               justo: { cajon: Math.round(pgEl.scrollLeft), sello: donde() } };
    });
    di('el sello al soltarlo', sello);
    /* Y esto va FUERA del if: sin él, una sesión sin glosas se saltaba el
       bloque entero en silencio y la suite pasaba sin haber probado nada. */
    vale('(la prueba es válida) el sello de las glosas está puesto',
         !sello.sinG, sello.sinG ? 'no hay G que jalar' : 'puesto');
    if (!sello.sinG){
      vale('(la prueba es válida) se parte con el cajón cerrado',
           sello.partida === 0, sello.partida + ' px');
      vale('(la prueba es válida) el jalón llegó a abrir el cajón',
           sello.jalado.cajon > 40, sello.jalado.cajon + ' px');
      /* Y ÉSTA ES LA QUE FALTABA. Sin ella, un sello que no se movió da un
         denominador de cero, la fracción sale 0 igual que la del cajón
         quieto, y «van atados» se cumple sin que nada se haya movido: la
         prueba pasaba justo en el caso en que no estaba probando nada. */
      vale('(la prueba es válida) el jalón movió el sello',
           Math.abs(sello.jalado.sello) > 4, sello.jalado.sello + ' px');
      /* LO QUE SE AFIRMA ES QUE VAN ATADOS, y no dónde está cada uno a los
         60 ms. La primera versión decía «con movimiento normal el sello sí se
         anima», y eso da por hecho que a los 60 ms el viaje va por la mitad:
         una afirmación sobre un instante, que es de las que fallan en otra
         máquina sin que nada esté roto. (Al escribirla di por hecho que el
         fallo que levantó Codex sobre 5146acb era eso, cosa de la máquina.
         No lo era: el cajón estaba abierto y el sello no tenía por qué
         moverse. Aun así la afirmación sobre el instante sobraba, y la de la
         fracción es mejor por su cuenta.)
         La fracción de viaje no depende de eso: si los dos van al mismo ritmo
         están atados, vayan deprisa, despacio o de un tirón. Y sigue cazando
         lo que había que cazar: con la transición de CSS que se quitó, el
         cajón saltaba a cero y el sello se quedaba en 0.55 del camino. */
      const frac = (x, de) => de ? x / de : 0;
      const fCajon = frac(sello.justo.cajon, sello.jalado.cajon);
      const fSello = frac(sello.justo.sello, sello.jalado.sello);
      vale('EL SELLO Y EL CAJÓN VUELVEN ATADOS, AL MISMO RITMO',
           Math.abs(fCajon - fSello) <= .08,
           'cajón ' + fCajon.toFixed(3) + ' · sello ' + fSello.toFixed(3) +
           ' del camino');
      if (modo === 'reduce'){
        /* Y con la preferencia puesta el viaje es de un tirón: eso sí es una
           afirmación sobre el instante, y aquí se puede hacer porque lo que
           se pide es justamente que no haya viaje. */
        vale('  y con menos movimiento no hay viaje: los dos ya están en casa',
             sello.justo.cajon === 0 && Math.abs(sello.justo.sello) <= 1,
             'cajón ' + sello.justo.cajon + ' · sello ' + sello.justo.sello);
      }
    }

    /* Se revisan los errores de ESTA sesión antes de tirarla: cerrando a pelo,
       una excepción que solo ocurriera con la animación puesta se perdía y la
       prueba terminaba en verde. */
    if (modo === 'no-preference') await cerrarParcial(sesion, modo);
  }
  await cerrar(sesion);
})();
