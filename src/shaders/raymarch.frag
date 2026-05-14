#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uCamForward;
uniform vec3  uCamRight;
uniform vec3  uCamUp;
uniform float uFocal;       // tan(fov/2) factor
uniform int   uFractalId;   // 0..9
uniform int   uMaxIter;
uniform float uFogDensity;
uniform vec3  uPaletteSeed;
uniform int   uMaxSteps;    // configurable por nivel de calidad

const int   MAX_STEPS_CAP = 256;
const float MAX_DIST  = 80.0;
const float MIN_DIST  = 0.0008;

// -------------------------------------------------------------------------
// Distance Estimators
// Fórmulas estándar de la comunidad de raymarching:
//   Mandelbulb (Hvidtfeldt), Mandelbox (TGlad), Sierpinski/Menger (Knighty),
//   Apollonian (Tom Beddard), Pseudo-Kleinian (Knighty), Julia quaternion.
// -------------------------------------------------------------------------

float deMandelbulbN(vec3 pos, float power) {
  vec3 z = pos;
  float dr = 1.0;
  float r  = 1e-6;
  for (int i = 0; i < 32; i++) {
    if (i >= uMaxIter) break;
    r = length(z);
    if (r > 2.0) break;
    float theta = acos(clamp(z.z / max(r, 1e-6), -1.0, 1.0));
    float phi   = atan(z.y, z.x);
    dr = pow(r, power - 1.0) * power * dr + 1.0;
    float zr = pow(r, power);
    theta *= power;
    phi   *= power;
    z = zr * vec3(
      sin(theta) * cos(phi),
      sin(theta) * sin(phi),
      cos(theta)
    );
    z += pos;
  }
  return 0.5 * log(max(r, 1e-6)) * r / dr;
}

float deMandelbulb(vec3 pos)   { return deMandelbulbN(pos, 8.0); }
float deMandelbulbP2(vec3 pos) { return deMandelbulbN(pos, 2.0); }

float deMandelbox(vec3 pos) {
  float scale = 2.5;
  float minR2 = 0.25;
  float fixedR2 = 1.0;
  vec3 z = pos;
  float dr = 1.0;
  for (int i = 0; i < 32; i++) {
    if (i >= uMaxIter) break;
    // box fold
    z = clamp(z, -1.0, 1.0) * 2.0 - z;
    // sphere fold
    float r2 = dot(z, z);
    if (r2 < minR2) {
      float t = fixedR2 / minR2;
      z *= t;
      dr *= t;
    } else if (r2 < fixedR2) {
      float t = fixedR2 / r2;
      z *= t;
      dr *= t;
    }
    z = scale * z + pos;
    dr = dr * abs(scale) + 1.0;
  }
  return length(z) / abs(dr);
}

float deJuliaQ(vec3 pos) {
  vec4 z = vec4(pos, 0.0);
  vec4 c = vec4(-0.2, 0.4, -0.4, -0.4);
  float dr = 1.0;
  float r  = 1e-6;
  for (int i = 0; i < 32; i++) {
    if (i >= uMaxIter) break;
    r = length(z);
    if (r > 2.0) break;
    dr = 2.0 * r * dr;
    // cuaternio z^2
    z = vec4(
      z.x*z.x - dot(z.yzw, z.yzw),
      2.0 * z.x * z.yzw
    ) + c;
  }
  return 0.5 * log(max(r, 1e-6)) * r / dr;
}

float deSierpinski(vec3 pos) {
  // Tetrahedron KIFS clásico
  float scale = 2.0;
  vec3 z = pos;
  float r;
  int n = 0;
  for (int i = 0; i < 24; i++) {
    if (i >= uMaxIter) break;
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.zy = -z.yz;
    z = z * scale - vec3(1.0) * (scale - 1.0);
    n++;
  }
  return length(z) * pow(scale, float(-n));
}

float deMenger(vec3 pos) {
  vec3 z = pos;
  float scale = 3.0;
  float dist = 0.0;
  int iters = uMaxIter;
  if (iters > 16) iters = 16;
  // Caja base
  vec3 d = abs(z) - vec3(1.0);
  dist = min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
  float s = 1.0;
  for (int i = 0; i < 16; i++) {
    if (i >= iters) break;
    vec3 a = mod(z * s, 2.0) - 1.0;
    s *= scale;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;
    dist = max(dist, c);
  }
  return dist;
}

