/* LAS GLOSAS DE ESTRENO.

   Un lector recién abierto no enseña para qué sirve: hoja de Biblia y nada
   más. Con unas notas puestas se ve de un vistazo qué es una glosa, dónde
   vive, que llevan color y que se pueden etiquetar.

   LO QUE DE VERDAD VIGILA ESTA PRUEBA NO ES QUE APAREZCAN, sino que NO
   REAPAREZCAN. Sembrar de más es un fallo mucho peor que no sembrar: significa
   pisarle las glosas a alguien, o devolverle las que acaba de borrar. La
   condición es «la clave nunca existió», no «no hay marcas», y esa diferencia
   es justo lo que se comprueba abajo con la clave puesta en '[]'.

   Y se comprueba el ANCLAJE, no solo la existencia. Una marca lleva ini/fin, y
   unos números escritos a ojo señalan el sitio equivocado en cuanto cambia una
   coma: aquí se exige que el trozo del versículo que va de ini a fin sea
   exactamente la frase que la glosa dice estar citando. */
const { abrir, listo, cerrar, cerrarParcial, di, vale, titulo,
        APP, TELEFONO } = require('./comun');

/* LAS DE ESTRENO, UNA POR PERLA Y JUAN 3:16. Fueron tres de la genealogía de
   Mateo y Juan 3:16; Gianni quitó las de Mateo y pidió una glosa esperanzadora
   en cada versículo con perla, con pocas etiquetas de emoji que se repiten.
   La cita es la de la Biblia Libre, que es donde corre el banco. Ver
   GLOSAS_DE_ESTRENO y PERLAS_DE_ESTRENO en index.html. */
const ESPERADAS = [
  { libro:'GEN', cap:8,   vers:11, cita:'trajo en su pico una hoja fresca de olivo',             etiqueta:'🌅Esperanza' },
  { libro:'GEN', cap:15,  vers:5,  cita:'Mira al cielo, y dime si puedes contar las estrellas',  etiqueta:'📜Promesa' },
  { libro:'PSA', cap:118, vers:22, cita:'La piedra rechazada por los constructores ha llegado a ser la piedra angular', etiqueta:'🌅Esperanza' },
  { libro:'ISA', cap:40,  vers:8,  cita:'la palabra de nuestro Dios perdurará para siempre',     etiqueta:'⚓FeFirme' },
  { libro:'EZK', cap:36,  vers:26, cita:'Te daré una mente nueva y pondré un espíritu nuevo dentro de ti', etiqueta:'🌱VidaNueva' },
  { libro:'JON', cap:2,   vers:1,  cita:'Jonás oró al Señor su Dios desde el vientre del pez',   etiqueta:'🌅Esperanza' },
  { libro:'MAT', cap:13,  vers:44, cita:'lleno de alegría se fue y vendió todo lo que tenía',    etiqueta:'🌱VidaNueva' },
  { libro:'MAT', cap:16,  vers:19, cita:'Te daré las llaves del reino de los cielos',            etiqueta:'⚓FeFirme' },
  { libro:'JHN', cap:15,  vers:5,  cita:'Yo soy la vid y ustedes las ramas',                     etiqueta:'❤️AmorDeDios' },
  { libro:'1CO', cap:13,  vers:4,  cita:'El amor es paciente y amable',                          etiqueta:'❤️AmorDeDios' },
  { libro:'HEB', cap:6,   vers:19, cita:'Esta esperanza es nuestra ancla espiritual',            etiqueta:'⚓FeFirme' },
  { libro:'REV', cap:2,   vers:10, cita:'yo te daré la corona de la vida',                       etiqueta:'📜Promesa' },
  { libro:'JHN', cap:3,   vers:16, cita:'Porque Dios amó al mundo',                              etiqueta:'❤️AmorDeDios' },
];
/* LAS PERLAS: doce, una figura distinta cada una, y cada una sobre un
   versículo que también lleva glosa. */
