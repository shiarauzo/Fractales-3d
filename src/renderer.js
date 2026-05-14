import vertSrc from './shaders/fullscreen.vert?raw';
import fragSrc from './shaders/raymarch.frag?raw';

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(
      `Shader (${type === gl.VERTEX_SHADER ? 'VERT' : 'FRAG'}) compile error:\n${info}`
    );
  }
  return sh;
}

function linkProgram(gl, vsSrc, fsSrc) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    throw new Error(`Program link error:\n${info}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  });
  if (!gl) {
    throw new Error('WebGL2 no está disponible en este navegador.');
  }

  const program = linkProgram(gl, vertSrc, fragSrc);
  gl.useProgram(program);

  // VAO vacío: el vertex shader genera un triángulo a partir de gl_VertexID.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const uniforms = {
    uResolution:  gl.getUniformLocation(program, 'uResolution'),
    uTime:        gl.getUniformLocation(program, 'uTime'),
    uCamPos:      gl.getUniformLocation(program, 'uCamPos'),
    uCamForward:  gl.getUniformLocation(program, 'uCamForward'),
    uCamRight:    gl.getUniformLocation(program, 'uCamRight'),
    uCamUp:       gl.getUniformLocation(program, 'uCamUp'),
    uFocal:       gl.getUniformLocation(program, 'uFocal'),
    uFractalId:   gl.getUniformLocation(program, 'uFractalId'),
    uMaxIter:     gl.getUniformLocation(program, 'uMaxIter'),
    uMaxSteps:    gl.getUniformLocation(program, 'uMaxSteps'),
    uFogDensity:  gl.getUniformLocation(program, 'uFogDensity'),
    uPaletteSeed: gl.getUniformLocation(program, 'uPaletteSeed')
  };

  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);

  function resize() {
    const w = Math.floor(canvas.clientWidth * pixelRatio);
    const h = Math.floor(canvas.clientHeight * pixelRatio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function setPixelRatio(r) {
    pixelRatio = Math.max(0.25, Math.min(2.0, r));
    resize();
  }

  function render(state) {
    resize();
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uTime, state.time);
    gl.uniform3fv(uniforms.uCamPos, state.camPos);
    gl.uniform3fv(uniforms.uCamForward, state.camForward);
    gl.uniform3fv(uniforms.uCamRight, state.camRight);
    gl.uniform3fv(uniforms.uCamUp, state.camUp);
    gl.uniform1f(uniforms.uFocal, state.focal);
    gl.uniform1i(uniforms.uFractalId, state.fractalId);
    gl.uniform1i(uniforms.uMaxIter, state.maxIter);
    gl.uniform1i(uniforms.uMaxSteps, state.maxSteps);
    gl.uniform1f(uniforms.uFogDensity, state.fogDensity);
    gl.uniform3fv(uniforms.uPaletteSeed, state.paletteSeed);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return { gl, render, resize, setPixelRatio, getPixelRatio: () => pixelRatio };
}
