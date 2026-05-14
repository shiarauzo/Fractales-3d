// Cámara orbital que siempre mira al centro (0,0,0) donde está el fractal.

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

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function createCamera(initialPos = [0, 0, 3]) {
  const state = {
    position: [...initialPos],
    target: [0, 0, 0],      // Centro del fractal
    azimuth: 0,             // Ángulo horizontal (radianes)
    elevation: 0,           // Ángulo vertical (radianes)
    distance: Math.hypot(...initialPos),
    forward: [0, 0, -1],
    right:   [1, 0, 0],
    up:      [0, 1, 0],
    fov: 60 * (Math.PI / 180)
  };

  function recompute() {
    // Calcular posición desde ángulos esféricos
    const ce = Math.cos(state.elevation);
    const se = Math.sin(state.elevation);
    const ca = Math.cos(state.azimuth);
    const sa = Math.sin(state.azimuth);

    state.position[0] = state.target[0] + state.distance * ce * sa;
    state.position[1] = state.target[1] + state.distance * se;
    state.position[2] = state.target[2] + state.distance * ce * ca;

    // Forward apunta al target
    state.forward = normalize(sub(state.target, state.position));

    // Right y Up
    const worldUp = [0, 1, 0];
    state.right = normalize(cross(state.forward, worldUp));
    state.up = normalize(cross(state.right, state.forward));
  }

  function setPosition(p) {
    // Calcular distancia y ángulos desde la nueva posición
    state.distance = Math.hypot(p[0], p[1], p[2]);
    if (state.distance < 0.1) state.distance = 0.1;

    state.elevation = Math.asin(p[1] / state.distance);
    state.azimuth = Math.atan2(p[0], p[2]);

    recompute();
  }

  function reset(p) {
    state.target = [0, 0, 0];
    setPosition(p);
  }

  function rotate(dAzimuth, dElevation) {
    state.azimuth += dAzimuth;
    state.elevation += dElevation;

    // Limitar elevación para no dar la vuelta
    const lim = Math.PI / 2 - 0.01;
    state.elevation = Math.max(-lim, Math.min(lim, state.elevation));

    recompute();
  }

  function move(forwardAmt, rightAmt, upAmt) {
    // Forward/backward = acercar/alejar del centro
    state.distance -= forwardAmt;
    state.distance = Math.max(0.1, Math.min(50, state.distance));

    // Right/Up = mover el target (pan)
    state.target[0] += state.right[0] * rightAmt + state.up[0] * upAmt;
    state.target[1] += state.right[1] * rightAmt + state.up[1] * upAmt;
    state.target[2] += state.right[2] * rightAmt + state.up[2] * upAmt;

    recompute();
  }

  function focal() {
    return 1.0 / Math.tan(state.fov * 0.5);
  }

  function zoom(delta) {
    // Zoom = cambiar distancia al centro
    state.distance -= delta * 2;
    state.distance = Math.max(0.1, Math.min(50, state.distance));
    recompute();
  }

  function getFov() {
    return state.fov * (180 / Math.PI);
  }

  function getDistance() {
    return state.distance;
  }

  recompute();
  return { state, rotate, move, setPosition, reset, focal, zoom, getFov, getDistance };
}
