/* LAS ETIQUETAS: LAS CUATRO MANERAS DE PONERLAS, Y EL DESAJUSTE.

   El fallo que vivió aquí es el que más miedo da de todos: el control decía
   una cosa y el programa hacía otra. Escribías una etiqueta nueva, el
   desplegable volvía a "— ninguna —", y sin embargo la glosa siguiente salía
   etiquetada. No se descubre usando la aplicación —o crees que no funcionó y
   lo repites, o ni miras—; solo se ve comparando el control con el almacén.
   Por eso esta prueba compara siempre las dos cosas. */
const { abrir, cerrar, di, vale, titulo } = require('./comun');

(async () => {
  const sesion = await abrir();
  const p = sesion.pagina;
  const alPanel = () => p.evaluate(async () => {
    if (document.getElementById('etiquetas').classList.contains('abierto')) return;
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const t = [...document.querySelectorAll('.pestanas button')].find(x => /glosas/i.test(x.textContent));
    if (t) t.click();
    await new Promise(z => setTimeout(z, 900));
  });

  titulo('crear una etiqueta y dejarla activa');
  await alPanel();
  di('escribir + Enter', await p.evaluate(async () => {
    const i = document.getElementById('nuevaEtiqueta');
    i.value = 'promesas';
    i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
    await new Promise(z => setTimeout(z, 700));
    const sel = document.getElementById('selActiva');
    return { desplegable: sel.value, campoLimpio: i.value === '',
             banda: !document.getElementById('banda').classList.contains('apagada') };
  }).then(r => {
    vale('el desplegable la enseña', r.desplegable === 'promesas', r.desplegable || '(vacío)');
    vale('la banda se enciende', r.banda);
    return r;
  }));

  titulo('espacios seguidos y comillas');
  /* Un <option> sin value deduce su valor del texto y COLAPSA los espacios; y
     esc() no escapaba comillas, que se meten dentro de atributos. Las dos
     cosas devolvían el desplegable a "— ninguna —" con la banda encendida. */
  for (const raro of ['oración  diaria', 'la "roca"']){
    const r = await p.evaluate(async v => {
      const i = document.getElementById('nuevaEtiqueta');
      i.value = v;
      i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      await new Promise(z => setTimeout(z, 700));
      return { puesta: document.getElementById('selActiva').value };
    }, raro);
    vale('sobrevive «' + raro + '»', r.puesta === raro, JSON.stringify(r.puesta));
  }
  /* se vuelve a dejar la buena */
  await p.evaluate(async () => {
    const i = document.getElementById('nuevaEtiqueta');
    i.value = 'promesas';
    i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
    await new Promise(z => setTimeout(z, 700));
  });

  titulo('1 · la glosa nueva la hereda');
  di('creada', await p.evaluate(async () => {
    document.getElementById('pgCabeza').click();
    await new Promise(z => setTimeout(z, 900));
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 20){ n = w.currentNode; break; }
    const r = document.createRange(); r.setStart(n,0); r.setEnd(n,15);
    getSelection().removeAllRanges(); getSelection().addRange(r);
    const rc = r.getBoundingClientRect();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:rc.left+2, clientY:rc.top+2 }));
    await new Promise(z => setTimeout(z, 400));
    [...document.querySelectorAll('#menu button')].find(x => /Glosa/.test(x.textContent)).click();
    await new Promise(z => setTimeout(z, 800));
    document.querySelector('.gl-movil textarea').value = 'una nota etiquetada';
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerdown',
      { bubbles:true, clientX:200, clientY:700 }));
    await new Promise(z => setTimeout(z, 5600));
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]');
    return { etiquetas: g[g.length-1] && g[g.length-1].etiquetas,
             enLaHoja: [...document.querySelectorAll('.gl-tag')].map(x => x.textContent) };
  }).then(r => {
    vale('la lleva puesta', (r.etiquetas||[]).includes('promesas'), r.etiquetas);
    vale('y se ve en la hoja', r.enLaHoja.length > 0, r.enLaHoja);
    return r;
  }));

  titulo('2 · el panel de UNA marca');
  /* Se llega tocando el TEXTO SUBRAYADO, no la tarjeta de la glosa. */
  di('poner y quitar', await p.evaluate(async () => {
    const v = document.querySelector('#pgBody .v');
    const w = document.createTreeWalker(v, NodeFilter.SHOW_TEXT); let n = null;
    while (w.nextNode()) if (w.currentNode.textContent.trim().length > 20){ n = w.currentNode; break; }
    const r = document.createRange(); r.setStart(n,3); r.setEnd(n,4);
    const rc = r.getBoundingClientRect();
    getSelection().removeAllRanges();
    document.getElementById('pgBody').dispatchEvent(new PointerEvent('pointerup',
      { bubbles:true, clientX:Math.round(rc.left+rc.width/2), clientY:Math.round(rc.top+rc.height/2) }));
    await new Promise(z => setTimeout(z, 600));
    const bt = [...document.querySelectorAll('#menu button')].find(x => /^#/.test(x.textContent.trim()));
    if (!bt) return { menu: document.getElementById('menu').textContent.slice(0,60) };
    bt.click();
    await new Promise(z => setTimeout(z, 500));
    /* crear una desde aquí mismo */
    const i = document.getElementById('tagNueva');
    i.value = 'reino';
    i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
    await new Promise(z => setTimeout(z, 600));
    const tras = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]');
    const puestas = tras[tras.length-1].etiquetas;
    /* y apagar una tocándola */
    const t = [...document.querySelectorAll('#menu .tg')].find(x => x.classList.contains('on'));
    const apagada = t.textContent;
    t.click();
    await new Promise(z => setTimeout(z, 600));
    const fin = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]');
    return { boton: bt.textContent.trim(), puestas, apagada, quedan: fin[fin.length-1].etiquetas };
  }).then(r => {
    vale('el botón # abre el panel', !!r.boton, r.boton);
    vale('crear una desde ahí la pone', (r.puestas||[]).length === 2, r.puestas);
    vale('tocarla la quita', (r.quedan||[]).length === 1, r.apagada + ' → ' + JSON.stringify(r.quedan));
    return r;
  }));

  titulo('3 · etiquetar un día entero');
  await p.evaluate(() => document.querySelectorAll('#menu button[data-acc="listo"]').forEach(b => b.click()));
  await alPanel();
  di('el botón del día', await p.evaluate(async () => {
    const s = document.getElementById('selDia'), b = document.getElementById('btnEtiquetarDia');
    const sinDia = b.disabled;
    const dia = [...s.options].map(o => o.value).find(v => v);
    s.value = dia; s.dispatchEvent(new Event('change', { bubbles:true }));
    await new Promise(z => setTimeout(z, 1000));
    const dice = b.textContent.trim();
    b.click();
    await new Promise(z => setTimeout(z, 1200));
    const g = JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]');
    return { sinDia, dia, dice, conLaActiva: g.filter(m => (m.etiquetas||[]).includes('promesas')).length };
  }).then(r => {
    vale('apagado mientras falta el día', r.sinDia);
    vale('dice qué etiqueta pondrá', /promesas/.test(r.dice), r.dice);
    vale('y la pone', r.conLaActiva > 0, r.conLaActiva + ' marca(s)');
    return r;
  }));

  titulo('4 · los chips de «ver» filtran');
  di('apagar un chip', await p.evaluate(async () => {
    const antes = document.querySelectorAll('#pgMargin .gl[data-gl], #pgBody .gl[data-gl]').length;
    const chip = [...document.querySelectorAll('#filtros .chip')].find(c => /reino/.test(c.textContent));
    if (!chip) return { sinChip:true };
    chip.click();
    await new Promise(z => setTimeout(z, 1200));
    const apagado = document.querySelectorAll('#pgMargin .gl[data-gl], #pgBody .gl[data-gl]').length;
    chip.click();
    await new Promise(z => setTimeout(z, 1200));
    return { antes, apagado,
             vuelven: document.querySelectorAll('#pgMargin .gl[data-gl], #pgBody .gl[data-gl]').length };
  }).then(r => {
    vale('esconde', !r.sinChip && r.apagado < r.antes, r.antes + ' → ' + r.apagado);
    vale('y devuelve', !r.sinChip && r.vuelven === r.antes, '→ ' + r.vuelven);
    return r;
  }));

  titulo('la activa sobrevive a cerrar la aplicación');
  await p.reload(); await p.waitForTimeout(2800);
  di('tras recargar', await p.evaluate(() => ({
    activa: document.getElementById('selActiva').value,
    banda: !document.getElementById('banda').classList.contains('apagada'),
    marcas: JSON.parse(localStorage.getItem('glossa:marcas:v1')||'[]').length })).then(r => {
    vale('la etiqueta activa sigue puesta', r.activa === 'promesas', r.activa || '(vacío)');
    vale('con su banda encendida', r.banda);
    vale('y las marcas siguen ahí', r.marcas > 0, r.marcas);
    return r;
  }));

  await cerrar(sesion);
})();
