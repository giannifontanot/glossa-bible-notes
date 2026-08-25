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

## Correr

```sh
npm install                      # una vez
npx playwright install chromium  # una vez
npm test                         # todas
npm test -- zoom pliegue         # solo las que contengan eso en el nombre
```

Si el Chromium está en otro sitio —contenedores que ya lo traen— se le dice
con `CHROMIUM=/ruta/al/chrome npm test`.

Cada prueba imprime **lo que midió** además del veredicto, a propósito: cuando
una se rompa dentro de seis meses, la cifra de cuando iba bien es la mitad del
diagnóstico. Salen con código distinto de cero si algo falla.

## Qué cubre cada una

| prueba | vigila |
|---|---|
| `paginacion` | que el reparto de versículos por hoja no se mueva solo, y que una nota escrita sí empuje el corte |
| `pliegue` | pasar hoja sin tirar el programa: los dos fallos que lo mataban, más el toque que no llegaba con la hoja en el aire |
| `filo` | que un toque en el borde nunca se quede sin efecto: el respaldo de los reintentos, la foto que falla y la que no contesta |
| `zoom` | que entrar y salir sean el mismo viaje —desborde cero de la letra sobre su papel—, la salida por el hueco y que el libro siga usándose de lejos, y que medir a media transición no contamine |
| `movimiento-reducido` | que quien pidió menos movimiento no reciba el del zoom |
| `libros` | cruzar al libro siguiente y volver, el trazo del canto, y que el panel de Libros se entere |
| `glosas` | la caja de escribir —es una glosa, no un formulario—, sus colores, y el vuelo |
| `rotulos` | los dos rótulos, con dedo **y con ratón**, y que el del pie no se ponga blanco |
| `etiquetas` | las cuatro maneras de etiquetar, los nombres raros, y que el control no mienta |
| `cajon` | que el papel se corra con intención y termine el viaje solo, sin rebote |
| `estreno` | las tres glosas que trae un lector recién abierto: que estén, que estén bien ancladas y —lo que de verdad vigila— que NO reaparezcan si las borras |
| `contraste` | el riel de Formato: que el filtro llegue a la hoja **y al lienzo del pliegue** con el mismo número, que NO llegue al panel de Formato, y que sobreviva a la recarga |
| `ventanita` | la salida de `#versoPleno`: que el toque de fuera la cierre venga del rastro o de una referencia dentro de una glosa, y que cerrarla no apague el panel de la glosa de debajo |
| `version` | el sello del panel de Respaldo: que se vea, que tenga la forma pedida, y —lo que de verdad vigila— que la hora sea la de Dallas y no la del aparato |

## Tres reglas que costaron caro

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
