# Las pruebas

Manejan la aplicación como la maneja un dedo: abren `index.html` en un
Chromium de verdad, tocan, arrastran y miden lo que queda en pantalla. No hay
simulacros ni se llaman funciones por dentro.

Lo único que se sustituye alguna vez es una pieza del NAVEGADOR —`new Image()`
en `filo`, para forzar una foto que falla o que no contesta nunca—. De la
aplicación no se toca nada: vive entera dentro de una función y desde fuera no
hay nada suyo que llamar, que es justo lo que obliga a probarla como se usa.

Eso no es purismo. Los fallos que ha tenido este programa **no se ven desde
dentro**:

| el fallo | por qué solo se veía tocando |
|---|---|
| el pliegue reventaba con dos toques seguidos | hacía falta encimar los toques en la ventana exacta |
| los rótulos no respondían con ratón | la captura del puntero reasigna el clic *solo* con ratón |
| la hoja se medía a media transición | había que medir durante los 460 ms del zoom |
| el toque al libro no llegaba con la hoja en el aire | `#pg` está en `visibility:hidden` mientras gira |
| el filo dejaba de pasar hoja para siempre | hacía falta que la foto tardara más que los cuatro reintentos |
| la cinta se ofrecía por hojear, no por leer | los segundos de permanencia solo se cuentan con un reloj de verdad |
| la selección se deshacía al confirmarla con un toque | en Android la selección llega DESPUÉS de soltar; solo un dedo de verdad lo hace |
| la portada se quedaba delante comiéndose los toques | invisible pero puesta: nada falla, simplemente no pasa nada |

## Correr

**En GitHub corren solas**: cada push a una PR lanza las 35 suites en
paralelo —una máquina por suite— y deja en la PR una casilla, «pruebas», verde
o roja. Ver `.github/workflows/pruebas.yml`. A mano, desde la pestaña Actions,
con el mismo filtro de palabras que abajo.

En local:

```sh
npm install                      # una vez
npx playwright install chromium  # una vez
npm test                         # todas
npm test -- zoom pliegue         # solo las que contengan eso en el nombre
```

Si el Chromium está en otro sitio —contenedores que ya lo traen— se le dice
con `CHROMIUM=/ruta/al/chrome npm test`.

Abrir y recargar esperan a la **señal real de que la mesa está lista** —la
portada fuera—, no a un plazo fijo. Un plazo fijo era una carrera: si la
portada tardaba un milisegundo de más, el primer toque de la prueba se lo
comía ella y el fallo salía en cualquier otro sitio, sin decir por qué. Si una
prueba abre su propia pestaña, que llame a `listo(pagina)` antes de tocar.

Cada prueba imprime **lo que midió** además del veredicto, a propósito: cuando
una se rompa dentro de seis meses, la cifra de cuando iba bien es la mitad del
diagnóstico. Salen con código distinto de cero si algo falla.

## Qué cubre cada una

