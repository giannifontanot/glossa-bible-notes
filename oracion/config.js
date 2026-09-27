// config.js — Panel de control de Sticky Shapes (Árbol de Oración).
// Cambia estos valores para ajustar la app sin tocar la lógica.
const CONFIG = {
  storageKey: "sticky-shapes:v2", // se mantiene: la migración reescribe en sitio
  schemaVersion: 3,               // v3: múltiples escritorios (workspaces)

  // Variantes de hoja (ciclan con un clic simple).
  leafShapes: ["leaf-oak", "leaf-maple", "leaf-simple", "leaf-maple-red", "leaf-scroll"],
  defaultShape: "leaf-oak",

  // Cada clic del botón de rotación gira la hoja este ángulo (grados).
  rotationStep: 30,

  // Tres estados = dos ramas + piso. region: rectángulo normalizado (0..1).
  statuses: [
    { id: "rama-centro",    label: "Centro",    region: { x: 0.0, y: 0.0,  w: 1.0, h: 0.35 } },
    { id: "rama-izquierda", label: "Izquierda", region: { x: 0.0, y: 0.35, w: 0.5, h: 0.35 } },
    { id: "rama-derecha",   label: "Derecha",   region: { x: 0.5, y: 0.35, w: 0.5, h: 0.35 } },
    { id: "piso",           label: "Piso",      region: { x: 0.0,  y: 0.7,  w: 1.0,  h: 0.3 } },
  ],
  defaultStatus: "piso",

  // EASTER EGG: árboles alternos. Desactivado por ahora (se mostrarán en una
  // versión futura). Con treeEasterEgg:false, tocar la base NO cambia el árbol.
  treeEasterEgg: false,
  treeCycle: ["oak", "acacia", "bonsai", "eucalyptus"],
  defaultTree: "oak",
  // Zona táctil de la base del árbol (rectángulo normalizado 0..1)
  treeBaseRegion: { x: 0.32, y: 0.86, w: 0.36, h: 0.13 },
  // Colores de cada árbol (contorno y relleno de copa, y tronco)
  treeThemes: {
    oak:        { canopy: "#2fbf2f", canopyFill: "rgba(30, 90, 40, 0.1)",   trunk: "#a06a35" },
    acacia:     { canopy: "#ff9d2e", canopyFill: "rgba(255, 110, 20, 0.1)", trunk: "#c77b3a" },
    bonsai:     { canopy: "#ff4fa0", canopyFill: "rgba(255, 47, 130, 0.1)", trunk: "#c9c2b8" },
    eucalyptus: { canopy: "#8fe8cf", canopyFill: "rgba(120, 230, 200, 0.08)", trunk: "#cfd8d3" },
  },
  showZoneLabels: false, // etiquetas de zona (Centro/Izquierda/Derecha/Piso) ocultas

  defaultText: "",
  defaultWidth: 150,
  defaultHeight: 150,
  // Posición del CENTRO de una hoja nueva, como fracción de la pantalla (0..1).
  // y:0.667 = dos tercios de arriba hacia abajo (bajo el centro, sobre el borde).
  newLeafPos: { x: 0.5, y: 0.667 },

  // Paleta arcade Donkey Kong 80s: fondo oscuro + contornos de neón.
  theme: {
    background: "#0a0018",   // casi negro / violeta profundo
    treeFill: "rgba(107, 68, 35, 0.08)", // café casi transparente
    treeStroke: "#a06a35",   // café claro: contorno del tronco (delineado)
    barkDark: "rgba(160, 106, 53, 0.2)", // vetas muy tenues
    canopy: "#2fbf2f",       // verde arcade mate: contorno de las copas
    canopyFill: "rgba(30, 90, 40, 0.1)", // verde casi transparente
    grass: "#2aa818",        // verde pasto discreto
    leafFill: "#1d6b2a",     // relleno de hoja por defecto (si falta en leafStyles)
    leafGlow: "#7dff3a",     // contorno de hoja por defecto (si falta en leafStyles)
    text: "#f7ff00",         // amarillo arcade
    accent: "#ff7a00",       // naranja Donkey Kong (reservado: páginas/escritorios)
    treasure: "#ffd24a",     // dorado neón: cofre del tesoro (borrar hojas)
    editControl: "#38d6ff",  // cian neón: controles de edición (rotar, tamaño +/−)
    glowBlur: 4,             // intensidad del resplandor neón (px) — discreto, estilo DK
    fontFamily: "'Press Start 2P', 'Courier New', monospace",
    leafTextSize: 20,        // px — texto de las hojas
    zoneLabelSize: 16,       // px — etiquetas de las zonas
  },

  // Cada variante de hoja tiene su propio tono de verde (relleno + neón).
  leafStyles: {
    "leaf-oak":    { fill: "#1c5c28", glow: "#3dff57" }, // roble: verde bosque
    "leaf-maple":  { fill: "#2e6b14", glow: "#b4ff3e" }, // arce: verde-lima
    "leaf-simple": { fill: "#0f5c40", glow: "#2effc0" }, // simple: verde-menta
    "leaf-maple-red": { fill: "#5c1010", glow: "#ff4545" }, // maple: rojo neón
    "leaf-scroll": { fill: "rgba(255, 216, 110, 0.14)", glow: "#ffd24a" }, // pergamino: amarillo tenue
  },

  // Colores de borde alternativos (botón de color en modo edición).
  // El ciclo es: normal (según la variante) → cada color en orden → normal.
  borderColors: [
    { id: "gold",   color: "#ffd24a" }, // dorado
    { id: "silver", color: "#d9e2ec" }, // plateado
  ],

  // Cambio de tamaño (botones +/− en modo edición)
  resizeStep: 25,    // px que crece/encoge por toque
  minLeafSize: 90,   // px — tamaño mínimo de hoja
  maxLeafSize: 320,  // px — tamaño máximo de hoja

  doubleClickDelay: 250, // ms para distinguir clic simple de doble clic
  dragThreshold: 5,      // px de movimiento para considerar arrastre
  minTouchTarget: 44,    // px — área táctil mínima
  // Retardo antes de que los puntos de escritorio se "enciendan" al arrastrar
  // una hoja cerca de ellos. Evita transferencias accidentales al mover hojas
  // hacia arriba: hay que sostener la hoja cerca este tiempo para armarlos.
  dotArmDelayMs: 2000,
  // workspaceFadeMs: duración de cada mitad del cross-fade al cambiar de
  // escritorio (fade-out + fade-in ≈ 2×, ~320ms en total).
  animations: { enabled: true, durationMs: 120, swallowMs: 380, workspaceFadeMs: 160 },

  // Extensión inferior del escritorio (zona del QR): se revela arrastrando
  // hacia arriba con un gesto deliberado, tipo cajón con ligera resistencia.
  lowerDeck: {
    deadZonePx: 110, // zona muerta amplia: solo un gesto largo y decidido abre
    snapRatio: 0.45, // hay que recorrer casi la mitad del alto para asentarse
    snapMs: 280,     // duración del ajuste (sin rebote) al soltar
  },

  // Barra de puntos: siempre se ven TODOS los puntos. Con muchos escritorios
  // los puntos se encogen dinámicamente para caber en el ancho de la pantalla
  // (entre maxDotPx y minDotPx); el círculo visible se escala en proporción.
  // Letra de las hojas: ajustes GLOBALES (aplican a todas las hojas de todos
  // los escritorios y persisten en el estado). El tamaño se ajusta con los
  // botones +/− del modo edición; la fuente y el color ciclan con los botones
  // F y de color de la última página. Solo fuentes del sistema (app offline).
  leafFont: {
    sizeMin: 12,  // px mínimo del texto
    sizeMax: 40,  // px máximo del texto
    sizeStep: 2,  // px por toque de +/−
    fonts: [
      "'Press Start 2P', monospace",                  // pixel arcade (actual)
      "Verdana, Geneva, sans-serif",                  // sans limpia y ancha
      "Georgia, 'Times New Roman', serif",            // serif clásica
      "'Comic Sans MS', 'Chalkboard SE', cursive",    // redondita amigable
      "'Trebuchet MS', Tahoma, sans-serif",           // moderna ligera
    ],
    colors: [
      "#f7ff00", // amarillo arcade (actual)
      "#ffffff", // blanco
      "#00f0ff", // cian neón
      "#ff9f1a", // naranja
      "#a8ff60", // verde lima
    ],
  },

  // Navegación por deslizamiento (swipe) horizontal sobre el fondo, como en
  // un iPhone: deslizar a la izquierda va a la página siguiente y viceversa.
  swipeNav: {
    minDx: 60,       // px horizontales mínimos para contar como swipe
    maxDyRatio: 0.8, // tolerancia vertical (dy máximo = dx * ratio)
  },

  dotFit: {
    maxDotPx: 40,       // tamaño máximo del botón (pocos escritorios)
    minDotPx: 18,       // tamaño mínimo al que puede encogerse
    screenMarginPx: 24, // margen lateral total reservado en pantalla
  },
};

// Exposición global (sin módulos) para una app estática simple.
window.CONFIG = CONFIG;
