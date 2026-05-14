# Fractales 3D

Visualizador navegable de fractales 3D con raymarching en WebGL2. Sin TypeScript, sin frameworks de UI. JavaScript vanilla + Vite + GLSL.

## Catálogo

| # | Nombre |
|---|--------|
| 1 | Mandelbulb (n=8) |
| 2 | Mandelbox |
| 3 | Julia cuaterniónica |
| 4 | Sierpinski tetraedro |
| 5 | Menger sponge |
| 6 | Apollonian |
| 7 | Pseudo-Kleinian |
| 8 | Amazing Box |
| 9 | Mandelbulb (n=2) |
| 10 | Octaedro KIFS |

## Requisitos

- Navegador con soporte WebGL2 (Chrome, Firefox, Edge, Safari 15+).
- Node.js 18+ para desarrollo.

## Uso

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite (típicamente `http://localhost:5173`). Click sobre el canvas (fuera del HUD) para capturar el mouse.

## Controles

| Acción | Tecla |
|--------|-------|
| Capturar mouse | Click en el canvas |
| Soltar mouse | `Esc` |
| Mirar | Mouse |
| Mover | `W` `A` `S` `D` (o flechas) |
| Subir / bajar | `Space` / `Shift` |
| Cambiar velocidad | Scroll |
| Cambiar fractal | input numérico, o `+` / `-` |
| Resetear cámara | `R` |
| Ocultar HUD | `H` |

## Configurar fractal

Es lo único configurable. Cambia el número en el HUD (1 a 10) o usa `+`/`-`.

## Build

```bash
npm run build
npm run preview
```

## Notas técnicas

- WebGL2 fragment shader hace sphere tracing sobre 10 distance estimators.
- Un único triángulo fullscreen generado por `gl_VertexID` (sin VBOs).
- Cámara FPS con yaw/pitch, world-up fijo en `+Y`, vuelo libre.
- Iluminación: difusa direccional + AO por número de pasos + rim light + niebla exponencial + tone mapping Reinhard + gamma 2.2.
- Render a `min(devicePixelRatio, 1.25)` por defecto para no tanquear GPUs débiles.
