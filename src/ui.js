import { FRACTALS, FRACTAL_COUNT, getFractal } from './fractals.js';

const HUD_MODES = ['full', 'compact', 'hidden'];

export function createUI({ onChange }) {
  const hud = document.getElementById('hud');
  const input = document.getElementById('fractalIdx');
  const nameEl = document.getElementById('fractalName');
  const speedEl = document.getElementById('speedMultiplier');
  const qualityEl = document.getElementById('qualityLevel');
  const overlay = document.getElementById('lockOverlay');

  input.min = '1';
  input.max = String(FRACTAL_COUNT);

  let modeIdx = 0;
  function applyMode() {
    hud.classList.remove('mode-full', 'mode-compact', 'mode-hidden');
    hud.classList.add('mode-' + HUD_MODES[modeIdx]);
  }
  applyMode();

  function setIndex(i1) {
    const clamped = Math.max(1, Math.min(FRACTAL_COUNT, i1 | 0));
    input.value = String(clamped);
    const f = getFractal(clamped);
    nameEl.textContent = f.name;
    onChange(f);
    if (document.activeElement === input) input.blur();
  }

  input.addEventListener('change', () => setIndex(Number(input.value)));
  input.addEventListener('blur', () => setIndex(Number(input.value)));

  function cycleHud() {
    modeIdx = (modeIdx + 1) % HUD_MODES.length;
    applyMode();
  }

  function setLockState(locked) {
    if (locked) overlay.classList.add('hidden');
    else overlay.classList.remove('hidden');
  }

  function setSpeed(mult) {
    if (speedEl) speedEl.textContent = '× ' + mult.toFixed(2);
  }

  function setQuality(label) {
    if (qualityEl) qualityEl.textContent = label;
  }

  overlay.classList.remove('hidden');

  return {
    setIndex,
    cycleHud,
    setLockState,
    setSpeed,
    setQuality,
    getIndex: () => Number(input.value),
    count: FRACTAL_COUNT,
    list: FRACTALS
  };
}