| prueba | vigila |
|---|---|
| `indices-orden` | las manijas de NOTAS y ENCUENTROS: arrastre con dedo real y ratón, sincronización inmediata con las pestañas, teclado y foco, cancelación sin guardar, desplazamiento automático de listas largas, contenido y orden en el respaldo, errores de almacenamiento y persistencia tras recargar |
| `notas-filtros` | el historial de filtros propio de cada nota: captura desde GLOSAS, espera en el Índice, visitas repetidas, restauración con teclado, libros y condiciones desaparecidas, glosas que cambian, conservación al renombrar/reordenar y exportar/importar, errores de almacenamiento y persistencia de los libros añadidos |
| `notas-formato` | la barra de formato de las notas y sus dos panelitos: que el botón viva junto al libro, que los dos abran y cierren **suave** —midiendo el alto cuadro a cuadro— y uno solo a la vez, que la barra venga en sus dos renglones con sus grupos —cada uno entero en el teléfono, repartidos a lo ancho de orilla a orilla, los dos del mismo ancho y con el mismo hueco entre grupos—, que con la barra abierta la nota se marque a toques sin foco ni teclado, que negrita, cursiva, subrayado y las listas se guarden y vuelvan al recargar, que una nota de antes se vea letra por letra como se veía, que un respaldo con HTML de más llegue limpio, que pegar traiga solo el texto, y la foto: elegida por el selector de verdad, achicada a 1080 px y unos 140 KB, guardada aparte, de ida y vuelta en el respaldo, rechazada con aviso si ya no cabe y olvidada al arrancar cuando ninguna nota la usa |
| `notas-colores` | el modo formato de las notas —con la barra abierta la nota no se escribe ni pide teclado, y se marca a toques, una palabra por toque, y se estira con las manijas; el toque largo marca aunque no llegue pointerdown y se come el menú de copiar—, el resaltado en sus cinco colores, la letra en sus cinco, agrandar y achicar solo lo marcado y con tope, el tipo de letra (la de la nota, Literata, Caveat), que nada de eso apile spans, que se guarde, vuelva al recargar y viaje en el respaldo, y que un respaldo con valores inventados no cuele nada |
| `notas-manijas` | lo que se pidió tras estrenar el modo formato: que un segundo toque marque solo su palabra y no media nota, las dos manijas de lo marcado —debajo de la primera letra y de la última, arrastradas de palabra en palabra, sin cruzarse, y también sin pointerdown—, que tocar una manija no marque ni saque el menú, que el lápiz sea el interruptor —abierto se da estilo, cerrado se escribe—, que un toque en el espacio en blanco suelte lo marcado sin cursor ni teclado deshacer y rehacer solo del estilo, cinco pasos, que se guardan y que escribir vacía, y la brocha de copiar formato —se pone con algo marcado, pinta cada palabra que se toca con el estilo exacto, quitando lo que sobra, cuenta para deshacer y se suelta con su botón o al cerrar el lápiz— |
| `paginacion` | que el reparto de versículos por hoja no se mueva solo, y que una nota escrita sí empuje el corte |
| `pliegue` | pasar hoja sin tirar el programa: los dos fallos que lo mataban, más el toque que no llegaba con la hoja en el aire |
| `filo` | que un toque en el borde nunca se quede sin efecto: el respaldo de los reintentos, la foto que falla y la que no contesta |
| `separador` | la cinta de lectura: que hojear no cuente como leer, que la oferta salga una sola vez, que la cinta activa siga al lector sin arrastrar a las viejas, y que lo guardado sobreviva a recargar y a un almacén dañado |
| `zoom` | que entrar y salir sean el mismo viaje —desborde cero de la letra sobre su papel—, la salida por el hueco y que el libro siga usándose de lejos, y que medir a media transición no contamine |
| `movimiento-reducido` | que quien pidió menos movimiento no reciba el del zoom |
| `libros` | cruzar al libro siguiente y volver, el trazo del canto, que el panel de Libros se entere, y que con el panel puesto no asome nada del libro —ni los cuatro puntos, ni los anillos rojos de los rótulos— |
| `glosas` | la caja de escribir —es una glosa, no un formulario—, sus colores, y el vuelo |
| `rotulos` | los dos rótulos, con dedo **y con ratón**, y que el del pie no se ponga blanco |
| `navegar` | el rastro y los saltos, las flechas de pasar hoja, y los letreros de las guías: que cada puerta diga su gesto —«click largo» en la perícopa, «jalar» en la G, «click» en las demás—, que ninguno se lea en voz alta, que encenderlos no mueva la hoja ni un píxel, y que ninguno se salga de su sitio **recorriendo veintiséis hojas y con la letra al tope**, que es donde viven los dos fallos que se escaparon midiendo una hoja a tamaño de fábrica |
| `etiquetas` | las cuatro maneras de etiquetar, los nombres raros, y que el control no mienta |
| `cajon` | que el papel se corra con intención y termine el viaje solo, sin rebote |
| `estreno` | las tres glosas que trae un lector recién abierto: que estén, que estén bien ancladas y —lo que de verdad vigila— que NO reaparezcan si las borras; y la portada, que tape al abrir y devuelva los toques al irse |
| `contraste` | el riel del panel de la letra (la pestaña «AAA», antes «Formato»): que el filtro llegue a la hoja **y al lienzo del pliegue** con el mismo número, que NO llegue al propio panel, y que sobreviva a la recarga |
| `ventanita` | la salida de `#versoPleno`: que el toque de fuera la cierre venga del rastro o de una referencia dentro de una glosa, y que cerrarla no apague el panel de la glosa de debajo |
| `portada` | la tapa del arranque: que cuente segundo y tres cuartos, que «hold» la pare y «continue» la suelte, y que la foto y las piedras que se le peguen sigan ahí al volver |
| `version` | el sello del panel de compartir (antes «Respaldo», luego «Share», hoy el signo del punto que se abre en otros dos): que se vea, que tenga la forma pedida, y —lo que de verdad vigila— que la hora sea la de Dallas y no la del aparato; y el crédito de licencia, que vive ahí porque la atribución CC BY-SA es obligatoria |
| `encuentros` | la quinta sección y el signo de compartir: que Encuentros esté detrás de Glosas y sus relatos en el orden pedido, que su barra de dentro sobreviva a cerrar y volver a abrir —la trampa: si se llamara `.pestanas`, ponerBarra la borraría—, que las pestañas vayan en UN renglón por muchas que sean y la tira avise de lo que queda fuera, que cada relato se pida cuando se mira su pestaña y no al arrancar —ni al abrir la sección: abrir Encuentros no puede costar todos los documentos—, que llene el panel sin comerse el botón de CERRAR, que Escape salga también desde dentro del marco, y que el relato se vista con la ropa del libro: el tipo y el tamaño de letra de AAA, la tinta del sepia, ningún papel propio y el oro del número de capítulo |
| `cache` | **la única que no abre el navegador**: que el número de caché del árbol de ORACIÓN haya subido en el mismo commit en que cambió cualquiera de sus ficheros, y que si hay cambios sin confirmar el número esté entre ellos. Vive fuera del navegador porque el olvido es invisible desde dentro: una hoja de estilos cargada en limpio siempre es la nueva. Dura un parpadeo |
| `acuse` | el borde que late al tocar —«te oí, estoy en ello»—: que llegue a lo que se toca (un libro, un capítulo de la cascada, una glosa del índice, una pestaña de Encuentros, un botón, un desplegable) y que NO llegue a lo que no lo necesita (los rieles, la casilla, el asa de arrastrar), que es la mitad sin la cual «acusa todo» pasaría; las dos formas —macizo para un botón, aro para lo que ya dice algo con su color— medidas sobre el fondo, que es donde se diferencian; que la lupa de Libros lo retire del libro de partida y un gesto cancelado no lo deje encendido; y que un cambio CARO en un desplegable lo enseñe, que es donde se caía |
| `nube` | la cuenta y la nube, con un Firebase de mentira del lado del navegador y el programa entero de verdad: que abierta como archivo no haya cuenta, que sin entrar nada salga, que al entrar suba todo lo del teléfono —glosas, notas, la foto en su propio documento, por dónde vas—, que un segundo teléfono con lo suyo reciba lo del primero sin perder lo propio ni traer la nota vacía de estreno, que borrar en uno borre en el otro, que salir deje todo en el aparato, que el enlace por correo entre y limpie la dirección, y que nadie lea ni escriba fuera de `users/{su uid}` |
| `buzon` | las notas recibidas: que «Las festividades judías» llegue una sola vez como carta cerrada en azul, que su bolita de 40 puntos caiga desde arriba y las que ya estaban nazcan abajo, que ruede hacia donde se inclina el teléfono —el sensor se manda a mano, es lo único que se sustituye— sin atravesar a las otras, que tocarla la deje quieta con su burbuja y la colita hacia ella, que tocar la burbuja la suelte, que el toque sin pointerdown también llegue, que con la burbuja abierta la bolita se desvanezca y la carta quede abierta para siempre, y que en la lista de NOTAS el sobre ocupe el sitio de la flecha |
| `mensajes` | el correo entre lectores, con tres teléfonos y tres cuentas sobre la misma nube de mentira que `nube`, que hace cumplir `firestore.rules`: que sin cuenta el avioncito pida entrar y lleve a la cuenta, que cada uno tenga su código de ocho sin letras que se confundan y su QR, que agregar sea escribir el código —en minúsculas y sin guion también— y el propio no se agregue, que una nota llegue con su foto, en el color que eligió quien la manda, como carta cerrada de solo lectura que dice de quién es, que su bolita caiga y el buzón se vacíe, que un grupo tenga su código, que el QR abra Glossa con el código escrito y la dirección limpia, que quien entra quede dentro sin esperar y con el creador en sus contactos, que solo el creador le mande al grupo, que lo que llega con Glossa cerrada aparezca abajo, y que nada de lo que las reglas niegan se intente |

