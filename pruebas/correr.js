/* CORRE TODAS LAS PRUEBAS Y DICE SI ALGO SE ROMPIÓ.

   Cada prueba va en su propio proceso a propósito. Comparten un navegador
   ninguna: se abre y se cierra uno por prueba, que es más lento y evita que el
   estado de una se filtre en la siguiente —almacén local, marcas guardadas,
   ajustes—. Con una aplicación cuyo estado vive entero en localStorage, esa
   filtración sería el bicho más difícil de encontrar de toda la carpeta.

   Uso:
     npm test                   todas
     npm test -- pliegue zoom   solo las que contengan eso en el nombre
*/
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const filtro = process.argv.slice(2);
const pruebas = fs.readdirSync(dir)
  .filter(f => f.endsWith('.prueba.js'))
  .filter(f => !filtro.length || filtro.some(x => f.includes(x)))
  .sort();

if (!pruebas.length){
  console.log('No hay pruebas que correr' + (filtro.length ? ' con ese filtro.' : '.'));
  process.exit(1);
}

console.log('\n' + '═'.repeat(58));
console.log('  ' + pruebas.length + ' prueba' + (pruebas.length>1?'s':''));
console.log('═'.repeat(58));

const t0 = Date.now();
const mal = [];
for (const f of pruebas){
  console.log('\n─── ' + f + ' ' + '─'.repeat(Math.max(0, 50 - f.length)));
  const r = spawnSync(process.execPath, [path.join(dir, f)],
                      { stdio:'inherit', env: process.env });
  if (r.status !== 0) mal.push(f);
}

const seg = Math.round((Date.now() - t0)/1000);
console.log('\n' + '═'.repeat(58));
if (mal.length){
  console.log('  FALLARON ' + mal.length + ' de ' + pruebas.length + ' · ' + seg + ' s');
  mal.forEach(f => console.log('    · ' + f));
} else {
  console.log('  Todo bien: ' + pruebas.length + ' de ' + pruebas.length + ' · ' + seg + ' s');
}
console.log('═'.repeat(58) + '\n');
process.exit(mal.length ? 1 : 0);
