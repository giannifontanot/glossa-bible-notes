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

   2. Que el CONTRASTE no salga de las superficies de lectura, y que el BRILLO
      llegue además a los paneles. Ésta decía «que NO lo reciba el panel de
      Formato» —los dos efectos—, y cambió dos veces en dos días con el
      encargo: primero los paneles recibieron los dos, y al verlo puesto el
      dueño del repo lo acotó a uno, «vamos a imitar el brillo que se escogió
      para el LIBRO, pero no el contraste». Hoy, entonces: los cinco paneles
      llevan el brillo —Formato incluido mientras es opaco— y ninguno lleva el
      contraste.

      LO QUE LA REGLA PROTEGÍA SIGUE EN PIE, y es lo que se vigila ahora: que el
      filtro se escriba en las piezas que lo necesitan y NO en #stage ni en el
      body. Ahí dentro están también el readout, el menú, los filos y el marco
      de ORACIÓN, que no son papel y no deben teñirse; y .stage trae además su
      propia sombra, que una segunda propiedad filter borraría sin avisar.
      El síntoma de hacerlo arriba sería que ORACIÓN se tiñe y que en escritorio
      desaparece la sombra de la hoja: las dos cosas se miran al final.

      Y la excepción de Formato transparente tiene su propia razón, que es la
      vieja regla sobreviviendo donde todavía vale: en cristal el panel no tapa
      el libro, así que lo que miras mientras arrastras el riel es la hoja de
      detrás, y los mandos de delante tienen que quedarse en su color.

   Y una tercera que no es de filtros: que sobreviva a la recarga. El sepia se
   guarda de rebote —repagina, y al final de repaginar se guardan los ajustes—
   y éste a propósito NO repagina, así que su guardado es una línea aparte que
   se puede olvidar sin que nada más se entere. */
const { abrir, cerrar, cerrarParcial, conGlosas, di, vale, titulo,
        ESCRITORIO } = require('./comun');

/* getComputedStyle devuelve 'contrast(1.5)' o 'none'. Sacamos el número para
   poder compararlos entre sí; 'none' vale 1, que es lo que hace 'none'. */
const factorDe = css => {
  if (!css || css === 'none') return 1;
  const m = /contrast\(([\d.]+)\)/.exec(css);
  return m ? +m[1] : null;
};
/* Y HAY UN TERCER CASO desde que los paneles llevan brillo sin contraste, que
   cuando se escribió factorDe no existía: un filtro PUESTO en el que no hay
   `contrast(...)`. Ahí factorDe devuelve null —no encontró número, y está
   bien que lo diga— y no 1, que es lo que devuelve para 'none'.
   Preguntar `factorDe(x) === 1` por «éste no lleva contraste» salió rojo siete
   veces en la tanda del dueño del repo, con el valor medido delante diciendo
   `brightness(1)`: la aserción era mía y estaba mal escrita, el programa hacía
   lo pedido. Para eso está esta función, que pregunta lo que se quiere saber
   en vez de deducirlo de un número que no existe. */
