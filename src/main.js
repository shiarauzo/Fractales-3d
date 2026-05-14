import { createRenderer } from './renderer.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { getFractal } from './fractals.js';

const MOUSE_SENSITIVITY = 0.0022;
const BASE_MOVE_SPEED   = 1.4;

// Niveles de calidad: índice 0=Q1 bajo, 1=Q2 medio (default), 2=Q3 alto.
const QUALITY_LEVELS = [
  { label: 'Q1', pixelRatio: 0.65, maxSteps: 96 },
  { label: 'Q2', pixelRatio: 1.0,  maxSteps: 160 },
  { label: 'Q3', pixelRatio: 1.25, maxSteps: 220 }
];
let qualityIdx = 1;

// Progressive rendering: baja calidad al moverse, sube gradualmente al parar
const PROGRESSIVE = {
  movingRatio: 0.4,    // pixel ratio mientras te mueves
  settleTime: 150,     // ms para empezar a subir calidad
  rampSpeed: 2.5       // velocidad de subida (ratio/segundo)
};
let isMoving = false;
let stillSince = 0;
let currentProgressiveRatio = 1.0;

const canvas = document.getElementById('gl');

let renderer;
try {
  renderer = createRenderer(canvas);
} catch (err) {
  document.body.innerHTML = `
    <div style="padding:24px;color:#fbb;font-family:monospace">
      <h2>No se pudo iniciar WebGL2</h2>
      <pre>${(err && err.message) || err}</pre>
    </div>`;
  throw err;
}

const camera = createCamera([0, 0, 2.4]);
let currentFractal = getFractal(1);
camera.setPosition(currentFractal.defaultPos);

function applyQuality() {
  const q = QUALITY_LEVELS[qualityIdx];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
  ui.setQuality(q.label);
}

const ui = createUI({
  // Cambiar fractal NO reposiciona la cámara — el usuario usa R para resetear.
  onChange: (f) => { currentFractal = f; },
  onZoom: (delta) => {
    camera.zoom(delta);
    ui.setFov(camera.getDistance());
  }
});
ui.setIndex(1);
ui.setFov(camera.getDistance());
applyQuality();

const input = createInput(canvas, {
  onKey: (code) => {
    if (code === 'KeyH') ui.cycleHud();
    if (code === 'KeyR') camera.reset(currentFractal.defaultPos);
    if (code === 'NumpadAdd' || code === 'Equal' || code === 'BracketRight') {
      ui.setIndex(ui.getIndex() + 1);
    }
    if (code === 'NumpadSubtract' || code === 'Minus' || code === 'BracketLeft') {
      ui.setIndex(ui.getIndex() - 1);
    }
    if (code === 'Digit1' || code === 'Numpad1') { qualityIdx = 0; applyQuality(); }
    if (code === 'Digit2' || code === 'Numpad2') { qualityIdx = 1; applyQuality(); }
    if (code === 'Digit3' || code === 'Numpad3') { qualityIdx = 2; applyQuality(); }
    // Zoom controls
    if (code === 'KeyZ') { camera.zoom(0.1); ui.setFov(camera.getDistance()); }
    if (code === 'KeyX') { camera.zoom(-0.1); ui.setFov(camera.getDistance()); }
  },
  onLockChange: (locked) => ui.setLockState(locked),
  onSpeed: (mult) => ui.setSpeed(mult)
});

ui.setSpeed(input.getSpeedMultiplier());

window.addEventListener('resize', () => renderer.resize());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) lastFrame = performance.now();
});

let lastFrame = performance.now();

function frame(now) {
  const dtMs = Math.min(64, now - lastFrame);
  lastFrame = now;
  const dt = dtMs / 1000;

  const { dx, dy } = input.consumeMouseDelta();
  if (input.isLocked() && (dx !== 0 || dy !== 0)) {
    camera.rotate(dx * MOUSE_SENSITIVITY, -dy * MOUSE_SENSITIVITY);
  }

  // Handle mouse wheel zoom (Ctrl/Cmd + Scroll)
  const zoomDelta = input.consumeZoomDelta();
  if (zoomDelta !== 0) {
    camera.zoom(-zoomDelta);
    ui.setFov(camera.getDistance());
  }

  const speed = BASE_MOVE_SPEED * input.getSpeedMultiplier() * dt;
  let f = 0, r = 0, u = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp'))    f += 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown'))  f -= 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft'))  r -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) r += 1;
  if (input.keys.has('Space')) u += 1;
  if (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')) u -= 1;
  if (f || r || u) camera.move(f * speed, r * speed, u * speed);

  // Progressive rendering: detectar movimiento
  const wasMoving = isMoving;
  isMoving = (f !== 0 || r !== 0 || u !== 0 || dx !== 0 || dy !== 0);

  if (isMoving) {
    stillSince = now;
    currentProgressiveRatio = PROGRESSIVE.movingRatio;
  } else {
    const stillTime = now - stillSince;
    if (stillTime > PROGRESSIVE.settleTime) {
      // Rampa gradual hacia la calidad objetivo
      const targetRatio = QUALITY_LEVELS[qualityIdx].pixelRatio;
      currentProgressiveRatio = Math.min(
        targetRatio,
        currentProgressiveRatio + PROGRESSIVE.rampSpeed * dt
      );
    }
  }

  // Aplicar ratio progresivo
  const effectiveRatio = Math.min(
    window.devicePixelRatio || 1,
    currentProgressiveRatio
  );
  renderer.setPixelRatio(effectiveRatio);

  renderer.render({
    time: now * 0.001,
    camPos:     camera.state.position,
    camForward: camera.state.forward,
    camRight:   camera.state.right,
    camUp:      camera.state.up,
    focal:      camera.focal(),
    fractalId:  currentFractal.id,
    maxIter:    currentFractal.maxIter,
    maxSteps:   isMoving ? Math.floor(QUALITY_LEVELS[qualityIdx].maxSteps * 0.6) : QUALITY_LEVELS[qualityIdx].maxSteps,
    fogDensity: currentFractal.fogDensity,
    paletteSeed: currentFractal.paletteSeed
  });

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
