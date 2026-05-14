#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uResolution;
uniform int uPass; // 0=extract, 1=blur-h, 2=blur-v, 3=composite

const float BLOOM_THRESHOLD = 0.6;
const float BLOOM_INTENSITY = 0.35;
const float BLOOM_RADIUS = 1.5;

// Gaussian weights for 9-tap blur
const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec2 texel = 1.0 / uResolution;

  if (uPass == 0) {
    // Pass 0: Extract bright pixels
    vec3 col = texture(uScene, vUV).rgb;
    float brightness = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float soft = smoothstep(BLOOM_THRESHOLD, BLOOM_THRESHOLD + 0.3, brightness);
    fragColor = vec4(col * soft, 1.0);

  } else if (uPass == 1) {
    // Pass 1: Horizontal blur
    vec3 result = texture(uScene, vUV).rgb * weights[0];
    for (int i = 1; i < 5; i++) {
      vec2 offset = vec2(float(i) * BLOOM_RADIUS, 0.0) * texel;
      result += texture(uScene, vUV + offset).rgb * weights[i];
      result += texture(uScene, vUV - offset).rgb * weights[i];
    }
    fragColor = vec4(result, 1.0);

  } else if (uPass == 2) {
    // Pass 2: Vertical blur
    vec3 result = texture(uScene, vUV).rgb * weights[0];
    for (int i = 1; i < 5; i++) {
      vec2 offset = vec2(0.0, float(i) * BLOOM_RADIUS) * texel;
      result += texture(uScene, vUV + offset).rgb * weights[i];
      result += texture(uScene, vUV - offset).rgb * weights[i];
    }
    fragColor = vec4(result, 1.0);

  } else {
    // Pass 3: Composite
    vec3 scene = texture(uScene, vUV).rgb;
    vec3 bloom = texture(uBloom, vUV).rgb;

    // Additive blend with intensity
    vec3 result = scene + bloom * BLOOM_INTENSITY;

    // Slight vignette
    vec2 center = vUV - 0.5;
    float vignette = 1.0 - dot(center, center) * 0.5;
    result *= vignette;

    fragColor = vec4(result, 1.0);
  }
}
