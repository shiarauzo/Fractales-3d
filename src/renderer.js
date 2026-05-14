import vertSrc from './shaders/fullscreen.vert?raw';
import fragSrc from './shaders/raymarch.frag?raw';
import bloomSrc from './shaders/bloom.frag?raw';

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

  // Main fractal program
  const program = linkProgram(gl, vertSrc, fragSrc);

  // Bloom post-process program
  const bloomProgram = linkProgram(gl, vertSrc, bloomSrc);

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

  const bloomUniforms = {
    uScene:      gl.getUniformLocation(bloomProgram, 'uScene'),
    uBloom:      gl.getUniformLocation(bloomProgram, 'uBloom'),
    uResolution: gl.getUniformLocation(bloomProgram, 'uResolution'),
    uPass:       gl.getUniformLocation(bloomProgram, 'uPass')
  };

  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);

  // Enable float texture extension for bloom
  const extColorFloat = gl.getExtension('EXT_color_buffer_float');
  const useFloatTextures = !!extColorFloat;

  // Framebuffers for bloom
  let fboScene, fboBloom1, fboBloom2;
  let texScene, texBloom1, texBloom2;
  let fboWidth = 0, fboHeight = 0;

  function createFBO(width, height) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Use float textures if available, otherwise fall back to RGBA8
    if (useFloatTextures) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    // Check framebuffer status
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.warn('Framebuffer incomplete:', status);
    }

    return { fbo, tex };
  }

  function resizeFBOs(w, h) {
    if (w === fboWidth && h === fboHeight) return;
    fboWidth = w;
    fboHeight = h;

    // Cleanup old
    if (texScene) gl.deleteTexture(texScene);
    if (texBloom1) gl.deleteTexture(texBloom1);
    if (texBloom2) gl.deleteTexture(texBloom2);
    if (fboScene) gl.deleteFramebuffer(fboScene);
    if (fboBloom1) gl.deleteFramebuffer(fboBloom1);
    if (fboBloom2) gl.deleteFramebuffer(fboBloom2);

    // Create new - bloom buffers at half res for performance
    const bloomW = Math.floor(w / 2);
    const bloomH = Math.floor(h / 2);

    ({ fbo: fboScene, tex: texScene } = createFBO(w, h));
    ({ fbo: fboBloom1, tex: texBloom1 } = createFBO(bloomW, bloomH));
    ({ fbo: fboBloom2, tex: texBloom2 } = createFBO(bloomW, bloomH));

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function resize() {
    const w = Math.floor(canvas.clientWidth * pixelRatio);
    const h = Math.floor(canvas.clientHeight * pixelRatio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    resizeFBOs(w, h);
  }

  function setPixelRatio(r) {
    pixelRatio = Math.max(0.25, Math.min(2.0, r));
  }

  function render(state) {
    resize();
    gl.bindVertexArray(vao);

    const w = canvas.width;
    const h = canvas.height;

    // Safety check - if FBOs aren't ready, render directly to screen
    if (!fboScene || !texScene) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(program);

      gl.uniform2f(uniforms.uResolution, w, h);
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
      return;
    }

    const bloomW = Math.floor(w / 2);
    const bloomH = Math.floor(h / 2);

    // Pass 1: Render fractal to FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboScene);
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);

    gl.uniform2f(uniforms.uResolution, w, h);
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

    // Pass 2: Extract bright pixels
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloom1);
    gl.viewport(0, 0, bloomW, bloomH);
    gl.useProgram(bloomProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texScene);
    gl.uniform1i(bloomUniforms.uScene, 0);
    gl.uniform2f(bloomUniforms.uResolution, bloomW, bloomH);
    gl.uniform1i(bloomUniforms.uPass, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 3: Horizontal blur
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloom2);
    gl.bindTexture(gl.TEXTURE_2D, texBloom1);
    gl.uniform1i(bloomUniforms.uPass, 1);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 4: Vertical blur
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloom1);
    gl.bindTexture(gl.TEXTURE_2D, texBloom2);
    gl.uniform1i(bloomUniforms.uPass, 2);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Pass 5: Composite to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texScene);
    gl.uniform1i(bloomUniforms.uScene, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texBloom1);
    gl.uniform1i(bloomUniforms.uBloom, 1);

    gl.uniform2f(bloomUniforms.uResolution, w, h);
    gl.uniform1i(bloomUniforms.uPass, 3);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return { gl, render, resize, setPixelRatio, getPixelRatio: () => pixelRatio };
}
