// A small WebGL image reel. DOM buttons remain the interactive and accessible layer.
const vertexSource = `
attribute vec2 aPosition;
uniform vec2 uViewport;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform float uBend;
uniform vec2 uPointer;
varying vec2 vUv;
void main() {
  vUv = aPosition + .5;
  vec2 p = aPosition * uSize;
  float arch = cos(aPosition.x * 3.14159265);
  p.y += arch * uBend * uSize.y;
  p.x *= 1.0 + aPosition.y * uBend * .42;
  p.x += aPosition.y * uPointer.x * 9.0;
  p.y += aPosition.x * uPointer.y * 7.0;
  vec2 screen = uCenter + p;
  gl_Position = vec4(screen.x / uViewport.x * 2.0 - 1.0, 1.0 - screen.y / uViewport.y * 2.0, 0.0, 1.0);
}`;
const fragmentSource = `
precision mediump float;
uniform sampler2D uTexture;
uniform float uFocus;
varying vec2 vUv;
void main() {
  vec4 image = texture2D(uTexture, vUv);
  float gray = dot(image.rgb, vec3(.299, .587, .114));
  vec3 color = mix(vec3(gray), image.rgb, uFocus);
  gl_FragColor = vec4(color * mix(.42, 1.0, uFocus), image.a);
}`;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function createGalleryMotion(track) {
  const cards = [...track.querySelectorAll('.project-card')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerDevice = matchMedia('(hover: hover) and (pointer: fine)');
  const canvas = document.createElement('canvas');
  canvas.className = 'reel-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  track.prepend(canvas);
  let gl, program, buffers, uniforms, textures = [];
  let target = 0, position = 0, previous = 0, frame = 0, lastTime = 0;
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
    gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL unavailable');
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Reel program linking failed');
    gl.useProgram(program);
    uniforms = Object.fromEntries(['uViewport','uCenter','uSize','uBend','uPointer','uFocus'].map(name => [name, gl.getUniformLocation(program, name)]));
    const vertices = [], indices = [], columns = 32, rows = 20;
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
      const ratio = Math.min(devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    wake();
  }
  function draw(time) {
    frame = 0;
    const dt = Math.min(40, time - (lastTime || time - 16.67)); lastTime = time;
    const ease = reduced.matches ? 1 : 1 - Math.exp(-dt / 150);
    previous = position; position += (target - position) * ease;
    pointerX += (px - pointerX) * ease; pointerY += (py - pointerY) * ease;
    const velocity = (position - previous) / Math.max(dt / 16.67, .1);
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
      const bend = reduced.matches ? 0 : clamp(velocity * 2.8, -.29, .29);
      card.style.transform = `translate(-50%,-50%) translate(${x - width / 2}px,${y - centerY}px) scale(${scale})`;
      card.style.opacity = distance > 1.8 ? '0' : '1';
      card.style.filter = `grayscale(${1 - focus}) brightness(${.42 + .58 * focus})`;
      card.style.visibility = distance > 1.85 ? 'hidden' : 'visible';
      card.style.setProperty('--fallback-bend', `${bend * 18}deg`);
      return { i, distance, focus, scale, x, y, bend };
    }).sort((a,b) => b.distance - a.distance);
    if (gl) entries.forEach(({ i, distance, focus, scale, x, y, bend }) => {
      if (!textures[i] || distance > 1.85) return;
      gl.bindTexture(gl.TEXTURE_2D, textures[i]);
      gl.uniform2f(uniforms.uCenter, x, y); gl.uniform2f(uniforms.uSize, cardWidth * scale, cardHeight * scale);
      gl.uniform1f(uniforms.uBend, bend); gl.uniform2f(uniforms.uPointer, pointerX * focus, pointerY * focus);
      gl.uniform1f(uniforms.uFocus, focus); gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);
    });
    if (Math.abs(target - position) > .0003 || Math.abs(px - pointerX) + Math.abs(py - pointerY) > .002) wake();
    else { position = target; lastTime = 0; }
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
    goTo(index, direction = 0) {
      const current = ((target % cards.length) + cards.length) % cards.length;
      let diff = index - current;
      if (Math.abs(diff) > cards.length / 2) diff -= Math.sign(diff) * cards.length;
      if (Math.abs(diff) === cards.length / 2 && direction) diff = Math.abs(diff) * direction;
      target += diff; wake();
    },
    intro() { if (!reduced.matches) { position = target - .8; wake(); } },
  };
}