const sinContraste = css => !/contrast\(/.test(css || '');
/* EL BRILLO SE LEE DE LA MISMA CADENA, y por eso se busca aparte en vez de
   comparar la cadena entera: los dos efectos comparten una sola propiedad
   filter —tienen que, o el segundo borra al primero— así que lo que hay que
   comprobar es que CADA UNO esté puesto con su número, no que la cadena diga
   una cosa concreta. */
const brilloDe = css => {
  if (!css || css === 'none') return 1;
  const m = /brightness\(([\d.]+)\)/.exec(css);
  return m ? +m[1] : null;
};
const ponerRiel = (pagina, id, v) => pagina.evaluate(async ([i, x]) => {
  const r = document.getElementById(i);
  r.value = String(x);
  r.dispatchEvent(new Event('input', { bubbles:true }));
  await new Promise(z => setTimeout(z, 120));
}, [id, v]);

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
             /* EN QUÉ MODO ESTÁ EL PANEL, porque de eso depende si le toca
                filtro: opaco sí, cristal no. Sin este dato, una aserción sobre
                #ajustes no sabe cuál de las dos cosas debería estar viendo. */
             cristal: document.getElementById('ajustes').classList.contains('cristal'),
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
  titulo('el control vive entre el sepia y el brillo');
  /* CON EL PANEL ABIERTO, y no es un detalle: cerrado va en display:none y
     todo lo que se mida ahí sale en cero, incluida la comparación de largos
     entre los dos rieles —que saldría verde por empate a nada—. Se abre como
     se abre con un dedo: titulillo y pestaña. */
  const abrioAlPrincipio = await pagina.evaluate(async () => {
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const t = document.querySelector('.pestanas button[data-sec="formato"]');
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
  /* Lo que esta línea vigila es el orden de los tres de tinta, que es el que
     importa: uno elige el color del papel, otro cuánto se despega la letra de
     él y el tercero la luz, y se corrigen entre ellos.
     Decía «entre el sepia y la versión» porque la fila de versión cerraba el
     panel. Ya no existe: el rótulo del pie de la hoja abre el globo de
     versiones y esa fila era la misma lista otra vez, más ancha. */
  vale('sepia · contraste · brillo',
       JSON.stringify(sitio.orden) === JSON.stringify(['sepia','contraste','brillo']),
       sitio.orden);
  /* Y LA TERCERA CLASE ES NUEVA Y NO ES DECORACIÓN: riel-fila es la que saca a
     las tres de tinta del ancho ajustado del modo cristal y las deja al 100%,
     que es como están al abrir el panel. Sin ella la fila volvería a encogerse
     al volverse transparente y el pulgar tendría que buscar el riel en otro
     sitio según el modo. Esta línea la nombra para que quitarla se vea aquí. */
  vale('con las clases de siempre', sitio.clases === 'ajuste ancho riel-fila', sitio.clases);
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
    const m = r.parentElement.querySelector('.medida');
    const ancho = async v => { r.value = String(v);
      r.dispatchEvent(new Event('input', { bubbles:true }));
      await new Promise(z => setTimeout(z, 100));
      return Math.round(r.getBoundingClientRect().width); };
    return { c50: await ancho(50), c100: await ancho(100), c200: await ancho(200),
             /* Y DE QUÉ FAMILIA ES EL NÚMERO, que es la causa de todo esto. */
             familia: m ? getComputedStyle(m).fontFamily : null };
  });
  di('el riel a 50, 100 y 200', estable);
  vale('el riel no se encoge con el número',
       estable.c50 === estable.c100 && estable.c100 === estable.c200, estable);
  /* Y LA CAUSA, DICHA: el número va en monoespaciada justamente para que «50%»
     y «100%» ocupen lo mismo. La línea de arriba caza el síntoma —tres píxeles
     de riel— y esta caza el motivo.

     Hace falta porque el CSS no avisa: una declaración mal escrita se la come
     el navegador en silencio, y si la que se cae es la que pone la
     monoespaciada, el número pasa a una proporcional, «100%» se ensancha y el
     riel encoge. Pasó: una pasada automática partió `.7rem` en dos y dejó un
     `.calc(` suelto en el atajo `font:`, que tumbó con él la familia y el
     peso. Lo cazó la de arriba por tres píxeles, y costó llegar del síntoma a
     la causa. Preguntando por la familia, la próxima lo dice de una vez. */
  vale('  y el número conserva su monoespaciada, que es por lo que no se encoge',
       /mono|menlo|consolas|courier/i.test(estable.familia || ''), estable.familia);

  /* ---------- el panel ya no ofrece versiones ---------- */
  /* La fila de versión vivía al final de Formato y era una segunda lista de lo
     mismo: el rótulo del pie de la hoja abre el globo #burbujaVersion, que las
     enseña con su nombre completo y su licencia. Se fue por duplicada y porque
     era la fila más ancha del panel, justo la que peor cae con el fondo
     transparente. Lo que NO se puede ir es el crédito: la Versión Biblia Libre
     es CC BY-SA y la atribución es obligatoria. */
  /* EL CRÉDITO SE FUE DE ESTE PANEL Y YA TIENE CASA. Esta prueba decía primero
     «el crédito de licencia sigue a la vista» —cuando vivía aquí—, después que
     no estaba en ninguna parte mientras se le buscaba sitio, y ahora dice las
     dos mitades que hacen falta: que NO está en el panel de la letra, que es
     lo que se pidió, y que SÍ está en el de Share, que es lo que la licencia
     exige. La primera sola dejaba pasar el estado en que no se enseñaba en
     ninguna parte; la segunda sola dejaría pasar que volviera aquí.

     Lo de la licencia no es formalismo: la Versión Biblia Libre es CC BY-SA y
     la atribución es obligatoria, así que un crédito escondido es un fallo del
     programa aunque no se vea ningún fallo en la pantalla. Lo que se ve de
     verdad —que se lee, dónde cae, junto a qué— lo mide version.prueba.js, que
     es la dueña de ese panel. */
  titulo('Formato ya no ofrece versiones, y el crédito salió de aquí');
  const sinVersiones = await pagina.evaluate(() => {
    /* El nodo se busca por su id, no dentro del panel: lo que se quiere saber
       es que NO está en el panel y que SÍ sigue en el documento, y para las
       dos cosas hace falta encontrarlo esté donde esté. */
    const cred = document.getElementById('cred');
    return {
      credEnPanel: !!document.querySelector('#ajustes .cred'),
      credEnShare: !!document.querySelector('#respaldo #cred'),
      fila: !!document.getElementById('ctrlVersiones'),
      botones: document.querySelectorAll('#ajustes [data-ver]').length,
      rotulos: [...document.querySelectorAll('#ctrlConfig .ajuste .lbl')]
                 .map(l => l.textContent.trim()),
      credTexto: cred ? cred.textContent.trim() : null,
      /* Y el globo del pie sigue siendo el sitio donde SÍ se cambia. */
      globo: !!document.getElementById('burbujaVersion'),
      pie: (document.getElementById('pgVersion') || {}).textContent
    };
  });
  di('los rótulos que quedan', sinVersiones.rotulos);
  vale('no queda la fila de versión', sinVersiones.fila === false);
  vale('ni un botón de versión suelto', sinVersiones.botones === 0, sinVersiones.botones);
  vale('ni su rótulo', !sinVersiones.rotulos.includes('versión'), sinVersiones.rotulos);
  vale('EL CRÉDITO YA NO ESTÁ EN ESTE PANEL',
       sinVersiones.credEnPanel === false, sinVersiones.credEnPanel);
  vale('  SE MUDÓ AL DE SHARE, que es donde la licencia obliga a que esté',
       sinVersiones.credEnShare === true, sinVersiones.credEnShare);
  vale('  y dice lo que tiene que decir',
       /CC BY/.test(sinVersiones.credTexto || ''), sinVersiones.credTexto);
  vale('y el globo del pie sigue siendo quien las cambia',
       sinVersiones.globo === true && !!sinVersiones.pie, sinVersiones.pie);

  /* ---------- transparente: una tablilla por control, y estrecha ---------- */
  /* Con el panel transparente se ve la hoja, que es de lo que se trata, pero
     los controles se quedaban sin sitio donde apoyarse y había que adivinar
     qué decía cada fila. Cada uno lleva ahora su tablilla de papel.
     LO QUE ESTA PRUEBA VIGILA DE VERDAD ES QUE SEAN ESTRECHAS. Una tablilla
     por fila pero a todo lo ancho no arregla nada: vuelve a tapar la hoja
     renglón por renglón, que es justo lo que se vino a evitar. Por eso el
     umbral no es «tiene fondo» sino «mide menos que el panel». */
  titulo('transparente: cada control con su tablilla, y del ancho justo');
  const tablillas = await pagina.evaluate(async () => {
    const panel = document.getElementById('ajustes');
    /* EL PAPEL DEL PANEL NO ES SU background-color, y por eso no se pregunta
       por ahí: el color de fondo del panel es transparente en los dos modos
       —lo que pinta la hoja de papel son sus ::before y ::after— así que una
       prueba que mirara el color diría que nunca hubo fondo y pasaría en verde
       sin comprobar nada. Lo que sí cambia es la sombra y esos dos pegotes. */
    const papel = () => {
      const cs = getComputedStyle(panel);
      return { sombra: cs.boxShadow,
               antes: getComputedStyle(panel, '::before').display };
    };
    const opaco = papel();
    /* EL PAPEL DEL PANEL SE LEE AQUÍ, EN OPACO, y no abajo con lo demás: en
       cristal el panel se queda sin su papel —de eso va el modo— así que su
       degradado ya no existe y no habría contra qué comparar. */
    const tonosDelPanel = (getComputedStyle(panel).backgroundImage
      .match(/rgba?\([^)]+\)/g) || []).map(c => c.replace(/\s/g, ''));
    document.getElementById('btnVidrio').click();
    await new Promise(z => setTimeout(z, 400));
    const cristal = papel();
    const ancho = panel.getBoundingClientRect().width;
    const hueco = c => { const m = /rgba?\(([^)]+)\)/.exec(c);
                         return !m || +(m[1].split(',')[3] || 1) < 0.05; };
    /* LA SALIDA SE RECONOCE POR SU BOTÓN, no por la clase que le da el trato
       especial. Estuvo por la clase y Codex lo levantó: .vidrio-fila es la
       misma que enciende la excepción del CSS, así que preguntando por ella
       la prueba no podía enterarse de que alguien la pusiera en la fila
       equivocada —la recién marcada pasaría por salida y cumpliría sus
       aserciones, mientras la del botón de verdad se encogía y le salía
       tablilla, y se colaba como un ajuste más—. Por el botón, las dos mitades
       se vigilan solas: si la clase se muda, la salida de verdad aparece
       estrecha y con tablilla, y la otra sale ancha donde no debe. */
    const filaSalida = (document.getElementById('btnVidrio') || {}).closest
      ? document.getElementById('btnVidrio').closest('.ajuste') : null;
    const filas = [...document.querySelectorAll('#ctrlConfig .ajuste')].map(f => {
      const r = f.getBoundingClientRect(), cs = getComputedStyle(f);
      const hijos = [...f.children].map(h => h.getBoundingClientRect().right);
      return { que: (f.querySelector('.lbl') || {}).textContent || '(sin rótulo)',
               /* LA FILA DEL BOTÓN DE VOLVER NO ES UN AJUSTE, ES LA SALIDA, y
                  el programa la trata aparte a propósito: se queda sin
                  tablilla y a todo lo ancho. Lo dice su propia regla, y con
                  razón —«su tablilla sobra, porque el botón ya trae fondo de
                  papel propio; dos papeles superpuestos solo engordan el
                  borde»—. Se apunta aquí para poder dejarla fuera de las dos
                  afirmaciones que hablan de tablillas.
                  OJO A QUÉ SE MIDE AQUÍ: la FILA, no el botón. La fila sigue
                  ocupando el ancho del panel —es la que centra— y el botón ya
                  no: se le pidió que midiera su palabra, como el de CERRAR, y
                  eso se comprueba aparte más abajo. */
               salida: !!filaSalida && f === filaSalida,
               /* LAS FILAS DE RIEL TAMPOCO ENCOGEN, y por una razón que
                  no es la de la salida: encoger la fila ENCOGE EL RIEL, y el
                  recorrido de un riel es su precisión —cuanto más largo, más
                  fino el ajuste con el mismo gesto—. Se pidió que no cambien de
                  largo al volverse transparente, así que éstas se quedan
                  del ancho del panel con su tablilla puesta.
                  FUERON CUATRO UN RATO: el espaciado entró como riel con el
                  lote de la tipografía y volvió a salir al cambiarlo por el
                  mando de tres piezas del tamaño —ocho topes repartidos en el
                  ancho de un panel son treinta píxeles por tope, que un pulgar
                  se salta—. Los que quedan son los tres filtros de siempre. */
               riel: f.classList.contains('riel-fila'),
               pct: Math.round(r.width / ancho * 100),
               conFondo: !hueco(cs.backgroundColor),
               /* El color y el borde de la tablilla, para la regla nueva: el
                  sepia del panel en vez del blanco, con su hilo marrón. */
               papel: cs.backgroundColor,
               /* LOS CUATRO LADOS, no sólo el de arriba. Medí borderTopWidth y
                  se me coló un recuadro entero: la fila de la salida cumple
                  `:not(.riel-fila)`, así que la regla de las tablillas le daba
                  borde por los cuatro costados, y la excepción sólo apagaba el
                  de arriba —que era justo el único que yo miraba—. Lo levantó
                  la revisión de Codex. */
               bordes: ['Top','Right','Bottom','Left']
                 .map(l => parseFloat(cs['border' + l + 'Width']) || 0),
               redondas: parseFloat(cs.borderRadius) >= 4,
               /* que la tablilla CUBRA lo que sostiene: un fondo estrecho que
                  deje el control fuera no lo hace legible, lo parte. */
               cabe: hijos.length === 0 || Math.max(...hijos) <= r.right + 1,
               claseSalida: f.classList.contains('vidrio-fila'),
               clases: f.className };
    });
    /* EL BOTÓN DE LA SALIDA, aparte de su fila. Estuvo a todo lo ancho y el
       dueño del repo lo paró: mide su palabra y va centrado, como el de
       CERRAR. Se mide contra las LETRAS pintadas —un Range sobre el texto del
       botón— y no contra un número escrito, que cambia con --escala-ui y con
       la letra que tenga instalada cada máquina. */
    const bv = document.getElementById('btnVidrio');
    const rb = bv.getBoundingClientRect();
    const rf = bv.closest('.ajuste').getBoundingClientRect();
    const g = document.createRange(); g.selectNodeContents(bv);
    const salidaBoton = {
      ancho: Math.round(rb.width), fila: Math.round(rf.width),
      palabra: Math.round(g.getBoundingClientRect().width),
      eje: Math.round((rb.left + rb.right) / 2 - (rf.left + rf.right) / 2),
      alto: Math.round(rb.height) };
    return { opaco, cristal, filas, salidaBoton, tonosDelPanel };
  });
  di('lo que mide cada tablilla', tablillas.filas.map(f => f.que + ' ' + f.pct + '%').join(' · '));
  di('el papel del panel', tablillas.opaco.sombra.slice(0,40) + ' → ' + tablillas.cristal.sombra);
  vale('el panel pierde su papel al volverse transparente',
       tablillas.opaco.sombra !== 'none' && tablillas.cristal.sombra === 'none' &&
       tablillas.opaco.antes !== 'none' && tablillas.cristal.antes === 'none',
       JSON.stringify(tablillas.opaco) + ' → ' + JSON.stringify(tablillas.cristal));
  /* LOS AJUSTES DE VERDAD, sin la fila de la salida. Sin este filtro estas dos
     afirmaciones llamaban fallo a algo que el programa hace a propósito y
     tiene escrito por qué, que es la peor clase de prueba roja: la que enseña
     a no hacer caso de las rojas.
     Pero se comprueba que la salida SIGUE SIENDO la excepción, en vez de
     apartarla y olvidarse: si algún día le ponen tablilla o la encogen, esta
     prueba tiene que enterarse, aunque sea para decir que ahora sobra el
     apaño. */
  const ajustes = tablillas.filas.filter(f => !f.salida && !f.riel);
  const rieles = tablillas.filas.filter(f => f.riel);
  const salidas = tablillas.filas.filter(f => f.salida);
  vale('(la prueba es válida) la fila de la salida está, y es una sola',
       salidas.length === 1, salidas.length);
  /* Y que el trato especial le siga tocando a ELLA: la clase se busca aquí,
     después de haberla encontrado por el botón, que es el único orden en que
     esta comprobación dice algo. */
  vale('  y es ella la que lleva la clase del trato especial',
       salidas.every(f => f.claseSalida), salidas.map(f => f.clases).join(' · '));
  vale('la FILA de la salida va a todo lo ancho y sin tablilla, como pide su regla',
       salidas.every(f => f.pct > 90 && !f.conFondo),
       salidas.map(f => f.pct + '% · tablilla ' + f.conFondo).join(' · '));
  /* Y EL BOTÓN, AL REVÉS QUE SU FILA. Esta prueba exigía que la salida fuera
     ancha y era verdad de las dos cosas: la fila y el botón medían el panel.
     Se pidió que el botón midiera su palabra —los dos botones de una palabra
     del programa, éste y el de CERRAR, tenían que verse iguales— y lo que
     sigue haciéndolo encontrable no es el ancho sino que su fila lo centra y
     que no comparte renglón con nada. Así que la fila sigue midiendo el panel,
     arriba, y aquí se exige lo contrario del botón, por los dos lados: ni la
     barra de antes ni un botón encogido hasta no poder leerse. */
  di('el botón de la salida', JSON.stringify(tablillas.salidaBoton));
  vale('EL BOTÓN DE LA SALIDA MIDE SU PALABRA',
       tablillas.salidaBoton.ancho < tablillas.salidaBoton.fila / 2 &&
       tablillas.salidaBoton.ancho >= tablillas.salidaBoton.palabra + 16,
       tablillas.salidaBoton.ancho + ' px  (palabra ' +
       tablillas.salidaBoton.palabra + ', fila ' + tablillas.salidaBoton.fila + ')');
  vale('  y va centrado en su fila',
       Math.abs(tablillas.salidaBoton.eje) <= 1,
       tablillas.salidaBoton.eje + ' px del eje');
  /* El blanco de toque no se negocia: es la única salida del modo
     transparente. */
  vale('  sin perder el blanco de dedo', tablillas.salidaBoton.alto >= 38,
       tablillas.salidaBoton.alto + ' px');
  vale('todas las filas llevan su tablilla',
       ajustes.every(f => f.conFondo), ajustes.filter(f => !f.conFondo).map(f => f.que));
  /* Y SU PAPEL ES EL DEL PANEL, NO BLANCO. Lo pidió el dueño del repo al verlo
     puesto: «que en FORMATO transparente los controles no tengan blanco, sino
     el sepia del panel, tal vez con un pequeño borde para que se distingan».
     Era rgba(255,253,247,.9) y se notaba: en transparente las tablillas son lo
     único con fondo, así que eran parches de otro color sobre un libro de
     papel viejo.

     SE COMPARA CONTRA EL PROPIO DEGRADADO DEL PANEL y no contra un color
     escrito aquí: lo que hay que afirmar es que son el mismo papel. Y se mira
     además que NO sea el blanco de antes por su cuenta —un rojo y un azul casi
     iguales delatan el blanco; el sepia tiene 46 puntos entre ellos—, que es
     la forma de que esta línea siga sirviendo si algún día el degradado del
     panel se escribe de otra manera. */
  const rgbDe = c => { const m = /rgba?\(([^)]+)\)/.exec(c || '');
                       return m ? m[1].split(',').map(Number) : null; };
  const sonSepia = f => { const c = rgbDe(f.papel);
                          return !!c && (c[0] - c[2]) >= 30; };
  di('el papel de las tablillas', (ajustes[0] || {}).papel + ' · panel: ' +
     tablillas.tonosDelPanel.join(' '));
  vale('(la prueba es válida) se pudo leer el papel del panel',
       tablillas.tonosDelPanel.length > 0, tablillas.tonosDelPanel.join(' '));
  vale('EL PAPEL DE LAS TABLILLAS ES EL DEL PANEL, no blanco',
       ajustes.every(sonSepia) && rieles.every(sonSepia),
       ajustes.concat(rieles).filter(f => !sonSepia(f)).map(f => f.que + ' ' + f.papel)
         .join(' · ') || (ajustes[0] || {}).papel);
  vale('  y es uno de los tonos del propio panel',
       ajustes.every(f => tablillas.tonosDelPanel.some(t =>
         t.replace(/rgba?\(|\)/g, '').split(',').slice(0,3).join(',') ===
         (rgbDe(f.papel) || []).slice(0,3).join(','))),
       (ajustes[0] || {}).papel + ' contra ' + tablillas.tonosDelPanel.join(' '));
  vale('  con su hilo por los cuatro lados, para distinguirse de la hoja',
       ajustes.concat(rieles).every(f => f.bordes.every(n => n >= 1)),
       ajustes.concat(rieles).map(f => f.que + ' ' + f.bordes.join('/')).join(' · '));
  /* Y LA SALIDA NO LLEVA NINGUNO, que es la otra mitad: es la única fila ancha
     sin tablilla, y un recuadro sin fondo debajo no es el canto de nada. */
  vale('LA FILA DE LA SALIDA SE QUEDA SIN BORDE, como sin tablilla',
       salidas.every(f => f.bordes.every(n => n === 0)),
       salidas.map(f => f.bordes.join('/')).join(' · '));
  vale('de esquinas redondeadas', ajustes.every(f => f.redondas));
  vale('y cada una cubre su control',
       ajustes.every(f => f.cabe), ajustes.filter(f => !f.cabe).map(f => f.que));
  /* NINGUNA A TODO LO ANCHO. Ésta es la que se pidió y la que se rompe sola si
     alguien le quita el justify-self o el flex:0 0 auto: con cualquiera de las
     dos cosas fuera, las filas vuelven a medir la columna entera.
     Las del riel quedan fuera de la cuenta a propósito y se vigilan
     aparte, abajo: ahí lo ancho no es un descuido, es el encargo. */
  vale('NINGUNA ocupa el ancho del panel',
       ajustes.every(f => f.pct <= 90),
       ajustes.filter(f => f.pct > 90).map(f => f.que + ' ' + f.pct + '%'));
  /* Y SON TRES, NI MÁS NI MENOS. Sin esta línea, el día que alguien le ponga
     la clase a media docena de filas la prueba de arriba se quedaría sin nada
     que mirar y seguiría en verde con el panel entero tapando la hoja.
     Fueron cuatro mientras el espaciado fue un riel; volvieron a tres al
     cambiarlo por el mando de tres piezas. El número se escribe a mano y no se
     cambia por «tres o más» a propósito: que aparezca una fila ancha que nadie
     pidió es el mismo defecto que se vigila aquí, solo que por el otro lado. */
  vale('(la prueba es válida) las filas de riel son exactamente tres',
       rieles.length === 3, rieles.map(f => f.que).join(' · '));
  vale('las tres del riel SÍ van anchas, que es lo que se pidió',
       rieles.every(f => f.pct > 90 && f.conFondo),
       rieles.map(f => f.que + ' ' + f.pct + '% · tablilla ' + f.conFondo).join(' · '));
  /* Y la mitad largas es poco: si la media se dispara es que algo volvió a
     estirarse. Los tres rieles ya no están en esta cuenta —van aparte, arriba—
     así que aquí se pide de todas las que quedan. */
  vale('y la mayoría son de verdad estrechas',
       ajustes.filter(f => f.pct <= 70).length >= ajustes.length - 1,
       ajustes.map(f => f.pct).join(' '));
  await pagina.evaluate(async () => {
    document.getElementById('btnVidrio').click();
    await new Promise(z => setTimeout(z, 300));
  });

  /* ---------- el largo del riel no cambia de modo ---------- */
  /* LO QUE SE PIDIÓ, Y LO QUE SE ROMPÍA. Tocar «transparente» dejaba el mismo
     mando con la mitad del recorrido: medido, el riel pasaba de 242 px a 150
     en un teléfono y de unos 505 a 150 en pantalla ancha. Y el recorrido no es
     decoración: cuanto más largo el riel, más fino el ajuste con el mismo
     gesto, que es la razón por la que estas filas son anchas desde que
     existen. Si un riel nuevo se quedara fuera de esta cuenta, el fallo
     volvería por la puerta que nadie mira.

     SE COMPARAN LOS DOS MODOS ENTRE SÍ, no contra un número: cuánto mide el
     riel depende del ancho del panel, de la letra y de la pantalla, así que
     clavar aquí un 242 sería una prueba que falla en otro aparato sin que nada
     esté mal. Lo que se afirma es que no CAMBIA.
     Y se vuelve al modo opaco al final para comprobar que la vuelta también
     deja el riel donde estaba: un largo que va y no vuelve es el mismo fallo
     mirado desde el otro lado. */
  titulo('el riel no cambia de largo al volverse transparente');
  const largos = await pagina.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    const lee = () => ['sepia','contraste','brillo'].map(id =>
      Math.round(document.getElementById(id).getBoundingClientRect().width));
    const vidrio = () => document.getElementById('btnVidrio');
    /* Se parte de opaco, sea cual sea el estado en que lo dejó el bloque de
       arriba: se pregunta por el panel, no se cuentan clics. */
    if (document.getElementById('ajustes').classList.contains('cristal')){
      vidrio().click(); await z(400);
    }
    const opaco = lee();
    vidrio().click(); await z(400);
    const cristal = lee();
    vidrio().click(); await z(400);
    return { opaco, cristal, vuelta: lee(),
             modoFinal: document.getElementById('ajustes').classList.contains('cristal') };
  });
  di('los tres rieles', JSON.stringify(largos));
  vale('(la prueba es válida) los rieles miden algo',
       largos.opaco.every(n => n > 60), largos.opaco.join(' · '));
  vale('EL LARGO NO CAMBIA AL VOLVERSE TRANSPARENTE',
       largos.cristal.every((n, i) => Math.abs(n - largos.opaco[i]) <= 1),
       largos.opaco.join(' · ') + '  →  ' + largos.cristal.join(' · '));
  vale('  ni al volver a opaco',
       largos.vuelta.every((n, i) => Math.abs(n - largos.opaco[i]) <= 1),
       largos.vuelta.join(' · '));
  vale('  (y se quedó en opaco, para lo que viene)',
       largos.modoFinal === false, largos.modoFinal);

  /* ---------- los dos botones de una palabra van iguales ---------- */
  /* TRES ENCARGOS SEGUIDOS SOBRE EL MISMO BOTÓN, y el último deshace al
     primero. Se cuentan porque sin ellos esta prueba parece dar vueltas:

     · «me gustaría que el botón TRANSPARENTE siempre fuera blanco» — era del
       sepia de las tablillas y se perdía entre ellas. Se le puso un blanco
       opaco, y esta prueba afirmaba justamente eso.
     · «¿lo puedes poner con los mismos valores que el de cerrar? parece más
       brillante ahorita», al verlo puesto al lado del otro.

     Y la segunda tiene razón, con el archivo de su parte: los dos botones de
     UNA PALABRA de este programa —el de volver del modo transparente y el de
     CERRAR del pie— se ven iguales, y ese parecido es lo que dice que son la
     misma clase de cosa. El blanco opaco lo rompía.

     ASÍ QUE LO QUE SE AFIRMA AHORA ES LA RELACIÓN, no un color: los dos se
     leen en el mismo rato y en los dos modos, y tienen que dar lo mismo. Un
     color escrito aquí volvería a quedarse viejo al tercer encargo; «iguales»
     no envejece, y de paso caza el fallo por los dos lados —el día que alguien
     toque uno de los dos y no el otro—.

     Y SIGUEN SIENDO DOS MODOS, que es la mitad que se pierde sin querer: el
     botón va encendido —.active— mientras el panel es de cristal, así que sin
     su regla se pondría el dorado de los mandos puestos y sólo se vería en
     transparente. */
  titulo('los dos botones de una palabra se ven iguales');
  const parejos = await pagina.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    const vidrio = () => document.getElementById('btnVidrio');
    const lee = () => {
      const pinta = (e) => { if (!e) return null; const c = getComputedStyle(e);
        return { fondo: c.backgroundColor, tinta: c.color,
                 borde: c.borderTopWidth + ' ' + c.borderTopColor }; };
      return { salida: pinta(vidrio()),
               cerrar: pinta(document.querySelector('#ajustes .pie-cerrar .cerrar-pie')),
               activo: vidrio().classList.contains('active') };
    };
    /* De opaco se parte, se pregunte lo que se pregunte del bloque de arriba. */
    if (document.getElementById('ajustes').classList.contains('cristal')){
      vidrio().click(); await z(400);
    }
    const opaco = lee();
    vidrio().click(); await z(400);
    const cristal = lee();
    vidrio().click(); await z(400);
    return { opaco, cristal, modoFinal:
             document.getElementById('ajustes').classList.contains('cristal') };
  });
  const mismo = (x) => !!x.salida && !!x.cerrar &&
    JSON.stringify(x.salida) === JSON.stringify(x.cerrar);
  di('los dos botones', JSON.stringify(parejos));
  vale('(la prueba es válida) los dos botones están, y son los dos estados',
       !!parejos.opaco.salida && !!parejos.opaco.cerrar &&
       parejos.opaco.activo === false && parejos.cristal.activo === true,
       JSON.stringify({ opaco: parejos.opaco.activo, cristal: parejos.cristal.activo }));
  vale('EN OPACO, EL DE TRANSPARENTE SE PINTA COMO EL DE CERRAR',
       mismo(parejos.opaco),
       JSON.stringify(parejos.opaco.salida) + '  vs  ' + JSON.stringify(parejos.opaco.cerrar));
  vale('Y EN TRANSPARENTE TAMBIÉN, que ahí los dos llevan tablilla',
       mismo(parejos.cristal),
       JSON.stringify(parejos.cristal.salida) + '  vs  ' + JSON.stringify(parejos.cristal.cerrar));
  /* Y QUE NO SEA EL DORADO DE LOS MANDOS PUESTOS. Sin la regla del modo
     cristal, este botón —que va encendido ahí— se pondría el fondo de
     .btn.active, y entonces «iguales» se rompería... salvo que alguien se lo
     pusiera a los dos. Esta línea mira el color por su cuenta: el dorado de la
     casa es #b8892b, mucho más rojo que verde y que azul. */
  vale('  y ninguno de los dos se pone el dorado de «encendido»', (() => {
         const t = c => { const m = /rgba?\(([^)]+)\)/.exec(c || '');
                          return m ? m[1].split(',').map(Number) : null; };
         const dorado = c => { const v = t(c);
           return !!v && v[0] > 150 && v[0] - v[2] > 60; };
         return !dorado(parejos.cristal.salida.fondo) &&
                !dorado(parejos.cristal.cerrar.fondo); })(),
       parejos.cristal.salida.fondo);
  vale('  (y se quedó en opaco, para lo que viene)',
       parejos.modoFinal === false, parejos.modoFinal);

  /* Y LO QUE DE VERDAD SE VE, que es otra cosa. Las líneas de arriba comparan
     lo DECLARADO, y los dos fondos son traslúcidos: el papel del rollo lleva
     un cuarto de transparencia y la tablilla un 6%, así que lo que se pinta
     depende de lo que cada botón tenga detrás. Dos declaraciones iguales
     pueden verse distintas, y la queja que trajo este cambio era justamente de
     las que se ven. Lo levantó la revisión de Codex, y es la segunda vez que
     el banco se queda corto por mirar la hoja de estilo en vez de la pantalla.

     SÓLO EN OPACO, Y ESO LO ENSEÑÓ UNA ROJA. La primera versión medía también
     en modo cristal y salió a 23 de distancia en la máquina del dueño del repo
     contra 11 en ésta. No es que un botón cambiara: en cristal el panel se
     queda sin papel y lo que hay detrás de cada uno es EL LIBRO —texto
     distinto bajo cada botón, y distinto según dónde esté leyendo cada uno—.
     Esa medida habla de la página, no de los botones, y un número ahí sólo
     mide en qué renglón se quedó la máquina. En opaco lo de detrás es el
     degradado del propio panel, que es siempre el mismo: 4 aquí, 5 allí.

     SE MIDE EL PAPEL, NO LA TINTA: de la captura de cada botón se recorre la
     fila de en medio y se toma el píxel más claro, que en los dos es el fondo.
     Un punto fijo cae encima de la palabra en el botón estrecho —probado, daba
     el color de la letra— y entonces esto compararía letras.

     LA HOLGURA ES DE 16 y ahora tiene sitio de sobra por los dos lados: lo
     bueno mide 4 y 5 en las dos máquinas, y lo malo —devolviéndole el blanco
     opaco de ayer con un addStyleTag— sube a 19. */
  const lupa = await sesion.navegador.newPage();
  await lupa.setContent('<canvas id="c"></canvas>');
  const papelDe = async (sel) => {
    const b64 = (await pagina.locator(sel).screenshot()).toString('base64');
    return lupa.evaluate(async (d) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + d; });
      const c = document.getElementById('c');
      c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      const fila = cx.getImageData(0, Math.round(img.height / 2), img.width, 1).data;
      let mejor = [0, 0, 0], luz = -1;
      for (let i = 0; i < fila.length; i += 4){
        const l = .2126*fila[i] + .7152*fila[i+1] + .0722*fila[i+2];
        if (l > luz){ luz = l; mejor = [fila[i], fila[i+1], fila[i+2]]; }
      }
      return mejor;
    }, b64);
  };
  const pintadoSalida = await papelDe('#btnVidrio');
  const pintadoCerrar = await papelDe('#ajustes .pie-cerrar .cerrar-pie');
  await lupa.close();
  const lejosPintado = Math.max(...pintadoSalida.map((v, i) => Math.abs(v - pintadoCerrar[i])));
  di('lo pintado en opaco', JSON.stringify({ salida: pintadoSalida,
                                             cerrar: pintadoCerrar, lejos: lejosPintado }));
  vale('(la prueba es válida) se leyó papel y no tinta en los dos',
       pintadoSalida[0] > 150 && pintadoCerrar[0] > 150,
       JSON.stringify([pintadoSalida, pintadoCerrar]));
  vale('Y PINTADOS SE PARECEN, no sólo declarados',
       lejosPintado <= 16, lejosPintado + ' puntos de diferencia');

  /* ---------- el velo se aparta con el panel transparente ---------- */
  /* LO QUE SE PIDIÓ: «los tabs abren y se pone un background transparente-negro
     detrás; ¿podrías hacerlo menos negro?». De las opciones que se le
     enseñaron eligió la segunda —dejarlo como está en opaco y casi apagarlo en
     transparente— con el valor .12 contra el .44 de siempre. «Casi, pero no
     totalmente.» Al día siguiente, viéndolo puesto, lo bajó a .08. El número
     exacto es suyo y no hay cuenta que lo dé; por eso lo que se afirma abajo
     es la RELACIÓN —mucho más claro que en opaco, y no cero— y no la cifra:
     una prueba clavada en .12 habría salido roja por un cambio que era el
     encargo, no el fallo.

     POR QUÉ SÓLO EN TRANSPARENTE: el velo está para que el panel no compita
     con el libro, que son los dos de papel claro. Pero tocar «transparente» es
     pedir ver el libro mientras se ajusta —para eso está el botón—, y ahí el
     velo apaga justo lo que se está mirando.

     LAS TRES QUE SE VIGILAN, y las tres se rompen en silencio:

     · EN OPACO NO CAMBIA NADA. Sin esta línea, alguien que aclare el velo de
       golpe pasa igual de verde y se lleva por delante el encargo de antes.
     · EN TRANSPARENTE SE ACLARA, PERO SIGUE AHÍ. Los dos lados: un velo al
       mismo negro no hace nada por lo que se pidió, y uno a cero deja de decir
       que hay algo delante, que es el «no totalmente» del dueño.
     · Y VUELVE SOLO AL ABRIR OTRA SECCIÓN. Ésta es la que de verdad puede
       fallar, y falló en la primera versión: el modo transparente se QUEDA
       puesto en Formato, así que atar el velo a la clase del panel dejaba la
       escena con el velo claro delante de GLOSAS, que es de papel. La cuenta
       buena son las dos cosas a la vez —el panel vivo es Formato y Formato
       está en transparente—, y eso sólo se ve abriendo otra sección después.

     SE LEE EL COLOR PINTADO, no la clase de la escena: la clase es la orden y
     el color es lo que ve el lector. Si mañana el modo se enciende por otro
     camino, esto sigue midiendo lo mismo. */
  titulo('el velo se aparta cuando el panel se vuelve transparente');
  const velos = await pagina.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    /* La alfa del fondo pintado. Sin fondo o transparente, 0. */
    const alfa = () => {
      const v = document.getElementById('veloPanel');
      if (!v) return null;
      const c = getComputedStyle(v).backgroundColor;
      const m = /rgba?\(([^)]+)\)/.exec(c);
      if (!m) return null;
      const t = m[1].split(',');
      return t.length > 3 ? +t[3] : 1;
    };
    const lee = () => ({ alfa: alfa(),
                         /* el velo encendido: si estuviera a opacidad 0 la
                            alfa del fondo no diría nada de lo que se ve */
                         opacidad: +getComputedStyle(
                           document.getElementById('veloPanel')).opacity });
    const vidrio = () => document.getElementById('btnVidrio');
    const irA = async (sec) => {
      const vis = () => [...document.querySelectorAll('.rollo')]
        .find(r => getComputedStyle(r).display !== 'none');
      const t = (vis() || document).querySelector('.pestanas [data-sec="' + sec + '"]');
      if (t) t.click();
      await z(800);
    };
    if (document.getElementById('ajustes').classList.contains('cristal')){
      vidrio().click(); await z(500);
    }
    /* SE ESPERA ANTES DE LA PRIMERA LECTURA, y esto costó una tanda roja. El
       velo cambia de color con una transición de medio segundo, y el bloque de
       arriba deja el panel recién devuelto a opaco: leer enseguida pilla el
       color a mitad de camino. Medido en la corrida del dueño: 0,435 donde
       tenía que decir 0,44, y la diferencia bastaba para tumbar dos líneas.
       Mi sondeo no lo vio porque empezaba con el panel quieto desde hacía
       rato: el fallo sólo aparece detrás del bloque que toca el botón. */
    await z(700);
    const opaco = lee();
    vidrio().click(); await z(700);
    const cristal = lee();
    /* Sin tocar el botón: se cambia de sección, que es lo que hace el lector.
       Formato se queda en transparente por dentro. */
    await irA('glosas');
    const enGlosas = lee();
    const modoFormato = document.getElementById('ajustes')
                          .classList.contains('cristal');
    await irA('formato');
    const alVolver = lee();
    vidrio().click(); await z(500);
    return { opaco, cristal, enGlosas, alVolver, modoFormato,
             modoFinal: document.getElementById('ajustes')
                          .classList.contains('cristal') };
  });
  di('el velo por modos', JSON.stringify(velos));
  vale('(la prueba es válida) el velo está encendido en los cuatro momentos',
       [velos.opaco, velos.cristal, velos.enGlosas, velos.alVolver]
         .every(v => v && v.opacidad > .9),
       [velos.opaco, velos.cristal, velos.enGlosas, velos.alVolver]
         .map(v => v && v.opacidad).join(' · '));
  /* LA HOLGURA ES DE UN ENTERO DE 255, no de un pelo: el color pintado se
     redondea a ocho bits por canal, así que .44 se lee a veces como 0,439 y el
     que compare con igualdad exacta —o con media milésima— se pasa la vida
     cazando ruido. Un décimo de milésima no distingue nada que importe; lo que
     estas líneas tienen que distinguir es .44 de .12. */
  const CERCA = (a, b) => Math.abs(a - b) <= .01;
  vale('EN OPACO EL VELO SIGUE SIENDO EL DE SIEMPRE',
       CERCA(velos.opaco.alfa, .44), velos.opaco.alfa);
  vale('Y CON EL PANEL TRANSPARENTE SE APARTA',
       velos.cristal.alfa < velos.opaco.alfa / 2, velos.cristal.alfa);
  vale('  pero no se apaga del todo, que es lo que se pidió',
       velos.cristal.alfa > 0, velos.cristal.alfa);
  vale('(la prueba es válida) Formato se quedó en transparente al irse',
       velos.modoFormato === true, velos.modoFormato);
  vale('EL VELO VUELVE ENTERO EN OTRA SECCIÓN, aunque Formato siga transparente',
       CERCA(velos.enGlosas.alfa, velos.opaco.alfa), velos.enGlosas.alfa);
  vale('  y se vuelve a apartar al volver a Formato',
       CERCA(velos.alVolver.alfa, velos.cristal.alfa), velos.alVolver.alfa);
  vale('  (y se quedó en opaco, para lo que viene)',
       velos.modoFinal === false, velos.modoFinal);

  /* ---------- los paneles imitan el brillo, no el contraste ---------- */
  /* LO QUE SE PIDIÓ, EN DOS TIEMPOS. Primero los dos efectos: «podemos cambiar
     el brillo y el contraste, y eso aplica al tab LIBRO; ¿podríamos hacer que
     también afecte a todas las pestañas arriba, excepto ORACIÓN?». Se hizo, lo
     vio puesto y lo acotó: «para LIBROS, GLOSAS, ENCUENTROS y RESPALDO vamos a
     imitar el brillo que se escogió para el LIBRO, pero no el contraste», y
     Formato con ellos. Esta prueba se dio la vuelta con él.

     LAS CINCO COSAS QUE SE VIGILAN, y todas se rompen en silencio:

     · LOS CUATRO PANELES DE PAPEL RECIBEN EL BRILLO, con el MISMO número que
       la hoja. No basta con que tengan algo puesto: si uno se quedara con un
       número viejo, la pestaña se leería con otra luz que el libro y nadie
       sabría por qué.
     · Y NO RECIBEN EL CONTRASTE. Es la mitad nueva del encargo, y la que se
       perdería sola el día que alguien junte otra vez las dos declaraciones
       del CSS en un solo selector.
     · ORACIÓN, NI UNO NI OTRO. Es la única pestaña excluida entera, y la que
       un `.rollo` a secas se llevaría por delante sin avisar.
     · FORMATO SÍ EN OPACO Y NO EN CRISTAL. Las dos mitades, porque cada una
       cae de un lado distinto del selector: quitar el `:not(.cristal)` rompe
       la segunda y quitar el `.rollo` rompe la primera.
     · Y EL NÚMERO SIGUE AL RIEL. Ésta es la que salva al bloque: sin ella,
       todas las de arriba saldrían verdes con el brillo clavado en un valor
       fijo, que es lo mismo que no tenerlo.

     SE LEE EL `filter` PINTADO de cada panel, no la hoja de estilos: lo que
     importa es lo que le llega al elemento, venga del selector que venga. */
  titulo('los paneles imitan el brillo del libro, pero no su contraste');
  const porPanel = async () => pagina.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const vis = () => [...document.querySelectorAll('.rollo')]
      .find(r => getComputedStyle(r).display !== 'none');
    const irA = async sec => {
      const t = (vis() || document).querySelector('.pestanas [data-sec="' + sec + '"]');
      if (t) t.click();
      await pausa(800);
    };
    const DONDE = { libros:'canto', glosas:'etiquetas', encuentros:'encuentros',
                    respaldo:'respaldo', oracion:'oracion', formato:'ajustes' };
    const out = { hoja: getComputedStyle(document.getElementById('pg')).filter };
    for (const sec of Object.keys(DONDE)){
      await irA(sec);
      out[sec] = getComputedStyle(document.getElementById(DONDE[sec])).filter;
    }
    /* Y Formato en transparente, sin cambiar de pestaña: se toca su botón. */
    document.getElementById('btnVidrio').click();
    await pausa(700);
    out.formatoCristal = getComputedStyle(document.getElementById('ajustes')).filter;
    document.getElementById('btnVidrio').click();
    await pausa(500);
    return out;
  });
  /* EL RIEL SE PONE EN UN VALOR CONOCIDO ANTES DE MIRAR, y esto salió de una
     tanda roja. El bloque medía con el contraste que hubiera dejado lo de
     arriba, movía el riel al tope y exigía que el filtro hubiera cambiado; el
     día que lo de arriba dejó el riel ya en 200, el «antes» y el «después»
     salieron idénticos —contrast(2) los dos— y el testigo se cantó a sí mismo.
     La aserción tenía razón: no se había movido nada. Lo que estaba mal era
     dar por sabido un valor de partida que no pone esta prueba. Ahora los dos
     extremos los fija ella, y el testigo mide lo que dice medir. */
  const partida = await ponerContraste(pagina, 100);
  await ponerRiel(pagina, 'brillo', 70);
  vale('(la prueba es válida) se parte de un contraste conocido',
       factorDe(partida.pg) === 1, partida.pg);
  const conFiltro = await porPanel();
  di('el filter de cada panel', JSON.stringify(conFiltro));
  vale('(la prueba es válida) la hoja lleva los dos efectos puestos',
       brilloDe(conFiltro.hoja) === .7 && /contrast\(/.test(conFiltro.hoja),
       conFiltro.hoja);
  const DE_PAPEL = ['libros','glosas','encuentros','respaldo'];
  vale('LOS CUATRO PANELES DE PAPEL LLEVAN EL BRILLO DE LA HOJA',
       DE_PAPEL.every(k => brilloDe(conFiltro[k]) === brilloDe(conFiltro.hoja)),
       DE_PAPEL.map(k => k + ' ' + conFiltro[k]).join(' · '));
  vale('Y NO SU CONTRASTE, que es la otra mitad del encargo',
       DE_PAPEL.every(k => sinContraste(conFiltro[k])),
       DE_PAPEL.map(k => k + ' ' + conFiltro[k]).join(' · '));
  vale('ORACIÓN, ni uno ni otro',
       conFiltro.oracion === 'none', conFiltro.oracion);
  vale('FORMATO como los otros cuatro, con el panel opaco',
       brilloDe(conFiltro.formato) === brilloDe(conFiltro.hoja) &&
       sinContraste(conFiltro.formato), conFiltro.formato);
  vale('  y limpio del todo cuando se vuelve transparente',
       conFiltro.formatoCristal === 'none', conFiltro.formatoCristal);
  /* EL TESTIGO DEL BLOQUE: se mueve el riel y el número tiene que moverse en
     los dos sitios a la vez. Sin esto, un filtro clavado pasaría todo lo de
     arriba sin hacer nada de lo que se pidió. */
  /* EL TESTIGO SE MUEVE CON EL RIEL DEL BRILLO, que es el que ahora comparten
     la hoja y los paneles. Con el del contraste no valdría: el panel ya no lo
     recibe, así que moverlo dejaría los paneles quietos —bien— y el testigo no
     distinguiría eso de un filtro clavado. */
  await ponerRiel(pagina, 'brillo', 50);
  const alTope = await porPanel();
  await ponerRiel(pagina, 'brillo', 100);     /* se devuelve a lo de fábrica */
  await ponerContraste(pagina, 125);
  di('con el brillo abajo', JSON.stringify({ hoja: alTope.hoja, libros: alTope.libros }));
  vale('(la prueba es válida) mover el riel cambia el brillo de la hoja',
       brilloDe(alTope.hoja) === .5 && brilloDe(alTope.hoja) !== brilloDe(conFiltro.hoja),
       conFiltro.hoja + '  →  ' + alTope.hoja);
  vale('Y EL DE LOS PANELES SE MUEVE CON ELLA',
       DE_PAPEL.every(k => brilloDe(alTope[k]) === brilloDe(alTope.hoja)),
       DE_PAPEL.map(k => k + ' ' + alTope[k]).join(' · '));
  vale('  sin estrenar contraste por el camino',
       DE_PAPEL.every(k => sinContraste(alTope[k])),
       DE_PAPEL.map(k => k + ' ' + alTope[k]).join(' · '));
  vale('  ni arrastrar a ORACIÓN', alTope.oracion === 'none', alTope.oracion);

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
    /* EL CONTRASTE NO LLEGA A FORMATO, y esta línea ha dicho las tres cosas
       posibles en tres días: primero «el panel se queda limpio», que era la
       regla vieja; luego «lo recibe igual que la hoja», cuando se pidió que
       los paneles se tiñeran; y ahora otra vez limpio DE CONTRASTE, porque al
       verlo puesto se acotó a sólo el brillo. Lo que cambia es el encargo, no
       el programa, y por eso la línea se da la vuelta en vez de borrarse.
       El brillo sí llega, y eso lo vigila el lazo del brillo, más abajo.
       Se mira con el modo delante: en cristal no llega ninguno de los dos, y
       una aserción que no sepa en qué modo está no prueba nada. */
    vale('(la prueba es válida) el panel está opaco · ' + pct + '%',
         s.cristal === false, s.cristal);
    vale('FORMATO no recibe el contraste · ' + pct + '%',
         sinContraste(s.ajustes), s.ajustes);
    /* .stage sí trae filtro propio —la sombra de hoja flotando en
       escritorio— pero NO puede traer contraste, y ésta es la línea que de
       verdad sostiene el bloque desde que los paneles sí se tiñen: es la que
       separa «se escribió en cada pieza» de «se escribió en el padre y se lo
       llevó todo por delante», ORACIÓN incluida. */
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
       cruce.trasContraste.sepia === '100', cruce.trasContraste.sepia);
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
    const t = document.querySelector('.pestanas button[data-sec="formato"]');
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
  /* Y EL PANEL DESDE EL QUE SE ARRASTRA NO SE CONTRASTA CON ÉL. Ver la regla 2
     de la cabecera: del contraste queda fuera, del brillo no. */
  vale('(la prueba es válida) el panel está opaco', conPanel.cristal === false, conPanel.cristal);
  vale('y el panel que lo manda no se contrasta con él',
       sinContraste(conPanel.ajustes), conPanel.ajustes);
  /* Los colores del panel, apuntados para poder mirarlos en la corrida. Ya no
     son una aserción: desde que el panel se tiñe con la hoja, su color depende
     del riel y clavar aquí un número sería escribir a mano lo que el filtro
     calcula. Lo que se afirma del filtro se afirma arriba, por su propiedad. */
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
  vale('y FORMATO nace sin contraste', sinContraste(tras.ajustes), tras.ajustes);

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
  /* 125, que es el arranque de fábrica: unos ajustes sin el campo abren igual
     que quien abre por primera vez. */
  vale('se queda en el 125 de fábrica', fabrica.riel === '125' && fabrica.medida === '125%',
       fabrica.riel + ' / ' + fabrica.medida);
  /* 100 y no 20: el recorrido de más arriba empieza borrando los ajustes, así
     que el sepia volvió a su valor de fábrica antes de guardarse. Lo que aquí
     se comprueba es que quitarle el contraste al archivo no se lleva por
     delante lo demás. */
  vale('y el resto del archivo se respetó', fabrica.sepia === '100', fabrica.sepia);
  vale('y el filtro de fábrica es el de 125%', factorDe(fabrica.pg) === 1.25, fabrica.pg);

  /* ---------- el texto se sigue pudiendo agarrar ---------- */
  titulo('un filtro no convierte la hoja en una estampa');
  /* ESTE BLOQUE AFIRMABA QUE EL TEXTO SE PODÍA SELECCIONAR, y ya no puede: el
     pasaje se glosa pintándolo con el dedo y user-select:none es a propósito,
     no un descuido. Pero lo que este bloque vigilaba de verdad sigue haciendo
     falta, y es otra cosa: que un filtro no convierta la hoja en una estampa
     que se mira y no se toca. Apagar pointer-events es la manera fácil de
     «arreglar» un filtro que estorba, y sería un desastre.
     Así que la pregunta cambia de sitio: en vez de la selección, se pinta una
     glosa de verdad con el filtro al 200 %, que es el gesto que este programa
     necesita que siga funcionando ahí. */
  const seleccion = await pagina.evaluate(async () => {
    const r = document.getElementById('contraste');
    r.value = '200'; r.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 150));
    const v = document.querySelector('#pgBody .v');
    if (!v) return { falta:'un versículo' };
    const abrio = await window.__glosarEn(v, 0, 16);
    const cs = getComputedStyle(v);
    return { abrio,
             /* y que sea a propósito, no un filtro que se comió el texto */
             sinSeleccion: cs.userSelect === 'none' ||
                           cs.webkitUserSelect === 'none',
             recibeElDedo: getComputedStyle(document.getElementById('pg'))
                             .pointerEvents !== 'none' };
  });
  di('glosando a 200%', seleccion);
  vale('SE PUEDE GLOSAR CON EL FILTRO PUESTO', seleccion.abrio === true, seleccion.abrio);
  vale('y el pasaje no se selecciona, que es lo pedido', seleccion.sinSeleccion === true);
  vale('y la hoja sigue recibiendo el dedo', seleccion.recibeElDedo === true);

  /* ---------- el brillo, y que los tres no se pisen ---------- */
  titulo('el brillo vive en la misma cadena y no borra al contraste');
  const sitioBrillo = await pagina.evaluate(() => {
    const r = document.getElementById('brillo');
    if (!r) return { falta:'el riel' };
    const filas = [...document.querySelectorAll('#ctrlConfig .ajuste')];
    const nombre = f => (f.querySelector('.lbl') || {}).textContent;
    const i = filas.indexOf(r.closest('.ajuste'));
    return { orden: filas.slice(Math.max(0,i-1), i+2).map(nombre),
             clases: [...r.closest('.ajuste').classList].join(' '),
             aria: r.getAttribute('aria-label'),
             min:r.min, max:r.max, step:r.step, valor:r.value,
             medida: document.getElementById('brilloAhora').textContent };
  });
  di('el brillo', sitioBrillo);
  /* Lo que importa es la PAREJA: el brillo pegado debajo del contraste, que
     es donde se busca. Lo que venga después ya no es asunto de esta prueba
     —el panel de Formato ha ganado filas desde entonces, y exigir la de
     abajo hacía cantar fallo a cada fila nueva sin que nada se hubiera
     roto—, así que se enseña pero no se exige. */
  vale('va justo debajo del contraste',
       sitioBrillo.orden[0] === 'contraste' && sitioBrillo.orden[1] === 'brillo',
       sitioBrillo.orden);
  vale('con las clases de siempre', sitioBrillo.clases === 'ajuste ancho riel-fila', sitioBrillo.clases);
  /* 50–100, Y EL TOPE DE ARRIBA ES EL NEUTRO: este riel sólo baja la luz. Fue
     50–150 y el dueño del repo lo recortó al verlo puesto —«el control de
     brillo, que varía de 50% a 100% solamente»—. */
  vale('rango 50–100 de uno en uno y neutro en 100, que es el tope',
       sitioBrillo.min === '50' && sitioBrillo.max === '100' &&
       sitioBrillo.step === '1' && sitioBrillo.valor === '100',
       sitioBrillo.min + '–' + sitioBrillo.max + ' en ' + sitioBrillo.valor);
  vale('tiene nombre accesible', sitioBrillo.aria === 'brillo', sitioBrillo.aria);

  for (const [pct, factor] of [[50,.5],[75,.75],[100,1]]){
    await ponerRiel(pagina, 'brillo', pct);
    const f = await pagina.evaluate(() => ({
      pg: getComputedStyle(document.getElementById('pg')).filter,
      fx: getComputedStyle(document.getElementById('fx')).filter,
      ajustes: getComputedStyle(document.getElementById('ajustes')).filter,
      medida: document.getElementById('brilloAhora').textContent }));
    di(pct + '%', f);
    vale('la hoja lo recibe · ' + pct + '%', brilloDe(f.pg) === factor, f.pg);
    vale('y el lienzo el mismo · ' + pct + '%', brilloDe(f.fx) === factor, f.fx);
    vale('el número dice el % · ' + pct + '%', f.medida === pct + '%', f.medida);
    /* Y EL BRILLO SÍ LLEGA AL PANEL, que es la mitad que se conserva del
       encargo. Con esta línea y la del contraste de arriba, las dos mitades
       quedan dichas y ninguna puede irse sola sin que se note. */
    vale('FORMATO recibe el brillo igual · ' + pct + '%', brilloDe(f.ajustes) === factor, f.ajustes);
  }

  /* LOS TOPES, saltándose el riel a propósito. */
  for (const [pide, queda] of [[10,50],[400,100]]){
    await ponerRiel(pagina, 'brillo', pide);
    const m = await pagina.evaluate(() => document.getElementById('brilloAhora').textContent);
    vale('pedir ' + pide + '% se queda en ' + queda + '%', m === queda + '%', m);
  }

  /* LOS TRES A LA VEZ, que es el caso que rompería una segunda propiedad
     filter: el brillo borraría al contraste o al revés. Y el sepia, que no es
     filtro sino rampa de papel y tinta, tiene que seguir a lo suyo. */
  titulo('los tres a la vez, en los dos órdenes');
  const tres = await pagina.evaluate(async () => {
    const meter = async (id, v) => { const r = document.getElementById(id);
      r.value = String(v); r.dispatchEvent(new Event('input', { bubbles:true }));
      await new Promise(z => setTimeout(z, 300)); };
    const foto = () => ({
      filtro: getComputedStyle(document.getElementById('pg')).filter,
      papel:  getComputedStyle(document.getElementById('pg')).backgroundColor,
      c: document.getElementById('contrasteAhora').textContent,
      b: document.getElementById('brilloAhora').textContent,
      s: document.getElementById('sepiaAhora').textContent });
    await meter('contraste', 150);
    await meter('brillo', 80);
    await meter('sepia', 40);
    const trasTodo = foto();
    /* y ahora al revés: mover el contraste no puede tirar el brillo */
    await meter('contraste', 80);
    const trasContraste = foto();
    await meter('brillo', 60);
    const trasBrillo = foto();
    return { trasTodo, trasContraste, trasBrillo };
  });
  di('los tres puestos', tres.trasTodo);
  di('luego el contraste', tres.trasContraste);
  di('luego el brillo', tres.trasBrillo);
  vale('los tres conviven',
       factorDe(tres.trasTodo.filtro) === 1.5 && brilloDe(tres.trasTodo.filtro) === 0.8 &&
       tres.trasTodo.s === '40', tres.trasTodo.filtro + ' · sepia ' + tres.trasTodo.s);
  vale('mover el contraste no borra el brillo',
       brilloDe(tres.trasContraste.filtro) === 0.8 && factorDe(tres.trasContraste.filtro) === 0.8,
       tres.trasContraste.filtro);
  vale('mover el brillo no borra el contraste',
       factorDe(tres.trasBrillo.filtro) === 0.8 && brilloDe(tres.trasBrillo.filtro) === 0.6,
       tres.trasBrillo.filtro);
  vale('y ninguno de los dos movió el sepia',
       tres.trasContraste.s === '40' && tres.trasBrillo.s === '40', tres.trasBrillo.s);
  vale('el sepia sigue mandando en el papel, no el filtro',
       tres.trasBrillo.papel === tres.trasTodo.papel, tres.trasBrillo.papel);

  /* ---------- y sobrevive a la recarga, con el contraste ---------- */
  titulo('el brillo también vuelve tras recargar');
  const guardadoB = await pagina.evaluate(() =>
    JSON.parse(localStorage.getItem('glossa:ajustes:v1') || 'null'));
  di('lo guardado', { contraste: guardadoB && guardadoB.contraste,
                      brillo: guardadoB && guardadoB.brillo,
                      sepia: guardadoB && guardadoB.sepia, v: guardadoB && guardadoB.v });
  vale('el brillo se guardó', guardadoB && guardadoB.brillo === 60, guardadoB && guardadoB.brillo);
  await pagina.reload();
  await pagina.waitForTimeout(2600);
  const trasB = await pagina.evaluate(() => ({
    riel: document.getElementById('brillo').value,
    medida: document.getElementById('brilloAhora').textContent,
    rielC: document.getElementById('contraste').value,
    filtro: getComputedStyle(document.getElementById('pg')).filter }));
  di('tras recargar', trasB);
  vale('el riel del brillo vuelve en 60', trasB.riel === '60' && trasB.medida === '60%',
       trasB.riel + ' / ' + trasB.medida);
  vale('y el contraste con él', trasB.rielC === '80', trasB.rielC);
  vale('la hoja nace con los dos puestos',
       brilloDe(trasB.filtro) === 0.6 && factorDe(trasB.filtro) === 0.8, trasB.filtro);

  /* unos ajustes sin brillo se quedan en el neutro */
  await pagina.evaluate(() => {
    const c = 'glossa:ajustes:v1';
    const a = JSON.parse(localStorage.getItem(c));
    delete a.brillo; localStorage.setItem(c, JSON.stringify(a));
  });
  await pagina.reload();
  await pagina.waitForTimeout(2600);
  const sinB = await pagina.evaluate(() => ({
    riel: document.getElementById('brillo').value,
    medida: document.getElementById('brilloAhora').textContent,
    rielC: document.getElementById('contraste').value,
    filtro: getComputedStyle(document.getElementById('pg')).filter }));
  di('ajustes sin el campo brillo', sinB);
  vale('el brillo vuelve a su 100 neutro',
       sinB.riel === '100' && sinB.medida === '100%' && brilloDe(sinB.filtro) === 1,
       sinB.riel + ' · ' + sinB.filtro);
  vale('sin llevarse el contraste por delante', sinB.rielC === '80', sinB.rielC);

  /* ──────────────────────────────────────────────────────────────
     EL ESPACIADO DEL LIBRO, Y DÓNDE NO CAE.

     Este bloque vive aquí y no en otra suite por lo que esta suite sabe hacer:
     su asunto es exactamente ése —dónde cae un ajuste del panel de Formato y
     dónde NO—, que es lo que el encargo dice con dos palabras, «excepto las
     glosas». Un ajuste que se derrama sobre la nota se rompe en silencio, como
     se rompía el filtro sobre el propio riel.

     Se miden las DOS direcciones, que son dos fallos distintos: que llegue al
     texto (se rompe si alguien quita la variable de .pg) y que NO llegue a la
     glosa (se rompe si alguien borra la línea de .gl que la saca de ahí). Una
     sola de las dos dejaría pasar la mitad.

     AQUÍ SE MEDÍA TAMBIÉN UNA NEGRITA, y se fue del programa: «el bold no
     ayuda a ver mejor el texto». Lo que queda de ella en este bloque es una
     línea que exige que el peso NO se mueva — devolver una casilla sin querer
     es tan fácil como quitarla, y el sitio donde se notaría es justo éste.

     Y la línea de validez es la de siempre: si el riel no hubiera movido nada,
     «la glosa no cambió» saldría verde sin haber probado nada. */
  titulo('el espaciado llega al libro y NO a la glosa');
  await conGlosas(pagina);
  /* Y A UNA HOJA QUE DE VERDAD LAS TENGA, que es lo que faltaba y lo tumbó en
     el banco: `texto true · glosa false`. Poner las glosas de ejemplo en el
     almacén no las pone delante — el fichero glosa pasajes de Mateo a
     Apocalipsis, y esta suite estaba leyendo en otro sitio, así que había
     texto que medir y ninguna nota. Se va a Mateo 1, donde vive la primera
     (`eco-mat-1-1`), conservando lo demás de los ajustes: el contraste que
     dejó el bloque de arriba es lo que miden los de abajo. */
  await pagina.evaluate(() => {
    const c = 'glossa:ajustes:v1';
    const a = JSON.parse(localStorage.getItem(c) || '{}') || {};
    a.v = 1; a.libro = 'MAT'; a.cap = 1; a.vers = 1;
    localStorage.setItem(c, JSON.stringify(a));
  });
  await pagina.reload();
  await pagina.waitForTimeout(2800);
  const letra = await pagina.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const vis = () => [...document.querySelectorAll('.rollo, #canto')]
      .find(r => getComputedStyle(r).display !== 'none');
    const irA = async (sec) => {
      if (!vis()){ document.getElementById('pgCabeza').click(); await pausa(900); }
      const t = (vis()||document).querySelector('.pestanas [data-sec="'+sec+'"]');
      if (t){ t.click(); await pausa(950); }
    };
    const lee = () => {
      const v = document.querySelector('#pgBody .v');
      const g = document.querySelector('.gl');
      const c = e => e ? getComputedStyle(e) : null;
      const cv = c(v), cg = c(g);
      return { hayTexto: !!v, hayGlosa: !!g,
               libroPeso: cv && cv.fontWeight, libroEsp: cv && cv.letterSpacing,
               glosaPeso: cg && cg.fontWeight, glosaEsp: cg && cg.letterSpacing };
    };
    const antes = lee();
    await irA('formato');
    /* CADA MEDIDA DEL LIBRO VA DETRÁS DE UN CIERRE, y no es un rodeo: desde
       que Formato opaco enseña la muestra de la letra, estos tres mandos
       escriben en la muestra y el libro espera al botón de CERRAR. Medir el
       libro con el panel delante daba `normal → normal` —el libro, obediente,
       esperando— y tumbaba estas líneas con todo bien puesto. Así que se hace
       lo que hace el lector: se elige, se cierra, y entonces se mira. */
    const confirmar = async () => {
      const b = document.querySelector('#ajustes .pie-cerrar .cerrar-pie');
      if (b) b.click();
      await pausa(1100);
    };
    /* El mando es el mismo que el del tamaño: menos, lista, más. Se va al tope
       por la lista —que es donde más se nota— y luego se baja un punto con el
       botón, que es la otra mitad del mando y se rompe aparte. */
    const s = document.getElementById('espAhora');
    const topes = [...s.options].map(o => +o.value);
    s.value = String(Math.max(...topes));
    s.dispatchEvent(new Event('change', { bubbles:true }));
    await pausa(400);
    await confirmar();
    const despues = lee();
    await irA('formato');
    document.getElementById('espDown').click();
    await pausa(500);
    const valor = +s.value;
    await confirmar();
    const trasElBoton = { ...lee(), valor };
    /* y se devuelve a lo de fábrica, que los bloques de abajo miden colores
       sobre una hoja que no tiene por qué llevar ajustes encima */
    await irA('formato');
    s.value = '0'; s.dispatchEvent(new Event('change', { bubbles:true }));
    await pausa(400);
    await confirmar();
    return { antes, despues, trasElBoton, devuelto: lee(),
             topes: { min: Math.min(...topes), max: Math.max(...topes),
                      cuantos: topes.length } };
  });
  di('el libro', letra.antes.libroPeso + ' / ' + letra.antes.libroEsp +
     '  →  ' + letra.despues.libroPeso + ' / ' + letra.despues.libroEsp);
  di('la glosa', letra.antes.glosaPeso + ' / ' + letra.antes.glosaEsp +
     '  →  ' + letra.despues.glosaPeso + ' / ' + letra.despues.glosaEsp);
  vale('(la prueba es válida) hay texto y hay glosa que mirar',
       letra.antes.hayTexto && letra.antes.hayGlosa,
       'texto ' + letra.antes.hayTexto + ' · glosa ' + letra.antes.hayGlosa);
  vale('EL ESPACIADO LLEGA AL TEXTO DEL LIBRO',
       letra.antes.libroEsp !== letra.despues.libroEsp,
       letra.antes.libroEsp + ' → ' + letra.despues.libroEsp);
  vale('  y el botón de menos baja un tope, no dos',
       letra.trasElBoton.valor === letra.topes.max - 1, letra.trasElBoton.valor);
  vale('Y LA GLOSA NO SE ENTERA',
       letra.despues.glosaEsp === letra.antes.glosaEsp, letra.despues.glosaEsp);
  /* Y EL PESO NO SE MUEVE, ni aquí ni en la nota: la negrita se quitó del
     programa y esta línea es la que se cae el día que alguien la devuelva sin
     querer. */
  vale('  y nada de esto engorda la letra',
       letra.despues.libroPeso === letra.antes.libroPeso &&
       letra.despues.glosaPeso === letra.antes.glosaPeso,
       letra.despues.libroPeso + ' / ' + letra.despues.glosaPeso);
  /* El mando es de ajuste FINO y sus topes lo dicen: de −2 a +5 centésimas de
     em, ocho en total. Si alguien lo abre a lo bestia —0.12 em son 12— esto lo
     canta, y si alguien deja la lista a medio armar, también. */
  vale('  y el mando sigue siendo de ajuste fino',
       letra.topes.min >= -5 && letra.topes.max <= 8 && letra.topes.cuantos ===
         letra.topes.max - letra.topes.min + 1,
       letra.topes.min + ' … ' + letra.topes.max + ' (' + letra.topes.cuantos + ' topes)');
  vale('  y todo vuelve a lo de fábrica al soltarlo',
       letra.devuelto.libroPeso === letra.antes.libroPeso &&
       letra.devuelto.libroEsp === letra.antes.libroEsp,
       letra.devuelto.libroPeso + ' / ' + letra.devuelto.libroEsp);

  /* ──────────────────────────────────────────────────────────────
     Y EL ESPACIO ENTRE PALABRAS NO SE LLEVA SU PARTE.

     Encargo del dueño del repo después de probarlo: «no quiero que haya
     espacio extra entre palabras». El navegador no distingue —letter-spacing
     se añade DESPUÉS DE CADA CARÁCTER y el espacio es uno más—, así que entre
     dos palabras entraban DOS medidas, la de la última letra y la del propio
     espacio, contra una sola entre dos letras: a +5 el texto no se separaba,
     se deshilachaba. El descuento va en word-spacing y quita las dos; está
     contado en .pg.

     CÓMO SE MIDE, Y POR QUÉ NO CON UN RECTÁNGULO. Medir «el ancho del espacio»
     no sirve: el rectángulo de un Range no incluye el tracking que va detrás
     del último carácter, así que da un número que no es el avance y se puede
     leer al revés —pasó al escribir esto—. Lo que se mide es la CUENTA: un
     trozo de C caracteres con S espacios, a 0 y al tope. Sin descuento
     crecería C·L; con el de una medida, (C−S)·L; con el de las dos —el que se
     pidió— crece (C−2S)·L, que es tanto como decir que los huecos entre
     palabras no ponen nada.

     DOS CUIDADOS QUE COSTARON UNA MEDIDA CADA UNO. El nodo se vuelve a buscar
     en cada medida, porque renderPage rehace la hoja y el de antes se queda
     suelto: la primera versión midió un nodo huérfano y dio cero. Y el trozo
     tiene que caber EN UN RENGLÓN en las dos medidas: si parte, el espacio
     donde parte se colapsa —no ocupa nada y no recibe nada— y la cuenta se va
     por ese espacio que no está. Por eso se prueba primero con el ajuste al
     tope, que es cuando más ancho va, y se acorta el trozo hasta que quepa de
     una pieza; si no se encuentra ninguno, se dice en vez de medir mal.

     El margen es de 1.5 px sobre unos 18 de crecimiento: son treinta y pico
     caracteres redondeados al subpíxel cada uno. Y separa de sobra las tres
     cuentas posibles, que en este trozo van de 18 a 30. */
  titulo('el espaciado abre las letras y no los huecos entre palabras');
  const huecos = await pagina.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const buscar = (prefijo) => {
      const w = document.createTreeWalker(document.getElementById('pgBody'),
                                          NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())){
        if (prefijo ? n.nodeValue.startsWith(prefijo)
                    : (n.nodeValue.match(/ /g) || []).length >= 6) return n;
      }
      return null;
    };
    const primero = buscar(null);
    if (!primero) return { falta:'sin texto con espacios que medir' };
    /* SE ELIGE Y SE CIERRA, por lo mismo que en el bloque de arriba: con la
       muestra delante el libro no recibe el espaciado hasta que se confirma,
       así que medir sin cerrar mide el libro de antes y la cuenta sale a
       cero. El panel se abre para tocar el mando y se cierra para mirar. */
    const vis = () => [...document.querySelectorAll('.rollo, #canto')]
      .find(r => getComputedStyle(r).display !== 'none');
    const poner = async (v) => {
      if (!vis()){ document.getElementById('pgCabeza').click(); await pausa(900); }
      const t = (vis()||document).querySelector('.pestanas [data-sec="formato"]');
      if (t){ t.click(); await pausa(950); }
      const s = document.getElementById('espAhora');
      s.value = String(v); s.dispatchEvent(new Event('change', { bubbles:true }));
      await pausa(400);
      const b = document.querySelector('#ajustes .pie-cerrar .cerrar-pie');
      if (b) b.click();
      await pausa(1100);
    };
    const cajas = (prefijo, n) => {
      const nodo = buscar(prefijo);
      if (!nodo) return null;
      const r = document.createRange(); r.setStart(nodo, 0); r.setEnd(nodo, n);
      return [...r.getClientRects()];
    };
    /* Se busca el trozo con el ajuste AL TOPE, que es cuando más ancho va: uno
       que quepa de una pieza ahí, cabe también a cero. */
    await poner(5);
    let N = 0, trozo = '';
    for (const intento of [40, 34, 28, 22, 16]){
      const cand = primero.nodeValue.slice(0, intento);
      if ((cand.match(/ /g) || []).length < 3) continue;
      const c = cajas(cand, intento);
      if (c && c.length === 1){ N = intento; trozo = cand; break; }
    }
    if (!N) return { falta:'no hay trozo que quepa en un renglón con espacios' };
    const C = trozo.length, S = (trozo.match(/ /g) || []).length;
    const ancho = () => {
      const c = cajas(trozo, N);
      return c ? { px: +c.reduce((a, b) => a + b.width, 0).toFixed(2), renglones: c.length }
               : null;
    };
    const fs = parseFloat(getComputedStyle(document.querySelector('#pgBody .v')).fontSize);
    const enTope = ancho();
    await poner(0);
    const enCero = ancho();
    return { trozo, C, S, cero: enCero && enCero.px, tope: enTope && enTope.px,
             renglones: [enCero && enCero.renglones, enTope && enTope.renglones],
             vuelta: (ancho() || {}).px, L: +(fs * 0.05).toFixed(2) };
  });
  di('el trozo medido', JSON.stringify(huecos.trozo));
  di('caracteres · espacios · L', huecos.C + ' · ' + huecos.S + ' · ' + huecos.L + ' px');
  di('el ancho', huecos.cero + ' → ' + huecos.tope);
  vale('(la prueba es válida) hay trozo, espacios y ajuste que contar',
       !huecos.falta && huecos.S >= 3 && huecos.L > 0.3,
       huecos.falta || (huecos.C + ' caracteres · ' + huecos.S + ' espacios · L ' + huecos.L));
  vale('(la prueba es válida) y el trozo cabe de una pieza en las dos medidas',
       !huecos.falta && String(huecos.renglones) === '1,1',
       String(huecos.renglones));
  vale('(la prueba es válida) el tope ensancha el trozo',
       !huecos.falta && huecos.tope > huecos.cero + 5,
       !huecos.falta && ('+' + (huecos.tope - huecos.cero).toFixed(2) + ' px'));
  vale('LOS HUECOS ENTRE PALABRAS NO PONEN NADA: crece (C−2S)·L, no C·L',
       !huecos.falta &&
       Math.abs((huecos.tope - huecos.cero) - (huecos.C - 2 * huecos.S) * huecos.L) <= 1.5,
       !huecos.falta && ('+' + (huecos.tope - huecos.cero).toFixed(2) + ' px · la cuenta dice ' +
         ((huecos.C - 2 * huecos.S) * huecos.L).toFixed(2) + ' · sin descontar nada serían ' +
         (huecos.C * huecos.L).toFixed(2)));
  vale('  y al volver a 0 el trozo mide lo de antes',
       !huecos.falta && Math.abs(huecos.vuelta - huecos.cero) <= 0.6,
       !huecos.falta && (huecos.cero + ' → ' + huecos.vuelta));

  /* ──────────────────────────────────────────────────────────────
     Y LA NOTA LO LLEVA ESTÉ DONDE ESTÉ: al margen, debajo o al pie.

     Ésta nace de un hallazgo de la revisión de Codex, y conviene decir qué
     mitad cubre y qué mitad no.

     LA MITAD QUE CUBRE: la glosa vive en tres sitios que el lector elige, y
     los tres cuelgan de sitios distintos de la hoja —.pg-body, .pg-margin y
     .pg-foot son HERMANOS—. Un ajuste escrito en el cuerpo no llega a los
     otros dos. Por eso prepararHoja lo escribe en .pg, que es el ancestro
     común; esto vigila que siga siendo así, recorriendo los tres.

     LA MITAD QUE NO CUBRE, y se dice en vez de disimularla: el mismo fallo en
     la FOTO del pliegue, que es donde Codex lo encontró. Allí el ajuste
     viajaba solo en estiloEnLinea(), que cae en .pg-body, y las notas del
     margen y del pie salían con la tipografía de fábrica: caja de un tamaño y
     letra de otro. Está arreglado poniéndolo en la raíz del SVG, al lado de
     --fs-glosa, pero esa cadena se arma dentro de buildSVG y no hay manera de
     leerla desde aquí. Se reprodujo a mano antes de tocarla y queda anotado
     que no tiene prueba detrás.

     Lo que se recorre es el ESPACIADO. Fue la negrita mientras existió —era
     más fácil de leer de un vistazo, un 600 contra un 400— y al quitarla el
     bloque pasa al otro ajuste, que viaja por el mismo camino y se rompe
     exactamente igual. */
  titulo('el ajuste de la glosa la sigue a sus tres sitios');
  const sitios = await pagina.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const vis = () => [...document.querySelectorAll('.rollo, #canto')]
      .find(r => getComputedStyle(r).display !== 'none');
    const irA = async (sec) => {
      if (!vis()){ document.getElementById('pgCabeza').click(); await pausa(900); }
      const t = (vis()||document).querySelector('.pestanas [data-sec="'+sec+'"]');
      if (t){ t.click(); await pausa(950); }
    };
    /* se separa la letra de la GLOSA por su mando, el de GLOSAS > LETRA */
    await irA('glosas');
    const puerta = document.getElementById('btnLetraGlosas');
    if (puerta && document.getElementById('ctrlEtiquetas').classList.contains('sin-letra')){
      puerta.click(); await pausa(420);
    }
    const s = document.getElementById('espGlosaAhora');
    if (!s) return { falta:'sin mando de letra de glosa' };
    s.value = '5'; s.dispatchEvent(new Event('change', { bubbles:true }));
    await pausa(900);
    const out = {};
    for (const lay of ['margin', 'below', 'foot']){
      const b = document.querySelector('[data-lay="' + lay + '"]');
      if (!b){ out[lay] = 'sin botón'; continue; }
      b.click(); await pausa(1200);
      const g = document.querySelector('.gl');
      out[lay] = g ? getComputedStyle(g).letterSpacing : 'sin glosa';
    }
    /* se devuelve el ajuste, que los bloques de abajo no lo esperan */
    s.value = '0'; s.dispatchEvent(new Event('change', { bubbles:true }));
    await pausa(800);
    return out;
  });
  di('el espaciado de la nota en cada sitio', JSON.stringify(sitios));
  vale('(la prueba es válida) se pudo mirar la nota en los tres sitios',
       !sitios.falta && ['margin','below','foot']
         .every(k => /px$/.test(String(sitios[k]))), JSON.stringify(sitios));
  vale('EL ESPACIADO DE LA GLOSA LA SIGUE A LOS TRES SITIOS',
       !sitios.falta && ['margin','below','foot']
         .every(k => parseFloat(sitios[k]) > 0), JSON.stringify(sitios));

  /* ---------- la muestra de la letra, y el libro que espera ---------- */
  /* LO QUE SE PIDIÓ: «un sample de texto abajo de AAA/espaciado, encerrado en
     un rectángulo sepia del mismo tono que el que tenga el libro… cuando está
     transparente este rectángulo no está visible y los cambios se aplican
     directamente al libro; cuando no es transparente, el rectángulo es visible
     y recibe los cambios. Si está visible, los cambios al libro van a esperar
     a que apretemos el botón cerrar».

     POR QUÉ, que es lo que hace entendible todo lo demás: con el panel opaco
     el libro está tapado, así que mover la letra era elegir a ciegas —tocar,
     cerrar, mirar, y volver a abrir si no era eso—. En transparente el libro se
     ve, y entonces la muestra sobra y los tres mandos vuelven a ir directos.

     ESTE BLOQUE VA EL ÚLTIMO DE LA SESIÓN DEL TELÉFONO a propósito: mueve el
     tamaño, la tipografía y el espaciado del libro, que es de lo que viven
     media docena de bloques de arriba. Y aun así devuelve lo que tocó, que
     dejar el banco dependiendo del orden es la manera de que un día alguien
     mueva un bloque y se pase una tarde buscando por qué. */
  titulo('la muestra de la letra recibe los tres mandos, y el libro espera');
  const muestra = await pagina.evaluate(async () => {
    const z = ms => new Promise(x => setTimeout(x, ms));
    const vis = () => [...document.querySelectorAll('.rollo')]
      .find(r => getComputedStyle(r).display !== 'none');
    if (!vis()){ document.getElementById('pgCabeza').click(); await z(900); }
    const t = (vis() || document).querySelector('.pestanas [data-sec="formato"]');
    if (!t) return { falta:'no hay pestaña de formato' };
    t.click(); await z(900);
    const panel = document.getElementById('ajustes');
    if (panel.classList.contains('cristal')){
      document.getElementById('btnVidrio').click(); await z(700);
    }
    const fila = document.getElementById('filaMuestra');
    const texto = document.getElementById('muestraLetra');
    if (!fila || !texto) return { falta:'no hay muestra' };
    /* LA HOJA ES #pg y lleva las variables en línea —las escribe prepararHoja—,
       así que se leen de ahí y no del texto pintado: es donde el libro dice
       con qué letra se va a pintar. */
    /* EL CENTRADO SE MIDE PINTADO, no leyendo `text-align`. Un Range sobre el
       texto devuelve una caja POR RENGLÓN, así que se toma el último —el que
       nunca llena el ancho— y se miran los dos huecos hasta los bordes del
       bloque. Leer la declaración diría lo que pide la hoja de estilos;
       esto dice dónde quedó la tinta, que es lo que ve el lector. */
    const huecos = () => {
      const r = document.createRange();
      r.selectNodeContents(texto);
      const cajas = Array.from(r.getClientRects()).filter(c => c.width > 0);
      if (!cajas.length) return null;
      const linea = cajas[cajas.length - 1];
      const bloque = texto.getBoundingClientRect();
      return { izq: +(linea.left - bloque.left).toFixed(1),
               der: +(bloque.right - linea.right).toFixed(1) };
    };
    const hoja = document.getElementById('pg');
    const delLibro = () => ({ fs: hoja.style.getPropertyValue('--fs'),
                              esp: hoja.style.getPropertyValue('--esp'),
                              fam: (hoja.style.getPropertyValue('--fam') || '').split(',')[0] });
    const deLaMuestra = () => { const c = getComputedStyle(texto);
      return { fs: c.fontSize, esp: c.letterSpacing,
               fam: (c.fontFamily || '').split(',')[0] }; };
    const guardado = { tam: document.getElementById('fsAhora').value,
                       esp: document.getElementById('espAhora').value,
                       fuente: document.getElementById('selFuente').value };
    const antes = { visible: getComputedStyle(fila).display !== 'none',
                    papel: getComputedStyle(fila).backgroundColor,
                    papelDelLibro: getComputedStyle(document.documentElement)
                                     .getPropertyValue('--papel').trim(),
                    centrado: huecos(),
                    libro: delLibro(), muestra: deLaMuestra() };
    /* Se mueven los tres. La tipografía se elige por una que no sea la puesta. */
    document.getElementById('fsUp').click(); await z(120);
    /* DOS TOQUES, y el de en medio se guarda: con la muestra delante lo
       elegido espera fuera de `fontSize`, así que un + que contara desde el
       valor aplicado devolvería el que ya está pendiente y el segundo toque
       sería un no-hacer-nada. Se mira que el segundo paso también mueva. */
    const unPaso = deLaMuestra();
    document.getElementById('fsUp').click(); await z(120);
    const dosPasos = deLaMuestra();
    document.getElementById('espUp').click(); await z(120);
    const sel = document.getElementById('selFuente');
    const otra = String((+guardado.fuente + 1) % sel.options.length);
    sel.value = otra; sel.dispatchEvent(new Event('change', { bubbles:true }));
    await z(400);
    const tocado = { libro: delLibro(), muestra: deLaMuestra(), unPaso, dosPasos };
    /* Y se cierra con el botón, que es el gesto del encargo. */
    document.querySelector('#ajustes .pie-cerrar .cerrar-pie').click();
    await z(1000);
    const traCerrar = { libro: delLibro() };
    /* Se vuelve a abrir para el resto del bloque. */
    if (!vis()){ document.getElementById('pgCabeza').click(); await z(900); }
    (vis() || document).querySelector('.pestanas [data-sec="formato"]').click();
    await z(900);
    /* EN TRANSPARENTE: sin muestra, y el mando va directo. */
    document.getElementById('btnVidrio').click(); await z(700);
    const enCristal = { visible: getComputedStyle(fila).display !== 'none',
                        libro: delLibro() };
    document.getElementById('fsUp').click(); await z(500);
    const trasSubirEnCristal = { libro: delLibro() };
    /* Y AL VOLVER A OPACO la muestra tiene que estar al día: mientras estuvo
       escondida el libro cambió por debajo. */
    document.getElementById('btnVidrio').click(); await z(700);
    const deVuelta = { muestra: deLaMuestra(), libro: delLibro() };
    /* Se devuelve lo que se tocó, por los mismos mandos y con el panel a la
       vista, que es como lo devolvería un lector. */
    const s1 = document.getElementById('fsAhora');
    s1.value = guardado.tam; s1.dispatchEvent(new Event('change', { bubbles:true }));
    await z(200);
    const s2 = document.getElementById('espAhora');
    s2.value = guardado.esp; s2.dispatchEvent(new Event('change', { bubbles:true }));
    await z(200);
    sel.value = guardado.fuente; sel.dispatchEvent(new Event('change', { bubbles:true }));
    await z(200);
    document.querySelector('#ajustes .pie-cerrar .cerrar-pie').click();
    await z(1000);
    return { antes, tocado, traCerrar, enCristal, trasSubirEnCristal, deVuelta,
             devuelto: delLibro(), guardado };
  });
  di('la muestra', JSON.stringify(muestra));
  /* DOS NORMALIZADORES, y los dos salieron sondeando: el color compuesto viene
     con espacios —`rgb(232, 211, 172)`— y la variable de la raíz sin ellos; y
     el nombre de una tipografía de dos palabras vuelve con comillas dobles del
     estilo calculado y con simples de la variable en línea. Comparar las
     cadenas tal cual daba rojo con todo bien puesto, que es la peor manera de
     fallar. Se comparan los colores y los nombres, no su puntuación. */
  const sinAire = c => String(c || '').replace(/\s+/g, '');
  const soloNombre = f => String(f || '').replace(/["']/g, '').trim();
  vale('(la prueba es válida) la muestra está y se ve con el panel opaco',
       !muestra.falta && muestra.antes.visible === true,
       muestra.falta || String(muestra.antes && muestra.antes.visible));
  vale('EL RECUADRO ES DEL PAPEL DEL LIBRO, no de un color escrito aparte',
       !muestra.falta && sinAire(muestra.antes.papel) === sinAire(muestra.antes.papelDelLibro),
       !muestra.falta && (muestra.antes.papel + ' contra ' + muestra.antes.papelDelLibro));
  /* El centrado: dos líneas, y la primera es la que hace que la segunda
     signifique algo. Si el renglón llenara el bloque los dos huecos serían
     cero y la comparación daría verde con el texto pegado a la izquierda —una
     línea que no puede fallar no está midiendo—. Se exige holgura antes de
     mirar el reparto. */
  const hue = (!muestra.falta && muestra.antes.centrado) || null;
  vale('(la prueba es válida) el renglón no llena el recuadro, hay holgura que repartir',
       !!hue && (hue.izq + hue.der) > 4,
       JSON.stringify(hue));
  vale('LA MUESTRA VA CENTRADA: los dos huecos son el mismo',
       !!hue && Math.abs(hue.izq - hue.der) <= 2,
       JSON.stringify(hue));
  vale('LOS TRES MANDOS ESCRIBEN EN LA MUESTRA',
       !muestra.falta && muestra.tocado.muestra.fs !== muestra.antes.muestra.fs &&
       muestra.tocado.muestra.esp !== muestra.antes.muestra.esp &&
       soloNombre(muestra.tocado.muestra.fam) !== soloNombre(muestra.antes.muestra.fam),
       !muestra.falta && (JSON.stringify(muestra.antes.muestra) + '  →  ' +
                          JSON.stringify(muestra.tocado.muestra)));
  /* La que encontró Codex: los + y − son el ajuste fino, y con algo esperando
     tienen que caminar sobre lo pendiente. Contando desde lo aplicado, el
     segundo toque devuelve el valor que ya está puesto y no pasa nada. */
  vale('LOS PASOS CAMINAN SOBRE LO PENDIENTE: el segundo + también mueve',
       !muestra.falta && muestra.tocado.dosPasos.fs !== muestra.tocado.unPaso.fs,
       !muestra.falta && (muestra.antes.muestra.fs + '  →  ' +
                          muestra.tocado.unPaso.fs + '  →  ' +
                          muestra.tocado.dosPasos.fs));
  vale('  Y EL LIBRO SE QUEDA COMO ESTABA, esperando',
       !muestra.falta &&
       JSON.stringify(muestra.tocado.libro) === JSON.stringify(muestra.antes.libro),
       !muestra.falta && (JSON.stringify(muestra.antes.libro) + '  →  ' +
                          JSON.stringify(muestra.tocado.libro)));
  vale('AL CERRAR, EL LIBRO RECIBE LOS TRES DE UNA VEZ',
       !muestra.falta && muestra.traCerrar.libro.fs === muestra.tocado.muestra.fs &&
       soloNombre(muestra.traCerrar.libro.fam) === soloNombre(muestra.tocado.muestra.fam) &&
       muestra.traCerrar.libro.esp !== muestra.antes.libro.esp,
       !muestra.falta && (JSON.stringify(muestra.traCerrar.libro) + '  contra la muestra ' +
                          JSON.stringify(muestra.tocado.muestra)));
  vale('EN TRANSPARENTE NO HAY MUESTRA',
       !muestra.falta && muestra.enCristal.visible === false,
       !muestra.falta && String(muestra.enCristal.visible));
  vale('  y ahí el mando va DIRECTO al libro, sin esperar a nada',
       !muestra.falta &&
       muestra.trasSubirEnCristal.libro.fs !== muestra.enCristal.libro.fs,
       !muestra.falta && (muestra.enCristal.libro.fs + '  →  ' +
                          muestra.trasSubirEnCristal.libro.fs));
  /* LA QUE ENCONTRÓ EL SONDEO: la muestra estuvo escondida mientras el libro
     cambiaba, así que al volver tiene que ponerse al día. Sin esta línea se
     quedaba un punto por detrás de la hoja, que es justo la mentira que una
     muestra no puede contar. */
  vale('AL VOLVER DE TRANSPARENTE, LA MUESTRA SE PONE AL DÍA',
       !muestra.falta && muestra.deVuelta.muestra.fs === muestra.deVuelta.libro.fs,
       !muestra.falta && (muestra.deVuelta.muestra.fs + ' contra ' +
                          muestra.deVuelta.libro.fs));
  vale('(y el bloque devuelve el libro como lo encontró)',
       !muestra.falta &&
       JSON.stringify(muestra.devuelto) === JSON.stringify(muestra.antes.libro),
       !muestra.falta && (JSON.stringify(muestra.antes.libro) + '  →  ' +
                          JSON.stringify(muestra.devuelto)));

  /* ──────────────────────────────────────────────────────────────
     LA LISTA DE LETRAS NO ENSEÑA DOS VECES LA MISMA.

     Nace de una mirada del dueño del repo: «tenemos 5 fuentes, ¿por qué
     elegiste ésas? Se parecen». Y era verdad. Cada entrada de la lista no es
     una letra: es una cadena de recambios, y en el aparato que no tiene la que
     se nombra la cadena baja hasta el genérico. En un Android sin ninguna de
     las cuatro serifas, las cuatro acaban en la misma letra: cuatro nombres
     para una.

     SE MIDE LA LETRA, NO LA LISTA. Se recorre lo que el mando ofrece de
     verdad, se elige cada una como la elige un lector, y se mide con qué se
     pinta —la huella sale de medir dos palabras en un lienzo con la cadena que
     la hoja se acaba de escribir a sí misma—. Leer los nombres de la lista no
     serviría: el fallo era justamente que los nombres decían seis cosas y la
     pantalla enseñaba dos.

     VA EN TRANSPARENTE porque ahí los tres mandos van directos al libro y cada
     elección se ve en el acto. En opaco habría que cerrar entre una y otra, y
     lo que se mide aquí no tiene nada que ver con lo que espera a cerrar.

     Y la línea de validez es la de siempre, con una vuelta de tuerca: si el
     mando ofreciera UNA sola letra, «ninguna se repite» saldría verde sin
     haber probado nada. */
  titulo('la lista de letras no ofrece dos veces la misma');
  const letras = await sesion.pagina.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const vis = () => [...document.querySelectorAll('.rollo, #canto')]
      .find(r => getComputedStyle(r).display !== 'none');
    if (!vis()){ document.getElementById('pgCabeza').click(); await pausa(900); }
    const t = (vis() || document).querySelector('.pestanas [data-sec="formato"]');
    if (!t) return { falta:'no hay pestaña de formato' };
    t.click(); await pausa(900);
    /* En transparente, que es donde el mando va directo al libro. */
    const panel = document.getElementById('ajustes');
    if (!panel.classList.contains('cristal')){
      document.getElementById('btnVidrio').click(); await pausa(700);
    }
    const sel = document.getElementById('selFuente');
    const hoja = document.getElementById('pg');
    if (!sel || !hoja) return { falta:'no hay mando de letra o no hay hoja' };
    const guardado = sel.value;
    const cadenaDePartida = (hoja.style.getPropertyValue('--fam') || '').trim();
    /* LA HUELLA: dos palabras medidas en un lienzo con la cadena que la hoja
       lleva puesta. Dos y no una, que con una sola colisionan letras de anchos
       parecidos. Es la misma cuenta que hace el programa, escrita aquí aparte:
       lo de dentro no se puede llamar desde fuera —y está bien que no—, así
       que esta prueba mide por su cuenta y no se apoya en ella. */
    const huella = (cadena) => {
      const c = document.createElement('canvas').getContext('2d');
      const mide = x => { c.font = '64px ' + cadena; return Math.round(c.measureText(x).width * 10); };
      return mide('MMMWWWiiilll') + '·' + mide('en Cristo somos más que vencedores');
    };
    const primerNombre = (cadena) => {
      const G = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|-apple-system|BlinkMacSystemFont)$/i;
      for (const parte of String(cadena).split(',')){
        const n = parte.trim().replace(/^['"]|['"]$/g, '');
        if (!n) continue;
        return G.test(n) ? null : n;
      }
      return null;
    };
    /* ¿ESTÁ INSTALADA? SE MIDE. La primera versión de esta prueba preguntaba con
       `document.fonts.check`, igual que la aplicación, y las dos estaban mal:
       esa función dice «pintar esto no obliga a cargar nada que falte», y un
       nombre ausente se resuelve por recambio sin cargar nada, así que contesta
       que sí. Lo encontró Codex. La prueba repetía la pregunta equivocada, o sea
       que habría dado verde con el mecanismo entero muerto: la peor clase de
       verde. Aquí se mide, y se mide APARTE de la aplicación —esto no llama a lo
       de dentro, lo comprueba— con tres recambios, porque una letra puede medir
       por casualidad lo mismo que uno de ellos. */
    const instalada = (n) => {
      if (!n) return null;
      const c = document.createElement('canvas').getContext('2d');
      const P = 'mmmiiiWWWlll@#ÁÑ';
      for (const ref of ['monospace', 'serif', 'sans-serif']){
        c.font = '72px ' + ref;
        const solo = c.measureText(P).width;
        c.font = '72px "' + n + '",' + ref;
        if (Math.abs(c.measureText(P).width - solo) > 0.5) return true;
      }
      return false;
    };
    const ofrecidas = [...sel.options].filter(o => !o.hidden);
    const todas = sel.options.length;
    const vistas = [];
    for (const o of ofrecidas){
      sel.value = o.value;
      sel.dispatchEvent(new Event('change', { bubbles:true }));
      await pausa(700);
      const cadena = (hoja.style.getPropertyValue('--fam') || '').trim();
      const nombre = primerNombre(cadena);
      const tiene = instalada(nombre);
      vistas.push({ rotulo: o.textContent.trim(), valor: o.value, cadena,
                    nombre, tiene, huella: cadena ? huella(cadena) : null });
    }
    /* LA RETIRADA VUELVE A ESCONDERSE AL DEJAR DE ESTAR PUESTA. La entrada
       retirada se conserva en el menú mientras sea la del lector —esconderla
       dejaría el mando enseñando un hueco— y esa excepción tenía un agujero que
       encontró Codex: al elegir otra, nadie la volvía a esconder hasta recargar.
       Se comprueba el ciclo entero: se pone, tiene que verse; se quita, tiene
       que desaparecer. La primera mitad es la que hace que la segunda signifique
       algo —sin ella, una entrada que nunca se enseña pasaría igual—. */
    const retirada = [...sel.options].find(o => o.hidden && o.textContent.trim() === 'Máquina');
    let cicloRetirada = null;
    if (retirada){
      sel.value = retirada.value;
      sel.dispatchEvent(new Event('change', { bubbles:true }));
      await pausa(700);
      const puesta = !retirada.hidden;
      const otra = [...sel.options].find(o => !o.hidden && o.value !== retirada.value);
      sel.value = otra.value;
      sel.dispatchEvent(new Event('change', { bubbles:true }));
      await pausa(700);
      cicloRetirada = { puesta, trasCambiar: !retirada.hidden };
    }
    /* y se devuelve la que estaba, que los bloques de abajo no tienen por qué
       heredar una letra elegida aquí */
    sel.value = guardado;
    sel.dispatchEvent(new Event('change', { bubbles:true }));
    await pausa(700);
    return { todas, ofrecidas: vistas, cadenaDePartida, cicloRetirada, elegidaVisible:
               !([...sel.options].find(o => o.value === guardado) || {}).hidden,
             devuelta: (hoja.style.getPropertyValue('--fam') || '').trim() };
  });
  di('lo que ofrece el mando', letras.falta ||
     letras.ofrecidas.map(v => v.rotulo + ' → ' + v.huella).join('  ·  '));
  di('de las ' + letras.todas + ', escondidas',
     letras.falta ? '?' : String(letras.todas - letras.ofrecidas.length));
  vale('(la prueba es válida) el mando ofrece más de una letra que comparar',
       !letras.falta && letras.ofrecidas.length >= 2,
       letras.falta || (letras.ofrecidas.length + ' de ' + letras.todas));
  vale('(la prueba es válida) y todas dicen con qué se pinta la hoja',
       !letras.falta && letras.ofrecidas.every(v => v.cadena && v.huella),
       !letras.falta && letras.ofrecidas.filter(v => !v.cadena).length + ' sin cadena');
  /* LA DE VERDAD. Antes de esto, en un aparato sin las serifas nombradas, esta
     línea habría cantado cuatro huellas iguales. */
  vale('NINGUNA DE LAS QUE OFRECE ES LA MISMA LETRA QUE OTRA',
       !letras.falta &&
       new Set(letras.ofrecidas.map(v => v.huella)).size === letras.ofrecidas.length,
       !letras.falta && letras.ofrecidas.map(v => v.rotulo + ':' + v.huella).join(' · '));
  /* Y EL NOMBRE NO MIENTE: si el aparato no tiene la letra que se nombra, el
     rótulo lo dice —«Segoe · sans del aparato»—. Ésta es la que contesta la
     pregunta del dueño del repo en el sitio donde se elige, que en un teléfono
     es el único sitio donde se puede contestar: ahí no hay hover que leer. */
  /* Y EL RÓTULO NO MIENTE: donde el aparato no tiene la letra que la entrada
     nombra, el mando enseña el GÉNERO en vez del nombre —«Sans» donde no hay
     Segoe—. Ésa es la contestación a la pregunta del dueño del repo, dicha en
     el sitio donde se elige, que en un teléfono es el único sitio donde cabe:
     ahí no hay hover que leer. */
  const GENEROS = ['Romana', 'Lineal', 'Máquina'];
  vale('  y la que el aparato no tiene enseña el género, no el nombre',
       !letras.falta && letras.ofrecidas.every(v =>
         v.tiene === true || GENEROS.includes(v.rotulo)),
       !letras.falta && letras.ofrecidas
         .map(v => v.rotulo + ' (' + (v.nombre || 'genérica') + ': ' + v.tiene + ')').join(' · '));
  /* Y LA DE MÁQUINA NO SE OFRECE. Se retiró del mando —«se ve horrible»— pero
     NO del archivo, porque lo guardado es el índice y borrar la entrada le
     correría el índice a lo que viniera después. Esta línea vigila las dos
     mitades a la vez: que no aparezca en el menú, y que el mando siga teniendo
     de dónde elegir —si borrarla hubiera roto la lista, la de validez de arriba
     lo diría—. */
  vale('  y la de máquina se retiró del mando',
       !letras.falta && !letras.ofrecidas.some(v => v.rotulo === 'Máquina'),
       !letras.falta && letras.ofrecidas.map(v => v.rotulo).join(' · '));
  /* El ciclo de la retirada, que encontró Codex: se conserva mientras es la
     del lector, y vuelve a esconderse en cuanto deja de serlo. Antes se quedaba
     a la vista —y elegible— hasta recargar la página. */
  vale('(la prueba es válida) la retirada se deja ver si el lector la tiene puesta',
       !letras.falta && !!letras.cicloRetirada && letras.cicloRetirada.puesta === true,
       !letras.falta && JSON.stringify(letras.cicloRetirada));
  vale('  y VUELVE A ESCONDERSE al elegir otra, sin recargar',
       !letras.falta && !!letras.cicloRetirada &&
       letras.cicloRetirada.trasCambiar === false,
       !letras.falta && JSON.stringify(letras.cicloRetirada));
  /* Y CABEN. Esta línea nace de una roja: los rótulos fueron «Segoe · sans del
     aparato» y el desplegable se ensanchó tanto que su tablilla pasó del 70%
     del panel, con lo que saltó «la mayoría son de verdad estrechas» en un
     bloque de más arriba. Aquella línea hizo su trabajo, pero señalaba el
     síntoma a dos pantallas del sitio; ésta señala la causa. */
  vale('  y ningún rótulo se alarga hasta ensanchar el mando',
       !letras.falta && letras.ofrecidas.every(v => v.rotulo.length <= 10),
       !letras.falta && letras.ofrecidas.map(v => v.rotulo + ':' + v.rotulo.length).join(' · '));
  vale('  y la letra elegida por el lector nunca se esconde',
       !letras.falta && letras.elegidaVisible === true,
       !letras.falta && String(letras.elegidaVisible));
  vale('(y el bloque devuelve la letra del libro como la encontró)',
       !letras.falta && !!letras.cadenaDePartida &&
       letras.devuelta === letras.cadenaDePartida,
       !letras.falta && (letras.cadenaDePartida + '  →  ' + letras.devuelta));

  /* ──────────────────────────────────────────────────────────────
     LA TARJETA DE LA GLOSA NUNCA ES MÁS OSCURA QUE EL PAPEL.

     Encargo del dueño del repo leyendo en la columna de glosas: «el fondo azul,
     rojo y verde se ven como oscurecidos». Nombró exactamente las tres que lo
     estaban, y la cuenta lo confirma: con el sepia al tope el papel tiene 0.667
     de luz relativa y la verde 0.643, la azul 0.640, la naranja 0.631. La
     amarilla era la única por encima, 0.672, y por eso no la nombró.

     SE VA A BUSCAR LAS TRES, y esto lo enseñó una roja de la línea de validez:
     la primera versión medía en la hoja donde se hubiera quedado la suite —Mateo
     1— y allí sólo vive una nota amarilla. La aserción principal salía verde
     midiendo justo la única que nunca estuvo mal. La línea de validez lo dijo:
     «hay al menos una de las tres que se quejó» en rojo, con la principal en
     verde. Es exactamente para eso que está.

     Las notas de ejemplo tienen las cuatro, repartidas por capítulos: Mateo 5
     lleva amarilla y verde —las dos en la misma hoja, que de paso deja comparar
     la que no se tocó con la que sí—, Mateo 10 naranja y Mateo 24 azul. Se va a
     las tres hojas.

     Y SE COLOCA POR LOS AJUSTES GUARDADOS, no paseando por el panel tres veces:
     `placement` y `sepia` se guardan igual que la posición, así que escribirlos
     y recargar deja la hoja puesta antes del primer pintado. Es lo mismo que
     hace el bloque del espaciado de más arriba, y por lo mismo. Al final se
     devuelve el objeto entero tal como estaba.

     SE MIDE PINTADO, Y AQUÍ NO HAY OTRA MANERA. El fondo de la tarjeta ya no es
     un color declarado: es var(--papel) con dos capas de gradiente encima, y
     getComputedStyle devuelve el background-color —o sea el papel— sin enterarse
     de las capas. Leer la declaración diría «papel» para las cuatro y esta
     prueba saldría verde con el fallo puesto. De cada captura se toma el píxel
     más claro de la fila de en medio, que es la misma técnica que el bloque de
     los dos botones: en la tarjeta hay texto, y un punto fijo cae encima de una
     letra y devuelve la tinta. */
  titulo('la tarjeta de la glosa nunca es más oscura que el papel');
  const guardadoAntes = await sesion.pagina.evaluate(
    () => localStorage.getItem('glossa:ajustes:v1'));
  const lupaGl = await sesion.navegador.newPage();
  await lupaGl.setContent('<canvas id="c"></canvas>');
  const masClaroDe = async (loc) => {
    const b64 = (await loc.screenshot()).toString('base64');
    return lupaGl.evaluate(async (d) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + d; });
      const c = document.getElementById('c');
      c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      const fila = cx.getImageData(0, Math.round(img.height / 2), img.width, 1).data;
      let mejor = [0, 0, 0], luz = -1;
      for (let i = 0; i < fila.length; i += 4){
        const l = .2126*fila[i] + .7152*fila[i+1] + .0722*fila[i+2];
        if (l > luz){ luz = l; mejor = [fila[i], fila[i+1], fila[i+2]]; }
      }
      return mejor;
    }, b64);
  };
  /* La luz relativa de verdad, con su gamma: la media de los tres canales diría
     que un amarillo y un azul del mismo promedio pesan lo mismo, y no es así. Es
     la misma cuenta que usa el contraste de la WCAG. */
  const luzDe = (c) => {
    const f = c.map(v => { v /= 255;
      return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return +(.2126*f[0] + .7152*f[1] + .0722*f[2]).toFixed(3);
  };
  const medidas = [], papeles = [], sinNota = [];
  for (const donde of [{ cap:5, vers:5 }, { cap:10, vers:32 }, { cap:24, vers:30 }]){
    await sesion.pagina.evaluate((d) => {
      const c = 'glossa:ajustes:v1';
      const a = JSON.parse(localStorage.getItem(c) || '{}') || {};
      a.v = 1; a.libro = 'MAT'; a.cap = d.cap; a.vers = d.vers;
      a.placement = 'margin'; a.sepia = 100;
      localStorage.setItem(c, JSON.stringify(a));
    }, donde);
    await sesion.pagina.reload();
    await sesion.pagina.waitForTimeout(3000);
    const hay = await sesion.pagina.evaluate(() =>
      [...document.querySelectorAll('#pgMargin .gl')]
        .map((g, i) => ({ i, color: [...g.classList].find(x => x.startsWith('g-')) || null }))
        .filter(x => x.color));
    if (!hay.length){ sinNota.push('MAT ' + donde.cap); continue; }
    /* EL PAPEL SE LEE EN CADA HOJA, no una vez y a cuenta de todas: cada
       tarjeta se compara con el papel de SU hoja. Con un solo papel de
       referencia habría que elegir entre el más claro y el más oscuro, y
       cualquiera de los dos afloja o aprieta la afirmación por el sitio
       equivocado. */
    const papelAqui = await masClaroDe(sesion.pagina.locator('#pgBody'));
    papeles.push(papelAqui);
    for (const t of hay.slice(0, 4)){
      const px = await masClaroDe(sesion.pagina.locator('#pgMargin .gl').nth(t.i));
      medidas.push({ donde: 'MAT ' + donde.cap, color: t.color, px, luz: luzDe(px),
                     luzPapel: luzDe(papelAqui) });
    }
  }
  await lupaGl.close();
  /* Se devuelven los ajustes enteros como estaban, que los bloques de abajo no
     tienen por qué heredar el sepia al tope ni las notas al margen. */
  await sesion.pagina.evaluate((v) => {
    if (v == null) localStorage.removeItem('glossa:ajustes:v1');
    else localStorage.setItem('glossa:ajustes:v1', v);
  }, guardadoAntes);
  await sesion.pagina.reload();
  await sesion.pagina.waitForTimeout(2600);
  di('el papel pintado', JSON.stringify({ papeles, luz: papeles.map(luzDe) }) +
     (sinNota.length ? '  ·  sin nota al margen en: ' + sinNota.join(', ') : ''));
  di('las tarjetas', medidas.map(m => m.donde + ' ' + m.color + ' ' +
     JSON.stringify(m.px) + ' luz ' + m.luz + ' contra papel ' + m.luzPapel)
     .join('  ·  ') || 'ninguna');
  const lasTres = medidas.filter(m => m.color !== 'g-yellow');
  vale('(la prueba es válida) se leyó papel y no tinta',
       papeles.length > 0 && papeles.every(p => p[0] > 150),
       JSON.stringify(papeles));
  /* LA QUE SALTÓ, Y POR ESO ESTÁ. Con la hoja de Mateo 1 —donde se quedaba la
     suite— sólo había amarilla, así que la principal medía la única que nunca
     estuvo mal. */
  vale('(la prueba es válida) se midieron las tres que se quejó, no sólo la amarilla',
       ['g-green', 'g-blue', 'g-orange'].every(c => lasTres.some(m => m.color === c)),
       lasTres.map(m => m.color).join(', ') || 'ninguna de las tres');
  /* LA DE VERDAD. Antes de este cambio, con el sepia al tope, las tres daban
     entre 0.631 y 0.643 contra un papel de 0.667: por debajo las tres. */
  vale('NINGUNA TARJETA ES MÁS OSCURA QUE EL PAPEL con el sepia al tope',
       medidas.length > 0 &&
       medidas.every(m => m.luz >= m.luzPapel - .005),
       medidas.map(m => m.donde + ' ' + m.color + ' ' + m.luz +
                        ' contra ' + m.luzPapel).join(' · '));

  await cerrarParcial(sesion, 'teléfono');

  /* ---------- y en escritorio, donde .stage SÍ trae filtro propio ---------- */
  titulo('en escritorio la sombra de .stage no se pierde');
  /* Es el único sitio del programa donde ya vivía un filter, y está justo
     encima de la hoja. Si alguien resolviera el contraste escribiendo el
     filter en .stage, aquí desaparecería el drop-shadow —y de paso se teñiría
     ORACIÓN, que es la única pieza pedida expresamente fuera—. Las dos cosas
     se miran de una vez.
     El testigo era antes el panel de Formato limpio de contraste, y dejó de
     servir el día que los paneles empezaron a recibir el brillo: escrito en
     .stage, el brillo llegaría a Formato igual que ahora, y la línea no
     distinguiría una cosa de la otra. ORACIÓN sí las distingue, porque por
     arriba se lo llevaría y por el selector de hoy no. */
  const escritorio = await abrir(ESCRITORIO);
  const esc = await escritorio.pagina.evaluate(async () => {
    const r = document.getElementById('contraste');
    r.value = '200'; r.dispatchEvent(new Event('input', { bubbles:true }));
    const b = document.getElementById('brillo');
    b.value = '60'; b.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 200));
    const f = id => getComputedStyle(document.getElementById(id)).filter;
    return { stage: f('stage'), pg: f('pg'), fx: f('fx'), ajustes: f('ajustes'),
             oracion: f('oracion') };
  });
  di('en escritorio a 200%', esc);
  vale('.stage conserva su sombra', /drop-shadow/.test(esc.stage), esc.stage);
  vale('y no se le pegó el contraste', !/contrast/.test(esc.stage), esc.stage);
  vale('la hoja sí lo lleva', factorDe(esc.pg) === 2, esc.pg);
  vale('el lienzo también', factorDe(esc.fx) === 2, esc.fx);
  vale('y FORMATO no lo lleva', sinContraste(esc.ajustes), esc.ajustes);
  vale('el brillo también llega en escritorio',
       brilloDe(esc.pg) === .6 && brilloDe(esc.fx) === .6, esc.pg);
  vale('y a FORMATO con él, que del brillo sí es', brilloDe(esc.ajustes) === .6, esc.ajustes);
  /* Y LA QUE AHORA SOSTIENE ESTE BLOQUE: ORACIÓN no se tiñe. Con los paneles
     dentro del filtro, «el panel de Formato limpio» ya no sirve para distinguir
     un filtro escrito pieza por pieza de uno escrito en .stage —los dos
     teñirían Formato—. ORACIÓN sí los distingue: sólo el de arriba se lo
     llevaría. */
  vale('y ORACIÓN sigue fuera', esc.oracion === 'none', esc.oracion);

  await cerrar(escritorio);
})();
