#version 300 es
precision highp float;

// Triángulo único que cubre el clip-space sin pasar atributos.
// gl_VertexID: 0,1,2 → (-1,-1), (3,-1), (-1,3)
out vec2 vUV;

void main() {
  vec2 pos = vec2(
    (gl_VertexID == 1) ? 3.0 : -1.0,
    (gl_VertexID == 2) ? 3.0 : -1.0
  );
  vUV = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
