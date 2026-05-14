// Input: teclado, mouse con pointer lock, scroll para velocidad.

export function createInput(canvas, callbacks = {}) {
  const keys = new Set();
  let mouseDX = 0, mouseDY = 0;
  let locked = false;
  let speedMultiplier = 1.0;

  function isTypingInForm() {
    const a = document.activeElement;
    if (!a) return false;
    const tag = a.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || a.isContentEditable;
  }

  function onKeyDown(e) {
    if (isTypingInForm()) return;
    // Evita scroll de la página con flechas / espacio cuando estamos en juego.
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);
    if (callbacks.onKey) callbacks.onKey(e.code);
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseMove(e) {
    if (!locked) return;
    mouseDX += e.movementX || 0;
    mouseDY += e.movementY || 0;
  }

  function onWheel(e) {
    // Solo consumimos el scroll cuando el usuario está "en el juego".
    if (!locked) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.001);
    speedMultiplier = Math.max(0.05, Math.min(50, speedMultiplier * factor));
    if (callbacks.onSpeed) callbacks.onSpeed(speedMultiplier);
  }

  function onClick() {
    if (locked) return;
    let p;
    try {
      // unadjustedMovement evita aceleración del SO en Chrome 88+.
      p = canvas.requestPointerLock?.({ unadjustedMovement: true });
    } catch (_) {
      p = canvas.requestPointerLock?.();
    }
    if (p && typeof p.then === 'function') {
      p.catch(() => {
        // Fallback: reintenta sin opciones (Safari, Firefox antiguos).
        try { canvas.requestPointerLock?.(); } catch (_) { /* noop */ }
      });
    }
  }

  function onLockChange() {
    locked = document.pointerLockElement === canvas;
    if (callbacks.onLockChange) callbacks.onLockChange(locked);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('click', onClick);
  document.addEventListener('pointerlockchange', onLockChange);

  function consumeMouseDelta() {
    const dx = mouseDX, dy = mouseDY;
    mouseDX = 0; mouseDY = 0;
    return { dx, dy };
  }

  return {
    keys,
    isLocked: () => locked,
    consumeMouseDelta,
    getSpeedMultiplier: () => speedMultiplier,
    setSpeedMultiplier: (m) => { speedMultiplier = m; }
  };
}
