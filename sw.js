/* GLOSSA · EL SERVICE WORKER

   Es lo que hace de la Glossa una app que se instala y que abre sin red. Es el
   único guion que vive fuera de index.html, y no por gusto: el navegador exige
   que un service worker sea un archivo propio, en la misma carpeta que lo que
   controla.

   LA RED PRIMERO, SIEMPRE, y la copia guardada solo si la red falla. Es el
   mismo patrón de Reveal, y aquí tiene una razón más: el día que se publicaron
   las perícopas, el navegador siguió sirviendo el pericopas.js viejo durante
   unos minutos porque GitHub Pages deja guardar los archivos un rato. Un
   service worker que sirviera primero lo guardado haría eso mismo, pero para
   siempre. Así, cada publicación se ve en la siguiente apertura.

   Y LA RED SE PIDE CON cache:'no-cache', que no quiere decir «sin caché»: quiere
   decir «pregunta antes de usar lo guardado». El navegador manda la huella del
   archivo y, si no cambió, GitHub contesta con un 304 de unos cientos de bytes.
   Eso importa con bibles-included.js, que pesa 16 MB: no se vuelve a bajar en
   cada apertura, solo cuando cambia.

   Solo los archivos de este mismo sitio pasan por aquí; las ligas a otras
   páginas siguen su camino de siempre. */
const CACHE = 'glossa-v2';
const BASICOS = [
  './', 'index.html', 'bibles-included.js', 'pericopas.js', 'portada-temprana.js',
  'glossa.webmanifest', 'iconos/glossa-192.png', 'iconos/glossa-512.png'
];

self.addEventListener('install', e => {
  /* Si una pieza no baja, la instalación no se cae: lo que falte se guardará la
     primera vez que se use. Una app que no se instala por un ícono perdido es
     peor que una que se instala sin él. */
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(BASICOS.map(u => c.add(new Request(u, { cache:'no-cache' })).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  /* Al subir el número de CACHE, la copia vieja se borra entera aquí. */
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* EL AVISO PARA UNA PÁGINA QUE NUNCA SE ABRIÓ CON RED. Sin fondo ni colores
   propios, como los relatos: hereda los de la ventanita donde aparezca. */
function sinConexion(){
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>body{margin:0;padding:32px 20px;background:transparent;color:inherit;font:17px/1.5 Georgia,serif;text-align:center}</style>' +
    '<p>Sin conexión.</p><p>Esta página se guarda la primera vez que se abre con internet.</p>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const resp = await fetch(req, { cache:'no-cache' });
      if (resp.ok && resp.type === 'basic') cache.put(req, resp.clone());
      return resp;
    } catch (err) {
      const guardada = await cache.match(req) || await cache.match(req, { ignoreSearch:true });
      if (guardada) return guardada;
      if (req.mode === 'navigate'){
        /* LA BIBLIA DE RESPALDO, SOLO PARA LA BIBLIA. Antes cualquier página
           sin copia recibía index.html, y eso rompía las ventanitas: el panel
           de oración y los Encuentros se cargan en un iframe la primera vez que
           se abren, y sin red recibían la Biblia entera dentro, con sus guiones
           buscados bajo oracion/ o encuentros/, donde no existen. Lo levantó la
           revisión de Codex. Ahora la Biblia solo sale cuando lo que se abre es
           la página principal; lo demás recibe un aviso. */
        const raiz = new URL('./', self.registration.scope).pathname;
        const esLaBiblia = req.destination === 'document' &&
                           (url.pathname === raiz || url.pathname === raiz + 'index.html');
        if (esLaBiblia) return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
        return sinConexion();
      }
      throw err;
    }
  })());
});
