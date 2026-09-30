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

   CÓMO SE MIDE. Se busca el último commit que tocó algo del árbol y se compara
   EL NÚMERO que tenía la portada en ese commit con el que tenía en su padre.
   Si es el mismo, hay cambios publicados que no le llegarán a un lector con el
   árbol guardado.

   SE COMPARAN LOS NÚMEROS, NO LAS LÍNEAS, y esto costó una revisión. La
   primera versión preguntaba con `git log -G` por un commit que hubiera tocado
   una línea con `?v=`, y eso da un falso verde: cambiar cualquier otro atributo
   de esa misma línea —`<link href="style.css?v=63" media="...">`— hace que git
   la cuente como línea cambiada aunque el número siga donde estaba. La prueba
   habría dicho que sí con el fallo puesto, que es justo lo que esta prueba
   existe para no dejar pasar. Lo levantó Codex.

   SE EXIGE DISTINTO, NO MAYOR, y a propósito: lo que rompe la caché es que la
   dirección cambie, no que crezca. Volver de 63 a 62 es feo pero funciona, y
   una línea que además pidiera orden se caería en una vuelta atrás legítima
   por una razón que no es la suya.

   COMPROBADO CONTRA LA HISTORIA DE VERDAD, que es lo que hace que esta prueba
   valga algo: en `70dc337` —el commit donde el aspa se subió a 40 sin tocar el
   número— la portada tenía 62 antes y 62 después, o sea ROJA. En `3703ec3` —el
   que lo arregló— tenía 62 antes y 63 después, o sea verde. La línea distingue
   el fallo del arreglo, que es lo único que se le pide.

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

/* El número que lleva la portada en una revisión dada. Devuelve null si allí
   no había portada —el commit que la creó— o si no lleva ninguno. */
const numeroEn = (rev, portada) => {
  let txt;
  try { txt = git('show', rev + ':' + portada); } catch (e) { return null; }
  const m = /\?v=(\d+)/.exec(txt);
  return m ? m[1] : null;
};

for (const { arbol, portada } of arboles){
  const tocado = git('log', '-1', '--format=%h', '--', arbol + '/');
  const asunto = tocado ? git('log', '-1', '--format=%s', tocado) : '';
  const ahora = tocado ? numeroEn(tocado, portada) : null;
  /* El padre del commit que tocó el árbol. `git log` por camino se salta las
     fusiones, así que esto es siempre el commit anterior de verdad. */
  let antes = null;
  try { antes = tocado ? numeroEn(git('rev-parse', tocado + '^'), portada) : null; }
  catch (e) { antes = null; }   /* era el primer commit: no hay con qué comparar */
  di('  ' + arbol + ' · último cambio', (tocado || '?') + ' ' + asunto);
  di('  ' + arbol + ' · el número', (antes === null ? '(no había)' : antes) + ' → ' + ahora);
  vale('EL ÚLTIMO CAMBIO DE ' + arbol.toUpperCase() + ' SUBIÓ SU NÚMERO DE CACHÉ',
       !!tocado && ahora !== null && antes !== ahora,
       antes !== ahora ? antes + ' → ' + ahora
         : 'el árbol cambió en ' + tocado + ' y el número se quedó en ' + ahora);

  /* LO SIN CONFIRMAR, que es donde el aviso llega a tiempo. Se compara el
     número que hay en HEAD con el que hay en el fichero de trabajo, por lo
     mismo que arriba: mirar si la LÍNEA cambió daría verde con el número
     quieto. `git status` no distingue por qué cambió un fichero, así que la
     portada cuenta como cambio del árbol igual que los demás. */
  const sucio = git('status', '--porcelain', '--', arbol + '/')
    .split('\n').filter(Boolean);
  if (sucio.length){
    const enHead = numeroEn('HEAD', portada);
    const m = /\?v=(\d+)/.exec(fs.readFileSync(path.join(RAIZ, portada), 'utf8'));
    const enDisco = m ? m[1] : null;
    di('  ' + arbol + ' · sin confirmar', sucio.join(' · '));
    di('  ' + arbol + ' · el número ahí', enHead + ' → ' + enDisco);
    vale('  y lo que hay SIN CONFIRMAR en ' + arbol + ' también lo sube',
         enDisco !== null && enHead !== enDisco,
         enHead !== enDisco ? enHead + ' → ' + enDisco
           : 'hay cambios y el número sigue en ' + enHead);
  } else {
    di('  ' + arbol + ' · sin confirmar', 'nada');
  }
}

fin();
