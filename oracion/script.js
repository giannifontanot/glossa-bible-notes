// script.js — Sticky Shapes (Árbol de Oración)
// Toda la lógica de la aplicación. No contiene valores fijos:
// todo lo configurable proviene de window.CONFIG (config.js).

(function () {
  "use strict";

  const CONFIG = window.CONFIG;
  const canvas = document.getElementById("canvas");
  const leafLayer = document.getElementById("leaf-layer");
  const addBtn = document.getElementById("add-btn");
  const newWsBtn = document.getElementById("new-ws-btn");
  const delWsBtn = document.getElementById("del-ws-btn");
  const fontBtn = document.getElementById("font-btn");
  const fontColorBtn = document.getElementById("font-color-btn");
  const fontPlusBtn = document.getElementById("font-plus-btn");
  const fontMinusBtn = document.getElementById("font-minus-btn");
  const wsDots = document.getElementById("ws-dots");
  const zoneLabels = document.getElementById("zone-labels");
  const treasure = document.getElementById("treasure");

  // Apilamiento: cada toque trae la hoja al frente. El orden se restaura al
  // recargar usando updatedAt (la última tocada queda hasta arriba).
  let zTop = 10;

  // Temporizador del retardo para "armar" los puntos de escritorio al
  // arrastrar una hoja cerca de ellos (ver CONFIG.dotArmDelayMs).
  let dotArmTimer = null;

  // ---------------------------------------------------------------
  // Formas de hoja (SVG). Registro genérico: para añadir una variante,
  // agrégala aquí y en CONFIG.leafShapes — la lógica no cambia.
  // Cada entrada dibuja dentro de un viewBox 0 0 100 100.
  // ---------------------------------------------------------------
  const LEAF_PATHS = {
    "leaf-oak": {
      body: "M50 4 C60 16 76 18 74 32 C88 34 84 48 76 54 C88 62 78 76 66 74 C64 88 54 92 50 96 C46 92 36 88 34 74 C22 76 12 62 24 54 C16 48 12 34 26 32 C24 18 40 16 50 4 Z",
      vein: "M50 12 L50 88 M50 40 L32 30 M50 40 L68 30 M50 62 L32 56 M50 62 L68 56",
    },
    "leaf-maple": {
      body: "M50 4 L58 22 L74 12 L70 32 L92 30 L76 46 L94 58 L72 60 L80 80 L58 68 L50 96 L42 68 L20 80 L28 60 L6 58 L24 46 L8 30 L30 32 L26 12 L42 22 Z",
      vein: "M50 14 L50 86 M50 50 L26 34 M50 50 L74 34 M50 58 L30 68 M50 58 L70 68",
    },
    "leaf-simple": {
      body: "M50 4 C82 24 88 60 50 96 C12 60 18 24 50 4 Z",
      vein: "M50 10 L50 90 M50 34 L34 26 M50 34 L66 26 M50 56 L32 46 M50 56 L68 46 M50 76 L38 68 M50 76 L62 68",
    },
    // Hoja de maple clásica: 5 lóbulos con muescas profundas y tallo.
    // Menos picos, silueta tipo bandera de Canadá. Roja vía leafStyles.
    "leaf-maple-red": {
      body: "M50 4 L57 20 L71 13 L66 30 L89 34 L74 47 L82 62 L63 58 L60 75 L53 66 L52 70 L53 92 L47 92 L48 70 L47 66 L40 75 L37 58 L18 62 L26 47 L11 34 L34 30 L29 13 L43 20 Z",
      vein: "M50 12 L50 70 M50 45 L30 30 M50 45 L70 30 M50 58 L36 52 M50 58 L64 52",
    },
    // Pergamino horizontal para notas de una sola línea: hoja central con
    // bordes irregulares y dos rollos en espiral en los extremos. Mucho más
    // ancho que alto. El body es compuesto (rollos + hoja); las venas dibujan
    // las espirales y la costura de cada rollo.
    "leaf-scroll": {
      body:
        // hoja central: el doble de larga (desborda la caja) y 30% más delgada
        "M-6 38 Q50 42 106 38 L106 62 Q50 66 -6 62 Z " +
        // rollo izquierdo (barra vertical redondeada, más delgada)
        "M-16 36 C-16 32 -12 31 -11 31 C-10 31 -6 32 -6 36 L-6 64 C-6 68 -10 69 -11 69 C-12 69 -16 68 -16 64 Z " +
        // rollo derecho
        "M106 36 C106 32 110 31 111 31 C112 31 116 32 116 36 L116 64 C116 68 112 69 111 69 C110 69 106 68 106 64 Z",
      vein:
        // espiral en la parte alta de cada rollo (la cinta enrollada)
        "M-15 34 C-10 34 -9 39 -14 39 C-18 39 -18 34 -14 34 " +
        "M115 34 C110 34 109 39 114 39 C118 39 118 34 114 34 " +
        // línea de pliegue donde la hoja se une a cada rollo
        "M-2 40 L-2 60 M102 40 L102 60",
    },
  };

  // ---------------------------------------------------------------
  // Tema: escribe la paleta de CONFIG.theme como variables CSS en :root
  // para que style.css la consuma (una sola fuente de verdad).
  // ---------------------------------------------------------------
  function applyTheme() {
    const t = CONFIG.theme;
    const root = document.documentElement.style;
    root.setProperty("--bg", t.background);
    root.setProperty("--tree", t.treeStroke);
    root.setProperty("--tree-fill", t.treeFill);
    root.setProperty("--bark-dark", t.barkDark);
    root.setProperty("--canopy", t.canopy);
    root.setProperty("--canopy-fill", t.canopyFill);
    root.setProperty("--grass", t.grass);
    root.setProperty("--leaf-fill", t.leafFill);
    root.setProperty("--leaf-glow", t.leafGlow);
    root.setProperty("--text", t.text);
    root.setProperty("--accent", t.accent);
    root.setProperty("--treasure", t.treasure);
    root.setProperty("--edit-ctrl", t.editControl || t.accent);
    root.setProperty("--leaf-text-size", t.leafTextSize + "px");
    root.setProperty("--zone-label-size", t.zoneLabelSize + "px");
    root.setProperty("--glow", t.glowBlur + "px");
    root.setProperty("--font", t.fontFamily);
    root.setProperty(
      "--anim-ms",
      (CONFIG.animations.enabled ? CONFIG.animations.durationMs : 0) + "ms"
    );
    root.setProperty(
      "--swallow-ms",
      (CONFIG.animations.enabled ? CONFIG.animations.swallowMs : 0) + "ms"
    );
    root.setProperty(
      "--ws-fade-ms",
      (CONFIG.animations.enabled ? CONFIG.animations.workspaceFadeMs : 0) + "ms"
    );
  }

  // ---------------------------------------------------------------
  // Persistencia en Local Storage (guardado automático, sin botón).
  // Modelo v3: múltiples escritorios (workspaces). Cada workspace tiene su
  // propia lista de hojas y su propio árbol. La estructura de cada hoja no
  // cambia respecto a versiones anteriores.
  // ---------------------------------------------------------------
  let state = {
    version: CONFIG.schemaVersion,
    workspaces: [],
    activeWorkspaceId: null,
  };

  function makeWorkspace() {
    return {
      id: "ws_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nodes: [],
      tree: CONFIG.defaultTree,
    };
  }

  // Escritorio activo (siempre existe uno tras loadState).
  function activeWorkspace() {
    return (
      state.workspaces.find((w) => w.id === state.activeWorkspaceId) ||
      state.workspaces[0]
    );
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.workspaces)) {
          // Ya está en el formato nuevo (v3).
          state = parsed;
        } else if (parsed && Array.isArray(parsed.nodes)) {
          // MIGRACIÓN del formato viejo (una sola lista de hojas) → un
          // escritorio único que conserva todas las hojas existentes.
          const ws = makeWorkspace();
          ws.nodes = parsed.nodes;
          ws.tree = parsed.tree || CONFIG.defaultTree;
          state = {
            version: CONFIG.schemaVersion,
            workspaces: [ws],
            activeWorkspaceId: ws.id,
          };
        }
      }
    } catch (_) {
      // Dato corrupto: fallo elegante, se arranca vacío.
    }
    // Garantizar siempre al menos un escritorio y un activo válido.
    if (!state.workspaces || state.workspaces.length === 0) {
      state = {
        version: CONFIG.schemaVersion,
        workspaces: [makeWorkspace()],
        activeWorkspaceId: null,
      };
    }
    // activeWorkspaceId debe ser SIEMPRE un id real (no null); si no, el primero.
    if (!state.workspaces.find((w) => w.id === state.activeWorkspaceId)) {
      state.activeWorkspaceId = state.workspaces[0].id;
    }
    // Ajustes globales de la letra de las hojas: defaults si faltan (estados
    // guardados antes de esta versión no los traen).
    if (!state.settings) state.settings = {};
    const s = state.settings;
    if (typeof s.textSize !== "number") s.textSize = CONFIG.theme.leafTextSize;
    if (typeof s.fontIndex !== "number") s.fontIndex = 0;
    if (typeof s.colorIndex !== "number") s.colorIndex = 0;
  }

  // Aplica los ajustes globales de letra (tamaño, fuente, color) como
  // variables CSS, y pinta el botón de color con el color en uso.
  function applyLeafFontSettings() {
    const f = CONFIG.leafFont;
    const s = state.settings;
    const root = document.documentElement.style;
    const color = f.colors[s.colorIndex % f.colors.length];
    root.setProperty("--leaf-text-size", s.textSize + "px");
    root.setProperty("--leaf-font", f.fonts[s.fontIndex % f.fonts.length]);
    root.setProperty("--leaf-text-color", color);
    fontColorBtn.querySelector("#font-color-swatch").style.background = color;
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch (_) {
      // Almacenamiento lleno o no disponible: la app sigue funcionando.
    }
    // Cada mutación puede cambiar si el último escritorio es borrable
    // (p. ej. al crear/borrar/mover hojas), así que se reevalúa aquí.
    updateNewWsBtn();
  }

  // ---------------------------------------------------------------
  // Modelo: crear y actualizar hojas.
  // ---------------------------------------------------------------
  function makeId() {
    return "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function findNode(id) {
    return activeWorkspace().nodes.find((n) => n.id === id);
  }

  function touchNode(node) {
    node.updatedAt = Date.now();
    saveState();
  }

  // Centro (px) de la región de un estado, para posicionar hojas nuevas.
  function regionCenter(statusId) {
    const status = CONFIG.statuses.find((s) => s.id === statusId);
    const r = status ? status.region : { x: 0, y: 0, w: 1, h: 1 };
    return {
      x: (r.x + r.w / 2) * window.innerWidth - CONFIG.defaultWidth / 2,
      y: (r.y + r.h / 2) * window.innerHeight - CONFIG.defaultHeight / 2,
    };
  }

  // Estado cuya región contiene el punto (px). Se usa al soltar una hoja.
  function statusAtPoint(px, py) {
    const nx = px / window.innerWidth;
    const ny = py / window.innerHeight;
    for (const s of CONFIG.statuses) {
      const r = s.region;
      if (nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h) return s.id;
    }
    return CONFIG.defaultStatus;
  }

  function createNode() {
    // Centro de la hoja a 2/3 de la pantalla (config newLeafPos); de ahí se
    // deriva la posición de la esquina (x/y) y el estado según la zona.
    const w = CONFIG.defaultWidth;
    const h = CONFIG.defaultHeight;
    const cx = CONFIG.newLeafPos.x * window.innerWidth;
    const cy = CONFIG.newLeafPos.y * window.innerHeight;
    const node = {
      id: makeId(),
      text: CONFIG.defaultText,
      x: cx - w / 2,
      y: cy - h / 2,
      shape: CONFIG.defaultShape,
      status: statusAtPoint(cx, cy),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    activeWorkspace().nodes.push(node);
    saveState();
    renderLeaf(node); // aparece en modo display; se edita con doble clic
  }

  // ---------------------------------------------------------------
  // Render: etiquetas de zona y hojas.
  // ---------------------------------------------------------------
  function renderZoneLabels() {
    zoneLabels.innerHTML = "";
    if (!CONFIG.showZoneLabels) return; // etiquetas desactivadas
    for (const s of CONFIG.statuses) {
      const el = document.createElement("span");
      el.className = "zone-label";
      el.dataset.status = s.id;
      el.textContent = s.label;
      const r = s.region;
      el.style.left = (r.x + r.w / 2) * 100 + "%";
      el.style.top = (r.y * 100 + 2) + "%";
      zoneLabels.appendChild(el);
    }
  }

  function leafSvg(shape) {
    const def = LEAF_PATHS[shape] || LEAF_PATHS[CONFIG.leafShapes[0]];
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    const body = document.createElementNS(ns, "path");
    body.setAttribute("class", "leaf-body");
    body.setAttribute("d", def.body);
    const vein = document.createElementNS(ns, "path");
    vein.setAttribute("class", "leaf-vein");
    vein.setAttribute("d", def.vein);
    svg.appendChild(body);
    svg.appendChild(vein);
    return svg;
  }

  // Tono propio de cada variante (desde CONFIG.leafStyles). Si la hoja
  // tiene un borde personalizado (node.border), ese color manda en el contorno.
  function applyLeafStyle(el, node) {
    const style = (CONFIG.leafStyles || {})[node.shape] || {};
    const custom = (CONFIG.borderColors || []).find((b) => b.id === node.border);
    el.style.setProperty("--leaf-fill", style.fill || CONFIG.theme.leafFill);
    el.style.setProperty(
      "--leaf-glow",
      custom ? custom.color : style.glow || CONFIG.theme.leafGlow
    );
  }

  // Rotación de una hoja: se aplica SOLO al SVG (la figura), no al .leaf ni al
  // texto. Así la hoja gira pero el texto se mantiene horizontal y legible, y
  // el arrastre y los controles de edición quedan en un marco estable.
  function applyLeafRotation(el, node) {
    const svg = el.querySelector("svg");
    if (svg) svg.style.transform = node.rotation ? `rotate(${node.rotation}deg)` : "";
  }

  function renderLeaf(node) {
    const el = document.createElement("div");
    el.className = "leaf";
    el.dataset.id = node.id;
    el.style.width = (node.w || CONFIG.defaultWidth) + "px";
    el.style.height = (node.h || CONFIG.defaultHeight) + "px";
    // Posicionar con transform (acelerado por GPU): el arrastre no fuerza
    // relayout de la página, solo composición — clave para la fluidez.
    el.style.transform = `translate(${node.x}px, ${node.y}px)`;
    el.style.zIndex = ++zTop;
    applyLeafStyle(el, node);

    // Contenido interno (gira con la rotación de la hoja): SVG + texto.
    const inner = document.createElement("div");
    inner.className = "leaf-inner";
    inner.appendChild(leafSvg(node.shape));
    const text = document.createElement("span");
    text.className = "leaf-text";
    text.textContent = node.text;
    inner.appendChild(text);
    el.appendChild(inner);
    applyLeafRotation(el, node);

    attachGestures(el);
    leafLayer.appendChild(el);
    return el;
  }

  function updateLeafShape(el, node) {
    el.querySelector("svg").replaceWith(leafSvg(node.shape));
    applyLeafRotation(el, node); // el SVG nuevo debe conservar la rotación
  }

  function renderAll() {
    const byLastTouch = [...activeWorkspace().nodes].sort(
      (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0)
    );
    for (const node of byLastTouch) renderLeaf(node);
  }

  // Quita del DOM solo las hojas (no toca árbol ni cofre).
  function clearLeaves() {
    leafLayer.querySelectorAll(".leaf").forEach((el) => el.remove());
  }

  // ---------------------------------------------------------------
  // Gestos: arrastre, clic simple (variante) y doble clic (editar).
  // Desambiguación por retardo — ver INTERACTION_RULES.md.
  // ---------------------------------------------------------------
  function attachGestures(el) {
    let startX = 0, startY = 0;       // posición del puntero al iniciar
    let originX = 0, originY = 0;     // posición de la hoja al iniciar
    let lastX = 0, lastY = 0;         // última posición durante el arrastre
    let dragging = false;
    let pointerDown = false;
    let clickTimer = null;            // temporizador de desambiguación

    el.addEventListener("pointerdown", (e) => {
      el.style.zIndex = ++zTop; // la última tocada queda al frente
      if (el.querySelector(".leaf-editor")) return; // en edición: no arrastrar
      pointerDown = true;
      dragging = false;
      startX = e.clientX;
      startY = e.clientY;
      const node = findNode(el.dataset.id);
      originX = node ? node.x : 0;
      originY = node ? node.y : 0;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", (e) => {
      if (!pointerDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Arrastre gana sobre clic: se activa al superar el umbral.
      if (!dragging && Math.hypot(dx, dy) > CONFIG.dragThreshold) {
        dragging = true;
        el.classList.add("dragging");
        document.body.classList.add("leaf-dragging"); // muestra el cofre
      }
      if (dragging) {
        el.style.transform = `translate(${originX + dx}px, ${originY + dy}px)`;
        lastX = originX + dx;
        lastY = originY + dy;
        highlightZone(e.clientX, e.clientY);
        treasure.classList.toggle("active", overTreasure(e.clientX, e.clientY));
        // Los puntos solo "despiertan" tras sostener la hoja cerca dotArmDelayMs
        // (evita transferir sin querer al mover hojas hacia arriba).
        if (dotsAreNear(el, e.clientY)) {
          if (!document.body.classList.contains("dots-armed") && !dotArmTimer) {
            dotArmTimer = setTimeout(() => {
              dotArmTimer = null;
              document.body.classList.add("dots-armed");
            }, CONFIG.dotArmDelayMs);
          }
          if (document.body.classList.contains("dots-armed")) {
            highlightDotUnderPointer(el, e.clientX, e.clientY);
          }
        } else {
          clearDotHighlight(); // se alejó: cancela el retardo y apaga los puntos
        }
      }
    });

    el.addEventListener("pointerup", (e) => {
      if (!pointerDown) return;
      pointerDown = false;

      if (dragging) {
        finishDrag(el, e.clientX, e.clientY, lastX, lastY);
        return;
      }

      // Clic sin arrastre: distinguir simple de doble con retardo.
      if (clickTimer) {
        // Segundo clic dentro de la ventana → doble clic → editar.
        clearTimeout(clickTimer);
        clickTimer = null;
        startEditing(el);
      } else {
        clickTimer = setTimeout(() => {
          clickTimer = null;
          cycleShape(el); // No llegó segundo clic → clic simple → variante.
        }, CONFIG.doubleClickDelay);
      }
    });

    el.addEventListener("pointercancel", () => {
      pointerDown = false;
      if (dragging) {
        dragging = false;
        el.classList.remove("dragging");
        document.body.classList.remove("leaf-dragging");
        treasure.classList.remove("active");
        clearDotHighlight();
      }
    });
  }

  // ¿El punto (px, py) está sobre el cofre del tesoro?
  function overTreasure(px, py) {
    const r = treasure.getBoundingClientRect();
    return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
  }

  // Punto (dot) destino de una hoja arrastrada. Se acierta si el DEDO o la
  // PUNTA SUPERIOR de la hoja llegan al punto — así funciona tanto si acercas
  // el dedo como si acercas la hoja al punto (que es lo natural). Se usa un
  // margen vertical generoso hacia abajo para que sea fácil de alcanzar.
  function dotForLeaf(el, px, py) {
    const lr = el.getBoundingClientRect();
    const aim = [
      [px, py],                              // el dedo / puntero
      [lr.left + lr.width / 2, lr.top + 10], // la punta superior de la hoja
    ];
    for (const dot of wsDots.querySelectorAll(".ws-dot")) {
      const r = dot.getBoundingClientRect();
      for (const [x, y] of aim) {
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom + 30) {
          return dot;
        }
      }
    }
    return null;
  }

  // Durante el arrastre: resalta el punto destino (si no es el actual).
  function highlightDotUnderPointer(el, px, py) {
    const dot = dotForLeaf(el, px, py);
    wsDots.querySelectorAll(".ws-dot").forEach((d) => {
      d.classList.toggle(
        "drop-target",
        d === dot && d.dataset.wsId !== state.activeWorkspaceId
      );
    });
  }

  function clearDotHighlight() {
    if (dotArmTimer) { clearTimeout(dotArmTimer); dotArmTimer = null; }
    document.body.classList.remove("dots-armed");
    wsDots.querySelectorAll(".ws-dot").forEach((d) => d.classList.remove("drop-target"));
  }

  // ¿La hoja arrastrada (su punta) o el dedo están cerca de la fila de puntos?
  // Simétrico: funciona con los puntos arriba o abajo (banda alrededor de la fila).
  function dotsAreNear(el, py) {
    const lr = el.getBoundingClientRect();
    const dr = wsDots.getBoundingClientRect();
    const tipY = lr.top + 10;      // la punta superior de la hoja
    const margin = 140;            // zona de cercanía
    const near = (y) => y >= dr.top - margin && y <= dr.bottom + margin;
    return near(tipY) || near(py);
  }

  function finishDrag(el, px, py, fx, fy) {
    // ¿Alcanzaron a "encenderse" los puntos? Solo entonces se permite la
    // transferencia (evita mover la hoja a otro escritorio sin querer).
    const dotsWereArmed = document.body.classList.contains("dots-armed");
    el.classList.remove("dragging");
    document.body.classList.remove("leaf-dragging");
    treasure.classList.remove("active");
    highlightZone(-1, -1); // apaga el resaltado
    clearDotHighlight();
    const node = findNode(el.dataset.id);
    if (!node) return;

    // Soltar sobre el cofre = borrar la hoja.
    if (overTreasure(px, py)) {
      deleteNode(node, el);
      return;
    }

    // Soltar sobre el punto de OTRO escritorio = mover la hoja allá. Conserva
    // su posición (node.x/y aún tienen la posición previa al arrastre). Solo si
    // los puntos estaban armados (se sostuvo la hoja cerca el tiempo requerido).
    const dot = dotsWereArmed ? dotForLeaf(el, px, py) : null;
    if (dot && dot.dataset.wsId !== state.activeWorkspaceId) {
      moveNodeToWorkspace(node, el, dot);
      return;
    }

    node.x = fx;
    node.y = fy;
    node.status = statusAtPoint(px, py); // mover = reclasificar
    touchNode(node);
  }

  // Mueve una hoja al escritorio destino, conservando su posición y props.
  // La hoja "vuela" hacia el punto y se encoge; el punto destino da un pulso.
  function moveNodeToWorkspace(node, el, dot) {
    const from = activeWorkspace();
    const target = state.workspaces.find((w) => w.id === dot.dataset.wsId);
    if (!target) { touchNode(node); return; }

    from.nodes = from.nodes.filter((n) => n.id !== node.id);
    node.updatedAt = Date.now();
    target.nodes.push(node); // x/y intactos = misma posición en el destino
    saveState();

    // Pulso de confirmación en el punto destino.
    dot.classList.add("received");
    setTimeout(() => dot.classList.remove("received"), 450);

    const ms = CONFIG.animations.enabled ? CONFIG.animations.swallowMs : 0;
    if (!ms) { el.remove(); return; }

    const r = dot.getBoundingClientRect();
    const w = node.w || CONFIG.defaultWidth;
    const h = node.h || CONFIG.defaultHeight;
    el.classList.add("swallowed");
    void el.offsetWidth; // reflow para arrancar la transición
    el.style.transform =
      `translate(${r.left + r.width / 2 - w / 2}px, ${r.top + r.height / 2 - h / 2}px) scale(0.05)`;
    setTimeout(() => el.remove(), ms);
  }

  function deleteNode(node, el) {
    // El dato se elimina de inmediato; el DOM se queda solo para la animación.
    const ws = activeWorkspace();
    ws.nodes = ws.nodes.filter((n) => n.id !== node.id);
    saveState();

    const ms = CONFIG.animations.enabled ? CONFIG.animations.swallowMs : 0;
    if (!ms) {
      el.remove();
      return;
    }

    // El cofre se abre y la hoja "cae" adentro, encogiéndose.
    treasure.classList.add("open");
    const r = treasure.getBoundingClientRect();
    const w = node.w || CONFIG.defaultWidth;
    const h = node.h || CONFIG.defaultHeight;
    el.classList.add("swallowed");
    // Forzar reflow para que la transición arranque desde la posición actual.
    void el.offsetWidth;
    el.style.transform =
      `translate(${r.left + r.width / 2 - w / 2}px, ${r.top + r.height / 2 - h / 2}px) scale(0.05)`;

    setTimeout(() => {
      el.remove();
      treasure.classList.add("burst");   // chispas doradas
      treasure.classList.remove("open"); // la tapa se cierra
      // Quitar "burst" solo cuando chispas y destello ya terminaron en
      // opacidad 0: el resplandor regresa con transición (final suave).
      setTimeout(() => treasure.classList.remove("burst"), 900);
    }, ms);
  }

  function cycleShape(el) {
    const node = findNode(el.dataset.id);
    if (!node) return;
    const seq = CONFIG.leafShapes;
    const next = (seq.indexOf(node.shape) + 1) % seq.length;
    node.shape = seq[next];
    updateLeafShape(el, node);
    applyLeafStyle(el, node);
    touchNode(node);
  }

  // Resalta la etiqueta de la zona bajo el puntero durante el arrastre.
  function highlightZone(px, py) {
    const active = px >= 0 ? statusAtPoint(px, py) : null;
    for (const label of zoneLabels.children) {
      label.classList.toggle("active", label.dataset.status === active);
    }
  }

  // ---------------------------------------------------------------
  // Edición de texto (doble clic). Blur/Enter guarda; Escape cancela.
  // ---------------------------------------------------------------
  function startEditing(el) {
    const node = findNode(el.dataset.id);
    if (!node || el.querySelector(".leaf-editor")) return;

    const textEl = el.querySelector(".leaf-text");
    textEl.style.display = "none";

    const editor = document.createElement("textarea");
    editor.className = "leaf-editor";
    editor.value = node.text;
    editor.rows = 2;
    el.appendChild(editor);
    editor.focus();
    editor.select();

    // Botones de tamaño: + arriba de la hoja, − abajo. Solo en modo edición.
    function makeSizeBtn(label, cls, delta) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "size-btn " + cls;
      btn.textContent = label;
      // pointerdown con preventDefault: cambia el tamaño SIN robarle el foco
      // al editor (así la edición sigue abierta mientras se ajusta).
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const size = (node.w || CONFIG.defaultWidth) + delta;
        const clamped = Math.max(CONFIG.minLeafSize, Math.min(CONFIG.maxLeafSize, size));
        node.w = clamped;
        node.h = clamped;
        el.style.width = clamped + "px";
        el.style.height = clamped + "px";
        touchNode(node);
      });
      el.appendChild(btn);
      return btn;
    }
    const plusBtn = makeSizeBtn("+", "plus", CONFIG.resizeStep);
    const minusBtn = makeSizeBtn("\u2212", "minus", -CONFIG.resizeStep);

    // Botón de color (derecha): cicla el borde normal → dorado → plateado → normal.
    const colorBtn = document.createElement("button");
    colorBtn.type = "button";
    colorBtn.className = "size-btn color";
    colorBtn.textContent = "\u25D1";
    colorBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ids = (CONFIG.borderColors || []).map((b) => b.id);
      const cycle = [undefined, ...ids];
      const next = cycle[(cycle.indexOf(node.border) + 1) % cycle.length];
      if (next === undefined) delete node.border;
      else node.border = next;
      applyLeafStyle(el, node);
      touchNode(node);
    });
    el.appendChild(colorBtn);

    // Botón de rotación (izquierda de todos los controles): cada clic gira la
    // hoja rotationStep grados en sentido horario, acumulativo y persistente.
    const rotateBtn = document.createElement("button");
    rotateBtn.type = "button";
    rotateBtn.className = "size-btn rotate";
    rotateBtn.textContent = "↻"; // ↻ flecha circular horaria
    rotateBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      node.rotation = ((node.rotation || 0) + CONFIG.rotationStep) % 360;
      applyLeafRotation(el, node);
      touchNode(node);
    });
    el.appendChild(rotateBtn);

    let cancelled = false;

    function finish() {
      if (!cancelled) {
        node.text = editor.value;
        touchNode(node);
      }
      textEl.textContent = node.text;
      textEl.style.display = "";
      editor.remove();
      plusBtn.remove();
      minusBtn.remove();
      colorBtn.remove();
      rotateBtn.remove();
    }

    editor.addEventListener("blur", finish);
    editor.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        editor.blur();
      } else if (e.key === "Escape") {
        cancelled = true;
        editor.blur();
      }
    });
    // Que los gestos de la hoja no interfieran mientras se edita.
    editor.addEventListener("pointerdown", (e) => e.stopPropagation());
  }

  // ---------------------------------------------------------------
  // EASTER EGG: cuatro árboles (roble, acacia, bonsái, eucalipto).
  // Tocar la base del tronco cambia al siguiente; se guarda en el estado.
  // ---------------------------------------------------------------
  const treeSvg = document.getElementById("tree");

  function applyTree(id) {
    const theme = CONFIG.treeThemes[id] || CONFIG.treeThemes[CONFIG.defaultTree];
    treeSvg.querySelectorAll(".tree-variant").forEach((g) => {
      g.classList.toggle("active", g.dataset.variant === id);
    });
    // Colores del árbol activo (pisan a los del tema global solo aquí)
    treeSvg.style.setProperty("--canopy", theme.canopy);
    treeSvg.style.setProperty("--canopy-fill", theme.canopyFill);
    treeSvg.style.setProperty("--tree", theme.trunk);
  }

  function cycleTree() {
    const ws = activeWorkspace();
    const cycle = CONFIG.treeCycle;
    const current = ws.tree || CONFIG.defaultTree;
    ws.tree = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    saveState();
    applyTree(ws.tree);
  }

  // Toque en la base del tronco = cambiar árbol (easter egg). Desactivado por
  // ahora vía CONFIG.treeEasterEgg; se reactivará en una versión futura.
  if (CONFIG.treeEasterEgg) {
    canvas.addEventListener("click", (e) => {
      if (e.target !== canvas) return; // solo el fondo, no hojas ni botones
      const r = CONFIG.treeBaseRegion;
      const nx = e.clientX / window.innerWidth;
      const ny = e.clientY / window.innerHeight;
      if (nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h) {
        cycleTree();
      }
    });
  }

  // ---------------------------------------------------------------
  // Navegación entre escritorios (separada de la lógica de las hojas).
  // Diseñada para extenderse: renombrar, eliminar, reordenar, import/export.
  // ---------------------------------------------------------------

  // Indicador de puntos: uno por escritorio, el activo resaltado. El botón es
  // un área táctil amplia; el círculo visible va en un span interno pequeño.
  // Gestos: toque = navegar; toque prolongado = modo reordenar ("temblorcito").
  function renderDots() {
    wsDots.innerHTML = "";
    for (const ws of state.workspaces) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "ws-dot" + (ws.id === state.activeWorkspaceId ? " active" : "");
      dot.dataset.wsId = ws.id; // usado como blanco al arrastrar hojas
      dot.setAttribute("aria-label", "Ir al escritorio");
      const visual = document.createElement("span");
      visual.className = "dot-visual";
      dot.appendChild(visual);
      attachDotGestures(dot, ws.id);
      wsDots.appendChild(dot);
    }
    fitDots();
    updateNewWsBtn();
  }

  // Encoge los puntos dinámicamente para que TODOS quepan en la pantalla
  // (config: dotFit). El botón baja de maxDotPx a minDotPx según cuántos
  // escritorios haya; el círculo visible se escala en proporción.
  function fitDots() {
    const f = CONFIG.dotFit;
    const count = state.workspaces.length;
    const gap = 2; // debe coincidir con el gap de #ws-dots en style.css
    const avail = window.innerWidth - f.screenMarginPx - (count - 1) * gap;
    let slot = Math.floor(avail / count);
    slot = Math.max(f.minDotPx, Math.min(f.maxDotPx, slot));
    const vis = Math.max(5, Math.round(10 * (slot / f.maxDotPx)));
    const root = document.documentElement.style;
    root.setProperty("--dot-btn", slot + "px");
    root.setProperty("--dot-vis", vis + "px");
  }

  // ---------------------------------------------------------------
  // Reordenar escritorios: toque prolongado en un punto entra al modo
  // "temblorcito" (los puntos tiemblan); arrastrar un punto lo mueve; tocar
  // fuera sale del modo. El escritorio activo no cambia al reordenar.
  // ---------------------------------------------------------------
  let reorderMode = false;
  let longPressTimer = null;
  let grabbedDot = null;      // punto que se está arrastrando
  let grabbedId = null;
  let grabHomeX = 0;          // centro X del punto al agarrarlo
  let dotStartX = 0, dotStartY = 0, dotDragging = false, dotPointerId = null;

  function enterReorder() {
    reorderMode = true;
    wsDots.classList.add("reordering");
  }

  function exitReorder() {
    reorderMode = false;
    wsDots.classList.remove("reordering");
    if (grabbedDot) {
      grabbedDot.style.transform = "";
      grabbedDot.classList.remove("grabbing");
    }
    grabbedDot = null;
  }

  function grabDot(dot, wsId) {
    grabbedDot = dot;
    grabbedId = wsId;
    const r = dot.getBoundingClientRect();
    grabHomeX = r.left + r.width / 2;
    dot.classList.add("grabbing");
  }

  // Índice destino en el arreglo según la X del dedo vs. los otros puntos.
  function computeTargetIndex(px) {
    let idx = 0;
    for (const d of wsDots.querySelectorAll(".ws-dot")) {
      if (d === grabbedDot) continue;
      const r = d.getBoundingClientRect();
      if (px > r.left + r.width / 2) idx++;
      else break;
    }
    return idx;
  }

  function reorderWorkspace(id, targetIndex) {
    const arr = state.workspaces;
    const cur = arr.findIndex((w) => w.id === id);
    if (cur < 0) return;
    const [ws] = arr.splice(cur, 1);
    arr.splice(Math.max(0, Math.min(targetIndex, arr.length)), 0, ws);
    saveState(); // el activo no cambia; solo el orden
  }

  function attachDotGestures(dot, wsId) {
    // En Android el long-press dispara el menú contextual; lo evitamos.
    dot.addEventListener("contextmenu", (e) => e.preventDefault());

    dot.addEventListener("pointerdown", (e) => {
      dotPointerId = e.pointerId;
      dotStartX = e.clientX;
      dotStartY = e.clientY;
      dotDragging = false;
      dot.setPointerCapture(e.pointerId);
      if (reorderMode) {
        grabDot(dot, wsId); // ya en modo: agarra este punto de una vez
      } else {
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          enterReorder();
          grabDot(dot, wsId); // long-press: entra al modo y agarra
        }, 450);
      }
    });

    dot.addEventListener("pointermove", (e) => {
      if (e.pointerId !== dotPointerId) return;
      const dx = e.clientX - dotStartX, dy = e.clientY - dotStartY;
      if (!grabbedDot) {
        // Movimiento antes del long-press → cancelar (fue un toque/roce).
        if (longPressTimer && Math.hypot(dx, dy) > 8) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }
      // Agarrado: el punto sigue al dedo en horizontal.
      dotDragging = true;
      grabbedDot.style.transform = `translateX(${e.clientX - grabHomeX}px) scale(1.7)`;
    });

    dot.addEventListener("pointerup", (e) => {
      if (e.pointerId !== dotPointerId) return;
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

      if (grabbedDot && dotDragging) {
        reorderWorkspace(grabbedId, computeTargetIndex(e.clientX));
        grabbedDot = null;
        dotDragging = false;
        renderDots(); // re-dibuja en el nuevo orden (sigue en modo reordenar)
        return;
      }
      if (grabbedDot) { grabbedDot.classList.remove("grabbing"); grabbedDot = null; }

      // Toque sin arrastre: navegar solo si NO estamos reordenando.
      if (!reorderMode) switchWorkspace(wsId);
    });

    dot.addEventListener("pointercancel", (e) => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (grabbedDot) { grabbedDot.style.transform = ""; grabbedDot.classList.remove("grabbing"); grabbedDot = null; }
      dotDragging = false;
    });
  }

  // iOS: mientras se reordena o se agarra un punto, bloquear el gesto táctil
  // nativo (scroll/zoom) a nivel touchmove — Safari a veces lo dispara aunque
  // el elemento tenga touch-action:none, y eso cancela el arrastre.
  wsDots.addEventListener(
    "touchmove",
    (e) => { if (reorderMode || grabbedDot) e.preventDefault(); },
    { passive: false }
  );

  // Tocar fuera de los puntos sale del modo reordenar.
  document.addEventListener("pointerdown", (e) => {
    if (reorderMode && !wsDots.contains(e.target)) exitReorder();
  }, true);

  // El botón "+" de escritorio nuevo solo aparece en el último escritorio.
  // El botón "−" borra ese último escritorio: se muestra siempre que no sea
  // el único, pero queda DESHABILITADO (gris) mientras tenga hojas — se
  // habilita en cuanto el usuario lo vacía, para no perder información.
  function updateNewWsBtn() {
    const last = state.workspaces[state.workspaces.length - 1];
    const onLast = last && last.id === state.activeWorkspaceId;
    newWsBtn.style.display = onLast ? "" : "none";
    const showDel = onLast && state.workspaces.length > 1;
    delWsBtn.style.display = showDel ? "" : "none";
    delWsBtn.disabled = showDel && last.nodes.length > 0;
    // Los ajustes globales de letra (F, color, A+, A−) también viven en la
    // última página, arriba del "+" y el "−".
    fontBtn.style.display = onLast ? "" : "none";
    fontColorBtn.style.display = onLast ? "" : "none";
    fontPlusBtn.style.display = onLast ? "" : "none";
    fontMinusBtn.style.display = onLast ? "" : "none";
  }

  // Dibuja el escritorio activo (hojas + árbol) sin animación.
  function renderActiveWorkspace() {
    clearLeaves();
    renderAll();
    applyTree(activeWorkspace().tree || CONFIG.defaultTree);
    renderDots();
  }

  // Cambia de escritorio con cross-fade: fade-out → cambiar contenido →
  // fade-in. Hojas y árbol hacen fade juntos; el cofre queda fijo.
  let switching = false;
  function switchWorkspace(id) {
    if (switching || id === state.activeWorkspaceId) return;
    if (!state.workspaces.find((w) => w.id === id)) return;

    const fadeMs = CONFIG.animations.enabled ? CONFIG.animations.workspaceFadeMs : 0;
    if (!fadeMs) {
      state.activeWorkspaceId = id;
      saveState();
      renderActiveWorkspace();
      return;
    }

    switching = true;
    leafLayer.classList.add("fading"); // fade-out
    treeSvg.classList.add("fading");
    setTimeout(() => {
      state.activeWorkspaceId = id;
      saveState();
      renderActiveWorkspace(); // cambiar contenido (invisible)
      void leafLayer.offsetWidth; // reflow para reiniciar la transición
      leafLayer.classList.remove("fading"); // fade-in
      treeSvg.classList.remove("fading");
      switching = false;
    }, fadeMs);
  }

  // ---------------------------------------------------------------
  // Navegación por swipe: deslizar el dedo en horizontal sobre el FONDO
  // (no sobre una hoja ni un botón) cambia de escritorio, como en un
  // iPhone: izquierda = siguiente, derecha = anterior.
  // ---------------------------------------------------------------
  let swipeId = null, swipeStartX = 0, swipeStartY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    // Solo el fondo: las hojas y botones tienen sus propios gestos.
    if (e.target.closest(".leaf") || e.target.closest("button")) return;
    swipeId = e.pointerId;
    swipeStartX = e.clientX;
    swipeStartY = e.clientY;
  });

  canvas.addEventListener("pointerup", (e) => {
    if (e.pointerId !== swipeId) return;
    swipeId = null;
    const dx = e.clientX - swipeStartX;
    const dy = e.clientY - swipeStartY;
    const cfg = CONFIG.swipeNav;
    if (Math.abs(dx) < cfg.minDx) return;                    // muy corto
    if (Math.abs(dy) > Math.abs(dx) * cfg.maxDyRatio) return; // muy vertical
    const idx = state.workspaces.findIndex((w) => w.id === state.activeWorkspaceId);
    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next >= 0 && next < state.workspaces.length) {
      switchWorkspace(state.workspaces[next].id);
    }
  });

  canvas.addEventListener("pointercancel", (e) => {
    if (e.pointerId === swipeId) swipeId = null;
  });

  // Crea un escritorio nuevo, vacío, y navega hacia él. Los demás quedan
  // exactamente igual.
  function createWorkspace() {
    const ws = makeWorkspace();
    state.workspaces.push(ws);
    saveState();
    renderDots();          // el nuevo punto aparece de inmediato
    switchWorkspace(ws.id); // navega con animación
  }

  // Borra el último escritorio (solo si está vacío y hay más de uno) y
  // navega con animación al que queda al final.
  function deleteWorkspace() {
    const last = state.workspaces[state.workspaces.length - 1];
    if (!last || state.workspaces.length <= 1) return;
    if (last.id !== state.activeWorkspaceId) return;
    if (last.nodes.length > 0) return;
    state.workspaces.pop();
    const target = state.workspaces[state.workspaces.length - 1];
    switchWorkspace(target.id); // guarda el estado y redibuja los puntos
  }

  // ---------------------------------------------------------------
  // Arranque.
  // ---------------------------------------------------------------
  applyTheme();
  loadState();
  applyLeafFontSettings(); // pisa el tamaño/fuente/color del tema con lo guardado
  saveState(); // deja el almacenamiento en el formato canónico (v3) tras migrar
  applyTree(activeWorkspace().tree || CONFIG.defaultTree);
  renderZoneLabels();
  renderDots();
  renderAll();
  addBtn.addEventListener("click", createNode);
  newWsBtn.addEventListener("click", createWorkspace);
  delWsBtn.addEventListener("click", deleteWorkspace);
  // F: cicla la fuente de todas las hojas; color: cicla el color del texto.
  fontBtn.addEventListener("click", () => {
    state.settings.fontIndex =
      (state.settings.fontIndex + 1) % CONFIG.leafFont.fonts.length;
    applyLeafFontSettings();
    saveState();
  });
  fontColorBtn.addEventListener("click", () => {
    state.settings.colorIndex =
      (state.settings.colorIndex + 1) % CONFIG.leafFont.colors.length;
    applyLeafFontSettings();
    saveState();
  });
  // A+/A−: tamaño de letra global, con límites de config.
  function nudgeFontSize(delta) {
    const f = CONFIG.leafFont;
    const s = state.settings;
    s.textSize = Math.max(f.sizeMin, Math.min(f.sizeMax, s.textSize + delta));
    applyLeafFontSettings();
    saveState();
  }
  fontPlusBtn.addEventListener("click", () => nudgeFontSize(CONFIG.leafFont.sizeStep));
  fontMinusBtn.addEventListener("click", () => nudgeFontSize(-CONFIG.leafFont.sizeStep));
  window.addEventListener("resize", fitDots); // rotar el teléfono re-ajusta

})();
