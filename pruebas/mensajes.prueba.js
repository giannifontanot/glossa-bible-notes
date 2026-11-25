/* EL CORREO ENTRE LECTORES: TRES TELÉFONOS, TRES CUENTAS.

   Contesta lo que Gianni pidió: que sin cuenta no se pueda enviar y se diga
   por qué; que cada lector tenga su código y su QR; que agregar a alguien
   sea escribir su código; que una nota mandada llegue al otro teléfono con
   sus fotos, en el color que eligió quien la manda, como carta cerrada que
   se lee y no se escribe, y que su bolita caiga desde arriba; que un grupo
   se arme con un código, que quien entra con él quede dentro sin esperar a
   nadie y con el creador en sus contactos para contestarle, que solo el
   creador le mande al grupo, y que lo que llega con Glossa cerrada aparezca
   abajo en vez de caer.

   SIN EL FIREBASE DE VERDAD, como nube.prueba.js: lo que se sustituye son
   los tres módulos que el navegador baja de gstatic. Del otro lado hay una
   base de datos de mentira en el proceso de la prueba, compartida por los
   tres navegadores, que hace cumplir las mismas reglas que firestore.rules
   —cada uno en lo suyo, la guía de códigos uno por uno, el buzón ajeno solo
   para dejar cartas a su nombre, y los miembros de un grupo cada uno el
   suyo—. Lo que esas reglas niegan se apunta, y al final no puede haber
   nada apuntado.

   POR http, porque sobre un archivo no hay cuenta. Y los toques son toques:
   tap de Playwright, que manda los eventos de un dedo. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { listo, di, vale, titulo, fin, RAIZ, TELEFONO, EJECUTABLE } = require('./comun');

const TIPOS = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
                '.json':'application/json', '.webmanifest':'application/manifest+json',
                '.png':'image/png', '.svg':'image/svg+xml', '.css':'text/css', '.webp':'image/webp' };
function servir(){
  const servidor = http.createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta === '/vacio'){ res.writeHead(200, { 'Content-Type':'text/html' }); res.end('<!doctype html><title>.</title>'); return; }
    const f = path.join(RAIZ, ruta === '/' ? 'index.html' : ruta);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(z => servidor.listen(0, '127.0.0.1', () => z(servidor)));
}

/* ---------- LA NUBE DE MENTIRA, CON LAS REGLAS DE firestore.rules ---------- */
const nube = new Map();          // ruta → { data, ver }
let reloj = 0;
const negadas = [];
/* Para simular que el acuse de «leída» no llega a la nube —la red se cortó,
   o se leyó sin cuenta—: mientras esté puesto, escribir un acuse falla como
   falla la red, no como una regla. */
