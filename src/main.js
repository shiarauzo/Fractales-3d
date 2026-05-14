import { createRenderer } from './renderer.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { getFractal } from './fractals.js';

const MOUSE_SENSITIVITY = 0.0022;
const BASE_MOVE_SPEED   = 1.4; // unidades por segundo

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

const ui = createUI({
  onChange: (f) => {
    currentFractal = f;
    camera.reset(f.defaultPos);
  }
});
ui.setIndex(1);

const input = createInput(canvas, {
  onKey: (code) => {
    if (code === 'KeyH') ui.toggleHidden();
    if (code === 'KeyR') camera.reset(currentFractal.defaultPos);
    if (code === 'NumpadAdd' || code === 'Equal' || code === 'BracketRight') {
      ui.setIndex(ui.getIndex() + 1);
    }
    if (code === 'NumpadSubtract' || code === 'Minus' || code === 'BracketLeft') {
      ui.setIndex(ui.getIndex() - 1);
    }
  },
  onLockChange: (locked) => ui.setLockState(locked)
});

window.addEventListener('resize', () => renderer.resize());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) lastFrame = performance.now();
});

let lastFrame = performance.now();

function frame(now) {
  const dtMs = Math.min(64, now - lastFrame);
  lastFrame = now;
  const dt = dtMs / 1000;

  // Mouse → rotación de cámara (sólo si pointer lock activo)
  const { dx, dy } = input.consumeMouseDelta();
  if (input.isLocked() && (dx !== 0 || dy !== 0)) {
    camera.rotate(dx * MOUSE_SENSITIVITY, -dy * MOUSE_SENSITIVITY);
  }

  // Teclado → movimiento
  const speed = BASE_MOVE_SPEED * input.getSpeedMultiplier() * dt;
  let f = 0, r = 0, u = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp'))    f += 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown'))  f -= 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft'))  r -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) r += 1;
  if (input.keys.has('Space')) u += 1;
  if (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')) u -= 1;
  if (f || r || u) camera.move(f * speed, r * speed, u * speed);

  renderer.render({
    time: now * 0.001,
    camPos:     camera.state.position,
    camForward: camera.state.forward,
    camRight:   camera.state.right,
    camUp:      camera.state.up,
    focal:      camera.focal(),
    fractalId:  currentFractal.id,
    maxIter:    currentFractal.maxIter,
    fogDensity: currentFractal.fogDensity,
    paletteSeed: currentFractal.paletteSeed
  });

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