const PERLAS = [
  ['GEN',8,11,'paloma'], ['GEN',15,5,'estrella'], ['PSA',118,22,'piedra'], ['ISA',40,8,'hoja'],
  ['EZK',36,26,'corazon'], ['JON',2,1,'pez'], ['MAT',13,44,'cofre'], ['MAT',16,19,'llave'],
  ['JHN',15,5,'uvas'], ['1CO',13,4,'llama'], ['HEB',6,19,'ancla'], ['REV',2,10,'corona']
];
/* RECARGAR TRAS ESCRIBIR, Y COMPROBAR QUE LA PÁGINA NUEVA LO VE.

   Esta suite escribe en el almacén por debajo de la aplicación y recarga.
   Antes recargaba con location.reload() y esperaba un tiempo fijo; ahora
   recarga con page.reload() —que espera a la navegación entera y a que la
   portada se vaya— y comprueba en el almacén que lo escrito sigue ahí.

   Salía a veces una página «un paso atrás» —la versión anterior, la nota
   sin editar, la sepia sin poner— y se persiguió hasta el banco: su
   initScript, en algunas recargas, veía el almacén vacío y escribía encima
   sus valores de arranque. Eso se arregló donde estaba —ver bibliaDeCasa en
   comun.js— y esta comprobación se queda como red: si algún día vuelve a
   pasar, se repite la escritura y se cuenta, en vez de leer lo de antes y
   cantar un fallo de la aplicación que no lo es. */
async function recargarTras(p, escribir, arg, quedo){
  for (let i = 0; i < 4; i++){
    await p.evaluate(escribir, arg);
    await p.waitForTimeout(300);
    await p.reload();
    if (await p.evaluate(quedo, arg)) return i;
  }
  return -1;
}
const ETIQUETAS_ES = ['🌅Esperanza', '📜Promesa', '⚓FeFirme', '🌱VidaNueva', '❤️AmorDeDios'];
const ETIQUETAS_EN = ['🌅Hope', '📜Promise', '⚓FirmFaith', '🌱NewLife', '❤️GodsLove'];

