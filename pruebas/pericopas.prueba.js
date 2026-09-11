/* LAS PERÍCOPAS: EL TITULILLO QUE DICE DE QUÉ VA LA ESCENA.

   Los datos son editoriales y viven fuera del programa, en pericopas.js, y no
   salen de ninguna traducción. Ésa es justo la propiedad que los hace encajar:
   esta aplicación ya pagina sincronizado —cada hoja se corta donde quepa en
   las cuatro versiones— así que una división que tampoco depende de la versión
   cae en el mismo molde. La prueba grande de este fichero es esa.

   Y LAS OTRAS DOS SON DEUDAS PAGADAS POR ADELANTADO, las dos aprendidas con
   las piedras:

   · QUE EL TITULILLO ESTÉ EN LA FOTO DEL PLIEGUE. Lo que no está en el retrato
     desaparece durante el giro y vuelve de golpe al aterrizar. Con las piedras
     costó dos revisiones —una vez sin color, otra corregido dos veces— y no se
     ve mirando: hay que contar píxeles. Aquí se mira por los dos lados, el XML
     del retrato y la tinta que deja en el lienzo.

   · QUE NINGUNO SE QUEDE HUÉRFANO al pie de una hoja. No hay guardia para eso
     en la aplicación y es a propósito: el titulillo y su versículo se añaden en
     la misma cadena, así que el paginador los mete juntos y los retira juntos.
     Es un comportamiento que sale de cómo está escrito paginate, o sea
     exactamente la clase de cosa que alguien rompe sin enterarse. */
const { abrir, cerrar, cerrarParcial, fin, di, vale, titulo, RAIZ } = require('./comun');
const fs = require('fs');
const path = require('path');
const os = require('os');

/* Lucas 10, que es donde cae la perícopa más conocida del libro. */
const DONDE = { v:1, libro:'LUK', cap:10, vers:25 };

const andamio = p => p.evaluate(() => {
  window.__pausa = ms => new Promise(z => setTimeout(z, ms));
  window.__hoja = () => (window.__estado || '').split('·')[0].trim();
  window.__pasar = async () => {
    const e = document.getElementById('edgeR');
    const r = e.getBoundingClientRect();
    const op = { bubbles:true, pointerId:(window.__p = (window.__p||700)+1),
                 pointerType:'touch', isPrimary:true,
                 clientX:r.left + r.width/2, clientY:420 };
    e.dispatchEvent(new PointerEvent('pointerdown', op));
    await window.__pausa(60);
    e.dispatchEvent(new PointerEvent('pointerup', op));
    await window.__pausa(1700);
  };
});