let sinRedAcuses = false;
const copia = x => JSON.parse(JSON.stringify(x));
const COLORES = ['#9c6b3a', '#3f6e9e', '#3e7d5a', '#a53d3d', '#6e4c94', '#8c949c'];
const ANA = { uid:'lectora-ana', email:'ana@ejemplo.org', displayName:'Ana' };
const BETO = { uid:'lector-beto', email:'beto@ejemplo.org', displayName:'Beto' };
const CARLA = { uid:'lectora-carla', email:'carla@ejemplo.org', displayName:'Carla' };
function regla(uid, ruta, accion, data){
  if (!uid) return false;
  const p = ruta.split('/');
  if (p[0] === 'users' && p[1] === uid) return true;
  if (p[0] === 'codigos' && p.length === 2){
    if (accion === 'leer') return true;
    if (accion === 'lista') return false;
    const hay = nube.get(ruta);
    if (accion === 'borrar') return !!hay && hay.data.uid === uid;
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(p[1]) || !data || data.uid !== uid) return false;
    if (!['persona', 'grupo'].includes(data.tipo) || typeof data.nombre !== 'string' || !data.nombre) return false;
    if (!hay) return true;
    return hay.data.uid === uid && data.tipo === hay.data.tipo && (data.gid || null) === (hay.data.gid || null);
  }
  if (p[0] === 'users' && p[2] === 'buzon' && p.length === 4)
    return accion === 'escribir' && !nube.get(ruta) && !!data && data.de === uid && COLORES.includes(data.color)
           && typeof data.titulo === 'string' && typeof data.texto === 'string' && typeof data.html === 'string';
  /* LAS PALOMITAS: quien recibió deja en lo del remitente su acuse, con su
     propio uid en el nombre y dentro; un «leída» no vuelve a «llegó». */
  if (p[0] === 'users' && p[2] === 'acuses' && p.length === 4){
    if (accion !== 'escribir' || !data || data.de !== uid || p[3] !== data.carta + '~' + uid) return false;
    if (!['llego', 'leida'].includes(data.estado) || !Number.isInteger(data.t)) return false;
    const hay = nube.get(ruta);
    return !hay || (hay.data.de === uid && !(hay.data.estado === 'leida' && data.estado === 'llego'));
  }
  if (p[0] === 'users' && p[2] === 'grupos' && p[4] === 'miembros' && p.length === 6 && p[5] === uid){
    if (accion === 'leer' || accion === 'borrar') return true;
    const g = nube.get(p.slice(0, 4).join('/'));
    return accion === 'escribir' && !!g && g.data.dueno === p[1];
  }
  return false;
}
function atender(op, a, quien){
  if (op === 'google') return quien;
  const negar = r => { negadas.push((a.uid || 'sin cuenta') + ' → ' + r); throw Object.assign(new Error('permission-denied'), { code:'permission-denied' }); };
  if (op === 'leer'){ if (!regla(a.uid, a.ruta, 'leer')) negar(a.ruta); const r = nube.get(a.ruta); return r ? copia(r) : null; }
  if (op === 'lista'){
    if (!regla(a.uid, a.ruta + '/x', 'leer') || (a.ruta.split('/').length === 1)) negar(a.ruta + '/*');
    const pre = a.ruta + '/';
    return [...nube.entries()].filter(([k]) => k.startsWith(pre) && !k.slice(pre.length).includes('/'))
                              .map(([k, r]) => ({ ...copia(r), id: k.slice(pre.length) }));
  }
  if (op === 'confirmar'){
    if (sinRedAcuses && a.ops.some(o => /\/acuses\//.test(o.ruta)))
      throw Object.assign(new Error('unavailable'), { code:'unavailable' });
    for (const [ruta, ver] of Object.entries(a.leidas)){
      const r = nube.get(ruta);
      if ((r ? r.ver : 0) !== ver) return false;
    }
    for (const o of a.ops) if (!regla(a.uid, o.ruta, o.borrar ? 'borrar' : 'escribir', o.data)) negar(o.ruta);
    for (const o of a.ops){
      if (o.borrar) nube.delete(o.ruta);
      else nube.set(o.ruta, { data: copia(o.data), ver: ++reloj });
    }
    return true;
  }
  throw new Error('op desconocida ' + op);
}
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
    export async function sendSignInLinkToEmail(){}
    export function isSignInWithEmailLink(){ return false; }
    export async function signInWithEmailLink(){}
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
    export function onSnapshot(col, f, mal){
      let vivo = true;
      const mirar = async () => {
        if (!vivo) return;
        try { const rs = await B('lista', { ruta: col.ruta }); if (vivo) f({ size: rs.length, forEach: g => rs.forEach(r => g(foto(r))) }); }
        catch(e){ if (mal) mal(e); }
        if (vivo) setTimeout(mirar, 300);
      };
      setTimeout(mirar, 0);
      return () => { vivo = false; };
    }
    export function writeBatch(){
      const ops = [];
      const b = { set: (ref, data) => { ops.push({ ruta: ref.ruta, data }); return b; },
                  delete: ref => { ops.push({ ruta: ref.ruta, borrar:true }); return b; },
                  commit: () => B('confirmar', { leidas:{}, ops }) };
      return b;
    }
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
const PIXEL_ANA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

/* Lo que mira cómo llega cada bolita, como en buzon.prueba.js: en cuanto
   entra en el documento, dónde está en cada cuadro. Solo mira. */
const VIGIA = () => {
  window.__alturas = [];
  new MutationObserver(cambios => {
    for (const c of cambios) for (const n of c.addedNodes){
      if (!(n instanceof HTMLElement) || !n.classList.contains('bola')) continue;
      const fila = { color: n.style.getPropertyValue('--bola'), cuadros: [] }; window.__alturas.push(fila);
      const t0 = performance.now();
      const mira = () => {
        const r = n.getBoundingClientRect();
        fila.cuadros.push({ top:r.top, bottom:r.bottom });
        if (performance.now() - t0 < 1500) requestAnimationFrame(mira);
      };
      requestAnimationFrame(mira);
    }
  }).observe(document, { childList:true, subtree:true });
};

async function aparato(navegador, base, quien, siembra){
  const ctx = await navegador.newContext({ ...TELEFONO, serviceWorkers:'block' });
  await ctx.route(/cdnjs\.cloudflare\.com|gstatic\.com|firebaseio\.com|googleapis\.com|openstreetmap\.org/, r => {
    const m = /firebasejs\/[^/]+\/([a-z-]+\.js)$/.exec(r.request().url());
    if (m && MODULOS[m[1]])
      return r.fulfill({ status:200, body: MODULOS[m[1]],
                         headers:{ 'Content-Type':'text/javascript', 'Access-Control-Allow-Origin':'*' } });
    return r.abort();
  });
  await ctx.exposeBinding('__nubeFalsa', (_, op, a) => atender(op, a, quien));
  await ctx.addInitScript(VIGIA);
  const pagina = await ctx.newPage();
  const errores = [];
  pagina.on('pageerror', e => errores.push(String(e).split('\n')[0]));
  if (siembra){
    await pagina.goto(base + 'vacio');
    await pagina.evaluate(s => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, siembra);
  }
  await pagina.goto(base);
  await listo(pagina);
  return { ctx, pagina, errores, quien };
}

/* Ir a una sección como va un dedo: el titulillo, si hace falta, y la pestaña. */
const PANELES = { notas:'notas', respaldo:'respaldo' };
/* En Respaldo, la sub-pestaña: Herramientas tiene la cuenta; Contactos, desde
   la tanda 2, los contactos y los grupos; Compartir, tu QR. */
async function ir(p, seccion, sub = 'tools'){
  if (!await p.locator('#' + PANELES[seccion]).isVisible()){
    if (!await p.locator('.rollo:visible .pestanas').count()){
      await p.locator('#pgCabeza').tap(); await p.waitForTimeout(900);
    }
    await p.locator('.rollo:visible .pestanas [data-sec="' + seccion + '"]').tap();
    await p.locator('#' + PANELES[seccion]).waitFor({ state:'visible' });
    await p.waitForTimeout(650);
  }
  if (seccion === 'respaldo'){
    await p.locator('#respaldo [data-sub="' + sub + '"]').tap();
    await p.waitForTimeout(400);
  }
}
async function abrirNota(p, id){
  await ir(p, 'notas');
  await p.locator('#notas [data-nota="' + id + '"]').first().tap();
  await p.waitForTimeout(900);
}
async function entrar(a){
  await ir(a.pagina, 'respaldo');
  await a.pagina.locator('#nubeGoogle').tap();
  await a.pagina.waitForFunction(() => /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(
    (document.querySelector('.correo-codigo') || {}).textContent || ''), null, { timeout:20000 });
  return a.pagina.evaluate(() => document.querySelector('.correo-codigo').textContent);
}
/* Abrir el avioncito de una nota y esperar a que sepa a quién mandar. */
async function abrirEnvio(p, id){
  await abrirNota(p, id);
  await p.locator('#notas .nota-ver-enviar').tap();
  await p.locator('#notaEnviar').waitFor({ state:'visible' });
  await p.waitForTimeout(500);
}
/* Al salir bien ya no se dice «Enviada a…»: el panel se cierra solo y lo
   dicen las palomitas. Devuelve 'cerrado' si se cerró, o lo que dijo el
   panel si no. */
async function enviar(p, color, destino){
  await p.locator('#notaEnviar [data-color="' + color + '"]').tap();
  await p.locator('#notaEnviar [data-destino="' + destino + '"]').tap();
  await p.locator('#envioMandar').tap();
  await p.waitForFunction(() => {
    const panel = document.querySelector('#notaEnviar');
    return !panel || panel.hidden || /No se|didn|pesa|nadie|nobody|servidor|server/i.test(
      (panel.querySelector('.envio-estado') || {}).textContent || '');
  }, null, { timeout:15000 }).catch(() => {});
  return p.evaluate(() => {
    const panel = document.querySelector('#notaEnviar');
    return !panel || panel.hidden ? 'cerrado' : (panel.querySelector('.envio-estado') || {}).textContent || '';
  });
}
/* Cuántas palomitas enseña la nota abierta, esperando a que sean `n`. */
async function palomitas(p, n){
  await p.waitForFunction(n => {
    const el = document.querySelector('#notas .nota-palomitas');
    return !!el && (n === 0 ? el.hidden : !el.hidden && el.dataset.n === String(n) && el.querySelectorAll('svg').length === n);
  }, n, { timeout:15000 }).catch(() => {});
  return p.evaluate(() => {
    const el = document.querySelector('#notas .nota-palomitas');
    return el ? { n: el.hidden ? 0 : +el.dataset.n, svgs: el.querySelectorAll('svg').length,
                  aria: el.getAttribute('aria-label') || '', color: getComputedStyle(el).color } : null;
  });
}
/* Tocar la bolita de un color como la toca un dedo: PointerEvent con su
   pointerId y su pointerType, y un poco torcido. */
async function tocarBola(p, color, pid){
  const hecho = await p.evaluate(async ([color, pid]) => {
    const el = [...document.querySelectorAll('#buzon .bola:not(.se-va)')]
      .find(b => b.style.getPropertyValue('--bola') === color);
    if (!el) return 'no hay bolita ' + color;
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const o = (cx, cy, b = 1) => ({ bubbles:true, cancelable:true, composed:true, pointerId:pid,
      pointerType:'touch', isPrimary:true, buttons:b, clientX:cx, clientY:cy });
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    el.dispatchEvent(new PointerEvent('pointerdown', o(x, y))); await pausa(30);
    el.dispatchEvent(new PointerEvent('pointermove', o(x + 2, y - 1))); await pausa(25);
    el.dispatchEvent(new PointerEvent('pointerup', o(x + 1, y + 1, 0)));
    return '';
  }, [color, pid]);
  await p.waitForTimeout(400);
  return hecho;
}
const notasDe = p => p.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:v1') || '[]'));
const recibidas = async p => (await notasDe(p)).filter(n => /^nota-rec-/.test(n.id));
async function esperarRecibidas(p, cuantas){
  await p.waitForFunction(n => JSON.parse(localStorage.getItem('glossa:notas:v1') || '[]')
    .filter(x => /^nota-rec-/.test(x.id)).length >= n, cuantas, { timeout:20000 }).catch(() => {});
  await p.waitForTimeout(400);
  return recibidas(p);
}
const buzonDe = uid => [...nube.keys()].filter(k => k.startsWith('users/' + uid + '/buzon/'));

(async () => {
  const servidor = await servir();
  const base = 'http://127.0.0.1:' + servidor.address().port + '/';
  const navegador = await chromium.launch({ executablePath: EJECUTABLE });

  titulo('SIN CUENTA, EL AVIONCITO PIDE ENTRAR');
  const B = await aparato(navegador, base, BETO, {
    'glossa:notas:v1': [{ id:'nota-de-beto', titulo:'Salmo 23', texto:'El Señor es mi pastor',
                          html:'<p>El Señor es mi <b>pastor</b></p><img data-foto="foto-beto-1" alt="">' }],
    'glossa:notas:fotos:v1': { 'foto-beto-1': PIXEL },
  });
  await abrirEnvio(B.pagina, 'nota-de-beto');
  const sinCuenta = await B.pagina.evaluate(() => ({
    texto: document.getElementById('notaEnviar').textContent,
    entrar: !!document.getElementById('envioEntrar'),
    colores: document.querySelectorAll('#notaEnviar .envio-color').length }));
  di('el panelito sin cuenta', sinCuenta);
  vale('dice que hay que entrar con la cuenta', /entra con tu cuenta|sign in/i.test(sinCuenta.texto), sinCuenta.texto);
  vale('  con un botón para entrar, y sin nada que elegir', sinCuenta.entrar && sinCuenta.colores === 0, sinCuenta);
  await B.pagina.locator('#envioEntrar').tap();
  await B.pagina.waitForTimeout(1600);
  const llevado = await B.pagina.evaluate(() => {
    const g = document.getElementById('nubeGoogle');
    return { respaldo: !!document.querySelector('#respaldo') && getComputedStyle(document.querySelector('#respaldo')).display !== 'none',
             google: !!g && !g.closest('[hidden]'), panelCerrado: document.getElementById('notaEnviar').hidden };
  });
  vale('  y ese botón lleva a la cuenta', llevado.google && llevado.panelCerrado, llevado);
  vale('SIN CUENTA NADA SALE A LA NUBE', nube.size === 0, nube.size);

  titulo('CADA UNO TIENE SU CÓDIGO Y SU QR');
  const A = await aparato(navegador, base, ANA, {
    'glossa:notas:v1': [{ id:'nota-de-ana', titulo:'Para el grupo', texto:'Leer Juan 15 el jueves' },
                        /* Una foto propia con el MISMO id que la de Beto: la carta
                           no la puede pisar (lo encontró la revisión de la PR). */
                        { id:'nota-foto-ana', titulo:'Mi foto', texto:'',
                          html:'<p>Mía</p><img data-foto="foto-beto-1" alt="">' }],
    'glossa:notas:fotos:v1': { 'foto-beto-1': PIXEL_ANA },
  });
  const codigoAna = await entrar(A);
  const codigoBeto = await entrar(B);
  di('códigos', [codigoAna, codigoBeto]);
  vale('Ana tiene un código de ocho, sin letras que se confundan', /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(codigoAna), codigoAna);
  vale('  distinto del de Beto', codigoAna !== codigoBeto, [codigoAna, codigoBeto]);
  const enGuia = nube.get('codigos/' + codigoAna.replace('-', ''));
  vale('  y la guía dice que es suyo, con su nombre', enGuia && enGuia.data.uid === ANA.uid && enGuia.data.nombre === 'Ana', enGuia && enGuia.data);
  /* TU QR VIVE EN COMPARTIR › CÓDIGO QR desde la tanda 2: es el tuyo, el de
     tu código, y no el de la Biblia sola. */
  await ir(A.pagina, 'respaldo', 'compartir');
  await A.pagina.locator('[data-compartir="qr"]').tap();
  await A.pagina.waitForTimeout(900);
  const qr = await A.pagina.evaluate(() => {
    const s = document.querySelector('.vqr-qr .correo-qr'), p = s && s.querySelector('path');
    const r = s && s.getBoundingClientRect();
    const v = document.querySelector('.vqr-tarjeta');
    return { hay: !!s, modulos: p ? (p.getAttribute('d').match(/M/g) || []).length : 0, ancho: r ? Math.round(r.width) : 0,
             texto: v ? v.textContent : '' };
  });
  di('el QR de Ana', { ...qr, texto: qr.texto.slice(0, 160) });
  vale('  con su QR en Compartir, de buen tamaño', qr.hay && qr.modulos > 200 && qr.ancho >= 150, qr);
  vale('  que dice su código', qr.texto.includes(codigoAna), qr.texto);
  await A.pagina.locator('.vqr-cerrar').tap();
  await A.pagina.waitForTimeout(700);
  const enHerramientas = await B.pagina.evaluate(() => ({
    qr: !!document.querySelector('#respTools .correo-qr'),
    contactos: !!document.querySelector('#respTools .correo-bloque'),
    nombre: !!document.querySelector('#respTools .herr-cuenta #correoNombre'),
    pestanas: [...document.querySelectorAll('#respaldo .sub-pestanas [data-sub]')].map(b => b.dataset.sub).join(',') }));
  di('lo que quedó en Herramientas', enHerramientas);
  vale('LOS CONTACTOS SE FUERON DE HERRAMIENTAS, y el QR también', !enHerramientas.qr && !enHerramientas.contactos, enHerramientas);
  vale('  el nombre se quedó en Tu cuenta', enHerramientas.nombre, enHerramientas);
  vale('  y las pestañas van Compartir, Contactos, Herramientas, Atribuciones',
       enHerramientas.pestanas === 'compartir,contactos,tools,creditos', enHerramientas.pestanas);

  titulo('AGREGAR A ALGUIEN ES ESCRIBIR SU CÓDIGO');
  await ir(B.pagina, 'respaldo', 'contactos');
  /* En minúsculas y sin guion, como se dicta por teléfono. */
  await B.pagina.locator('#correoAgregar').fill(codigoAna.replace('-', '').toLowerCase());
  await B.pagina.locator('#correoAgregarBtn').tap();
  await B.pagina.waitForFunction(() => /Ana/.test((document.querySelector('.correo-lista') || {}).textContent || ''),
                                 null, { timeout:10000 }).catch(() => {});
  const agregada = await B.pagina.evaluate(() => ({
    lista: document.querySelector('.correo-lista').textContent, aviso: document.querySelector('.correo-aviso').textContent }));
  vale('Ana aparece en los contactos de Beto', /Ana/.test(agregada.lista), agregada);
  vale('  y la nube lo guarda en lo de Beto', !!nube.get('users/' + BETO.uid + '/contactos/' + ANA.uid));
  await B.pagina.locator('#correoAgregar').fill(codigoBeto);
  await B.pagina.locator('#correoAgregarBtn').tap();
  await B.pagina.waitForTimeout(800);
  vale('  su propio código no se agrega, y se dice', /tu propio|your own/i.test(
    await B.pagina.evaluate(() => document.querySelector('.correo-aviso').textContent)));

  titulo('BETO LE MANDA A ANA UNA NOTA CON SU FOTO, EN VERDE');
  await A.pagina.evaluate(() => { window.__alturas = []; });
  await abrirEnvio(B.pagina, 'nota-de-beto');
  const dice = await enviar(B.pagina, 'verde', 'p:' + ANA.uid);
  di('Beto ve', dice);
  vale('a Beto el panel se le cierra solo, sin «Enviada a…»', dice === 'cerrado', dice);
  const deBeto = (await esperarRecibidas(A.pagina, 1))[0];
  di('lo que llegó a Ana', deBeto && { id: deBeto.id, recibida: deBeto.recibida, titulo: deBeto.titulo });
  vale('A ANA LE LLEGA LA NOTA', !!deBeto && deBeto.titulo === 'Salmo 23' && /pastor/.test(deBeto.texto), deBeto && deBeto.titulo);
  vale('  como carta cerrada, en el verde que eligió Beto',
       !!deBeto && deBeto.recibida.estado === 'cerrada' && deBeto.recibida.color === '#3e7d5a', deBeto && deBeto.recibida);
  vale('  y dice de quién es', !!deBeto && deBeto.recibida.de === 'Beto' && deBeto.recibida.deUid === BETO.uid, deBeto && deBeto.recibida);
  const fotosAna = await A.pagina.evaluate(() => JSON.parse(localStorage.getItem('glossa:notas:fotos:v1') || '{}'));
  const idFotoLlegada = ((deBeto && deBeto.html || '').match(/data-foto="(foto-[a-z0-9-]+)"/) || [])[1];
  vale('  con su foto dentro, con un nombre propio de la carta',
       !!idFotoLlegada && /^foto-rec-/.test(idFotoLlegada) && fotosAna[idFotoLlegada] === PIXEL,
       { idFotoLlegada, ids: Object.keys(fotosAna) });
  vale('  y la foto de Ana que se llamaba igual sigue siendo la suya', fotosAna['foto-beto-1'] === PIXEL_ANA,
       (fotosAna['foto-beto-1'] || '').slice(0, 40));
  vale('  y el buzón de Ana se vacía al recogerla', buzonDe(ANA.uid).length === 0, buzonDe(ANA.uid));
  const cayo = await A.pagina.evaluate(() => window.__alturas);
  const bolaBeto = cayo.find(f => f.color === '#3e7d5a');
  di('la bolita al llegar (top)', bolaBeto && bolaBeto.cuadros.filter((_, i) => i % 10 === 0).map(c => Math.round(c.top)));
  vale('SU BOLITA CAE DESDE ARRIBA', !!bolaBeto && bolaBeto.cuadros.length > 0 && bolaBeto.cuadros[0].bottom <= 1, bolaBeto && bolaBeto.cuadros[0]);

  titulo('LAS PALOMITAS: UNA AL LLEGAR, DOS AL LEERLA');
  const cartaBeto = deBeto && deBeto.id.replace(/^nota-rec-/, '');
  const acuseAna = () => nube.get('users/' + BETO.uid + '/acuses/' + cartaBeto + '~' + ANA.uid);
  vale('Ana le deja a Beto el acuse de que llegó', !!acuseAna() && acuseAna().data.estado === 'llego', acuseAna());
  const una = await palomitas(B.pagina, 1);
  di('las palomitas de Beto', una);
  vale('EN LA NOTA DE BETO SALE UNA PALOMITA VERDE', !!una && una.n === 1 && una.svgs === 1 &&
       /^rgb\(37, 163, 90\)$/.test(una.color), una);
  vale('  y dice que se entregó', !!una && /Entregada|Delivered/.test(una.aria), una);
  const enBeto = await B.pagina.evaluate(() => (document.querySelector('#notas .nota-acciones') || {}).textContent || '');
  vale('  y ya no dice «enviada» ni «leída»', !/enviada|leída|sent|read/i.test(enBeto), enBeto);
  await A.pagina.waitForTimeout(1500);
  /* Ana la abre justo cuando el acuse no puede salir. Codex lo vio: la carta
     queda abierta, su bolita se va, y nada volvía a mandar el «leída». */
  sinRedAcuses = true;
  const t1 = await tocarBola(A.pagina, '#3e7d5a', 41);
  const t2 = t1 || await tocarBola(A.pagina, '#3e7d5a', 42);
  vale('Ana toca la bolita dos veces y abre la carta', !t1 && !t2, t1 || t2);
  await A.pagina.waitForTimeout(600);
  vale('  sin red, el acuse se queda en «llegó»', !!acuseAna() && acuseAna().data.estado === 'llego', acuseAna());
  sinRedAcuses = false;
  /* Ana vuelve a abrir Glossa: al entrar en su cuenta se repasan las cartas,
     y el «leída» que faltaba sale solo, sin tocar nada. */
  await A.pagina.goto(base + 'vacio');
  await A.pagina.goto(base);
  await listo(A.pagina);
  for (let i = 0; i < 40 && !(acuseAna() && acuseAna().data.estado === 'leida'); i++) await A.pagina.waitForTimeout(250);
  vale('  al volver a abrir Glossa, a Beto le llega el acuse de que la leyó', !!acuseAna() && acuseAna().data.estado === 'leida', acuseAna());
  const dos = await palomitas(B.pagina, 2);
  vale('EN LA NOTA DE BETO SALEN DOS PALOMITAS', !!dos && dos.n === 2 && dos.svgs === 2 && /Leída|Read/.test(dos.aria), dos);

  titulo('DE GOMA, EN LUGAR DEL COLOR SE ELIGE CUÁNTO REBOTA');
  /* Gianni: «que las pelotas de goma tengan 3 tamaños de rebote, que se
     distingan por el color». En la de goma el color sale del rebote.
     Como el panel ya se cierra solo al enviar, Beto lo vuelve a abrir. */
  await abrirEnvio(B.pagina, 'nota-de-beto');
  const panelEnvio = () => B.pagina.evaluate(() => ({
    colores: document.querySelectorAll('#notaEnviar .envio-color').length,
    rebotes: [...document.querySelectorAll('#notaEnviar [data-rebote]')].map(b => [b.dataset.rebote,
      b.querySelector('.bola-muestra').style.getPropertyValue('--bola'), b.getAttribute('aria-checked')]),
    goma: (document.querySelector('#notaEnviar [data-material="goma"] .bola-muestra') || { style:{ getPropertyValue:() => '' } })
      .style.getPropertyValue('--bola') }));
  vale('de metal se elige el color, y no el rebote', (p => p.colores === 6 && !p.rebotes.length)(await panelEnvio()));
  await B.pagina.locator('#notaEnviar button[data-material="goma"]').tap();
  const conGoma = await panelEnvio();
  di('el panel con la de goma', conGoma);
  vale('de goma se va la fila de colores', conGoma.colores === 0, conGoma);
  vale('  y salen poco, medio y mucho: verde, azul y rojo, con el medio puesto',
       JSON.stringify(conGoma.rebotes) === JSON.stringify([['poco', '#3e7d5a', 'false'], ['medio', '#3f6e9e', 'true'], ['mucho', '#a53d3d', 'false']]),
       conGoma.rebotes);
  await B.pagina.locator('#notaEnviar [data-rebote="mucho"]').tap();
  const mucho = await panelEnvio();
  vale('  al elegir mucho, la goma de muestra se pone roja', mucho.goma === '#a53d3d' &&
       mucho.rebotes.find(r => r[0] === 'mucho')[2] === 'true', mucho);
  await B.pagina.locator('#notaEnviar button[data-material="metal"]').tap();
  vale('  y de vuelta a metal, vuelven los colores', (await panelEnvio()).colores === 6);

  titulo('LA NOTA RECIBIDA SE LEE Y NO SE ESCRIBE');
  await abrirNota(A.pagina, deBeto.id);
  const ajena = await A.pagina.evaluate(id => {
    const h = document.querySelector('#notas .nota-hoja[data-nota="' + id + '"]');
    const ed = h && h.querySelector('.nota-editor');
    return { editable: ed && ed.contentEditable, formato: document.querySelector('#notas .nota-ver-formato').disabled,
             enviar: document.querySelector('#notas .nota-ver-enviar').disabled,
             sobre: (h && h.querySelector('.nota-carta') || {}).textContent || '' };
  }, deBeto.id);
  di('la hoja de la nota recibida', ajena);
  vale('no se puede escribir en ella', ajena.editable === 'false', ajena.editable);
  vale('  ni darle formato, ni reenviarla', ajena.formato && ajena.enviar, ajena);
  vale('  y la hoja dice que es de Beto', /Beto/.test(ajena.sobre), ajena.sobre);

  titulo('ANA ARMA UN GRUPO; CARLA ENTRA CON EL QR, BETO CON EL CÓDIGO');
  await ir(A.pagina, 'respaldo', 'contactos');
  await A.pagina.locator('#correoGrupo').fill('Estudio del jueves');
  await A.pagina.locator('#correoGrupoBtn').tap();
  await A.pagina.waitForFunction(() => /Estudio del jueves/.test((document.querySelector('.correo-grupos') || {}).textContent || ''),
                                 null, { timeout:10000 }).catch(() => {});
  const avisoGrupo = await A.pagina.evaluate(() => document.querySelector('.correo-aviso').textContent);
  const codigoGrupo = (/([A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4})/.exec(avisoGrupo) || [])[1];
  di('el grupo', { avisoGrupo, codigoGrupo });
  vale('el grupo queda con su propio código', !!codigoGrupo && codigoGrupo !== codigoAna, avisoGrupo);
  const C = await aparato(navegador, base, CARLA, {
    'glossa:notas:v1': [{ id:'nota-de-carla', titulo:'Pregunta', texto:'¿Quién lleva el pan?' }],
  });
  await entrar(C);
  /* La cámara del teléfono lee el QR y abre Glossa con el código en la
     dirección. Desde la tanda 2 se agrega solo: nadie toca «Agregar». */
  await C.pagina.goto(base + '?glossa=' + codigoGrupo);
  await listo(C.pagina);
  /* Chromium de escritorio no avisa que se pueda instalar; el aviso se manda
     a mano, que es una pieza del navegador y no del programa. */
  await C.pagina.evaluate(() => {
    const ev = new Event('beforeinstallprompt', { cancelable:true });
    ev.prompt = () => { window.__pidioInstalar = true; return Promise.resolve(); };
    dispatchEvent(ev);
  });
  await C.pagina.waitForFunction(() => /Estudio del jueves/.test((document.querySelector('.correo-dentro') || {}).textContent || ''),
                                 null, { timeout:15000 }).catch(() => {});
  const porQr = await C.pagina.evaluate(() => {
    const k = document.getElementById('respContactos');
    return { url: location.href, enContactos: !!k && !k.hidden,
             instalar: !!document.querySelector('.aviso-instalar .aviso-instalar-si') };
  });
  di('Carla abre el QR', porQr);
  vale('el QR abre Glossa en Contactos', porQr.enContactos, porQr);
  vale('  y la dirección queda limpia', !/glossa=/.test(porQr.url), porQr.url);
  vale('  y le ofrece instalarla', porQr.instalar, porQr);
  await C.pagina.locator('.aviso-instalar .aviso-instalar-si').tap().catch(() => {});
  vale('  y «Instalar» abre la ventana del navegador',
       await C.pagina.evaluate(() => !!window.__pidioInstalar && !document.querySelector('.aviso-instalar')));
  const dentroCarla = await C.pagina.evaluate(() => ({
    dentro: document.querySelector('.correo-dentro').textContent, contactos: document.querySelector('.correo-lista').textContent }));
  vale('CARLA QUEDA DENTRO SIN ESPERAR A NADIE', /Estudio del jueves/.test(dentroCarla.dentro), dentroCarla);
  vale('  y con Ana en sus contactos, para contestarle', /Ana/.test(dentroCarla.contactos) &&
       !!nube.get('users/' + CARLA.uid + '/contactos/' + ANA.uid), dentroCarla.contactos);
  await ir(B.pagina, 'respaldo', 'contactos');
  await B.pagina.locator('#correoAgregar').fill(codigoGrupo);
  await B.pagina.locator('#correoAgregarBtn').tap();
  await B.pagina.waitForFunction(() => /Estudio del jueves/.test((document.querySelector('.correo-dentro') || {}).textContent || ''),
                                 null, { timeout:10000 }).catch(() => {});
  const miembros = [...nube.keys()].filter(k => k.startsWith('users/' + ANA.uid + '/grupos/') && k.includes('/miembros/'));
  vale('el grupo de Ana tiene a los dos', miembros.length === 2, miembros);

  titulo('SOLO QUIEN CREÓ EL GRUPO LE MANDA');
  await abrirEnvio(C.pagina, 'nota-de-carla');
  const paraCarla = await C.pagina.evaluate(() => [...document.querySelectorAll('#notaEnviar .envio-destino')]
    .map(b => ({ clave: b.dataset.destino, texto: b.textContent })));
  di('a quién puede mandar Carla', paraCarla);
  vale('Carla puede contestarle a Ana', paraCarla.some(d => d.clave === 'p:' + ANA.uid), paraCarla);
  vale('  pero no mandarle al grupo', !paraCarla.some(d => /^g:/.test(d.clave)), paraCarla);
  await C.pagina.locator('#notaEnviar .nota-filtros-cerrar').tap();
  await C.pagina.waitForTimeout(500);

  titulo('ANA LE MANDA AL GRUPO, EN MORADO');
  await abrirEnvio(A.pagina, 'nota-de-ana');
  await A.pagina.waitForFunction(() => /2 personas|2 people/.test(
    (document.querySelector('#notaEnviar [data-destino^="g:"]') || {}).textContent || ''), null, { timeout:8000 }).catch(() => {});
  const destinoGrupo = await A.pagina.evaluate(() => {
    const b = document.querySelector('#notaEnviar [data-destino^="g:"]');
    return b ? { clave: b.dataset.destino, texto: b.textContent } : null;
  });
  di('el grupo en el avioncito de Ana', destinoGrupo);
  vale('en el avioncito de Ana está el grupo, con sus dos personas', !!destinoGrupo && /2 personas|2 people/.test(destinoGrupo.texto), destinoGrupo);
  await B.pagina.evaluate(() => { window.__alturas = []; });
  await C.pagina.evaluate(() => { window.__alturas = []; });
  const diceGrupo = await enviar(A.pagina, 'morado', destinoGrupo.clave);
  di('Ana ve', diceGrupo);
  vale('a Ana el panel se le cierra solo', diceGrupo === 'cerrado', diceGrupo);
  const aCarla = (await esperarRecibidas(C.pagina, 1)).find(n => n.titulo === 'Para el grupo');
  const aBeto = (await esperarRecibidas(B.pagina, 1)).find(n => n.titulo === 'Para el grupo');
  di('lo que llegó', { carla: aCarla && aCarla.recibida, beto: aBeto && aBeto.recibida });
  for (const [quien, n] of [['Carla', aCarla], ['Beto', aBeto]])
    vale('A ' + quien.toUpperCase() + ' LE LLEGA, en morado y de Ana · Estudio del jueves',
         !!n && n.recibida.color === '#6e4c94' && n.recibida.de === 'Ana' && n.recibida.grupo === 'Estudio del jueves',
         n && n.recibida);
  const bolaCarla = (await C.pagina.evaluate(() => window.__alturas)).find(f => f.color === '#6e4c94');
  vale('  y en el teléfono de Carla la bolita cae', !!bolaCarla && bolaCarla.cuadros[0].bottom <= 1, bolaCarla && bolaCarla.cuadros[0]);
  const delGrupo = await palomitas(A.pagina, 1);
  vale('UNA PALOMITA EN LA NOTA DE ANA: LLEGÓ A LOS DOS', !!delGrupo && delGrupo.n === 1, delGrupo);

  titulo('LO QUE LLEGA CON GLOSSA CERRADA APARECE ABAJO');
  await C.pagina.goto(base + 'vacio');
  /* El panel se cerró al enviar: se vuelve a abrir, y recuerda el destino. */
  await A.pagina.locator('#notas .nota-ver-enviar').tap();
  await A.pagina.locator('#notaEnviar').waitFor({ state:'visible' });
  await A.pagina.waitForTimeout(500);
  await A.pagina.locator('#envioMandar').tap();
  await A.pagina.waitForTimeout(1500);
  const esperando = buzonDe(CARLA.uid);
  vale('la carta espera en el buzón de Carla', esperando.length === 1, esperando);
  await C.pagina.goto(base);
  await listo(C.pagina);
  const otraVez = await esperarRecibidas(C.pagina, 2);
  vale('al abrir Glossa, Carla la recoge', otraVez.length === 2 && buzonDe(CARLA.uid).length === 0,
       otraVez.map(n => n.id));
  const alAbrir = await C.pagina.evaluate(() => window.__alturas);
  di('las bolitas al abrir (primer top)', alAbrir.map(f => Math.round(f.cuadros[0] ? f.cuadros[0].top : -1)));
  vale('  y su bolita nace abajo, sin caer', alAbrir.length === 2 && alAbrir.every(f => f.cuadros.length && f.cuadros[0].top > 100),
       alAbrir.map(f => f.cuadros[0]));

  titulo('CADA UNO EN LO SUYO');
  vale('NADA QUE LAS REGLAS NIEGUEN', negadas.length === 0, negadas);
  vale('nadie leyó el buzón de otro', ![...nube.keys()].some(k => /\/buzon\//.test(k)), [...nube.keys()].filter(k => /\/buzon\//.test(k)));
  for (const [n, s] of [['Ana', A], ['Beto', B], ['Carla', C]])
    vale('sin errores de JavaScript (' + n + ')', s.errores.length === 0, s.errores.length ? s.errores : 'ninguno');

  await navegador.close();
  servidor.close();
  fin();
/* Si algo revienta a medio camino, el navegador y el servidor quedan
   abiertos y la máquina de GitHub se quedaba esperando media hora hasta
   cancelarla. Mejor salir ya, con el error a la vista. */
})().catch(e => { console.error(e); process.exit(1); });
