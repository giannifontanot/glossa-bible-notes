/* La foto de la portada, antes de parsear bibles-included.js.
   Lo llama index.html en cuanto existe #portadaFoto.
   El programa principal vuelve a pintar lo mismo al acabar el arranque. */
(function () {
  try {
    var j = JSON.parse(localStorage.getItem('glossa:portada:v1') || 'null');
    var f = j && j.foto;
    if (!f || typeof f.src !== 'string' || !f.src) return;
    var caja = document.getElementById('portadaFoto');
    if (!caja) return;
    var giro = +f.giro;
    if (!isFinite(giro)) giro = 0;
    if (giro < -180) giro = -180;
    if (giro > 180) giro = 180;
    var polaroid = f.estilo === 'polaroid';
    caja.className = 'puesta';
    var marco = document.createElement('div');
    marco.className = 'pt-marco';
    marco.style.transform = 'rotate(' + giro + 'deg)';
    var foto = document.createElement('div');
    foto.className = 'pt-foto' + (polaroid ? ' polaroid' : '');
    var img = document.createElement('img');
    img.alt = '';
    img.src = f.src;
    foto.appendChild(img);
    marco.appendChild(foto);
    caja.appendChild(marco);
  } catch (e) {}
})();
