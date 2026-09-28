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

   2. Que NO se resuelva un nivel más arriba. Ésta decía «que NO lo reciba el
      panel de Formato», y dejó de decir eso el día que el dueño del repo pidió
      lo contrario: «¿podríamos hacer que también afecte a todas las pestañas
      arriba, excepto ORACIÓN?», y, preguntado por Formato, «FORMATO incluido,
      excepto cuando está en transparente». Así que hoy los paneles de papel sí
      lo reciben, y Formato con ellos mientras es opaco.

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
    return { opaco, cristal, filas, salidaBoton };
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

  /* ---------- el velo se aparta con el panel transparente ---------- */
  /* LO QUE SE PIDIÓ: «los tabs abren y se pone un background transparente-negro
     detrás; ¿podrías hacerlo menos negro?». De las opciones que se le
     enseñaron eligió la segunda —dejarlo como está en opaco y casi apagarlo en
     transparente— con el valor .12 contra el .44 de siempre. «Casi, pero no
     totalmente.»

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

  /* ---------- el brillo y el contraste llegan a los paneles ---------- */
  /* LO QUE SE PIDIÓ: «actualmente podemos cambiar el brillo y el contraste, y
     eso aplica al tab LIBRO; ¿podríamos hacer que también afecte a todas las
     pestañas arriba, excepto ORACIÓN?». Y al preguntarle por Formato —que es
     el panel desde el que se arrastra el riel— eligió que sí, pero no en
     transparente: «de esta manera los controles brillan normales y el único
     velo es el que ya tiene aplicado el libro mismo».

     LAS CUATRO COSAS QUE SE VIGILAN, y todas se rompen en silencio:

     · LOS CUATRO PANELES DE PAPEL LO RECIBEN, y con el MISMO número que la
       hoja. No basta con que tengan algo puesto: si uno se quedara con un
       filtro viejo, la pestaña se leería de otro color que el libro y nadie
       sabría por qué.
     · ORACIÓN NO. Es la única excepción pedida, y es la que un `.rollo` a
       secas se llevaría por delante sin avisar.
     · FORMATO SÍ EN OPACO Y NO EN CRISTAL. Las dos mitades, porque cada una
       cae de un lado distinto del selector: quitar el `:not(.cristal)` rompe
       la segunda y quitar el `.rollo` rompe la primera.
     · Y EL NÚMERO SIGUE AL RIEL. Ésta es la que salva al bloque: sin ella,
       todas las de arriba saldrían verdes con el filtro clavado en un valor
       fijo, que es lo mismo que no tenerlo. Se mueve el contraste y se mira
       que el panel se mueva con la hoja.

     SE LEE EL `filter` PINTADO de cada panel, no la hoja de estilos: lo que
     importa es lo que le llega al elemento, venga del selector que venga. */
  titulo('el brillo y el contraste también en las pestañas, menos ORACIÓN');
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
  const conFiltro = await porPanel();
  di('el filter de cada panel', JSON.stringify(conFiltro));
  vale('(la prueba es válida) la hoja lleva el filtro puesto',
       /brightness\(/.test(conFiltro.hoja) && /contrast\(/.test(conFiltro.hoja),
       conFiltro.hoja);
  const DE_PAPEL = ['libros','glosas','encuentros','respaldo'];
  vale('LOS CUATRO PANELES DE PAPEL LLEVAN EL MISMO FILTRO QUE LA HOJA',
       DE_PAPEL.every(k => conFiltro[k] === conFiltro.hoja),
       DE_PAPEL.map(k => k + ' ' + conFiltro[k]).join(' · '));
  vale('ORACIÓN NO, que es la excepción que se pidió',
       conFiltro.oracion === 'none', conFiltro.oracion);
  vale('FORMATO SÍ, con el panel opaco',
       conFiltro.formato === conFiltro.hoja, conFiltro.formato);
  vale('  y NO cuando se vuelve transparente',
       conFiltro.formatoCristal === 'none', conFiltro.formatoCristal);
  /* EL TESTIGO DEL BLOQUE: se mueve el riel y el número tiene que moverse en
     los dos sitios a la vez. Sin esto, un filtro clavado pasaría todo lo de
     arriba sin hacer nada de lo que se pidió. */
  await ponerContraste(pagina, 200);
  const alTope = await porPanel();
  await ponerContraste(pagina, 125);
  di('con el contraste al tope', JSON.stringify({ hoja: alTope.hoja, libros: alTope.libros }));
  vale('(la prueba es válida) mover el riel cambia el filtro de la hoja',
       alTope.hoja !== conFiltro.hoja, conFiltro.hoja + '  →  ' + alTope.hoja);
  vale('Y EL DE LOS PANELES SE MUEVE CON ELLA',
       DE_PAPEL.every(k => alTope[k] === alTope.hoja),
       DE_PAPEL.map(k => k + ' ' + alTope[k]).join(' · '));
  vale('  sin arrastrar a ORACIÓN', alTope.oracion === 'none', alTope.oracion);

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
    /* FORMATO LO RECIBE IGUAL QUE LA HOJA, y esta línea decía lo contrario
       hasta que se pidió lo contrario. Ver la regla 2 de la cabecera. Se mira
       con el modo delante: en cristal la respuesta buena sería 'none', y una
       aserción que no sepa en qué modo está no está probando nada. */
    vale('(la prueba es válida) el panel está opaco · ' + pct + '%',
         s.cristal === false, s.cristal);
    vale('FORMATO lo recibe igual que la hoja · ' + pct + '%',
         factorDe(s.ajustes) === factor, s.ajustes);
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
  /* EL PANEL QUE LO MANDA SE TIÑE CON ÉL, y es lo pedido: opaco, el panel es
     lo único que se ve, y verlo con el mismo número que la hoja es la señal de
     lo que el riel está haciendo. Decía «intacto» y era verdad hasta este
     encargo; ver la regla 2 de la cabecera. */
  vale('(la prueba es válida) el panel está opaco', conPanel.cristal === false, conPanel.cristal);
  vale('y el panel que lo manda se tiñe con él',
       factorDe(conPanel.ajustes) === 1.5, conPanel.ajustes);
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
  /* Y NACE CON ÉL TAMBIÉN EL PANEL. Decía «FORMATO nunca lo recibió»; hoy lo
     recibe desde el primer pintado, sin esperar a que se abra. */
  vale('y FORMATO nace con el mismo', factorDe(tras.ajustes) === 1.5, tras.ajustes);

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
  vale('rango 50–150 de uno en uno y neutro en 100',
       sitioBrillo.min === '50' && sitioBrillo.max === '150' &&
       sitioBrillo.step === '1' && sitioBrillo.valor === '100',
       sitioBrillo.min + '–' + sitioBrillo.max + ' en ' + sitioBrillo.valor);
  vale('tiene nombre accesible', sitioBrillo.aria === 'brillo', sitioBrillo.aria);

  for (const [pct, factor] of [[50,.5],[100,1],[150,1.5]]){
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
    vale('FORMATO lo recibe igual · ' + pct + '%', brilloDe(f.ajustes) === factor, f.ajustes);
  }

  /* LOS TOPES, saltándose el riel a propósito. */
  for (const [pide, queda] of [[10,50],[400,150]]){
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
    await meter('brillo', 120);
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
       factorDe(tres.trasTodo.filtro) === 1.5 && brilloDe(tres.trasTodo.filtro) === 1.2 &&
       tres.trasTodo.s === '40', tres.trasTodo.filtro + ' · sepia ' + tres.trasTodo.s);
  vale('mover el contraste no borra el brillo',
       brilloDe(tres.trasContraste.filtro) === 1.2 && factorDe(tres.trasContraste.filtro) === 0.8,
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
    /* El mando es el mismo que el del tamaño: menos, lista, más. Se va al tope
       por la lista —que es donde más se nota— y luego se baja un punto con el
       botón, que es la otra mitad del mando y se rompe aparte. */
    const s = document.getElementById('espAhora');
    const topes = [...s.options].map(o => +o.value);
    s.value = String(Math.max(...topes));
    s.dispatchEvent(new Event('change', { bubbles:true }));
    await pausa(1100);
    const despues = lee();
    document.getElementById('espDown').click();
    await pausa(1000);
    const trasElBoton = { ...lee(), valor: +s.value };
    /* y se devuelve a lo de fábrica, que los bloques de abajo miden colores
       sobre una hoja que no tiene por qué llevar ajustes encima */
    s.value = '0'; s.dispatchEvent(new Event('change', { bubbles:true }));
    await pausa(900);
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
    const poner = async (v) => {
      const s = document.getElementById('espAhora');
      s.value = String(v); s.dispatchEvent(new Event('change', { bubbles:true }));
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

  await cerrarParcial(sesion, 'teléfono');

  /* ---------- y en escritorio, donde .stage SÍ trae filtro propio ---------- */
  titulo('en escritorio la sombra de .stage no se pierde');
  /* Es el único sitio del programa donde ya vivía un filter, y está justo
     encima de la hoja. Si alguien resolviera el contraste escribiendo el
     filter en .stage, aquí desaparecería el drop-shadow —y de paso se teñiría
     ORACIÓN, que es la única pieza pedida expresamente fuera—. Las dos cosas
     se miran de una vez.
     El testigo era antes el panel de Formato limpio, y dejó de servir el día
     que se pidió que los paneles se tiñeran: hoy lo lleva en los dos casos. */
  const escritorio = await abrir(ESCRITORIO);
  const esc = await escritorio.pagina.evaluate(async () => {
    const r = document.getElementById('contraste');
    r.value = '200'; r.dispatchEvent(new Event('input', { bubbles:true }));
    const b = document.getElementById('brillo');
    b.value = '150'; b.dispatchEvent(new Event('input', { bubbles:true }));
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
  vale('y FORMATO lleva el mismo', factorDe(esc.ajustes) === 2, esc.ajustes);
  vale('el brillo también llega en escritorio',
       brilloDe(esc.pg) === 1.5 && brilloDe(esc.fx) === 1.5, esc.pg);
  vale('y a FORMATO con él', brilloDe(esc.ajustes) === 1.5, esc.ajustes);
  /* Y LA QUE AHORA SOSTIENE ESTE BLOQUE: ORACIÓN no se tiñe. Con los paneles
     dentro del filtro, «el panel de Formato limpio» ya no sirve para distinguir
     un filtro escrito pieza por pieza de uno escrito en .stage —los dos
     teñirían Formato—. ORACIÓN sí los distingue: sólo el de arriba se lo
     llevaría. */
  vale('y ORACIÓN sigue fuera', esc.oracion === 'none', esc.oracion);

  await cerrar(escritorio);
})();
