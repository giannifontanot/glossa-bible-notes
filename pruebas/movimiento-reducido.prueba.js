/* QUIEN PIDIÓ MENOS MOVIMIENTO NO RECIBE EL DEL ZOOM.

   De todo lo que se mueve en este programa, la hoja entera cambiando de tamaño
   y de sitio durante medio segundo es lo más grande. Es justo la clase de
   movimiento por la que existe la preferencia, y el archivo ya la respeta en
   otros sitios: sería raro apagar el giro de un disco y dejar puesto esto.
   Se apaga la TRANSICIÓN, no el zoom: la hoja sigue viéndose entera y llega
   ahí en un cuadro. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

(async () => {
  let sesion;
  for (const modo of ['no-preference', 'reduce']){
    sesion = await abrir({ reducedMotion: modo });
    const p = sesion.pagina;
    titulo('prefers-reduced-motion: ' + modo);
    const r = await p.evaluate(async () => {
      const inner = document.querySelector('#pg .pg-inner');
      const antes = getComputedStyle(inner).transform;
      document.getElementById('btnZoom').click();
      await new Promise(z => setTimeout(z, 40));
      const dur = getComputedStyle(inner).transitionDuration;
      await new Promise(z => setTimeout(z, 170));
      const medio = getComputedStyle(inner).transform;
      await new Promise(z => setTimeout(z, 900));
      const fin = getComputedStyle(inner).transform;
      return { duracion: dur, interpola: medio !== antes && medio !== fin, destino: fin };
    });
    di('medido', { duracion:r.duracion, interpola:r.interpola });
    if (modo === 'reduce'){
      vale('sin transición', r.duracion.startsWith('0s'), r.duracion);
      vale('y sin interpolar', !r.interpola);
    } else {
      vale('con transición', !r.duracion.startsWith('0s'), r.duracion);
      vale('e interpolando', r.interpola);
    }
    vale('llega al mismo sitio', r.destino !== 'none', r.destino);
    if (modo === 'no-preference'){ await sesion.navegador.close(); }
  }
  await cerrar(sesion);
})();
