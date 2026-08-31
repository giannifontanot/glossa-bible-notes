# Glossa · notas para quien toque este código

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

Correr:

```sh
npm test                    # todas
npm test -- glosas filo     # solo las que contengan eso en el nombre
```

Son lentas (minutos). Si hace falta la pasada completa y no es tuya la máquina
que la va a correr, di el comando exacto y espera el resultado.

## Git

- Se desarrolla en una rama, nunca directo sobre `main`.
- `main` se funde con **merge commit** (es lo que hay en la historia).
- Los mensajes de commit van en español y cuentan el porqué, como los
  comentarios.
