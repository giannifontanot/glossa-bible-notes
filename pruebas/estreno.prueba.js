/* LAS TRES GLOSAS DE ESTRENO.

   Un lector recién abierto no enseña para qué sirve: hoja de Biblia y nada
   más. Con tres notas puestas se ve de un vistazo qué es una glosa, dónde
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

/* LAS DE ESTRENO YA NO SON TODAS DE MATEO, así que cada una trae su libro.
   Tres son de la genealogía y la cuarta es Juan 3:16, que se sembró porque es
   el versículo que todo el mundo sabe de memoria y por eso mismo el que menos
   se lee. Las comprobaciones de aquí abajo dejaron de contar «tres» y de dar
   Mateo por supuesto: contar a mano lo que ya está escrito en una lista es
   tener que acordarse dos veces. */
const ESPERADAS = [
  { libro:'MAT', cap:1, vers:1, cita:'Hijo de David',          color:'yellow' },
  { libro:'MAT', cap:1, vers:3, cita:'su madre fue Tamar',     color:'blue'   },
  { libro:'MAT', cap:1, vers:6, cita:'la esposa de Urías',     color:'green'  },
  { libro:'JHN', cap:3, vers:16, cita:'lo hizo de esta manera', color:'orange' },
];
/* Las que se ven en la hoja de arranque, que es la primera de Mateo. La de
   Juan está guardada igual, pero su margen es el de otro libro. */
const EN_LA_PRIMERA_HOJA = ESPERADAS.filter(e => e.libro === 'MAT');

(async () => {
  const sesion = await abrir();
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
    vale(e.libro + ' ' + e.cap + ':' + e.vers + ' · ' + e.color,
         !!m && m.cita === e.cita && m.color === e.color,
         m ? m.cita + ' / ' + m.color : 'no está');
    vale('   con su etiqueta y su nota',
         !!m && (m.etiquetas||[]).join() === 'Interesante' && m.tieneNota);
  }
  /* En el margen sólo las de este libro: la hoja de arranque es Mateo 1. */
  vale('las de Mateo se ven en el margen',
       puestas.enElMargen === EN_LA_PRIMERA_HOJA.length, puestas.enElMargen);
  vale('y todas llevan etiqueta',
       puestas.conEtiqueta === EN_LA_PRIMERA_HOJA.length, puestas.conEtiqueta);

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
  di('con una editada a mano', await p.evaluate(async () => {
    const M = JSON.parse(localStorage.getItem('glossa:marcas:v1'));
    M[0].nota = 'ESTA LA CAMBIÉ YO';
    M[0].color = 'orange';
    localStorage.setItem('glossa:marcas:v1', JSON.stringify(M));
    location.reload();
  }).then(async () => {
    await p.waitForTimeout(2900);
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
  di('con la clave vacía', await p.evaluate(async () => {
    localStorage.setItem('glossa:marcas:v1', '[]');
    location.reload();
  }).then(async () => {
    await p.waitForTimeout(2900);
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

  di('con el cero guardado a propósito', await p.evaluate(async () => {
    const c = 'glossa:ajustes:v1';
    const a = JSON.parse(localStorage.getItem(c) || '{}');
    a.v = 1; a.sepia = 0; localStorage.setItem(c, JSON.stringify(a));
    location.reload();
  }).then(async () => {
    await p.waitForTimeout(2900);
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
     escrito aquí: el día que se siembre otra, esta línea ya lo sabe. */
  for (const [v, minimo] of [['rv1909', 0], ['bsb', 0], ['vbl', ESPERADAS.length]]){
    di('guardado en ' + v, await p.evaluate(async v => {
      localStorage.removeItem('glossa:marcas:v1');
      const c = 'glossa:ajustes:v1';
      const a = JSON.parse(localStorage.getItem(c) || '{}');
      a.v = 1; a.version = v; localStorage.setItem(c, JSON.stringify(a));
      location.reload();
    }, v).then(async () => {
      await p.waitForTimeout(3200);
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
      if (minimo) vale('en la versión de casa sí se siembran · ' + v,
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

  await cerrar(sesion);
})();
