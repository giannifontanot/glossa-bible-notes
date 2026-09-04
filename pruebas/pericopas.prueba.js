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
     panel de editores y tipógrafos lo levantó. Ahora va redonda, semibold y un
     tercio más grande, que es lo contrario de lo que decía esta línea. */
  vale('  del serif del texto, pero MÁS GRANDE y con más peso',
       !!puesto.estilo && !!puesto.texto &&
       /Palatino|Georgia|Noto|serif/i.test(puesto.estilo.familia) &&
       puesto.estilo.tam > puesto.texto.tam * 1.15 &&
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
                 titulillos: [...document.querySelectorAll('#pgBody .peri')]
                   .map(t => t.dataset.peri).join('|') });
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
      trozo = x.slice(i, i + 90);
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
