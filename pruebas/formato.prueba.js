/* FORMATO CON PRESETS.

   La pestaña AA abre con una lista «Para leer» de cuatro presets —Legible,
   Letra grande, Dos columnas, Tres columnas— que ponen de un toque letra,
   tamaño, espaciado, interlínea, columnas y glosa, y pliega los mandos de
   siempre detrás de «Ajustes finos». Fueron primero dos grupos por aparato;
   Gianni los cambió por la lista. Se mira aquí:
     · que un preset ponga TODO lo que dice y vaya directo a la hoja, también
       con el panel opaco —la muestra ya no está a su lado—;
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
    a.interlineado = 1.62; a.contraste = 125; a.brillo = 100; a.fuente = 0; a.espaciado = 0;
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
      encendidoAlNacer: [...document.querySelectorAll('#presetsFormato [data-preset].active')].map(b => b.dataset.preset),
      grupos,
      vidrio: (() => { const b = document.getElementById('btnVidrio'), f = document.getElementById('btnFinos');
                       return { t: b.textContent.trim(), alto: Math.round(b.offsetHeight), ancho: Math.round(b.offsetWidth),
                                altoF: Math.round(f.offsetHeight), anchoF: Math.round(f.offsetWidth),
                                fondo: getComputedStyle(b).backgroundImage === getComputedStyle(f).backgroundImage }; })(),
      muestraEnFinos: !!document.querySelector('#ajustesFinos #filaMuestra'),
      primerosFinos: [...document.querySelectorAll('#ajustesFinos .ajuste .lbl')].slice(0, 4).map(l => l.textContent.trim())
    };
  }, [ABRIR_AA]);
  di('al nacer', nace);
  vale('(la prueba es válida) se abrió la pestaña AA', nace.ok === true);
  vale('UNA LISTA DE CUATRO: Legible, Letra grande, Dos columnas, Tres columnas',
       nace.presets.join(' · ') === 'Legible · Letra grande · Dos columnas · Tres columnas', nace.presets.join(' · '));
  /* Las tuvieron, y Gianni las quitó para que los botones quedaran juntos. */
  vale('  sin explicación debajo, para que queden juntos', nace.dices === 0, nace.dices);
  vale('  bajo un solo rótulo, «Para leer», oscuro y de 13 px o más',
       nace.grupos.length === 1 && /para leer/i.test(nace.grupos[0].t) && nace.grupos.every(g => g.fs >= 13 &&
         /rgb\((\d+), (\d+), (\d+)\)/.test(g.color) &&
         g.color.match(/\d+/g).slice(0, 3).every(n => +n < 110)),
       nace.grupos.map(g => g.t + ' ' + g.fs + 'px ' + g.color).join(' · '));
  vale('EL ORDEN: presets, transparente, ajustes finos —sin la frase de muestra arriba—',
       nace.hijos.join(' ') === 'presetsFormato ajuste btnFinos ajustesFinos', nace.hijos.join(' '));
  vale('  y la muestra vive ahora dentro de los finos', nace.muestraEnFinos === true);
  vale('  y transparente no está dentro de los finos', nace.vidrioDentro === false);
  vale('TRANSPARENTE ES UN BOTÓN COMO «AJUSTES FINOS»: mismo alto, mismo ancho, mismo fondo',
       nace.vidrio.t === 'Transparente' && nace.vidrio.alto === nace.vidrio.altoF &&
       nace.vidrio.ancho === nace.vidrio.anchoF && nace.vidrio.fondo,
       JSON.stringify(nace.vidrio));
  vale('SEPIA, CONTRASTE Y BRILLO, LO PRIMERO DE LOS FINOS',
       nace.primerosFinos.slice(0, 3).join(' ') === 'sepia contraste brillo', nace.primerosFinos.join(' · '));
  /* Lo de fábrica —letra 15 en dos columnas— no es ninguno de los cuatro. */
  vale('LO DE FÁBRICA NO ENCIENDE NINGUNO', nace.encendidoAlNacer.length === 0,
       nace.encendidoAlNacer.join() || 'ninguno');
  vale('LOS FINOS NACEN PLEGADOS', nace.finos === 'none' && nace.expandido === 'false',
       nace.finos + ' · aria-expanded ' + nace.expandido);

  titulo('un preset va directo a la hoja, también con el panel opaco');
  const opaco = await p.evaluate(async ([tocar]) => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const esCristal = document.getElementById('ajustes').classList.contains('cristal');
    await eval('(' + tocar + ')')('[data-preset="legible"]');
    await pausa(400);
    return {
      esCristal,
      encendido: [...document.querySelectorAll('#presetsFormato [data-preset].active')].map(b => b.dataset.preset),
      pulsado: document.querySelector('[data-preset="legible"]').getAttribute('aria-pressed'),
      a: JSON.parse(localStorage.getItem('glossa:ajustes:v1'))
    };
  }, [TOCAR]);
  di('tras «Legible»', opaco);
  const a = opaco.a;
  vale('(la prueba es válida) el panel estaba opaco', opaco.esCristal === false);
  vale('EL PRESET TOCADO SE ENCIENDE', opaco.encendido.join() === 'legible' && opaco.pulsado === 'true',
       opaco.encendido.join() + ' · ' + opaco.pulsado);
  vale('LEGIBLE LLEGA A LA HOJA SIN CERRAR: 22, Lineal, espaciado +5, interlínea normal, una columna, al margen',
       a.fontSize === 22 && a.fuente === 4 && a.espaciado === 5 && a.interlineado === 1.62 &&
       a.columns === 1 && a.placement === 'margin' && a.alineacion === 'left',
       [a.fontSize, a.fuente, a.espaciado, a.interlineado, a.columns, a.placement, a.alineacion].join(' · '));
  vale('  y sube el contraste y baja el brillo',
       a.contraste === 140 && a.brillo === 85, a.contraste + ' · brillo ' + a.brillo);

  titulo('tocar a mano apaga el preset; los otros no tocan la tinta');
  const aMano = await p.evaluate(async ([abrirAA, tocar]) => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    document.querySelector('#ajustes .cerrar-pie').click();
    await pausa(1200);
    await eval('(' + abrirAA + ')')();
    const encendidoAlVolver = [...document.querySelectorAll('[data-preset].active')].map(b => b.dataset.preset);
    /* A+ está dentro de los finos, plegados: se toca igual, que el manejador
       no depende de que se vea. Lo que se mira es el preset. */
    document.getElementById('fsUp').click();
    await pausa(80);
    const trasA = [...document.querySelectorAll('[data-preset].active')].map(b => b.dataset.preset);
    await eval('(' + tocar + ')')('[data-preset="tres"]');
    await pausa(300);
    return { encendidoAlVolver, trasA,
             trasPc: [...document.querySelectorAll('[data-preset].active')].map(b => b.dataset.preset),
             a: JSON.parse(localStorage.getItem('glossa:ajustes:v1')) };
  }, [ABRIR_AA, TOCAR]);
  di('a mano', aMano);
  vale('AL VOLVER A LA PESTAÑA SIGUE ENCENDIDO', aMano.encendidoAlVolver.join() === 'legible',
       aMano.encendidoAlVolver.join() || 'ninguno');
  vale('UN A+ A MANO LO APAGA', aMano.trasA.length === 0, aMano.trasA.join() || 'ninguno');
  vale('OTRO PRESET SE ENCIENDE Y NO TOCA NI EL CONTRASTE NI EL BRILLO',
       aMano.trasPc.join() === 'tres' && aMano.a.contraste === 140 && aMano.a.brillo === 85,
       aMano.trasPc.join() + ' · contraste ' + aMano.a.contraste + ' · brillo ' + aMano.a.brillo);
  vale('  y pone lo suyo: 16 en tres columnas, romana, sin espaciado',
       aMano.a.fontSize === 16 && aMano.a.columns === 3 && aMano.a.fuente === 0 && aMano.a.espaciado === 0,
       [aMano.a.fontSize, aMano.a.columns, aMano.a.fuente, aMano.a.espaciado].join(' · '));

  /* LAS BOLITAS AL CAMBIAR DE PRESET. Poner uno repagina el libro entero,
     y Gianni notó que tarda: pidió el aviso de espera. Se toca SOLO con el
     click, sin pointerdown, que es lo que llega de un teléfono cuando el
     navegador se come el resto —el aviso no puede depender de él—. Y se mira
     en el cuadro siguiente: que las bolitas estén puestas cuando el
     navegador pinta, que es lo único que el lector ve. */
  titulo('al cambiar de preset salen las bolitas, y se van');
  const espera = await p.evaluate(async () => {
    const bu = document.getElementById('buscando');
    document.querySelector('[data-preset="dos"]').click();
    const enElCuadro = await new Promise(z => requestAnimationFrame(() => z(bu.classList.contains('viva'))));
    const bolitas = bu.querySelectorAll('.bolitas i').length;
    await new Promise(z => setTimeout(z, 1200));
    return { enElCuadro, bolitas, despues: bu.classList.contains('viva'),
             cols: JSON.parse(localStorage.getItem('glossa:ajustes:v1')).columns };
  });
  di('la espera', espera);
  vale('LAS BOLITAS SE PINTAN ANTES DE REPAGINAR', espera.enElCuadro === true && espera.bolitas === 8,
       JSON.stringify(espera));
  vale('  y se van cuando el preset ya está puesto', espera.despues === false && espera.cols === 2,
       JSON.stringify(espera));

  /* LETRA GRANDE LLEVA LA LUZ DE LEGIBLE, que Gianni se la pidió igual. Se
     devuelven antes los dos rieles a mano —con su evento de input, como un
     dedo— para que el 140 y el 85 que se lean sean suyos y no lo que dejó
     Legible. */
  titulo('Letra grande trae la misma luz que Legible');
  const grande = await p.evaluate(async ([tocar]) => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    for (const [id, v] of [['contraste', '110'], ['brillo', '100']]){
      const r = document.getElementById(id);
      r.value = v; r.dispatchEvent(new Event('input', { bubbles:true }));
    }
    await pausa(120);
    const antes = JSON.parse(localStorage.getItem('glossa:ajustes:v1'));
    await eval('(' + tocar + ')')('[data-preset="grande"]');
    await pausa(400);
    return { antes: [antes.contraste, antes.brillo],
             a: JSON.parse(localStorage.getItem('glossa:ajustes:v1')),
             encendido: [...document.querySelectorAll('[data-preset].active')].map(b => b.dataset.preset) };
  }, [TOCAR]);
  di('tras «Letra grande»', grande);
  vale('(la prueba es válida) los rieles quedaron en otra parte', grande.antes.join() === '110,100',
       grande.antes.join());
  vale('LETRA GRANDE: 24 en una columna, contraste 140 y brillo 85, y se enciende',
       grande.a.fontSize === 24 && grande.a.columns === 1 && grande.a.contraste === 140 &&
       grande.a.brillo === 85 && grande.encendido.join() === 'grande',
       [grande.a.fontSize, grande.a.columns, grande.a.contraste, grande.a.brillo, grande.encendido.join()].join(' · '));

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

  titulo('en transparente también, y el botón se enciende');
  const cristal = await p.evaluate(async ([tocar]) => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    await eval('(' + tocar + ')')('#btnVidrio');
    await pausa(500);
    const esCristal = document.getElementById('ajustes').classList.contains('cristal');
    await eval('(' + tocar + ')')('[data-preset="dos"]');
    await pausa(600);
    const a = JSON.parse(localStorage.getItem('glossa:ajustes:v1'));
    const res = { esCristal, fontSize: a.fontSize, columns: a.columns, placement: a.placement,
                  encendido: [...document.querySelectorAll('[data-preset].active')].map(b => b.dataset.preset),
                  tablilla: getComputedStyle(document.querySelector('#presetsFormato .pf-grupo')).backgroundColor,
                  /* Los botones y desplegables que se ven, con fondo de
                     color y no de degradado, y que dejan pasar la hoja. */
                  colados: [...document.querySelectorAll('#ajustes button, #ajustes select')]
                    .filter(e => e.offsetParent && !e.classList.contains('obrando') &&
                                 getComputedStyle(e).backgroundImage === 'none')
                    .filter(e => { const m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(getComputedStyle(e).backgroundColor);
                                   return m && +m[1] < 1; })
                    .map(e => (e.id || e.className.split(' ')[0] || e.tagName) + ' ' + getComputedStyle(e).backgroundColor),
                  vidrioOn: document.getElementById('btnVidrio').classList.contains('active') &&
                            document.getElementById('btnVidrio').getAttribute('aria-pressed') === 'true' };
    /* EL DESTELLO DE «TE OÍ», CONGELADO EN SUS PUNTAS. Se apoya el dedo sin
       soltarlo —sólo pointerdown: así el botón destella y no se pone nada—,
       y se para la animación en cada punto clave para leer el fondo. Es el
       momento en que Gianni veía la hoja a través del botón. */
    const opacoAl = [];
    for (const sel of ['[data-preset="tres"]', '#btnFinos']){
      const b = document.querySelector(sel), r = b.getBoundingClientRect();
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true, pointerId:733,
        pointerType:'touch', isPrimary:true, clientX:r.left + r.width / 2 + 3, clientY:r.top + r.height / 2 - 2 }));
      await pausa(30);
      const an = b.getAnimations().find(x => /obrando/.test(x.animationName || ''));
      if (!an){ opacoAl.push(sel + ' sin destello'); continue; }
      an.pause();
      for (const t of [0, .38, .62]){
        an.currentTime = t * 900;
        const c = getComputedStyle(b).backgroundColor, m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(c);
        if (m && +m[1] < 1) opacoAl.push(sel + ' @' + t + ' ' + c);
      }
      an.play();
      b.dispatchEvent(new PointerEvent('pointercancel', { bubbles:true, pointerId:733, pointerType:'touch' }));
    }
    res.destello = opacoAl;
    await eval('(' + tocar + ')')('#btnVidrio');
    await pausa(400);
    return res;
  }, [TOCAR]);
  di('en transparente', cristal);
  vale('(la prueba es válida) el panel se volvió transparente', cristal.esCristal === true);
  vale('EL PRESET LLEGA AL LIBRO SIN CERRAR',
       cristal.fontSize === 18 && cristal.columns === 2 && cristal.placement === 'margin',
       cristal.fontSize + ' · ' + cristal.columns + ' · ' + cristal.placement);
  vale('  y se enciende', cristal.encendido.join() === 'dos', cristal.encendido.join() || 'ninguno');
  vale('  y «Transparente» sale encendido mientras lo está', cristal.vidrioOn === true);
  /* Lo transparente es el papel del panel, no los botones: con fondo al 75%
     la letra de la hoja se les colaba por dentro. Lo pidió Gianni. */
  vale('  y AL TOCARLOS TAMPOCO: el destello de «te oí» va macizo',
       cristal.destello.length === 0, cristal.destello.join(' · ') || 'macizo');
  vale('  y LOS BOTONES NO SE VUELVEN DE CRISTAL: ninguno deja pasar la hoja',
       cristal.colados.length === 0, cristal.colados.join(' · ') || 'ninguno');
  vale('  y los rótulos llevan su tablilla para leerse sobre la hoja',
       cristal.tablilla !== 'rgba(0, 0, 0, 0)', cristal.tablilla);

  /* LA RAYA A MEDIA HOJA. El canto del papel (.rollo::before y ::after) iba
     pegado a bottom:0, y en un panel que se desplaza eso es el fondo de la
     primera pantalla: con los finos abiertos Formato ya no cabe, y la rayita
     de luz quedaba cruzando la fila de ESPACIADO. Se mira en píxeles, en la
     tira del relleno de la derecha, donde no hay más que papel: el degradado
     del fondo es suave, así que entre dos renglones vecinos no puede haber un
     salto de luz. El pie (CERRAR) y la sombra de dentro del canto se dejan
     fuera; con eso, cualquier raya que quede en la tira es la del canto. */
  titulo('con los finos abiertos no cruza ninguna raya el panel');
  const tira = await p.evaluate(async ([abrirAA]) => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    await eval('(' + abrirAA + ')')();
    if (document.getElementById('btnFinos').getAttribute('aria-expanded') !== 'true'){
      document.getElementById('btnFinos').click();
      await pausa(900);
    }
    const aj = document.getElementById('ajustes');
    aj.scrollTop = Math.min(aj.scrollHeight - aj.clientHeight, Math.round(aj.clientHeight / 2));
    await pausa(300);
    const r = aj.getBoundingClientRect();
    const pie = aj.querySelector('.pie-cerrar').getBoundingClientRect();
    return { desborda: aj.scrollHeight - aj.clientHeight,
             costura: Math.round(r.top + aj.clientHeight - aj.scrollTop),
             x: Math.round(r.right - 7), y0: Math.round(r.top + 60), y1: Math.round(pie.top - 12) };
  }, [ABRIR_AA]);
  di('la tira', tira);
  vale('(la prueba es válida) el panel se desplaza y la costura cae dentro de la tira',
       tira.desborda > 0 && tira.costura > tira.y0 + 4 && tira.costura < tira.y1 - 4,
       JSON.stringify(tira));
  const png = await p.screenshot({ clip: { x: tira.x, y: tira.y0, width: 4, height: tira.y1 - tira.y0 } });
  const salto = await p.evaluate(async (d) => {
    const img = new Image();
    await new Promise(z => { img.onload = z; img.src = 'data:image/png;base64,' + d; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const px = cx.getImageData(1, 0, 1, img.height).data;
    const luz = i => .2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2];
    let peor = 0, donde = -1;
    for (let y = 1; y < img.height; y++){
      const d2 = Math.abs(luz(y * 4) - luz((y - 1) * 4));
      if (d2 > peor){ peor = d2; donde = y; }
    }
    return { peor: Math.round(peor * 10) / 10, donde };
  }, png.toString('base64'));
  di('el salto de luz más grande', salto);
  vale('NINGUNA RAYA CRUZA EL PANEL: el papel no salta de luz entre dos renglones',
       salto.peor < 6, salto.peor + ' en el renglón ' + salto.donde);

  await cerrar(sesion);
})();
