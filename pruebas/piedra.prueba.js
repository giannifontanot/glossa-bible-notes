/* LAS PIEDRAS: LO QUE SE DEJA SOBRE LA HOJA Y AHÍ SE QUEDA.

   Una cinta SIGUE al lector. Una piedra es lo contrario: se posa donde la
   pones, no se mueve nunca más, y puede haber muchas. Lo que esta prueba
   vigila de verdad son tres cosas que no se ven mirando la pantalla un
   segundo:

   1. QUE SE QUEDE EN SU HOJA. Es toda la diferencia con la cinta, y la única
      manera de comprobarlo es pasar hoja y volver.
   2. QUE EL DEDO DISTINGA TOCAR DE ARRASTRAR. Un toque cambia la forma y un
      arrastre la mueve; los dos empiezan con el mismo pointerdown sobre el
      mismo píxel, así que lo único que los separa es cuánto se movió. Aquí se
      prueban los dos, y que uno no haga lo del otro.
   3. QUE UNA PIEDRA QUIETA NO ESTORBE. Vive encima del papel, que es donde se
      selecciona texto, se abre una glosa y se arrastra la hoja. Una capa que
      se coma esos toques rompe la aplicación entera por un adorno.
   4. QUE LLEGUE A SER ENORME DE VERDAD. Se pidieron piedras visibles con la
      hoja alejada, o sea diez veces las de antes; y a ese tamaño el mando
      dejó de caber colgado de ellas y se mudó a la escena. Las dos cosas se
      miden aquí: cuánto crece —en fracción del papel, que es lo que la
      aplicación promete— y que el panel siga cabiendo con la piedra al tope.

   Y la regla de la casa que aquí importa: NADA DE .click() PARA GESTOS. El
   toque y el arrastre van con PointerEvent y su pointerId, porque es
   justamente el camino del puntero lo que se está probando. */
const { abrir, cerrar, cerrarParcial, di, vale, titulo } = require('./comun');

const LLAVE = 'glossa:piedras:v1';