(async () => {
  /* Sin las glosas del banco: esta suite es la que mira la siembra de verdad
     —ver GLOSAS_DE_CASA en comun.js—. */
  const sesion = await abrir({ glosasDeCasa: false });
  const p = sesion.pagina;

  titulo('al estrenar');
  const puestas = await p.evaluate(() => {
    const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    return { guardadas: M.map(m => ({ libro:m.libro, cap:m.cap, vers:m.vers, cita:m.cita, color:m.color,
                                      etiquetas:m.etiquetas, ini:m.ini, fin:m.fin,
                                      tieneNota: !!(m.nota && m.nota.length > 10) })),
             enElMargen: document.querySelectorAll('#pgMargin .gl').length,
             conEtiqueta: document.querySelectorAll('#pgMargin .gl-tag').length };
  });
  di('lo que quedó guardado', puestas.guardadas.map(m => m.libro + ' ' + m.cap + ':' + m.vers +
     ' «' + m.cita + '» ' + m.color + ' #' + (m.etiquetas||[]).join(',')));
  vale('están todas las de estreno', puestas.guardadas.length === ESPERADAS.length,
       puestas.guardadas.length + ' de ' + ESPERADAS.length);
  for (const e of ESPERADAS){
    const m = puestas.guardadas.find(x => x.libro === e.libro && x.cap === e.cap &&
                                          x.vers === e.vers);
    vale(e.libro + ' ' + e.cap + ':' + e.vers + ' · ' + e.etiqueta,
         !!m && m.cita === e.cita, m ? m.cita : 'no está');
    vale('   con su etiqueta y su nota',
         !!m && (m.etiquetas||[]).join() === e.etiqueta && m.tieneNota,
         m ? (m.etiquetas||[]).join() : '');
  }
  /* POCAS ETIQUETAS QUE SE REPITEN, que es lo que Gianni pidió: cinco para
     trece glosas, cada una con su emoji delante. */
  const usadas = [...new Set(puestas.guardadas.flatMap(m => m.etiquetas || []))];
  vale('CINCO ETIQUETAS, TODAS CON EMOJI, que se repiten',
       usadas.length === 5 && usadas.every(t => ETIQUETAS_ES.includes(t)) &&
       usadas.every(t => puestas.guardadas.filter(m => (m.etiquetas||[]).includes(t)).length >= 2),
       usadas.join(' '));
  /* LAS TRES DE LA GENEALOGÍA YA NO ESTÁN. El banco abre en Mateo 1 —ver
     bibliaDeCasa—, que es justo donde vivían: su margen tiene que salir
     vacío. */
  vale('LAS TRES DE MATEO 1 SE FUERON',
       !puestas.guardadas.some(m => m.libro === 'MAT' && m.cap === 1) &&
       puestas.enElMargen === 0, puestas.enElMargen + ' en el margen de Mateo 1');

  titulo('el anclaje señala la frase que dice citar');
  /* Se compara el trozo que va de ini a fin con la cita. Si los números
     estuvieran escritos a ojo, aquí saldría otra cosa —o media palabra— y la
     marca resaltaría el sitio equivocado.

     CADA UNA CONTRA SU LIBRO, y esto es lo que cambió. Antes se leía el
     versículo de la HOJA ABIERTA, que valía mientras las tres eran de Mateo 1;
     con la de Juan 3:16 sembrada, buscarla en la genealogía daba null y la
     prueba cantaba un fallo que no lo era. Ahora el texto se saca del archivo
     de datos por libro, capítulo y versículo, que es de donde lo sacó la
     siembra: así la comprobación dice lo que quería decir —que los números
     apuntan a la frase— sin depender de qué hoja esté abierta. */
  di('ini/fin contra el texto', await p.evaluate(() => {
    const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const D = window.GLOSSA_DATA;
    const texto = m => {
      const v = D && D.versiones[m.versionOrigen];
      const b = v && v.texto[m.libro];
      const c = b && b[String(m.cap)];
      return (c && c[m.vers - 1]) || null;
    };
    return M.map(m => {
      const t = texto(m);
      return { libro:m.libro, vers:m.vers, cita:m.cita,
               enElTexto: t ? t.slice(m.ini, m.fin) : null,
               cuadra: !!t && t.slice(m.ini, m.fin) === m.cita };
    });
  }).then(r => {
    vale('todos los anclajes cuadran',
         r.length === ESPERADAS.length && r.every(x => x.cuadra),
         r.map(x => x.libro + ' ' + x.vers + ':' +
                    (x.cuadra ? 'ok' : '«' + x.enElTexto + '»')).join(' '));
    return r;
  }));

  titulo('al volver NO se siembra otra vez');
  di('con una editada a mano', await recargarTras(p, () => {
    const M = JSON.parse(localStorage.getItem('glossa:marcas:v1'));
    M[0].nota = 'ESTA LA CAMBIÉ YO';
    M[0].color = 'orange';
    localStorage.setItem('glossa:marcas:v1', JSON.stringify(M));
  }, null, () => (JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]')[0] || {}).nota ===
                 'ESTA LA CAMBIÉ YO').then(async () => {
    return p.evaluate(() => {
      const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
      return { cuantas:M.length, nota:M[0] && M[0].nota, color:M[0] && M[0].color };
    });
  }).then(r => {
    vale('siguen siendo las mismas', r.cuantas === ESPERADAS.length, r.cuantas);
    /* si volviera a sembrar, esto se habría perdido */
    vale('y lo editado se respeta', r.nota === 'ESTA LA CAMBIÉ YO' && r.color === 'orange',
         r.nota + ' / ' + r.color);
    return r;
  }));

  titulo('si las borras todas, NO vuelven');
  /* La diferencia entre «la clave nunca existió» y «no hay marcas». Borrarlas
     a propósito deja la clave en '[]', y devolverlas sería deshacer lo que
     acabas de hacer. */
  di('con la clave vacía', await recargarTras(p, () => {
    localStorage.setItem('glossa:marcas:v1', '[]');
  }, null, () => localStorage.getItem('glossa:marcas:v1') === '[]').then(async () => {
    return p.evaluate(() => ({
      guardadas: JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length,
      enElMargen: document.querySelectorAll('#pgMargin .gl').length }));
  }).then(r => {
    vale('la hoja se queda limpia', r.guardadas === 0 && r.enElMargen === 0,
         r.guardadas + ' guardadas, ' + r.enElMargen + ' en el margen');
    return r;
  }));

  titulo('el papel arranca en sepia');
  /* Un papel blanco de pantalla es el de un documento, no el de un libro. Con
     el riel arriba el papel queda crema y la tinta se va al marrón CON él —los
     dos a la vez, que es lo que distingue una hoja vieja de una foto con
     filtro—.
     Lo que se comprueba no es el número sino las dos cosas que pueden
     romperse: que el deslizador de Formato diga lo mismo que se ve —si el
     guion y el HTML se desincronizan, el control miente— y que esto sea solo
     un ARRANQUE, no una imposición: quien guardó el suyo, incluido el cero,
     tiene que recuperarlo.
     EL ARRANQUE ERA 75 Y AHORA ES 100. El número vive en DOS sitios —el
     `value` del input en el HTML y el `let sepia` del guion— y esta prueba
     existe justamente porque desincronizarlos no rompe nada visible: el
     control enseña uno y la hoja usa el otro. */
  di('recién abierto', await p.evaluate(() => ({
    deslizador: +document.getElementById('sepia').value,
    rotulo: document.getElementById('sepiaAhora').textContent.trim(),
    papel: getComputedStyle(document.getElementById('pg')).getPropertyValue('--papel').trim(),
    tinta: getComputedStyle(document.getElementById('pgBody')).color
  })).then(r => {
    vale('el deslizador arranca en 100', r.deslizador === 100, r.deslizador);
    vale('y el rótulo dice lo mismo', r.rotulo === '100', r.rotulo);
    /* el papel deja de ser el blanco de sepia 0 (250,247,241) */
    vale('el papel sale entintado', /237|23\d/.test(r.papel) && r.papel !== 'rgb(250,247,241)', r.papel);
    /* Y LA TINTA VIAJA CON EL PAPEL. Entintar solo el fondo daría una foto con
       filtro; el marrón de la letra es lo que hace que parezca papel viejo. */
    vale('y la tinta se va al marrón con él', r.tinta !== 'rgb(36, 31, 26)', r.tinta);
    return r;
  }));

  di('con el cero guardado a propósito', await recargarTras(p, () => {
    const c = 'glossa:ajustes:v1';
    const a = JSON.parse(localStorage.getItem(c) || '{}');
    a.v = 1; a.sepia = 0; localStorage.setItem(c, JSON.stringify(a));
  }, null, () => JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}').sepia === 0).then(async () => {
    return p.evaluate(() => ({
      deslizador: +document.getElementById('sepia').value,
      tinta: getComputedStyle(document.getElementById('pgBody')).color }));
  }).then(r => {
    vale('el arranque no pisa lo guardado', r.deslizador === 0, r.deslizador);
    vale('y el papel vuelve a blanco', r.tinta === 'rgb(36, 31, 26)', r.tinta);
    return r;
  }));
  /* se deja el ajuste como estaba para las secciones de abajo */
  await p.evaluate(async () => {
    const c = 'glossa:ajustes:v1';
    const a = JSON.parse(localStorage.getItem(c) || '{}');
    delete a.sepia; localStorage.setItem(c, JSON.stringify(a));
  });

  titulo('con otra versión guardada');
  /* EL ORDEN CONTRA LOS AJUSTES, que es lo que la revisión levantó.
     cargarAjustes restaura la versión guardada; sembrando antes de eso, las
     glosas se calculaban contra la versión por defecto y el lector abría la
     suya. Medido con RVR1909 y ninguna marca —alguien que probó el programa y
     cambió de versión sin llegar a escribir—: las tres se sembraban con citas
     de VBL y los anclajes caían en «David, hijo d», « Zara: y Phares en» y
     «r de Urías: ». Resaltado sobre trozos sin sentido.
     Lo que se exige aquí NO es un número: es que lo que siembre esté BIEN
     ANCLADO. En una versión donde la frase no existe, cero es la respuesta
     correcta —una nota en español sobre un texto en inglés tampoco diría
     nada—, y lo que nunca vale es una marca señalando lo que no es.
     El mínimo de la versión de casa sale de ESPERADAS y no de un número
     escrito aquí: el día que se siembre otra, esta línea ya lo sabe.
     Y DESDE QUE CADA GLOSA TRAE SU FRASE DE CADA VERSIÓN, las cuatro siembran
     todas: la RV1909 con las suyas, la Berean con las inglesas. Antes la
     RV1909 se quedaba en cero. */
  for (const [v, minimo] of [['rv1909', ESPERADAS.length], ['bsb', ESPERADAS.length],
                             ['vbl', ESPERADAS.length]]){
    di('guardado en ' + v, await recargarTras(p, v => {
      localStorage.removeItem('glossa:marcas:v1');
      const c = 'glossa:ajustes:v1';
      const a = JSON.parse(localStorage.getItem(c) || '{}');
      a.v = 1; a.version = v; localStorage.setItem(c, JSON.stringify(a));
    }, v, v => JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}').version === v).then(async () => {
      return p.evaluate(() => {
        const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
        /* Del archivo de datos y no de la hoja abierta, por lo mismo que en
           el bloque del anclaje: desde que hay una glosa de Juan, la hoja de
           Mateo no puede responder por todas. */
        const D = window.GLOSSA_DATA;
        const trozo = m => {
          const ver = D && D.versiones[m.versionOrigen];
          const b = ver && ver.texto[m.libro];
          const c = b && b[String(m.cap)];
          const t = (c && c[m.vers - 1]) || null;
          return t ? t.slice(m.ini, m.fin) : null;
        };
        return { version: document.getElementById('pgVersion').textContent.trim(),
                 sembradas: M.length,
                 origen: [...new Set(M.map(m => m.versionOrigen))],
                 malPuestas: M.filter(m => trozo(m) !== m.cita)
                              .map(m => m.libro + ' ' + m.vers + ':«' + trozo(m) + '»'),
                 citas: M.map(m => m.cita) };
      });
    }).then(r => {
      /* la única regla dura: ninguna mal anclada, sea cual sea el número */
      vale('ninguna señala lo que no es · ' + v, r.malPuestas.length === 0,
           r.malPuestas.length ? r.malPuestas.join(' ') : r.sembradas + ' bien puestas');
      vale('y salen de la versión abierta · ' + v,
           r.sembradas === 0 || r.origen.join() === v, r.origen.join() || '(ninguna)');
      if (minimo) vale('y se siembran todas · ' + v,
                       r.sembradas === minimo, r.sembradas);
      return r;
    }));
  }

  /* LA PORTADA. Tapa la mesa mientras se pinta la primera hoja, y encima
     tiene un mínimo de tiempo para que el letrero se lea. Mientras está
     puesta se come TODO lo que toques: es una capa fija a pantalla completa.
     Esto lo vigila por los dos lados —que tape al principio, y que después
     se quite del todo y devuelva los toques—, porque cuando se quedó puesta
     de más el síntoma no se parecía nada a la causa: la caja de la glosa no
     abría, las marcas no respondían, y todo eso desde una tapa invisible que
     ya estaba transparente pero seguía delante. */
  titulo('la portada se pone y se quita');
  {
    const p2 = await sesion.navegador.newPage({ ...TELEFONO });
    const fallos2 = [];
    p2.on('pageerror', e => fallos2.push(String(e).split('\n')[0]));
    await p2.goto(APP);
    const alPrincipio = await p2.evaluate(() => {
      const e = document.getElementById('portada');
      return { existe: !!e, tapando: !!e && !e.classList.contains('fuera') };
    });
    vale('al abrir está puesta', alPrincipio.existe && alPrincipio.tapando, alPrincipio);

    await listo(p2);
    const despues = await p2.evaluate(() => {
      const e = document.getElementById('portada');
      const fuera = !e || e.classList.contains('fuera');
      /* el punto de en medio del cuerpo del texto: lo que el lector toca */
      const c = document.getElementById('pgBody').getBoundingClientRect();
      const x = Math.round(c.left + c.width / 2), y = Math.round(c.top + c.height / 2);
      const encima = document.elementFromPoint(x, y);
      return { fuera, dentroDelCuerpo: !!encima && !!encima.closest('#pgBody'),
               quienTapa: encima ? (encima.id || encima.className || encima.tagName) : '(nadie)' };
    });
    vale('luego se va', despues.fuera, despues.fuera);
    vale('  y el toque llega al texto', despues.dentroDelCuerpo, despues.quienTapa);
    vale('  sin errores (portada)', fallos2.length === 0, fallos2.length ? fallos2 : 'ninguno');
    await p2.close();
  }

  /* ================================================================
     AL ESTRENAR DE VERDAD: LA BEREAN, EN JUAN 1, Y LAS GLOSAS EN INGLÉS.

     El resto de esta suite —y del banco— arranca en la Biblia Libre, como
     alguien que ya la eligió: ver bibliaDeCasa en comun.js. Este bloque no:
     abre con `biblia: null`, sin nada sembrado, que es el teléfono recién
     estrenado. Que abra en la Berean lo pidió el dueño del repo; que abra en
     JUAN 1, Gianni, que además cambió las glosas de estreno: ya no tres en
     Mateo 1 sino una esperanzadora en cada versículo con perla, y Juan 3:16.
     En inglés, porque el texto lo es: las frases en español no están en la
     Berean.
     Y el anclaje se exige igual que arriba: el trozo de ini a fin tiene que
     ser la frase citada, en el texto de la Berean. */
  titulo('al estrenar en la Berean');
  const sesB = await abrir({ biblia: null });
  const pB = sesB.pagina;
  const enB = await pB.evaluate(() => {
    const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const D = window.GLOSSA_DATA;
    const trozo = m => {
      const ver = D && D.versiones[m.versionOrigen];
      const c = ver && ver.texto[m.libro] && ver.texto[m.libro][String(m.cap)];
      const t = (c && c[m.vers - 1]) || null;
      return t ? t.slice(m.ini, m.fin) : null;
    };
    return { version: document.getElementById('pgVersion').textContent.trim(),
             guardada: (JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}')).version,
             cabeza: document.getElementById('pgCabeza').textContent.replace(/\s+/g, ' ').trim(),
             glosas: M.map(m => ({ donde: m.libro + ' ' + m.cap + ':' + m.vers,
                                   cita: m.cita, origen: m.versionOrigen, etiquetas: m.etiquetas,
                                   nota: m.nota || '', bien: trozo(m) === m.cita })) };
  });
  di('estrenada', enB);
  vale('ABRE EN LA BEREAN', enB.version === 'BSB', enB.version);
  vale('  y la guarda como su versión', enB.guardada === 'bsb', enB.guardada);
  vale('ABRE EN JUAN 1', /^John 1\b/.test(enB.cabeza), enB.cabeza);
  vale('TRECE GLOSAS DE ESTRENO', enB.glosas.length === ESPERADAS.length,
       enB.glosas.map(m => m.donde).join(', '));
  vale('  en inglés, ancladas al texto de la Berean',
       enB.glosas.every(m => m.origen === 'bsb' && m.bien && /[a-z]/i.test(m.cita) &&
                             !/[áéíóúñ¿¡]/i.test(m.nota)),
       enB.glosas.filter(m => !m.bien).map(m => m.donde + ' mal anclada').join(' · ') || 'todas bien');
  /* Y QUE SE VEAN: el dueño del repo pidió subrayar más texto, que dos
     palabras casi no se distinguen en la hoja. */
  vale('  subrayando una frase entera, no dos palabras',
       enB.glosas.every(m => m.cita.split(/\s+/).length >= 5),
       enB.glosas.filter(m => m.cita.split(/\s+/).length < 5).map(m => m.cita).join(' · ') || 'todas');
  vale('  cada una con algo que decir',
       enB.glosas.every(m => m.nota.length > 100), enB.glosas.map(m => m.nota.length).join(', '));
  vale('  con su etiqueta en inglés, de cinco que se repiten',
       enB.glosas.every(m => (m.etiquetas || []).length === 1 && ETIQUETAS_EN.includes(m.etiquetas[0])) &&
       new Set(enB.glosas.map(m => m.etiquetas[0])).size === 5,
       [...new Set(enB.glosas.map(m => (m.etiquetas || []).join()))].join(' '));

  /* LOS ADORNOS DE ESTRENO: doce perlas por la Biblia, una cinta en Juan
     3:16 y un rastro de escrituras conocidas. Pedidos para que los paneles de
     perlas, cintas e historial no salgan vacíos la primera vez —las doce
     perlas, por Gianni—. Se mira lo guardado, que es lo que la aplicación
     vuelve a leer mañana, y que la perla de verdad salga en la hoja de 1
     Corintios 13. */
  titulo('y con sus perlas, su cinta y su rastro');
  const adornos = await pB.evaluate(() => ({
    piedras: JSON.parse(localStorage.getItem('glossa:piedras:v1') || '[]'),
    cintas: JSON.parse(localStorage.getItem('glossa:separadores:v1') || '[]'),
    rastro: JSON.parse(localStorage.getItem('glossa:historial:v1') || '[]')
  }));
  di('los adornos', { piedras: adornos.piedras.map(x => x.libro + ' ' + x.cap + ':' + x.vers + ' ' + x.color),
                      cintas: adornos.cintas.map(x => x.libro + ' ' + x.cap + ':' + x.vers),
                      rastro: adornos.rastro.map(x => x.libro + ' ' + x.cap + ':' + x.vers).join(', ') });
  const lasPerlas = adornos.piedras.map(x => [x.libro, x.cap, x.vers, x.forma].join(' '));
  vale('DOCE PERLAS, CADA UNA CON SU FIGURA, de Génesis a Apocalipsis',
       JSON.stringify(lasPerlas) === JSON.stringify(PERLAS.map(x => x.join(' '))),
       lasPerlas.join(' · '));
  vale('  ninguna figura repetida', new Set(adornos.piedras.map(x => x.forma)).size === 12);
  vale('  y cada perla tiene su glosa en el mismo versículo',
       adornos.piedras.every(x => enB.glosas.some(m => m.donde === x.libro + ' ' + x.cap + ':' + x.vers)));
  vale('  el fuego rojo de 1 Corintios 13 sigue siendo rojo',
       adornos.piedras.some(x => x.libro === '1CO' && x.forma === 'llama' && /^carmin/.test(x.color)));
  vale('  todas dentro de lo que un teléfono ve de la hoja',
       adornos.piedras.every(x => x.x >= .3 && x.x <= .58 && x.y >= .2 && x.y <= .75),
       adornos.piedras.map(x => x.x + ',' + x.y).join(' '));
  vale('UNA CINTA EN JUAN 3:16, y no roja',
       adornos.cintas.length === 1 && adornos.cintas[0].libro === 'JHN' &&
       adornos.cintas[0].cap === 3 && adornos.cintas[0].vers === 16 &&
       !/^carmin/.test(adornos.cintas[0].color),
       JSON.stringify(adornos.cintas));
  vale('UN RASTRO DE ESCRITURAS CONOCIDAS, y Juan 3:16 entre ellas',
       adornos.rastro.length >= 8 &&
       adornos.rastro.some(x => x.libro === 'JHN' && x.cap === 3 && x.vers === 16),
       adornos.rastro.length);
  vale('  del más nuevo al más viejo',
       adornos.rastro.every((x, i, a) => i === 0 || a[i - 1].t > x.t));
  /* La perla se ve donde se puso: se va a 1 Corintios 13:4 por los ajustes
     —el mismo camino que usa la aplicación para volver a donde te quedaste—,
     fundiéndolos con lo guardado para no perder la versión. */
  await pB.evaluate(() => {
    const aj = JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}');
    Object.assign(aj, { v:1, libro:'1CO', cap:13, vers:4 });
    localStorage.setItem('glossa:ajustes:v1', JSON.stringify(aj));
  });
  await pB.reload(); await pB.waitForTimeout(2600);
  const enCorintios = await pB.evaluate(() => ({
    perla: !!document.querySelector('#piedrero .piedra'),
    sigue: (JSON.parse(localStorage.getItem('glossa:piedras:v1') || '[]')).length
  }));
  di('en 1 Corintios 13', enCorintios);
  vale('  y la perla sale en su hoja', enCorintios.perla === true, enCorintios);
  vale('  sin sembrarse otras al recargar', enCorintios.sigue === 12, enCorintios.sigue);
  /* ================================================================
     LA INTERFAZ HABLA EL IDIOMA DE LA BIBLIA ABIERTA.
     Lo pidió el dueño del repo: con la Berean, todo en inglés; con una Biblia
     española, todo en español. Esta es la primera parte —la portada, los
     nombres de los libros, el encabezado, las pestañas, el panel de Libros y
     el pie de CERRAR—; las demás llegan panel por panel. Se mira en la misma
     instalación estrenada y luego, cambiando la versión guardada y
     recargando, en español. */
  titulo('la interfaz en inglés al estrenar, y en español con una Biblia española');
  const leerUI = () => pB.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const vis = () => [...document.querySelectorAll('.rollo, #canto')]
      .find(r => getComputedStyle(r).display !== 'none');
    if (!vis()){ document.getElementById('pgCabeza').click(); await pausa(900); }
    const t = (vis() || document).querySelector('.pestanas [data-sec="libros"]');
    if (t) t.click();
    await pausa(1000);
    const q = sel => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
    return {
      lang: document.documentElement.lang,
      portada: [q('#btnPortadaFoto'), q('#btnPortadaSeguir'), q('#btnPortadaPiedras')],
      cabeza: q('#pgCabeza'),
      pestana: (document.querySelector('#canto .pestanas [data-sec="libros"]') || {}).title || null,
      casilla: (document.getElementById('chkFlechas') || {}).parentElement ? document.getElementById('chkFlechas').parentElement.textContent.trim() : null,
      libros: [...document.querySelectorAll('#canto .rejilla-libros .tabo')].slice(0, 4).map(b => b.textContent.trim()),
      testa: [...document.querySelectorAll('#canto .canto-tab')].map(b => b.textContent.trim()),
      cerrar: q('#canto .cerrar-pie'),
      /* Los tres botones de GLOSAS nacen en el marcado y los traduce la tabla
         UI_EN; el primer renglón del combo de los días lo pinta pintarDias.
         Los dos caminos, cada uno con su testigo. */
      glosas: ['btnLetraGlosas', 'btnVerEtiquetas', 'btnElegirGlosas']
        .map(id => (document.getElementById(id) || {}).textContent || null),
      dias: ((document.querySelector('#selDia option') || {}).textContent) || null,
      /* Y los puntos de la hoja, que son la puerta de perlas, cintas y rastro. */
      puntos: ['btnPiedras', 'btnCintas', 'btnHistorial']
        .map(id => (document.getElementById(id) || {}).title || null),
      /* FORMATO, NOTAS y RESPALDO: un testigo de cada camino. La alineación la
         escribe rotularFormato; el «+ Nueva nota» y la primera nota nacen
         ANTES de leer los ajustes —ahí estaba la trampa—; y Exportar viene del
         marcado, por la tabla. */
      formato: (document.getElementById('btnAli') || {}).textContent || null,
      nota: ((document.querySelector('#notas .indice-crear') || {}).textContent || '').trim() || null,
      primeraNota: ((document.querySelector('#notas [data-nota]') || {}).textContent || '').trim() || null,
      exportar: (document.getElementById('btnExportar') || {}).textContent || null
    };
  });
  const ui = await leerUI();
  di('en la Berean', ui);
  vale('EN LA BEREAN, EL DOCUMENTO DICE QUE ES INGLÉS', ui.lang === 'en', ui.lang);
  vale('  la portada: photo · continue · Pearls', ui.portada.join('|') === 'photo|continue|Pearls', ui.portada.join('|'));
  /* La hoja está donde la dejó el bloque de arriba, en 1 Corintios 13. */
  vale('  el encabezado nombra el libro en inglés', /^1 Corinthians\s/.test(ui.cabeza || ''), ui.cabeza);
  vale('  la pestaña de Libros habla inglés', ui.pestana === 'Books: go to a passage', ui.pestana);
  vale('  la casilla también', ui.casilla === 'Show where you can tap', ui.casilla);
  vale('  los libros se llaman en inglés', ui.libros.includes('Matthew') && ui.libros.includes('Mark'), ui.libros.join(', '));
  vale('  las pestañas del testamento: OT y NT', ui.testa.join('|') === 'OT|NT', ui.testa.join('|'));
  vale('  y el pie dice CLOSE', ui.cerrar === 'CLOSE', ui.cerrar);
  vale('  GLOSAS: font · filter · update', ui.glosas.join('|') === 'font|filter|update', ui.glosas.join('|'));
  vale('  y el filtro de días: all days', ui.dias === 'all days', ui.dias);
  vale('  los puntos de la hoja: pearls · bookmarks · seen',
       ui.puntos.join('|') === 'See your pearls|See your bookmarks|What you have seen', ui.puntos.join('|'));
  vale('  FORMATO, NOTAS y RESPALDO: left · + New note · Note 1 · Export',
       [ui.formato, ui.nota, ui.primeraNota, ui.exportar].join('|') === 'left|+ New note|Note 1|Export',
       [ui.formato, ui.nota, ui.primeraNota, ui.exportar].join('|'));
  await pB.evaluate(() => {
    const a = JSON.parse(localStorage.getItem('glossa:ajustes:v1') || '{}');
    Object.assign(a, { v:1, version:'vbl', libro:'MAT', cap:1, vers:1 });
    localStorage.setItem('glossa:ajustes:v1', JSON.stringify(a));
  });
  await pB.reload(); await pB.waitForTimeout(2600);
  const uiEs = await leerUI();
  di('en la Biblia Libre', uiEs);
  vale('EN LA BIBLIA LIBRE, TODO EN ESPAÑOL', uiEs.lang === 'es', uiEs.lang);
  vale('  la portada: foto · continuar · Perlas', uiEs.portada.join('|') === 'foto|continuar|Perlas', uiEs.portada.join('|'));
  vale('  el encabezado dice Mateo', /^Mateo\s/.test(uiEs.cabeza || ''), uiEs.cabeza);
  vale('  la pestaña: Libros', uiEs.pestana === 'Libros: ir a un pasaje', uiEs.pestana);
  vale('  la casilla en español', uiEs.casilla === 'Señalar dónde se puede tocar', uiEs.casilla);
  vale('  los libros en español', uiEs.libros.includes('Mateo'), uiEs.libros.join(', '));
  vale('  AT y NT', uiEs.testa.join('|') === 'AT|NT', uiEs.testa.join('|'));
  vale('  y el pie dice CERRAR', uiEs.cerrar === 'CERRAR', uiEs.cerrar);
  vale('  GLOSAS: letra · filtrar · actualizar', uiEs.glosas.join('|') === 'letra|filtrar|actualizar', uiEs.glosas.join('|'));
  vale('  y el filtro de días: todos los días', uiEs.dias === 'todos los días', uiEs.dias);
  vale('  los puntos de la hoja: perlas · separadores · visto',
       uiEs.puntos.join('|') === 'Ver tus perlas|Ver tus separadores|Lo que has visto', uiEs.puntos.join('|'));
  /* La primera nota NO se comprueba aquí: se estrenó en la Berean, así que se
     llama «Note 1» y así se queda —es un título del lector, no un rótulo—. */
  vale('  FORMATO, NOTAS y RESPALDO: izquierda · + Nueva nota · Exportar',
       [uiEs.formato, uiEs.nota, uiEs.exportar].join('|') === 'izquierda|+ Nueva nota|Exportar',
       [uiEs.formato, uiEs.nota, uiEs.exportar].join('|'));
  await cerrarParcial(sesB, 'el estreno en la Berean');

  await cerrar(sesion);
})();
