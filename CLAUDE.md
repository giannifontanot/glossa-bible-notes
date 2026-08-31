# Glossa · notas para quien toque este código

> **Las dos que no se saltan:** subir el sello de la versión en el mismo commit
> que el cambio, y **avisar antes de correr cualquier prueba** en vez de
> lanzarla. Las dos están explicadas abajo.

## SIEMPRE: el sello de la versión

**Cada vez que se cambia el código, se actualiza el sello de compilación.** Es
lo que se ve en el panel de **RESPALDO**, y es la única manera que tiene el
lector de saber si lo que está usando trae el arreglo o todavía no. Un arreglo
publicado sin subir el sello se investiga dos veces.

En `index.html`:

```js
window.GLOSS_BUILD = 'DD-MMM-YY HH:MM';
```

- Formato `DD-MMM-YY HH:MM`, mes en tres letras y en español (`AGO`, `SEP`…).
- **Hora de Dallas**, no la del aparato donde se edita:
  `TZ=America/Chicago date +"%d-%b-%y %H:%M"`.
- Se sube en el mismo commit que el cambio, no en uno aparte.

## Cómo es este programa

- **Un solo archivo**: `index.html` lo lleva todo —marcado, estilos y
  programa—, envuelto en una IIFE. Nada de dentro se ve desde fuera, y es a
  propósito.
- **Español en todo**: nombres, comentarios, mensajes y commits. Los
  comentarios cuentan *por qué*, y sobre todo qué se intentó antes y por qué no
  servía; esa es la parte que no se puede recuperar leyendo el código.
- **El repo es la fuente**. Antes de opinar sobre cómo está algo, léelo en
  `index.html`, no en un diff ni en un resumen.

## Las pruebas

`pruebas/` es un banco de Playwright sobre Chromium que maneja la aplicación
como la maneja un dedo. Está explicado en `pruebas/README.md`, y estas tres
reglas costaron caro:

1. **Nada de `.click()` para gestos.** Se mandan `PointerEvent` con su
   `pointerId` y su `pointerType`.
2. **Los gestos van torcidos.** Una línea perfectamente recta no es un dedo, y
   una prueba que la dibuja está probando otra cosa.
3. **Ni un simulacro de código de la aplicación.** Lo único que se sustituye
   alguna vez es una pieza del navegador (`new Image()`).

Y una cuarta, aprendida con el arreglo de la selección: **un evento despachado
a mano siempre llega, y el de un teléfono no.** Si un arreglo se apoya en ver
un `pointerdown`, escribe la prueba que lo manda *sin* él.

### SIEMPRE: avisar antes de correr las pruebas

**No se lanza ninguna prueba sin avisar primero.** Se dice qué hace falta
correr y por qué, y ahí se para. La decisión de quién las corre es del dueño
del repo, no de quien escribió el cambio: puede correrlas él, o pasárselas a
otro LLM que las ejecute y devuelva el resultado de la manera que sea.

Así que el orden es este, sin saltarse pasos:

1. Se termina el cambio y se dice **qué pruebas hacen falta y por qué**, con
   el comando exacto y a ojo cuánto tardan.
2. Se **espera**. No se lanza nada mientras tanto.
3. Llega el resultado —lo corra quien lo corra— y se sigue desde ahí.

El comando:

```sh
npm test                    # todas
npm test -- glosas filo     # solo las que contengan eso en el nombre
```

Son lentas: minutos por suite, y la tanda entera pasa de la hora. Esa es
justamente la razón de avisar antes en vez de ponerse a correrlas: el tiempo
de máquina es de quien lo paga.

## Git

- Se desarrolla en una rama, nunca directo sobre `main`.
- `main` se funde con **merge commit** (es lo que hay en la historia).
- Los mensajes de commit van en español y cuentan el porqué, como los
  comentarios.
