// A reusable GPU compositor for the transition between the reel and a case study.
// The destination stays in the DOM for accessibility and is revealed on completion/cancel.
let renderer = null;
let unavailable = false;
let activeFlight = null;

function createRenderer() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha:true, antialias:false, premultipliedAlpha:true });
  if (!gl) return null;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Portal shader unavailable');
    return shader;
  };
  const vertex = `attribute vec2 aPosition; varying vec2 vUv;
    void main(){vUv=vec2(aPosition.x*.5+.5,.5-aPosition.y*.5);gl_Position=vec4(aPosition,0.,1.);}`;
  const fragment = `precision mediump float;
    uniform sampler2D uImage;
    uniform vec2 uViewport;
    uniform vec4 uBounds;
    uniform float uWave;
    uniform float uProgress;
    uniform float uAspect;
    varying vec2 vUv;
    float ease(float t){return t*t*(3.-2.*t);}
    float boxDistance(vec2 p,vec2 size,float radius){
      vec2 q=abs(p)-size+radius;
      return min(max(q.x,q.y),0.)+length(max(q,0.))-radius;
    }
    void main(){
      float t=uProgress;
      float wave=uWave;
      vec4 bounds=uBounds;
      vec2 center=bounds.xy+bounds.zw*.5;
      vec2 p=vUv*uViewport-center;
      float radius=min(bounds.z,bounds.w)*(.007+wave*.18);
      float distance=boxDistance(p,bounds.zw*.5,radius);
      if(distance>12.){gl_FragColor=vec4(0.);return;}
      float mask=1.-smoothstep(-1.,1.,distance);
      vec2 local=p/bounds.zw;
      float ratio=bounds.z/bounds.w;
      vec2 cover=vec2(min(1.,ratio/uAspect),min(1.,uAspect/ratio));
      vec2 uv=local*cover+.5;
      float radial=length(local*vec2(ratio,1.));
      vec2 ray=local/max(length(local),.001);
      float lens=sin(radial*13.-t*7.)*wave*wave*.012;
      uv+=ray*lens;
      float separation=wave*.0018;
      vec3 color=texture2D(uImage,clamp(uv,.001,.999)).rgb;
      if(wave>.15 && abs(distance)<28.){
        color.r=texture2D(uImage,clamp(uv+ray*separation,.001,.999)).r;
        color.b=texture2D(uImage,clamp(uv-ray*separation,.001,.999)).b;
      }
      float rim=distance>-20.?exp(-abs(distance)/5.)*wave*.2:0.;
      color+=vec3(.65,.8,1.)*rim;
      float alpha=max(mask,rim*.35);
      gl_FragColor=vec4(color*alpha,alpha);
    }`;
  const program = gl.createProgram();
  gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
  gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const attribute=gl.getAttribLocation(program,'aPosition');
  gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const uniforms=Object.fromEntries(['uViewport','uBounds','uWave','uProgress','uAspect'].map(name=>[name,gl.getUniformLocation(program,name)]));
  // Compile the first draw at idle, rather than stalling the first interaction.
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
  gl.uniform2f(uniforms.uViewport,1,1);gl.uniform4f(uniforms.uBounds,0,0,1,1);gl.uniform1f(uniforms.uWave,0);
  gl.uniform1f(uniforms.uAspect,1);gl.uniform1f(uniforms.uProgress,0);
  gl.viewport(0,0,1,1);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault(); unavailable=true; activeFlight?.cancel(); renderer=null;
  });
  return {canvas,gl,uniforms,texture};
}

