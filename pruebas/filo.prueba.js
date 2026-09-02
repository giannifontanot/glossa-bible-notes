/* EL FILO: QUE UN TOQUE EN EL BORDE NUNCA SE QUEDE SIN EFECTO.

   Aquí vivía un fallo que se sentía como si el programa se hubiera muerto de
   la cintura para abajo: llegabas a cierta hoja, tocabas el filo, salía la
   huella —o sea que el toque SÍ entró— y la hoja no se movía. Y desde ahí
   ninguna otra volvía a moverse con el filo, ni en esa hoja ni en las
   siguientes, hasta recargar.

   La causa era una línea de contabilidad. `pasarHoja` se protege con
   `preparandoPliegue` para que no arranquen dos animaciones a la vez, y esa
   bandera la enciende también la tanda de reintentos —los que esperan a que
   llegue la foto de la hoja viva—. Quien la apagaba, `soltarReintento`, se iba
   por su primera línea si no encontraba reloj pendiente:

       function soltarReintento(){
         if (!relojReintento) return;               // ← aquí se iba
         clearTimeout(relojReintento); relojReintento = null;
         preparandoPliegue = false;
       }

   Y el callback del reintento pone el reloj en nulo ANTES de volver a llamar a
   pasarHoja. Así que cuando la tanda se agotaba —el respaldo de `intento > 3`,
   el que cambia la hoja sin animarla— soltarReintento encontraba el reloj ya
   nulo, se iba, y `preparandoPliegue` se quedaba encendido sin nadie que lo
   apagara. Desde ese momento el guardia de la primera línea de pasarHoja
   rechazaba todos los toques normales del filo.

   Por qué solo en algunas hojas: agotar los cuatro reintentos pide que la foto
   de la hoja viva no llegue en 520 ms. Una hoja pesada en un aparato lento, o
   una foto que falla, y ya está. Las demás hojas nunca llegan al respaldo.

   CÓMO SE FUERZA DESDE FUERA. El programa entero vive dentro de una función,
   así que no hay nada suyo que llamar ni que sustituir —y está bien que así
   sea—. Pero todas sus fotos pasan por `new Image()`, y eso sí es del
   navegador: cambiándolo por un doble que falla, o por uno que no contesta
   nunca, se recorren los desenlaces raros de pasarHoja uno por uno sin tocar
   una sola línea de la aplicación.

   Y no se mira la bandera —no se puede, y tampoco hace falta—: lo que se
   comprueba es lo único que importa, que el SIGUIENTE toque en el filo siga
   pasando hoja. */
const { abrir, cerrar, cerrarParcial, di, vale, titulo,
        ESCRITORIO } = require('./comun');

/* EL DOBLE DE `Image`, con tres modos:
     ok     el de verdad, sin tocar nada
     fallo  contesta que no pudo, que es lo que hace una foto rota
     mudo   no contesta ni bien ni mal, que es lo que ningún reloj del
            programa veía y por lo que hay ahora un plazo
   Va junto con el andamio del toque —PointerEvent de verdad, con su
   pointerId, nada de .click()— y con la manera de saber en qué hoja estamos:
   window.__estado, que el programa reescribe en cada repintado con el rango de
   versículos de la hoja. Dos hojas distintas no comparten rango, así que sirve
   de nombre propio. */
