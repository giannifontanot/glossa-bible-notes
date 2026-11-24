/* LA CUENTA Y LA NUBE: DOS TELÉFONOS, UNA CUENTA.

   Contesta lo que importa de verdad de las cuentas: que lo de un aparato
   aparezca en el otro, que entrar no pierda nada de lo que el teléfono ya
   tenía, que borrar en uno borre en el otro, que las fotos de las notas
   viajen, y que salir deje todo en el aparato.

   SIN EL FIREBASE DE VERDAD. Las pruebas corren en GitHub con red y no deben
   escribir en el proyecto de Gianni. Lo que se sustituye es lo que el
   navegador baja de gstatic —los tres módulos del SDK—, que es una pieza de
   fuera y no de la aplicación: el programa de Glossa corre entero, el mismo
   que en un teléfono. Del otro lado de esos módulos falsos hay una base de
   datos de mentira aquí, en el proceso de la prueba, compartida por los dos
   navegadores: es lo que hace que sean dos aparatos y una cuenta. Y esa base
   hace cumplir las reglas de firestore.rules —cada uno solo en
   users/{su uid}—, así que una escritura fuera de su sitio se ve aquí.

   POR http Y NO POR ARCHIVO, como pwa.prueba.js: la cuenta solo existe sobre
   http(s), porque desde un archivo Firebase no deja entrar. La primera parte
   comprueba justo eso: abierta como archivo, la sección ni aparece. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { abrir, listo, cerrarParcial, di, vale, titulo, fin, RAIZ, TELEFONO, EJECUTABLE } = require('./comun');

const TIPOS = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
                '.json':'application/json', '.webmanifest':'application/manifest+json',
                '.png':'image/png', '.svg':'image/svg+xml', '.css':'text/css', '.webp':'image/webp' };

function servir(){
  const servidor = http.createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    /* Una página vacía del mismo sitio, para tocar el almacén de un aparato
       sin el programa abierto: con el programa corriendo, lo que se escribe a
       mano puede pisarlo él al irse. */
    if (ruta === '/vacio'){ res.writeHead(200, { 'Content-Type':'text/html' }); res.end('<!doctype html><title>.</title>'); return; }
    const f = path.join(RAIZ, ruta === '/' ? 'index.html' : ruta);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(z => servidor.listen(0, '127.0.0.1', () => z(servidor)));
}

/* ---------- LA NUBE DE MENTIRA ---------- */
const nube = new Map();          // ruta → { data, ver }
let reloj = 0;
const fueraDeSuSitio = [];
const enlaces = [];
const LECTORA = { uid:'lectora-ana', email:'ana@ejemplo.org', displayName:'Ana' };
const copia = x => JSON.parse(JSON.stringify(x));
function permitido(uid, ruta){
  const ok = !!uid && (ruta === 'users/' + uid || ruta.startsWith('users/' + uid + '/'));
  if (!ok) fueraDeSuSitio.push((uid || 'sin cuenta') + ' → ' + ruta);
  return ok;
}
function atender(op, a){
  if (op === 'google') return LECTORA;
  if (op === 'enlace'){ enlaces.push(a); return true; }
  if (op === 'entrarEnlace') return { uid:'lector-' + a.email.replace(/\W/g, ''), email:a.email, displayName:'' };
  const negar = () => { throw new Error('permission-denied'); };
  if (op === 'leer'){ if (!permitido(a.uid, a.ruta)) negar(); const r = nube.get(a.ruta); return r ? copia(r) : null; }
  if (op === 'lista'){
    if (!permitido(a.uid, a.ruta)) negar();
    const pre = a.ruta + '/';
    return [...nube.entries()].filter(([k]) => k.startsWith(pre) && !k.slice(pre.length).includes('/'))
                              .map(([k, r]) => ({ ...copia(r), id: k.slice(pre.length) }));
  }
  if (op === 'confirmar'){
    for (const [ruta, ver] of Object.entries(a.leidas)){
      const r = nube.get(ruta);
      if ((r ? r.ver : 0) !== ver) return false;
    }
    for (const o of a.ops) if (!permitido(a.uid, o.ruta)) negar();
    for (const o of a.ops){
      if (o.borrar) nube.delete(o.ruta);
      else nube.set(o.ruta, { data: copia(o.data), ver: ++reloj });
    }
    return true;
  }
  throw new Error('op desconocida ' + op);
}