export function warmPortal() {
  if(renderer || unavailable || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  try{renderer=createRenderer();if(!renderer)unavailable=true;}catch{unavailable=true;}
}

export function startPortalFlight(source,destination,opening) {
  if (unavailable || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const image=source.tagName==='IMG'?source:source.querySelector('img');
  if (!image?.complete || !image.naturalWidth) return null;
  try { renderer ||= createRenderer(); } catch { unavailable=true; }
  if (!renderer) return null;
  activeFlight?.cancel();
  const {canvas,gl,uniforms,texture}=renderer;
  const from=source.getBoundingClientRect(),to=destination.getBoundingClientRect();
  if (!from.width || !to.width) return null;
  try {
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  } catch { return null; }
  const width=innerWidth,height=innerHeight;
  let ratio=Math.min(devicePixelRatio||1,1,1280/width,800/height);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.uniform2f(uniforms.uViewport,width,height);

  gl.uniform1f(uniforms.uAspect,image.naturalWidth/image.naturalHeight);
  canvas.className='transition-image portal-canvas';canvas.setAttribute('aria-hidden','true');
  canvas.dataset.portal=opening?'opening':'closing';
  const aura=document.createElement('div');aura.className='flight-aura';aura.setAttribute('aria-hidden','true');
  aura.style.opacity='.35';aura.style.transform=`translate(${width*.6}px,${height*.5}px) scale(1.4)`;
  document.body.append(aura,canvas);
  if(opening) destination.style.visibility='hidden';
  let frame=0,done=false,resolve;
  const finished=new Promise(value=>{resolve=value;});
  const start=performance.now(),duration=opening?1050:650;
  let lastTime=start,elapsedTime=0;
  const ease=t=>t*t*(3-2*t);
  const mix=(a,b,t)=>a+(b-a)*t;
  const box=rect=>[rect.left,rect.top,rect.width,rect.height];
  const fromBox=box(from),toBox=box(to),fullBox=[0,0,width,height];
  const finish=()=>{
    if(done)return;
    done=true;cancelAnimationFrame(frame);
    canvas.remove();aura.remove();destination.style.visibility='';
    window.removeEventListener('resize',finish);
    document.removeEventListener('visibilitychange',visibility);
    document.removeEventListener('wheel',finish,true);
    document.removeEventListener('pointerdown',finish,true);
    document.removeEventListener('scroll',finish,true);
    if(activeFlight===handle)activeFlight=null;
    resolve();
  };
  const visibility=()=>{if(document.hidden)finish();};
  const draw=time=>{
    if(done)return;
    const delta=Math.max(0,time-lastTime);lastTime=time;
    elapsedTime+=Math.min(50,delta);
    const progress=Math.min(1,(opening?elapsedTime:time-start)/duration);
    if(delta>45 && ratio>.38){
      ratio=Math.max(.38,ratio*.72);
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
      gl.viewport(0,0,canvas.width,canvas.height);
    }
    const a=opening&&progress>=.43?fullBox:fromBox;
    const b=opening&&progress<.43?fullBox:toBox;
    const phase=opening?(progress<.43?progress/.43:(progress-.43)/.57):progress;
    const bounds=a.map((value,index)=>mix(value,b[index],ease(phase)));
    canvas.dataset.progress=progress.toFixed(3);
    canvas.dataset.resolution=ratio.toFixed(2);
    gl.disable(gl.SCISSOR_TEST);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    const left=Math.max(0,Math.floor((bounds[0]-12)*ratio));
    const bottom=Math.max(0,Math.floor((height-bounds[1]-bounds[3]-12)*ratio));
    gl.scissor(left,bottom,Math.max(0,Math.ceil((bounds[2]+24)*ratio)),Math.max(0,Math.ceil((bounds[3]+24)*ratio)));
    gl.uniform4f(uniforms.uBounds,...bounds);
    gl.uniform1f(uniforms.uWave,Math.sin(progress*Math.PI));
    gl.uniform1f(uniforms.uProgress,progress);
    gl.drawArrays(gl.TRIANGLES,0,3);
    if(progress<1) frame=requestAnimationFrame(draw);else finish();
  };
  const handle={finished,cancel:finish};activeFlight=handle;
  window.addEventListener('resize',finish);
  document.addEventListener('visibilitychange',visibility);
  document.addEventListener('wheel',finish,{passive:true,capture:true});
  document.addEventListener('pointerdown',finish,{passive:true,capture:true});
  document.addEventListener('scroll',finish,{passive:true,capture:true});
  draw(start);
  return handle;
}
