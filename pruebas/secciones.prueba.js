/* LOS LIBROS AGRUPADOS POR SECCIONES, CADA UNA SOBRE SU FONDO.

   En el panel de Libros, cada testamento va partido en sus secciones —el
   Antiguo en cuatro, el Nuevo en cinco— y cada sección lleva un fondo de color
   que sigue el contorno escalonado de sus botones. Los botones NO se mueven de
   su orden: el fondo se dibuja detrás, midiendo dónde quedó cada uno.

   Lo que esta prueba vigila es lo que se ve, no cómo se calcula:
     · cada libro cae DENTRO del fondo de su sección y fuera de los demás;
     · cada sección es UNA figura, no trozos sueltos;
     · entre dos libros vecinos no asoma papel: si son de la misma sección los
       une su fondo, y si son de dos distintas las dos se tocan;
     · y todo eso sigue valiendo después de girar el teléfono, que reparte los
       renglones de otra manera. Un fondo calculado una sola vez al abrir se
       quedaría torcido justo ahí. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

const AT = {
  'Pentateuco': ['GEN','EXO','LEV','NUM','DEU'],
  'Históricos': ['JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST'],
  'Poéticos':   ['JOB','PSA','PRO','ECC','SNG'],
  'Proféticos': ['ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON',
                 'MIC','NAM','HAB','ZEP','HAG','ZEC','MAL']
};
const NT = {
  'Evangelios':  ['MAT','MRK','LUK','JHN'],
  'Hechos':      ['ACT'],
  'Pablo':       ['ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM'],
  'Generales':   ['HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD'],
  'Apocalipsis': ['REV']
};

/* Llegar al panel de Libros y a la pestaña del testamento. Las pestañas se
   tocan con click porque no son un gesto: son un botón, y el banco ya las
   toca así en acuse. */
const IR_A = `async (testa) => {
  const pausa = ms => new Promise(z => setTimeout(z, ms));
  const visible = () => [...document.querySelectorAll('.rollo, #canto')]
    .find(r => getComputedStyle(r).display !== 'none');
  if (!visible()){ document.getElementById('pgCabeza').click(); await pausa(900); }
  const t = (visible() || document).querySelector('.pestanas [data-sec="libros"]');
  if (!t) return false;
  t.click(); await pausa(1100);
  const p = document.querySelector('#canto .canto-tab[data-testa="' + testa + '"]');
  if (!p) return false;
  if (!p.classList.contains('aqui')){ p.click(); await pausa(1100); }
  return true;
}`;

/* Mide todo desde la página: dónde quedó cada libro y en qué fondo cae. Las
   cuentas van en coordenadas de la rejilla, que son las del dibujo. */
const MEDIR = `(grupos) => {
  const r = document.querySelector('#canto .rejilla-libros');
  const svg = r && r.querySelector(':scope > svg.secciones-fondo');
  if (!svg) return { sinDibujo:true };
  const fondos = [...svg.querySelectorAll('path.fondo')];
  const orillas = svg.querySelectorAll('path.orilla').length;
  const de = {};
  for (const f of fondos) de[f.dataset.seccion] = f;
  const dentro = (f, x, y) => {
    const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
    return f.isPointInFill(pt);
  };
  const fuera = [], ajenos = [];
  const seccionDe = {};
  for (const [nombre, ids] of Object.entries(grupos)) for (const id of ids) seccionDe[id] = nombre;
  for (const [nombre, ids] of Object.entries(grupos)){
    for (const id of ids){
      const b = r.querySelector('.tabo[data-libro="' + id + '"]');
      if (!b){ fuera.push(id + ' (no está)'); continue; }
      /* Las cuatro esquinas, metidas 3 px: que el botón entero quede sobre su
         fondo y no solo el centro. */
      const pts = [[b.offsetLeft + 3, b.offsetTop + 3],
                   [b.offsetLeft + b.offsetWidth - 3, b.offsetTop + 3],
                   [b.offsetLeft + 3, b.offsetTop + b.offsetHeight - 3],
                   [b.offsetLeft + b.offsetWidth - 3, b.offsetTop + b.offsetHeight - 3],
                   [b.offsetLeft + b.offsetWidth / 2, b.offsetTop + b.offsetHeight / 2]];
      if (!de[nombre] || !pts.every(([x, y]) => dentro(de[nombre], x, y))) fuera.push(id);
      for (const [otro, f] of Object.entries(de))
        if (otro !== nombre && dentro(f, b.offsetLeft + b.offsetWidth / 2, b.offsetTop + b.offsetHeight / 2))
          ajenos.push(id + ' en ' + otro);
    }
  }
  /* El hueco entre dos libros seguidos del mismo renglón: papel no. */
  const bots = [...r.querySelectorAll('.tabo')];
  const huecos = [];
  for (let i = 1; i < bots.length; i++){
    const a = bots[i - 1], b = bots[i];
    if (b.offsetLeft <= a.offsetLeft) continue;
    const x = (a.offsetLeft + a.offsetWidth + b.offsetLeft) / 2;
    const y = a.offsetTop + a.offsetHeight / 2;
    if (!fondos.some(f => dentro(f, x, y))) huecos.push(a.dataset.libro + '|' + b.dataset.libro);
  }
  /* Una figura por sección: el camino tiene un solo «M». */
  const partidas = fondos.filter(f => (f.getAttribute('d').match(/M/g) || []).length !== 1)
                         .map(f => f.dataset.seccion);
  /* El dibujo no puede ser más grande que la lista: si lo es, la estira y
     deja papel en blanco debajo o un desplazamiento de lado que no lleva a
     nada. Lo de abajo del todo es el aire final, que ya es parte de la lista. */
  const aire = r.querySelector('.aire-final');
  const fondoLista = aire ? aire.offsetTop + aire.offsetHeight : 0;
  const sobra = { alto: Math.round(svg.getAttribute('height') - fondoLista),
                  ancho: Math.round(svg.getAttribute('width') - r.clientWidth),
                  desplazaDeLado: r.scrollWidth > r.clientWidth };
  return { secciones: fondos.map(f => f.dataset.seccion), orillas, fuera, ajenos, huecos, partidas,
           sobra, renglones: new Set(bots.map(b => b.offsetTop)).size };
}`;

