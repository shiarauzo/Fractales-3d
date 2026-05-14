// Catálogo de fractales 3D. Cada entrada define parámetros usados por el
// renderer y la cámara (posición inicial para no quedar dentro del sólido).
//
// shaderId debe coincidir con el switch en raymarch.frag.

export const FRACTALS = [
  {
    id: 0,
    name: 'Mandelbulb (n=8)',
    defaultPos: [0.0, 0.0, 2.4],
    maxIter: 10,
    fogDensity: 0.06,
    paletteSeed: [0.10, 0.50, 0.80]
  },
  {
    id: 1,
    name: 'Mandelbox',
    defaultPos: [0.0, 0.0, 6.5],
    maxIter: 14,
    fogDensity: 0.04,
    paletteSeed: [0.85, 0.30, 0.20]
  },
  {
    id: 2,
    name: 'Julia cuaterniónica',
    defaultPos: [0.0, 0.0, 2.2],
    maxIter: 11,
    fogDensity: 0.07,
    paletteSeed: [0.40, 0.10, 0.75]
  },
  {
    id: 3,
    name: 'Sierpinski tetraedro',
    defaultPos: [0.0, 0.0, 3.0],
    maxIter: 14,
    fogDensity: 0.05,
    paletteSeed: [0.60, 0.85, 0.20]
  },
  {
    id: 4,
    name: 'Menger sponge',
    defaultPos: [0.0, 0.0, 3.2],
    maxIter: 6,
    fogDensity: 0.05,
    paletteSeed: [0.95, 0.55, 0.10]
  },
  {
    id: 5,
    name: 'Apollonian',
    defaultPos: [0.0, 0.0, 2.6],
    maxIter: 8,
    fogDensity: 0.10,
    paletteSeed: [0.25, 0.75, 0.55]
  },
  {
    id: 6,
    name: 'Pseudo-Kleinian',
    defaultPos: [0.0, 0.0, 4.8],
    maxIter: 12,
    fogDensity: 0.06,
    paletteSeed: [0.55, 0.25, 0.95]
  },
  {
    id: 7,
    name: 'Amazing Box',
    defaultPos: [0.0, 0.0, 6.0],
    maxIter: 14,
    fogDensity: 0.04,
    paletteSeed: [0.15, 0.70, 0.90]
  },
  {
    id: 8,
    name: 'Mandelbulb (n=2)',
    defaultPos: [0.0, 0.0, 2.4],
    maxIter: 12,
    fogDensity: 0.06,
    paletteSeed: [0.75, 0.45, 0.05]
  },
  {
    id: 9,
    name: 'Octaedro KIFS',
    defaultPos: [0.0, 0.0, 3.4],
    maxIter: 10,
    fogDensity: 0.05,
    paletteSeed: [0.05, 0.55, 0.35]
  }
];

export function getFractal(index1Based) {
  const i = Math.max(1, Math.min(FRACTALS.length, index1Based | 0)) - 1;
  return FRACTALS[i];
}

export const FRACTAL_COUNT = FRACTALS.length;
