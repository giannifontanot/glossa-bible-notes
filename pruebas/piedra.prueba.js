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
const { abrir, cerrar, cerrarParcial, fin, di, vale, titulo } = require('./comun');

const LLAVE = 'glossa:piedras:v1';

async function andamio(p){
  await p.evaluate(() => {
    window.__pid = 900;
    window.__pausa = ms => new Promise(z => setTimeout(z, ms));
    /* ABRIR LA VENTANITA DE UNA FILA. El lápiz de cada fila se fue —entre él y
       la equis le dejaban al nombre setenta píxeles en un teléfono— y lo que
       hacía se pide ahora con DOBLE toque sobre la fila. Se envuelve aquí para
       que las quince llamadas de este fichero no repitan el gesto. */
    window.__abrirFila = async (id) => {
      const f = document.querySelector('[data-piedra-ir="' + id + '"]');
      if (!f) return false;
      const r = f.getBoundingClientRect();
      f.dispatchEvent(new MouseEvent('dblclick', { bubbles:true, cancelable:true,
        detail:2, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }));
      await window.__pausa(420);
      return !!document.querySelector('[data-piedra-nombre="' + id + '"]');
    };
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
    /* PONER UNA PIEDRA SON DOS PASOS DESDE QUE EL BOTÓN SE MUDÓ: vivía en el
       renglón del rastro y ahora vive DENTRO de la lista de piedras, que es
       donde se está mirando las que hay. El camino de verdad es abrir el
       rastro, abrir la lista, y ahí pedirla. */
    window.__nuevaPiedra = async () => {
      if (!document.getElementById('historial').classList.contains('visible')){
        await window.__toque('#btnHistorial'); await window.__pausa(600);
      }
      if (!document.getElementById('piedraMenu').classList.contains('visible')){
        await window.__toque('[data-piedra-lista]'); await window.__pausa(700);
      }
      const b = document.querySelector('#piedraMenu [data-piedra-nueva]');
      if (!b) return null;
      window.__vozNueva = b.getAttribute('aria-label') || '';
      const rotulo = b.textContent.trim();
      await window.__toque(b);
      await window.__pausa(900);
      return rotulo;
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
               /* EL NOMBRE NO SE PINTA EN LA HOJA y se sigue mirando aquí, a
                  propósito, esperando el null: una piedra es una marca en el
                  papel y no una etiqueta, y varias con rótulo se convertían en
                  una lista desperdigada sobre el texto. El nombre vive en la
                  lista. Si vuelve a la hoja, esto lo dice. */
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
               hayCinta: !!m.querySelector('[data-piedra-forma="cinta"]'),
               tintas: m.querySelectorAll('[data-piedra-color]').length,
               marcada: (m.querySelector('.pm-forma.on') || {}).dataset &&
                        m.querySelector('.pm-forma.on').dataset.piedraForma,
               tinta: (m.querySelector('.pm-tinta.on') || {}).dataset &&
                      m.querySelector('.pm-tinta.on').dataset.piedraColor,
               contador: (m.querySelector('.pm-tam') || {}).textContent,
               campo: !!m.querySelector('[data-piedra-nombre]'),
               /* EL ASPA Y LOS DOS DE TAMAÑO, medidos. Ver el bloque «la
                  salida y los dos botones que más se tocan». */
               aspa: (() => { const x = m.querySelector('[data-sp-cerrar]');
                 if (!x) return null;
                 const rx = x.getBoundingClientRect();
                 return { arriba: Math.round(rx.top - r.top),
                          derecha: Math.round(r.right - rx.right),
                          lado: Math.round(rx.width) }; })(),
               quitar: !!m.querySelector('[data-piedra-acc="quitar"]'),
               tamanos: [...m.querySelectorAll('.pm-btn')].map(b => {
                 const rb = b.getBoundingClientRect();
                 return { acc: b.dataset.piedraAcc, lado: Math.round(rb.width),
                          alto: Math.round(rb.height),
                          centro: Math.round(rb.left + rb.width/2) }; }),
               piePie: (() => { const pie = m.querySelector('.pm-pie');
                 if (!pie) return null;
                 const rp = pie.getBoundingClientRect();
                 return { centro: Math.round(rp.left + rp.width/2) }; })(),
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
    const rotulo = await window.__nuevaPiedra();
    if (rotulo === null) return { falta:'no hay botón' };
    return { antes, rotulo, voz: window.__vozNueva || '',
             guardadas: window.__guardadas(),
             rastro: document.getElementById('historial').classList.contains('visible'),
             lista: document.getElementById('piedraMenu').classList.contains('visible'),
             piedra: window.__laPiedra(), mando: window.__elMando() };
  });
  di('al poner', puesta.piedra);
  /* EL BOTÓN VIVE DENTRO DE LA LISTA DE PIEDRAS, no en el renglón del rastro.
     Estuvo allí, al lado del paso atrás, y el renglón decía dos cosas a la
     vez: «vuelve por donde viniste» y «deja algo aquí». Poner una piedra y ver
     tus piedras son el mismo asunto y estaban en dos sitios distintos. */
  /* EL RÓTULO VISIBLE DICE «NUEVA» Y LA FIGURA DICE EL RESTO. Aquí se exigía
     que dijera «piedra» y «aquí», de cuando el botón era una banda del ancho
     entero con «+ ▮ nueva piedra aquí» escrito. Se pidió que fuese un botón y
     que dijera solo «Nueva» con su figurita, así que lo que hay que vigilar
     cambia de sitio: la palabra corta arriba, y lo que deja y dónde en el
     rótulo HABLADO, que es el que tiene que seguir diciéndolo entero porque
     ahí no hay figura que mirar. Vigilar los dos es lo que impide que
     acortando el visible se acorte también el otro. */
  vale('la lista trae el botón, y dice «Nueva»',
       (puesta.rotulo || '').trim() === 'Nueva', puesta.falta || puesta.rotulo);
  vale('  y el rótulo hablado sí dice lo que deja y dónde',
       /piedra/i.test(puesta.voz || '') && /hoja/i.test(puesta.voz || ''),
       puesta.voz);
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
  /* Y AL PONERLA SE CIERRA TODO: acabas de dejar algo en la hoja y lo que hay
     que ver es la hoja, no la lista de la que saliste. */
  vale('el rastro se cierra al ponerla', puesta.rastro === false);
  vale('  y la lista también', puesta.lista === false);
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
    /* AQUÍ SE ESCRIBÍA EL NOMBRE, Y EL CAMPO SE FUE DEL MANDO. Su razón era
       buena —nombrar la que tienes delante sin ir a buscarla— pero el nombre
       dejó de pintarse sobre la hoja, así que escribirlo aquí era escribir a
       ciegas: se teclea al lado de la figura y no pasa nada visible. Se nombra
       en la LISTA, con doble toque en su fila, que es donde el nombre se lee.
       Lo que quedaba de este bloque —forma y color— sigue igual. */
    return { m0, traForma, traColor, guardada: window.__guardadas()[0] };
  });
  di('el mando al abrirse', mando.m0);
  di('la piedra al final', mando.traColor.piedra);
  vale('el mando enseña DIEZ FIGURAS O MÁS', mando.m0.formas >= 10, mando.m0.formas);
  /* Y entre ellas la cinta larga, que es la que habla con la otra familia:
     quien la ve entiende que esa piedra dice lo mismo que un separador. */
  vale('  y una de ellas es la cinta larga', mando.m0.hayCinta === true);
  vale('y una paleta de colores', mando.m0.tintas >= 4, mando.m0.tintas);
  /* Y SIN CAMPO DE NOMBRE: se espera el false, no la ausencia de la línea. Si
     alguien devuelve el campo al mando, esto lo dice. Ver arriba. */
  vale('y SIN campo de nombre, que eso se hace en la lista',
       mando.m0.campo === false, mando.m0.campo);
  vale('y cabe entero en la escena', mando.m0.cabe === true);

  vale('elegir una figura de la parrilla la cambia',
       mando.traForma.piedra.forma === 'barca', mando.traForma.piedra.forma);
  vale('y la parrilla marca cuál está puesta',
       mando.traForma.mando.marcada === 'barca', mando.traForma.mando.marcada);
  /* El color se mide en la pantalla y no en el almacén: guardarlo y no
     pintarlo es exactamente el fallo que esto vigila.

     PERO YA NO SE COMPARA CON EL COLOR DE LA PALETA. Estuvo escrito
     rgb(155, 42, 42) —el carmín crudo, #9b2a2a— y con la corrección del brillo
     y el contraste la hoja ya no pinta ese color: pinta el corregido, que con
     el contraste de fábrica es rgb(149, 59, 59), y cambia en cuanto alguien
     toca los rieles. La expectativa fija llamaba fallo a la aplicación
     haciéndolo bien.

     Lo que esta línea tiene que decir es que el color CAMBIÓ y que lo que se
     ve es carmín, no de qué número exacto es. El número exacto sí se comprueba,
     pero abajo y donde tiene sentido: contra el de la foto del pliegue, que es
     donde importa que los dos coincidan. */
  const rojiza = c => {
    const m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(c || '');
    if (!m) return false;
    const [R, G, B] = [1,2,3].map(i => +m[i]);
    return R - G > 45 && Math.abs(G - B) < 26;
  };
  vale('EL COLOR SE CAMBIA Y SE VE',
       mando.traColor.piedra.color !== mando.traForma.piedra.color &&
       rojiza(mando.traColor.piedra.color),
       mando.traForma.piedra.color + ' → ' + mando.traColor.piedra.color);
  vale('y la paleta marca cuál está puesto',
       mando.traColor.mando.tinta === 'carmin', mando.traColor.mando.tinta);
  vale('la figura y el color quedan guardados',
       mando.guardada.forma === 'barca' && mando.guardada.color === 'carmin',
       mando.guardada);
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

  /* ----------------------------------------------------------------
     LA SALIDA Y LOS DOS BOTONES QUE MÁS SE TOCAN.

     El pie del mando era cuatro cosas en fila —menos, la cuenta, más, y una
     equis de QUITAR— y tenía dos problemas a la vez: con la equis al final el
     grupo quedaba descentrado, y el botón que borra sin preguntar compartía
     sitio con los dos que se usan a tientas todo el rato. Se pidió lo que
     había que pedir: la equis a la esquina de arriba a la derecha, como en las
     otras cajitas, y los de tamaño más grandes y centrados.

     Se comprueban las tres cosas y la cuarta que las sostiene: que el aspa
     CIERRE. Un aspa que se ve y no cierra es peor que no ponerla, y este panel
     no pasa por el oyente que atiende las de los dos paneles de listas: su
     cierre se escribió aparte y por eso se prueba aparte.

     44 PX, y el número no es de gusto: es la medida de pulgar que ya usan los
     botones del panel de la glosa. A 30 se fallaba, y ajustar el tamaño de una
     piedra es subir y bajar mirando la hoja, no el botón. */
  titulo('el mando: la salida arriba y los de tamaño, grandes y centrados');
  const remate = await p.evaluate(async () => {
    const antes = window.__elMando();
    await window.__toque('#piedraMando [data-sp-cerrar]');
    await window.__pausa(500);
    return { antes, cerrado: !window.__elMando().visible, editando: window.__editando() };
  });
  di('el mando por dentro', remate.antes);
  vale('el aspa está en la esquina de arriba a la derecha',
       !!remate.antes.aspa && remate.antes.aspa.arriba <= 6 && remate.antes.aspa.derecha <= 6,
       remate.antes.aspa);
  vale('  y con blanco de toque de 30 px o más',
       !!remate.antes.aspa && remate.antes.aspa.lado >= 30, remate.antes.aspa);
  vale('Y CIERRA EL MANDO', remate.cerrado === true && remate.editando === false, remate);
  vale('ya no hay botón de quitar en el mando', remate.antes.quitar === false,
       'borrar se pide en la lista, y allí pregunta');
  vale('los dos de tamaño miden 44 px o más',
       remate.antes.tamanos.length === 2 &&
       remate.antes.tamanos.every(b => b.lado >= 44 && b.alto >= 44),
       remate.antes.tamanos);
  /* CENTRADOS DE VERDAD: el centro del grupo contra el centro del pie. Se mira
     el punto medio entre los dos botones y no cada uno por su lado, que es lo
     que de verdad se ve torcido. Dos píxeles de holgura por el redondeo. */
  vale('y quedan centrados en el pie',
       remate.antes.tamanos.length === 2 && !!remate.antes.piePie &&
       Math.abs((remate.antes.tamanos[0].centro + remate.antes.tamanos[1].centro) / 2 -
                remate.antes.piePie.centro) <= 2,
       remate.antes.tamanos.map(b => b.centro) + ' contra ' +
       (remate.antes.piePie && remate.antes.piePie.centro));
  /* ---------------------------------------------------------------- */
  /* NOMBRAR DESDE LA LISTA, que es el ÚNICO sitio donde se nombra. El campo
     del mando se quitó: el nombre ya no se pinta sobre la hoja, así que
     escribirlo al lado de la figura era escribir a ciegas. Aquí se lee, que es
     para lo que existe la lista. */
  titulo('nombrar una piedra desde su lista');
  const lapiz = await p.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await window.__pausa(400);
    await window.__toque('#btnHistorial'); await window.__pausa(600);
    await window.__toque('[data-piedra-lista]'); await window.__pausa(700);
    const f = document.querySelector('#piedraMenu [data-piedra-ir]');
    if (!f) return { sinFila:true };
    /* EL PANEL SE SUBE SOLO CUANDO EL TECLADO LO TAPA, y aquí no hay teclado:
       en un navegador sin pantalla no lo hay, y visualViewport no encoge por
       su cuenta. Lo que sí se puede exigir —y es lo que se rompería primero si
       alguien enreda la cuenta— es que sin teclado NO se escriba --sube y el
       panel siga anclado por abajo donde estaba. Crecer sí crece: la fila
       abierta ocupa más y colocarPiedraMenu lo recoloca; por eso se mira el
       BORDE DE ABAJO y no el de arriba. */
    const cajaAntes = document.getElementById('piedraMenu').getBoundingClientRect();
    if (!await window.__abrirFila(f.dataset.piedraIr)) return { noAbre:true };
    const cajaTras = document.getElementById('piedraMenu').getBoundingClientRect();
    const teclado = { sube: document.getElementById('piedraMenu').style.getPropertyValue('--sube'),
                      pieAntes: Math.round(cajaAntes.bottom),
                      pieTras: Math.round(cajaTras.bottom),
                      /* Y tampoco se desplaza POR DENTRO: cuando el tope de
                         arriba no basta, lo que sobra se le pide al panel; sin
                         teclado no sobra nada y la lista tiene que quedarse
                         quieta. Ver vigilarTecladoPanel. */
                      rodado: document.getElementById('piedraMenu').scrollTop };
    const campo = document.querySelector('#piedraMenu [data-piedra-nombre]');
    if (!campo) return { sinCampo:true };
    const conFoco = document.activeElement === campo;
    campo.value = 'la del monte';
    campo.dispatchEvent(new KeyboardEvent('keydown',
      { key:'Enter', bubbles:true, cancelable:true }));
    await window.__pausa(500);
    return { conFoco, teclado, guardado: window.__guardadas()[0].nombre,
             fila: (document.querySelector('#piedraMenu .sp-ref') || {}).textContent,
             cerroElCampo: !document.querySelector('#piedraMenu [data-piedra-nombre]') };
  });
  di('al nombrarla desde la lista', lapiz);
  vale('EL DOBLE TOQUE ABRE EL CAMPO Y SE LO LLEVA EL FOCO',
       lapiz.conFoco === true, lapiz);
  vale('Intro guarda el nombre', lapiz.guardado === 'la del monte', lapiz.guardado);
  vale('  y la fila lo enseña', /la del monte/.test(lapiz.fila || ''), lapiz.fila);
  vale('  y el campo se cierra', lapiz.cerroElCampo === true);
  di('el desplazamiento del teclado', lapiz.teclado);
  vale('SIN TECLADO el panel no se desplaza',
       !!lapiz.teclado && lapiz.teclado.sube === '' &&
       lapiz.teclado.pieAntes === lapiz.teclado.pieTras &&
       lapiz.teclado.rodado === 0, lapiz.teclado);

  /* El nombre se lee de lapiz.guardado y no escrito a mano: ésta ya se
     descolgó una vez, cuando el bloque de arriba cambió el nombre y aquí se
     quedó el viejo. Leyéndolo de donde se puso, no puede volver a pasar. */
  const voz = await p.evaluate(() =>
    document.querySelector('.piedra').getAttribute('aria-label'));
  di('el rótulo hablado', voz);
  vale('el rótulo hablado dice figura, color y nombre',
       /barca/.test(voz) && /carm/.test(voz) &&
       voz.indexOf(lapiz.guardado) >= 0, voz);

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

  /* BORRAR PREGUNTA ANTES, Y ES LO QUE MÁS IMPORTA DE ESTE BLOQUE. La equis de
     cada fila borraba al primer toque y se quitó por eso: una piedra es el
     sitio donde el lector la dejó y no hay deshacer. Ahora son tres pasos
     —doble toque, «Borrar», y contestar que sí— y aquí se comprueban los tres,
     incluido que decir que no la deje donde estaba. */
  const quitada = await p.evaluate(async () => {
    const f = document.querySelector('#piedraMenu [data-piedra-ir]');
    if (!f) return { sinFila:true };
    const id = f.dataset.piedraIr;
    await window.__abrirFila(id);
    await window.__toque('[data-piedra-pedir-borrar]'); await window.__pausa(400);
    const preguntando = { hay: !!document.querySelector('.sp-fila-pregunta'),
                          guardadas: window.__guardadas().length };
    await window.__toque('[data-piedra-cancelar]'); await window.__pausa(400);
    const traDecirNo = { pregunta: !!document.querySelector('.sp-fila-pregunta'),
                         guardadas: window.__guardadas().length };
    await window.__abrirFila(id);
    await window.__toque('[data-piedra-pedir-borrar]'); await window.__pausa(400);
    await window.__toque('[data-piedra-borrar]'); await window.__pausa(600);
    return { preguntando, traDecirNo,
             guardadas: window.__guardadas().length, hay: window.__hayPiedra() };
  });
  di('al borrarla', quitada);
  vale('PEDIR BORRAR PREGUNTA, Y NO BORRA',
       quitada.preguntando && quitada.preguntando.hay === true &&
       quitada.preguntando.guardadas === 1, quitada.preguntando);
  vale('  y decir que no la deja donde estaba',
       quitada.traDecirNo && quitada.traDecirNo.pregunta === false &&
       quitada.traDecirNo.guardadas === 1, quitada.traDecirNo);
  vale('  y decir que sí la quita de la hoja y del almacén',
       quitada.guardadas === 0 && quitada.hay === false, quitada);

  /* EL PRIMER TOQUE EN OTRO LÁPIZ NO SE PIERDE.

     Escribiendo un nombre, el campo tiene el foco. Tocar el lápiz de OTRA fila
     manda primero un focusout —siempre llega antes que el clic del botón que
     se está pulsando— y ahí es donde se guarda lo escrito. El guardado estaba
     bien; lo que estaba mal era repintar la lista en ese mismo focusout: el
     repintado destruye el botón que el dedo tiene debajo y su clic aterriza en
     la nada. Para quien lo usa, el primer toque no hace nada y hay que dar dos.
     Su propio comentario ya decía que ahí no se repinta —es la lección del
     focusout de #sepMenu— y aun así se hizo. Lo levantó Codex.

     LO QUE SE MIDE ES QUE EL NODO SOBREVIVA, y no que el segundo campo se
     abra, y esto costó tres intentos:

     · Tocar el otro lápiz con __toque y mirar si el campo se abre: PASA
       IGUAL con el fallo puesto. Es la cuarta regla de la casa —un evento
       despachado a mano SIEMPRE llega, y el de un teléfono no—: el clic se
       manda al nodo que se tiene cogido y aterriza aunque ese nodo ya esté
       fuera del documento. En un dedo de verdad el navegador vuelve a mirar
       qué hay bajo el punto y entrega el clic al ancestro común, no al botón.
       Comprobado contra b761ec6: verde con el fallo dentro.
     · Mirarlo un macrotarea después: sale falso en las DOS versiones. El
       arreglo no evita el repintado, lo APLAZA, así que un turno más tarde el
       nodo tampoco está. Lo que separa a las dos es el instante exacto.
     · Mirarlo EN EL ACTO, sin ceder el hilo tras el focusout: ahí sí.

           arreglado ... el nodo sigue en el documento     ✓
           b761ec6 .... el nodo ya no está                 ✗

     Y el focusout se provoca con blur() a pelo porque un PointerEvent
     despachado no mueve el foco: lo que se prueba es qué hace la aplicación
     CUANDO llega el focusout, que es su contrato, no si el navegador lo
     manda. */
  titulo('escribir un nombre y tocar otra fila: un solo toque');
  const dosLapices = await p.evaluate(async () => {
    /* VA AL FINAL DE ESTA SESIÓN Y NO JUNTO AL BLOQUE DEL LÁPIZ, que es donde
       se leería mejor: hacen falta DOS piedras y los bloques de en medio
       cuentan las que hay —«sigue puesta», «con su fila y su referencia»—.
       Puesto arriba, este bloque los rompía a los dos. Aquí el almacén acaba
       de quedarse vacío y las dos se ponen de cero. */
    while (window.__guardadas().length < 2){
      if (!await window.__nuevaPiedra()) return { noPone:true };
      /* La recién puesta nace en edición y su mando tapa la lista. */
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      await window.__pausa(400);
    }
    if (!document.getElementById('piedraMenu').classList.contains('visible')){
      if (!document.getElementById('historial').classList.contains('visible')){
        await window.__toque('#btnHistorial'); await window.__pausa(600);
      }
      await window.__toque('[data-piedra-lista]'); await window.__pausa(700);
    }
    /* EL LÁPIZ SE FUE Y AHORA SON FILAS: el nodo bajo el dedo es la fila de la
       otra piedra, que es lo que el repintado se llevaría por delante. El
       invariante es el mismo y por eso el bloque sigue valiendo. */
    const filas = document.querySelectorAll('#piedraMenu [data-piedra-ir]');
    if (filas.length < 2) return { faltan: filas.length };
    if (!await window.__abrirFila(filas[0].dataset.piedraIr)) return { noAbre:true };
    const campo = document.querySelector('#piedraMenu [data-piedra-nombre]');
    if (!campo) return { sinCampo:true };
    const primera = campo.dataset.piedraNombre;
    campo.value = 'la de la orilla';
    const otro = [...document.querySelectorAll('#piedraMenu [data-piedra-ir]')]
      .find(b => b.dataset.piedraIr !== primera);
    if (!otro) return { sinOtro:true };
    /* El dedo se apoya en la otra fila, y con eso el campo pierde el foco. */
    const r = otro.getBoundingClientRect();
    otro.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, cancelable:true, pointerId:997, pointerType:'touch',
        isPrimary:true, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }));
    campo.blur();
    const sigueAhi = document.contains(otro);      /* SIN ceder el hilo */
    await window.__pausa(600);
    const guardada = window.__guardadas().find(x => x.id === primera);
    return { primera, sigueAhi, guardado: guardada ? guardada.nombre : null,
             filasAhora: document.querySelectorAll(
               '#piedraMenu [data-piedra-ir]').length };
  });
  di('al apoyar el dedo en la otra fila', dosLapices);
  vale('EL NOMBRE ESCRITO SE GUARDA AL SOLTAR EL CAMPO',
       dosLapices.guardado === 'la de la orilla', dosLapices.guardado);
  vale('  Y LA FILA QUE EL DEDO TIENE DEBAJO NO SE DESTRUYE',
       dosLapices.sigueAhi === true,
       dosLapices.sigueAhi ? 'sigue en el documento' : 'lo repintó y se lo llevó');

  /* ================================================================
     EL DOBLE TOQUE DE VERDAD, Y EL TECLADO. Los dos los levantó Codex y los
     dos se escaparon de la sonda por la misma razón, que es la cuarta regla de
     la casa: un evento despachado a mano llega, y el de un dedo no llega
     igual. La sonda mandaba un dblclick suelto; un navegador manda DOS click
     y después el dblclick. */
  titulo('el doble toque de verdad, con sus dos clics delante');
  const dobleReal = await p.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await window.__pausa(400);
    while (window.__guardadas().length < 1){
      if (!await window.__nuevaPiedra()) return { noPone:true };
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      await window.__pausa(400);
    }
    if (!document.getElementById('piedraMenu').classList.contains('visible')){
      if (!document.getElementById('historial').classList.contains('visible')){
        await window.__toque('#btnHistorial'); await window.__pausa(600);
      }
      await window.__toque('[data-piedra-lista]'); await window.__pausa(700);
    }
    const fila = document.querySelector('#piedraMenu [data-piedra-ir]');
    if (!fila) return { sinFila:true };
    const c = fila.getBoundingClientRect();
    const op = n => ({ bubbles:true, cancelable:true, detail:n,
                       clientX:c.left + c.width/2, clientY:c.top + c.height/2,
                       pointerId:900, pointerType:'touch', isPrimary:true });
    fila.dispatchEvent(new PointerEvent('pointerdown', op(1)));
    fila.dispatchEvent(new PointerEvent('pointerup', op(1)));
    fila.dispatchEvent(new MouseEvent('click', op(1)));
    await window.__pausa(140);
    /* EL PRIMER CLIC YA ABRIÓ EL VERSÍCULO. Eso no es el fallo: es el
       comportamiento de siempre, y es la razón de que el segundo tenga que
       cerrarlo. */
    const traElPrimero = document.getElementById('versoPleno').classList.contains('visible');
    fila.dispatchEvent(new PointerEvent('pointerdown', op(2)));
    fila.dispatchEvent(new PointerEvent('pointerup', op(2)));
    fila.dispatchEvent(new MouseEvent('click', op(2)));
    fila.dispatchEvent(new MouseEvent('dblclick', op(2)));
    await window.__pausa(500);
    const vp = document.getElementById('versoPleno');
    const pm = document.getElementById('piedraMenu');
    return { traElPrimero,
             plenoFuera: !vp.classList.contains('visible'),
             zPleno: +getComputedStyle(vp).zIndex, zMenu: +getComputedStyle(pm).zIndex,
             campo: !!pm.querySelector('[data-piedra-nombre]') };
  });
  di('el doble toque real', dobleReal);
  vale('(así es como llega) el primer clic abre el versículo',
       dobleReal.traElPrimero === true, dobleReal);
  /* LA VENTANITA VIVE POR ENCIMA DE ESTOS PANELES —z10 contra z9— así que
     dejarla puesta escondía la fila detrás de ella. Se compara con los
     z-index leídos y no con números escritos: si alguien los cambia, esta
     línea sigue diciendo la verdad. */
  vale('Y EL SEGUNDO LA CIERRA, o la fila se abriría detrás',
       dobleReal.plenoFuera === true,
       'pleno z' + dobleReal.zPleno + ' · menú z' + dobleReal.zMenu);
  vale('  y el campo del nombre queda a la vista', dobleReal.campo === true);

  titulo('y con el teclado, que no fabrica dobles toques');
  const conTeclado = await p.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await window.__pausa(400);
    if (!document.getElementById('historial').classList.contains('visible')){
      await window.__toque('#btnHistorial'); await window.__pausa(600);
    }
    await window.__toque('[data-piedra-lista]'); await window.__pausa(700);
    const pm = document.getElementById('piedraMenu');
    const alcanzable = [...pm.querySelectorAll('button, input')].length;
    const fila = pm.querySelector('[data-piedra-ir]');
    if (!fila) return { sinFila:true };
    fila.focus();
    const enFoco = document.activeElement === fila;
    /* F2, la tecla de renombrar de toda la vida. Sin ella, quitar el lápiz y
       la equis dejaba a quien no tiene dedo sin las dos acciones. */
    fila.dispatchEvent(new KeyboardEvent('keydown', { key:'F2', bubbles:true, cancelable:true }));
    await window.__pausa(500);
    return { enFoco, alcanzable,
             nombrar: !!pm.querySelector('[data-piedra-nombre]'),
             borrar: !!pm.querySelector('[data-piedra-pedir-borrar]') };
  });
  di('con el teclado', conTeclado);
  vale('(comprobación) la fila se enfoca', conTeclado.enFoco === true, conTeclado);
  vale('F2 ABRE NOMBRE Y BORRAR SIN NINGÚN TOQUE',
       conTeclado.nombrar === true && conTeclado.borrar === true, conTeclado);

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
    await window.__nuevaPiedra();
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
  const tinta = async (sembrar, quien, retocar) => {
    const ses = await abrir();
    const w = ses.pagina;
    await w.evaluate(sembrar);
    await w.reload();
    await w.waitForTimeout(3200);
    if (retocar){ await w.evaluate(retocar); await w.waitForTimeout(900); }
    const n = await w.evaluate(async (quien) => {
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
      /* SE CUENTA EL TONO, NO UN RGB EXACTO, y esto lo dijo la prueba
         fallando. El carmín se buscaba como una caja de ±34/±30/±30 alrededor
         del color de la paleta, [155,42,42], y con la corrección del brillo y
         el contraste la piedra ya no se dibuja de ese color: sale del
         corregido, [149,59,59], y encima el pliegue la aclara. Medido en el
         lienzo, el montón de la piedra está en [163,86,79] —el verde se va 44
         del centro de la caja, que solo admitía 30— así que la cuenta se
         desplomó de 600 a 79 y la prueba llamó fallo a la aplicación
         haciéndolo bien. Es la tercera vez en este repo que el umbral es el
         que está mal, no el programa.

         Contando el TONO eso no vuelve a pasar: rojizo es R claramente por
         encima de G con G≈B, y eso lo cumple el carmín crudo, el corregido y
         el aclarado por el pliegue, sea cual sea el ajuste de los rieles. Y
         separa lo que hay que separar, medido en los tres casos:

             sin piedra ....... 0 rojizos ·  801 sepias
             piedra sepia ..... 0 rojizos · 7896 sepias   ← el fallo
             piedra carmín .. 8232 rojizos ·  467 sepias

         Cero contra 8232, y las dos cifras clavadas entre vueltas. El sepia se
         sigue midiendo por caja porque ahí no hay nada que lo confunda: lo que
         se le pregunta es si la piedra está, no de qué color. */
      let n = 0;
      for (let i = 0; i < d.length; i += 4){
        if (d[i+3] < 40) continue;
        const R = d[i], G = d[i+1], B = d[i+2];
        if (quien === 'rojizo'){
          if (R - G > 45 && Math.abs(G - B) < 26) n++;
        } else {
          if (Math.abs(R-140) < 34 && Math.abs(G-121) < 30 && Math.abs(B-79) < 30) n++;
        }
      }
      await pausa(1600);
      return n;
    }, quien);
    /* CERRAR SIN RESUMIR. Aquí estuvo cerrar(), que imprime la cuenta de toda
       la prueba y fija el código de salida: cinco sesiones, cinco resúmenes, y
       aserciones saliendo después del último. Ver fin() en comun.js. */
    await cerrarParcial(ses, 'foto del pliegue');
    return n;
  };
  const sinPiedra = await tinta(() => localStorage.removeItem('glossa:piedras:v1'), 'sepia');
  const conPiedra = await tinta(() => {
    const hoy = Date.now();
    localStorage.setItem('glossa:piedras:v1', JSON.stringify([
      { id:'g', libro:'MAT', cap:1, vers:1, x:.18, y:.30, forma:'piedra',
        tam:3, creado:hoy, tocado:hoy }]));
  }, 'sepia');
  di('tinta de piedra en el lienzo', 'sin: ' + sinPiedra + '  ·  con: ' + conPiedra);
  vale('sin piedra hay tinta de la letra, y poca', sinPiedra > 0, sinPiedra);
  vale('LA PIEDRA ESTÁ EN LA FOTO', conPiedra > sinPiedra + 300,
       sinPiedra + ' → ' + conPiedra + ' píxeles');
  /* Y CON SU PROPIO COLOR, que es un fallo aparte y silencioso: la foto llevó
     una tinta fija para todas mientras no hubo colores, y con seis, la piedra
     carmín de la hoja salía sepia durante el giro y volvía a carmín al
     aterrizar. No se ve mirando: hay que contar el rojo. Se cuenta el CARMÍN,
     que en la hoja no existe —la letra es sepia y el papel es hueso— así que
     cualquier cantidad apreciable solo puede venir de la piedra.

     TAMAÑO 4 Y NO 3, y esto lo dijo la propia prueba fallando: con el 3 la
     piedra deja poca tinta y el margen no la distinguía del ruido. El fallo
     era del umbral, no de la aplicación, y es la razón de que la cuenta de
     aquí abajo se compare contra un suelo medido y no contra uno copiado del
     bloque del sepia, que tiene otro suelo por completo —la letra de la hoja
     ya pone 801 de por sí, y el carmín parte de cero. */
  const carmin = await tinta(() => {
    const hoy = Date.now();
    localStorage.setItem('glossa:piedras:v1', JSON.stringify([
      { id:'c', libro:'MAT', cap:1, vers:1, x:.18, y:.30, forma:'piedra',
        tam:4, color:'carmin', creado:hoy, tocado:hoy }]));
  }, 'rojizo');
  const sinCarmin = await tinta(() => localStorage.removeItem('glossa:piedras:v1'), 'rojizo');
  di('tinta carmín en el lienzo', 'sin: ' + sinCarmin + '  ·  con: ' + carmin);
  /* 8232 contra 0, medido en las dos direcciones y clavado entre vueltas. El
     margen de 2000 es un cuarto de lo que hay: sobra para que un cambio de
     tamaño, de forma o de ajustes no lo roce, y una piedra que se pintase
     sepia —el fallo— daría cero exacto, no 1999. */
  vale('Y VIAJA CON SU COLOR, no con el de la tinta',
       carmin > sinCarmin + 2000, sinCarmin + ' → ' + carmin + ' píxeles');

  /* LA FOTO CADUCA AL TOCAR LA PIEDRA, Y ESTO NO LO PILLABA LO DE ARRIBA.

     Ahí la piedra nace ya carmín: la foto se hace después de cargar y sale
     bien sin que nadie invalide nada. El fallo aparece cuando la foto YA
     ESTÁ HECHA y entonces se cambia la piedra, que es lo normal —la pones, la
     retocas, pasas de hoja—. La foto no se rehace sola: lo que decide si la
     guardada sirve es estiloFirma(), y ahí no hay ni una piedra. Así que la
     vuelta siguiente enseñaba la foto vieja y la piedra cambiaba de color al
     empezar el giro para volver al suyo al aterrizar.

     Reproducido antes de arreglarlo: la hoja viva en carmín y el lienzo con
     CERO píxeles de carmín y 18.781 de sepia. Después del arreglo el cuadro
     se llena de rojizos y sin piedra da 0 —el carmín no existe en la hoja,
     que es sepia sobre hueso—, así que el mismo margen de arriba vale aquí y
     por lo mismo. Tamaño 4 como el bloque de arriba. Lo levantó Codex. */
  const traRetocar = await tinta(() => {
    const hoy = Date.now();
    localStorage.setItem('glossa:piedras:v1', JSON.stringify([
      { id:'t', libro:'MAT', cap:1, vers:1, x:.18, y:.30, forma:'piedra',
        tam:4, color:'sepia', creado:hoy, tocado:hoy }]));
  }, 'rojizo', async () => {
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
       traRetocar > sinCarmin + 2000, sinCarmin + ' → ' + traRetocar + ' píxeles');


  /* ================================================================
     Y EL COLOR DE LA FOTO ES EL MISMO QUE EL DE LA HOJA.

     Contar píxeles dice si la piedra viaja y de qué familia de tono es, pero
     NO puede decir si el color es exactamente el correcto: el pliegue aclara
     lo que retrata —la piedra de [149,59,59] en la hoja sale [163,86,79] en el
     lienzo— así que cualquier margen que aguante ese aclarado aguanta también
     un color equivocado por poco. Y equivocado por poco es justo lo que era el
     fallo que levantó Codex: la foto corregía el color DOS veces, y con el
     contraste de fábrica —125%, que ya no es neutro— la piedra de la foto
     salía #914949 donde la de la hoja era #953b3b. Trece de diferencia en dos
     canales; ninguna cuenta de píxeles con margen lo separa.

     Se compara entonces la FUENTE, que es exacta y no depende de márgenes:
     el color escrito en el SVG de la foto contra el que la hoja tiene puesto.
     Si son el mismo, la corrección se aplicó una vez; si no, dos —o ninguna.

     PARA LEER EL SVG SE ENVUELVE new Image(), que es la única pieza que esta
     casa deja sustituir, y por eso: el retrato se carga como data:image/svg+xml
     y se compone en un lienzo, así que en el DOM no queda ni rastro del XML.
     No se simula nada de la aplicación —la foto se hace igual, con el mismo
     código— solo se mira de paso lo que el navegador iba a cargar.

     Comprobado que esta aserción distingue de verdad, corriendo la misma sonda
     contra el commit con el fallo (b761ec6) y contra el arreglo (4faf85c):

         b761ec6 ... hoja rgb(149, 59, 59)  ·  foto #914949   ✗
         4faf85c ... hoja rgb(149, 59, 59)  ·  foto #953b3b   ✓

     Es la única de este fichero que falla si la corrección doble vuelve. */
  titulo('el color de la foto es el mismo que el de la hoja');
  const fuente = await (async () => {
    const ses = await abrir();
    const w = ses.pagina;
    await w.evaluate(() => {
      const hoy = Date.now();
      localStorage.setItem('glossa:piedras:v1', JSON.stringify([
        { id:'f', libro:'MAT', cap:1, vers:1, x:.18, y:.30, forma:'piedra',
          tam:4, color:'carmin', creado:hoy, tocado:hoy }]));
    });
    await w.reload();
    await w.waitForTimeout(3200);
    const r = await w.evaluate(async () => {
      const pausa = ms => new Promise(z => setTimeout(z, ms));
      const Original = window.Image;
      const vistos = [];
      window.Image = function(...a){
        const img = new Original(...a);
        Object.defineProperty(img, 'src', {
          configurable: true,
          get(){ return img.getAttribute('src'); },
          set(v){ vistos.push(String(v)); img.setAttribute('src', v); }
        });
        return img;
      };
      window.Image.prototype = Original.prototype;
      /* El color de la HOJA se lee antes de voltear: la piedra se queda en su
         página —es toda la diferencia con la cinta— y después de pasar no hay
         ninguna que mirar. */
      const enLaHoja = getComputedStyle(document.querySelector('.piedra')).color;
      const e = document.getElementById('edgeR');
      const rc = e.getBoundingClientRect();
      const op = { bubbles:true, pointerId:613, pointerType:'touch', isPrimary:true,
                   clientX: rc.left + rc.width/2, clientY: 420 };
      e.dispatchEvent(new PointerEvent('pointerdown', op));
      await pausa(60);
      e.dispatchEvent(new PointerEvent('pointerup', op));
      await pausa(2600);
      window.Image = Original;
      /* De todos los retratos que se cargan —la hoja y sus dos vecinas— el que
         lleva piedra se reconoce por la opacidad con la que se dibujan. */
      const conPiedra = vistos
        .map(v => decodeURIComponent(v.replace(/^data:[^,]+,/, '')))
        .filter(x => x.indexOf('opacity:.82') >= 0);
      let enLaFoto = null;
      if (conPiedra.length){
        const x = conPiedra[conPiedra.length - 1];
        const m = /fill="(#[0-9a-fA-F]{3,6})"/.exec(x.slice(x.indexOf('opacity:.82')));
        enLaFoto = m ? m[1] : null;
      }
      return { retratos: vistos.length, conPiedra: conPiedra.length,
               enLaHoja, enLaFoto };
    });
    await cerrarParcial(ses, 'el color de la foto');
    return r;
  })();
  /* El color de la hoja llega como rgb() y el de la foto como #rrggbb: se
     pasan los dos a la misma escritura antes de compararlos. */
  const aRGB = h => {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || '');
    return m ? 'rgb(' + [1,2,3].map(i => parseInt(m[i], 16)).join(', ') + ')' : h;
  };
  di('la piedra en la hoja', fuente.enLaHoja);
  di('la piedra en la foto', fuente.enLaFoto + '  →  ' + aRGB(fuente.enLaFoto));
  vale('el retrato de la hoja lleva la piedra', fuente.conPiedra > 0,
       fuente.conPiedra + ' de ' + fuente.retratos + ' retratos');
  vale('LA FOTO USA EL MISMO COLOR QUE LA HOJA, corregido una vez y no dos',
       aRGB(fuente.enLaFoto) === fuente.enLaHoja,
       'hoja ' + fuente.enLaHoja + '  ·  foto ' + aRGB(fuente.enLaFoto));

  /* ================================================================
     MIRAR NO ES IRSE, PERO IRSE SÍ ES IRSE.

     El gemelo del bloque de separador.prueba.js, donde está contado entero.
     Aquí importa doblemente: la lista de piedras no tiene ningún enganche en
     el repintado que la cierre —la de cintas sí—, así que si el cierre no
     está en el camino del salto, no está en ninguna parte. Lo levantó Codex.
     La piedra cae en la MISMA hoja a propósito: es la rama corta de irA, la
     que no repinta nada. */
  titulo('mirar deja la lista; aceptar el salto se la lleva');
  const viaje = await abrir();
  const vj = viaje.pagina;
  await vj.evaluate(() => {
    const hoy = Date.now();
    /* La llave escrita a pelo: LLAVE vive en Node y no cruza a evaluate(). */
    localStorage.setItem('glossa:piedras:v1', JSON.stringify([
      { id:'z', libro:'MAT', cap:1, vers:6, x:.3, y:.3, forma:'piedra',
        tam:3, color:'carmin', creado:hoy, tocado:hoy }]));
    localStorage.setItem('glossa:ajustes:v1',
      JSON.stringify({ v:1, libro:'MAT', cap:1, vers:1 }));
  });
  await vj.reload();
  await vj.waitForTimeout(3000);
  await andamio(vj);
  const mirarIrse = await vj.evaluate(async () => {
    await window.__toque('#btnHistorial'); await window.__pausa(600);
    await window.__toque('[data-piedra-lista]'); await window.__pausa(700);
    const pm = document.getElementById('piedraMenu');
    const fila = pm.querySelector('[data-piedra-ir]');
    if (!fila) return { sinFila:true };
    const hojaAntes = window.__hoja();
    await window.__toque(fila); await window.__pausa(900);
    const mirando = getComputedStyle(pm).display !== 'none';
    const txt = document.querySelector('#versoPleno .vp-txt');
    if (!txt) return { mirando, sinTexto:true };
    await window.__toque(txt); await window.__pausa(3800);
    return { mirando, hojaAntes, hojaDespues: window.__hoja(),
             trasSaltar: getComputedStyle(pm).display !== 'none' &&
                         pm.classList.contains('visible'),
             pleno: document.getElementById('versoPleno').classList.contains('visible') };
  });
  di('mirar contra saltar', mirarIrse);
  vale('MIRAR EL VERSÍCULO DEJA LA LISTA DETRÁS', mirarIrse.mirando === true, mirarIrse);
  vale('  y es la misma hoja, o sea la rama corta de irA',
       mirarIrse.hojaAntes === mirarIrse.hojaDespues,
       mirarIrse.hojaAntes + ' → ' + mirarIrse.hojaDespues);
  vale('ACEPTAR EL SALTO SÍ CIERRA LA LISTA', mirarIrse.trasSaltar === false, mirarIrse);
  vale('  y la ventanita se va con él', mirarIrse.pleno === false, mirarIrse);
  await cerrarParcial(viaje, 'mirar contra saltar');

  fin();
})();
