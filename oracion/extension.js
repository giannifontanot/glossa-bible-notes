/* ================================================================
   Extensión inferior del escritorio (módulo independiente).

   Gesto tipo cajón: arrastrar VERTICALMENTE sobre el fondo (nunca
   sobre una hoja, un botón o el cofre) mueve el escritorio completo
   (#world) y revela la extensión #lower-deck.

   - Zona muerta inicial (deadZonePx): el escritorio no se mueve con
     roces accidentales; hay que hacer un gesto deliberado.
   - Superada la zona muerta, el escritorio sigue al dedo 1:1.
   - Al soltar: si se recorrió más de snapRatio del alto, se asienta
     en el otro estado; si no, regresa. Sin rebotes.

   No toca ninguna funcionalidad existente: el swipe horizontal de
   páginas exige un gesto mayormente horizontal y este exige uno
   mayormente vertical, así que nunca se disparan juntos.
   ================================================================ */
(() => {
  "use strict";
  const CFG = (window.CONFIG && window.CONFIG.lowerDeck) || {};
  const DEAD = CFG.deadZonePx || 48;
  const SNAP_RATIO = CFG.snapRatio || 0.25;
  const SNAP_MS = CFG.snapMs || 280;

  const world = document.getElementById("world");
  const deck = document.getElementById("lower-deck");
  if (!world || !deck) return;

  document.documentElement.style.setProperty("--deck-snap-ms", SNAP_MS + "ms");

  let open = false;      // ¿la extensión está revelada?
  let shift = 0;         // desplazamiento actual del mundo (px, <= 0)
  let pointerId = null;
  let startX = 0, startY = 0;
  let engaged = false;   // ¿se venció la zona muerta?
  let engageY = 0;       // Y del dedo al vencerla (el 1:1 arranca aquí)
  let base = 0;          // desplazamiento al iniciar el gesto

  const deckHeight = () => deck.offsetHeight;

  function setShift(px, snapping) {
    shift = px;
    world.classList.toggle("deck-snapping", !!snapping);
    world.style.setProperty("--deck-shift", px + "px");
  }

  world.addEventListener("pointerdown", (e) => {
    // Solo el fondo: hojas, botones y cofre conservan sus gestos intactos.
    if (e.target.closest(".leaf")) return;
    if (e.target.closest("button")) return;
    if (e.target.closest("#treasure")) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    engaged = false;
    base = open ? -deckHeight() : 0;
  });

  window.addEventListener("pointermove", (e) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!engaged) {
      if (Math.abs(dy) <= DEAD) return;         // zona muerta: gesto corto
      if (Math.abs(dy) <= Math.abs(dx)) return; // gesto no vertical
      if (!open && dy > 0) return;              // cerrado: solo hacia arriba
      if (open && dy < 0) return;               // abierto: solo hacia abajo
      engaged = true;
      engageY = e.clientY; // desde aquí el movimiento es 1:1, sin salto
    }
    const raw = base + (e.clientY - engageY);
    setShift(Math.max(-deckHeight(), Math.min(0, raw)), false);
  });

  window.addEventListener("pointerup", (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    if (!engaged) return;
    engaged = false;
    const travelled = Math.abs(shift - base);
    if (travelled > deckHeight() * SNAP_RATIO) open = !open;
    setShift(open ? -deckHeight() : 0, true);
  });

  window.addEventListener("pointercancel", (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    engaged = false;
    setShift(open ? -deckHeight() : 0, true);
  });

  // Rotar el teléfono o redimensionar: reasentar sin dejar huecos.
  window.addEventListener("resize", () => {
    setShift(open ? -deckHeight() : 0, false);
  });

  // ----------------------------------------------------------------
  // Pestañas de idioma de las instrucciones (Español por defecto).
  // ----------------------------------------------------------------
  const tabs = deck.querySelectorAll(".deck-tab");
  const panels = deck.querySelectorAll(".deck-panel");
  function showLang(lang) {
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.lang === lang));
    panels.forEach((p) => { p.hidden = p.dataset.lang !== lang; });
  }
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => showLang(tab.dataset.lang));
  });
})();
