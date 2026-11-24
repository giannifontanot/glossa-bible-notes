# Glossa · notas para quien toque este código

> **Las dos que no se saltan:** subir el sello de la versión en el mismo commit
> que el cambio, y **no fundir una PR sin la casilla «pruebas» en verde** en
> GitHub. Las dos están explicadas abajo.

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

### SIEMPRE: las pruebas las corre GitHub

**Cada push a una PR corre el banco entero en GitHub Actions**
(`.github/workflows/pruebas.yml`): las 36 suites a la vez, repartidas en
dieciocho máquinas por lo que tarda cada una —y las cuatro más largas partidas
en dos tramos (ver `pruebas/README.md`)—, y al final una sola casilla, **«pruebas»**, verde o
roja. El repo es público y los
minutos son gratis. Lo pidió así el dueño del repo.

Antes las corría él a mano, o se las pasaba a otro LLM, y había que avisar
antes, escribir el encargo en la PR con el commit exacto y esperar. Todo eso
sobra: el commit lo pone GitHub y el resultado sale en la PR.

Así que el orden es este:

1. Se sube el cambio a la PR.
2. Se **espera la casilla «pruebas»**. Si sale roja, se abre la suite que
   falló —cada una es su propio trabajo, con su nombre— y se arregla.
3. Con «pruebas» en verde en el HEAD de la PR, se puede fundir.

Lo que **sigue sin hacerse** es lanzar el banco en la máquina de nadie sin
avisar: en local son minutos por suite y la tanda pasa de los 45. Para mirar
algo concreto en local está el filtro (`npm test -- libros`), y se dice antes.

Para lanzarlas a mano en GitHub —en `main`, o solo unas cuantas— está la
pestaña Actions → «pruebas» → *Run workflow*, con el mismo filtro de palabras
que `npm test`.

El comando local, para cuando haga falta:

```sh
npm test                    # todas
npm test -- glosas filo     # solo las que contengan eso en el nombre
```

## Dónde se publica

- **glossabible.com**, en Firebase Hosting (proyecto `glossa-bible-notes`).
  `firebase.json` sirve el repo tal cual, sin compilar, y deja fuera pruebas,
  scripts y respaldos. Todo va con `Cache-Control: no-cache`, como lo pide el
  service worker: se pregunta antes de usar lo guardado.
- `.github/workflows/publicar.yml` publica **solo después de «pruebas» en verde
  en `main`**, y publica ese commit. Sin el secreto
  `FIREBASE_SERVICE_ACCOUNT_GLOSSA_BIBLE_NOTES` se salta sin ponerse rojo.
- Los otros dominios (glosabible.app/.com/.org, glossabible.app/.org y
  www.glossabible.com) redirigen a glossabible.com desde la consola de Hosting,
  no desde `firebase.json`.
- GitHub Pages sigue publicando el repo, **sin redirigir ni avisar** (lo decidió
  Gianni: esa dirección solo la conocen dos personas). Ojo: el `localStorage`
  es de cada dirección; lo de un lector pasa de una a otra solo por su cuenta
  en la nube o por un archivo de respaldo.

## Git

- Se desarrolla en una rama, nunca directo sobre `main`.
- `main` se funde con **merge commit** (es lo que hay en la historia).
- Los mensajes de commit van en español y cuentan el porqué, como los
  comentarios.
