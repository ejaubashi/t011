// A decaying screen-space velocity field, stored in two small RGBA8 targets.
// No floating-point texture extension is required, including on mobile WebGL.
export function createFlowField(gl) {
  const size = 128;
  const vertex = `attribute vec2 aPosition; varying vec2 vUv;
    void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
  const fragment = `precision mediump float;
    uniform sampler2D uPrevious;
    uniform vec2 uPointer;
    uniform vec2 uVelocity;
    uniform float uInject;
    uniform float uDelta;
    uniform float uAspect;
    varying vec2 vUv;
    const float neutral=128./255.;
    vec2 decode(vec2 value){return (value-vec2(neutral))*(255./127.);}
    void main(){
      vec2 oldVelocity=decode(texture2D(uPrevious,vUv).rg);
      vec2 uv=clamp(vUv-oldVelocity*uDelta*.18,vec2(.001),vec2(.999));
      vec3 previous=texture2D(uPrevious,uv).rgb;
      vec2 velocity=decode(previous.rg)*pow(.9,uDelta*60.);
      float energy=previous.b*pow(.88,uDelta*60.);
      vec2 distance=(vUv-uPointer)*vec2(uAspect,1.);
      float splat=exp(-dot(distance,distance)/.0028)*uInject;
      velocity=clamp(velocity+uVelocity*splat,-1.,1.);
      energy=clamp(energy+splat*.7,0.,1.);
      gl_FragColor=vec4(velocity*(127./255.)+neutral,energy,1.);
    }`;
  const resources = [];
  const compile = (type, source) => {
    const shader = gl.createShader(type); resources.push(['Shader', shader]);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Flow shader compilation failed');
    return shader;
  };
  const program = gl.createProgram(); resources.push(['Program', program]);
  let targets;
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Flow shader linking failed');
    targets = Array.from({ length: 2 }, () => {
      const texture = gl.createTexture(); resources.push(['Texture', texture]);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const framebuffer = gl.createFramebuffer(); resources.push(['Framebuffer', framebuffer]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Flow framebuffer unavailable');
      gl.clearColor(128 / 255, 128 / 255, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture, framebuffer };
    });
  } catch (error) {
    resources.forEach(([type, value]) => gl[`delete${type}`](value));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    throw error;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const buffer = gl.createBuffer(); resources.push(['Buffer', buffer]);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const attribute = gl.getAttribLocation(program, 'aPosition');
  const uniforms = Object.fromEntries(['uPrevious','uPointer','uVelocity','uInject','uDelta','uAspect'].map(name => [name, gl.getUniformLocation(program, name)]));
  let read = 0, energy = 0, input = null;
  return {
    get texture() { return targets[read].texture; },
    get energy() { return energy; },
    splat(x, y, dx, dy) {
      input = { x, y, dx: Math.max(-1, Math.min(1, dx)), dy: Math.max(-1, Math.min(1, dy)) };
      energy = 1;
    },
    update(seconds, aspect) {
      if (energy <= .002 && !input) return;
      const write = 1 - read;
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets[write].framebuffer);
      gl.viewport(0, 0, size, size); gl.disable(gl.BLEND);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, targets[read].texture);
      gl.uniform1i(uniforms.uPrevious, 0);
      gl.uniform1f(uniforms.uDelta, Math.min(.05, seconds));
      gl.uniform1f(uniforms.uAspect, aspect);
      gl.uniform2f(uniforms.uPointer, input?.x ?? -2, input?.y ?? -2);
      gl.uniform2f(uniforms.uVelocity, input?.dx ?? 0, input?.dy ?? 0);
      gl.uniform1f(uniforms.uInject, input ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      read = write; input = null; energy *= Math.exp(-seconds * 5.5);
      if (energy <= .002) {
        targets.forEach(target => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
          gl.clearColor(128 / 255, 128 / 255, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
        });
        energy = 0;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    clear() {
      input = null; energy = 0;
      targets.forEach(target => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.clearColor(128 / 255, 128 / 255, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
  };
}