async function andamio(p){
  await p.evaluate(() => {
    window.__ImagenReal = window.Image;
    window.__modoFoto = 'ok';
    window.Image = function(){
      if (window.__modoFoto === 'ok') return new window.__ImagenReal();
      const o = { onload:null, onerror:null };
      Object.defineProperty(o, 'src', { set(){
        if (window.__modoFoto === 'fallo') setTimeout(() => o.onerror && o.onerror(), 0);
      }});
      return o;
    };
    window.__pid = 100;
    window.__pausa = ms => new Promise(z => setTimeout(z, ms));
    /* Devuelve si la huella se encendió: es la promesa que el programa le hace
       al dedo antes de mover nada, y una promesa que luego se rechaza es justo
       lo que no puede volver a pasar. */
    window.__toque = async (lado, y) => {
      const e = document.getElementById(lado === 'left' ? 'edgeL' : 'edgeR');
      const r = e.getBoundingClientRect();
      const op = { bubbles:true, pointerId: ++window.__pid, pointerType:'touch',
                   isPrimary:true, clientX: r.left + r.width/2, clientY: y || 450 };
      e.dispatchEvent(new PointerEvent('pointerdown', op));
      await window.__pausa(60);
      const huella = document.getElementById('huella').classList.contains('viva');
      e.dispatchEvent(new PointerEvent('pointerup', op));
      return huella;
    };
    /* UN ARRASTRE DEL FILO, que es el otro gesto que vive ahí: empieza su
       pliegue sin preguntarle a la preparación, así que es la manera honesta
       de que el lector se vaya de la hoja mientras una foto sigue en el aire.
       Va torcido a propósito: un dedo real tiembla. */
    window.__arrastre = async (lado) => {
      const e = document.getElementById(lado === 'left' ? 'edgeL' : 'edgeR');
      const r = e.getBoundingClientRect();
      const id = ++window.__pid, y0 = 420, x0 = r.left + r.width/2;
      const dir = lado === 'left' ? 1 : -1, tramo = window.innerWidth * 0.92;
      const op = (x, y) => ({ bubbles:true, pointerId:id, pointerType:'touch',
                              isPrimary:true, clientX:x, clientY:y });
      e.dispatchEvent(new PointerEvent('pointerdown', op(x0, y0)));
      for (let i = 1; i <= 14; i++){
        const k = i / 14;
        e.dispatchEvent(new PointerEvent('pointermove',
          op(x0 + dir*tramo*k + (Math.random()-0.5)*6, y0 + Math.sin(k*5)*7)));
        await window.__pausa(16);
      }
      e.dispatchEvent(new PointerEvent('pointerup', op(x0 + dir*tramo, y0)));
    };
    window.__hoja = () => window.__estado || '';
    /* Ni lienzo puesto, ni hoja escondida, ni huella flotando: el reposo. */
    window.__reposo = () => ({
      lienzo: getComputedStyle(document.getElementById('fx')).display,
      hojaVisible: !document.getElementById('pg').classList.contains('hidden'),
      huella: document.getElementById('huella').classList.contains('viva'),
      versiculos: document.querySelectorAll('#pgBody .v').length
    });
  });
}
const enReposo = r => r.lienzo === 'none' && r.hojaVisible && !r.huella && r.versiculos > 0;

/* Abrir en una hoja concreta sin dar cincuenta toques: el programa vuelve a
   donde te quedaste por referencia, y eso se siembra en los ajustes. Es el
   mismo camino que usa `conGlosas` para sembrar notas. */
async function abrirEn(p, libro, cap, vers){
  await p.evaluate(a => localStorage.setItem('glossa:ajustes:v1', JSON.stringify(a)),
                   { v:1, libro, cap, vers });
  await p.reload();
  await p.waitForTimeout(3200);
  await andamio(p);
}

/* Un toque y el tiempo de que la hoja termine de voltearse: el giro largo son
   780 ms, más la foto y el repintado. */
