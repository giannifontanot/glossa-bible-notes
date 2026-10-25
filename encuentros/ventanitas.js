/* LAS VENTANITAS DE UN RELATO: cada cita de la escritura y cada palabra
   difícil se tocan, y se abren en una ventanita encima del libro.

   Lo pidió el dueño del repo así, y con un modelo a la vista: «igual que en
   cover-to-cover», donde cada referencia abre el pasaje en una tarjeta sin
   salir del libro. La primera versión de esto fue una liga a bible.com que se
   abría en otra pestaña, y era justo lo que no se quería: «estamos en la
   Biblia Glossa». Así que nada sale a otra página.

   QUIÉN PINTA LA VENTANITA: EL PROGRAMA, NO EL RELATO. Es la misma lección de
   la lámina (visor.js): un marco no pinta fuera de sí mismo, y una tarjeta
   encajonada en el panel de Encuentros se ve metida en una caja dentro de
   otra. Y para las citas hay una razón más: el texto de la Biblia lo tiene
   el programa, no el relato. Así que el relato solo avisa hacia arriba —el
   mismo camino que «salir», «listo» y «lámina»— y el programa abre la
   ventanita con el pasaje en la versión que el lector tiene puesta.

   EL MARCADO, PARA QUIEN ESCRIBA EL SIGUIENTE RELATO:

     <button type="button" class="cita" data-cita="JHN.1.29">Juan 1:29</button>
     <button type="button" class="cita" data-cita="JHN.1.29-39">Juan 1:29-39</button>

       Libro con la clave de tres letras del programa (MAT, MRK, LUK, JHN…),
       capítulo, y un versículo o un tramo.

     <button type="button" class="palabra" data-titulo="Pretorio"
             data-def="La residencia oficial del gobernador…">pretorio</button>

       La definición viaja en el propio botón: es del relato, no del programa.

   Son botones y no enlaces porque no llevan a ninguna parte: abren algo aquí
   mismo. Con un botón el teclado y el lector de pantalla ya saben qué es.

   ABIERTO SOLO, SIN PROGRAMA, el relato enseña la palabra en una ventanita
   suya —la definición la tiene él— y para la cita solo puede decir dónde
   está, porque el texto no lo tiene. */
(function () {
  var enMarco = parent !== window;
  var caja = null;

  function avisar(datos) {
    if (!enMarco) return false;
    try { parent.postMessage(datos, '*'); return true; } catch (_) { return false; }
  }

  /* LA VENTANITA DE AQUÍ, solo para el relato abierto solo. */
  function ventanitaLocal(titulo, texto) {
    if (!caja) {
      caja = document.createElement('dialog');
      caja.className = 'ventanita';
      caja.innerHTML =
        '<div class="ventanita-cabeza"><h2></h2>' +
        '<button type="button" class="ventanita-x" aria-label="Cerrar">×</button></div>' +
        '<div class="ventanita-texto"></div>';
      caja.querySelector('.ventanita-x').addEventListener('click', function () { caja.close(); });
      caja.addEventListener('click', function (ev) { if (ev.target === caja) caja.close(); });
      document.body.appendChild(caja);
    }
    caja.querySelector('h2').textContent = titulo;
    caja.querySelector('.ventanita-texto').textContent = texto;
    if (typeof caja.showModal === 'function') caja.showModal();
    else caja.setAttribute('open', '');
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('button.cita, button.palabra');
    if (!b) return;
    ev.preventDefault();
    if (b.classList.contains('cita')) {
      var cita = b.getAttribute('data-cita') || '';
      if (!avisar({ glossa: 'cita', cita: cita, rotulo: b.textContent.trim() }))
        ventanitaLocal(b.textContent.trim(),
          'Este pasaje se abre dentro de Biblia Glossa, que es donde está el texto.');
    } else {
      var titulo = b.getAttribute('data-titulo') || b.textContent.trim();
      var def = b.getAttribute('data-def') || '';
      if (!avisar({ glossa: 'palabra', titulo: titulo, texto: def }))
        ventanitaLocal(titulo, def);
    }
  });

  /* Escape con la ventanita de aquí abierta es de la ventanita, no de
     salida.js: se atiende en la captura y se cancela, que es la puerta que
     el puente deja para eso. */
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' || !caja || !caja.open) return;
    ev.preventDefault();
    caja.close();
  }, true);
})();
