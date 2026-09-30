/* ¿SE SUBIÓ EL NÚMERO DE CACHÉ CUANDO CAMBIÓ EL ÁRBOL?

   ESTA PRUEBA NO ABRE EL NAVEGADOR, y es la primera del banco que no lo hace.
   No es un capricho: lo que hay que vigilar aquí no se puede ver desde dentro
   de la aplicación. Cargada en un navegador limpio, la hoja de estilos siempre
   es la nueva —no hay caché que estorbe— así que el olvido es invisible
   exactamente donde el banco mira. Lo que delata el olvido es el REPOSITORIO:
   un fichero del árbol cambió y su número no.

   POR QUÉ EXISTE, Y LA CUENTA ES DE DOS. El aspa del cofre se cambió en la
   hoja de estilos sin subir el `?v=`, con lo que a quien ya tuviera la hoja
   guardada no le llegaba nada. Lo levantó la revisión de Codex. Meses después
   —anoche— volvió a pasar, con la misma aspa, y volvió a levantarlo Codex. En
   medio se escribió en `encuentros` una línea que vigila que los seis ficheros
   del árbol vayan con el MISMO número, y su propio comentario dejó dicho lo
   que no podía cubrir:

     «Lo que esta línea puede guardar es la mitad que se puede comprobar desde
      aquí: que los seis vayan a la una. Un olvido entero no lo ve nadie más
      que quien escribe el cambio.»

   Dos veces ese «nadie» fue quien escribía el cambio. Esto es la otra mitad.

   CÓMO SE MIDE. Dos preguntas al repositorio y una comparación:
     · cuál fue el último commit que tocó algo del árbol, y
     · cuál fue el último que cambió una línea con `?v=` en su portada.
   Si no son el mismo, hay cambios publicados que no le llegarán a un lector
   con el árbol guardado.

   COMPROBADO CONTRA LA HISTORIA DE VERDAD, que es lo que hace que esta prueba
   valga algo: en `70dc337` —el commit donde el aspa se subió a 40 sin tocar el
   número— las dos preguntas dan `70dc337` y `58e6829`, o sea ROJA. En
   `3703ec3` —el que lo arregló— dan las dos `3703ec3`, o sea verde. La línea
   distingue el fallo del arreglo, que es lo único que se le pide.

   Y TAMBIÉN MIRA LO QUE AÚN NO SE HA CONFIRMADO, que es donde de verdad sirve:
   si hay cambios sin confirmar en el árbol, el número tiene que estar entre
   ellos. Así el aviso llega ANTES del commit y no dos revisiones después.

   LOS ÁRBOLES SE BUSCAN, NO SE ESCRIBEN A MANO. Hoy sólo `oracion/` lleva
   números de caché; el día que otro los lleve, esta prueba lo recoge sola. Una
   lista escrita aquí se quedaría corta sin que nadie se enterara, que es
   justamente la clase de olvido que esto viene a cazar. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { di, vale, titulo, fin } = require('./comun.js');

const RAIZ = path.join(__dirname, '..');
const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }).trim();

titulo('el número de caché sube cuando cambia el árbol que lo lleva');

/* Si no se puede preguntar al repositorio, esto NO pasa de largo en verde: una
   prueba que se rinde en silencio es peor que no tenerla, porque deja el hueco
   y además lo tapa. */
let hayGit = false;
try { git('rev-parse', '--git-dir'); hayGit = true; } catch (e) { hayGit = false; }
vale('(la prueba es válida) se puede preguntar al repositorio', hayGit,
     hayGit ? 'sí' : 'no hay git aquí, y sin él esto no se puede comprobar');

/* Un árbol con caché es una carpeta cuya portada pide sus propios ficheros con
   un `?v=`. Se buscan en vez de nombrarlos, por lo dicho arriba. */
const arboles = hayGit ? [...new Set(git('ls-files', '*.html')
  .split('\n').filter(Boolean)
  .filter(f => f.includes('/'))
  .filter(f => /\?v=\d+/.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')))
  .map(f => ({ portada: f, arbol: f.split('/').slice(0, -1).join('/') })))] : [];
di('árboles con número de caché', arboles.map(a => a.arbol).join(', ') || 'ninguno');
vale('(la prueba es válida) hay al menos un árbol que vigilar',
     arboles.length >= 1, String(arboles.length));

for (const { arbol, portada } of arboles){
  const tocado = git('log', '-1', '--format=%h %s', '--', arbol + '/');
  const numerado = git('log', '-1', '--format=%h %s', '-G', '\\?v=[0-9]+', '--', portada);
  di('  ' + arbol + ' · último cambio', tocado || '(ninguno)');
  di('  ' + arbol + ' · último número', numerado || '(ninguno)');
  vale('EL ÚLTIMO CAMBIO DE ' + arbol.toUpperCase() + ' SUBIÓ SU NÚMERO DE CACHÉ',
       !!tocado && tocado === numerado,
       tocado === numerado ? tocado
         : 'cambió en ' + (tocado || '?') + ' y el número en ' + (numerado || 'nunca'));

  /* LO SIN CONFIRMAR, que es donde el aviso llega a tiempo. `git status` no
     distingue por qué cambió un fichero, así que la portada cuenta como cambio
     del árbol igual que los demás; lo que se exige es que ENTRE lo cambiado
     esté una línea con `?v=`. */
  const sucio = git('status', '--porcelain', '--', arbol + '/')
    .split('\n').filter(Boolean);
  const numeroTocado = sucio.length
    ? /^[+-].*\?v=\d+/m.test(git('diff', 'HEAD', '-U0', '--', portada))
    : null;
  if (sucio.length){
    di('  ' + arbol + ' · sin confirmar', sucio.join(' · '));
    vale('  y lo que hay SIN CONFIRMAR en ' + arbol + ' también lo sube',
         numeroTocado === true,
         numeroTocado ? 'sí' : 'hay cambios y el número sigue donde estaba');
  } else {
    di('  ' + arbol + ' · sin confirmar', 'nada');
  }
}

fin();