async function andamio(p){
  await p.evaluate(() => {
    window.__pid = 900;
    window.__pausa = ms => new Promise(z => setTimeout(z, ms));
    window.__hoja = () => (window.__estado || '').split('·')[0].trim();
    window.__toque = async (sel) => {
      const e = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!e) return false;
      const r = e.getBoundingClientRect();
      const op = { bubbles:true, cancelable:true, pointerId: ++window.__pid,
                   pointerType:'touch', isPrimary:true,
                   clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
      e.dispatchEvent(new PointerEvent('pointerdown', op));
      await window.__pausa(40);
      e.dispatchEvent(new PointerEvent('pointerup', op));
      /* EL CLIC DE UN DEDO LLEVA detail:1, Y AQUÍ ESO IMPORTA. Sin ponerlo, un
         MouseEvent nace con detail 0 — que es justo lo que manda el TECLADO al
         pulsar Intro sobre un botón, y es como la piedra distingue el dedo del
         teclado. Sin este 1, el toque sintético se hacía pasar por Intro y
         abría la edición: la prueba de «quieta, un toque no la abre» cayó por
         eso, y era el andamio mintiendo, no la aplicación fallando. Es la
         cuarta regla de la casa otra vez: un evento hecho a mano llega como se
         escriba, y el de un teléfono no. */
      e.dispatchEvent(new MouseEvent('click', Object.assign({ detail:1 }, op)));
      return true;
    };
    window.__guardadas = () => {
      try { return JSON.parse(localStorage.getItem('glossa:piedras:v1') || '[]'); }
      catch(e){ return 'ilegible'; }
    };
    window.__hayPiedra = () => !!document.querySelector('.piedra-sitio');
    window.__editando = () => !!document.querySelector('.piedra-sitio.editando');
    /* La piedra medida como la ve el ojo: qué forma, de qué color, cómo se
       llama, qué tamaño, y DÓNDE está en fracciones del papel, que es como se
       guarda. Y el TAMAÑO se devuelve también como fracción del papel, porque
       es lo que la aplicación promete: la misma piedra ocupa lo mismo de la
       hoja en cualquier pantalla, y en píxeles eso no se puede comprobar.

       La FORMA se saca de la primera palabra del rótulo hablado, que empieza
       por ella —«barca carmín «lo del monte» en Mat 1:1»—. Se leía partiendo
       por ' en ', y eso se rompió el día que el rótulo empezó a decir también
       el color: devolvía «barca carmín» donde antes decía «barca». */
    window.__laPiedra = () => {
      const e = document.querySelector('.piedra-sitio');
      if (!e) return null;
      const b = e.querySelector('.piedra');
      const r = b.getBoundingClientRect();
      const inner = document.querySelector('#pg .pg-inner').getBoundingClientRect();
      const voz = b.getAttribute('aria-label') || '';
      const m = document.getElementById('piedraMando');
      return { id: e.dataset.piedra, editando: e.classList.contains('editando'),
               forma: voz.split(' ')[0],
               color: getComputedStyle(b).color,
               nombre: (e.querySelector('.piedra-nombre') || {}).textContent || null,
               lado: Math.round(r.width),
               parte: +(r.width / inner.width).toFixed(3),
               fx: +((r.left + r.width/2 - inner.left) / inner.width).toFixed(3),
               fy: +((r.top + r.height/2 - inner.top) / inner.height).toFixed(3),
               /* EL MANDO YA NO CUELGA DE LA PIEDRA. Estuvo dentro de su
                  .piedra-sitio mientras fueron tres botones; con trece formas
                  y seis colores la parrilla se salía de la pantalla por abajo
                  sin nada a qué recortarla, así que se mudó a la escena. */
               mando: !!(m && m.classList.contains('visible')) };
    };
    /* El mando, medido: qué enseña y si cabe donde se le puso. */
    window.__elMando = () => {
      const m = document.getElementById('piedraMando');
      const st = document.querySelector('.stage').getBoundingClientRect();
      const r = m.getBoundingClientRect();
      return { visible: m.classList.contains('visible'),
               formas: m.querySelectorAll('[data-piedra-forma]').length,
               tintas: m.querySelectorAll('[data-piedra-color]').length,
               marcada: (m.querySelector('.pm-forma.on') || {}).dataset &&
                        m.querySelector('.pm-forma.on').dataset.piedraForma,
               tinta: (m.querySelector('.pm-tinta.on') || {}).dataset &&
                      m.querySelector('.pm-tinta.on').dataset.piedraColor,
               contador: (m.querySelector('.pm-tam') || {}).textContent,
               campo: !!m.querySelector('[data-piedra-nombre]'),
               cabe: r.top >= st.top - 1 && r.bottom <= st.bottom + 1 &&
                     r.left >= st.left - 1 && r.right <= st.right + 1 };
    };
    /* Pasar hoja por el filo, que es como se pasa de verdad. */
    window.__pasar = async (lado) => {
      const e = document.getElementById(lado === 'left' ? 'edgeL' : 'edgeR');
      const r = e.getBoundingClientRect();
      const op = { bubbles:true, pointerId: ++window.__pid, pointerType:'touch',
                   isPrimary:true, clientX: r.left + r.width/2, clientY: 420 };
      e.dispatchEvent(new PointerEvent('pointerdown', op));
      await window.__pausa(60);
      e.dispatchEvent(new PointerEvent('pointerup', op));
      await window.__pausa(1800);
    };
  });
}

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  await andamio(p);

  /* ---------------------------------------------------------------- */
  titulo('poner una piedra');
  const puesta = await p.evaluate(async () => {
    const antes = window.__guardadas().length;
    await window.__toque('#btnHistorial');
    await window.__pausa(600);
    const b = document.querySelector('[data-piedra-nueva]');
    if (!b) return { falta:'no hay botón' };
    const rotulo = b.textContent.trim();
    await window.__toque(b);
    await window.__pausa(900);
    return { antes, rotulo, guardadas: window.__guardadas(),
             rastro: document.getElementById('historial').classList.contains('visible'),
             piedra: window.__laPiedra(), mando: window.__elMando() };
  });
  di('al poner', puesta.piedra);
  vale('el rastro trae el botón, y dice lo que deja',
       puesta.rotulo === 'piedra', puesta.falta || puesta.rotulo);
  vale('deja una guardada', (puesta.guardadas || []).length === puesta.antes + 1,
       (puesta.guardadas || []).length);
  /* ANCLADA A UN VERSÍCULO Y NO A UN NÚMERO DE HOJA: las hojas se rehacen al
     cambiar la letra o la versión, y «la hoja 7» deja de contener lo que
     contenía. Se guarda el versículo y el sitio en fracciones del papel. */
  vale('ANCLADA A UN VERSÍCULO, no a una hoja',
       !!(puesta.guardadas || [])[0] && puesta.guardadas[0].libro === 'MAT' &&
       Number.isFinite(puesta.guardadas[0].cap) &&
       Number.isFinite(puesta.guardadas[0].vers), puesta.guardadas && puesta.guardadas[0]);
  vale('y con el sitio en fracciones, no en píxeles',
       !!(puesta.guardadas || [])[0] && puesta.guardadas[0].x > 0 &&
       puesta.guardadas[0].x <= 1 && puesta.guardadas[0].y > 0 && puesta.guardadas[0].y <= 1,
       puesta.guardadas && (puesta.guardadas[0].x + ',' + puesta.guardadas[0].y));
  vale('se ve en la hoja', !!puesta.piedra, puesta.piedra);
  /* NACE EN EDICIÓN, y eso es media explicación de cómo funciona: aparece con
     su mando puesto, así que se ve de entrada que se puede mover y cambiar. */
  vale('y NACE EN EDICIÓN, con su mando',
       !!puesta.piedra && puesta.piedra.editando === true && puesta.piedra.mando === true,
       puesta.piedra);
  vale('el rastro se cierra al ponerla', puesta.rastro === false);
  /* Y NACE CON SU COLOR ESCRITO, aunque sea el de por defecto. Se pintaba bien
     sin la clave —tintaDe(undefined) devuelve el primero— pero la paleta del
     mando compara contra x.color y no marcaba ninguna mancha: la piedra se
     veía sepia y las seis decían aria-pressed="false", así que quien la
     acababa de poner no tenía manera de saber en qué color estaba. Duraba
     hasta recolorearla o hasta recargar. Se comprueba en la PALETA y no en el
     almacén, que es donde se veía. Lo levantó Codex. */
  vale('y la paleta ya marca su color', puesta.mando.tinta === 'sepia',
       puesta.mando.tinta);
  vale('que es el mismo que se guarda',
       (puesta.guardadas || [])[0] && puesta.guardadas[0].color === 'sepia',
       puesta.guardadas && puesta.guardadas[0].color);

  /* ---------------------------------------------------------------- */
  titulo('un toque cambia la forma, un arrastre la mueve');
  const gesto = await p.evaluate(async () => {
    const cuerpo = () => document.querySelector('.piedra');
    const gesto = async (dx, dy, id) => {
      const b = cuerpo();
      const r = b.getBoundingClientRect();
      const x = r.left + r.width/2, y = r.top + r.height/2;
      const ev = (t, ax, ay) => b.dispatchEvent(new PointerEvent(t,
        { bubbles:true, cancelable:true, pointerId:id, pointerType:'touch',
          isPrimary:true, clientX:ax, clientY:ay }));
      ev('pointerdown', x, y);
      /* Torcido, como un dedo: una recta perfecta no existe. */
      if (dx || dy){
        ev('pointermove', x + dx*.3, y + dy*.35);
        ev('pointermove', x + dx*.7, y + dy*.6);
      }
      ev('pointermove', x + dx, y + dy);
      ev('pointerup', x + dx, y + dy);
      await window.__pausa(320);
    };
    const antes = window.__laPiedra();
    /* Dos píxeles es temblor, no arrastre: tiene que contar como toque. */
    await gesto(2, -1, 71);
    const traToque = window.__laPiedra();
    await gesto(0, 0, 72);
    const traOtro = window.__laPiedra();
    await gesto(-61, 52, 73);
    return { antes, traToque, traOtro, traArrastre: window.__laPiedra(),
             guardada: window.__guardadas()[0] };
  });
  di('tres formas seguidas', [gesto.antes.forma, gesto.traToque.forma, gesto.traOtro.forma]);
  vale('un toque da la siguiente forma', gesto.traToque.forma !== gesto.antes.forma,
       gesto.antes.forma + ' → ' + gesto.traToque.forma);
  vale('y otro toque, otra', gesto.traOtro.forma !== gesto.traToque.forma,
       gesto.traToque.forma + ' → ' + gesto.traOtro.forma);
  vale('las tres son distintas',
       new Set([gesto.antes.forma, gesto.traToque.forma, gesto.traOtro.forma]).size === 3);
  vale('ARRASTRARLA LA MUEVE',
       Math.abs(gesto.traArrastre.fx - gesto.traOtro.fx) > .02 ||
       Math.abs(gesto.traArrastre.fy - gesto.traOtro.fy) > .02,
       gesto.traOtro.fx + ',' + gesto.traOtro.fy + '  →  ' +
       gesto.traArrastre.fx + ',' + gesto.traArrastre.fy);
  /* La otra mitad, y la que se pierde en silencio: arrastrar NO puede además
     cambiarle la forma. Los dos gestos empiezan igual. */
  vale('y el arrastre no le cambia la forma',
       gesto.traArrastre.forma === gesto.traOtro.forma, gesto.traArrastre.forma);
  vale('lo movido queda guardado', gesto.guardada &&
       Math.abs(gesto.guardada.x - gesto.traArrastre.fx) < .02,
       gesto.guardada && gesto.guardada.x);

  /* ---------------------------------------------------------------- */
  titulo('el tamaño: de una mota a media hoja');
  /* LA PROMESA QUE SE MIDE AQUÍ NO ES «CRECE», ES CUÁNTO. Lo que se pidió fue
     que se vieran DE LEJOS, con la vista alejada puesta, y eso es un salto de
     grado: por lo menos diez veces lo que medían. Comprobar solo que «más» la
     agranda dejaría pasar una escala que crece de 22 a 30 px, que es
     exactamente la que había y la que no servía.

     Y se mide en FRACCIÓN DEL PAPEL y no en píxeles, que es lo que la
     aplicación promete: los píxeles cambian con la pantalla —571 en una de
     320, 663 en una de 412— y una prueba escrita en píxeles diría cosas
     distintas en cada aparato. Se sube y se baja a golpe de botón hasta el
     tope, sin contar los escalones: cuántos haya es cosa de la aplicación. */
  const tam = await p.evaluate(async () => {
    const b = cual => document.querySelector('[data-piedra-acc="' + cual + '"]');
    const hastaElTope = async (cual) => {
      for (let i = 0; i < 20 && !b(cual).disabled; i++){
        await window.__toque(b(cual)); await window.__pausa(120);
      }
      await window.__pausa(200);
      return window.__laPiedra();
    };
    const antes = window.__laPiedra();
    const arriba = await hastaElTope('mas');
    const techo = { parte: arriba.parte, lado: arriba.lado,
                    apagado: !!b('mas').disabled,
                    contador: window.__elMando().contador,
                    cabeElMando: window.__elMando().cabe };
    const abajo = await hastaElTope('menos');
    const suelo = { parte: abajo.parte, lado: abajo.lado,
                    apagado: !!b('menos').disabled };
    /* Y de vuelta a un tamaño de trabajo, que lo que sigue se toca con el dedo. */
    await window.__toque(b('mas')); await window.__pausa(120);
    await window.__toque(b('mas')); await window.__pausa(250);
    return { antes: antes.parte, techo, suelo, guardado: window.__guardadas()[0].tam };
  });
  di('el suelo', tam.suelo);
  di('el techo', tam.techo);
  vale('«más» la agranda', tam.techo.parte > tam.antes,
       tam.antes + ' → ' + tam.techo.parte + ' del papel');
  vale('«menos» la encoge', tam.suelo.parte < tam.techo.parte,
       tam.techo.parte + ' → ' + tam.suelo.parte);
  /* Diez veces es el número que se pidió, y el que separa «un adorno» de «algo
     que se ve con la hoja alejada». Se comprueba contra el suelo, no contra el
     tamaño de salida, que es el escalón que la aplicación elija poner. */
  vale('EL TECHO ES DIEZ VECES EL SUELO, por lo menos',
       tam.techo.parte >= tam.suelo.parte * 10,
       tam.suelo.parte + ' → ' + tam.techo.parte + '  (x' +
       (tam.techo.parte / tam.suelo.parte).toFixed(1) + ')');
  /* Y en absoluto: media hoja. Es lo que la hace visible de lejos; una piedra
     del 10% del papel encogida al 58% del zoom vuelve a ser una mota. */
  vale('y arriba ocupa media hoja o más', tam.techo.parte >= .5,
       tam.techo.parte + ' del ancho  ·  ' + tam.techo.lado + ' px');
  vale('en los dos extremos el botón se apaga',
       tam.techo.apagado === true && tam.suelo.apagado === true,
       'techo: ' + tam.techo.apagado + '  suelo: ' + tam.suelo.apagado);
  /* EL MANDO SIGUE CABIENDO CON LA PIEDRA ENORME, que es justo por lo que se
     mudó fuera del papel: colgado de una piedra de 560 px se salía por abajo
     de la pantalla y no había manera de volver a él. */
  vale('y el mando sigue cabiendo en la escena', tam.techo.cabeElMando === true);
  vale('el contador dice en qué escalón va', /^\d+\/\d+$/.test(tam.techo.contador || ''),
       tam.techo.contador);
  vale('y el escalón queda guardado', Number.isInteger(tam.guardado), tam.guardado);

  /* ---------------------------------------------------------------- */
  /* LAS TRES COSAS QUE SE PIDIERON DESPUÉS DE VER LAS TRES PRIMERAS PIEDRAS:
     muchas más figuras, color, y un texto en cada una. Las tres viven en el
     mismo panel, así que se prueban seguidas. */
  titulo('el mando: figuras, color y nombre');
  const mando = await p.evaluate(async () => {
    const m0 = window.__elMando();
    /* LA FORMA SE ELIGE DE LA PARRILLA. Tocar la piedra sigue dando la
       siguiente, pero con trece figuras eso solo sirve para curiosear: llegar
       a la barca a base de toques son doce. */
    await window.__toque('[data-piedra-forma="barca"]'); await window.__pausa(300);
    const traForma = { piedra: window.__laPiedra(), mando: window.__elMando() };
    await window.__toque('[data-piedra-color="carmin"]'); await window.__pausa(300);
    const traColor = { piedra: window.__laPiedra(), mando: window.__elMando() };
    /* EL NOMBRE ES UN NOMBRE, NO UNA NOTA: cabe debajo de la figura y para
       escribir de verdad están las glosas. Intro lo guarda y suelta el campo. */
    const campo = document.querySelector('[data-piedra-nombre]');
    campo.focus();
    campo.value = 'lo del monte';
    campo.dispatchEvent(new KeyboardEvent('keydown',
      { key:'Enter', bubbles:true, cancelable:true }));
    await window.__pausa(350);
    const traNombre = window.__laPiedra();
    return { m0, traForma, traColor, traNombre, guardada: window.__guardadas()[0] };
  });
  di('el mando al abrirse', mando.m0);
  di('la piedra al final', mando.traNombre);
  vale('el mando enseña DIEZ FIGURAS O MÁS', mando.m0.formas >= 10, mando.m0.formas);
  vale('y una paleta de colores', mando.m0.tintas >= 4, mando.m0.tintas);
  vale('y el campo del nombre', mando.m0.campo === true);
  vale('y cabe entero en la escena', mando.m0.cabe === true);

  vale('elegir una figura de la parrilla la cambia',
       mando.traForma.piedra.forma === 'barca', mando.traForma.piedra.forma);
  vale('y la parrilla marca cuál está puesta',
       mando.traForma.mando.marcada === 'barca', mando.traForma.mando.marcada);
  /* El color se mide en la pantalla y no en el almacén: guardarlo y no
     pintarlo es exactamente el fallo que esto vigila. */
  vale('EL COLOR SE CAMBIA Y SE VE',
       mando.traColor.piedra.color === 'rgb(155, 42, 42)', mando.traColor.piedra.color);
  vale('y la paleta marca cuál está puesto',
       mando.traColor.mando.tinta === 'carmin', mando.traColor.mando.tinta);
  vale('EL NOMBRE SE ESCRIBE Y SE LEE EN LA HOJA',
       mando.traNombre.nombre === 'lo del monte', mando.traNombre.nombre);
  vale('la figura, el color y el nombre quedan guardados',
       mando.guardada.forma === 'barca' && mando.guardada.color === 'carmin' &&
       mando.guardada.nombre === 'lo del monte', mando.guardada);
  /* Y EL RÓTULO HABLADO LO DICE TODO. Quien no ve la piedra tiene ahí su única
     descripción: sin el color y el nombre, trece figuras de seis colores son
     trece rótulos repetidos. */
  /* Y VIVE FUERA DEL PAPEL. Es la razón entera de la mudanza: dentro de la
     hoja lo recorta la columna de glosas y lo empuja fuera de la pantalla la
     piedra grande, y un panel recortado no sirve de nada. Se comprueba por
     dónde cuelga y no por dónde se ve, que verse puede verse por casualidad. */
  const fuera = await p.evaluate(() =>
    !document.getElementById('pg').contains(document.getElementById('piedraMando')));
  vale('EL MANDO CUELGA DE LA ESCENA, no del papel', fuera === true);
  const voz = await p.evaluate(() =>
    document.querySelector('.piedra').getAttribute('aria-label'));
  di('el rótulo hablado', voz);
  vale('el rótulo hablado dice figura, color y nombre',
       /barca/.test(voz) && /carm/.test(voz) && /lo del monte/.test(voz), voz);

  /* ---------------------------------------------------------------- */
  titulo('el modo edición se abre con dos toques y se cierra tocando fuera');
  const modo = await p.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await window.__pausa(400);
    const traEscape = window.__editando();
    /* QUIETA, UN TOQUE NO HACE NADA. Es lo que la deja convivir con la hoja:
       si un toque simple abriera la edición, tocar cerca del texto sería
       abrirla sin querer. */
    await window.__toque('.piedra'); await window.__pausa(350);
    const traToqueSimple = window.__editando();
    /* CON COORDENADAS, que un doble toque de verdad las lleva. Y aquí hacen
       falta de verdad: la piedra quieta no recibe eventos —para no crear un
       agujero muerto sobre el texto— así que el doble toque se caza midiendo
       el PUNTO contra su rectángulo, igual que hace la cinta. Sin clientX/Y el
       evento llega a 0,0 y no cae sobre ninguna piedra. */
    const rp = document.querySelector('.piedra').getBoundingClientRect();
    document.querySelector('.piedra').dispatchEvent(new MouseEvent('dblclick',
      { bubbles:true, cancelable:true, detail:2,
        clientX: rp.left + rp.width/2, clientY: rp.top + rp.height/2 }));
    await window.__pausa(350);
    const traDoble = window.__editando();
    const papel = document.getElementById('pgBody').getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, pointerId:88, pointerType:'touch', isPrimary:true,
        clientX: Math.round(papel.left + 20), clientY: Math.round(papel.top + 20) }));
    await window.__pausa(350);
    return { traEscape, traToqueSimple, traDoble, traFuera: window.__editando() };
  });
  di('el modo edición', modo);
  vale('Escape la cierra', modo.traEscape === false);
  vale('QUIETA, UN TOQUE NO LA ABRE', modo.traToqueSimple === false);
  vale('el doble toque sí', modo.traDoble === true);
  vale('y un toque en el papel la cierra', modo.traFuera === false);

  /* ---------------------------------------------------------------- */
  titulo('se queda en SU hoja: es toda la diferencia con la cinta');
  const hojas = await p.evaluate(async () => {
    const aqui = window.__hoja();
    await window.__pasar('right');
    const otra = { hoja: window.__hoja(), hay: window.__hayPiedra() };
    await window.__pasar('left');
    return { aqui, otra, devuelta: { hoja: window.__hoja(), hay: window.__hayPiedra() } };
  });
  di('al pasar hoja', hojas.aqui + '  →  ' + hojas.otra.hoja + '  →  ' + hojas.devuelta.hoja);
  vale('en la hoja siguiente NO está', hojas.otra.hay === false, hojas.otra);
  vale('y al volver sigue donde estaba',
       hojas.devuelta.hay === true && hojas.devuelta.hoja === hojas.aqui, hojas.devuelta);

  /* ---------------------------------------------------------------- */
  titulo('lo guardado sobrevive a recargar');
  await p.reload();
  await p.waitForTimeout(3200);
  await andamio(p);
  const tras = await p.evaluate(() => ({
    hay: window.__hayPiedra(), guardadas: window.__guardadas().length,
    editando: window.__editando(), piedra: window.__laPiedra() }));
  di('tras recargar', tras.piedra);
  vale('sigue puesta', tras.hay === true && tras.guardadas === 1, tras.guardadas);
  /* Y NO vuelve en edición: nace así al ponerla, que es cuando hace falta
     explicarla, no cada vez que se abre el libro. */
  vale('y no vuelve en modo edición', tras.editando === false);

  /* ---------------------------------------------------------------- */
  titulo('la lista de piedras, desde el pie del rastro');
  const lista = await p.evaluate(async () => {
    await window.__toque('#btnHistorial'); await window.__pausa(600);
    const b = document.querySelector('[data-piedra-lista]');
    if (!b) return { falta:true };
    const rotulo = b.textContent.trim();
    await window.__toque(b); await window.__pausa(700);
    const m = document.getElementById('piedraMenu');
    const st = document.querySelector('.stage').getBoundingClientRect();
    const r = m.getBoundingClientRect();
    return { rotulo, visible: m.classList.contains('visible'),
             filas: m.querySelectorAll('[data-piedra-ir]').length,
             dice: (m.querySelector('.sp-ref') || {}).textContent,
             rastro: document.getElementById('historial').classList.contains('visible'),
             cabe: r.top >= st.top - 1 && r.bottom <= st.bottom + 1 &&
                   r.left >= st.left - 1 && r.right <= st.right + 1 };
  });
  di('la lista', lista);
  vale('el pie trae su puerta', lista.rotulo === 'piedras', lista.falta || lista.rotulo);
  vale('y abre la lista', lista.visible === true);
  vale('con su fila y su referencia',
       lista.filas === 1 && /\d+:\d+/.test(lista.dice || ''), lista.dice);
  /* Igual que la de cintas: el rastro se queda detrás, que cerrarlo era
     demasiada carga visual de golpe. */
  vale('el rastro se queda abierto detrás', lista.rastro === true);
  vale('y cabe entera en la escena', lista.cabe === true);

  const quitada = await p.evaluate(async () => {
    await window.__toque('[data-piedra-quitar]'); await window.__pausa(600);
    return { guardadas: window.__guardadas().length, hay: window.__hayPiedra() };
  });
  di('al quitarla', quitada);
  vale('la equis la quita de la hoja y del almacén',
       quitada.guardadas === 0 && quitada.hay === false, quitada);

  await cerrarParcial(sesion, 'la piedra sola');

  /* ================================================================
     QUE NO ESTORBE, que es lo que rompería la aplicación entera por un
     adorno. La piedra vive encima del papel, y el papel es donde se
     selecciona texto, se abre una glosa y se pasa hoja. */
  const dos = await abrir();
  const q = dos.pagina;
  await q.evaluate(() => {
    const hoy = Date.now();
    localStorage.setItem('glossa:piedras:v1', JSON.stringify([
      { id:'q', libro:'MAT', cap:1, vers:1, x:.12, y:.85, forma:'hoja',
        tam:1, creado:hoy, tocado:hoy }]));
  });
  await q.reload();
  await q.waitForTimeout(3200);
  await andamio(q);

  titulo('con una piedra puesta, la hoja sigue haciendo lo suyo');
  const juntos = await q.evaluate(async () => {
    const hayPiedra = window.__hayPiedra();
    /* LA CAPA NO PUEDE COMERSE NADA. Cubre el papel entero para poder colocar
       por porcentaje, así que sin pointer-events:none se quedaría con la
       selección, el arrastre y el toque que abre una glosa. */
    const capa = document.getElementById('piedrero');
    const pasa = capa ? getComputedStyle(capa).pointerEvents : '(sin capa)';
    const antes = window.__hoja();
    await window.__pasar('right');
    const traPasar = window.__hoja();
    await window.__pasar('left');
    await window.__pausa(400);
    const nAntes = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length;
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
    const rg = document.createRange(); rg.setStart(n, 0); rg.setEnd(n, 15);
    getSelection().removeAllRanges(); getSelection().addRange(rg);
    const rc = rg.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX: Math.round(rc.left + 2), clientY: Math.round(rc.top + 2) }));
    await window.__pausa(500);
    const panel = getComputedStyle(document.getElementById('menu')).display !== 'none';
    const ta = document.getElementById('glosaCaja');
    if (ta){ ta.value = 'con piedra delante';
             ta.dispatchEvent(new Event('input', { bubbles:true })); }
    await window.__pausa(150);
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await window.__pausa(600);
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    return { hayPiedra, pasa, antes, traPasar, vuelta: window.__hoja(), panel,
             creo: g.length - nAntes, sigue: window.__hayPiedra() };
  });
  di('con la piedra delante', juntos);
  vale('la piedra está puesta', juntos.hayPiedra === true);
  vale('LA CAPA DEJA PASAR LOS TOQUES', juntos.pasa === 'none', juntos.pasa);
  vale('el filo sigue pasando hoja', juntos.traPasar !== juntos.antes,
       juntos.antes + '  →  ' + juntos.traPasar);
  vale('y el pliegue devuelve la hoja entera', juntos.vuelta === juntos.antes, juntos.vuelta);
  vale('la glosa se sigue abriendo al seleccionar', juntos.panel === true);
  vale('y se guarda', juntos.creo === 1, juntos.creo);
  vale('con la piedra todavía en su sitio', juntos.sigue === true);

  vale('con la piedra todavía en su sitio', juntos.sigue === true);

  /* ================================================================
     LOS CUATRO DE CODEX, y los cuatro se reprodujeron antes de arreglarlos.

     Son de la misma familia: una piedra es un botón encima del papel, y un
     botón encima del papel se lleva por delante cosas que no se ven hasta que
     alguien las busca. */
  titulo('una piedra quieta no crea un agujero muerto');
  const muerto = await q.evaluate(() => {
    const b = document.querySelector('.piedra');
    const r = b.getBoundingClientRect();
    /* JUSTO EN SU CENTRO: ¿quién recibiría el toque? Con pointer-events:auto
       era la piedra, y entonces el papel no se arrastraba, el texto no se
       seleccionaba y la glosa no se abría — a 54 px, un agujero muerto sobre
       la lectura. */
    const encima = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    return { pe: getComputedStyle(b).pointerEvents,
             esLaPiedra: !!(encima && encima.closest('.piedra-sitio')),
             quien: encima ? (encima.className || encima.tagName) : null };
  });
  di('en el centro de la piedra', muerto);
  vale('QUIETA NO RECIBE EL TOQUE', muerto.pe === 'none', muerto.pe);
  vale('y lo recibe lo que hay debajo', muerto.esLaPiedra === false, muerto.quien);

  titulo('con teclado se puede editar');
  const teclado = await q.evaluate(async () => {
    const b = document.querySelector('.piedra');
    b.focus();
    const conFoco = document.activeElement === b;
    /* Intro sobre un botón enfocado manda un CLIC, no un dblclick, y trae
       detail 0. Sin esto, quien navega sin puntero llegaba a la piedra, leía
       su rótulo y ahí se quedaba. */
    const intro = () => document.querySelector('.piedra')
      .dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, detail:0 }));
    intro();
    await window.__pausa(350);
    const edita = window.__editando();
    const forma1 = window.__laPiedra().forma;
    intro();                                   /* ya en edición: cambia la forma */
    await window.__pausa(350);
    const forma2 = window.__laPiedra().forma;
    /* Y las flechas la mueven, que es la otra mitad. */
    const antes = window.__laPiedra();
    const foco = document.activeElement;
    (foco || document).dispatchEvent(new KeyboardEvent('keydown',
      { key:'ArrowRight', bubbles:true, cancelable:true }));
    await window.__pausa(250);
    return { conFoco, edita, forma1, forma2, antes, despues: window.__laPiedra() };
  });
  di('con teclado', teclado);
  vale('el foco llega a la piedra', teclado.conFoco === true);
  vale('INTRO ABRE LA EDICIÓN', teclado.edita === true, teclado);
  vale('y otro Intro le cambia la forma', teclado.forma2 !== teclado.forma1,
       teclado.forma1 + ' → ' + teclado.forma2);
  vale('las flechas la mueven', teclado.despues.fx > teclado.antes.fx,
       teclado.antes.fx + ' → ' + teclado.despues.fx);

  titulo('la recién puesta queda ENCIMA de la que ya estaba');
  const encima = await q.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await window.__pausa(400);
    await window.__toque('#btnHistorial'); await window.__pausa(600);
    await window.__toque('[data-piedra-nueva]'); await window.__pausa(900);
    const sitios = [...document.querySelectorAll('.piedra-sitio')];
    const nueva = sitios.find(e => e.classList.contains('editando'));
    if (!nueva || sitios.length < 2) return { sitios: sitios.length };
    const r = nueva.querySelector('.piedra').getBoundingClientRect();
    const quien = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    const suya = quien && quien.closest('.piedra-sitio');
    return { sitios: sitios.length, laNueva: nueva.dataset.piedra,
             recibe: suya ? suya.dataset.piedra : null,
             /* Y no nacen una encima de otra: se corren en diagonal. */
             sitiosDistintos: new Set(sitios.map(e => e.style.left + ',' + e.style.top)).size };
  });
  di('dos piedras', encima);
  vale('hay dos', encima.sitios === 2, encima.sitios);
  /* Cada .piedra-sitio es su propio contexto de apilado, así que mandaba la
     última pintada: la nueva quedaba DEBAJO de la vieja y no había manera de
     moverla sin mover antes la otra. */
  vale('LA NUEVA RECIBE SU PROPIO TOQUE', encima.recibe === encima.laNueva,
       'la toca ' + encima.recibe + ', la nueva es ' + encima.laNueva);
  vale('y no nacen en el mismo punto', encima.sitiosDistintos === 2, encima.sitiosDistintos);

  await cerrar(dos);

  /* ================================================================
     LA PIEDRA VIAJA EN LA FOTO DEL PLIEGUE.

     El pliegue esconde la hoja viva y enseña un retrato hecho aparte, así que
     lo que no esté en él DESAPARECE durante el giro y vuelve de golpe al
     aterrizar. Una piedra que parpadea en cada vuelta no parece pegada al
     papel, parece un fallo.

     Se mide contando la tinta de la piedra en el LIENZO, y solo en el cuadro
     donde cae: en el lienzo entero su tinta se pierde entre la de la letra
     —773 píxeles sobre 11.850, un 6%— y eso no distingue nada. En su cuadro sí:
     medido, 801 sin ella y 1.642 con ella, y las dos cifras se repiten clavadas
     entre vueltas. Sin el arreglo daba 801 contra 801, o sea que no estaba. */
  titulo('la piedra viaja en la foto del pliegue');
  /* `retocar` corre con la hoja ya puesta y la foto ya hecha, justo antes de
     voltear: es lo único que distingue una piedra que nació así de una que se
     acaba de cambiar, y ahí es donde vive el fallo de la foto caducada. */
  const tinta = async (sembrar, rgb, retocar) => {
    const ses = await abrir();
    const w = ses.pagina;
    await w.evaluate(sembrar);
    await w.reload();
    await w.waitForTimeout(3200);
    if (retocar){ await w.evaluate(retocar); await w.waitForTimeout(900); }
    const n = await w.evaluate(async (rgb) => {
      const pausa = ms => new Promise(z => setTimeout(z, ms));
      const e = document.getElementById('edgeR');
      const r = e.getBoundingClientRect();
      const op = { bubbles:true, pointerId:611, pointerType:'touch', isPrimary:true,
                   clientX: r.left + r.width/2, clientY: 420 };
      e.dispatchEvent(new PointerEvent('pointerdown', op));
      await pausa(60);
      e.dispatchEvent(new PointerEvent('pointerup', op));
      await pausa(320);                       /* a media vuelta */
      const fx = document.getElementById('fx');
      const g = fx.getContext('2d', { willReadFrequently:true });
      const cx = Math.round(fx.width * .18), cy = Math.round(fx.height * .30);
      const lado = 130;
      const x0 = Math.max(0, cx - lado/2), y0 = Math.max(0, cy - lado/2);
      const d = g.getImageData(x0, y0, Math.min(lado, fx.width - x0),
                                       Math.min(lado, fx.height - y0)).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4){
        if (d[i+3] < 40) continue;
        if (Math.abs(d[i]-rgb[0]) < 34 && Math.abs(d[i+1]-rgb[1]) < 30 &&
            Math.abs(d[i+2]-rgb[2]) < 30) n++;
      }
      await pausa(1600);
      return n;
    }, rgb);
    await cerrar(ses);
    return n;
  };
  const SEPIA = [140, 121, 79], CARMIN = [155, 42, 42];
  const sinPiedra = await tinta(() => localStorage.removeItem('glossa:piedras:v1'), SEPIA);
  const conPiedra = await tinta(() => {
    const hoy = Date.now();
    localStorage.setItem('glossa:piedras:v1', JSON.stringify([
      { id:'g', libro:'MAT', cap:1, vers:1, x:.18, y:.30, forma:'piedra',
        tam:3, creado:hoy, tocado:hoy }]));
  }, SEPIA);
  di('tinta de piedra en el lienzo', 'sin: ' + sinPiedra + '  ·  con: ' + conPiedra);
  vale('sin piedra hay tinta de la letra, y poca', sinPiedra > 0, sinPiedra);
  vale('LA PIEDRA ESTÁ EN LA FOTO', conPiedra > sinPiedra + 300,
       sinPiedra + ' → ' + conPiedra + ' píxeles');
  /* Y CON SU PROPIO COLOR, que es un fallo aparte y silencioso: la foto llevó
     una tinta fija para todas mientras no hubo colores, y con seis, la piedra
     carmín de la hoja salía sepia durante el giro y volvía a carmín al
     aterrizar. No se ve mirando: hay que contar el rojo. Se cuenta el CARMÍN,
     que en la hoja no existe —la letra es sepia y el papel es hueso— así que
     cualquier cantidad apreciable solo puede venir de la piedra. */
  const carmin = await tinta(() => {
    const hoy = Date.now();
    localStorage.setItem('glossa:piedras:v1', JSON.stringify([
      { id:'c', libro:'MAT', cap:1, vers:1, x:.18, y:.30, forma:'piedra',
        tam:3, color:'carmin', creado:hoy, tocado:hoy }]));
  }, CARMIN);
  const sinCarmin = await tinta(() => localStorage.removeItem('glossa:piedras:v1'), CARMIN);
  di('tinta carmín en el lienzo', 'sin: ' + sinCarmin + '  ·  con: ' + carmin);
  vale('Y VIAJA CON SU COLOR, no con el de la tinta',
       carmin > sinCarmin + 300, sinCarmin + ' → ' + carmin + ' píxeles');

  /* LA FOTO CADUCA AL TOCAR LA PIEDRA, Y ESTO NO LO PILLABA LO DE ARRIBA.

     Ahí la piedra nace ya carmín: la foto se hace después de cargar y sale
     bien sin que nadie invalide nada. El fallo aparece cuando la foto YA
     ESTÁ HECHA y entonces se cambia la piedra, que es lo normal —la pones, la
     retocas, pasas de hoja—. La foto no se rehace sola: lo que decide si la
     guardada sirve es estiloFirma(), y ahí no hay ni una piedra. Así que la
     vuelta siguiente enseñaba la foto vieja y la piedra cambiaba de color al
     empezar el giro para volver al suyo al aterrizar.

     Reproducido antes de arreglarlo: la hoja viva en carmín y el lienzo con
     CERO píxeles de carmín y 18.781 de sepia. Después del arreglo, 600 de
     carmín en el cuadro, la misma cifra clavada entre vueltas, y sin piedra
     el cuadro da 0 —el carmín no existe en la hoja, que es sepia sobre hueso—
     así que el margen de 300 va al doble de holgura sobre un fondo de cero.
     El tamaño 4 y no el 3 porque el 3 da 192, demasiado cerca del margen.
     Lo levantó Codex. */
  const traRetocar = await tinta(() => {
    const hoy = Date.now();
    localStorage.setItem('glossa:piedras:v1', JSON.stringify([
      { id:'t', libro:'MAT', cap:1, vers:1, x:.18, y:.30, forma:'piedra',
        tam:4, color:'sepia', creado:hoy, tocado:hoy }]));
  }, CARMIN, async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    /* Con coordenadas: la piedra quieta no recibe eventos y el doble toque se
       caza midiendo el punto (ver piedraEnPunto). */
    const b = document.querySelector('.piedra');
    const r = b.getBoundingClientRect();
    b.dispatchEvent(new MouseEvent('dblclick', { bubbles:true, cancelable:true, detail:2,
      clientX: r.left + r.width/2, clientY: r.top + r.height/2 }));
    await pausa(400);
    const chip = document.querySelector('[data-piedra-color="carmin"]');
    const c = chip.getBoundingClientRect();
    const op = { bubbles:true, cancelable:true, pointerId:771, pointerType:'touch',
                 isPrimary:true, clientX: c.left + c.width/2, clientY: c.top + c.height/2 };
    chip.dispatchEvent(new PointerEvent('pointerdown', op));
    await pausa(40);
    chip.dispatchEvent(new PointerEvent('pointerup', op));
    chip.dispatchEvent(new MouseEvent('click', Object.assign({ detail:1 }, op)));
    await pausa(300);
    /* Y se cierra la edición, que es como se llega a pasar hoja de verdad. */
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, pointerId:772, pointerType:'touch', isPrimary:true,
        clientX:60, clientY:600 }));
    await pausa(300);
  });
  di('carmín tras retocarla en vivo', traRetocar);
  vale('LA FOTO CADUCA AL RETOCAR LA PIEDRA, no enseña la de antes',
       traRetocar > sinCarmin + 300, sinCarmin + ' → ' + traRetocar + ' píxeles');
})();
