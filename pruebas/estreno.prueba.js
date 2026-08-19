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
const { abrir, cerrar, cerrarParcial, di, vale, titulo } = require('./comun');

const ESPERADAS = [
  { vers:1, cita:'Hijo de David',      color:'yellow' },
  { vers:3, cita:'su madre fue Tamar', color:'blue'   },
  { vers:6, cita:'la esposa de Urías', color:'green'  },
];

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  titulo('al estrenar');
  const puestas = await p.evaluate(() => {
    const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    return { guardadas: M.map(m => ({ cap:m.cap, vers:m.vers, cita:m.cita, color:m.color,
                                      etiquetas:m.etiquetas, ini:m.ini, fin:m.fin,
                                      tieneNota: !!(m.nota && m.nota.length > 10) })),
             enElMargen: document.querySelectorAll('#pgMargin .gl').length,
             conEtiqueta: document.querySelectorAll('#pgMargin .gl-tag').length };
  });
  di('lo que quedó guardado', puestas.guardadas.map(m => m.cap + ':' + m.vers + ' «' + m.cita +
     '» ' + m.color + ' #' + (m.etiquetas||[]).join(',')));
  vale('son tres', puestas.guardadas.length === 3, puestas.guardadas.length);
  for (const e of ESPERADAS){
    const m = puestas.guardadas.find(x => x.vers === e.vers);
    vale('Mateo 1:' + e.vers + ' · ' + e.color,
         !!m && m.cap === 1 && m.cita === e.cita && m.color === e.color,
         m ? m.cita + ' / ' + m.color : 'no está');
    vale('   con su etiqueta y su nota',
         !!m && (m.etiquetas||[]).join() === 'Interesante' && m.tieneNota);
  }
  vale('las tres se ven en el margen', puestas.enElMargen === 3, puestas.enElMargen);
  vale('y las tres llevan etiqueta', puestas.conEtiqueta === 3, puestas.conEtiqueta);

  titulo('el anclaje señala la frase que dice citar');
  /* Se lee el versículo de la hoja y se compara el trozo que va de ini a fin
     con la cita. Si los números estuvieran escritos a ojo, aquí saldría otra
     cosa —o media palabra— y la marca resaltaría el sitio equivocado. */
  di('ini/fin contra el texto', await p.evaluate(() => {
    const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const texto = k => {
      const el = document.querySelector('#pgBody .v[data-k="' + k + '"]');
      return el ? el.textContent.replace(/^\s*\d+\s*/, '') : null;
    };
    return M.map(m => {
      const t = texto(m.vers - 1);            /* data-k va desde cero */
      return { vers:m.vers, cita:m.cita,
               enElTexto: t ? t.slice(m.ini, m.fin) : null,
               cuadra: !!t && t.slice(m.ini, m.fin) === m.cita };
    });
  }).then(r => {
    vale('los tres anclajes cuadran', r.length === 3 && r.every(x => x.cuadra),
         r.map(x => x.vers + ':' + (x.cuadra ? 'ok' : '«' + x.enElTexto + '»')).join(' '));
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
    vale('siguen siendo tres', r.cuantas === 3, r.cuantas);
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

  titulo('con otra versión guardada');
  /* EL ORDEN CONTRA LOS AJUSTES, que es lo que la revisión levantó.
     cargarAjustes restaura la versión guardada; sembrando antes de eso, las
     glosas se calculaban contra la versión por defecto y el lector abría la
     suya. Medido con RVR1909 y ninguna marca —alguien que probó el programa y
     cambió de versión sin llegar a escribir—: las tres se sembraban con citas
     de VBL y los anclajes caían en «David, hijo d», « Zara: y Phares en» y
     «r de Urías: ». Resaltado sobre trozos sin sentido.
     Lo que se exige aquí NO es que siembre tres: es que lo que siembre esté
     BIEN ANCLADO. En una versión donde la frase no existe, cero es la
     respuesta correcta —una nota en español sobre un texto en inglés tampoco
     diría nada—, y lo que nunca vale es una marca señalando lo que no es. */
  for (const [v, minimo] of [['rv1909', 0], ['bsb', 0], ['vbl', 3]]){
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
        const trozo = m => {
          const el = document.querySelector('#pgBody .v[data-k="' + (m.vers - 1) + '"]');
          const t = el ? el.textContent.replace(/^\s*\d+\s*/, '') : null;
          return t ? t.slice(m.ini, m.fin) : null;
        };
        return { version: document.getElementById('pgVersion').textContent.trim(),
                 sembradas: M.length,
                 origen: [...new Set(M.map(m => m.versionOrigen))],
                 malPuestas: M.filter(m => trozo(m) !== m.cita).map(m => m.vers + ':«' + trozo(m) + '»'),
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

  await cerrar(sesion);
})();
