import { createReelPhysics } from './reel-physics.js';

// A small WebGL image reel. DOM buttons remain the interactive and accessible layer.
const vertexSource = `
attribute vec2 aPosition;
uniform vec2 uViewport;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform vec2 uUvScale;
uniform float uBend;
uniform float uDepth;
uniform vec2 uRotation;
varying vec2 vUv;
varying float vLight;
void main() {
  vUv = aPosition * uUvScale + .5;
  vec3 p = vec3(aPosition * uSize, 0.0);
  float arch = cos(aPosition.x * 3.14159265);
  // Deform the actual surface in depth, then rotate it in camera space.
  p.z += arch * uBend * uSize.y * .85;
  p.y += arch * uBend * uSize.y * .2;
  float cx = cos(uRotation.x), sx = sin(uRotation.x);
  float cy = cos(uRotation.y), sy = sin(uRotation.y);
  p.yz = vec2(p.y * cx - p.z * sx, p.y * sx + p.z * cx);
  p.xz = vec2(p.x * cy + p.z * sy, -p.x * sy + p.z * cy);
  float focal = max(uViewport.y, 900.0) * 1.35;
  float w = 1.0 - (p.z + uDepth) / focal;
  vec2 center = vec2(uCenter.x / uViewport.x * 2.0 - 1.0, 1.0 - uCenter.y / uViewport.y * 2.0);
  gl_Position = vec4(center * w + vec2(p.x / uViewport.x, -p.y / uViewport.y) * 2.0, -p.z / focal, w);
  vLight = 1.0 + sin(aPosition.x * 3.14159265) * uBend * .14;
}`;
const fragmentSource = `
precision mediump float;
uniform sampler2D uTexture;
uniform float uFocus;
uniform float uOpacity;
varying vec2 vUv;
varying float vLight;
void main() {
  vec4 image = texture2D(uTexture, vUv);
  float gray = dot(image.rgb, vec3(.299, .587, .114));
  vec3 color = mix(vec3(gray), image.rgb, uFocus);
  float alpha = image.a * uOpacity;
  gl_FragColor = vec4(color * mix(.42, 1.0, uFocus) * vLight * alpha, alpha);
}`;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function createGalleryMotion(track, onSelect = () => {}) {
  const cards = [...track.querySelectorAll('.project-card')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerDevice = matchMedia('(hover: hover) and (pointer: fine)');
  const canvas = document.createElement('canvas');
  canvas.className = 'reel-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  track.prepend(canvas);
  let gl, program, buffers, uniforms, textures = [];
  const physics = createReelPhysics(cards.length);
  let frame = 0, lastTime = 0, selected = 0;
  let pixelRatio = Math.min(devicePixelRatio || 1, 1.75), frameAverage = 16.67, slowFrames = 0;
  let px = 0, py = 0, pointerX = 0, pointerY = 0;
  let width = 0, height = 0, cardWidth = 0, cardHeight = 0, centerY = 0;

  function shader(type, source) {
    const value = gl.createShader(type);
    gl.shaderSource(value, source); gl.compileShader(value);
    if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error('Reel shader compilation failed');
    return value;
  }
  function disableWebGL() {
    gl = null;
    canvas.remove();
    track.classList.remove('webgl-ready');
  }
  try {
    gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) throw new Error('WebGL unavailable');
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Reel program linking failed');
    gl.useProgram(program);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    uniforms = Object.fromEntries(['uViewport','uCenter','uSize','uUvScale','uBend','uDepth','uRotation','uFocus','uOpacity'].map(name => [name, gl.getUniformLocation(program, name)]));
    const vertices = [], indices = [], columns = 40, rows = 24;
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) vertices.push(x / columns - .5, y / rows - .5);
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const i = y * (columns + 1) + x;
      indices.push(i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1);
    }
    const vertex = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vertex); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, 'aPosition'); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    const index = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    buffers = { count: indices.length };
    cards.forEach((card, i) => {
      const image = card.querySelector('img');
      const upload = () => {
        if (!gl || !image.naturalWidth) return;
        try {
          const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          textures[i] = texture;
          // Hide each DOM image only after its own texture is ready.
          card.classList.add('texture-ready'); track.classList.add('webgl-ready'); wake();
        } catch { disableWebGL(); }
      };
      if (image.complete) upload(); else image.addEventListener('load', upload, { once: true });
    });
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); disableWebGL(); });
  } catch { disableWebGL(); }

  function resize() {
    const style = getComputedStyle(cards[0]);
    width = track.clientWidth; height = track.clientHeight;
    cardWidth = parseFloat(style.width); cardHeight = parseFloat(style.height);
    centerY = parseFloat(style.top);
    if (gl) {
      canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    wake();
  }
  function draw(time) {
    frame = 0;
    const elapsed = time - (lastTime || time - 16.67);
    const dt = Math.min(50, elapsed); lastTime = time;
    const before = physics.position;
    physics.step(dt / 1000, time, reduced.matches);
    const { position, velocity } = physics;
    const ease = reduced.matches ? 1 : 1 - Math.exp(-dt / 110);
    pointerX += (px - pointerX) * ease; pointerY += (py - pointerY) * ease;
    if (selected !== physics.index) {
      selected = physics.index;
      onSelect(selected, Math.sign(position - before) || Math.sign(velocity));
    }
    track.dataset.position = position.toFixed(5);
    track.dataset.motion = physics.mode;
    // Reduce the backing buffer only after sustained slow active frames.
    if (gl && elapsed < 100 && physics.mode !== 'idle') {
      frameAverage += (elapsed - frameAverage) * .08;
      slowFrames = frameAverage > 25 ? slowFrames + 1 : 0;
      if (slowFrames > 25 && pixelRatio > 1) {
        pixelRatio = Math.max(1, pixelRatio * .8); slowFrames = 0; resize();
      }
    }
    if (gl) {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program); gl.uniform2f(uniforms.uViewport, width, height);
    }
    const entries = cards.map((card, i) => {
      const offset = ((i - position + 2) % cards.length + cards.length) % cards.length - 2;
      const distance = Math.abs(offset);
      const focus = Math.max(0, 1 - distance);
      const scale = distance <= 1 ? .64 + .36 * focus * focus * (3 - 2 * focus) : .64;
      const x = width / 2 + pointerX * 9 * focus;
      const y = centerY + offset * cardHeight * .85 + pointerY * 6 * focus;
      const bend = reduced.matches ? 0 : clamp(velocity * .065, -.24, .24);
      const depth = reduced.matches ? 0 : -distance * distance * 36 + focus * Math.min(Math.abs(velocity), 5) * 5;
      const pitch = reduced.matches ? 0 : clamp(offset * -.05 + velocity * .018, -.18, .18);
      const yaw = reduced.matches ? 0 : pointerX * focus * .08;
      const focal = Math.max(height, 900) * 1.35;
      card.style.transform = `translate(-50%,-50%) translate(${x - width / 2}px,${y - centerY}px) perspective(${focal}px) translateZ(${depth}px) rotateX(${pitch}rad) rotateY(${yaw}rad) scale(${scale})`;
      const opacity = clamp((1.85 - distance) / .5, 0, 1);
      card.style.opacity = String(opacity);
      card.style.filter = `grayscale(${1 - focus}) brightness(${.42 + .58 * focus})`;
      card.style.visibility = distance > 1.85 ? 'hidden' : 'visible';
      card.style.setProperty('--fallback-bend', `${bend * 18}deg`);
      return { i, distance, focus, scale, x, y, bend, depth, pitch, yaw, opacity };
    }).sort((a,b) => b.distance - a.distance);
    if (gl) entries.forEach(({ i, distance, focus, scale, x, y, bend, depth, pitch, yaw, opacity }) => {
      if (!textures[i] || distance > 1.85) return;
      gl.bindTexture(gl.TEXTURE_2D, textures[i]);
      gl.uniform2f(uniforms.uCenter, x, y); gl.uniform2f(uniforms.uSize, cardWidth * scale, cardHeight * scale);
      const image = cards[i].querySelector('img');
      const imageAspect = image.naturalWidth / image.naturalHeight;
      const planeAspect = cardWidth / cardHeight;
      gl.uniform2f(uniforms.uUvScale, Math.min(1, planeAspect / imageAspect), Math.min(1, imageAspect / planeAspect));
      gl.uniform1f(uniforms.uBend, bend); gl.uniform1f(uniforms.uDepth, depth);
      gl.uniform2f(uniforms.uRotation, pitch, yaw);
      gl.uniform1f(uniforms.uFocus, focus); gl.uniform1f(uniforms.uOpacity, opacity); gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);
    });
    if (physics.mode !== 'idle' || Math.abs(px - pointerX) + Math.abs(py - pointerY) > .002) wake();
    else lastTime = 0;
  }
  function wake() { if (!frame) frame = requestAnimationFrame(draw); }
  track.parentElement.addEventListener('pointermove', e => {
    if (!pointerDevice.matches || reduced.matches) return;
    px = (e.clientX / width - .5) * 2; py = (e.clientY / height - .5) * 2; wake();
  });
  track.parentElement.addEventListener('pointerleave', () => { px = py = 0; wake(); });
  reduced.addEventListener('change', () => { if (reduced.matches) px = py = 0; wake(); });
  new ResizeObserver(resize).observe(track);
  track.classList.add('motion-ready'); resize();
  return {
    goTo(index, direction = 0, immediate = false) { physics.goTo(index, direction, immediate); wake(); },
    step(direction) { physics.stepBy(direction); wake(); },
    wheel(pixels, now) { physics.wheel(pixels / clamp(cardHeight * 1.15, 360, 580), now); wake(); },
    beginDrag(now) { physics.beginDrag(now); wake(); },
    drag(pixels, now) { physics.drag(pixels / (cardHeight * .85), now); wake(); },
    endDrag(now, cancelled) { physics.endDrag(now, cancelled); wake(); },
    intro() { if (!reduced.matches) { physics.intro(); wake(); } },
  };
}
