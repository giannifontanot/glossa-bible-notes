/* EL PANEL DE LA MARCA.

   Toda marca es una glosa: los dos botones no eligen qué clase de cosa
   estás haciendo, sino cómo se dibuja el texto al que la nota se agarra
   —resaltado o subrayado—. De ahí las dos reglas que se prueban aquí y que
   son casi todo el comportamiento:

   · sin texto no se guarda NADA. Subrayar por accidente y tocar fuera tiene
     que dejar la hoja exactamente como estaba.
   · vaciar una glosa que tenía nota es borrarla, y eso avisa para poder
     deshacerlo.

   Y una tercera que no se ve pero se rompe sola: poner una etiqueta NO puede
   repintar el panel, porque el panel lleva dentro la caja de escribir y
   repintarlo se llevaría por delante el foco, el cursor y lo escrito. */
const { abrir, listo, cerrar, cerrarParcial, conGlosas, di, vale, titulo,
        APP, TELEFONO } = require('./comun');

/* Abrir el panel sobre las primeras letras de un versículo, como lo abre un
   dedo: se selecciona y se suelta encima. */
const ABRIR = `async (desde = 0, hasta = 15) => {
  const v = document.querySelector('#pgBody .v');
  const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
  while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
  if (!n) return null;
  const r = document.createRange(); r.setStart(n,desde); r.setEnd(n,hasta);
  getSelection().removeAllRanges(); getSelection().addRange(r);
  const rc = r.getBoundingClientRect();
  document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
  await new Promise(z => setTimeout(z, 400));
  return true;
}`;
/* Tocar fuera: el gesto que cobra lo escrito y cierra. */
const FUERA = `async () => {
  document.body.dispatchEvent(new PointerEvent('pointerdown',
    { bubbles:true, clientX:5, clientY:5 }));
  await new Promise(z => setTimeout(z, 400));
}`;
/* Tocar una marca que YA existe: sin selección y en mitad de sus letras. Es
   el otro camino que abre el panel, y el único que llega a una marca sin nota
   —que no pinta nada en el margen y por eso no se puede abrir con dos clics. */
const TOCAR = `async (desde, hasta) => {
  const v = document.querySelector('#pgBody .v');
  const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
  while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
  if (!n) return false;
  const r = document.createRange(); r.setStart(n,desde); r.setEnd(n,hasta);
  const rc = r.getBoundingClientRect();
  getSelection().removeAllRanges();
  document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
    { bubbles:true, clientX:Math.round(rc.left + rc.width/2),
      clientY:Math.round(rc.top + rc.height/2) }));
  await new Promise(z => setTimeout(z, 400));
  return true;
}`;
const guardadas = () => {
  try { return JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]'); }
  catch(e){ return []; }
};

/* CUBRE LO SELECCIONADO Y CIERRA EN PALABRA.

   Ya no se compara la cita con lo seleccionado letra por letra: la marca se
   estira a la palabra entera —ver aPalabrasEnteras—, así que pedir «Ram fue el
   padre d» deja «Ram fue el padre de», y eso es lo correcto, no un fallo.

   Lo que se exige es lo que de verdad importa y no se cumple solo:
   · que lo seleccionado esté DENTRO de lo que quedó marcado —si el estirón se
     descolocara un carácter, esto se cae—;
   · y que los dos extremos caigan en borde de palabra, que es el encargo.
   Comprobar sólo «contiene» dejaría pasar una marca que se comiera el
   versículo entero. */
