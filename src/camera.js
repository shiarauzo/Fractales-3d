// Cámara FPS con yaw/pitch. World-up fijo en +Y.

const WORLD_UP = [0, 1, 0];

function normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

export function createCamera(initialPos = [0, 0, 3]) {
  const state = {
    position: [...initialPos],
    yaw: -Math.PI / 2, // mirando hacia -Z
    pitch: 0,
    forward: [0, 0, -1],
    right:   [1, 0, 0],
    up:      [0, 1, 0],
    fov: 60 * (Math.PI / 180)
  };

  function recompute() {
    const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
    const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    state.forward = normalize([cp * cy, sp, cp * sy]);
    state.right   = normalize(cross(state.forward, WORLD_UP));
    state.up      = normalize(cross(state.right, state.forward));
  }

  function setPosition(p) {
    state.position[0] = p[0];
    state.position[1] = p[1];
    state.position[2] = p[2];
  }

  function reset(p) {
    setPosition(p);
    state.yaw = -Math.PI / 2;
    state.pitch = 0;
    recompute();
  }

  function rotate(dYaw, dPitch) {
    state.yaw   += dYaw;
    state.pitch += dPitch;
    const lim = Math.PI / 2 - 0.01;
    if (state.pitch > lim) state.pitch = lim;
    if (state.pitch < -lim) state.pitch = -lim;
    recompute();
  }

  function move(forwardAmt, rightAmt, upAmt) {
    // Forward y right en plano horizontal del mundo no — usamos camera-space
    // pero up usa WORLD_UP para no perder orientación.
    state.position[0] += state.forward[0] * forwardAmt + state.right[0] * rightAmt;
    state.position[1] += state.forward[1] * forwardAmt + state.right[1] * rightAmt + upAmt;
    state.position[2] += state.forward[2] * forwardAmt + state.right[2] * rightAmt;
  }

  function focal() {
    return 1.0 / Math.tan(state.fov * 0.5);
  }

  recompute();
  return { state, rotate, move, setPosition, reset, focal };
}