float deApollonian(vec3 pos) {
  // Formula clásica (Tom Beddard / KIFS)
  float s = 1.0;
  vec3 p = pos;
  for (int i = 0; i < 12; i++) {
    if (i >= uMaxIter) break;
    p = -1.0 + 2.0 * fract(0.5 * p + 0.5);
    float r2 = dot(p, p);
    float k = 1.3 / r2;
    p *= k;
    s *= k;
  }
  return 0.25 * abs(p.y) / s;
}

float dePseudoKleinian(vec3 pos) {
  // Knighty pseudo-Kleinian
  vec3 CSize = vec3(0.92, 0.92, 1.4);
  float DEoffset = 0.0;
  vec3 p = pos;
  float DEfactor = 1.0;
  for (int i = 0; i < 24; i++) {
    if (i >= uMaxIter) break;
    p = 2.0 * clamp(p, -CSize, CSize) - p;
    float k = max(0.70968 / dot(p, p), 1.0);
    p *= k;
    DEfactor *= k;
  }
  float rxy = length(p.xy);
  return 0.5 * max(rxy - 0.92, rxy * p.z / length(p)) / DEfactor - DEoffset;
}

float deAmazingBox(vec3 pos) {
  // Variante "amazing box" — Mandelbox modificado
  float scale = -1.77;
  vec3 z = pos;
  float dr = 1.0;
  for (int i = 0; i < 24; i++) {
    if (i >= uMaxIter) break;
    z = clamp(z, -1.0, 1.0) * 2.0 - z;
    float r2 = dot(z, z);
    if (r2 < 0.25) {
      float t = 4.0;
      z *= t;
      dr *= t;
    } else if (r2 < 1.0) {
      float t = 1.0 / r2;
      z *= t;
      dr *= t;
    }
    z = scale * z + pos;
    dr = dr * abs(scale) + 1.0;
  }
  return length(z) / abs(dr);
}

float deOctahedron(vec3 pos) {
  // KIFS octaédrico simétrico
  float scale = 2.0;
  vec3 z = pos;
  int n = 0;
  for (int i = 0; i < 20; i++) {
    if (i >= uMaxIter) break;
    z = abs(z);
    if (z.x < z.y) z.xy = z.yx;
    if (z.x < z.z) z.xz = z.zx;
    if (z.y < z.z) z.yz = z.zy;
    z = z * scale - vec3(scale - 1.0);
    if (z.z < -0.5 * (scale - 1.0)) z.z += (scale - 1.0);
    n++;
  }
  return (length(z) - 1.5) * pow(scale, float(-n));
}

// -------------------------------------------------------------------------

float mapDE(vec3 p) {
  if (uFractalId == 0) return deMandelbulb(p);
  if (uFractalId == 1) return deMandelbox(p);
  if (uFractalId == 2) return deJuliaQ(p);
  if (uFractalId == 3) return deSierpinski(p);
  if (uFractalId == 4) return deMenger(p);
  if (uFractalId == 5) return deApollonian(p);
  if (uFractalId == 6) return dePseudoKleinian(p);
  if (uFractalId == 7) return deAmazingBox(p);
  if (uFractalId == 8) return deMandelbulbP2(p);
  return deOctahedron(p);
}

// Normal por tetraedro (4 muestras)
vec3 calcNormal(vec3 p) {
  const float h = 0.0008;
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * mapDE(p + k.xyy * h) +
    k.yyx * mapDE(p + k.yyx * h) +
    k.yxy * mapDE(p + k.yxy * h) +
    k.xxx * mapDE(p + k.xxx * h)
  );
}

vec3 cosinePalette(float t, vec3 seed) {
  // Bioluminescent palette: cyan, coral, soft pink, teal
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = seed + vec3(0.0, 0.1, 0.2);
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 biolumPalette(float t) {
  // Fixed bioluminescent palette: cyan -> coral -> pink -> teal
  vec3 a = vec3(0.3, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.4, 0.4);
  vec3 c = vec3(1.0, 0.7, 0.8);
  vec3 d = vec3(0.0, 0.15, 0.2);
  return a + b * cos(6.28318 * (c * t + d));
}

// Hash function for pseudo-random
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// 3D noise
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
  );
}

