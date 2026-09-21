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

`separador` tarda dos minutos largos y es a propósito: lo que vigila son los
veinte segundos de permanencia que separan leer de hojear, y el reloj no se
falsea. Una prueba que adelanta el reloj no comprueba ese número, comprueba
que el temporizador se llama.
