/* EL PUENTE ENTRE UN RELATO Y EL PROGRAMA QUE LO ENSEÑA.

   Hace dos cosas, y las dos por la misma razón: un marco es otro documento y
   no hereda nada del de fuera —ni las teclas, ni la letra, ni el papel—.

     · devuelve la tecla Escape, que si no el relato se queda sin salida;
     · y recibe el estilo del libro: el tamaño Y EL TIPO de letra que el lector
       dejó puestos en AAA, y los marrones del sepia, que se mueven con el
       riel. El relato los pone en :root y toda su hoja cuelga de ahí.

   LA SALIDA DE UN RELATO, QUE POR SÍ SOLO NO LA TIENE.

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

  /* EL ESTILO LLEGA DE ARRIBA, y sólo de arriba: se comprueba que quien manda
     sea la ventana que nos enseña y no cualquiera que tenga el marco a mano.
     Lo que viaja son cuatro cadenas de CSS, así que lo peor que puede hacer un
     aviso falso es pintar mal un relato; aun así se mira, que es gratis. */
  addEventListener('message', function (ev) {
    if (ev.source !== parent) return;
    var e = ev.data;
    if (!e || e.glossa !== 'estilo') return;
    var r = document.documentElement.style;
    /* Cada una se pone sólo si vino: un valor vacío borraría el respaldo que
       este relato lleva escrito para cuando se abre solo. */
    if (e.letra)   r.setProperty('font-size', e.letra);
    if (e.familia) r.setProperty('--familia', e.familia);
    if (e.tinta)   r.setProperty('--tinta', e.tinta);
    if (e.rotulo)  r.setProperty('--rotulo', e.rotulo);
    if (e.raya)    r.setProperty('--raya', e.raya);
  });

  /* Y SE PIDE AL LLEGAR. El programa avisa cuando el lector mueve la letra o
     el sepia, pero el relato entra en escena mucho después de esos cambios:
     sin esta línea se quedaría con sus respaldos hasta que alguien tocara un
     riel. Va en el guion y no al final del documento porque lo que hace falta
     es que salga pronto, no que el relato esté entero. */
  try { parent.postMessage({ glossa: 'listo' }, '*'); } catch (_) {}
})();
