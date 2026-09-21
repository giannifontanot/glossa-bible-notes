/* LA SALIDA DE UN RELATO, QUE POR SÍ SOLO NO LA TIENE.

   Cada encuentro es un documento aparte y se lee dentro de un marco, y eso
   —que es lo que le salva la tipografía y el papel, ver .enc-marco— le quita
   una cosa: las teclas. Con el foco dentro del marco, el teclado se queda en
   el documento de dentro y NO llega al oyente de Escape del programa, así que
   leyendo a Zaqueo la tecla que cierra cualquier otro panel dejaba de cerrar
   éste. Lo levantó la revisión de Codex.

   No se puede arreglar desde fuera: el programa no puede meter la mano en un
   marco que no es suyo —con file:// son orígenes distintos y el navegador lo
   impide—, así que la salida tiene que salir de aquí y avisar hacia arriba.

   Va en un fichero suelto y no dentro de cada relato a propósito: los relatos
   son de quien los escribe, y lo único que se les pide es una línea que traiga
   esto. Lo que hace la tecla lo decide el programa, no el relato.

   Y NO ESTORBA SI EL RELATO SE ABRE SOLO: sin marco no hay a quién avisar y
   Escape vuelve a no hacer nada, que es lo que hace en cualquier página. */
(function () {
  if (parent === window) return;
  addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    ev.preventDefault();
    /* El asterisco es el único destino posible: con file:// el origen de
       arriba es «null» y nombrarlo no vale. Lo que hace que esto sea seguro
       está al otro lado —el programa comprueba que quien avisa sea uno de SUS
       marcos antes de hacerle caso—, que es la comprobación que de verdad
       sirve: la del origen no distingue un marco nuestro de otro cualquiera
       abierto desde el mismo sitio. */
    try { parent.postMessage({ glossa: 'salir' }, '*'); } catch (_) {}
  });
})();