async function pasar(p, lado, espera){
  return p.evaluate(async ({ lado, espera }) => {
    const antes = window.__hoja();
    const huella = await window.__toque(lado);
    await window.__pausa(espera);
    return { antes, huella, despues: window.__hoja(), reposo: window.__reposo() };
  }, { lado, espera: espera || 1800 });
}

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  await abrirEn(p, 'MAT', 1, 1);

  /* ---------------------------------------------------------------- */
  /* EL BLANCO DEL FILO, MEDIDO. Son 30px y no 24: el filo es lo que se toca
     para pasar hoja, y 24 se falla con el pulgar en marcha. Se comprueba
     porque el número tiene dos dueños que tiran en direcciones contrarias
     —cuanto más ancho, más fácil de atinar y más texto tapa— y el que baje
     esto por descuido tiene que enterarse aquí.
     Se mide el rectángulo pintado, no la regla de CSS: lo que importa es el
     blanco que ofrece el dedo. Y se comprueban los dos, que el izquierdo se
     apaga en la primera hoja y es fácil dejárselo. */
  titulo('el filo mide 30px de blanco, a los dos lados');
  const anchoFilos = await p.evaluate(() => {
    const mide = id => {
      const e = document.getElementById(id);
      const r = e.getBoundingClientRect();
      return { ancho: Math.round(r.width), toque: getComputedStyle(e).touchAction };
    };
    return { der: mide('edgeR'), izq: mide('edgeL') };
  });
  di('lo que mide cada filo', anchoFilos);
  vale('el derecho mide 30', anchoFilos.der.ancho === 30, anchoFilos.der.ancho);
  vale('y el izquierdo también', anchoFilos.izq.ancho === 30, anchoFilos.izq.ancho);
  /* touch-action:none es lo que le quita el gesto al navegador para dárselo al
     filo, y es también la razón de que ahí debajo no se pueda seleccionar. Va
     escrito aquí para que quien lo quite sepa qué está moviendo. */
  vale('y se quedan el gesto entero', anchoFilos.der.toque === 'none' &&
       anchoFilos.izq.toque === 'none',
       anchoFilos.der.toque + ' · ' + anchoFilos.izq.toque);

  /* ---------------------------------------------------------------- */
  titulo('un toque en el filo derecho');
  const ida = await pasar(p, 'right');
  di('la hoja', ida.antes + '  →  ' + ida.despues);
  vale('sale la huella', ida.huella);
  vale('la hoja avanza', ida.antes !== ida.despues);
  vale('y todo queda en reposo', enReposo(ida.reposo), ida.reposo);

  titulo('un toque en el filo izquierdo');
  const vuelta = await pasar(p, 'left');
  di('la hoja', vuelta.antes + '  →  ' + vuelta.despues);
  vale('sale la huella', vuelta.huella);
  /* La prueba de que cada toque mueve UNA hoja y no dos: ir y volver deja el
     libro exactamente donde estaba. Con un salto de más no coincidiría. */
  vale('vuelve a la hoja de partida', vuelta.despues === ida.antes,
       vuelta.despues + '  vs  ' + ida.antes);
  vale('y todo queda en reposo', enReposo(vuelta.reposo), vuelta.reposo);

  /* ---------------------------------------------------------------- */
  titulo('la foto de la hoja destino falla');
  /* Aquí pageImg todavía sirve, así que pasarHoja llega a pedir la foto de la
     hoja de al lado y esa es la que falla: la hoja cambia por el camino de
     respaldo, sin animación, y eso está bien. Lo que no puede quedar es el
     lienzo puesto ni la preparación pedida. */
  const sinFoto = await p.evaluate(async () => {
    const partida = window.__hoja();
    window.__modoFoto = 'fallo';
    const huella = await window.__toque('right');
    await window.__pausa(1400);
    return { partida, huella, despues: window.__hoja(), reposo: window.__reposo() };
  });
  di('la hoja', sinFoto.partida + '  →  ' + sinFoto.despues);
  vale('sale la huella', sinFoto.huella);
  vale('la hoja cambia igual', sinFoto.despues !== sinFoto.partida);
  vale('y cambia UNA sola vez', sinFoto.despues === ida.despues,
       sinFoto.despues + '  vs  ' + ida.despues);
  vale('la hoja viva vuelve a verse', enReposo(sinFoto.reposo), sinFoto.reposo);

  /* ---------------------------------------------------------------- */
  titulo('la foto de la hoja viva tampoco llega: el respaldo');
  /* EL FALLO. Con las fotos rotas, pageImg se quedó en nulo tras el repintado
     de arriba, así que este toque entra por la tanda de reintentos y la agota:
     cuatro vueltas de 130 ms y el respaldo cambia la hoja. Hasta ahí, bien. */
  const respaldo = await p.evaluate(async () => {
    const partida = window.__hoja();
    const huella = await window.__toque('right');
    await window.__pausa(1800);                // 240 + 4·130 y sitio de sobra
    const trasRespaldo = window.__hoja(), reposo = window.__reposo();
    window.__modoFoto = 'ok';                  // el mundo vuelve a la normalidad
    await window.__pausa(400);
    /* Y AQUÍ ES DONDE SE CAÍA: este toque es normal y corriente, y con la
       bandera abandonada lo rechazaba el guardia de pasarHoja sin más. Va
       hacia atrás a propósito: si vuelve exactamente a la hoja de partida, el
       respaldo movió una sola hoja Y el filo sigue vivo, las dos cosas. */
    const huella2 = await window.__toque('left');
    await window.__pausa(1800);
    return { partida, trasRespaldo, reposo, huella, huella2,
             final: window.__hoja(), reposoFinal: window.__reposo() };
  });
  di('el viaje', respaldo.partida + '  →  ' + respaldo.trasRespaldo +
                 '  →  ' + respaldo.final);
  vale('sale la huella', respaldo.huella);
  vale('el respaldo cambia la hoja', respaldo.trasRespaldo !== respaldo.partida);
  vale('sin dejar el lienzo puesto', enReposo(respaldo.reposo), respaldo.reposo);
  vale('el toque siguiente sale con huella', respaldo.huella2);
  vale('EL FILO SIGUE VIVO', respaldo.final !== respaldo.trasRespaldo,
       respaldo.trasRespaldo + '  →  ' + respaldo.final);
  vale('y el respaldo movió UNA hoja', respaldo.final === respaldo.partida,
       respaldo.final + '  vs  ' + respaldo.partida);
  vale('y todo queda en reposo', enReposo(respaldo.reposoFinal), respaldo.reposoFinal);

  /* ---------------------------------------------------------------- */
  titulo('la carga de la foto no contesta ni bien ni mal');
  /* El desenlace que ningún reloj del programa veía: una imagen que no dispara
     onload ni onerror. Quien esperaba esa foto esperaba para siempre, y con él
     se quedaba pedida la preparación. Ahora hay un plazo —4 s— y se sale por el
     camino de fallo, que es un desenlace que sí se sabe atender. */
  const muda = await p.evaluate(async () => {
    const partida = window.__hoja();
    window.__modoFoto = 'mudo';
    await window.__toque('right');
    const aLosDos = window.__hoja();           // todavía dentro del plazo
    await window.__pausa(6000);
    const trasPlazo = window.__hoja(), reposo = window.__reposo();
    window.__modoFoto = 'ok';
    await window.__pausa(500);
    await window.__toque('right');
    await window.__pausa(1800);
    return { partida, aLosDos, trasPlazo, reposo, final: window.__hoja(),
             reposoFinal: window.__reposo() };
  });
  di('el viaje', muda.partida + '  →  ' + muda.trasPlazo + '  →  ' + muda.final);
  vale('el plazo la saca del pozo', muda.trasPlazo !== muda.partida,
       muda.partida + '  →  ' + muda.trasPlazo);
  vale('la hoja viva vuelve a verse', enReposo(muda.reposo), muda.reposo);
  vale('y el filo sigue vivo', muda.final !== muda.trasPlazo,
       muda.trasPlazo + '  →  ' + muda.final);
  vale('en reposo', enReposo(muda.reposoFinal), muda.reposoFinal);

  /* ---------------------------------------------------------------- */
  titulo('un pointercancel a media espera');
  const cancel = await p.evaluate(async () => {
    const partida = window.__hoja();
    const e = document.getElementById('edgeR'), r = e.getBoundingClientRect();
    const op = { bubbles:true, pointerId: ++window.__pid, pointerType:'touch',
                 isPrimary:true, clientX: r.left + r.width/2, clientY: 420 };
    e.dispatchEvent(new PointerEvent('pointerdown', op));
    await window.__pausa(60);
    const huellaViva = document.getElementById('huella').classList.contains('viva');
    e.dispatchEvent(new PointerEvent('pointercancel', op));
    await window.__pausa(800);
    const tras = { hoja: window.__hoja(),
                   huella: document.getElementById('huella').classList.contains('viva'),
                   reposo: window.__reposo() };
    /* Y el toque siguiente, que es lo que de verdad se está probando. */
    await window.__toque('right');
    await window.__pausa(1800);
    return { partida, huellaViva, tras, final: window.__hoja() };
  });
  di('el gesto cancelado', cancel.tras);
  vale('la huella estaba encendida', cancel.huellaViva);
  vale('y se apaga al cancelar', !cancel.tras.huella);
  vale('la hoja no se mueve', cancel.tras.hoja === cancel.partida);
  vale('sin pliegue a medias', enReposo(cancel.tras.reposo), cancel.tras.reposo);
  vale('el toque siguiente pasa hoja', cancel.final !== cancel.partida,
       cancel.partida + '  →  ' + cancel.final);

  /* ---------------------------------------------------------------- */
  titulo('toques atropellados mientras se prepara la foto');
  /* Ocho toques encimados con las fotos rotas: todos caen en el hueco donde
     vive la carrera. No pueden encimar animaciones, ni saltar de a varias
     hojas por toque, ni dejar el filo trabado. */
  const antesErr = sesion.errores.length;
  const carrera = await p.evaluate(async () => {
    const partida = window.__hoja();
    window.__modoFoto = 'fallo';
    for (let i = 0; i < 8; i++){ await window.__toque('right'); await window.__pausa(90); }
    await window.__pausa(3000);
    const trasCarrera = window.__hoja(), reposo = window.__reposo();
    window.__modoFoto = 'ok';
    await window.__pausa(500);
    /* Cuántas hojas se movieron en total, contadas volviendo hacia atrás hasta
       la de partida: si un toque hubiera pasado más de una, saldrían más que
       toques. */
    let vueltas = 0;
    while (vueltas < 20 && window.__hoja() !== partida){
      await window.__toque('left');
      await window.__pausa(1500);
      vueltas++;
    }
    return { partida, trasCarrera, reposo, vueltas, volvio: window.__hoja() === partida,
             reposoFinal: window.__reposo() };
  });
  const nuevos = sesion.errores.slice(antesErr);
  di('la carrera', carrera.partida + '  →  ' + carrera.trasCarrera);
  di('hojas movidas por 8 toques', carrera.vueltas);
  vale('ni una excepción', nuevos.length === 0, nuevos.length ? nuevos : 'ninguna');
  vale('la página queda coherente', enReposo(carrera.reposo), carrera.reposo);
  vale('se movió, y ningún toque pasó más de una hoja',
       carrera.vueltas >= 1 && carrera.vueltas <= 8, '1 ≤ ' + carrera.vueltas + ' ≤ 8');
  vale('y el filo desanda el camino', carrera.volvio, carrera.volvio ? carrera.partida : 'no volvió');
  vale('en reposo', enReposo(carrera.reposoFinal), carrera.reposoFinal);

  /* ---------------------------------------------------------------- */
  titulo('la primera hoja del primer libro');
  await abrirEn(p, 'MAT', 1, 1);
  const primera = await p.evaluate(async () => {
    const partida = window.__hoja();
    const apagado = document.getElementById('edgeL').classList.contains('off');
    const huella = await window.__toque('left');
    await window.__pausa(1500);
    const tras = window.__hoja();
    /* Y el filo del otro lado, que sí tiene a dónde ir, sigue funcionando. */
    await window.__toque('right');
    await window.__pausa(1800);
    return { partida, apagado, huella, tras, final: window.__hoja(),
             reposo: window.__reposo() };
  });
  di('el filo de la izquierda', primera);
  vale('el filo se ve apagado', primera.apagado);
  vale('no promete huella donde no se va', !primera.huella);
  vale('la hoja no se mueve', primera.tras === primera.partida);
  vale('y el otro filo sigue pasando hoja', primera.final !== primera.partida,
       primera.partida + '  →  ' + primera.final);
  vale('en reposo', enReposo(primera.reposo), primera.reposo);

  /* ---------------------------------------------------------------- */
  titulo('el final de un libro y el principio del siguiente');
  /* El cruce tiene su propia preparación —rehacer el plano del libro entero—
     y también tiene que poder soltarse pase lo que pase. Se llega a la última
     hoja de Mateo por los ajustes, que es barato, y de ahí se cruza tocando. */
  await abrirEn(p, 'MAT', 28, 20);
  const cruce = await p.evaluate(async () => {
    const partida = window.__hoja();
    const enElFinal = document.getElementById('cantoDer').classList.contains('viva');
    const filoVivo = !document.getElementById('edgeR').classList.contains('off');
    await window.__toque('right');
    /* Se espera a que pase, no un rato fijo: armar el libro nuevo tarda lo que
       tarde y en un aparato lento son segundos. */
    const t0 = performance.now();
    while (performance.now() - t0 < 25000 && window.__hoja() === partida)
      await window.__pausa(150);
    await window.__pausa(1200);
    const enMarcos = window.__hoja(), reposo = window.__reposo();
    /* Y una hoja más dentro del libro nuevo: si el cruce dejara la preparación
       pedida, esta no se movería. */
    await window.__toque('right');
    await window.__pausa(2000);
    return { partida, enElFinal, filoVivo, enMarcos, reposo,
             final: window.__hoja(), reposoFinal: window.__reposo() };
  });
  di('el cruce', cruce.partida + '  →  ' + cruce.enMarcos + '  →  ' + cruce.final);
  vale('en la última hoja el canto se enciende', cruce.enElFinal);
  vale('y el filo NO se apaga', cruce.filoVivo);
  vale('cruza al libro siguiente',
       cruce.enMarcos.split(' ')[0] !== cruce.partida.split(' ')[0],
       cruce.partida.split(' ')[0] + '  →  ' + cruce.enMarcos.split(' ')[0]);
  vale('sin dejar nada puesto', enReposo(cruce.reposo), cruce.reposo);
  vale('y el filo sigue vivo en el libro nuevo', cruce.final !== cruce.enMarcos,
       cruce.enMarcos + '  →  ' + cruce.final);
  vale('en reposo', enReposo(cruce.reposoFinal), cruce.reposoFinal);

  /* ---------------------------------------------------------------- */
  titulo('los otros caminos para pasar hoja siguen andando');
  const otros = await p.evaluate(async () => {
    const partida = window.__hoja();
    document.getElementById('btnZoom').click();
    await window.__pausa(1400);
    const bt = document.querySelector('#zoomPasos [data-paso="1"]');
    bt.click();
    await window.__pausa(2400);
    const conBoton = window.__hoja();
    /* Se sale del zoom por el hueco de debajo del libro: tocar el libro ya no
       cierra, que de lejos se pasa hoja y se tocan glosas. */
    const r = document.querySelector('#pg .pg-inner').getBoundingClientRect();
    document.getElementById('pg').dispatchEvent(new MouseEvent('click',
      { bubbles:true, clientX:Math.round(r.left+r.width/2), clientY:Math.round(r.bottom+60) }));
    await window.__pausa(1400);
    await window.__toque('right');
    await window.__pausa(2000);
    return { partida, conBoton, conFilo: window.__hoja() };
  });
  di('el botón de lejos', otros.partida + '  →  ' + otros.conBoton +
                          '  →  ' + otros.conFilo + ' (filo)');
  vale('el botón de lejos pasa hoja', otros.conBoton !== otros.partida);
  vale('y el filo después de él también', otros.conFilo !== otros.conBoton);

  /* ---------------------------------------------------------------- */
  titulo('una foto que llega tarde a una hoja que ya nadie mira');
  /* La preparación no cierra la puerta a todo: el arrastre del filo empieza su
     pliegue sin preguntarle. Así que se pide una hoja hacia adelante con la
     foto muda, y mientras esa foto está en el aire se arrastra hacia ATRÁS. Al
     cumplirse el plazo, la petición vieja se encuentra con que el lector está
     dos hojas más allá de donde ella creía: lo que no puede hacer es
     llevárselo de vuelta.

     Va al final a propósito, y empieza dejando el mundo en orden: hace falta
     que la foto de la hoja viva ESTÉ, porque si no el toque entra por la tanda
     de reintentos y no llega a pedir la foto del destino, que es la que tiene
     que quedarse colgada. */
  const caduca = await p.evaluate(async () => {
    window.__modoFoto = 'ok';
    await window.__toque('right');
    await window.__pausa(2500);
    const partida = window.__hoja();
    window.__modoFoto = 'mudo';
    await window.__toque('right');             // pide la siguiente; la foto se cuelga
    await window.__pausa(600);                 // 240 de espera y la petición ya salió
    await window.__arrastre('left');           // y el dedo se va hacia atrás
    await window.__pausa(1400);
    const trasArrastre = window.__hoja();
    await window.__pausa(6000);                // se cumple el plazo de la foto colgada
    const trasPlazo = window.__hoja(), reposo = window.__reposo();
    window.__modoFoto = 'ok';
    await window.__pausa(600);
    await window.__toque('right');
    await window.__pausa(2000);
    return { partida, trasArrastre, trasPlazo, reposo, final: window.__hoja(),
             reposoFinal: window.__reposo() };
  });
  di('el viaje', caduca.partida + '  →  ' + caduca.trasArrastre +
                 '  →  ' + caduca.trasPlazo);
  vale('el arrastre se lleva la hoja hacia atrás', caduca.trasArrastre !== caduca.partida,
       caduca.partida + '  →  ' + caduca.trasArrastre);
  vale('LA FOTO VIEJA NO MUEVE NADA', caduca.trasPlazo === caduca.trasArrastre,
       caduca.trasArrastre + '  →  ' + caduca.trasPlazo);
  vale('y no deja nada puesto', enReposo(caduca.reposo), caduca.reposo);
  vale('el filo sigue vivo', caduca.final !== caduca.trasPlazo,
       caduca.trasPlazo + '  →  ' + caduca.final);
  vale('en reposo', enReposo(caduca.reposoFinal), caduca.reposoFinal);

  await cerrarParcial(sesion, 'teléfono');

  /* ================================================================
     Y LO MISMO EN ESCRITORIO. La geometría del filo cambia con el ancho —en
     teléfono la hoja desborda la ventana y las fotos se miden distinto—. El
     fallo era de contabilidad y no de geometría, pero eso se dice después de
     comprobarlo, no antes. */
  const ancho = await abrir(ESCRITORIO);
  const q = ancho.pagina;
  await abrirEn(q, 'MAT', 1, 1);

  titulo('escritorio: el respaldo no traba el filo');
  const anchoRespaldo = await q.evaluate(async () => {
    const partida = window.__hoja();
    window.__modoFoto = 'fallo';
    await window.__toque('right');             // la foto del destino falla
    await window.__pausa(1500);
    const uno = window.__hoja();
    await window.__toque('right');             // y ahora se agota la tanda
    await window.__pausa(1800);
    const dos = window.__hoja(), reposo = window.__reposo();
    window.__modoFoto = 'ok';
    await window.__pausa(400);
    await window.__toque('left');
    await window.__pausa(1800);
    return { partida, uno, dos, reposo, final: window.__hoja(),
             reposoFinal: window.__reposo() };
  });
  di('el viaje', anchoRespaldo.partida + '  →  ' + anchoRespaldo.uno +
                 '  →  ' + anchoRespaldo.dos + '  →  ' + anchoRespaldo.final);
  vale('el respaldo cambia la hoja', anchoRespaldo.dos !== anchoRespaldo.uno);
  vale('sin dejar el lienzo puesto', enReposo(anchoRespaldo.reposo), anchoRespaldo.reposo);
  vale('EL FILO SIGUE VIVO', anchoRespaldo.final !== anchoRespaldo.dos,
       anchoRespaldo.dos + '  →  ' + anchoRespaldo.final);
  vale('y el respaldo movió UNA hoja', anchoRespaldo.final === anchoRespaldo.uno,
       anchoRespaldo.final + '  vs  ' + anchoRespaldo.uno);
  vale('en reposo', enReposo(anchoRespaldo.reposoFinal), anchoRespaldo.reposoFinal);

  await cerrar(ancho);
})();
