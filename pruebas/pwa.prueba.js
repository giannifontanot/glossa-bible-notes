/* LA GLOSSA COMO APP: SE INSTALA Y ABRE SIN RED.

   Contesta dos preguntas, y las dos son de teléfono:
   ¿el navegador la reconoce como app instalable? —el manifiesto, con su nombre,
   su modo de pantalla completa y sus íconos— y, sobre todo, ¿abre en un avión?

   ESTA PRUEBA NO PUEDE ABRIR EL ARCHIVO DIRECTO, como hacen las demás. Un
   service worker solo existe sobre http(s), y abierta como file:// la app ni lo
   intenta —está hecho así a propósito, para no ensuciar la consola del banco—.
   Así que levanta un servidor propio en un puerto libre, sirve la carpeta del
   repo tal cual, y al final lo apaga.

   Y EL «SIN RED» ES DE VERDAD: se le corta la red al contexto del navegador con
   setOffline, no se finge una respuesta. Lo que no esté guardado, no llega. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { di, vale, titulo, fin, RAIZ, TELEFONO, EJECUTABLE } = require('./comun');

const TIPOS = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
                '.json':'application/json', '.webmanifest':'application/manifest+json',
                '.png':'image/png', '.svg':'image/svg+xml', '.css':'text/css', '.webp':'image/webp' };

function servir(){
  const servidor = http.createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(RAIZ, ruta === '/' ? 'index.html' : ruta);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(z => servidor.listen(0, '127.0.0.1', () => z(servidor)));
}

(async () => {
  const servidor = await servir();
  const base = 'http://127.0.0.1:' + servidor.address().port + '/';
  const navegador = await chromium.launch({ executablePath: EJECUTABLE });
  const ctx = await navegador.newContext({ ...TELEFONO });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e).split('\n')[0]));

  titulo('EL MANIFIESTO');
  await p.goto(base);
  const m = await p.evaluate(async () => {
    const l = document.querySelector('link[rel="manifest"]');
    if (!l) return { falta:'el enlace al manifiesto' };
    const j = await (await fetch(l.href)).json();
    const tam = j.icons.map(i => i.sizes + ':' + (i.purpose || 'any'));
    const bajan = await Promise.all(j.icons.map(async i => (await fetch(new URL(i.src, l.href))).ok));
    return { name:j.name, short:j.short_name, display:j.display, start:j.start_url, scope:j.scope,
             tam, bajan: bajan.every(Boolean),
             tema: (document.querySelector('meta[name="theme-color"]') || {}).content };
  });
  di('manifiesto', m);
  vale('HAY MANIFIESTO, con nombre', !!m.name && !!m.short, m.name);
  vale('  se abre a pantalla completa', m.display === 'standalone', m.display);
  vale('  y arranca dentro de su carpeta', m.start === './' && m.scope === './', m.start + ' · ' + m.scope);
  /* Lo que Chrome pide para ofrecer «Instalar»: un ícono de 192 y uno de 512.
     El maskable es el que Android recorta en círculo o en gota. */
  vale('ÍCONOS DE 192 Y 512, y uno maskable',
       (m.tam || []).includes('192x192:any') && (m.tam || []).includes('512x512:any') &&
       (m.tam || []).includes('512x512:maskable'), m.tam);
  vale('  y todos bajan', m.bajan === true, m.bajan);
  vale('LA BARRA DEL TELÉFONO LLEVA EL COLOR DE LA APP', !!m.tema, m.tema);

  titulo('EL SERVICE WORKER');
  /* Se espera a que tome el control: hasta entonces la página la sirve la red,
     y una prueba sin red ahí no probaría nada. */
  await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 60000 }).catch(() => {});
  await p.reload();
  await p.waitForTimeout(2500);
  const sw = await p.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const llaves = await caches.keys();
    const guardados = [];
    for (const k of llaves) for (const r of await (await caches.open(k)).keys())
      guardados.push(new URL(r.url).pathname.split('/').pop() || '/');
    return { activo: !!(reg && reg.active), controla: !!navigator.serviceWorker.controller, llaves, guardados };
  });
  di('service worker', sw);
  vale('SE REGISTRA Y TOMA EL CONTROL', sw.activo && sw.controla, { activo: sw.activo, controla: sw.controla });
  for (const f of ['index.html', 'bibles-included.js', 'pericopas.js'])
    vale('  y guarda ' + f, sw.guardados.includes(f), f);

  titulo('SIN RED');
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForTimeout(4000);
  const sinRed = await p.evaluate(() => ({
    hoja: ((document.getElementById('pgCabeza') || {}).textContent || '').trim(),
    versiculos: document.querySelectorAll('#pgBody .v').length,
    libros: window.GLOSSA_DATA ? window.GLOSSA_DATA.libros.length : 0,
    pericopas: window.GlossaPericopas ? Object.keys(window.GlossaPericopas).length : 0
  }));
  di('sin red', sinRed);
  vale('ABRE SIN RED, en su hoja y con texto', !!sinRed.hoja && sinRed.versiculos > 0, sinRed.hoja);
  vale('  con la Biblia entera', sinRed.libros === 66, sinRed.libros);
  vale('  y sus perícopas', sinRed.pericopas === 66, sinRed.pericopas);
  /* UNA PÁGINA QUE NO SE GUARDÓ NO RECIBE LA BIBLIA. Es lo que levantó Codex:
     el panel de oración y los Encuentros se abren en un iframe, y sin red el
     respaldo de la Biblia les metía la app entera dentro. Se pide una página
     de esa carpeta que nunca se abrió, que es exactamente el caso. */
  const otra = await p.evaluate(async () => {
    const f = document.createElement('iframe');
    f.src = 'encuentros/no-se-guardo.html';
    document.body.appendChild(f);
    await new Promise(z => { f.onload = z; setTimeout(z, 5000); });
    let d = null; try { d = f.contentDocument; } catch(e){}
    const r = { esLaBiblia: !!(d && d.getElementById('pgCabeza')),
                aviso: d ? (d.body ? d.body.textContent.trim().slice(0, 40) : '') : '(sin acceso)' };
    f.remove();
    return r;
  });
  di('una página sin guardar', otra);
  vale('UNA PÁGINA SIN GUARDAR NO RECIBE LA BIBLIA', otra.esLaBiblia === false, otra);
  vale('  sino el aviso de que falta conexión', /Sin conexión/.test(otra.aviso), otra.aviso);
  await ctx.setOffline(false);

  vale('sin errores de JavaScript', errores.length === 0, errores.length ? errores : 'ninguno');
  await navegador.close();
  servidor.close();
  fin();
})();