async function revisar(p, grupos, cuando){
  const m = await p.evaluate(`(${MEDIR})(${JSON.stringify(grupos)})`);
  di('   ' + cuando, m.sinDibujo ? 'sin dibujo' : { renglones: m.renglones, secciones: m.secciones });
  vale('hay dibujo (' + cuando + ')', !m.sinDibujo);
  if (m.sinDibujo) return;
  vale('un fondo por sección, en orden', JSON.stringify(m.secciones) === JSON.stringify(Object.keys(grupos)),
       m.secciones);
  vale('y una orilla por sección', m.orillas === Object.keys(grupos).length, m.orillas);
  vale('cada libro entero sobre el fondo de su sección', m.fuera.length === 0, m.fuera);
  vale('ningún libro sobre el fondo de otra', m.ajenos.length === 0, m.ajenos);
  vale('entre dos libros vecinos no asoma papel', m.huecos.length === 0, m.huecos);
  vale('cada sección es una sola figura', m.partidas.length === 0, m.partidas);
  vale('el dibujo no estira la lista', m.sobra.alto <= 1 && m.sobra.ancho <= 1 && !m.sobra.desplazaDeLado,
       m.sobra);
}

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  titulo('el Antiguo, en el teléfono');
  vale('se llega a Libros · AT', await p.evaluate(`(${IR_A})('AT')`));
  await p.waitForTimeout(300);
  await revisar(p, AT, 'AT de pie');

  titulo('el Nuevo');
  vale('se llega a Libros · NT', await p.evaluate(`(${IR_A})('NT')`));
  await p.waitForTimeout(300);
  await revisar(p, NT, 'NT de pie');

  titulo('girar el teléfono rehace el dibujo');
  /* Acostado caben más libros por renglón, así que los cortes de renglón
     cambian y con ellos la forma de cada sección. */
  const antes = await p.evaluate(() =>
    document.querySelector('#canto svg.secciones-fondo path.fondo').getAttribute('d'));
  const v = p.viewportSize();
  await p.setViewportSize({ width: v.height, height: v.width });
  await p.waitForTimeout(700);
  const despues = await p.evaluate(() =>
    document.querySelector('#canto svg.secciones-fondo path.fondo').getAttribute('d'));
  vale('la forma cambió con el giro', antes !== despues);
  await revisar(p, NT, 'NT acostado');
  vale('de vuelta al AT', await p.evaluate(`(${IR_A})('AT')`));
  await p.waitForTimeout(300);
  await revisar(p, AT, 'AT acostado');

  /* Y DE VUELTA A DE PIE, que es el caso que se rompía: acostado la lista es
     más baja que de pie, pero al volver es al revés y el dibujo de antes ya no
     sirve de medida. Se gira dos veces para pasar por los dos sentidos. */
  titulo('y de vuelta a de pie');
  await p.setViewportSize(v);
  await p.waitForTimeout(700);
  await revisar(p, AT, 'AT otra vez de pie');
  await p.setViewportSize({ width: v.height, height: v.width });
  await p.waitForTimeout(700);
  await revisar(p, AT, 'AT acostado otra vez');

  await cerrar(sesion);
})();