// Floating particles/spores
vec4 particles(vec3 ro, vec3 rd, float maxT) {
  vec3 col = vec3(0.0);
  float alpha = 0.0;

  // Sample particles along the ray
  for (int i = 0; i < 24; i++) {
    float ti = float(i) * 0.4 + noise(rd * 10.0 + float(i)) * 0.3;
    if (ti > maxT) break;

    vec3 p = ro + rd * ti;

    // Grid of potential particle positions
    vec3 cellId = floor(p * 1.5);
    vec3 cellPos = fract(p * 1.5) - 0.5;

    // Randomize position within cell
    float h = hash(cellId);
    if (h > 0.85) { // Sparse particles
      vec3 offset = vec3(
        hash(cellId + 1.0) - 0.5,
        hash(cellId + 2.0) - 0.5,
        hash(cellId + 3.0) - 0.5
      ) * 0.6;

      // Animate position
      offset.y += sin(uTime * 0.5 + h * 6.28) * 0.1;
      offset.x += cos(uTime * 0.3 + h * 3.14) * 0.05;

      vec3 particlePos = cellPos - offset;
      float dist = length(particlePos);

      // Particle size varies
      float size = 0.04 + h * 0.06;

      if (dist < size) {
        // Soft glow
        float glow = exp(-dist * 20.0 / size);

        // Color based on hash - cyan to pink range
        vec3 particleCol = mix(
          vec3(0.3, 0.9, 1.0),  // cyan
          vec3(1.0, 0.5, 0.8),  // pink
          hash(cellId + 5.0)
        );

        // Pulsing brightness
        float pulse = 0.7 + 0.3 * sin(uTime * 2.0 + h * 10.0);

        col += particleCol * glow * pulse * 0.15;
        alpha += glow * 0.1;
      }
    }
  }

  return vec4(col, min(alpha, 1.0));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  vec3 rd = normalize(uCamForward + uCamRight * uv.x * uFocal + uCamUp * uv.y * uFocal);
  vec3 ro = uCamPos;

  // Si la cámara está dentro o muy pegada al sólido, avanzamos el origen
  // un poco para evitar quedarse atrapado en eps desde el paso 0.
  float dOrigin = mapDE(ro);
  if (dOrigin < MIN_DIST) {
    ro += rd * (MIN_DIST - dOrigin + 0.002);
  }

  float t = 0.0;
  int iSteps = 0;
  bool hit = false;
  for (int i = 0; i < MAX_STEPS_CAP; i++) {
    if (i >= uMaxSteps) break;
    iSteps = i;
    vec3 p = ro + rd * t;
    float d = mapDE(p);
    float eps = max(MIN_DIST, t * 0.0007);
    if (d < eps) { hit = true; break; }
    t += d * 0.9; // ligera under-relaxation para DEs IFS
    if (t > MAX_DIST) break;
  }

  vec3 col;
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 lightDir = normalize(vec3(0.6, 0.8, -0.4));
    vec3 lightDir2 = normalize(vec3(-0.4, 0.3, 0.6));
    float diff = clamp(dot(n, lightDir), 0.0, 1.0);
    float diff2 = clamp(dot(n, lightDir2), 0.0, 1.0);
    float ao = 1.0 - float(iSteps) / float(uMaxSteps);
    ao = clamp(ao, 0.0, 1.0);

    // Strong rim/glow effect for bioluminescent look
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.5);
    float innerGlow = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);

    // Main bioluminescent color
    vec3 base = biolumPalette(0.12 * t + 0.015 * float(iSteps));
    vec3 accent = cosinePalette(0.2 * t + 0.03 * float(iSteps), uPaletteSeed);

    // Cyan tint for primary light, coral for secondary
    vec3 cyanLight = vec3(0.4, 0.9, 1.0);
    vec3 coralLight = vec3(1.0, 0.6, 0.4);

    col = base * 0.15; // dim ambient
    col += base * diff * 0.5 * cyanLight;
    col += accent * diff2 * 0.3 * coralLight;
    col *= (0.5 + 0.5 * ao);

    // Strong glowing rim - bioluminescent edges
    vec3 rimColor = mix(vec3(0.3, 0.9, 1.0), vec3(1.0, 0.5, 0.7), sin(t * 0.5) * 0.5 + 0.5);
    col += rim * rimColor * 0.6;
    col += innerGlow * vec3(0.2, 0.8, 0.9) * 0.3;

    // Fog to pure black
    float fog = 1.0 - exp(-t * uFogDensity);
    col = mix(col, vec3(0.0), fog);
  } else {
    // Pure black background - minimal
    col = vec3(0.0);
  }

  // Add floating particles/spores
  float particleMaxDist = hit ? t : 15.0;
  vec4 parts = particles(ro, rd, particleMaxDist);
  col += parts.rgb;

  // tone mapping simple + gamma
  col = col / (1.0 + col);
  col = pow(col, vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