const cubreYCierraEnPalabra = (m, pedido, verso) => {
  if (!m || typeof verso !== 'string') return false;
  const dentro = /[\p{L}\p{N}]/u;
  const antes   = m.ini > 0 ? verso[m.ini - 1] : ' ';
  const despues = m.fin < verso.length ? verso[m.fin] : ' ';
  return (m.cita || '').includes((pedido || '').trim()) &&
         !dentro.test(antes) && !dentro.test(despues);
};

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;

  /* ================================================================
     LA SELECCIÓN QUE LLEGA TARDE, que es como llega en el teléfono.

     En escritorio la selección ya existe cuando se suelta el ratón, y el
     gesto la lee ahí mismo. En Android no: el sistema termina de armarla
     DESPUÉS del pointerup —es cuando salen los tiradores— así que al
     preguntar no hay nada y el gesto se va de vacío. El lector hace entonces
     lo natural, tocar lo que acaba de seleccionar para confirmarlo, y ese
     toque la deshace antes de que nadie la lea.

     Medido con el código anterior: seleccionabas, tocabas, se abría una caja
     —la de otra glosa, o ninguna— y lo seleccionado no se guardaba nunca.

     Se prueba en ese orden exacto, con el pointerup ANTES de la selección,
     porque el orden es el fallo. */
  titulo('seleccionar en el teléfono: la selección llega tras soltar');
  const tarde = await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const lee = () => { try { return JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]'); }
                        catch(e){ return []; } };
    const base = lee().length;
    const v = document.querySelectorAll('#pgBody .v')[3];
    const t = [...v.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim().length > 25);
    if (!t) return { error:'sin versículo largo' };
    const rg = document.createRange(); rg.setStart(t, 2); rg.setEnd(t, 18);
    const c = rg.getBoundingClientRect();
    const x0 = c.left + 2, x1 = c.right - 2, y = c.top + c.height/2, mx = (x0 + x1)/2;
    const op = (id, x) => ({ bubbles:true, pointerId:id, pointerType:'touch',
                             isPrimary:true, clientX:x, clientY:y });
    /* El arrastre suelta SIN selección todavía. */
    v.dispatchEvent(new PointerEvent('pointerdown', op(70, x0)));
    v.dispatchEvent(new PointerEvent('pointermove', op(70, x1)));
    v.dispatchEvent(new PointerEvent('pointerup',   op(70, x1)));
    await pausa(150);
    /* Y ahora sí la pone el sistema. */
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
    const texto = sel.toString();
    await pausa(300);
    const trasSoltar = { panel: getComputedStyle(document.getElementById('menu')).display,
                         guardadas: lee().length };
    /* El toque de confirmar, encima de lo seleccionado. Y LA SELECCIÓN SE
       DESHACE EN MEDIO, entre el pointerdown y el pointerup, que es lo que
       hace el navegador de verdad y lo que rompía el guardado. Un
       PointerEvent despachado a mano no trae la acción por defecto que la
       deshace, así que sin esta línea la selección seguiría puesta al
       preguntar: el programa tomaría el camino de siempre —el del
       arrastre— y esta prueba pasaría en verde aunque el arreglo no
       existiera. */
    const el = document.elementFromPoint(mx, y);
    el.dispatchEvent(new PointerEvent('pointerdown', op(71, mx)));
    await pausa(30);
    getSelection().removeAllRanges();
    await pausa(60);
    const deshecha = getSelection().toString();
    el.dispatchEvent(new PointerEvent('pointerup', op(71, mx)));
    await pausa(450);
    const caja = document.getElementById('glosaCaja');
    const abrio = !!caja;
    if (caja){
      caja.value = 'lo que seleccioné';
      caja.dispatchEvent(new Event('input', { bubbles:true }));
      await pausa(200);
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      await pausa(700);
    }
    const puesta = lee().find(m => (m.nota||'') === 'lo que seleccioné') || null;
    return { base, texto, deshecha, trasSoltar, abrio, puesta, verso: t.nodeValue,
             guardadas: lee().length };
  });
  di('lo seleccionado', tarde.texto);
  di('la glosa que quedó', tarde.puesta && tarde.puesta.cita);
  vale('y al tocar ya no había selección', tarde.deshecha === '',
       '«' + tarde.deshecha + '»');
  vale('el toque abre la caja', tarde.abrio);
  vale('y lo escrito se guarda', tarde.guardadas === tarde.base + 1,
       tarde.base + ' → ' + tarde.guardadas);
  vale('SOBRE LO QUE SE HABÍA SELECCIONADO, y cerrando en palabra',
       cubreYCierraEnPalabra(tarde.puesta, tarde.texto, tarde.verso),
       (tarde.puesta && tarde.puesta.cita) + '  contra lo pedido  ' + tarde.texto);

  /* ================================================================
     EL TOQUE QUE NO TRAE POINTERDOWN, que es el del teléfono de verdad.

     Cuando tocas encima de lo que acabas de seleccionar, el toque se lo queda
     la capa de la selección —los tiradores, el menú de copiar—: el
     pointerdown no llega a la hoja, y a la hoja solo le consta que la
     selección se deshizo y que hubo un soltar. Todo arreglo que se apoye en
     ver bajar el dedo se cae justo aquí, y no se nota en las pruebas porque
     un PointerEvent despachado a mano SIEMPRE llega.

     Así que este bloque manda el soltar A SOLAS, sin pointerdown ninguno.
     Es la prueba que le faltaba al arreglo: si mañana el olvido vuelve a
     colgarse de ver el gesto entero, esto se pone rojo. */
  titulo('en el teléfono el toque llega sin pointerdown, y aun así guarda');
  const sinBajada = await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const lee = () => { try { return JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]'); }
                        catch(e){ return []; } };
    const base = lee().length;
    const v = document.querySelectorAll('#pgBody .v')[2];
    const t = [...v.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim().length > 25);
    if (!t) return { error:'sin versículo largo' };
    const rg = document.createRange(); rg.setStart(t, 3); rg.setEnd(t, 19);
    const c = rg.getBoundingClientRect();
    const mx = Math.round(c.left + c.width/2), my = Math.round(c.top + c.height/2);
    /* La selección aparece tarde, como en Android. */
    getSelection().removeAllRanges(); getSelection().addRange(rg);
    const texto = getSelection().toString();
    await pausa(300);
    /* Y ahora el toque de confirmar: la selección se deshace y SOLO llega el
       soltar. Ni un pointerdown. */
    getSelection().removeAllRanges();
    await pausa(60);
    const el = document.elementFromPoint(mx, my) || v;
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:90,
      pointerType:'touch', isPrimary:true, clientX:mx, clientY:my }));
    await pausa(450);
    const caja = document.getElementById('glosaCaja');
    const abrio = !!caja;
    if (caja){
      caja.value = 'sin bajada';
      caja.dispatchEvent(new Event('input', { bubbles:true }));
      await pausa(200);
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      await pausa(700);
    }
    const puesta = lee().find(m => (m.nota||'') === 'sin bajada') || null;
    return { base, texto, abrio, puesta, verso: t.nodeValue, guardadas: lee().length };
  });
  di('lo seleccionado', sinBajada.texto);
  vale('el soltar a solas abre la caja', sinBajada.abrio);
  vale('y guarda lo que se había seleccionado, cerrando en palabra',
       cubreYCierraEnPalabra(sinBajada.puesta, sinBajada.texto, sinBajada.verso),
       (sinBajada.puesta && sinBajada.puesta.cita) + '  contra lo pedido  ' + sinBajada.texto);

  titulo('y un toque lejos de lo seleccionado no inventa nada');
  /* La otra mitad: la selección recordada solo vale para el toque que cae
     ENCIMA de ella. Tocar en otro sitio sigue queriendo decir lo de siempre. */
  const lejos = await p.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const lee = () => { try { return JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]'); }
                        catch(e){ return []; } };
    const base = lee().length;
    const v = document.querySelectorAll('#pgBody .v')[5];
    const t = [...v.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim().length > 25);
    const rg = document.createRange(); rg.setStart(t, 2); rg.setEnd(t, 16);
    const c = rg.getBoundingClientRect();
    const op = (id, x, y) => ({ bubbles:true, pointerId:id, pointerType:'touch',
                                isPrimary:true, clientX:x, clientY:y });
    v.dispatchEvent(new PointerEvent('pointerup', op(80, c.right, c.top + c.height/2)));
    await pausa(120);
    getSelection().removeAllRanges(); getSelection().addRange(rg);
    await pausa(300);
    /* Un toque muy por debajo: otro versículo, lejos de lo marcado. Y la
       selección se deshace en medio, como la deshace el navegador: sin eso
       el programa vería una selección viva y estaría probándose el camino
       del arrastre, que no es el de aquí. */
    const otro = document.querySelectorAll('#pgBody .v')[9] ||
                 document.querySelectorAll('#pgBody .v')[7];
    const r2 = otro.getBoundingClientRect();
    const x = Math.round(r2.left + r2.width/2), y = Math.round(r2.top + r2.height/2);
    const el = document.elementFromPoint(x, y) || otro;
    el.dispatchEvent(new PointerEvent('pointerdown', op(81, x, y)));
    await pausa(30);
    getSelection().removeAllRanges();
    await pausa(60);
    el.dispatchEvent(new PointerEvent('pointerup', op(81, x, y)));
    await pausa(450);
    const caja = document.getElementById('glosaCaja');
    if (caja) document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await pausa(500);
    const trasElLejano = lee().length;
    /* Y AHORA LA VUELTA: tocar OTRA VEZ, ya encima de lo que se había
       seleccionado. El toque de antes fue una cancelación —el lector tocó en
       otro sitio—, así que lo apuntado tiene que estar olvidado. Si
       sobreviviera, este segundo toque abriría una glosa sobre unas palabras
       que hace rato dejaron de estar seleccionadas: una marca que nadie
       pidió. */
    const c2 = rg.getBoundingClientRect();
    const vx = Math.round(c2.left + c2.width/2), vy = Math.round(c2.top + c2.height/2);
    const el2 = document.elementFromPoint(vx, vy) || v;
    el2.dispatchEvent(new PointerEvent('pointerdown', op(82, vx, vy)));
    await pausa(30);
    el2.dispatchEvent(new PointerEvent('pointerup', op(82, vx, vy)));
    await pausa(450);
    const caja2 = document.getElementById('glosaCaja');
    const abrioCaja = !!caja2;
    if (caja2) document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    await pausa(500);
    return { base, trasElLejano, abrioCaja, guardadas: lee().length };
  });
  vale('no se guarda ninguna glosa nueva', lejos.trasElLejano === lejos.base,
       lejos.base + ' → ' + lejos.trasElLejano);
  vale('y volver a tocarla ya no la resucita', !lejos.abrioCaja &&
       lejos.guardadas === lejos.base, lejos.base + ' → ' + lejos.guardadas +
       (lejos.abrioCaja ? '  (¡abrió la caja!)' : ''));

  /* La otra manera de cancelar: el TECLADO. Se deshace una selección sin que
     baje ningún dedo —una flecha, Escape, ponerse a escribir— y ahí el olvido
     por gesto no llega. Sin esto, hacer clic más tarde donde estuvo la
     selección sacaba una glosa sobre unas palabras que ya nadie tenía
     marcadas. Lo levantó la revisión de Codex.

     VA EN SU PROPIA PESTAÑA, y no por gusto: escrito sobre la página que
     traen los bloques de arriba pasaba en verde INCLUSO CON EL FALLO PUESTO
     —el estado acumulado se comía el gesto— mientras que en una página
     limpia el fallo salía a la primera. Una prueba que no puede ver el fallo
     que vigila no vigila nada. */
  /* ================================================================
     LA MARCA SE ESTIRA A LA PALABRA ENTERA.

     Nadie quiere subrayar «adre» de «padre». Y no es sólo pulcritud: con el
     dedo la precisión de un extremo es de milímetros, y en los bordes de la
     hoja ni eso —el canto de pasar hoja son 30px con touch-action:none encima
     del texto—. Estirando a la palabra, alcanzar cualquier letra basta.

     Los tres casos que hay que separar, porque cada uno se rompe por su lado:
     media palabra estira; una palabra ya entera se deja igual; y un espacio de
     cola se RECORTA en vez de arrastrar la palabra de al lado, que es el
     defecto fácil de este arreglo.
     ================================================================ */
  titulo('la marca se estira a la palabra entera');
  {
    const p4 = await sesion.navegador.newPage({ ...TELEFONO });
    const fallos4 = [];
    p4.on('pageerror', e => fallos4.push(String(e).split('\n')[0]));
    await p4.goto(APP);
    await listo(p4);

    const marcar = (desde, hasta, nota) => p4.evaluate(async ([d, h, nota]) => {
      const pausa = ms => new Promise(z => setTimeout(z, ms));
      let v = null, t = null;
      for (const cand of document.querySelectorAll('#pgBody .v')){
        const n = [...cand.childNodes].find(x => x.nodeType === 3 && x.nodeValue.trim().length > 60);
        if (n){ v = cand; t = n; break; }
      }
      if (!t) return { error:'sin versículo largo' };
      const rg = document.createRange(); rg.setStart(t, d); rg.setEnd(t, h);
      getSelection().removeAllRanges(); getSelection().addRange(rg);
      const pedido = rg.toString();
      const rc = rg.getBoundingClientRect();
      document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
        { bubbles:true, clientX:Math.round(rc.left+2), clientY:Math.round(rc.top+2) }));
      await pausa(500);
      const ta = document.getElementById('glosaCaja');
      if (!ta) return { error:'no abrió la caja', pedido };
      ta.value = nota; ta.dispatchEvent(new Event('input', { bubbles:true }));
      await pausa(200);
      /* tocar fuera de verdad, que es como se cobra lo escrito */
      document.body.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles:true, clientX:5, clientY:5 }));
      await pausa(1000);
      const m = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
                  .find(x => x.nota === nota) || null;
      return { pedido, verso: t.nodeValue, cita: m && m.cita, ini: m && m.ini, fin: m && m.fin };
    }, [desde, hasta, nota]);

    /* Los sitios se buscan EN EL TEXTO DE VERDAD, no con números a ojo: un
       índice escrito a mano se descuadra en cuanto cambia una coma, y la
       prueba pasaría midiendo otra cosa. */
    const sitios = await p4.evaluate(() => {
      let t = null;
      for (const cand of document.querySelectorAll('#pgBody .v')){
        const n = [...cand.childNodes].find(x => x.nodeType === 3 && x.nodeValue.trim().length > 60);
        if (n){ t = n; break; }
      }
      const txt = t.nodeValue;
      const entera = /[\p{L}\p{N}]{3,}/u.exec(txt.slice(10));
      const par = /([\p{L}\p{N}]{4,})(\s+)([\p{L}\p{N}]+)/u.exec(txt);
      return {
        entera: { ini: 10 + entera.index, fin: 10 + entera.index + entera[0].length,
                  palabra: entera[0] },
        par: { ini: par.index + 2, fin: par.index + par[1].length + par[2].length,
               primera: par[1], siguiente: par[3] }
      };
    });

    const bordes = r => {
      if (!r || r.cita == null) return false;
      const dentro = /[\p{L}\p{N}]/u;
      const antes   = r.ini > 0 ? r.verso[r.ini - 1] : ' ';
      const despues = r.fin < r.verso.length ? r.verso[r.fin] : ' ';
      return !dentro.test(antes) && !dentro.test(despues);
    };

    const media = await marcar(4, 12, 'media palabra');
    di('media palabra', JSON.stringify(media.pedido) + ' → ' + JSON.stringify(media.cita));
    vale('lo pedido queda dentro de lo marcado',
         !!media.cita && media.cita.includes((media.pedido || '').trim()),
         media.error || (media.pedido + ' → ' + media.cita));
    vale('y los dos extremos caen en borde de palabra', bordes(media),
         'ini ' + media.ini + ' fin ' + media.fin);

    const justa = await marcar(sitios.entera.ini, sitios.entera.fin, 'palabra justa');
    di('palabra ya entera', JSON.stringify(justa.pedido) + ' → ' + JSON.stringify(justa.cita));
    /* Si esto se rompiera, el estirón estaría comiéndose a los vecinos: una
       palabra que ya está entera no tiene nada que estirar. */
    vale('una palabra ya entera se deja igual', justa.cita === justa.pedido,
         justa.pedido + '  →  ' + justa.cita);

    const cola = await marcar(sitios.par.ini, sitios.par.fin, 'con espacio de cola');
    di('con espacio de cola', JSON.stringify(cola.pedido) + ' → ' + JSON.stringify(cola.cita));
    vale('el espacio de cola se recorta y la palabra se completa',
         cola.cita === sitios.par.primera, cola.cita + '  esperado  ' + sitios.par.primera);
    /* LA QUE VIGILA EL DEFECTO FÁCIL: estirar sin recortar primero se lleva la
       palabra de al lado entera. */
    vale('y NO se lleva la palabra siguiente',
         !!cola.cita && !cola.cita.includes(sitios.par.siguiente),
         cola.cita + '  no debe traer  ' + sitios.par.siguiente);
    vale('  sin errores (palabra entera)', fallos4.length === 0,
         fallos4.length ? fallos4 : 'ninguno');
    await p4.close();
  }

  titulo('cancelar con una tecla también lo olvida');
  {
    const p3 = await sesion.navegador.newPage({ ...TELEFONO });
    const fallos3 = [];
    p3.on('pageerror', e => fallos3.push(String(e).split('\n')[0]));
    await p3.goto(APP);
    await listo(p3);
    const conTecla = await p3.evaluate(async () => {
      const pausa = ms => new Promise(z => setTimeout(z, ms));
      const lee = () => { try { return JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]'); }
                          catch(e){ return []; } };
      const base = lee().length;
      const vs = [...document.querySelectorAll('#pgBody .v')];
      let v = null, t = null;
      for (const cand of vs){
        const n = [...cand.childNodes].find(x => x.nodeType === 3 && x.nodeValue.trim().length > 25);
        if (n){ v = cand; t = n; break; }
      }
      if (!t) return { error:'sin versículo largo' };
      const rg = document.createRange(); rg.setStart(t, 2); rg.setEnd(t, 17);
      getSelection().removeAllRanges(); getSelection().addRange(rg);
      await pausa(300);
      const seleccionado = getSelection().toString();
      const c = rg.getBoundingClientRect();
      const mx = Math.round(c.left + c.width/2), my = Math.round(c.top + c.height/2);
      const el = document.elementFromPoint(mx, my) || v;
      const enLaHoja = !!(el && el.closest('#pgBody'));
      /* Una flecha: la selección se va, y no baja ningún dedo. */
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true }));
      getSelection().removeAllRanges();
      await pausa(200);
      /* Y ahora el clic donde estuvo. Cae DENTRO de lo que se había apuntado. */
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerId:95,
        pointerType:'mouse', isPrimary:true, clientX:mx, clientY:my }));
      await pausa(30);
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:95,
        pointerType:'mouse', isPrimary:true, clientX:mx, clientY:my }));
      await pausa(500);
      const caja = document.getElementById('glosaCaja');
      const abrio = !!caja;
      if (caja) document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      await pausa(600);
      return { base, seleccionado, enLaHoja, abrio, guardadas: lee().length };
    });
    di('lo que se llegó a seleccionar', conTecla.seleccionado);
    vale('el montaje selecciona y el clic cae en la hoja',
         !conTecla.error && (conTecla.seleccionado || '').trim().length > 3 &&
         conTecla.enLaHoja === true,
         conTecla.error || '«' + conTecla.seleccionado + '»');
    vale('el clic de después no abre nada', conTecla.abrio === false, conTecla.abrio);
    vale('  y no se guarda ninguna glosa', conTecla.guardadas === conTecla.base,
         conTecla.base + ' → ' + conTecla.guardadas);
    vale('  sin errores (tecla)', fallos3.length === 0, fallos3.length ? fallos3 : 'ninguno');
    await p3.close();
  }

  titulo('el panel al nacer');
  const base = await p.evaluate(
    () => JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length);
  di('glosas de bienvenida', base);
  di('medida', await p.evaluate(async ([abrir, base]) => {
    await eval('(' + abrir + ')')();
    const m = document.getElementById('menu');
    const modos = [...m.querySelectorAll('.mmodos button[data-modo]')];
    const ok = m.querySelector('.mmodos [data-acc="ok"]');
    const tags = m.querySelector('.tagbox');
    /* LOS TRES A TERCIOS EXACTOS, y se miden porque con 1fr a secas no salen:
       1fr es minmax(auto,1fr), o sea que la columna no baja de su contenido y
       la de la palabra larga se come a las otras —88 contra 68, medido—.

       Hubo una versión con «1fr 1fr auto», con el OK midiendo lo que mide su
       palabra: los dos trazos a medias y el tercero más chico. Se cambió
       mirándolo puesto —tres botones en fila y uno más pequeño se lee como que
       ese vale menos, y es la salida—. Ahora lo que distingue al OK es el
       color, igual que a los trazos entre sí. */
    const anchos = modos.map(b => Math.round(b.getBoundingClientRect().width));
    const fila = m.querySelector('.mmodos');
    return {
      salio: getComputedStyle(m).display !== 'none',
      colores: m.querySelectorAll('.mc').length,
      modos: modos.map(b => b.dataset.modo),
      encendido: modos.filter(b => b.classList.contains('on')).map(b => b.dataset.modo),
      hayOk: !!ok,
      anchos,
      anchoOk: ok ? Math.round(ok.getBoundingClientRect().width) : 0,
      altos: [...m.querySelectorAll('.mmodos button')]
               .map(b => Math.round(b.getBoundingClientRect().height)),
      hueco: fila ? parseFloat(getComputedStyle(fila).gap) : -1,
      /* SIN TEXTO EL OK SIGUE ACTIVO. Apagarlo sería mentir: sin texto,
         terminar es lo que borra la glosa, y ése es un camino que existe. */
      okApagado: ok ? (ok.disabled === true ||
                       ok.classList.contains('off') ||
                       getComputedStyle(ok).pointerEvents === 'none') : null,
      /* El OK es macizo y los trazos van de contorno: se distinguen a un metro
         sin leerlos, que es de lo que sirve un botón de terminar. */
      okMacizo: ok ? getComputedStyle(ok).backgroundColor : '',
      modoMacizo: modos[0] ? getComputedStyle(modos[0]).backgroundColor : '',
      /* Lo que el botón PROMETE. Sobre una marca nueva y sin texto no se
         guarda nada, y decir «guardar» ahí es lo que oía quien no ve la
         pantalla. */
      rotuloOk: ok ? ok.getAttribute('aria-label') : '',
      hayCaja: !!m.querySelector('#glosaCaja'),
      cajaVacia: (m.querySelector('#glosaCaja')||{}).value === '',
      tagsDormidas: !!tags && tags.classList.contains('dormida'),
      /* nada tocó el almacén todavía: las de la bienvenida y ni una más */
      crecio: JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length - base
    };
  }, [ABRIR, base]).then(r => {
    vale('el panel salió', r.salio);
    vale('con los cuatro colores', r.colores === 4);
    vale('y dos trazos, no tres', r.modos.length === 2, r.modos.join(' | '));
    vale('resaltado viene puesto', r.encendido.join() === 'fill', r.encendido);
    /* ---- el OK, que es la ayuda visual de que aquí se termina ---- */
    vale('el OK está en la fila', r.hayOk === true);
    vale('los dos trazos siguen midiendo lo mismo',
         r.anchos.length === 2 && Math.abs(r.anchos[0] - r.anchos[1]) <= 1, r.anchos);
    /* Y EL OK MIDE LO MISMO QUE ELLOS. Antes medía lo justo de su palabra y
       era el más chico de los tres; puesto en pantalla, eso se leía como que
       la salida valía menos que los dos modos. */
    vale('Y EL OK MIDE LO MISMO: los tres a tercios',
         r.anchoOk > 0 && Math.abs(r.anchoOk - r.anchos[0]) <= 1,
         r.anchoOk + '  vs  ' + r.anchos.join(' / '));
    vale('y los tres, del mismo alto',
         r.altos.length === 3 && new Set(r.altos).size === 1, r.altos.join(' / '));
    /* Separados por unos pocos píxeles: pegados se leen como un solo bloque
       partido, y con mucho hueco «▮ resaltado» ya no cabe sin partirse. */
    vale('separados por unos pocos píxeles',
         r.hueco > 0 && r.hueco <= 8, r.hueco + 'px');
    vale('SIN TEXTO EL OK SIGUE ACTIVO', r.okApagado === false, r.okApagado);
    vale('macizo, y los trazos de contorno', r.okMacizo !== r.modoMacizo,
         r.okMacizo + '  vs  ' + r.modoMacizo);
    vale('y sin texto no promete guardar nada',
         r.rotuloOk === 'Terminar sin escribir glosa', r.rotuloOk);
    vale('la caja de escribir está desde el principio', r.hayCaja && r.cajaVacia);
    vale('las etiquetas duermen sin texto', r.tagsDormidas);
    vale('y no se ha guardado nada', r.crecio === 0, r.crecio);
    return r;
  }));

  titulo('escribir despierta las etiquetas');
  di('tras teclear', await p.evaluate(async () => {
    const ta = document.getElementById('glosaCaja');
    ta.value = 'la primera nota';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 120));
    const tags = document.querySelector('#menu .tagbox');
    return { dormidas: tags.classList.contains('dormida'),
             puntero: getComputedStyle(tags).pointerEvents };
  }).then(r => {
    vale('se despiertan al haber texto', r.dormidas === false);
    vale('y vuelven a responder', r.puntero !== 'none', r.puntero);
    return r;
  }));

  titulo('poner una etiqueta no se lleva lo escrito');
  /* El fallo que esta prueba existe para cazar: el menú de antes se repintaba
     entero al tocar un chip. Con una caja de escribir dentro, repintar es
     perder el texto a media palabra. */
  di('tras tocar un chip', await p.evaluate(async () => {
    const caja = document.querySelector('#menu #tagNueva');
    caja.value = 'promesas';
    caja.dispatchEvent(new Event('change', { bubbles:true }));
    await new Promise(z => setTimeout(z, 150));
    const ta = document.getElementById('glosaCaja');
    const antes = ta.value;
    const chip = document.querySelector('#menu .tg[data-tag="promesas"]');
    if (!chip) return { habiaChip:false };
    /* crearla ya la aplica: el primer toque la quita y el segundo la
       devuelve, que es el vaivén que hay que probar */
    const alCrearla = chip.classList.contains('on');
    chip.click(); await new Promise(z => setTimeout(z, 120));
    const trasUno = document.querySelector('#menu .tg[data-tag="promesas"]').classList.contains('on');
    document.querySelector('#menu .tg[data-tag="promesas"]').click();
    await new Promise(z => setTimeout(z, 120));
    const ahora = document.getElementById('glosaCaja');
    return { habiaChip:true, alCrearla, trasUno,
             trasDos: document.querySelector('#menu .tg[data-tag="promesas"]').classList.contains('on'),
             mismoNodo: ahora === ta, texto: ahora && ahora.value, antes,
             enNegrita: !!document.querySelector('#menu .tg.ultima') };
  }).then(r => {
    vale('la etiqueta nueva salió puesta', r.habiaChip && r.alCrearla);
    vale('un toque la quita y otro la devuelve',
         r.trasUno === false && r.trasDos === true, [r.trasUno, r.trasDos]);
    vale('el textarea es el MISMO nodo', r.mismoNodo);
    vale('y conserva lo escrito', r.texto === r.antes && !!r.texto, r.texto);
    vale('la última usada va en negrita', r.enNegrita);
    return r;
  }));

  titulo('tocar fuera con texto guarda');
  di('tras cerrar', await p.evaluate(async ([fuera, base]) => {
    await eval('(' + fuera + ')')();
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const mia = g.find(x => x.nota === 'la primera nota');
    return { crecio: g.length - base, nota: mia && mia.nota, etiquetas: mia && mia.etiquetas,
             estilo: mia && mia.estilo,
             panelCerrado: getComputedStyle(document.getElementById('menu')).display === 'none' };
  }, [FUERA, base]).then(r => {
    vale('quedó una marca más', r.crecio === 1, r.crecio);
    vale('con su nota', r.nota === 'la primera nota', r.nota);
    vale('y su etiqueta', (r.etiquetas||[]).join() === 'promesas', r.etiquetas);
    vale('el panel se cerró', r.panelCerrado);
    return r;
  }));

  titulo('sin texto no se guarda nada');
  /* La regla que sostiene todo lo demás: un subrayado por accidente no puede
     dejar rastro. Antes de este cambio, tocar "Resaltar" creaba la marca en
     el acto y no había manera de deshacer el gesto salvo borrándola. */
  di('abrir y salir sin escribir', await p.evaluate(async ([abrir, fuera]) => {
    const antes = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length;
    await eval('(' + abrir + ')')(22, 34);
    const abierto = getComputedStyle(document.getElementById('menu')).display !== 'none';
    /* mientras está abierto SÍ se ve el ancla, que es media decisión */
    const seVe = document.querySelectorAll('#pgBody .v').length > 0;
    await eval('(' + fuera + ')')();
    return { antes, abierto, seVe,
             despues: JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length };
  }, [ABRIR, FUERA]).then(r => {
    vale('el panel se abrió', r.abierto);
    vale('y al salir sin escribir no queda nada', r.despues === r.antes,
         r.antes + ' → ' + r.despues);
    return r;
  }));

  /* ================================================================
     EL BOTÓN OK.

     No inventa un camino: hace exactamente lo mismo que tocar fuera —cerrar
     cobrando lo escrito—. Está para que se VEA que ahí se termina; antes la
     única salida era tocar en cualquier otro sitio, que es un gesto que hay
     que saberse. Por eso lo que se prueba es que los dos caminos dejan el
     mismo resultado, no que el botón haga algo suyo.
     ================================================================ */
  titulo('el OK guarda y cierra, igual que tocar fuera');
  di('terminar con OK', await p.evaluate(async ([abrir]) => {
    const antes = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length;
    await eval('(' + abrir + ')')(60, 74);
    const ta = document.getElementById('glosaCaja');
    ta.value = 'terminada con el botón';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 120));
    const ok = document.querySelector('#menu .mmodos [data-acc="ok"]');
    if (!ok) return { error:'no hay OK' };
    ok.click();
    await new Promise(z => setTimeout(z, 600));
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const mia = g.find(x => x.nota === 'terminada con el botón');
    return { crecio: g.length - antes, nota: mia && mia.nota,
             cerrado: getComputedStyle(document.getElementById('menu')).display === 'none',
             /* Y la glosa aterriza en la hoja, que es lo que ve el lector:
                cerrar sin que salga al margen sería guardar a escondidas. */
             enLaHoja: [...document.querySelectorAll('#pgMargin .gl')]
                         .some(e => (e.textContent||'').indexOf('terminada con el botón') >= 0) };
  }, [ABRIR]).then(r => {
    vale('quedó una marca más', r.crecio === 1, r.error || r.crecio);
    vale('con lo escrito', r.nota === 'terminada con el botón', r.nota);
    vale('el panel se cerró', r.cerrado === true);
    vale('y la glosa voló a la hoja', r.enLaHoja === true, r);
    return r;
  }));

  /* ================================================================
     EL RÓTULO DEL OK DICE LO QUE VA A PASAR.

     El botón está siempre activo, y con la caja vacía sobre una glosa que YA
     tenía nota, terminar la BORRA. Quien no ve la pantalla oía «terminar y
     guardar la glosa» justo en el momento en que el botón la destruye. Los
     tres rótulos son los tres casos que cerrarBorrador reconoce, ni uno más.
     Lo levantó la revisión de Codex. */
  titulo('el rótulo del OK cambia con lo que va a pasar');
  di('los tres casos', await p.evaluate(async ([abrir, tocar, fuera]) => {
    const rotulo = () => {
      const ok = document.querySelector('#menu .mok');
      return ok ? ok.getAttribute('aria-label') : null;
    };
    const escribir = async (t) => {
      const ta = document.getElementById('glosaCaja');
      ta.value = t; ta.dispatchEvent(new Event('input', { bubbles:true }));
      await new Promise(z => setTimeout(z, 150));
    };
    /* Una glosa nueva: vacía no guarda nada, con texto guarda. Sobre
       «registro de Jesús», que no lo pisa ninguno de los otros bloques. */
    await eval('(' + abrir + ')')(22, 34);
    const nuevaVacia = rotulo();
    await escribir('la del rótulo');
    const conTexto = rotulo();
    await eval('(' + fuera + ')')();
    /* Y ahora la MISMA, reabierta: vaciarla la borra, y el rótulo lo dice. */
    await eval('(' + tocar + ')')(20, 28);
    const alReabrir = rotulo();
    const traia = (document.getElementById('glosaCaja') || {}).value;
    await escribir('');
    const vaciada = rotulo();
    await escribir(traia);            /* se deja como estaba: no se borra */
    const deVuelta = rotulo();
    await eval('(' + fuera + ')')();
    return { nuevaVacia, conTexto, alReabrir, vaciada, deVuelta, traia };
  }, [ABRIR, TOCAR, FUERA]).then(r => {
    vale('nueva y vacía: no promete guardar',
         r.nuevaVacia === 'Terminar sin escribir glosa', r.nuevaVacia);
    vale('con texto: guardar', r.conTexto === 'Terminar y guardar la glosa', r.conTexto);
    vale('reabierta con su nota: guardar',
         r.alReabrir === 'Terminar y guardar la glosa', r.alReabrir);
    vale('VACIADA, AVISA DE QUE BORRA',
         r.vaciada === 'Terminar y borrar la glosa', r.vaciada);
    vale('y al reescribir vuelve a guardar',
         r.deVuelta === 'Terminar y guardar la glosa', r.deVuelta);
    return r;
  }));

  titulo('sin texto, el OK termina y no deja nada');
  /* La razón de que el OK nunca se apague: sin texto, terminar es BORRAR la
     glosa, y ése es un camino que existe y hay que poder pedir. Un OK
     apagado diría que ahí no se puede salir, que es mentira. */
  di('OK con la caja vacía', await p.evaluate(async ([abrir]) => {
    const antes = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length;
    await eval('(' + abrir + ')')(78, 90);
    const ok = document.querySelector('#menu .mmodos [data-acc="ok"]');
    const apagado = ok.disabled === true || getComputedStyle(ok).pointerEvents === 'none';
    ok.click();
    await new Promise(z => setTimeout(z, 600));
    return { apagado,
             despues: JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]').length,
             antes,
             cerrado: getComputedStyle(document.getElementById('menu')).display === 'none' };
  }, [ABRIR]).then(r => {
    vale('el OK responde aunque no haya texto', r.apagado === false);
    vale('cierra el panel', r.cerrado === true);
    vale('y no deja marca', r.despues === r.antes, r.antes + ' → ' + r.despues);
    return r;
  }));

  /* ================================================================
     ABRIR EL PANEL DE UNA GLOSA NUEVA NO REHACE LA HOJA.

     Abrir el panel de una marca recién nacida llamaba a renderPage(), que
     rehace el cuerpo del versículo entero para enseñar un resaltado que ya
     sabe pintar el motor de subrayados. Con muchas glosas puestas eso son
     cientos de milisegundos entre el dedo y la cajita, y se notaban: la caja
     tardaba en aparecer justo cuando más atención se le está prestando.

     Se mide por la IDENTIDAD DEL NODO y no por el reloj: si la hoja se
     rehizo, el elemento del versículo es otro objeto. Un umbral de tiempo en
     una máquina prestada canta fallos que no existen; esto no. */
  titulo('abrir una glosa nueva no rehace la hoja');
  di('el nodo del versículo', await p.evaluate(async ([abrir, fuera]) => {
    /* Cuántos trozos hay resaltados AHORA MISMO, sumando los de los cuatro
       colores. Es la manera de ver que el atajo sigue pintando: tiene que
       crecer en uno, ni cero —no pintó— ni de golpe —rehizo la hoja—. */
    const trozos = () => {
      if (window.CSS && CSS.highlights){
        let n = 0; for (const h of CSS.highlights.values()) n += h.size; return n;
      }
      return document.querySelectorAll('#pgBody mark, #pgBody .hl').length;
    };
    const antes = trozos();
    const v0 = document.querySelector('#pgBody .v');
    const t0 = performance.now();
    await eval('(' + abrir + ')')(95, 110);
    const tardo = Math.round(performance.now() - t0);
    const mismo = document.querySelector('#pgBody .v') === v0;
    const abierto = getComputedStyle(document.getElementById('menu')).display !== 'none';
    const crecio = trozos() - antes;
    await eval('(' + fuera + ')')();
    return { mismo, crecio, abierto, tardo };
  }, [ABRIR, FUERA]).then(r => {
    di('desde el toque hasta la cajita', r.tardo + ' ms');
    vale('el panel se abrió', r.abierto === true);
    vale('EL VERSÍCULO NO SE REHIZO', r.mismo === true, r.mismo);
    /* Y con la hoja intacta el resaltado provisional tiene que verse igual:
       el atajo no vale si lo que ahorra es justo lo que había que enseñar. */
    vale('y el resaltado provisional aparece', r.crecio === 1, r.crecio);
    return r;
  }));

  titulo('los dos trazos');
  di('elegir línea', await p.evaluate(async ([abrir, fuera]) => {
    await eval('(' + abrir + ')')(40, 54);
    document.querySelector('#menu .mmodos button[data-modo="border"]').click();
    await new Promise(z => setTimeout(z, 120));
    const encendido = [...document.querySelectorAll('#menu .mmodos button')]
      .filter(b => b.classList.contains('on')).map(b => b.dataset.modo);
    const ta = document.getElementById('glosaCaja');
    /* la caja sigue estando: el trazo no la esconde, porque toda marca es
       una glosa y sin nota no hay nada que guardar */
    const hayCaja = !!ta;
    ta.value = 'subrayada'; ta.dispatchEvent(new Event('input', { bubbles:true }));
    await eval('(' + fuera + ')')();
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const nueva = g.find(x => x.nota === 'subrayada');
    return { encendido, hayCaja, estilo: nueva && nueva.estilo, cuantas: g.length };
  }, [ABRIR, FUERA]).then(r => {
    vale('línea queda encendida y sola', r.encendido.join() === 'border', r.encendido);
    vale('la caja de escribir no se esconde', r.hayCaja);
    vale('y se guarda con el trazo elegido', r.estilo === 'border', r.estilo);
    return r;
  }));

  titulo('vaciar una glosa la borra');
  /* La única puerta de salida que tiene una marca, y por eso tiene red:
     el aviso de deshacer. */
  di('borrar por vaciado', await p.evaluate(async ([fuera]) => {
    const g0 = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const objetivo = g0.find(x => x.nota === 'subrayada');
    const gl = document.querySelector('#pgMargin .gl[data-gl="' + objetivo.id + '"]') ||
               document.querySelector('#pgBody .gl[data-gl="' + objetivo.id + '"]');
    if (!gl) return { sinGlosa:true };
    gl.dispatchEvent(new MouseEvent('dblclick', { bubbles:true }));
    await new Promise(z => setTimeout(z, 400));
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    const traia = ta.value;
    ta.value = ''; ta.dispatchEvent(new Event('input', { bubbles:true }));
    const dormidasOtraVez = document.querySelector('#menu .tagbox').classList.contains('dormida');
    await eval('(' + fuera + ')')();
    const g1 = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    return { traia, dormidasOtraVez, antes: g0.length, despues: g1.length,
             sigue: g1.some(x => x.id === objetivo.id),
             deshacer: getComputedStyle(document.getElementById('deshacer')).display !== 'none' };
  }, [FUERA]).then(r => {
    vale('el panel abre con la nota puesta', !r.sinGlosa && !r.sinPanel && r.traia === 'subrayada',
         r.traia);
    vale('vaciarla vuelve a dormir las etiquetas', r.dormidasOtraVez);
    vale('la marca se fue', r.sigue === false, r.antes + ' → ' + r.despues);
    vale('y avisa para poder deshacerlo', r.deshacer);
    return r;
  }));

  titulo('una marca vieja sin nota no se borra por mirarla');
  /* Las marcas de antes de este cambio pueden no tener nota. Su caja nace
     vacía sin que nadie la vacíe, así que la regla de arriba —vaciar es
     borrar— las borraría solo por abrirlas. Se fabrica una quitándole la nota
     a la que acabamos de guardar, que es exactamente como llegan las viejas. */
  await p.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const mia = g.find(x => x.nota === 'la primera nota');
    if (mia){ mia.__vieja = 1; delete mia.nota; }
    localStorage.setItem('glossa:marcas:v1', JSON.stringify(g));
  });
  await p.reload();
  await p.waitForTimeout(2600);
  di('abrirla tocándola y salir', await p.evaluate(async ([tocar, fuera]) => {
    const antes = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const vieja = antes.find(x => x.__vieja);
    if (!vieja) return { sinVieja:true };
    /* se toca en mitad de sus letras: no pinta glosa en el margen, así que
       los dos clics no llegan a ella */
    await eval('(' + tocar + ')')(3, 11);
    const m = document.getElementById('menu');
    const abierto = getComputedStyle(m).display !== 'none';
    const ta = document.getElementById('glosaCaja');
    const cajaVacia = ta ? ta.value === '' : null;
    const dormidas = !!m.querySelector('.tagbox.dormida');
    await eval('(' + fuera + ')')();
    const despues = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    return { abierto, cajaVacia, dormidas,
             sigue: despues.some(x => x.id === vieja.id),
             antes: antes.length, despues: despues.length };
  }, [TOCAR, FUERA]).then(r => {
    vale('el panel se abre tocándola', !r.sinVieja && r.abierto);
    vale('con la caja vacía y las etiquetas dormidas', r.cajaVacia === true && r.dormidas);
    vale('y sigue estando después de mirarla', r.sigue,
         r.antes + ' → ' + r.despues);
    return r;
  }));

  titulo('la glosa al margen: nota, ancla y etiqueta');
  /* LAS TRES PARTES SE DISTINGUEN POR FAMILIA Y POSICIÓN, no por peso y
     opacidad. Venían separadas solo por esos dos, que son los recursos más
     débiles que hay: sobre tinte claro la negrita apenas oscurece y la opacidad
     no dice «otra clase de cosa», dice «lo mismo pero apagado». De ahí que la
     etiqueta se leyera como el final de la frase.

     Y aquí van tres comprobaciones que no son de gusto sino de fallo:

     · QUE LA ETIQUETA NO SE SALGA. «#Interesante» es un token sin puntos de
       corte y en el margen se desbordaba; .pg-margin lo recortaba y aparecía
       «#Interesant». Se probó en el teléfono del autor.
     · QUE NO SE ARREGLE CON overflow-wrap. Está prohibido: medirPalabras toma
       solo rects[0], así que una palabra partida pierde su segunda mitad en la
       foto del pliegue. La salida es <wbr>, que parte el nodo de texto.
     · QUE LA ETIQUETA NO USE opacity. La opacidad no viaja al lienzo —solo el
       color calculado—, así que con opacity la etiqueta se veía al 62% en la
       hoja y al 100% en la foto: cambiaba de tono al voltear la hoja. */
  await conGlosas(p);
  di('las tres partes', await p.evaluate(() => {
    const g = document.querySelector('#pgMargin .gl');
    if (!g) return { sinGlosa:true };
    const fam = e => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g,'');
    const ref = g.querySelector('.gl-ref'), tag = g.querySelector('.gl-tag');
    const cs = getComputedStyle(g);
    return { nota:{ familia:fam(g), tam:cs.fontSize, interlinea:cs.lineHeight },
             ancla: ref ? { familia:fam(ref), tam:getComputedStyle(ref).fontSize } : null,
             etiqueta: tag ? { familia:fam(tag), tam:getComputedStyle(tag).fontSize,
                               display:getComputedStyle(tag).display,
                               alineacion:getComputedStyle(tag).textAlign,
                               opacidad:+getComputedStyle(tag).opacity,
                               color:getComputedStyle(tag).color } : null,
             /* la corrección prohibida, por si alguien la reintroduce */
             corteDePalabra: cs.overflowWrap + ' / ' + cs.wordBreak };
  }).then(r => {
    /* UNA ESCALERA DE TAMAÑOS, que es lo que separa las tres partes ahora que
       comparten familia. Se comprueba el orden, no las cifras: los valores van
       en em sobre --fs y cambian con el ajuste de letra del libro. */
    const t = x => parseFloat(x);
    vale('el ancla es más chica que la nota',
         !r.sinGlosa && r.ancla && t(r.ancla.tam) < t(r.nota.tam),
         r.sinGlosa ? 'sin glosa' : r.nota.tam + ' → ' + (r.ancla||{}).tam);
    if (r.etiqueta){
      vale('y la etiqueta más chica que el ancla',
           t(r.etiqueta.tam) < t(r.ancla.tam),
           r.ancla.tam + ' → ' + r.etiqueta.tam);
      vale('va en su propio renglón', r.etiqueta.display === 'block', r.etiqueta.display);
      vale('y alineada a la derecha', r.etiqueta.alineacion === 'right', r.etiqueta.alineacion);
      /* opacity no viaja al lienzo; el alfa tiene que ir DENTRO del color */
      vale('se aclara con color, no con opacity',
           r.etiqueta.opacidad === 1 && /rgba\(/.test(r.etiqueta.color),
           'opacity ' + r.etiqueta.opacidad + ' · ' + r.etiqueta.color);
    }
    vale('sin overflow-wrap, que rompería la foto del pliegue',
         r.corteDePalabra === 'normal / normal', r.corteDePalabra);
    return r;
  }));

  /* QUE NO SE RECORTE, en el margen estrecho y con la letra al máximo, que es
     donde se rompía. Se mide contra la caja Y contra la columna. */
  for (const fs of [15, 26]){
    di('etiqueta larga, letra ' + fs, await p.evaluate(async fs => {
      const clave = Object.keys(localStorage).find(k => /ajuste|cfg/i.test(k)) || 'glossa:ajustes:v1';
      const a = JSON.parse(localStorage.getItem(clave) || '{}');
      a.fontSize = fs; localStorage.setItem(clave, JSON.stringify(a));
      const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
      if (M[0]) M[0].etiquetas = ['ConsideracionesFinales', 'oración diaria'];
      localStorage.setItem('glossa:marcas:v1', JSON.stringify(M));
      location.reload();
      return true;
    }, fs).then(async () => {
      await p.waitForTimeout(2800);
      return p.evaluate(() => {
        const g = document.querySelector('#pgMargin .gl');
        if (!g) return { sinGlosa:true };
        const r = g.getBoundingClientRect();
        const col = document.getElementById('pgMargin').getBoundingClientRect();
        const t = g.querySelector('.gl-tag');
        return { letra:getComputedStyle(g).fontSize,
                 etiquetaSeSaleDeLaCaja: t ? Math.max(0, Math.round(t.getBoundingClientRect().right - r.right)) : null,
                 glosaSeSaleDeLaColumna: Math.max(0, Math.round(r.right - col.right)),
                 conWbr: !!g.querySelector('.gl-tag wbr') };
      });
    }).then(r => {
      vale('la etiqueta no se sale de la caja · ' + fs,
           !r.sinGlosa && r.etiquetaSeSaleDeLaCaja === 0, r.etiquetaSeSaleDeLaCaja);
      vale('ni la glosa de la columna · ' + fs,
           !r.sinGlosa && r.glosaSeSaleDeLaColumna === 0, r.glosaSeSaleDeLaColumna);
      vale('y la etiqueta larga lleva su <wbr> · ' + fs, r.conWbr === true);
      return r;
    }));
  }

  /* LA MEDIDA QUE GUARDA LA FOTO DEL PLIEGUE. La caja de la glosa no se dibuja
     midiendo palabras como el texto: la COMPONE el motor a partir del marcado,
     así que si la letra se resolviera distinto dentro del SVG que en la hoja
     viva, el recuadro saldría de otro alto que sus propias letras. Se compone
     aquí el mismo marcado con la misma hoja de estilos y se comparan los dos
     altos. Cero es lo único que vale. */
  di('la caja compone al mismo alto', await p.evaluate(async () => {
    const vivo = document.querySelector('#pgMargin .gl');
    if (!vivo) return { sinGlosa:true };
    const alto = vivo.getBoundingClientRect().height;
    const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
    const inner = document.querySelector('#pg .pg-inner');
    const f = document.createElement('iframe');
    f.style.cssText = 'position:absolute;left:-9999px;width:' + inner.offsetWidth +
                      'px;height:' + inner.offsetHeight + 'px';
    document.body.appendChild(f);
    f.contentDocument.open();
    /* Las MISMAS variables que declara la raíz del SVG del pliegue. La letra
       de la glosa se separó de la del texto (--fs-glosa), y componiendo solo
       con --fs la caja salía del alto que le tocaría a la letra del cuerpo:
       113 contra 310. Si mañana se separa otra, va aquí. */
    const cs = getComputedStyle(document.getElementById('pg'));
    const vars = ['--fs', '--fs-glosa', '--lh', '--ali', '--cols']
      .map(k => k + ':' + cs.getPropertyValue(k).trim())
      .filter(x => !x.endsWith(':')).join(';');
    f.contentDocument.write('<style>' + css + '</style><div id="pg" class="pg" style="' +
      vars + '">' + inner.outerHTML + '</div>');
    f.contentDocument.close();
    await new Promise(z => setTimeout(z, 700));
    const g2 = f.contentDocument.querySelector('.gl');
    const r = g2 ? g2.getBoundingClientRect().height : null;
    const fam = g2 ? getComputedStyle(g2).fontFamily.split(',')[0].replace(/["']/g,'') : null;
    f.remove();
    return { enLaHoja:Math.round(alto), alComponer:r === null ? null : Math.round(r),
             familiaAlComponer:fam };
  }).then(r => {
    vale('el mismo alto a los dos lados',
         !r.sinGlosa && r.alComponer === r.enLaHoja,
         r.enLaHoja + ' contra ' + r.alComponer);
    return r;
  }));

  /* SE VUELVE AL PRINCIPIO ANTES DE SEGUIR. La sección de arriba dejó la letra
     en 26 y las de abajo necesitan una hoja con su glosa a la vista; sin esto
     medían una pantalla sin glosas y cantaban fallos que no existen —pasó al
     escribirlas—. Se comprueba que de verdad hay glosa antes de continuar, que
     es la diferencia entre reiniciar y creer que se reinició. */
  const alPrincipio = async (etiquetas) => {
    await p.evaluate(etiquetas => {
      const clave = Object.keys(localStorage).find(k => /ajuste|cfg/i.test(k)) || 'glossa:ajustes:v1';
      const a = JSON.parse(localStorage.getItem(clave) || '{}');
      a.fontSize = 15; localStorage.setItem(clave, JSON.stringify(a));
      const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
      if (M[0] && etiquetas) M[0].etiquetas = etiquetas;
      localStorage.setItem('glossa:marcas:v1', JSON.stringify(M));
      location.reload();
    }, etiquetas);
    await p.waitForTimeout(2900);
    /* Y SE VUELVE A LA PRIMERA HOJA. Recargar no la devuelve: el programa
       recuerda dónde estabas, así que después de la sección que pasa hoja las
       siguientes empezaban en Mateo 1:15, sin ninguna glosa a la vista, y
       medían una pantalla vacía. */
    await p.evaluate(async () => {
      for (let i = 0; i < 8; i++){
        if (document.getElementById('cantoIzq').classList.contains('viva')) return;
        const e = document.getElementById('edgeL'), r = e.getBoundingClientRect();
        const o = { bubbles:true, pointerId:40+i, pointerType:'touch', isPrimary:true,
                    clientX:Math.round(r.left + r.width/2), clientY:450 };
        e.dispatchEvent(new PointerEvent('pointerdown', o));
        await new Promise(z => setTimeout(z, 70));
        e.dispatchEvent(new PointerEvent('pointerup', o));
        await new Promise(z => setTimeout(z, 1600));
      }
    });
    return p.evaluate(() => ({
      hoja: document.getElementById('pgCabeza').textContent.trim(),
      glosas: document.querySelectorAll('#pgMargin .gl').length,
      letra: getComputedStyle(document.querySelector('#pgMargin .gl') || document.body).fontSize }));
  };

  /* QUE LA FOTO DEL PLIEGUE SE HAGA, que es distinto de que la caja mida bien.

     Aquí falló mi comprobación anterior y por eso esta prueba existe. Medí el
     alto componiendo el marcado en un IFRAME, que usa el parser de HTML y es
     indulgente. Pero la foto no viaja así: buildSVG arma una cadena y la manda
     como data:image/svg+xml, y eso lo lee un parser de XML, donde un elemento
     sin cerrar no es un vacío sino un error FATAL. Con <wbr> el SVG entero
     dispara onerror y se queda sin foto, así que cualquier hoja con una
     etiqueta larga pierde la animación de pasar página. Medir el alto no lo
     habría visto nunca, y por eso esto se prueba DE PUNTA A PUNTA: se pone una
     etiqueta larga, se pasa hoja, y se mira si el lienzo llegó a dibujar.
     Lo levantó la revisión de Codex. */
  di('   de vuelta al principio', await alPrincipio(['ConsideracionesFinales']));
  di('pasar hoja con una etiqueta larga', await (async () => {
    return p.evaluate(async () => {
      const hayEtiquetaLarga = !!document.querySelector('#pgMargin .gl-tag wbr');
      const fx = document.getElementById('fx'), g = fx.getContext('2d');
      const e = document.getElementById('edgeR'), r = e.getBoundingClientRect();
      const op = { bubbles:true, pointerId:55, pointerType:'touch', isPrimary:true,
                   clientX:Math.round(r.left + r.width/2), clientY:450 };
      e.dispatchEvent(new PointerEvent('pointerdown', op));
      await new Promise(z => setTimeout(z, 70));
      e.dispatchEvent(new PointerEvent('pointerup', op));
      /* se retrata muchas veces y se guarda el cuadro con más tinta: el giro no
         empieza en el mismo milisegundo cada vez */
      let mas = 0, seEncendio = false;
      for (let k = 0; k < 30; k++){
        await new Promise(z => setTimeout(z, 40));
        if (getComputedStyle(fx).display === 'none') continue;
        seEncendio = true;
        const d = g.getImageData(0, 0, fx.width, Math.min(fx.height, 1200)).data;
        let n = 0;
        for (let q = 0; q < d.length; q += 32) if (d[q+3] > 40) n++;
        if (n > mas) mas = n;
      }
      await new Promise(z => setTimeout(z, 1500));
      return { hayEtiquetaLarga, seEncendioElLienzo:seEncendio, tinta:mas };
    });
  })().then(r => {
    vale('la hoja lleva de verdad una etiqueta partida', r.hayEtiquetaLarga === true);
    /* Sin foto, el lienzo se queda en blanco: es la señal de que el SVG no
       parseó. Con foto, el giro dibuja papel y letra. */
    vale('la foto del pliegue se dibuja', r.tinta > 500, r.tinta + ' píxeles');
    return r;
  }));

  /* LAS ETIQUETAS SE PARTEN POR GRAFEMAS, no por unidades de UTF-16. length y
     slice cuentan pares de bytes, así que un emoji se puede cortar por la mitad
     y con un <wbr/> en medio los dos trozos ya no se recomponen: salen dos
     rombos de reemplazo. Las escribe el lector y pueden llevar lo que sea.
     Se mira el DOM y no el texto: textContent vuelve a pegar los trozos y
     disimularía el corte. Lo que delata es un nodo de texto que TERMINA en la
     mitad alta de un par suplente, o que EMPIEZA en la baja. */
  di('   de vuelta al principio', await alPrincipio(['abcdefghij\u{1F600}kl']));
  di('una etiqueta con emoji', await (async () => {
    return p.evaluate(() => {
      const t = document.querySelector('#pgMargin .gl-tag .gl-t');
      if (!t) return { sinEtiqueta:true };
      const trozos = [...t.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent);
      return { trozos, texto:t.textContent,
               parSuplentePartido: trozos.some(x => /[\uD800-\uDBFF]$/.test(x)) ||
                                   trozos.some(x => /^[\uDC00-\uDFFF]/.test(x)) };
    });
  })().then(r => {
    vale('el emoji no se parte por la mitad',
         !r.sinEtiqueta && r.parSuplentePartido === false,
         JSON.stringify(r.trozos));
    return r;
  }));

  /* EL ANTICIPO ES LA GLOSA, y eso se comprueba MIDIENDO LAS DOS, no leyendo
     el CSS. Dos cosas tienen que coincidir o esto deja de ser un anticipo: el
     cuerpo de letra —si no, se escribe a un tamaño y se lee a otro— y el
     ANCHO, que es el que decide por dónde parten los renglones. Aquí estuvo el
     fallo viejo: se escribía en una caja de 16px y quedaba una nota de 13.95,
     así que lo que veías mientras escribías no era lo que iba a quedar. */
  di('   de vuelta al principio', await alPrincipio(['eco']));
  /* Las glosas AL MARGEN: es la única disposición donde la comparación
     significa algo, porque es la que tiene un ancho de columna que el
     anticipo debe copiar. */
  await p.evaluate(async () => {
    const b = [...document.querySelectorAll('[data-lay]')].find(x => x.dataset.lay === 'margin');
    if (b) b.click();
    await new Promise(z => setTimeout(z, 1200));
  });
  di('el anticipo mide lo que medirá la glosa', await p.evaluate(async ([abrir, fuera, tocar]) => {
    /* Primero se deja una glosa puesta, para tener con qué comparar; luego se
       vuelve a abrir TOCÁNDOLA y se miden las dos a la vez. Comparar contra
       una glosa cualquiera de la hoja no valdría: hay que comparar el anticipo
       con la nota EN LA QUE SE CONVIERTE. */
    const ok = await eval('(' + abrir + ')')(0, 14);
    if (!ok) return { sinTexto:true };
    const ta0 = document.getElementById('glosaCaja');
    ta0.value = 'para medir contra el margen';
    ta0.dispatchEvent(new Event('input', { bubbles:true }));
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));      /* que aterrice el vuelo */
    const enElMargen = document.querySelector('#pgMargin .gl[data-gl]');
    if (!enElMargen) return { sinMargen:true };
    const rm = enElMargen.getBoundingClientRect();
    const tamMargen = parseFloat(getComputedStyle(enElMargen).fontSize);
    await eval('(' + tocar + ')')(3, 11);
    const vista = document.getElementById('glVista');
    const ta = document.getElementById('glosaCaja');
    if (!vista || !ta) return { sinCaja:true };
    const panel = document.getElementById('menu').getBoundingClientRect();
    const r = vista.getBoundingClientRect();
    return { vista: parseFloat(getComputedStyle(vista).fontSize),
             textarea: parseFloat(getComputedStyle(ta).fontSize),
             margen: tamMargen,
             traeLaNota: ta.value,
             anchoVista: Math.round(r.width),
             anchoMargen: Math.round(rm.width),
             cabeEnElPanel: r.left >= panel.left - 1 && r.right <= panel.right + 1,
             anchoPanel: Math.round(panel.width),
             enPantalla: panel.top >= 0 && panel.bottom <= window.innerHeight + 1 };
  }, [ABRIR, FUERA, TOCAR]).then(r => {
    vale('el panel reabre con su nota', !r.sinTexto && !r.sinMargen && !r.sinCaja &&
         r.traeLaNota === 'para medir contra el margen', r.traeLaNota);
    vale('el mismo cuerpo que la glosa del margen',
         r.margen && Math.abs(r.vista - r.margen) < 0.6,
         r.vista + ' contra ' + r.margen);
    vale('y el textarea con él', Math.abs(r.textarea - r.vista) < 0.6, r.textarea);
    /* Unos píxeles de tolerancia: el margen se mide con su hueco de giro y el
       anticipo lo calcula, así que redondean distinto. */
    vale('y el mismo ancho, que es lo que parte los renglones',
         r.anchoMargen && Math.abs(r.anchoVista - r.anchoMargen) <= 3,
         r.anchoVista + ' contra ' + r.anchoMargen);
    vale('sin salirse del panel', r.cabeEnElPanel);
    vale('que cabe en la pantalla', r.enPantalla);
    /* Y EL PANEL MIDE LO QUE MIDE LA GLOSA. Es lo que lo convierte en «esta
       nota y sus mandos» en vez de en «un panel que además enseña una nota»:
       los dos filos son los mismos de arriba abajo. Lo que sobra es solo el
       relleno del panel. */
    vale('y el panel mide lo que la glosa',
         r.anchoPanel && r.anchoPanel - r.anchoVista <= 24,
         r.anchoPanel + ' contra ' + r.anchoVista);
    return r;
  }));

  titulo('las etiquetas se ven DENTRO de la glosa');
  /* Se pintan con etiquetasHTML, el mismo que usa la hoja: si aquí saliera
     otro marcado, el anticipo y la nota dirían cosas distintas. */
  di('con dos puestas', await p.evaluate(async ([abrir]) => {
    const vista = document.getElementById('glVista');
    if (!vista) return { sinPanel:true };
    const ta = document.getElementById('glosaCaja');
    ta.value = 'una nota con etiquetas dentro';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 200));
    const libres = [...document.querySelectorAll('#menu .taglista .tg')]
      .filter(b => !b.classList.contains('on'));
    for (const b of libres.slice(0,2)){ b.click(); await new Promise(z => setTimeout(z, 120)); }
    const dentro = [...vista.querySelectorAll('.gl-t')].map(x => x.textContent);
    const tag = vista.querySelector('.gl-tag');
    const cs = tag && getComputedStyle(tag);
    return { dentro, alineacion: cs && cs.textAlign, display: cs && cs.display,
             tam: cs && parseFloat(cs.fontSize),
             tamNota: parseFloat(getComputedStyle(vista).fontSize) };
  }, [ABRIR]).then(r => {
    vale('salen dentro del recuadro', !r.sinPanel && (r.dentro||[]).length === 2, r.dentro);
    vale('cada una con su almohadilla', (r.dentro||[]).every(t => t.startsWith('#')));
    vale('en su renglón y a la derecha', r.display === 'block' && r.alineacion === 'right',
         r.display + ' / ' + r.alineacion);
    vale('y más chicas que la nota', r.tam < r.tamNota, r.tam + ' contra ' + r.tamNota);
    return r;
  }));

  titulo('el ancla del anticipo es la de la hoja');
  /* glossHTML le antepone a cada nota un «1a·» que ocupa sitio en el PRIMER
     renglón y por tanto decide dónde parte. Sin ella el anticipo acertaba el
     ancho y erraba el corte, que es la mitad de lo que venía a copiar.
     Y no basta con que salga: tiene que decir LO MISMO, porque la referencia
     se gana por ser una de las notas de ese versículo y el anticipo la calcula
     antes de que la nota exista. */
  di('ancla y sangría', await p.evaluate(async ([abrir, fuera, tocar]) => {
    const ok = await eval('(' + abrir + ')')(0, 14);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinTexto:true };
    const vacia = document.querySelector('#glVista .gl-ref').textContent;
    ta.value = 'una nota larga para ver dónde parte el primer renglón';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 250));
    const conTexto = document.querySelector('#glVista .gl-ref').textContent;
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    /* SE COMPARAN LAS DOS A LA VEZ, reabriendo la glosa ya guardada. Comparar
       a través del guardado no valdría: una marca nueva se lleva las que pisa,
       y llevarse una nota renumera las de ese versículo, así que el anticipo
       puede anunciar «1b» de buena fe y acabar en «1a» porque la que iba
       delante desapareció al guardar. Eso es la regla de los solapes haciendo
       su trabajo, no el ancla equivocándose. Lo que sí tiene que cumplirse
       siempre es esto: con la glosa abierta, el ancla del anticipo y la de la
       hoja dicen lo mismo. */
    const mia = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
      .find(m => (m.nota||'').startsWith('una nota larga para ver'));
    if (!mia) return { sinGuardar:true };
    const enLaHoja = document.querySelector('.gl[data-gl="' + mia.id + '"] .gl-ref');
    await eval('(' + tocar + ')')(3, 11);
    const ancla = document.querySelector('#glVista .gl-ref');
    const ta2 = document.getElementById('glosaCaja');
    if (!ancla || !ta2) return { sinReabrir:true };
    const cs = getComputedStyle(ancla), ch = getComputedStyle(enLaHoja);
    return { vacia, conTexto,
             anticipo: { texto: ancla.textContent,
                         sangria: parseFloat(getComputedStyle(ta2).textIndent),
                         ancho: Math.round(ancla.getBoundingClientRect().width),
                         tam: cs.fontSize, peso: cs.fontWeight, fuera: cs.position },
             enLaHoja: { texto: enLaHoja.textContent, tam: ch.fontSize, peso: ch.fontWeight } };
  }, [ABRIR, FUERA, TOCAR]).then(r => {
    vale('sin texto todavía no hay referencia', !r.sinTexto && r.vacia === '·', r.vacia);
    vale('con texto sale la que le toca', /^\d/.test(r.conTexto || ''), r.conTexto);
    vale('y con la glosa abierta dice lo mismo que la hoja',
         !r.sinGuardar && !r.sinReabrir && r.anticipo.texto === r.enLaHoja.texto,
         (r.anticipo||{}).texto + ' contra ' + (r.enLaHoja||{}).texto);
    vale('del mismo cuerpo y peso',
         r.enLaHoja && r.anticipo.tam === r.enLaHoja.tam &&
         r.anticipo.peso === r.enLaHoja.peso,
         r.anticipo && r.anticipo.tam + ' / ' + r.anticipo.peso);
    /* Fuera del flujo y con el primer renglón sangrado a su ancho: es la única
       manera de que un textarea —que no deja fluir texto alrededor de nada—
       parta el primer renglón donde lo parte la nota de verdad. */
    vale('sangra el primer renglón a su ancho',
         r.anticipo && r.anticipo.fuera === 'absolute' &&
         Math.abs(r.anticipo.sangria - r.anticipo.ancho) <= 1,
         (r.anticipo||{}).sangria + ' contra ' + (r.anticipo||{}).ancho);
    return r;
  }));

  titulo('mirar una glosa no la hace volar');
  /* El vuelo dice «aquí quedó lo que acabas de escribir». Abrirla, leerla y
     salir no tiene nada que contar: animarla igual convierte un vistazo en un
     aviso de guardado, y de paso esconde la nota 2.4 segundos por nada. */
  di('abrir y salir sin tocar', await p.evaluate(async ([fuera]) => {
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]');
    const mia = g.find(m => (m.nota||'').startsWith('una nota larga para ver'));
    if (!mia) return { sinGlosa:true };
    const gl = document.querySelector('.gl[data-gl="' + mia.id + '"]');
    if (!gl) return { sinGlosa:true };
    gl.dispatchEvent(new MouseEvent('dblclick', { bubbles:true }));
    await new Promise(z => setTimeout(z, 450));
    const caja = document.getElementById('glosaCaja');
    const traeLaNota = (caja||{}).value;
    /* Y se puede seguir escribiendo sin tocar nada: el foco dentro, y el
       cursor al FINAL —en la posición cero invitaría a escribir por delante
       de lo que ya hay—. */
    const foco = document.activeElement && document.activeElement.id;
    const cursor = caja ? caja.selectionStart : null;
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 250));
    const calco = [...document.body.children].some(e => e.classList &&
      e.classList.contains('gl-vista') && e.style.position === 'fixed');
    /* y la nota sigue entera y a la vista, no escondida por un vuelo fantasma */
    const sigue = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
      .some(m => m.id === mia.id && m.nota === mia.nota);
    const visible = getComputedStyle(
      document.querySelector('.gl[data-gl="' + mia.id + '"]')).visibility;
    return { traeLaNota, calco, sigue, visible, foco, cursor };
  }, [FUERA]).then(r => {
    vale('el panel reabre con su nota', !r.sinGlosa && !!r.traeLaNota);
    vale('  con el foco puesto y el cursor al final',
         r.foco === 'glosaCaja' && r.cursor === (r.traeLaNota||'').length,
         r.foco + ', cursor ' + r.cursor + ' de ' + (r.traeLaNota||'').length);
    vale('y al salir sin tocar nada no vuela', r.calco === false);
    vale('la nota queda igual', r.sigue);
    vale('y visible, no escondida', r.visible === 'visible', r.visible);
    return r;
  }));

  titulo('la glosa vuela a su sitio al guardarse');
  /* Sin el vuelo la nota desaparece de un lado y aparece en el otro: dos
     cosas, no una. Con él, lo que escribiste y lo que quedó son el mismo
     objeto —que es la verdad— y el ojo aprende dónde buscarlo. */
  di('al cerrar', await p.evaluate(async ([abrir]) => {
    const calco = () => [...document.body.children].find(e => e.classList &&
      e.classList.contains('gl-vista') && e.style.position === 'fixed');
    /* Su propio panel, con su nota y sus dos etiquetas: encadenarlo al de la
       prueba anterior lo dejaba a merced de lo que aquélla hiciera al final. */
    const ok = await eval('(' + abrir + ')')(0, 16);
    if (!ok) return { sinPanel:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = 'una nota con etiquetas dentro';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 200));
    const libres = [...document.querySelectorAll('#menu .taglista .tg')]
      .filter(b => !b.classList.contains('on'));
    for (const b of libres.slice(0,2)){ b.click(); await new Promise(z => setTimeout(z, 120)); }
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 150));
    const c = calco();
    const an = c && c.getAnimations()[0];
    return { hayCalco: !!c,
             /* vuela una GLOSA, no un campo de escribir con el cursor dentro */
             sinTextarea: c ? !c.querySelector('textarea') : null,
             conEtiquetas: c ? c.querySelectorAll('.gl-t').length : null,
             animando: !!an,
             duracion: an ? an.effect.getTiming().duration : null };
  }, [ABRIR]).then(r => {
    vale('el calco despega', !r.sinPanel && r.hayCalco);
    vale('y es una glosa, no un formulario', r.sinTextarea === true);
    vale('con sus etiquetas puestas', r.conEtiquetas === 2, r.conEtiquetas);
    vale('lento a propósito', r.animando && r.duracion >= 1800 && r.duracion <= 3600,
         r.duracion + ' ms');
    return r;
  }));
  await p.waitForTimeout(3200);
  di('al aterrizar', await p.evaluate(() => ({
    calcoFuera: ![...document.body.children].some(e => e.classList &&
      e.classList.contains('gl-vista') && e.style.position === 'fixed'),
    ningunaEscondida: [...document.querySelectorAll('.gl')]
      .every(g => getComputedStyle(g).visibility !== 'hidden'),
    guardada: JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
      .some(m => m.nota === 'una nota con etiquetas dentro')
  })).then(r => {
    vale('el calco se recoge', r.calcoFuera);
    vale('ninguna glosa queda escondida', r.ningunaEscondida);
    vale('y la nota quedó guardada', r.guardada);
    return r;
  }));

  titulo('el anticipo acierta el ancho en las tres disposiciones');
  /* Y CON LA HOJA SIN NINGUNA NOTA, que es el caso que se rompía. Cuando ya hay
     una glosa pintada, anchoVista mide la suya y acierta siempre; la
     estimación solo entra en juego para la PRIMERA de la hoja, así que se
     vacía el almacén para llegar a ella.
     Al pie era donde peor salía: .pg-foot:empty lo pone en display:none, medirlo
     daba cero, y la cuenta se caía al ancho del margen. Lo levantó Codex. */
  for (const lay of ['foot', 'below', 'margin']){
    await p.evaluate(() => localStorage.setItem('glossa:marcas:v1', '[]'));
    await p.reload(); await p.waitForTimeout(2600);
    di('· ' + lay, await p.evaluate(async ([abrir, fuera, lay]) => {
      const b = [...document.querySelectorAll('[data-lay]')].find(x => x.dataset.lay === lay);
      if (b) b.click();
      await new Promise(z => setTimeout(z, 1400));
      const ok = await eval('(' + abrir + ')')(0, 16);
      if (!ok) return { sinTexto:true };
      const vista = document.getElementById('glVista');
      if (!vista) return { sinPanel:true };
      const anticipo = Math.round(vista.getBoundingClientRect().width);
      const ta = document.getElementById('glosaCaja');
      ta.value = 'la primera nota de esta hoja, con texto de sobra para partir renglón';
      ta.dispatchEvent(new Event('input', { bubbles:true }));
      await eval('(' + fuera + ')')();
      await new Promise(z => setTimeout(z, 3300));
      const puesta = document.querySelector(
        '#pgFoot .gl[data-gl], #pgMargin .gl[data-gl], #pgBody .gl[data-gl]');
      return { anticipo,
               real: puesta ? Math.round(puesta.getBoundingClientRect().width) : null };
    }, [ABRIR, FUERA, lay]).then(r => {
      vale('el anticipo mide lo que medirá · ' + lay,
           !r.sinTexto && !r.sinPanel && r.real && Math.abs(r.anticipo - r.real) <= 3,
           r.anticipo + ' contra ' + r.real);
      return r;
    }));
  }

  titulo('una nota larga no se sale de la escena');
  /* Sin tope, el panel crecía más alto que la escena; colocarMenu calculaba
     entonces un tope negativo y, como .stage recorta, lo que quedaba fuera era
     justo lo de arriba —los colores y los dos trazos— sin nada que desplazar
     para llegar a ellos. Lo levantó Codex. */
  di('con una nota larguísima', await p.evaluate(async ([abrir, fuera]) => {
    const ok = await eval('(' + abrir + ')')(0, 16);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = ('una nota francamente larga que sigue y sigue sin parar. ').repeat(30);
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 300));
    const menu = document.getElementById('menu');
    const st = document.getElementById('stage');
    const m = menu.getBoundingClientRect(), s = st.getBoundingClientRect();
    const col = menu.querySelector('.mcolores').getBoundingClientRect();
    const r = { alto: Math.round(m.height), escena: Math.round(s.height),
                cabe: m.top >= s.top - 1 && m.bottom <= s.bottom + 1,
                coloresDentro: col.top >= s.top - 1 && col.bottom <= s.bottom + 1,
                /* y lo que sobra se puede alcanzar desplazando */
                desplazable: menu.scrollHeight > menu.clientHeight + 1 ||
                             ta.scrollHeight > ta.clientHeight + 1 };
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    return r;
  }, [ABRIR, FUERA]).then(r => {
    vale('el panel no se sale de la escena', !r.sinTexto && !r.sinPanel && r.cabe,
         r.alto + ' de ' + r.escena);
    vale('los colores siguen alcanzables', r.coloresDentro);
    vale('y lo que sobra se desplaza', r.desplazable);
    return r;
  }));

  titulo('poner una etiqueta recoloca el panel');
  /* Una etiqueta más puede partir el renglón de las etiquetas DENTRO de la
     glosa y estirar el recuadro. Los otros dos caminos que cambian el alto
     —escribir y crear— ya recolocaban; a éste se le había olvidado, así que un
     panel puesto encima del pasaje crecía hacia abajo y se le echaba encima.
     Lo levantó Codex. */
  di('al alternar etiquetas', await p.evaluate(async ([abrir, fuera]) => {
    /* Se siembra el vocabulario aquí: la prueba del ancho vacía el almacén tres
       veces y con las marcas se van sus etiquetas, así que a estas alturas no
       queda ninguna que alternar. */
    let ok = await eval('(' + abrir + ')')(0, 16);
    if (!ok) return { sinTexto:true };
    let sembrar = document.getElementById('glosaCaja');
    sembrar.value = 'nota que trae vocabulario';
    sembrar.dispatchEvent(new Event('input', { bubbles:true }));
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 200));
    for (const t of ['gozo','fe','paz','reino','luz','camino']){
      const i = document.getElementById('tagNueva');
      i.value = t;
      i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise(z => setTimeout(z, 90));
    }
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    /* y ahora, sobre OTRO tramo, esas etiquetas están libres */
    ok = await eval('(' + abrir + ')')(30, 46);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    ta.value = 'corta'; ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 200));
    document.querySelector('#menu .mtags').click();
    await new Promise(z => setTimeout(z, 250));
    const menu = document.getElementById('menu'), st = document.getElementById('stage');
    const antes = { top: Math.round(menu.getBoundingClientRect().top),
                    alto: Math.round(menu.getBoundingClientRect().height) };
    const libres = [...document.querySelectorAll('#menu .taglista .tg')]
      .filter(b => !b.classList.contains('on'));
    if (libres.length < 3) return { pocas:true, n:libres.length };
    for (const b of libres.slice(0,4)){ b.click(); await new Promise(z => setTimeout(z, 130)); }
    const m = menu.getBoundingClientRect(), s = st.getBoundingClientRect();
    const r = { antes, alto: Math.round(m.height), top: Math.round(m.top),
                creció: Math.round(m.height) !== antes.alto,
                dentro: m.top >= s.top - 1 && m.bottom <= s.bottom + 1 };
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    return r;
  }, [ABRIR, FUERA]).then(r => {
    vale('el panel cambia de alto al etiquetar', !r.sinTexto && !r.pocas && r.creció,
         (r.antes||{}).alto + ' → ' + r.alto);
    vale('y sigue entero dentro de la escena', r.dentro);
    return r;
  }));

  titulo('el calco se compone como la glosa de la hoja');
  /* En el editor el ancla va en absoluto y el primer renglón se sangra a mano:
     es el apaño para que un textarea parta donde parte la nota. Esa sangría
     vive EN EL TEXTAREA, así que al cambiarlo por su texto se iba con él y el
     ancla se quedaba encima de las primeras palabras. Copiar la sangría al
     calco tampoco vale —el ancla va en su posición estática, así que la sangría
     la corre a ella también—. Sin textarea no hace falta apaño ninguno: ancla y
     texto son dos hijos en línea, como los compone glossHTML.
     Se comprueban los TRES a la vez, que es la única manera de ver que dicen lo
     mismo. Lo levantó Codex. */
  di('ancla en el editor, el calco y la hoja', await p.evaluate(async ([abrir, fuera]) => {
    const ok = await eval('(' + abrir + ')')(0, 16);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = 'una nota con texto de sobra para que el primer renglón se llene y pase al siguiente';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 250));
    const vista = document.getElementById('glVista');
    const vb = vista.getBoundingClientRect();
    const ae = vista.querySelector('.gl-ref').getBoundingClientRect();
    const editor = { izq: Math.round(ae.left - vb.left), der: Math.round(ae.right - vb.left) };
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 200));
    const calco = [...document.body.children].find(e => e.classList &&
      e.classList.contains('gl-vista') && e.style.position === 'fixed');
    if (!calco) return { sinCalco:true };
    const cb = calco.getBoundingClientRect();
    const ancla = calco.querySelector('.gl-ref');
    const span = [...calco.querySelectorAll('span')]
      .find(x => !x.classList.contains('gl-ref') && !x.classList.contains('gl-tags'));
    const a = ancla.getBoundingClientRect();
    const l1 = span ? span.getClientRects()[0] : null;
    const r = { editor,
      calco: { izq: Math.round(a.left - cb.left), der: Math.round(a.right - cb.left),
               primerRenglon: l1 ? Math.round(l1.left - cb.left) : null },
      /* el texto no puede empezar por debajo del ancla */
      sePisan: l1 ? l1.left < a.right - 1 : null };
    await new Promise(z => setTimeout(z, 3300));
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
      .find(m => (m.nota||'').startsWith('una nota con texto de sobra'));
    const dest = g && document.querySelector('.gl[data-gl="' + g.id + '"]');
    if (dest){
      const db = dest.getBoundingClientRect();
      const ad = dest.querySelector('.gl-ref').getBoundingClientRect();
      r.hoja = { izq: Math.round(ad.left - db.left), der: Math.round(ad.right - db.left) };
    }
    return r;
  }, [ABRIR, FUERA]).then(r => {
    vale('el ancla del calco cae donde la del editor',
         !r.sinTexto && !r.sinCalco && r.calco.izq === r.editor.izq &&
         r.calco.der === r.editor.der,
         JSON.stringify(r.calco) + ' contra ' + JSON.stringify(r.editor));
    /* Un píxel de holgura: son medidas redondeadas del mismo texto al mismo
       cuerpo, y la referencia puede no ser la misma letra —«1a» contra «1b»—
       porque guardar una marca nueva se lleva las que pisa y renumera. Lo que
       se vigila es que el ancla ocupe el mismo sitio, no que dos redondeos
       coincidan. */
    vale('y donde la de la hoja', r.hoja && Math.abs(r.calco.izq - r.hoja.izq) <= 1 &&
         Math.abs(r.calco.der - r.hoja.der) <= 1, JSON.stringify(r.hoja));
    vale('el texto no se le monta encima', r.sePisan === false,
         'renglón en ' + (r.calco||{}).primerRenglon + ', ancla acaba en ' + (r.calco||{}).der);
    return r;
  }));

  titulo('reabrir una glosa ancha no deja hueco de más');
  /* .gl-vista lleva max-width:100%, así que mientras el panel conserve su ancho
     de fábrica el recuadro se queda encogido dentro de él. Midiendo el alto en
     ese momento se mide el de un texto que parte donde NO va a partir, y al
     ensanchar el panel después el alto ya está clavado: queda un blanco al pie
     del recuadro hasta que tocas una tecla. Se ve al pie, que es donde la glosa
     es más ancha que el panel de fábrica. Lo levantó Codex. */
  di('al pie, reabriendo', await p.evaluate(async ([abrir, fuera]) => {
    await p_nada();
    function p_nada(){ return Promise.resolve(); }
    const b = [...document.querySelectorAll('[data-lay]')].find(x => x.dataset.lay === 'foot');
    if (b) b.click();
    await new Promise(z => setTimeout(z, 1400));
    const ok = await eval('(' + abrir + ')')(20, 38);
    if (!ok) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = 'una nota al pie con bastante texto para que ocupe más de un renglón y se note el alto';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]')
      .find(m => (m.nota||'').startsWith('una nota al pie con bastante'));
    if (!g) return { sinGuardar:true };
    const gl = document.querySelector('.gl[data-gl="' + g.id + '"]');
    if (!gl) return { sinGlosa:true };
    gl.dispatchEvent(new MouseEvent('dblclick', { bubbles:true }));
    await new Promise(z => setTimeout(z, 600));
    const t2 = document.getElementById('glosaCaja');
    if (!t2) return { sinReabrir:true };
    const alAbrir = Math.round(t2.getBoundingClientRect().height);
    /* un recálculo como el que haría una tecla: si el alto estaba mal, cambia */
    t2.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 200));
    const r = { alAbrir, trasTecla: Math.round(t2.getBoundingClientRect().height),
                anchoPanel: Math.round(document.getElementById('menu').getBoundingClientRect().width),
                anchoVista: Math.round(document.getElementById('glVista').getBoundingClientRect().width) };
    await eval('(' + fuera + ')')();
    await new Promise(z => setTimeout(z, 3300));
    return r;
  }, [ABRIR, FUERA]).then(r => {
    vale('el alto al abrir ya es el bueno',
         !r.sinTexto && !r.sinReabrir && r.alAbrir === r.trasTecla,
         r.alAbrir + ' contra ' + r.trasTecla);
    vale('y el panel ya nació del ancho de la glosa',
         r.anchoPanel && r.anchoPanel - r.anchoVista <= 24,
         r.anchoPanel + ' contra ' + r.anchoVista);
    return r;
  }));

  titulo('el panel de la glosa va centrado');
  /* Iba centrado en el pasaje, y con un panel estrecho eso era un bocadillo
     que apuntaba. Desde que mide lo que mide la glosa ocupa media pantalla y
     ya no apunta a nada: lo único que hacía era saltar de un lado a otro según
     qué palabra hubieras tocado, y pegarse a un filo cuando el pasaje caía en
     una esquina. De dónde sale ya lo cuenta el crecimiento. */
  di('a la izquierda y a la derecha', await p.evaluate(async ([abrir, fuera]) => {
    const menu = document.getElementById('menu');
    const medir = () => {
      const m = menu.getBoundingClientRect(), e = menu.offsetParent.getBoundingClientRect();
      return { izq: m.left - e.left, der: e.right - m.right };
    };
    /* dos tramos bien separados del renglón: antes uno salía a un lado y el
       otro al otro, y eso es justo lo que deja de pasar */
    if (!await eval('(' + abrir + ')')(0, 10)) return { sinTexto:true };
    const cerca = medir();
    await eval('(' + fuera + ')')();
    if (!await eval('(' + abrir + ')')(56, 70)) return { sinTexto:true };
    const lejos = medir();
    /* y el foco cae en la caja, con el cursor al final: se puede escribir sin
       tener que tocar nada más */
    const ta = document.getElementById('glosaCaja');
    const foco = document.activeElement && document.activeElement.id;
    const cursor = ta ? ta.selectionStart : null;
    await eval('(' + fuera + ')')();
    return { cerca, lejos, foco, cursor,
             largo: ta ? ta.value.length : null };
  }, [ABRIR, FUERA]).then(r => {
    if (r.sinTexto) return vale('el panel va centrado', false, 'sin texto');
    vale('centrado tocando al principio del renglón',
         Math.abs(r.cerca.izq - r.cerca.der) <= 2,
         Math.round(r.cerca.izq) + ' / ' + Math.round(r.cerca.der));
    vale('  y en el mismo sitio tocando al final',
         Math.abs(r.lejos.izq - r.lejos.der) <= 2 &&
         Math.abs(r.cerca.izq - r.lejos.izq) <= 2,
         Math.round(r.lejos.izq) + ' / ' + Math.round(r.lejos.der));
    vale('y el foco nace dentro de la caja', r.foco === 'glosaCaja', r.foco);
    vale('  con el cursor al final de lo que hubiera',
         r.cursor === r.largo, r.cursor + ' de ' + r.largo);
    return r;
  }));

  titulo('el panel se recoge por donde salió');
  /* Nacer despacio y desaparecer de golpe es la peor de las dos mitades: el
     corte llama más la atención que el nacimiento. Cuando no se escribió nada
     no hay vuelo que cuente la salida, así que el panel se recoge hacia el
     pasaje del que salió. Con texto NO, que entonces la salida ya la cuenta el
     vuelo y serían dos despedidas para lo mismo. */
  di('salir sin escribir', await p.evaluate(async ([abrir]) => {
    const menu = document.getElementById('menu');
    if (!await eval('(' + abrir + ')')(50, 66)) return { sinTexto:true };
    const m = menu.getBoundingClientRect();
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 40));
    const an = menu.getAnimations()[0];
    const org = getComputedStyle(menu).transformOrigin.split(' ').map(parseFloat);
    const res = {
      animando: !!an,
      duracion: an ? an.effect.getTiming().duration : null,
      /* a media despedida sigue puesto: si ya estuviera en display:none no se
         estaría viendo nada de lo que se anima */
      aunPuesto: getComputedStyle(menu).display !== 'none',
      /* y no se come el toque siguiente mientras se va */
      sinPunteros: getComputedStyle(menu).pointerEvents === 'none',
      /* se recoge por donde nació: el origen cae dentro del panel */
      dentro: org[0] >= -1 && org[0] <= m.width + 1 &&
              org[1] >= -1 && org[1] <= m.height + 1
    };
    await new Promise(z => setTimeout(z, 400));
    /* y al final se recoge DE VERDAD, que es lo que aplazar el vaciado
       pone en riesgo: un panel invisible pero puesto sigue estorbando */
    res.cerrado = getComputedStyle(menu).display === 'none';
    res.vacio = menu.innerHTML === '';
    res.sinAncho = menu.style.width === '';
    res.punterosDevueltos = menu.style.pointerEvents === '';
    return res;
  }, [ABRIR]).then(r => {
    vale('sale sin escribir y se recoge', !r.sinTexto && r.animando &&
         r.duracion === 140, r.duracion + ' ms');
    vale('  hacia el pasaje del que salió', r.dentro);
    vale('  y mientras se va no estorba', r.aunPuesto && r.sinPunteros);
    vale('acaba recogido del todo', r.cerrado && r.vacio && r.sinAncho &&
         r.punterosDevueltos,
         JSON.stringify({ cerrado:r.cerrado, vacio:r.vacio, ancho:r.sinAncho }));
    return r;
  }));

  di('salir CON texto no se despide dos veces', await p.evaluate(async ([abrir]) => {
    const menu = document.getElementById('menu');
    if (!await eval('(' + abrir + ')')(68, 84)) return { sinTexto:true };
    const ta = document.getElementById('glosaCaja');
    if (!ta) return { sinPanel:true };
    ta.value = 'esta sí se escribe y por eso vuela';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 40));
    return { animaciones: menu.getAnimations().length,
             yaCerrado: getComputedStyle(menu).display === 'none',
             calcosVolando: [...document.body.children].filter(e =>
               e.classList && e.classList.contains('gl-vista')).length };
  }, [ABRIR]).then(r => {
    vale('con texto el panel no se encoge', !r.sinTexto && !r.sinPanel &&
         r.animaciones === 0, r.animaciones);
    vale('  se cierra en seco y vuela el calco',
         r.yaCerrado && r.calcosVolando === 1, r.calcosVolando + ' calco(s)');
    return r;
  }));
  await p.waitForTimeout(2700);              /* que aterrice antes de seguir */

  /* LA REGRESIÓN QUE COSTÓ ENCONTRAR. Aplazar el vaciado abre una rendija:
     reabrir el panel en el instante justo en que la despedida termina. Con
     fill:'forwards' el relleno se quedaba puesto y el panel nuevo salía a
     escala .82 y transparente —abierto y sin verse—. Se prueba con el reabrir
     dentro de la despedida, que es donde se coló. */
  di('reabrir a media despedida', await p.evaluate(async ([abrir]) => {
    const menu = document.getElementById('menu');
    if (!await eval('(' + abrir + ')')(50, 66)) return { sinTexto:true };
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 50));       /* a media despedida */
    if (!await eval('(' + abrir + ')')(20, 38)) return { sinTexto:true };
    await new Promise(z => setTimeout(z, 400));      /* pasado el adiós viejo */
    return { puesto: getComputedStyle(menu).display !== 'none',
             hayCaja: !!document.getElementById('glosaCaja'),
             opacidad: getComputedStyle(menu).opacity,
             transform: getComputedStyle(menu).transform };
  }, [ABRIR]).then(r => {
    vale('el panel reabierto sigue puesto', !r.sinTexto && r.puesto && r.hayCaja);
    vale('  y entero, no fantasma', r.opacidad === '1' && r.transform === 'none',
         'opacidad ' + r.opacidad + ', transform ' + r.transform);
    return r;
  }));
  await p.evaluate(async (fuera) => { await eval('(' + fuera + ')')(); }, FUERA);
  await p.waitForTimeout(300);

  titulo('en una ventana angosta el panel no se sale por la izquierda');
  /* La columna de glosas del teléfono mide 240px clavados, así que en una
     ventana más angosta que eso —pantalla partida, vista incrustada— el panel
     pedía más ancho que la escena y colocarMenu calculaba `s.width - w - 2` en
     NEGATIVO: el filo izquierdo y el principio de cada renglón se quedaban
     fuera, sin nada que desplazar. Es el fallo del alto otra vez, por el otro
     eje. Lo levantó Codex. */
  for (const ancho of [200, 240, 260]){
    const chico = await abrir({ viewport:{ width:ancho, height:760 } });
    di('· ' + ancho + 'px', await chico.pagina.evaluate(async ([abrir]) => {
      const ok = await eval('(' + abrir + ')')(0, 16);
      if (!ok) return { sinTexto:true };
      const menu = document.getElementById('menu');
      const st = document.getElementById('stage');
      if (getComputedStyle(menu).display === 'none') return { sinPanel:true };
      const ta = document.getElementById('glosaCaja');
      ta.value = 'una nota para ver si el recuadro encoge con el panel';
      ta.dispatchEvent(new Event('input', { bubbles:true }));
      await new Promise(z => setTimeout(z, 250));
      const m = menu.getBoundingClientRect(), s = st.getBoundingClientRect();
      const v = document.getElementById('glVista').getBoundingClientRect();
      return { escena: Math.round(s.width), panel: Math.round(m.width),
               vista: Math.round(v.width),
               cabe: m.left >= s.left - 1 && m.right <= s.right + 1,
               /* y el anticipo encoge con él, que es el respaldo honesto */
               vistaDentro: v.left >= m.left - 1 && v.right <= m.right + 1 };
    }, [ABRIR]).then(r => {
      vale('el panel cabe en la escena · ' + ancho,
           !r.sinTexto && !r.sinPanel && r.cabe,
           (r.panel || '?') + ' en ' + (r.escena || '?'));
      vale('  y el anticipo no se le sale', r.vistaDentro, r.vista);
      return r;
    }));
    await cerrarParcial(chico, ancho + 'px');
  }

  /* ================================================================
     UNA GLOSA RECIÉN ESCRITA NO SE ESCONDE DETRÁS DE UN FILTRO.

     Es el defecto que se reportó como «abre y no guarda», y no guardaba nada:
     guardaba y lo escondía, que desde fuera es lo mismo. Los chips de VER del
     panel de Glosas gobiernan visible() —el amarillo de la hoja— y enLista()
     —el renglón del panel—, y una glosa nueva NACE SIN ETIQUETAS. Con un chip
     puesto: escribes la nota, cierras, y no hay amarillo ni renglón. Medido
     antes del arreglo: en el almacén sí, en la hoja no, en la lista tampoco.

     Y el chip se guarda en los ajustes, así que uno de hace días seguía
     escondiendo cada glosa nueva sin decir nada.

     ESTA PRUEBA LLEVA SU PROPIO CONTROL, que es lo que la hace valer: primero
     comprueba que el filtro MUERDE —que con el chip puesto la glosa vieja sin
     esa etiqueta desaparece de la hoja— y solo entonces escribe la nueva. Sin
     el control, un chip que no filtrara nada dejaría todo en verde sin haber
     probado nada.

     La etiqueta de la primera se pone en el almacén y se recarga, como hace
     conGlosas: eso es estado de partida, no el gesto que se está probando. El
     resto —marcar el chip, escribir la glosa— va con gestos. */
  titulo('una glosa nueva no se queda escondida detrás de un filtro');
  const filtros = await abrir(TELEFONO);
  const q = filtros.pagina;
  const alPanelDeGlosas = () => q.evaluate(async () => {
    if (document.getElementById('etiquetas').classList.contains('abierto')) return;
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const t = [...document.querySelectorAll('.pestanas button')].find(x => /glosas/i.test(x.textContent));
    if (t) t.click();
    await new Promise(z => setTimeout(z, 900));
  });
  const escribirGlosa = (nota, desde, hasta) => q.evaluate(async ([abrir, nota, d, h]) => {
    const ok = await eval('(' + abrir + ')')(d, h);
    if (!ok) return false;
    const ta = document.getElementById('glosaCaja');
    if (!ta) return false;
    ta.value = nota; ta.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(z => setTimeout(z, 200));
    /* Tocar fuera DE VERDAD, que es como se cierra: el oyente que cobra lo
       escrito va en captura sobre el pointerdown. */
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await new Promise(z => setTimeout(z, 900));
    return true;
  }, [ABRIR, nota, desde, hasta]);
  const retrato = nota => q.evaluate(nota => {
    const ms = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
    const ind = document.getElementById('indice');
    return {
      enElAlmacen: ms.some(m => (m.nota || '') === nota),
      /* el amarillo de la hoja: la nota al margen es una .gl con su texto */
      enLaHoja: [...document.querySelectorAll('.gl')].some(g => g.textContent.includes(nota)),
      enLaLista: !!ind && ind.textContent.includes(nota),
      panelPuesto: document.getElementById('etiquetas').classList.contains('abierto'),
      chips: [...document.querySelectorAll('#etiquetas .chip.sel')].map(c => c.textContent.trim()),
      aviso: document.getElementById('readout').textContent || ''
    };
  }, nota);

  /* La primera, con su etiqueta puesta desde el almacén. */
  await escribirGlosa('la vieja etiquetada', 0, 16);
  await q.evaluate(() => {
    const ms = JSON.parse(localStorage.getItem('glossa:marcas:v1'));
    const m = ms.find(x => x.nota === 'la vieja etiquetada');
    if (m) m.etiquetas = ['estudio'];
    localStorage.setItem('glossa:marcas:v1', JSON.stringify(ms));
  });
  await q.reload();

  /* Y se marca su chip, que es el filtro. */
  await alPanelDeGlosas();
  const marcado = await q.evaluate(async () => {
    /* De estreno hay tres glosas etiquetadas «Interesante»; se mira una de
       ellas ANTES y DESPUÉS de marcar el chip, que es el control de verdad:
       comprobar solo el después no distingue «el filtro la escondió» de «esa
       glosa no caía en esta hoja». */
    const hay = t => [...document.querySelectorAll('.gl')].some(g => t.test(g.textContent));
    const antes = hay(/El título real/);
    const busca = () => [...document.querySelectorAll('#etiquetas .chip')]
                          .find(b => /estudio/.test(b.textContent));
    const c = busca();
    if (!c) return { falta: [...document.querySelectorAll('#etiquetas .chip')].map(b => b.textContent.trim()) };
    c.click();
    await new Promise(z => setTimeout(z, 900));
    /* SE VUELVE A BUSCAR: pintarFiltros rehace los chips en cada repintado, así
       que el de antes ya no está en el documento y su clase no cuenta nada. */
    const vivo = busca();
    return { puesto: !!vivo && vivo.classList.contains('sel'),
             antes, despues: hay(/El título real/) };
  });
  vale('el chip del filtro queda marcado', marcado.puesto === true, marcado.falta || marcado);
  /* EL CONTROL: si el filtro no muerde, lo de abajo no prueba nada. */
  vale('CONTROL: sin el chip esa glosa se veía, y con el chip ya no',
       marcado.antes === true && marcado.despues === false,
       'antes ' + marcado.antes + ' · después ' + marcado.despues);

  /* Y ahora la glosa nueva, que nace sin etiquetas. */
  const escribio = await escribirGlosa('la nueva sin etiqueta', 30, 50);
  vale('se pudo escribir la glosa nueva', escribio === true);
  const r = await retrato('la nueva sin etiqueta');
  di('el aviso', r.aviso);
  di('los chips que quedan', r.chips);
  vale('se guarda', r.enElAlmacen === true);
  vale('SE VE EN LA HOJA, que es lo que fallaba', r.enLaHoja === true);
  vale('el filtro que la escondía se quitó',
       !r.chips.some(c => /estudio/.test(c)), r.chips);
  vale('y se dice por qué', /escond/i.test(r.aviso), r.aviso);
  await alPanelDeGlosas();
  const enLista = await q.evaluate(() =>
    (document.getElementById('indice').textContent || '').includes('la nueva sin etiqueta'));
  vale('y sale en la lista de glosas', enLista === true);
  await cerrarParcial(filtros, 'filtros');

  /* ================================================================
     LA LISTA DE ETIQUETAS: CÓMO LLEGA Y CÓMO SE VA.

     Dos cosas que no se ven mirando una captura, y por eso se miden aquí:

     1. QUE ESTÉ COMPUESTA ANTES DE PEDIRLA. La caja vive con display:none, así
        que sus botones no existen para el navegador hasta que se despliega, y
        la primera apertura pagaba componerlos y medirlos dentro del manejador.
        Medido a un sexto de CPU con 34 etiquetas: 30 ms la primera y 13 las
        siguientes. Se calienta al nacer el panel; lo que se comprueba es que
        el alto quedó apuntado, que es la huella de que se compuso.

     2. QUE EL PANEL NO DESAPAREZCA DE GOLPE con la lista abierta. Cuando lo
        escrito sale volando al margen, el panel se quitaba en un cuadro: el
        vuelo contaba la salida. Con la lista desplegada el panel mide más del
        doble, y lo que vuela sigue siendo una nota, así que media pantalla se
        esfumaba sin que nada la explicara. Se mide contando CUADROS: con el
        fallo puesto, uno.
     ================================================================ */
  const etiq = await abrir();
  const e = etiq.pagina;
  await conGlosas(e);
  titulo('la lista de etiquetas se compone antes de pedirla');
  const lista = await e.evaluate(async () => {
    const pausa = ms => new Promise(z => setTimeout(z, ms));
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 70){ n = w.currentNode; break; }
    if (!n) return { sinTexto:true };
    const rg = document.createRange(); rg.setStart(n, 0); rg.setEnd(n, 15);
    getSelection().removeAllRanges(); getSelection().addRange(rg);
    const rc = rg.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX: Math.round(rc.left + 2), clientY: Math.round(rc.top + 2) }));
    await pausa(800);
    const m = document.getElementById('menu');
    const caja = m.querySelector('.tagbox');
    /* La huella de calentarTags: el alto apuntado con la caja todavía cerrada. */
    const calentada = !!caja && caja._alto > 0;
    const cerradaAun = !!caja && !caja.classList.contains('abierta');
    /* Con nota, que la lista dormida no responde. */
    const ta = document.getElementById('glosaCaja');
    ta.value = 'nota para las etiquetas';
    ta.dispatchEvent(new Event('input', { bubbles:true }));
    await pausa(300);
    const bt = m.querySelector('[data-acc="vertags"]');
    bt.dispatchEvent(new MouseEvent('click', { bubbles:true, detail:1 }));
    await pausa(900);
    const abierta = caja.classList.contains('abierta');
    const altoPanel = Math.round(m.getBoundingClientRect().height);
    /* Y ahora se cierra tocando fuera, filmando cuadro a cuadro cómo se va. */
    const cuadros = [];
    const t0 = performance.now();
    const peli = (async () => {
      while (performance.now() - t0 < 700){
        const cs = getComputedStyle(m);
        if (cs.display !== 'none') cuadros.push(+(+cs.opacity).toFixed(2));
        await new Promise(z => requestAnimationFrame(z));
      }
    })();
    document.body.dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:5, clientY:5 }));
    await peli;
    return { calentada, cerradaAun, alto: Math.round(caja._alto || 0), abierta, altoPanel,
             cuadros: cuadros.length, opacidades: cuadros.join(' ') };
  });
  di('la lista', { compuesta: lista.calentada, alto: lista.alto,
                   altoDelPanel: lista.altoPanel, cuadrosAlIrse: lista.cuadros });
  di('las opacidades', lista.opacidades);
  vale('SE COMPONE AL NACER EL PANEL, sin esperar a que la pidan',
       lista.calentada === true, 'alto apuntado: ' + lista.alto + ' px');
  vale('  y se queda cerrada, que es como nace', lista.cerradaAun === true);
  vale('la lista se despliega', lista.abierta === true);
  /* Con el fallo puesto esto daba 1: el panel se quitaba en un cuadro. */
  vale('Y EL PANEL SE VA FUNDIÉNDOSE, no de golpe',
       lista.cuadros >= 5, lista.cuadros + ' cuadros');
  vale('  bajando la opacidad hasta cero',
       /0\.\d/.test(lista.opacidades || '') && / 0$/.test(' ' + (lista.opacidades || '')),
       lista.opacidades);
  await cerrarParcial(etiq, 'la lista de etiquetas');

  await cerrar(sesion);
})();