## Cuatro reglas que costaron caro

**1 · Nada de `.click()` para gestos.** Un clic sintético no pasa por la
captura del puntero, que es justo donde vivía un fallo. Los gestos se mandan
con `PointerEvent`, con su `pointerId` y su `pointerType`.

**2 · Los arrastres van torcidos.** Un dedo real tiembla, y ese temblor mataba
el gesto del cajón. Una prueba que dibuja una línea perfecta está probando otra
cosa.

**3 · Los márgenes salen del ruido medido, no de lo que parezca razonable.**
Una prueba comparaba el centroide de tinta del pliegue con 6 px de margen;
midiendo tres veces el *mismo* caso, ese centroide bailaba 12 px. Cantaba
fallos que no existían, y eso enseña a ignorarla — peor que no tenerla.

**4 · Un evento despachado a mano siempre llega; el de un teléfono no.** Y
esto tiene un filo concreto que costó un fallo entero, así que va con nombre:
un `PointerEvent` construido con `new` **se salta `touch-action`**. El
navegador reparte los gestos táctiles *antes* de que empiecen, mirando el
`touch-action` del elemento y sus antepasados, y si decide que el gesto es
suyo manda `pointercancel` a media faena — `preventDefault()` ya no lo salva,
porque esa decisión está tomada. Los eventos sintéticos no pasan por ese
reparto, así que **por ese camino el fallo es invisible**: el trazo de pintar
con el dedo se medía bien veinte veces seguidas y en un teléfono se cortaba a
la tercera línea.

