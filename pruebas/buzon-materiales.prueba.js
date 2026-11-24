/* ============================================================
   EL BUZÓN, SEGUNDA PARTE: DE QUÉ ESTÁ HECHA LA BOLITA, Y QUE RUEDE.

   Quien envía una nota elige si su bolita es de metal, de goma o una pluma, y
   cada una cae a su manera, como la pidió Gianni:
   · metal: «cae, rebota poquito y nada más se rueda después»;
   · goma: «cae y rebota 2-3 veces y ya»;
   · pluma: cae despacito, meciéndose, y en el suelo «se desliza despacito».

   Y la queja que abrió todo esto: en su teléfono la bolita «cayó y se quedó
   en un solo lugar». Así que también se prueba que rueda con la orientación
   sola (sin acelerómetro) y con «menos movimiento» puesto en el sistema.

   LO ÚNICO QUE SE SUSTITUYE ES EL SENSOR, que es una pieza del navegador: se
   le mandan devicemotion y deviceorientation a mano. Las cartas entran por la
   puerta de siempre, un archivo de respaldo, para que caigan desde arriba
   como una que llega en vivo.
   ============================================================ */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

const CLAVE = 'glossa:notas:v1';
const PRUEBA = 'glossa:buzon:prueba:v1';
const MATERIALES = 'glossa:buzon:prueba-materiales:v2';

/* Lo que mira cada bolita desde que entra: dónde está en cada cuadro, durante
   once segundos. Solo mira. */
const VIGIA = () => {
  window.__trazas = [];
  new MutationObserver(cambios => {
    for (const c of cambios) for (const n of c.addedNodes){
      if (!(n instanceof HTMLElement) || !n.classList.contains('bola')) continue;
      const traza = { material:n.dataset.material, color:n.style.getPropertyValue('--bola'), puntos:[] };
      window.__trazas.push(traza);
      const t0 = performance.now();
      const mira = () => {
        if (!n.isConnected) return;
        const r = n.getBoundingClientRect();
        traza.puntos.push({ t:performance.now() - t0, x:r.left + r.width / 2, y:r.top + r.height / 2 });
        if (performance.now() - t0 < 11000) requestAnimationFrame(mira);
      };
      requestAnimationFrame(mira);
    }
  }).observe(document, { childList:true, subtree:true });
};

/* Los botes de una caída: cada vez que la bolita, que bajaba, vuelve a subir
   más de 4 px. Se cuentan los puntos más bajos que vienen seguidos de una
   subida de verdad. */
function botes(puntos){
  let n = 0, bajando = false, fondo = null, cima = null;
  for (let i = 1; i < puntos.length; i++){
    const dy = puntos[i].y - puntos[i - 1].y;
    if (dy > 0.3){ bajando = true; fondo = puntos[i].y; cima = null; }
    else if (dy < -0.3 && bajando && fondo !== null){
      cima = cima === null ? puntos[i].y : Math.min(cima, puntos[i].y);
      if (fondo - cima > 4){ n++; bajando = false; fondo = null; }
    }
  }
  return n;
}

async function inclinar(p, x, y, ms = 1600){
  await p.evaluate(async ([x, y, ms]) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms){
      window.dispatchEvent(new DeviceMotionEvent('devicemotion',
        { accelerationIncludingGravity:{ x, y, z:0 }, acceleration:{ x:0, y:0, z:0 }, interval:16 }));
      await new Promise(z => setTimeout(z, 16));
    }
  }, [x, y, ms]);
}
/* Un teléfono que da la orientación y nunca la aceleración. */
async function orientar(p, beta, gamma, ms = 1600){
  await p.evaluate(async ([beta, gamma, ms]) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms){
      window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha:0, beta, gamma, absolute:false }));
      await new Promise(z => setTimeout(z, 16));
    }
  }, [beta, gamma, ms]);
}

