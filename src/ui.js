import { FRACTALS, FRACTAL_COUNT, getFractal } from './fractals.js';

export function createUI({ onChange }) {
  const hud = document.getElementById('hud');
  const input = document.getElementById('fractalIdx');
  const nameEl = document.getElementById('fractalName');
  const overlay = document.getElementById('lockOverlay');

  input.min = '1';
  input.max = String(FRACTAL_COUNT);

  function setIndex(i1) {
    const clamped = Math.max(1, Math.min(FRACTAL_COUNT, i1 | 0));
    input.value = String(clamped);
    const f = getFractal(clamped);
    nameEl.textContent = f.name;
    onChange(f);
    // Devolvemos el foco al body para que WASD funcione inmediatamente.
    if (document.activeElement === input) input.blur();
  }

  input.addEventListener('change', () => setIndex(Number(input.value)));
  input.addEventListener('blur', () => setIndex(Number(input.value)));

  function toggleHidden() {
    hud.classList.toggle('hidden');
  }

  function setLockState(locked) {
    if (locked) overlay.classList.add('hidden');
    else overlay.classList.remove('hidden');
  }

  // Estado inicial: mostrar overlay "click para entrar".
  overlay.classList.remove('hidden');

  return {
    setIndex,
    toggleHidden,
    setLockState,
    getIndex: () => Number(input.value),
    count: FRACTAL_COUNT,
    list: FRACTALS
  };
}