/* Los tres módulos que el programa pide a gstatic, con la misma forma que los
   de verdad en lo que el programa usa. */
const MODULOS = {
  'firebase-app.js': `export function initializeApp(cfg, name){ return { cfg, name }; }`,
  'firebase-auth.js': `
    const B = (op, a) => window.__nubeFalsa(op, a);
    const L = 'falsa:usuario';
    const subs = [];
    const leer = () => { try { return JSON.parse(localStorage.getItem(L) || 'null'); } catch(_){ return null; } };
    function poner(a, u){
      a.currentUser = u; window.__falsaUid = u ? u.uid : null;
      if (u) localStorage.setItem(L, JSON.stringify(u)); else localStorage.removeItem(L);
      subs.forEach(f => f(u));
    }
    export function getAuth(){ const a = { currentUser: leer(), authStateReady: async () => {} };
                               window.__falsaUid = a.currentUser ? a.currentUser.uid : null; return a; }
    export function onAuthStateChanged(a, f){ subs.push(f); setTimeout(() => f(a.currentUser), 0); return () => {}; }
    export class GoogleAuthProvider { setCustomParameters(){} }
    export async function signInWithPopup(a){ poner(a, await B('google')); }
    export async function signInWithRedirect(){ throw Object.assign(new Error('no'), { code:'auth/operation-not-allowed' }); }
    export async function sendSignInLinkToEmail(a, email, s){ await B('enlace', { email, url: s.url }); }
    export function isSignInWithEmailLink(a, href){ return /[?&]oobCode=/.test(href); }
    export async function signInWithEmailLink(a, email, href){ poner(a, await B('entrarEnlace', { email, href })); }
    export async function signOut(a){ poner(a, null); }`,
  'firebase-firestore.js': `
    const B = (op, a) => window.__nubeFalsa(op, { ...a, uid: window.__falsaUid });
    export function getFirestore(app){ return { app }; }
    export function doc(db, ...s){ return { ruta: s.join('/') }; }
    export function collection(db, ...s){ return { ruta: s.join('/') }; }
    const foto = r => ({ id: r && r.id, exists: () => r != null, data: () => (r == null ? undefined : r.data) });
    export async function getDoc(ref){ return foto(await B('leer', { ruta: ref.ruta })); }
    export async function getDocs(col){ const rs = await B('lista', { ruta: col.ruta });
                                        return { size: rs.length, forEach: f => rs.forEach(r => f(foto(r))) }; }
    export async function setDoc(ref, data){ await B('confirmar', { leidas:{}, ops:[{ ruta: ref.ruta, data }] }); }
    export async function deleteDoc(ref){ await B('confirmar', { leidas:{}, ops:[{ ruta: ref.ruta, borrar:true }] }); }
    export async function runTransaction(db, fn){
      for (let i = 0; i < 5; i++){
        const leidas = {}, ops = [];
        const tx = {
          get: async ref => { const r = await B('leer', { ruta: ref.ruta }); leidas[ref.ruta] = r ? r.ver : 0; return foto(r); },
          set: (ref, data) => { ops.push({ ruta: ref.ruta, data }); return tx; },
          delete: ref => { ops.push({ ruta: ref.ruta, borrar:true }); return tx; } };
        const res = await fn(tx);
        if (await B('confirmar', { leidas, ops })) return res;
      }
      throw Object.assign(new Error('aborted'), { code:'aborted' });
    }`,
};

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/* Un aparato: su propio contexto —su propio almacén—, la red de fuera
   cortada como en el resto del banco, y los módulos falsos servidos. */