const abrirEn = async (p, donde) => {
  await p.evaluate(a => localStorage.setItem('glossa:ajustes:v1', JSON.stringify(a)), donde);
  await p.reload();
  await p.waitForTimeout(3200);
  await andamio(p);
};

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  await abrirEn(p, DONDE);

  /* ---------------------------------------------------------------- */
  titulo('el titulillo sale, y va pegado al versículo que empieza');
  const puesto = await p.evaluate(() => {
    const ts = [...document.querySelectorAll('#pgBody .peri')];
    const cs = ts.length ? getComputedStyle(ts[0]) : null;
    return {
      cuantos: ts.length,
      /* Su hermano siguiente tiene que ser el versículo cuyo número es el del
         arranque de la perícopa, que va escrito en el propio id. */
      filas: ts.map(t => ({
        texto: t.textContent, id: t.dataset.peri,
        arranque: +(/luke-\d{3}-(\d{3})-\d{3}/.exec(t.dataset.peri) || [])[1],
        siguiente: +(((t.nextElementSibling || {}).querySelector
                      ? (t.nextElementSibling.querySelector('.vn') || {}).textContent
                      : 0) || 0) })),
      estilo: cs ? { familia: cs.fontFamily.split(',')[0], estilo: cs.fontStyle,
                     peso: +cs.fontWeight, tam: parseFloat(cs.fontSize),
                     centrado: cs.textAlign,
                     /* Cuánto se mete por cada lado: es lo que hace que un
                        título largo parta en mitades parejas. */
                     sangria: parseFloat(cs.paddingLeft),
                     color: cs.color } : null,
      /* El cuerpo del texto, para comparar contra él y no contra números
         escritos a mano: tinta, tamaño y peso del versículo de al lado. */
      texto: (() => {
        const v = document.querySelector('#pgBody .v');
        if (!v) return null;
        const c = getComputedStyle(v);
        return { color: c.color, tam: parseFloat(c.fontSize), peso: +c.fontWeight }; })(),
      tintaTexto: (() => {
        const v = document.querySelector('#pgBody .v');
        return v ? getComputedStyle(v).color : null; })(),
      hoja: window.__hoja() };
  });
  di('los titulillos de la hoja', puesto.filas);
  di('la hoja', puesto.hoja);
  vale('HAY TITULILLO EN LA HOJA', puesto.cuantos > 0, puesto.cuantos);
  vale('  y cada uno delante del versículo donde empieza su perícopa',
       puesto.filas.every(f => f.arranque === f.siguiente), puesto.filas);
  /* EN CURSIVA Y DEL SERIF DE LA HOJA, no de la letra de la interfaz: es parte
     del libro, como el número de capítulo, y no un control que se pueda tocar. */
  /* SE COMPARA CONTRA EL TEXTO DE AL LADO, no contra cifras escritas aquí: el
     lector puede cambiar el cuerpo de la letra, así que un «14.1px» en esta
     línea sería un número que se descuelga en cuanto alguien toque el ajuste.

     Y ESTO AFIRMABA LO VIEJO hasta hoy: pedía cursiva. El titulillo nació en
     cursiva, .94em y peso normal —o sea MÁS PEQUEÑO que el texto que anuncia—
     y así se perdía en la hoja: el dueño lo leyó por encima sin verlo y un
     panel de editores y tipógrafos lo levantó. Ahora va redonda, semibold y
     algo mayor, que es lo contrario de lo que decía esta línea.

     EL MARGEN ES 1.04 Y NO 1.15, y el número tiene historia. Estuvo en 1.15
     cuando el cuerpo era 1.3em, y al bajar a 1.08 —porque a 1.3 el rótulo se
     peleaba con el número de capítulo y interrumpía la lectura— esta línea se
     habría puesto roja con la aplicación haciendo lo correcto. Lo que hay que
     exigir es que el titulillo sea MAYOR que el texto, que es la señal; cuánto
     mayor es una decisión de diseño y no una regla, así que el margen se queda
     justo por encima de «igual» en vez de fijar un tamaño concreto por la
     puerta de atrás. */
  vale('  del serif del texto, pero MÁS GRANDE y con más peso',
       !!puesto.estilo && !!puesto.texto &&
       /Palatino|Georgia|Noto|serif/i.test(puesto.estilo.familia) &&
       puesto.estilo.tam > puesto.texto.tam * 1.04 &&
       puesto.estilo.peso > puesto.texto.peso,
       'titulillo ' + (puesto.estilo||{}).tam + 'px/' + (puesto.estilo||{}).peso +
       '  ·  texto ' + (puesto.texto||{}).tam + 'px/' + (puesto.texto||{}).peso);
  /* REDONDA Y NO CURSIVA: negrita más cursiva a este cuerpo y sobre papel
     tostado se emborrona. Si lleva peso, que vaya derecha. */
  vale('  y redonda, no cursiva',
       !!puesto.estilo && puesto.estilo.estilo === 'normal',
       (puesto.estilo||{}).estilo);
  /* CENTRADO Y SIN LLEGAR A LOS BORDES. Centrado porque el número de capítulo
     ya lo está y así la hoja tiene un eje. Y con sangría a los dos lados
     porque es lo único que hace que un titulillo largo parta en mitades
     parejas: centrado a secas, «El reino como semilla y levadura» deja un
     renglón casi lleno y otro de dos palabras, y ese desequilibrio centrado se
     ve mucho más que alineado a la izquierda. Las dos cosas van juntas en esta
     línea porque separadas no significan nada: centrar sin sangrar era peor
     que no centrar. */
  vale('  centrado, y sin llegar a los bordes de la columna',
       !!puesto.estilo && puesto.estilo.centrado === 'center' &&
       puesto.estilo.sangria > 0,
       (puesto.estilo||{}).centrado + ', ' + (puesto.estilo||{}).sangria + 'px por lado');
  /* Y CON LA TINTA DEL TEXTO, que es una aserción y no un capricho.

     Nació con el sepia apagado del aparato —#8a7746, el de los números de
     versículo— por no querer que gritara, y medido en píxeles de pantalla
     después del filtro de la hoja daba 3.69:1 de fábrica contra 14.41:1 del
     texto que tiene pegado: cuatro veces peor, y por debajo del 4.5:1 que pide
     un cuerpo normal. Con el brillo al tope bajaba a 1.10:1, o sea invisible.
     Un número de versículo puede permitirse ser tenue porque se saltea; un
     titulillo es TEXTO y está ahí para leerse. Lo levantó Codex.

     SE VIGILA QUE SEA EL MISMO COLOR y no una razón de contraste, y a
     propósito: la razón depende del sepia, del brillo y del contraste que
     tenga puestos el lector, así que un número aquí sería un número que se
     descuelga —ya nos pasó con los 160 ms del doblez de las etiquetas—.
     Compartiendo tinta con el texto, el titulillo no puede ser menos legible
     que el versículo que lo sigue con NINGÚN ajuste, y eso no hay riel que lo
     rompa. Medido después: 14.41:1 los dos de fábrica, y los dos iguales en
     los cuatro extremos de los rieles. */
  vale('  Y CON LA MISMA TINTA QUE EL TEXTO, no con el gris del aparato',
       !!puesto.estilo && puesto.estilo.color === puesto.tintaTexto,
       'titulillo ' + (puesto.estilo || {}).color + '  ·  texto ' + puesto.tintaTexto);

  /* ---------------------------------------------------------------- */
  titulo('ninguno se queda huérfano al pie de la hoja');
  /* Doce vueltas seguidas por Lucas, que es donde hay perícopas cada pocas
     hojas. Lo que se mira es el ÚLTIMO hijo del cuerpo: un titulillo ahí es un
     rótulo cuyo texto se fue a la hoja siguiente. */
  const huerfanos = await p.evaluate(async () => {
    const malos = [];
    let vistos = 0;
    for (let i = 0; i < 12; i++){
      const body = document.getElementById('pgBody');
      const ultimo = body.children[body.children.length - 1];
      if (ultimo && ultimo.classList.contains('peri'))
        malos.push({ hoja: window.__hoja(), texto: ultimo.textContent });
      vistos += body.querySelectorAll('.peri').length;
      await window.__pasar();
    }
    return { malos, vistos };
  });
  di('titulillos vistos en doce hojas', huerfanos.vistos);
  vale('NINGUNO SE QUEDA SOLO AL PIE', huerfanos.malos.length === 0, huerfanos.malos);
  /* Y que se hayan visto unos cuantos, o la prueba de arriba no prueba nada:
     doce hojas sin un solo titulillo pasarían en verde con el fallo puesto. */
  vale('  y se vieron unos cuantos por el camino', huerfanos.vistos >= 8,
       huerfanos.vistos);

  /* ---------------------------------------------------------------- */
  titulo('la hoja no se sale por abajo con el titulillo dentro');
  /* El titulillo ocupa alto. Si el paginador no lo midiera, la hoja traería
     los mismos versículos que sin él y el último se saldría del papel. Se mide
     contra el cuerpo, que es quien tiene el alto de la hoja. */
  await abrirEn(p, DONDE);
  const cabe = await p.evaluate(() => {
    const body = document.getElementById('pgBody');
    const r = body.getBoundingClientRect();
    const hijos = [...body.children];
    const ultimo = hijos[hijos.length - 1];
    const u = ultimo ? ultimo.getBoundingClientRect() : null;
    return { sobra: u ? Math.round(r.bottom - u.bottom) : null,
             titulillos: body.querySelectorAll('.peri').length,
             versiculos: body.querySelectorAll('.v').length };
  });
  di('lo que sobra al pie', cabe);
  vale('EL ÚLTIMO VERSÍCULO CABE ENTERO', cabe.sobra !== null && cabe.sobra >= -1,
       cabe.sobra + ' px de sobra');
  vale('  con su titulillo dentro', cabe.titulillos > 0, cabe.titulillos);

  await cerrarParcial(sesion, 'la hoja');

  /* ================================================================
     LAS CUATRO VERSIONES, SINCRONIZADAS. Es la prueba grande.

     El paginador promete que la hoja 7 trae los mismos versículos en la VBL y
     en la RVR1909, para que cambiar de versión te deje mirando el mismo
     pasaje. El titulillo ocupa alto, así que si se midiera solo en la versión
     que se está leyendo, la promesa se rompería en cuanto una perícopa cayera
     cerca de un corte. Se mide en el plano que se está maquetando —ver
     mapaPericopas— y esto lo comprueba. */
  titulo('cambiar de versión deja el mismo pasaje y el mismo titulillo');
  const otra = await abrir();
  const q = otra.pagina;
  await abrirEn(q, DONDE);
  const versiones = await q.evaluate(async () => {
    const abrirGlobo = async () => {
      const sello = document.getElementById('pgVersion');
      if (!sello) return false;
      sello.click();
      await window.__pausa(600);
      return document.querySelectorAll('[data-bv]').length > 0;
    };
    if (!await abrirGlobo()) return { sinGlobo:true };
    const cuales = [...document.querySelectorAll('[data-bv]')].map(b => b.dataset.bv);
    const out = [];
    for (const v of cuales){
      const b = document.querySelector('[data-bv="' + v + '"]');
      if (!b) continue;
      b.click();
      /* Cambiar de versión rehace el plano y repagina el libro: es la
         operación más cara del programa y hay que dejarla terminar. */
      await window.__pausa(2600);
      out.push({ v, hoja: window.__hoja(),
                 /* Y CÓMO SE DECLARA LA COLUMNA. Elegir el texto en inglés y
                    dejar el <div> diciendo lang="es" deja el trabajo a medias:
                    un lector de pantalla pronuncia el inglés con reglas
                    españolas. Vale para el capítulo entero, no solo para el
                    titulillo. Lo levantó Codex. */
                 declara: document.getElementById('pgBody').getAttribute('lang'),
                 declaraMolde: document.getElementById('ghostBody').getAttribute('lang'),
                 titulillos: [...document.querySelectorAll('#pgBody .peri')]
                   .map(t => t.dataset.peri).join('|'),
                 /* Y LO QUE DICEN, que no es lo mismo que cuáles son: el id
                    no cambia con la versión y el texto sí tiene que cambiar. */
                 /* LO QUE SE LEE ES .peri-dice Y NO EL <h2> ENTERO: dentro
                    del titulillo viaja además el otro idioma, invisible, solo
                    para que la caja mida lo mismo en las cuatro versiones y la
                    paginación siga sincronizada (ver tituloHTML). Leyendo el
                    h2 salen los dos pegados. */
                 dicen: [...document.querySelectorAll('#pgBody .peri .peri-dice')]
                   .map(t => t.textContent.trim()).join(' | '),
                 /* Y EN PARES, id contra lo que dice, para poder cotejarlo con
                    el fichero de datos en vez de adivinar el idioma. */
                 pares: [...document.querySelectorAll('#pgBody .peri')]
                   .map(t => ({ id: t.dataset.peri,
                                dice: (t.querySelector('.peri-dice') || t).textContent.trim(),
                                /* Y la sombra, que tiene que estar y no verse. */
                                sombra: [...t.querySelectorAll('.peri-sombra')]
                                  .map(x => x.textContent.trim()).join('|'),
                                sombraSeVe: [...t.querySelectorAll('.peri-sombra')]
                                  .some(x => getComputedStyle(x).visibility !== 'hidden') })) });
      await abrirGlobo();
    }
    return { out, cuales };
  });
  di('por versión', versiones.out);
  vale('(la prueba es válida) se recorrieron varias versiones',
       !!versiones.out && versiones.out.length >= 2,
       versiones.sinGlobo ? 'no se abrió el globo' : (versiones.cuales || []).join(', '));
  vale('LA HOJA ES LA MISMA EN TODAS',
       new Set((versiones.out || []).map(x => x.hoja)).size === 1,
       (versiones.out || []).map(x => x.v + ': ' + x.hoja));
  vale('  Y EL TITULILLO TAMBIÉN',
       new Set((versiones.out || []).map(x => x.titulillos)).size === 1,
       (versiones.out || []).map(x => x.v + ': ' + x.titulillos));
  /* ================================================================
     PERO LO QUE DICE SÍ CAMBIA: EL IDIOMA LO MANDA LA VERSIÓN.

     Las perícopas vienen escritas en los dos idiomas desde el primer día y
     hasta ahora salía siempre el español: leyendo la Berean o la World
     English, el texto en inglés y el titulillo encima en español. Pedido y
     hecho.

     Son las dos caras de la misma moneda y por eso se prueban juntas: CUÁLES
     son no cambia —es lo de arriba, y es lo que hace que la hoja sea la misma
     en las cuatro— y CÓMO SE LLAMAN sí. Comprobar solo una de las dos dejaría
     pasar el fallo contrario.

     SE COTEJA CONTRA EL FICHERO DE DATOS, palabra por palabra, y no se
     adivina el idioma mirando el texto. Aquí hubo una versión que buscaba
     marcas —tildes, eñes, «de/la» contra «the/of/and»— con el argumento de que
     la lista de perícopas se edita y exigir «Prólogo» al pie de la letra se
     cae el día que alguien mejore una traducción. El argumento era bueno y la
     ejecución mala: «El buen samaritano» no lleva tilde, ni eñe, ni «de», ni
     «la», así que la prueba lo dio por NO español y cantó un fallo con el
     programa haciéndolo bien. Lo levantó la corrida del dueño.

     La salida es cotejar contra la MISMA FUENTE que usa la aplicación:
     pericopas.js se lee aquí como módulo —ya se exporta— y para cada titulillo
     de la hoja se compara lo que dice con lo que su ficha guarda para el
     idioma que toca. Exacto y sin adivinar, y sigue sin caerse si alguien
     reescribe una traducción, porque las dos partes leen el mismo archivo. */
  const DATOS = require(path.join(RAIZ, 'pericopas.js'));
  const ficha = new Map((DATOS.LUK || []).map(x => [x.id, x]));
  const ESPERADO = { vbl:'es', rv1909:'es', bsb:'en', web:'en' };
  const cotejo = (versiones.out || []).map(x => {
    const debe = ESPERADO[x.v] || 'es';
    const pares = (x.pares || []).map(par => {
      const f = ficha.get(par.id);
      return { id: par.id, dice: par.dice,
               toca: f ? (f.t[debe] || f.t.es || f.t.en) : null };
    });
    return { v: x.v, debe, dicen: x.dicen,
             cuantos: pares.length,
             conFicha: pares.every(q => q.toca !== null),
             bien: pares.length > 0 && pares.every(q => q.dice === q.toca),
             falla: pares.find(q => q.dice !== q.toca) || null };
  });
  di('cotejado contra pericopas.js', cotejo.map(x => x.v + ' (' + x.debe + '): ' + x.dicen));
  const esp = cotejo.filter(x => x.debe === 'es');
  const ing = cotejo.filter(x => x.debe === 'en');
  vale('(la prueba es válida) se vieron versiones de los dos idiomas',
       esp.length > 0 && ing.length > 0,
       esp.length + ' en español, ' + ing.length + ' en inglés');
  vale('(la prueba es válida) cada titulillo de la hoja tiene su ficha',
       cotejo.every(x => x.cuantos > 0 && x.conFicha),
       cotejo.map(x => x.v + ': ' + x.cuantos).join(', '));
  vale('EL TITULILLO SIGUE AL IDIOMA DE LA VERSIÓN',
       cotejo.every(x => x.bien),
       (cotejo.find(x => !x.bien) || {}).falla ||
       cotejo.map(x => x.v + ': ' + x.dicen).join('  ·  '));
  /* Y EL CONTROL: que los dos idiomas de verdad digan cosas distintas. Sin
     esto, una lista con el mismo texto en ambos pasaría el cotejo entero sin
     que la traducción funcionara. */
  vale('  CONTROL: el español y el inglés no dicen lo mismo',
       esp.length > 0 && ing.length > 0 && esp[0].dicen !== ing[0].dicen,
       esp[0] && ing[0] ? esp[0].dicen + '  ≠  ' + ing[0].dicen : 'faltan');
  /* ================================================================
     Y LA SOMBRA QUE MANTIENE LA HOJA SINCRONIZADA.

     El titulillo lleva dentro el otro idioma, invisible, apilado en la misma
     celda: así la caja mide lo que el más largo de los dos y no cambia de alto
     al cambiar de versión. Sin eso, «El buen samaritano» y «The good
     Samaritan» cortaban la hoja en sitios distintos —medido: Lucas 10:21
     contra Lucas 10:9— y se caía la promesa de que la misma hoja trae los
     mismos versículos en las cuatro traducciones.

     Está probado de rebote ahí arriba, en «LA HOJA ES LA MISMA EN TODAS», pero
     esa aserción no dice POR QUÉ pasa: si alguien quita la sombra, aquella se
     cae y nadie sabe dónde mirar. Ésta lo dice. */
  const sombras = (versiones.out || []).flatMap(x => (x.pares || []).map(par => ({
    v: x.v, id: par.id, sombra: par.sombra, seVe: par.sombraSeVe })));
  di('la sombra del titulillo', sombras);
  vale('el titulillo lleva su otro idioma dentro',
       sombras.length > 0 && sombras.every(x => x.sombra),
       sombras.map(x => x.v + ': ' + x.sombra).join(' · '));
  vale('  y NO se ve', sombras.every(x => x.seVe === false), sombras);
  /* Y LA COLUMNA LO DECLARA, que es la otra mitad: sin esto el inglés se
     pronuncia con reglas españolas. Se mira la hoja viva y el molde del que
     sale la foto del pliegue, que se olvidaba solo. */
  const declarado = (versiones.out || []).map(x => ({
    v: x.v, hoja: x.declara, molde: x.declaraMolde,
    debe: (x.v === 'bsb' || x.v === 'web') ? 'en' : 'es' }));
  di('lo que declara la columna', declarado);
  vale('LA COLUMNA DECLARA EL IDIOMA DE LA VERSIÓN',
       declarado.every(x => x.hoja === x.debe),
       declarado.map(x => x.v + ': ' + x.hoja).join(', '));
  vale('  y el molde de la foto también',
       declarado.every(x => x.molde === x.debe),
       declarado.map(x => x.v + ': ' + x.molde).join(', '));
  await cerrarParcial(otra, 'las versiones');

  /* ================================================================
     EL TITULILLO VIAJA EN LA FOTO DEL PLIEGUE.

     El pliegue esconde la hoja viva y enseña un retrato hecho aparte. Lo que
     no esté en él desaparece durante el giro y vuelve de golpe al aterrizar, y
     un rótulo que parpadea en cada vuelta no parece parte del papel.

     Se mira por los dos lados, que es lo que se acabó haciendo con las
     piedras: la FUENTE —el XML del retrato, leído envolviendo new Image(), la
     única pieza que esta casa deja sustituir— y el RESULTADO, la tinta que
     deja en el lienzo, en la banda donde el titulillo cae de verdad. La fuente
     sola no prueba que se dibuje; la tinta sola no prueba que sea la suya. */
  titulo('el titulillo viaja en la foto del pliegue');
  const foto = await abrir();
  const f = foto.pagina;
  await abrirEn(f, DONDE);
  const retrato = await f.evaluate(async () => {
    const t = document.querySelector('#pgBody .peri');
    const inner = document.querySelector('#pg .pg-inner');
    if (!t || !inner) return { falta:true };
    const ri = inner.getBoundingClientRect(), rt = t.getBoundingClientRect();
    const banda = { y0:(rt.top - ri.top)/ri.height, y1:(rt.bottom - ri.top)/ri.height };
    const texto = t.textContent;

    const Original = window.Image;
    const vistos = [];
    window.Image = function(...a){
      const img = new Original(...a);
      Object.defineProperty(img, 'src', { configurable:true,
        get(){ return img.getAttribute('src'); },
        set(v){ vistos.push(String(v)); img.setAttribute('src', v); } });
      return img;
    };
    window.Image.prototype = Original.prototype;

    const e = document.getElementById('edgeR');
    const rc = e.getBoundingClientRect();
    const op = { bubbles:true, pointerId:640, pointerType:'touch', isPrimary:true,
                 clientX:rc.left + rc.width/2, clientY:420 };
    e.dispatchEvent(new PointerEvent('pointerdown', op));
    await window.__pausa(60);
    e.dispatchEvent(new PointerEvent('pointerup', op));
    await window.__pausa(320);                       /* a media vuelta */

    const fx = document.getElementById('fx');
    const g = fx.getContext('2d', { willReadFrequently:true });
    const a0 = Math.max(0, Math.round(fx.height * banda.y0) - 3);
    const alto = Math.max(4, Math.round(fx.height * (banda.y1 - banda.y0)) + 6);
    const d = g.getImageData(0, a0, fx.width, Math.min(alto, fx.height - a0)).data;
    let tinta = 0;
    for (let i = 0; i < d.length; i += 4){
      if (d[i+3] < 40) continue;
      /* Cualquier letra: claramente más oscura que el papel hueso. */
      if (d[i] < 190 && d[i+1] < 175) tinta++;
    }
    await window.__pausa(1800);
    window.Image = Original;

    const conCuerpo = vistos
      .map(v => decodeURIComponent(v.replace(/^data:[^,]+,/, '')))
      .filter(x => x.indexOf('pg-body') >= 0);
    const conTitulo = conCuerpo.filter(x => x.indexOf('class="peri"') >= 0);
    let trozo = null;
    if (conTitulo.length){
      const x = conTitulo[conTitulo.length - 1];
      const i = x.indexOf('class="peri"');
      /* Hasta el cierre del h2, no un recorte de 90 caracteres: con
         aria-expanded el atributo ya se come esa ventana y el texto cae
         fuera, que es precisamente lo que esta aserción quería ver. */
      const j = x.indexOf('</h2>', i);
      trozo = x.slice(i, j > i ? j + 5 : i + 220);
    }
    return { texto, banda, tinta, retratos: conCuerpo.length,
             conTitulo: conTitulo.length, trozo };
  });
  di('el titulillo', retrato.texto);
  di('en el XML del retrato', retrato.trozo);
  vale('(la prueba es válida) la hoja tiene titulillo', !!retrato.texto, retrato.texto);
  vale('EL RETRATO LO LLEVA EN SU XML', retrato.conTitulo > 0,
       retrato.conTitulo + ' de ' + retrato.retratos + ' retratos con cuerpo');
  vale('  y con su texto, no solo la caja',
       (retrato.trozo || '').indexOf((retrato.texto || '').slice(0, 10)) >= 0,
       retrato.trozo);
  /* 912 píxeles medidos en su banda; el margen va a la quinta parte. */
  vale('Y DEJA TINTA EN EL LIENZO, o sea que se dibuja de verdad',
       retrato.tinta > 200, retrato.tinta + ' píxeles en su banda');
  await cerrarParcial(foto, 'la foto');

  /* ================================================================
     Y SIN EL FICHERO DE DATOS, LA APLICACIÓN SIGUE ENTERA.

     Las perícopas cubren un libro de sesenta y seis. El programa no puede
     depender de que el fichero esté: si falta —o si alguien abre la aplicación
     desde una copia sin él— la hoja se pinta igual y sencillamente no hay
     titulillos. Se prueba de verdad, con una copia del directorio a la que le
     falta el fichero, y no simulando nada. */
  /* ================================================================
     TOCAR UN TITULILLO Y VER EL LIBRO ENTERO.

     Lo pidió el dueño del repo: un toque en una perícopa saca la lista de
     todas las del libro, con la tocada EN EL MISMO SITIO donde estaba, las de
     atrás hacia arriba y las de adelante hacia abajo. Tocar otra salta a su
     página.

     LO QUE SE AFIRMA ES QUE EL RENGLÓN NO SE MUEVE, y se mide comparando su
     rect antes y después. Es la única propiedad del gesto que no se puede ver
     leyendo el código: el cuadre depende del relleno de los botones, del
     interlineado y de la transición de entrada, y ya se rompió una vez —la
     lista entra con un translateY de cinco píxeles y cuadrarla contra un rect
     a medio animar dejaba el renglón cinco píxeles alto—.

     Y LA CUENTA SE COTEJA CONTRA pericopas.js, no contra un número escrito
     aquí: el día que se añada un libro o una escena, esta prueba tiene que
     seguir valiendo sin tocarla. */
  titulo('tocar un titulillo saca las escenas del libro');
  const DATOS_LUK = require(path.join(RAIZ, 'pericopas.js')).LUK;
  const ses2 = await abrir();
  await abrirEn(ses2.pagina, DONDE);
  const escenas = await ses2.pagina.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const caja = el => { const b = el.getBoundingClientRect();
      return { x:+b.left.toFixed(1), y:+b.top.toFixed(1) }; };
    const ts = [...document.querySelectorAll('#pgBody .peri')];
    if (!ts.length) return { sinTitulillos:true };
    const h2 = ts[Math.min(1, ts.length - 1)];
    const dice = h2.querySelector('.peri-dice');
    const antes = caja(dice), tam = getComputedStyle(dice).fontSize;
    /* SIN pointerdown: un toque de dedo no siempre lo manda antes del click,
       y el arreglo no puede apoyarse en verlo. */
    const r = h2.getBoundingClientRect();
    h2.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, detail:1,
      clientX:r.left + r.width/2, clientY:r.top + r.height/2 }));
    await pausa(600);
    const caj = document.getElementById('escenas');
    const lista = document.getElementById('escenasLista');
    const items = [...lista.querySelectorAll('.escena')];
    const elegida = lista.querySelector('.escena.aqui');
    const suDice = elegida && elegida.querySelector('.escena-dice');
    return {
      abierta: caj.classList.contains('puesto') && caj.classList.contains('visible'),
      cuantas: items.length,
      tocada: h2.dataset.peri,
      marcada: elegida ? elegida.dataset.peri : null,
      marcadas: items.filter(x => x.classList.contains('aqui')).length,
      antes, despues: suDice ? caja(suDice) : null,
      tam, tamLista: suDice ? getComputedStyle(suDice).fontSize : null,
      /* de la primera a la última: la lista es del libro entero */
      primera: items[0] && items[0].textContent.trim(),
      ultima: items[items.length - 1] && items[items.length - 1].textContent.trim(),
      /* y se puede rodar hasta las dos puntas */
      rueda: lista.scrollHeight > lista.clientHeight,
      marco: elegida ? getComputedStyle(elegida).boxShadow : null,
      marcoOtra: getComputedStyle(items[0] === elegida ? items[1] : items[0]).boxShadow
    };
  });
  di('las escenas', escenas);
  vale('(la prueba es válida) había un titulillo que tocar',
       !escenas.sinTitulillos, escenas.tocada);
  vale('UN TOQUE SACA LA LISTA', escenas.abierta === true, escenas.abierta);
  vale('  y trae TODAS las escenas del libro, cotejado contra pericopas.js',
       escenas.cuantas === DATOS_LUK.length,
       escenas.cuantas + ' de ' + DATOS_LUK.length);
  vale('  de la primera a la última',
       escenas.primera === DATOS_LUK[0].t.es &&
       escenas.ultima === DATOS_LUK[DATOS_LUK.length - 1].t.es,
       escenas.primera + ' … ' + escenas.ultima);
  vale('  y hay más de las que caben, o sea que se rueda', escenas.rueda === true, escenas.rueda);
  /* EL CUADRE. Un píxel y medio de holgura y no cero: offsetTop viene
     redondeado a entero, así que exigir la igualdad exacta sería exigir que el
     navegador no redondee. Lo que se afirma es que no hay salto. */
  vale('LA TOCADA SE QUEDA DONDE ESTABA',
       !!escenas.despues &&
       Math.abs(escenas.despues.y - escenas.antes.y) <= 1.5 &&
       Math.abs(escenas.despues.x - escenas.antes.x) <= 1.5,
       'antes ' + JSON.stringify(escenas.antes) + ' · después ' + JSON.stringify(escenas.despues));
  vale('  y con el mismo tamaño de letra que el titulillo',
       escenas.tam === escenas.tamLista, escenas.tam + ' contra ' + escenas.tamLista);
  vale('  y va marcada ella y ninguna más',
       escenas.marcada === escenas.tocada && escenas.marcadas === 1,
       escenas.marcada + ' · ' + escenas.marcadas + ' marcada(s)');
  /* El marco de la elegida se busca por lo que ES —un recuadro sepia— y no por
     la cadena exacta que devuelva getComputedStyle. */
  vale('  con su recuadro sepia, que las demás no llevan',
       /184,\s*137,\s*43/.test(escenas.marco || '') && escenas.marcoOtra === 'none',
       escenas.marco + ' contra ' + escenas.marcoOtra);

  /* LA HOJA SE ATENÚA DETRÁS, y se mide en píxeles y no por la opacidad
     escrita en el CSS: lo que importa es cuánta tinta de la hoja queda.
     El recorte se saca del rect de la lista —al lado, no encima— para no
     depender de un rectángulo mágico que se rompe si la columna se mueve. */
  titulo('la hoja se atenúa detrás de las escenas');
  const clipVelo = await ses2.pagina.evaluate(() => {
    const lista = document.getElementById('escenasLista').getBoundingClientRect();
    const escena = document.getElementById('stage').getBoundingClientRect();
    const aLaDerecha = escena.right - lista.right >= 90;
    const x = aLaDerecha
      ? Math.round(lista.right + 8)
      : Math.round(Math.max(escena.left + 8, lista.left - 88));
    const y = Math.round(Math.max(escena.top + 20, lista.top + 40));
    return { x, y, width: 80, height: 160 };
  });
  di('el recorte del velo', clipVelo);
  const oscuridad = async () => {
    const b = await ses2.pagina.screenshot({ clip: clipVelo });
    return ses2.pagina.evaluate(async d => {
      const im = new Image();
      await new Promise(ok => { im.onload = ok; im.src = 'data:image/png;base64,' + d; });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const cx = c.getContext('2d'); cx.drawImage(im, 0, 0);
      const p = cx.getImageData(0, 0, im.width, im.height).data;
      let min = 255;
      for (let i = 0; i < p.length; i += 4){
        const l = p[i] * .299 + p[i+1] * .587 + p[i+2] * .114;
        if (l < min) min = l;
      }
      return +min.toFixed(1);
    }, b.toString('base64'));
  };
  const conVelo = await oscuridad();
  await ses2.pagina.keyboard.press('Escape');
  await ses2.pagina.waitForTimeout(500);
  const sinVelo = await oscuridad();
  di('la tinta más oscura de la columna', { conVelo, sinVelo });
  vale('(la prueba es válida) sin velo la hoja tiene tinta de verdad',
       sinVelo < 90, sinVelo);
  vale('LA HOJA SE ATENÚA, PERO NO DESAPARECE',
       conVelo > sinVelo + 80 && conVelo < 235, conVelo + ' contra ' + sinVelo);
  vale('  y Escape la cierra', await ses2.pagina.evaluate(() =>
       !document.getElementById('escenas').classList.contains('puesto')), 'cerrada');

  /* EL ACOLCHADO. El segundo titulillo de Lucas 10 nunca pide un scrollTop
     negativo; el que sí es el que queda más abajo en la escena. Ahí es donde
     el Prólogo se iba a otro sitio sin la pantalla en blanco de arriba. */
  titulo('el titulillo de más abajo también se queda donde estaba');
  const borde = await ses2.pagina.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const caja = el => { const b = el.getBoundingClientRect();
      return { x:+b.left.toFixed(1), y:+b.top.toFixed(1) }; };
    const ts = [...document.querySelectorAll('#pgBody .peri')];
    if (!ts.length) return { sinTitulillos:true };
    const h2 = ts.reduce((a, b) =>
      a.getBoundingClientRect().top >= b.getBoundingClientRect().top ? a : b);
    const dice = h2.querySelector('.peri-dice') || h2;
    const antes = caja(dice);
    const r = h2.getBoundingClientRect();
    h2.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, detail:1,
      clientX:r.left + r.width/2, clientY:r.top + r.height/2 }));
    await pausa(600);
    const elegida = document.querySelector('.escena.aqui .escena-dice');
    const lista = document.getElementById('escenasLista');
    return {
      tocada: h2.dataset.peri,
      antes, despues: elegida ? caja(elegida) : null,
      paddingTop: parseFloat(lista.style.paddingTop) || 0,
      paddingBottom: parseFloat(lista.style.paddingBottom) || 0,
      alto: lista.clientHeight
    };
  });
  di('el de más abajo', borde);
  vale('(la prueba es válida) había un titulillo abajo que tocar',
       !borde.sinTitulillos, borde.tocada);
  vale('TAMBIÉN EL DE MÁS ABAJO SE QUEDA DONDE ESTABA',
       !!borde.despues &&
       Math.abs(borde.despues.y - borde.antes.y) <= 1.5 &&
       Math.abs(borde.despues.x - borde.antes.x) <= 1.5,
       'antes ' + JSON.stringify(borde.antes) + ' · después ' + JSON.stringify(borde.despues));
  vale('  y el acolchado cubre una pantalla',
       borde.paddingTop + borde.paddingBottom >= borde.alto - 2,
       borde.paddingTop + '+' + borde.paddingBottom + ' contra ' + borde.alto);

  /* LA CARRERA DEL CIERRE. Escape devuelve el foco al titulillo; Intro lo
     reabre. Si fin no mira generación, a los 300 ms vacía la lista reabierta. */
  titulo('el cierre no se come una lista reabierta');
  const carrera = await ses2.pagina.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true, cancelable:true }));
    const ts = [...document.querySelectorAll('#pgBody .peri')];
    const h2 = ts[Math.min(1, ts.length - 1)] || ts[0];
    h2.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true, cancelable:true }));
    await pausa(400);
    const caj = document.getElementById('escenas');
    return {
      puesta: caj.classList.contains('puesto'),
      visible: caj.classList.contains('visible'),
      cuantas: caj.querySelectorAll('.escena').length,
      expandido: h2.getAttribute('aria-expanded')
    };
  });
  di('la carrera', carrera);
  vale('ESCAPE E INTRO SEGUIDOS DEJAN LA LISTA PUESTA',
       carrera.puesta === true && carrera.visible === true && carrera.cuantas > 0,
       JSON.stringify(carrera));
  vale('  y el titulillo dice que está abierto',
       carrera.expandido === 'true', carrera.expandido);
  await ses2.pagina.keyboard.press('Escape');
  await ses2.pagina.waitForTimeout(500);

  /* EL SALTO. Lo que se afirma no es que cambie la hoja sino que la hoja a la
     que llega TRAE ESA PERÍCOPA: es lo que el lector pidió al tocarla. */
  titulo('tocar otra escena salta a su página');
  const salto = await ses2.pagina.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const ts = [...document.querySelectorAll('#pgBody .peri')];
    const h2 = ts[Math.min(1, ts.length - 1)];
    const r = h2.getBoundingClientRect();
    h2.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, detail:1,
      clientX:r.left + r.width/2, clientY:r.top + r.height/2 }));
    await pausa(600);
    const items = [...document.querySelectorAll('.escena')];
    const i = items.findIndex(x => x.classList.contains('aqui'));
    const otra = items[Math.max(0, i - 6)];
    const pedida = otra.dataset.peri;
    otra.click();
    return { pedida, desde: h2.dataset.peri };
  });
  await ses2.pagina.waitForTimeout(7000);
  const llegada = await ses2.pagina.evaluate(() => ({
    puesta: document.getElementById('escenas').classList.contains('puesto'),
    titulillos: [...document.querySelectorAll('#pgBody .peri')].map(t => t.dataset.peri)
  }));
  di('el salto', { salto, llegada });
  vale('(la prueba es válida) se pidió otra distinta de la que se leía',
       salto.pedida !== salto.desde, salto.pedida + ' desde ' + salto.desde);
  vale('LA HOJA A LA QUE LLEGA TRAE LA PERÍCOPA QUE SE TOCÓ',
       llegada.titulillos.includes(salto.pedida), llegada.titulillos.join(' '));
  vale('  y la lista se cerró sola', llegada.puesta === false, llegada.puesta);
  /* ================================================================
     LAS TRES QUE LEVANTÓ CODEX REVISANDO EL PR #84, y las tres eran de verdad.

     Van juntas porque son la misma clase de fallo: el gesto nuevo funciona
     con el dedo y se olvida de todo lo demás que ya había en la hoja —el
     teclado, el zoom, las flechas—. Es justo lo que no se ve probando a mano
     lo que acabas de escribir. */
  titulo('las escenas no se llevan por delante lo que ya había');

  /* 1 · SE LLEGA CON EL TECLADO. Y el titulillo sigue siendo un encabezado:
     ponerle role="button" le quitaría a un lector de pantalla lo que ese
     renglón ES —un sitio por el que saltar— para decirle que es un botón. */
  const conTeclado = await ses2.pagina.evaluate(async () => {
    const ts = [...document.querySelectorAll('#pgBody .peri')];
    const h2 = ts[Math.min(1, ts.length - 1)];
    h2.focus();
    const conFoco = document.activeElement === h2;
    h2.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true, cancelable:true }));
    await new Promise(z => setTimeout(z, 600));
    return { alcanzable: h2.tabIndex >= 0, conFoco,
             abrio: document.getElementById('escenas').classList.contains('puesto'),
             etiqueta: h2.tagName, papel: h2.getAttribute('role'),
             avisa: h2.getAttribute('aria-haspopup'),
             expandido: h2.getAttribute('aria-expanded') };
  });
  di('con el teclado', conTeclado);
  vale('SE LLEGA AL TITULILLO CON EL TECLADO Y SE ABRE CON INTRO',
       conTeclado.alcanzable === true && conTeclado.conFoco === true &&
       conTeclado.abrio === true, JSON.stringify(conTeclado));
  vale('  y sigue siendo un encabezado, no un botón',
       conTeclado.etiqueta === 'H2' && !conTeclado.papel &&
       conTeclado.avisa === 'dialog',
       conTeclado.etiqueta + ' role=' + conTeclado.papel + ' haspopup=' + conTeclado.avisa);
  vale('  y avisa que el diálogo está abierto',
       conTeclado.expandido === 'true', conTeclado.expandido);

  /* EL TABULADOR SE QUEDA DENTRO. Del último botón tiene que volver al
     primero, no saltar a #btnZoom. */
  const tabo = await ses2.pagina.evaluate(() => {
    const bots = [...document.querySelectorAll('#escenasLista .escena')];
    if (bots.length < 2) return { cortos:true };
    const primero = bots[0].dataset.peri;
    bots[bots.length - 1].focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Tab', bubbles:true, cancelable:true }));
    return { primero, cayo: document.activeElement && document.activeElement.dataset.peri,
             inerte: !!document.getElementById('pg').inert };
  });
  di('el tabulador', tabo);
  vale('EL TABULADOR NO SE SALE DEL DIÁLOGO',
       tabo.cortos !== true && tabo.cayo === tabo.primero,
       JSON.stringify(tabo));
  vale('  y la hoja detrás está inerte', tabo.inerte === true, tabo.inerte);

  /* 2 · CON LA LISTA PUESTA, LA HOJA DE DEBAJO NO SE MUEVE. Las flechas pasan
     hoja, y pasándola por debajo la marcada señalaba una perícopa de la hoja
     anterior y el ancla al que vuelve el foco ya no existía. */
  const antesDeFlecha = await ses2.pagina.evaluate(() => window.__estado || '');
  await ses2.pagina.keyboard.press('ArrowRight');
  await ses2.pagina.waitForTimeout(1700);
  const trasFlecha = await ses2.pagina.evaluate(() => ({
    estado: window.__estado || '',
    puesta: document.getElementById('escenas').classList.contains('puesto') }));
  di('la flecha con la lista puesta', { antesDeFlecha, trasFlecha });
  vale('LAS FLECHAS NO PASAN HOJA CON LA LISTA PUESTA',
       antesDeFlecha === trasFlecha.estado,
       antesDeFlecha + ' → ' + trasFlecha.estado);
  vale('  y la lista sigue donde estaba', trasFlecha.puesta === true, trasFlecha.puesta);
  await ses2.pagina.keyboard.press('Escape');
  await ses2.pagina.waitForTimeout(500);

  /* 3 · DE LEJOS, UN TOQUE EN EL PAPEL ES «VUELVE». El titulillo es papel de
     esa hoja como cualquier otro, y abriendo la lista pasaban las dos cosas a
     la vez: la lista medida contra la miniatura y el zoom cerrándose debajo,
     con lo que la hoja crecía y la lista se quedaba flotando despegada. */
  const deLejos = await ses2.pagina.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const lejos = () => !!document.querySelector('.zoom');
    document.getElementById('btnZoom').click();
    await pausa(1600);
    if (!lejos()) return { sinZoom:true };
    const ts = [...document.querySelectorAll('#pgBody .peri')];
    const h2 = ts[Math.min(1, ts.length - 1)];
    const r = h2.getBoundingClientRect();
    h2.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, detail:1,
      clientX:r.left + r.width/2, clientY:r.top + r.height/2 }));
    await pausa(900);
    return { seAlejo:true,
             lista: document.getElementById('escenas').classList.contains('puesto'),
             sigueLejos: lejos() };
  });
  di('de lejos', deLejos);
  vale('(la prueba es válida) la hoja llegó a alejarse',
       deLejos.seAlejo === true, JSON.stringify(deLejos));
  vale('DE LEJOS, TOCAR EL TITULILLO NO ABRE LA LISTA',
       deLejos.lista === false, deLejos.lista);
  vale('  y el toque hace lo de siempre: acercar la hoja',
       deLejos.sigueLejos === false, deLejos.sigueLejos);

  await cerrarParcial(ses2, 'las escenas del libro');

  titulo('sin pericopas.js la hoja se pinta igual');
  const cuarto = fs.mkdtempSync(path.join(os.tmpdir(), 'glossa-sin-peri-'));
  for (const f of ['index.html', 'bibles-included.js'])
    fs.copyFileSync(path.join(RAIZ, f), path.join(cuarto, f));
  const pelado = await abrir({ url: 'file://' + path.join(cuarto, 'index.html') });
  await abrirEn(pelado.pagina, DONDE);
  const sin = await pelado.pagina.evaluate(() => ({
    hayDatos: typeof GlossaPericopas !== 'undefined',
    titulillos: document.querySelectorAll('#pgBody .peri').length,
    versiculos: document.querySelectorAll('#pgBody .v').length,
    hoja: window.__hoja() }));
  di('sin el fichero', sin);
  vale('(la prueba es válida) el fichero de verdad no está',
       sin.hayDatos === false, sin);
  vale('LA HOJA SE PINTA IGUAL', sin.versiculos > 0, sin.versiculos + ' versículos');
  vale('  y sencillamente no hay titulillos', sin.titulillos === 0, sin.titulillos);
  fs.rmSync(cuarto, { recursive:true, force:true });

  await cerrar(pelado);
})();