const bolas = p => p.evaluate(() => [...document.querySelectorAll('#buzon .bola:not(.se-va)')].map(b => {
  const r = b.getBoundingClientRect();
  return { x:r.left + r.width / 2, y:r.top + r.height / 2, material:b.dataset.material,
           color:b.style.getPropertyValue('--bola'), pluma:!!b.querySelector('svg.pluma'),
           alto:document.getElementById('buzon').clientHeight, ancho:innerWidth };
}));
const notas = p => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), CLAVE);

/* Una carta que llega por un archivo de respaldo, como llegaría en vivo: cae
   desde arriba. */
async function llega(p, id, material, color = '#3e7d5a'){
  const recibida = { estado:'cerrada', color, llegada:Date.now() };
  if (material) recibida.material = material;
  await p.locator('#archivoImp').setInputFiles({ name:'carta.json', mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({ formato:'glossa/marcas', marcas:[],
      notas:[{ id, titulo:'Carta ' + id, texto:'De prueba.', filtros:[], recibida }] })) });
}

/* Deja el aparato sin cartas cerradas, con las de prueba ya vistas. */
async function limpiar(p){
  await p.evaluate(([k, prueba, mat]) => {
    localStorage.setItem(k, JSON.stringify([
      { id:'nota-fiestas', titulo:'Las celebraciones judías', texto:'Pascua', filtros:[],
        recibida:{ estado:'abierta', color:'#3f6e9e', llegada:1 } }]));
    localStorage.setItem(prueba, 'abierta');
    localStorage.setItem(mat, JSON.stringify({ t:1, abiertas:[] }));
  }, [CLAVE, PRUEBA, MATERIALES]);
  await p.reload();
  await p.waitForTimeout(800);
}

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  /* La nota de Gianni ya leída, y nada más: es la seña de su aparato.

     SE SIEMBRA UNA VEZ DESDE LA PÁGINA, y no con un guion de arranque. Con
     el guion, aunque llevara su seña de «ya se sembró», a veces volvía a
     correr en una recarga posterior: se llevaba las notas de prueba ya
     hechas, la aplicación las hacía otra vez y caían de nuevo, y la prueba
     de «al volver a abrir ya no caen» salía roja sin que la aplicación
     tuviera la culpa. Es lo mismo que hace limpiar() más abajo.

     Y SE SIEMBRA DOS VECES, con un segundo y medio entre medias: la primera
     carga de la página puede estar todavía poniendo su seña de «ya hice las
     de prueba» cuando se siembra, y entonces, al recargar, la aplicación
     creía que ya estaban y no hacía ninguna. La segunda siembra gana. */
  const sembrar = () => p.evaluate(([k, prueba, mat]) => {
    /* Con una de la primera tanda todavía sin abrir, como en el teléfono de
       Gianni: la tanda nueva se la tiene que llevar. */
    localStorage.setItem(k, JSON.stringify([
      { id:'nota-fiestas', titulo:'Las celebraciones judías', texto:'Pascua', filtros:[],
        recibida:{ estado:'abierta', color:'#3f6e9e', llegada:1 } },
      { id:'nota-prueba-goma-1', titulo:'Bolita de goma roja', texto:'De prueba.', filtros:[],
        recibida:{ estado:'cerrada', color:'#a53d3d', material:'goma', llegada:1 } }]));
    localStorage.setItem(prueba, 'abierta');
    localStorage.setItem('glossa:buzon:prueba-materiales:v1', JSON.stringify({ t:1, abiertas:[] }));
    localStorage.removeItem(mat);
  }, [CLAVE, PRUEBA, MATERIALES]);
  await sembrar();
  await p.waitForTimeout(1500);
  await sembrar();
  await p.addInitScript(VIGIA);
  await p.reload();

  titulo('LAS DE PRUEBA: TRES DE METAL, TRES DE GOMA Y DOS PLUMAS');
  await p.waitForTimeout(1200);
  const hechas = (await notas(p)).filter(n => /^nota-prueba2-/.test(n.id));
  /* Si faltan, qué había en el almacén: sin esto, una corrida roja no
     dejaba ver si la aplicación no las hizo o si el almacén llegó vacío. */
  if (hechas.length !== 8) di('lo que había en el almacén', await p.evaluate(([k, mat]) => ({ ids:JSON.parse(localStorage.getItem(k) || '[]').map(n => n.id),
    mat:localStorage.getItem(mat), url:location.href, buzon:!!document.getElementById('buzon'),
    llaves:Object.keys(localStorage) }), [CLAVE, MATERIALES]));
  di('las notas de prueba', hechas.map(n => [n.id, n.recibida && n.recibida.material, n.recibida && n.recibida.color]));
  vale('son ocho', hechas.length === 8);
  const deMaterial = mat => hechas.filter(n => (n.recibida.material || 'metal') === mat);
  vale('tres de metal, tres de goma y dos plumas',
       deMaterial('metal').length === 3 && deMaterial('goma').length === 3 && deMaterial('pluma').length === 2);
  vale('las de metal no escriben material (una carta sin material es de metal)',
       deMaterial('metal').every(n => !('material' in n.recibida)));
  vale('todas cerradas y, dentro de cada material, cada una de su color',
       hechas.every(n => n.recibida.estado === 'cerrada') &&
       ['metal', 'goma', 'pluma'].every(m => new Set(deMaterial(m).map(n => n.recibida.color)).size === deMaterial(m).length));
  vale('y la de la primera tanda que seguía sin abrir se fue',
       !(await notas(p)).some(n => n.id === 'nota-prueba-goma-1'));
  const alPrincipio = await bolas(p);
  di('a 1.2 s', alPrincipio.map(b => [b.material, Math.round(b.x), Math.round(b.y)]));
  vale('ocho bolitas en pantalla', alPrincipio.length === 8);
  vale('las plumas se dibujan como pluma', alPrincipio.filter(b => b.pluma).length === 2 &&
       alPrincipio.filter(b => b.pluma).every(b => b.material === 'pluma'));
  vale('las plumas todavía van por arriba', alPrincipio.filter(b => b.material === 'pluma').every(b => b.y < b.alto * 0.4),
       alPrincipio.filter(b => b.material === 'pluma'));
  await p.waitForTimeout(4000);
  const aLos5 = await bolas(p);
  di('a 5 s', aLos5.map(b => [b.material, Math.round(b.x), Math.round(b.y)]));
  vale('las de goma y las de metal ya están abajo',
       aLos5.filter(b => b.material !== 'pluma').every(b => b.y > b.alto * 0.7), aLos5);
  await p.waitForTimeout(6500);
  const alFinal = await bolas(p);
  di('a 11.5 s', alFinal.map(b => [b.material, Math.round(b.x), Math.round(b.y)]));
  vale('y las plumas también llegaron abajo', alFinal.filter(b => b.material === 'pluma').every(b => b.y > b.alto * 0.7), alFinal);
  await p.reload();
  await p.waitForTimeout(1200);
  vale('al volver a abrir no se hacen otra vez', (await notas(p)).filter(n => /^nota-prueba2-/.test(n.id)).length === 8);
  const trazasOtraVez = await p.evaluate(() => window.__trazas.map(t => t.puntos[0] && t.puntos[0].y));
  vale('y ya no caen: están abajo', trazasOtraVez.length === 8 && trazasOtraVez.every(y => y > 915 * 0.6), trazasOtraVez);

  /* Cada material a solas, para que ningún choque cuente como bote. */
  const caidas = {};
  for (const [material, color] of [['metal', '#3f6e9e'], ['goma', '#a53d3d'], ['pluma', '#6e4c94']]){
    titulo('UNA DE ' + material.toUpperCase() + ' SOLA: CÓMO CAE, CÓMO RUEDA');
    await limpiar(p);
    await llega(p, 'nota-sola-' + material, material === 'metal' ? null : material, color);
    await p.waitForTimeout(material === 'pluma' ? 10500 : 3500);
    const traza = await p.evaluate(() => window.__trazas[window.__trazas.length - 1]);
    vale('(la prueba es válida) llegó una bolita de ' + material, traza && traza.material === material, traza && traza.material);
    const pts = (traza && traza.puntos) || [];
    const n = botes(pts);
    const llegada = pts.find(q => q.y > pts[pts.length - 1].y - 2) || {};
    caidas[material] = { botes:n, llegaA:Math.round(llegada.t || 0) };
    di('botes y cuándo llegó al suelo (ms)', caidas[material]);
    if (material === 'metal') vale('rebota poquito: un bote o ninguno', n <= 1, n);
    if (material === 'goma') vale('rebota dos o tres veces y ya', n >= 2 && n <= 3, n);
    if (material === 'pluma'){
      vale('casi no rebota', n === 0, n);
      const enElAire = pts.filter(q => q.y < pts[pts.length - 1].y - 60);
      const xs = enElAire.map(q => q.x);
      const vaiven = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
      di('lo que se mece de lado, en el aire (px)', Math.round(vaiven));
      vale('se mece de lado mientras cae', vaiven > 20, vaiven);
      let rapida = 0;
      for (let i = 10; i < pts.length; i++) rapida = Math.max(rapida, (pts[i].y - pts[i - 10].y) / ((pts[i].t - pts[i - 10].t) / 1000));
      di('lo más rápido que cae (px/s)', Math.round(rapida));
      vale('cae despacito', rapida < 220, rapida);
    }
    /* Primero a la orilla izquierda, y de ahí se mide cuánto corre en un
       ratito hacia la derecha: corto, para que ninguna llegue a la otra orilla
       y la pared no las empareje. */
    await inclinar(p, 5, 9, material === 'pluma' ? 9000 : 1800);
    const [antes] = await bolas(p);
    await inclinar(p, -4, 9, 700);
    const [inclinada] = await bolas(p);
    const corrio = inclinada.x - antes.x;
    caidas[material].corre = Math.round(corrio);
    di('desde la orilla izquierda, lo que corre en 0.7 s inclinado a la derecha (px)', [Math.round(antes.x), Math.round(corrio)]);
    vale('con el teléfono inclinado se va a la derecha', corrio > 8, corrio);
    await inclinar(p, 4, 9, 1500);
    const [vuelta] = await bolas(p);
    vale('y al inclinarlo al otro lado se regresa', vuelta.x < inclinada.x - 8, [inclinada.x, vuelta.x]);
    if (material === 'pluma'){
      await inclinar(p, 0, 9.81, 400);
      const [a] = await bolas(p);
      await inclinar(p, 0, 9.81, 800);
      const [b] = await bolas(p);
      vale('derecho el teléfono, la pluma se para enseguida', Math.abs(b.x - a.x) < 3, [a.x, b.x]);
    }
  }
  titulo('CADA UNA SE ARRASTRA A SU MANERA');
  di('lo que corrió cada una', caidas);
  vale('la de metal corre más que la de goma', caidas.metal.corre > caidas.goma.corre, caidas);
  vale('y la pluma se desliza despacito: mucho menos que la de goma', caidas.pluma.corre < caidas.goma.corre / 2, caidas);
  vale('la pluma tarda mucho más en llegar al suelo', caidas.pluma.llegaA > 2 * caidas.metal.llegaA, caidas);

  titulo('UN TELÉFONO QUE SOLO DA LA ORIENTACIÓN TAMBIÉN LA HACE RODAR');
  await limpiar(p);
  await llega(p, 'nota-orientacion', null, '#8c949c');
  await p.waitForTimeout(2500);
  const [quieta] = await bolas(p);
  await orientar(p, 60, 30, 1500);
  const [rodo] = await bolas(p);
  di('antes y después de ladearlo a la derecha', [Math.round(quieta.x), Math.round(rodo.x)]);
  vale('con beta y gamma sola rueda a la derecha', rodo.x > quieta.x + 40, [quieta.x, rodo.x]);
  await orientar(p, 60, -30, 1500);
  const [regreso] = await bolas(p);
  vale('y ladeado a la izquierda, a la izquierda', regreso.x < rodo.x - 40, [rodo.x, regreso.x]);

  titulo('LA CARTA GUARDA SU MATERIAL; UNO QUE NO EXISTE ES DE METAL');
  await limpiar(p);
  await llega(p, 'nota-con-goma', 'goma');
  await llega(p, 'nota-de-oro', 'oro');
  await p.waitForTimeout(600);
  const guardadas = await notas(p);
  const deGoma = guardadas.find(n => n.id === 'nota-con-goma'), deOro = guardadas.find(n => n.id === 'nota-de-oro');
  di('lo guardado', [deGoma && deGoma.recibida, deOro && deOro.recibida]);
  vale('la de goma se guarda de goma', deGoma && deGoma.recibida.material === 'goma');
  vale('la de «oro» se guarda sin material, que es metal', deOro && deOro.recibida && !('material' in deOro.recibida));
  const pintadas = await bolas(p);
  vale('y su bolita es de metal', pintadas.some(b => b.material === 'metal') && pintadas.some(b => b.material === 'goma'),
       pintadas.map(b => b.material));
  vale('sin errores de JavaScript', !sesion.errores.length, sesion.errores);
  await cerrar(sesion);

  titulo('CON «MENOS MOVIMIENTO» EN EL SISTEMA, LA BOLITA IGUAL RUEDA');
  /* Antes, con esa opción puesta, el sensor ni se encendía. Lo que se
     respeta es la llegada: aparece abajo, sin caer. */
  const quieto = await abrir({ reducedMotion:'reduce' });
  const q = quieto.pagina;
  /* Dos veces, por lo mismo que la siembra de arriba. */
  const sembrarQ = () => q.evaluate(([k, prueba, mat]) => {
    localStorage.setItem(k, JSON.stringify([
      { id:'nota-fiestas', titulo:'Las celebraciones judías', texto:'Pascua', filtros:[],
        recibida:{ estado:'abierta', color:'#3f6e9e', llegada:1 } },
      { id:'nota-cerrada', titulo:'Cerrada', texto:'Una.', filtros:[],
        recibida:{ estado:'cerrada', color:'#a53d3d', llegada:1 } }]));
    localStorage.setItem(prueba, 'abierta');
    localStorage.setItem(mat, JSON.stringify({ t:1, abiertas:[] }));
  }, [CLAVE, PRUEBA, MATERIALES]);
  await sembrarQ();
  await q.waitForTimeout(1500);
  await sembrarQ();
  await q.reload();
  /* Se espera a que salga la bolita, hasta seis segundos, y no un tiempo
     fijo: en una corrida, a los 1.2 s todavía no había ninguna y la prueba
     salió roja sin que la aplicación tuviera la culpa. */
  await q.waitForFunction(() => document.querySelector('#buzon .bola:not(.se-va)'), null, { timeout:6000 }).catch(() => {});
  await q.waitForTimeout(400);
  const [abajo] = await bolas(q);
  vale('(la prueba es válida) hay una bolita, abajo', abajo && abajo.y > abajo.alto * 0.7, abajo);
  await inclinar(q, -4, 9, 1500);
  const [derecha] = await bolas(q);
  di('antes y después de inclinarlo', [Math.round(abajo.x), Math.round(derecha.x)]);
  vale('inclinado el teléfono, rueda', derecha.x > abajo.x + 40, [abajo.x, derecha.x]);
  vale('sin errores de JavaScript', !quieto.errores.length, quieto.errores);
  await cerrar(quieto);
})().catch(e => { console.error(e); process.exit(1); });