async function aparato(navegador, base, siembra){
  const ctx = await navegador.newContext({ ...TELEFONO, serviceWorkers:'block' });
  await ctx.route(/cdnjs\.cloudflare\.com|gstatic\.com|firebaseio\.com|googleapis\.com|openstreetmap\.org/, r => {
    const m = /firebasejs\/[^/]+\/([a-z-]+\.js)$/.exec(r.request().url());
    if (m && MODULOS[m[1]])
      return r.fulfill({ status:200, body: MODULOS[m[1]],
                         headers:{ 'Content-Type':'text/javascript', 'Access-Control-Allow-Origin':'*' } });
    return r.abort();
  });
  await ctx.exposeBinding('__nubeFalsa', (_, op, a) => atender(op, a));
  const pagina = await ctx.newPage();
  const errores = [];
  pagina.on('pageerror', e => errores.push(String(e).split('\n')[0]));
  if (siembra){
    await pagina.goto(base + 'vacio');
    await pagina.evaluate(s => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, siembra);
  }
  await pagina.goto(base);
  await listo(pagina);
  return { ctx, pagina, errores };
}
/* Herramientas se abre como la abre un dedo: el titulillo, la pestaña de
   Respaldo y la de Herramientas. */
async function abrirHerramientas(pagina){
  await pagina.evaluate(async () => {
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    document.querySelector('.pestanas button[data-sec="respaldo"]').click();
    await new Promise(z => setTimeout(z, 700));
    document.querySelector('#respaldo [data-sub="tools"]').click();
    await new Promise(z => setTimeout(z, 400));
  });
}
const estado = p => p.evaluate(() => JSON.parse(localStorage.getItem('glossa:nube:v1') || '{}'));
/* Una vuelta terminada después de `desde`. */
async function juntado(p, desde){
  await p.waitForFunction(t => {
    const e = JSON.parse(localStorage.getItem('glossa:nube:v1') || '{}');
    return e.cuando > t;
  }, desde, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(300);
}
const notasDe = p => p.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1') || '[]'));
const itemsEnNube = alm => {
  const items = {};
  for (const [k, r] of nube) if (k.startsWith('users/' + LECTORA.uid + '/datos/' + alm + '~')) Object.assign(items, r.data.items);
  return items;
};
async function irYVolver(a, base, cambiar){
  await a.pagina.goto(base + 'vacio');
  await a.pagina.evaluate(cambiar);
  const t = Date.now();
  await a.pagina.goto(base);
  await listo(a.pagina);
  await juntado(a.pagina, t);
}

(async () => {
  titulo('ABIERTA COMO ARCHIVO, NO HAY CUENTA');
  {
    /* Como archivo de verdad, aunque el banco corra servido por http (en
       GitHub corre así): si no, la sección sí aparece y se prueba otra cosa. */
    const s = await abrir({ url: 'file://' + path.join(RAIZ, 'index.html') });
    await abrirHerramientas(s.pagina);
    const r = await s.pagina.evaluate(() => ({
      google: !!document.getElementById('nubeGoogle'),
      glosas: !!document.querySelector('#respTools .herr-sec') }));
    vale('Herramientas abre', r.glosas, r);
    vale('  y sin la sección de la cuenta', !r.google, r);
    await cerrarParcial(s, 'archivo');
  }

  const servidor = await servir();
  const base = 'http://127.0.0.1:' + servidor.address().port + '/';
  const navegador = await chromium.launch({ executablePath: EJECUTABLE });

  titulo('EL PRIMER TELÉFONO ENTRA');
  const A = await aparato(navegador, base, {
    'glossa:notas:v1': [{ id:'nota-de-a', titulo:'De A', texto:'Hola desde A',
                          html:'<p>Hola desde A</p><img data-foto="foto-prueba-a1" alt="">' }],
    'glossa:notas:fotos:v1': { 'foto-prueba-a1': PIXEL },
  });
  await abrirHerramientas(A.pagina);
  const fuera = await A.pagina.evaluate(() => {
    const g = document.getElementById('nubeGoogle'), c = document.getElementById('nubeCorreo');
    const r = g && g.getBoundingClientRect();
    return { google: !!g && r.height >= 40 && !g.closest('[hidden]'), correo: !!c && !c.closest('[hidden]'),
             alto: r ? Math.round(r.height) : 0,
             antesDeGlosas: (() => { const s = g && g.closest('section'); const n = s && s.nextElementSibling;
                                     return !!n && /glosas|glosses/i.test(n.textContent); })() };
  });
  di('sin cuenta', fuera);
  vale('DOS BOTONES PARA ENTRAR, grandes', fuera.google && fuera.correo && fuera.alto >= 40, fuera);
  vale('  y la cuenta va encima de las glosas', fuera.antesDeGlosas, fuera);
  vale('SIN ENTRAR, NADA SALE A LA NUBE', nube.size === 0, nube.size);

  let t = Date.now();
  await A.pagina.evaluate(() => document.getElementById('nubeGoogle').click());
  await juntado(A.pagina, t);
  const dentroA = await A.pagina.evaluate(() => ({
    quien: document.querySelector('.cuenta-quien')?.textContent || '',
    estado: document.querySelector('.cuenta-estado')?.textContent || '',
    fueraVisible: !document.querySelector('.cuenta-fuera')?.hidden }));
  di('dentro', dentroA);
  vale('ENTRA Y DICE QUIÉN ES', /ana@ejemplo\.org/.test(dentroA.quien) && !dentroA.fueraVisible, dentroA.quien);
  vale('  y que está guardado', /guardado|saved/i.test(dentroA.estado), dentroA.estado);
  const marcasA = await A.pagina.evaluate(() => JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length);
  const enNubeA = Object.keys(itemsEnNube('marcas')).length;
  vale('LO DEL TELÉFONO SUBE: las glosas', marcasA > 0 && enNubeA === marcasA, enNubeA + ' de ' + marcasA);
  vale('  las notas', !!itemsEnNube('notas')['nota-de-a'], Object.keys(itemsEnNube('notas')));
  vale('  la foto de la nota, en su propio documento',
       !!nube.get('users/' + LECTORA.uid + '/fotos/foto-prueba-a1'), [...nube.keys()].filter(k => /fotos\//.test(k)));
  vale('  y por dónde va', !!itemsEnNube('lugar').todo, itemsEnNube('lugar'));

  titulo('EL SEGUNDO TELÉFONO, CON LO SUYO, ENTRA EN LA MISMA CUENTA');
  const B = await aparato(navegador, base, {
    'glossa:notas:v1': [{ id:'nota-de-b', titulo:'De B', texto:'Hola desde B' }],
  });
  await abrirHerramientas(B.pagina);
  t = Date.now();
  await B.pagina.evaluate(() => document.getElementById('nubeGoogle').click());
  await juntado(B.pagina, t);
  const notasB = await notasDe(B.pagina);
  const fotosB = await B.pagina.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:fotos:v1') || '{}'));
  di('notas en B', notasB.map(n => n.id));
  vale('B RECIBE LA NOTA DE A', notasB.some(n => n.id === 'nota-de-a'), notasB.map(n => n.id));
  vale('  y no pierde la suya', notasB.some(n => n.id === 'nota-de-b'), notasB.map(n => n.id));
  vale('  ni le sobra la nota vacía de estreno', notasB.length === 2, notasB.length);
  vale('  y la foto baja con la nota', fotosB['foto-prueba-a1'] === PIXEL, Object.keys(fotosB));
  const marcasB = await B.pagina.evaluate(() => JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length);
  vale('  y las glosas no se duplican', marcasB === marcasA, marcasB + ' / ' + marcasA);
  vale('LA NUBE TIENE LAS DOS NOTAS', !!itemsEnNube('notas')['nota-de-a'] && !!itemsEnNube('notas')['nota-de-b'],
       Object.keys(itemsEnNube('notas')));

  titulo('A SE ENTERA AL VOLVER');
  await irYVolver(A, base, () => {});
  const notasA = await notasDe(A.pagina);
  vale('A ABRE CON LA NOTA DE B', notasA.some(n => n.id === 'nota-de-b'), notasA.map(n => n.id));
  vale('  sin entrar otra vez', await A.pagina.evaluate(() => !!document.querySelector('.cuenta-dentro')),
       'sesión guardada');

  titulo('BORRAR EN UNO BORRA EN EL OTRO');
  await irYVolver(A, base, () => {
    const n = JSON.parse(localStorage.getItem('glossa:notas:v1'));
    localStorage.setItem('glossa:notas:v1', JSON.stringify(n.filter(x => x.id !== 'nota-de-b')));
  });
  vale('se fue de la nube', !itemsEnNube('notas')['nota-de-b'], Object.keys(itemsEnNube('notas')));
  await irYVolver(B, base, () => {});
  const notasB2 = await notasDe(B.pagina);
  vale('  y de B, al volver', !notasB2.some(n => n.id === 'nota-de-b') && notasB2.some(n => n.id === 'nota-de-a'),
       notasB2.map(n => n.id));

  titulo('SALIR NO BORRA NADA DEL TELÉFONO');
  await abrirHerramientas(B.pagina);
  await B.pagina.evaluate(() => document.getElementById('nubeSalir').click());
  await B.pagina.waitForTimeout(600);
  const salida = await B.pagina.evaluate(() => ({
    fuera: !document.querySelector('.cuenta-fuera').hidden,
    notas: JSON.parse(localStorage.getItem('glossa:notas:v1') || '[]').map(n => n.id) }));
  vale('vuelven los botones de entrar', salida.fuera, salida);
  vale('  y la nota sigue aquí', salida.notas.includes('nota-de-a'), salida.notas);

  titulo('ENTRAR CON UN ENLACE POR CORREO');
  const C = await aparato(navegador, base, null);
  await abrirHerramientas(C.pagina);
  await C.pagina.evaluate(() => document.getElementById('nubeCorreo').click());
  await C.pagina.waitForTimeout(200);
  await C.pagina.fill('#nubeCaja', 'beto@ejemplo.org');
  await C.pagina.evaluate(() => document.getElementById('nubeMandar').click());
  await C.pagina.waitForTimeout(800);
  const mandado = await C.pagina.evaluate(() => {
    const p = document.querySelector('.cuenta-enviado');
    return { visible: !!p && !p.hidden, texto: p ? p.textContent : '' };
  });
  vale('SE MANDA EL ENLACE Y SE DICE A DÓNDE', enlaces.length === 1 && mandado.visible && /beto@ejemplo\.org/.test(mandado.texto),
       { enlaces, mandado });
  vale('  y vuelve a esta misma página', enlaces[0] && enlaces[0].url === base, enlaces[0] && enlaces[0].url);
  t = Date.now();
  await C.pagina.goto(base + '?apiKey=x&mode=signIn&oobCode=codigo-de-prueba');
  await listo(C.pagina);
  await juntado(C.pagina, t);
  const porEnlace = await C.pagina.evaluate(() => ({
    url: location.href, quien: document.querySelector('.cuenta-quien')?.textContent || '',
    correoGuardado: localStorage.getItem('glossa:nube:correo:v1') }));
  di('por enlace', porEnlace);
  vale('AL TOCAR EL ENLACE, ENTRA SIN PREGUNTAR', /beto@ejemplo\.org/.test(porEnlace.quien), porEnlace.quien);
  vale('  y la dirección queda limpia', !/oobCode/.test(porEnlace.url), porEnlace.url);
  vale('  y su cuenta es suya, aparte de la de Ana',
       [...nube.keys()].some(k => k.startsWith('users/lector-betoejemploorg/')), [...nube.keys()].filter(k => !k.includes(LECTORA.uid)));

  titulo('CADA UNO EN LO SUYO');
  vale('NADIE ESCRIBIÓ NI LEYÓ FUERA DE SU SITIO', fueraDeSuSitio.length === 0, fueraDeSuSitio);
  for (const [n, s] of [['A', A], ['B', B], ['C', C]])
    vale('sin errores de JavaScript (' + n + ')', s.errores.length === 0, s.errores.length ? s.errores : 'ninguno');

  await navegador.close();
  servidor.close();
  fin();
})().catch(e => { console.error(e); process.exit(1); });