Cuando lo que se prueba depende de `touch-action` —pintar, arrastrar, pasar
hoja—, los toques se mandan por el protocolo del navegador:

```js
const cdp = await pagina.context().newCDPSession(pagina);
await cdp.send('Input.dispatchTouchEvent',
               { type:'touchStart', touchPoints:[{ x, y, id:1 }] });
```

Es el único camino de estas pruebas que pasa por donde vive `touch-action`.
No sustituye a la regla 1 —para casi todo, `PointerEvent` está bien y es más
cómodo—, pero si el fallo que se busca huele a «el navegador se quedó con el
gesto», con `PointerEvent` no se va a ver nunca.

## Lo que NO cubren

Conviene saberlo antes de confiar de más:

- **Un solo navegador.** Chromium. Nada de Firefox ni de Safari, y el Safari de
  iOS es el que más se sale del guion.
- **Nada de rendimiento.** Los tiempos que aparecen se imprimen para mirarlos,
  no se juzgan. Las mediciones con la CPU frenada —los 19 s del cambio de
  libro, por ejemplo— se hicieron a mano y no están aquí.
- **Nada de lo visual.** Que un color quede feo o un botón ocupe media
  pantalla no lo caza ninguna de estas.
- **El respaldo y la importación**, apenas.
- **Lo que se le sirve a un lector que ya tenía la página guardada**, salvo el
  número de caché del árbol de ORACIÓN, que vigila `cache`. El navegador de las
  pruebas arranca siempre en limpio, así que ninguna de las demás ve lo que ve
  un teléfono con memoria.

`separador` tarda dos minutos largos y es a propósito: lo que vigila son los
veinte segundos de permanencia que separan leer de hojear, y el reloj no se
falsea. Una prueba que adelanta el reloj no comprueba ese número, comprueba
que el temporizador se llama.
