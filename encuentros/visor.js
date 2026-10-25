/* EL VISOR DE LAS LÁMINAS DE UN RELATO: la imagen chica dentro del texto y,
   al tocarla, la misma imagen en grande encima de todo.

   Va suelto, como relato.css y salida.js, por la misma razón: el día que otro
   encuentro traiga su lámina tiene que bastar con el marcado —un <figure
   class="lamina"> con su enlace— y esta línea, sin copiar ni una regla.

   POR QUÉ UN ENLACE Y NO SOLO UNA IMAGEN QUE SE PUEDA TOCAR. Sin este guion
   —un relato abierto solo, o un navegador que no lo cargue— el enlace sigue
   llevando a la imagen entera, que es lo que se pidió. El guion lo único que
   hace es quedarse con ese toque y enseñarla dentro del relato, sin perder el
   sitio donde se estaba leyendo.

   UN <dialog> MODAL, porque trae gratis lo que a mano se olvida: el foco no se
   escapa a la página de detrás, el lector de pantalla sabe que es una ventana,
   y el resto del relato queda inerte mientras está abierta.

   LA TECLA ESCAPE ES LA PARTE DELICADA. salida.js escucha Escape para cerrar
   el panel entero de Encuentros, y con la lámina abierta eso sería pasarle por
   encima: el lector quiere cerrar la imagen, no salir del relato. Ese puente
   ya deja la puerta puesta —si la tecla llega con defaultPrevented, no
   avisa arriba—, así que aquí se atiende en la CAPTURA del documento, que
   corre antes que su oyente de la ventana en burbuja, se cierra la lámina y
   se cancela el gesto por defecto. Un Escape con la lámina cerrada sigue
   siendo de salida.js, como siempre. */
(function () {
  var visor = null, grande = null, pie = null, deDonde = null;

  function armar() {
    visor = document.createElement('dialog');
    visor.className = 'visor';
    visor.setAttribute('aria-label', 'Imagen ampliada');
    visor.innerHTML =
      '<button type="button" class="visor-cerrar" aria-label="Cerrar la imagen">×</button>' +
      '<img class="visor-img" alt="">' +
      '<p class="visor-pie"></p>';
    grande = visor.querySelector('.visor-img');
    pie = visor.querySelector('.visor-pie');
    visor.querySelector('.visor-cerrar').addEventListener('click', cerrar);
    /* Tocar fuera de la imagen también cierra: en un teléfono el aspa queda
       en una esquina, y lo natural es tocar el oscuro. La imagen misma no
       cierra, para que pellizcar o mirar de cerca no la haga desaparecer. */
    visor.addEventListener('click', function (ev) {
      if (ev.target === visor || ev.target === pie) cerrar();
    });
    /* El cierre que no pasa por cerrar() —el del propio navegador— también
       tiene que devolver el foco a la miniatura. */
    visor.addEventListener('close', function () {
      if (deDonde) { try { deDonde.focus({ preventScroll: true }); } catch (_) {} }
      deDonde = null;
    });
    document.body.appendChild(visor);
  }

  function abrir(enlace) {
    if (!visor) armar();
    var chica = enlace.querySelector('img');
    var leyenda = enlace.closest('figure');
    leyenda = leyenda && leyenda.querySelector('figcaption');
    grande.src = enlace.getAttribute('href');
    grande.alt = chica ? chica.alt : '';
    /* El pie de la grande es el de la chica SIN la pista de «toca para
       ampliar», que ahí ya no dice nada: la imagen ya está ampliada. */
    var texto = '';
    if (leyenda) {
      var copia = leyenda.cloneNode(true);
      Array.prototype.forEach.call(copia.querySelectorAll('.ampliar'),
        function (n) { n.remove(); });
      texto = copia.textContent.trim();
    }
    pie.textContent = texto;
    pie.hidden = !pie.textContent;
    deDonde = enlace;
    if (typeof visor.showModal === 'function') visor.showModal();
    else visor.setAttribute('open', '');
  }

  function cerrar() {
    if (!visor) return;
    if (typeof visor.close === 'function' && visor.open) visor.close();
    else { visor.removeAttribute('open'); visor.dispatchEvent(new Event('close')); }
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a.lamina-enlace');
    if (!a) return;
    /* Con una tecla modificadora se respeta lo que pide el lector: abrir la
       imagen aparte, en otra pestaña. */
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button > 0) return;
    ev.preventDefault();
    abrir(a);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' || !visor || !visor.open) return;
    ev.preventDefault();
    cerrar();
  }, true);
})();
