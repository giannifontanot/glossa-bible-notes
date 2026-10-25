/* EL VISOR DE LAS LÁMINAS DE UN RELATO: la imagen chica dentro del texto y,
   al tocarla, la misma imagen en grande.

   Va suelto, como relato.css y salida.js, por la misma razón: el día que otro
   encuentro traiga su lámina tiene que bastar con el marcado —un <figure
   class="lamina"> con su enlace— y esta línea, sin copiar ni una regla.

   DENTRO DEL PROGRAMA, LA IMAGEN GRANDE LA PINTA EL PROGRAMA. La primera
   versión abría aquí un <dialog>, y un marco no pinta fuera de sí mismo: la
   imagen salía metida en el panel de Encuentros, con la barra de arriba y el
   CERRAR de abajo alrededor. Se pidió «lo más grande que se pueda, sin
   bordes, sin nada». Así que, leyéndose dentro de un marco, el relato solo
   avisa hacia arriba con la dirección de la imagen —el mismo camino que
   «salir» y «listo»— y el programa la enseña a pantalla completa. Está en
   index.html, en ponerLaminaGrande.

   ABIERTO SOLO, EL RELATO SE LAS ARREGLA: no hay programa que la pinte, así
   que la enseña él, igual de negra y sin nada alrededor, en un <dialog> que
   ocupa toda la ventana.

   POR QUÉ UN ENLACE Y NO SOLO UNA IMAGEN QUE SE PUEDA TOCAR. Sin este guion
   —un navegador que no lo cargue— el enlace sigue llevando a la imagen
   entera, que es lo que se pidió.

   LA TECLA ESCAPE, CON EL VISOR DE AQUÍ ABIERTO, ES DEL VISOR. salida.js
   escucha Escape para cerrar el panel entero, y esa puerta ya está puesta:
   si la tecla llega con defaultPrevented, no avisa arriba. Así que se atiende
   en la captura del documento, que corre antes que su oyente en burbuja. */
(function () {
  var enMarco = parent !== window;
  var visor = null, grande = null, deDonde = null;

  function armar() {
    visor = document.createElement('dialog');
    visor.className = 'visor';
    visor.setAttribute('aria-label', 'Imagen ampliada');
    visor.innerHTML =
      '<img class="visor-img" alt="">' +
      '<button type="button" class="visor-cerrar" aria-label="Cerrar la imagen">×</button>';
    grande = visor.querySelector('.visor-img');
    /* Tocar en cualquier sitio cierra, la imagen incluida: no hay nada más
       que hacer en ella que mirarla. */
    visor.addEventListener('click', cerrar);
    visor.addEventListener('close', function () {
      if (deDonde) { try { deDonde.focus({ preventScroll: true }); } catch (_) {} }
      deDonde = null;
    });
    document.body.appendChild(visor);
  }

  function abrir(enlace) {
    var chica = enlace.querySelector('img');
    var alt = chica ? chica.alt : '';
    /* La dirección va entera y no relativa: arriba se resuelve contra el
       programa, no contra este relato, y «img/…» apuntaría a otro sitio. */
    var src = new URL(enlace.getAttribute('href'), location.href).href;
    if (enMarco) {
      try { parent.postMessage({ glossa: 'lamina', src: src, alt: alt }, '*'); return; }
      catch (_) { /* si no se pudo avisar, que la enseñe el relato */ }
    }
    if (!visor) armar();
    grande.src = src;
    grande.alt = alt;
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
