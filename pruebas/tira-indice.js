/* El resorte se mide desde fuera, fotograma a fotograma. No se llama a la
   navegación de la aplicación: el índice recibe clics físicos y la tira una
   rueda real. Así se caza también un ResizeObserver que corte el viaje. */
const { di, vale, titulo } = require('./comun');

async function probarMovimientoIndice(p, seccion){
  const raiz = '#' + seccion;
  const indice = p.locator(raiz + ' .indice-tab');
  const entradas = p.locator(raiz + ' .indice-item');
  const empezar = async () => {
    await indice.click();
    await entradas.first().click();
    await p.waitForTimeout(600);
    await indice.click();
  };
  const observar = (primera = false) => p.evaluate(({ selector, primera }) => {
    const c = document.querySelector(selector), b = c.querySelector('.pestanitas');
    const m = window.__medicionTiraIndice = { lista:[], terminado:false };
    /* El reloj arranca con el clic, no mientras Playwright todavía está
       desplazando la lista vertical para alcanzar su última entrada. */
    const entradas = c.querySelectorAll('.indice-item');
    entradas[primera ? 0 : entradas.length - 1].addEventListener('click', () => {
      const t0 = performance.now();
      const tomar = () => {
        m.lista.push({ tiempo:performance.now() - t0, scroll:b.scrollLeft,
          desplazamiento:b.getBoundingClientRect().left - b.parentElement.getBoundingClientRect().left,
          indice:c.querySelector('.indice-tab').getBoundingClientRect().left });
        if (performance.now() - t0 < 700) requestAnimationFrame(tomar);
        else m.terminado = true;
      };
      tomar();
    }, { once:true, capture:true });
  }, { selector:raiz, primera });
  const recoger = async () => {
    await p.waitForFunction(() => window.__medicionTiraIndice.terminado);
    return p.evaluate(selector => {
      const b = document.querySelector(selector + ' .pestanitas');
      return { lista:window.__medicionTiraIndice.lista, final:b.scrollLeft,
        distancia:b.querySelector('.aqui').getBoundingClientRect().left -
          b.getBoundingClientRect().left };
    }, raiz);
  };
  const medir = () => p.locator(raiz + ' .pestanitas').evaluate(b => ({
    scroll:b.scrollLeft,
    distancia:b.querySelector('.aqui').getBoundingClientRect().left -
      b.getBoundingClientRect().left
  }));

  titulo(seccion + ': elegir desde el índice desplaza con resorte la última pestaña');
  await empezar();
  await observar();
  await entradas.last().click();
  const viaje = await recoger();
  di('fotogramas de la tira', viaje);
  vale('la tira recorre posiciones intermedias, no salta al destino',
       viaje.final > 10 && new Set(viaje.lista.map(m => m.scroll)).size > 3 &&
       viaje.lista.some(m => m.scroll > 1 && m.scroll < viaje.final - 1), viaje.final);
  vale('se pasa un poco y vuelve: el resorte es visible',
       Math.max(...viaje.lista.map(m => m.scroll)) >= viaje.final + 6 &&
       Math.max(...viaje.lista.map(m => m.scroll)) <= viaje.final + 10,
       Math.max(...viaje.lista.map(m => m.scroll)) - viaje.final);
  vale('incluso la última pestaña aterriza junto al Índice',
       Math.abs(viaje.distancia) <= 1, viaje.distancia);
  vale('la pestaña Índice no se mueve con la tira',
       viaje.lista.every(m => Math.abs(m.indice - viaje.lista[0].indice) <= 1));

  titulo(seccion + ': el borde izquierdo no recorta el resorte');
  await indice.click();
  await observar(true);
  await entradas.first().click();
  const regreso = await recoger();
  vale('la primera pestaña rebota también al volver desde la última',
       Math.max(...regreso.lista.map(m => m.desplazamiento)) >= 6,
       Math.max(...regreso.lista.map(m => m.desplazamiento)));
  vale('termina alineada y el Índice permanece fijo',
       regreso.final <= 1 && Math.abs(regreso.distancia) <= 1 &&
       Math.abs(regreso.lista.at(-1).desplazamiento) <= 1 &&
       regreso.lista.every(m => Math.abs(m.indice - regreso.lista[0].indice) <= 1));

  titulo(seccion + ': elegir una página ya alineada acusa con resorte');
  await indice.click();
  await observar(true);
  await entradas.first().click();
  const alineada = await recoger();
  vale('se percibe el rebote aunque no haya recorrido de scroll',
       alineada.lista.every(m => m.scroll <= 1) &&
       Math.max(...alineada.lista.map(m => m.desplazamiento)) >= 6,
       Math.max(...alineada.lista.map(m => m.desplazamiento)));
  vale('el desplazamiento visual se retira al terminar',
       Math.abs(alineada.lista.at(-1).desplazamiento) <= 1 &&
       Math.abs(alineada.distancia) <= 1);

  titulo(seccion + ': la rueda del lector cancela el viaje automático');
  await empezar();
  await entradas.last().click();
  await p.waitForTimeout(150);
  const caja = await p.locator(raiz + ' .pestanitas').boundingBox();
  await p.mouse.move(caja.x + 30, caja.y + caja.height / 2);
  await p.mouse.wheel(0, -40);
  await p.waitForTimeout(100);
  const detenido = await medir();
  await p.waitForTimeout(600);
  const despues = await medir();
  vale('no vuelve a arrancar después de la rueda',
       Math.abs(detenido.scroll - despues.scroll) <= 1 && Math.abs(despues.distancia) > 2,
       { detenido, despues });

  titulo(seccion + ': otro clic sustituye el movimiento pendiente');
  await empezar();
  await entradas.last().click();
  await p.waitForTimeout(100);
  await p.locator(raiz + ' .pestanitas [data-nota], ' +
    raiz + ' .pestanitas [data-enc]').first().click();
  /* NOTAS reserva medio segundo al segundo clic para no perder el renombrado. */
  await p.waitForTimeout(1100);
  const sustituido = await medir();
  vale('se queda en la primera pestaña, sin retomar el destino viejo',
       sustituido.scroll <= 1 && Math.abs(sustituido.distancia) <= 1, sustituido);

  titulo(seccion + ': reducir movimiento evita tanto el deslizamiento como el resorte');
  await p.emulateMedia({ reducedMotion:'reduce' });
  await empezar();
  await observar();
  await entradas.last().click();
  const inmediato = await medir();
  const reducido = await recoger();
  vale('con movimiento reducido aterriza inmediatamente',
       inmediato.scroll > 10 && Math.abs(inmediato.distancia) <= 1, inmediato);
  vale('no pasa por posiciones intermedias ni rebota',
       reducido.lista.every(m => m.scroll <= 1 || Math.abs(m.scroll - reducido.final) <= 1),
       [...new Set(reducido.lista.map(m => m.scroll))]);
  await indice.click();
  await observar(true);
  await entradas.first().click();
  const reducidoInicio = await recoger();
  vale('el borde izquierdo tampoco rebota con movimiento reducido',
       reducidoInicio.final <= 1 && Math.abs(reducidoInicio.distancia) <= 1 &&
       reducidoInicio.lista.every(m => Math.abs(m.desplazamiento) <= 1));
  await p.emulateMedia({ reducedMotion:'no-preference' });
  await indice.click();
}

module.exports = { probarMovimientoIndice };
