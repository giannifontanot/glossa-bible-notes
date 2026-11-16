/* FORMATO CON PRESETS.

   La pestaña AA estrenó cuatro botones —dos para teléfono, dos para
   computadora— que ponen de un toque los mejores ajustes de cada pantalla, y
   pliega los mandos de siempre detrás de «Ajustes finos». Lo pidió Gianni, y
   pidió tres cosas que se miran aquí:
     · que un preset ponga TODO lo que dice —letra, tamaño, interlínea,
       columnas, glosa— y que con el panel opaco espere en la muestra y pase al
       libro al cerrar, como cualquier mando de letra;
     · que el preset puesto se vea encendido y que tocar algo a mano lo apague;
     · que los finos se abran SUAVE y que se note que CERRAR se va hacia abajo.

   El banco abre con los finos abiertos —ver bibliaDeCasa—, así que esta suite
   los pliega ella misma en lo guardado para ver el estado de una instalación
   nueva. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

/* Un toque de dedo: el botón recibe pointerdown, pointerup y el click que
   sigue, que es lo que manda un teléfono. Un poco fuera del centro, que un
   dedo no cae en el píxel exacto. */
const TOCAR = `async (sel) => {
  const b = document.querySelector(sel);
  if (!b) return false;
  const r = b.getBoundingClientRect();
  const o = { bubbles:true, cancelable:true, pointerId:731, pointerType:'touch', isPrimary:true,
              clientX: r.left + r.width/2 + 2, clientY: r.top + r.height/2 - 1 };
  b.dispatchEvent(new PointerEvent('pointerdown', o));
  b.dispatchEvent(new PointerEvent('pointerup', o));
  b.click();
  return true;
}`;
const ABRIR_AA = `async () => {
  const pausa = ms => new Promise(z => setTimeout(z, ms));
  const visible = () => [...document.querySelectorAll('.rollo')].find(r => getComputedStyle(r).display !== 'none');
  if (!visible()){ document.getElementById('pgCabeza').click(); await pausa(900); }
  const t = (visible() || document).querySelector('.pestanas [data-sec="formato"]');
  if (t) t.click();
  await pausa(1000);
  return !!document.querySelector('#ajustes') && getComputedStyle(document.querySelector('#ajustes')).display !== 'none';
}`;
const AJUSTES = 'glossa:ajustes:v1';

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  /* Como una instalación nueva: los finos plegados. */
  await p.evaluate(k => {
    const a = JSON.parse(localStorage.getItem(k) || '{}');
    a.finos = false; a.fontSize = 15; a.columns = 2; a.placement = 'margin';
    a.interlineado = 1.62; a.contraste = 125; a.fuente = 0; a.espaciado = 0;
    localStorage.setItem(k, JSON.stringify(a));
  }, AJUSTES);
  await p.reload();
  await p.waitForTimeout(2200);

  titulo('la pestaña AA nace con los presets y los finos plegados');
  const nace = await p.evaluate(async ([abrirAA]) => {
    const ok = await eval('(' + abrirAA + ')')();
    const cfg = document.getElementById('ctrlConfig');
    const hijos = [...cfg.children].map(e => e.id || e.className.split(' ')[0]);
    const grupos = [...document.querySelectorAll('#presetsFormato .pf-grupo')].map(g => {
      const cs = getComputedStyle(g);
      return { t: g.textContent.trim(), fs: parseFloat(cs.fontSize), color: cs.color };
    });
    return {
      ok, hijos,
      presets: [...document.querySelectorAll('#presetsFormato [data-preset]')].map(b => b.textContent.trim()),
      dices: document.querySelectorAll('#presetsFormato .pf-dice').length,
      finos: getComputedStyle(document.getElementById('ajustesFinos')).display,
      expandido: document.getElementById('btnFinos').getAttribute('aria-expanded'),
      vidrioDentro: !!document.querySelector('#ajustesFinos #btnVidrio'),
      grupos
    };
  }, [ABRIR_AA]);
  di('al nacer', nace);
  vale('(la prueba es válida) se abrió la pestaña AA', nace.ok === true);
  vale('CUATRO PRESETS: Leer cómodo, Estudiar, Leer, Estudiar',
       nace.presets.join(' · ') === 'Leer cómodo · Estudiar · Leer · Estudiar', nace.presets.join(' · '));
  vale('  cada uno con su explicación debajo', nace.dices === 4, nace.dices);
  vale('  con los rótulos del grupo a la vista: oscuros y de 13 px o más',
       nace.grupos.length === 2 && nace.grupos.every(g => g.fs >= 13 &&
         /rgb\((\d+), (\d+), (\d+)\)/.test(g.color) &&
         g.color.match(/\d+/g).slice(0, 3).every(n => +n < 110)),
       nace.grupos.map(g => g.t + ' ' + g.fs + 'px ' + g.color).join(' · '));
  vale('EL ORDEN: presets, muestra, transparente, ajustes finos',
       nace.hijos.join(' ') === 'presetsFormato filaMuestra ajuste btnFinos ajustesFinos', nace.hijos.join(' '));
  vale('  y transparente ya no está dentro de los finos', nace.vidrioDentro === false);
  vale('LOS FINOS NACEN PLEGADOS', nace.finos === 'none' && nace.expandido === 'false',
       nace.finos + ' · aria-expanded ' + nace.expandido);

  titulo('un preset con el panel opaco espera en la muestra');
  const opaco = await p.evaluate(async ([tocar]) => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const fsLibroAntes = getComputedStyle(document.documentElement).getPropertyValue('--fs-libro').trim();
    await eval('(' + tocar + ')')('[data-preset="tel-leer"]');
    await pausa(300);
    const m = document.getElementById('muestraLetra');
    return {
      encendido: [...document.querySelectorAll('#presetsFormato [data-preset].active')].map(b => b.dataset.preset),
      pulsado: document.querySelector('[data-preset="tel-leer"]').getAttribute('aria-pressed'),
      muestraFs: getComputedStyle(m).fontSize,
      muestraFam: getComputedStyle(m).fontFamily,
      fsLibroAntes,
      fsLibroAhora: getComputedStyle(document.documentElement).getPropertyValue('--fs-libro').trim(),
      guardadoFs: JSON.parse(localStorage.getItem('glossa:ajustes:v1')).fontSize
    };
  }, [TOCAR]);
  di('tras «Leer cómodo»', opaco);
  vale('EL PRESET TOCADO SE ENCIENDE', opaco.encendido.join() === 'tel-leer' && opaco.pulsado === 'true',
       opaco.encendido.join() + ' · ' + opaco.pulsado);
  vale('  la muestra ya enseña la letra grande y sin remates',
       opaco.muestraFs === '19px' && /verdana/i.test(opaco.muestraFam), opaco.muestraFs + ' ' + opaco.muestraFam);
  vale('  y el libro espera: el tamaño todavía no está guardado',
       opaco.guardadoFs === 15, opaco.guardadoFs);

  const alCerrar = await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const b = document.querySelector('#ajustes .cerrar-pie');
    if (b) b.click();
    await pausa(1400);
    return JSON.parse(localStorage.getItem('glossa:ajustes:v1'));
  });
  di('guardado al cerrar', alCerrar);
  vale('AL CERRAR PASA AL LIBRO TODO LO QUE DICE',
       alCerrar.fontSize === 19 && alCerrar.fuente === 4 && alCerrar.columns === 1 &&
       alCerrar.placement === 'below' && alCerrar.interlineado === 1.95 &&
       alCerrar.alineacion === 'left' && alCerrar.espaciado === 0,
       [alCerrar.fontSize, alCerrar.fuente, alCerrar.columns, alCerrar.placement,
        alCerrar.interlineado, alCerrar.alineacion, alCerrar.espaciado].join(' · '));
  vale('  y sube el contraste, que es el único preset que lo toca',
       alCerrar.contraste === 140, alCerrar.contraste);

  titulo('tocar a mano apaga el preset; los otros no tocan la tinta');
  const aMano = await p.evaluate(async ([abrirAA, tocar]) => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    await eval('(' + abrirAA + ')')();
    const encendidoAlVolver = [...document.querySelectorAll('[data-preset].active')].map(b => b.dataset.preset);
    /* A+ está dentro de los finos, plegados: se toca igual, que el manejador
       no depende de que se vea. Lo que se mira es el preset. */
    document.getElementById('fsUp').click();
    await pausa(80);
    const trasA = [...document.querySelectorAll('[data-preset].active')].map(b => b.dataset.preset);
    await eval('(' + tocar + ')')('[data-preset="pc-estudiar"]');
    await pausa(200);
    return { encendidoAlVolver, trasA,
             trasPc: [...document.querySelectorAll('[data-preset].active')].map(b => b.dataset.preset),
             contraste: JSON.parse(localStorage.getItem('glossa:ajustes:v1')).contraste };
  }, [ABRIR_AA, TOCAR]);
  di('a mano', aMano);
  vale('AL VOLVER A LA PESTAÑA SIGUE ENCENDIDO', aMano.encendidoAlVolver.join() === 'tel-leer',
       aMano.encendidoAlVolver.join() || 'ninguno');
  vale('UN A+ A MANO LO APAGA', aMano.trasA.length === 0, aMano.trasA.join() || 'ninguno');
  vale('OTRO PRESET SE ENCIENDE Y NO TOCA EL CONTRASTE',
       aMano.trasPc.join() === 'pc-estudiar' && aMano.contraste === 140,
       aMano.trasPc.join() + ' · contraste ' + aMano.contraste);

  titulo('los ajustes finos se abren suave y CERRAR baja con ellos');
  const finos = await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const cerrarY = () => {
      const b = document.querySelector('#ajustes .cerrar-pie');
      return b ? Math.round(b.getBoundingClientRect().top) : null;
    };
    const caja = document.getElementById('ajustesFinos');
    const antes = cerrarY();
    document.getElementById('btnFinos').click();
    await pausa(30);
    const animando = caja.getAnimations().length > 0;
    const ys = [];
    for (let i = 0; i < 10; i++){ ys.push(cerrarY()); await pausa(60); }
    await pausa(200);
    return { antes, animando, ys, despues: cerrarY(),
             display: getComputedStyle(caja).display,
             expandido: document.getElementById('btnFinos').getAttribute('aria-expanded'),
             guardado: JSON.parse(localStorage.getItem('glossa:ajustes:v1')).finos };
  });
  di('CERRAR mientras se abren', finos);
  vale('SE DESPLIEGAN CON ANIMACIÓN, no de golpe', finos.animando === true);
  vale('CERRAR BAJA', finos.despues > finos.antes + 100, finos.antes + ' → ' + finos.despues);
  /* De a poco: entre el primer cuadro y el último hay pasos intermedios. Un
     salto de golpe saldría con todos los valores en el de antes o el de
     después. */
  vale('  y baja de a poco, no de un salto',
       finos.ys.some(y => y > finos.antes + 5 && y < finos.despues - 5), finos.ys.join(' → '));
  vale('  y quedan abiertos', finos.display === 'grid' && finos.expandido === 'true',
       finos.display + ' · ' + finos.expandido);
  vale('  y se recuerda', finos.guardado === true, finos.guardado);
  await p.reload();
  await p.waitForTimeout(2200);
  const trasRecargar = await p.evaluate(async ([abrirAA]) => {
    await eval('(' + abrirAA + ')')();
    return getComputedStyle(document.getElementById('ajustesFinos')).display;
  }, [ABRIR_AA]);
  vale('  también al recargar', trasRecargar === 'grid', trasRecargar);

  titulo('en transparente el preset va directo a la hoja');
  const cristal = await p.evaluate(async ([tocar]) => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    await eval('(' + tocar + ')')('#btnVidrio');
    await pausa(500);
    const esCristal = document.getElementById('ajustes').classList.contains('cristal');
    await eval('(' + tocar + ')')('[data-preset="pc-leer"]');
    await pausa(600);
    const a = JSON.parse(localStorage.getItem('glossa:ajustes:v1'));
    const res = { esCristal, fontSize: a.fontSize, columns: a.columns, placement: a.placement,
                  encendido: [...document.querySelectorAll('[data-preset].active')].map(b => b.dataset.preset),
                  tablilla: getComputedStyle(document.querySelector('#presetsFormato .pf-grupo')).backgroundColor };
    await eval('(' + tocar + ')')('#btnVidrio');
    await pausa(400);
    return res;
  }, [TOCAR]);
  di('en transparente', cristal);
  vale('(la prueba es válida) el panel se volvió transparente', cristal.esCristal === true);
  vale('EL PRESET LLEGA AL LIBRO SIN CERRAR',
       cristal.fontSize === 18 && cristal.columns === 2 && cristal.placement === 'margin',
       cristal.fontSize + ' · ' + cristal.columns + ' · ' + cristal.placement);
  vale('  y se enciende', cristal.encendido.join() === 'pc-leer', cristal.encendido.join() || 'ninguno');
  vale('  y los rótulos llevan su tablilla para leerse sobre la hoja',
       cristal.tablilla !== 'rgba(0, 0, 0, 0)', cristal.tablilla);

  await cerrar(sesion);
})();
