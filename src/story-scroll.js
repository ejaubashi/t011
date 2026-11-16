const clamp=value=>Math.max(0,Math.min(1,value));

export function mountStoryScroll(overlay) {
  const title=overlay.querySelector('.case-story-title');
  if(!title)return()=>{};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const native=CSS.supports('animation-timeline: view()') && CSS.supports('animation-range: cover 30% cover 45%');
  let root,frame=0;
  const textNodes=[];
  const walker=document.createTreeWalker(title,NodeFilter.SHOW_TEXT);
  while(walker.nextNode())textNodes.push(walker.currentNode);
  let index=0;
  textNodes.forEach(node=>{
    const fragment=document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(part=>{
      if(!part.trim()){fragment.append(document.createTextNode(part));return;}
      const word=document.createElement('span');word.className='ink-word';
      word.style.setProperty('--word-index',index++);
      const base=document.createElement('span');base.className='ink-base';base.setAttribute('aria-hidden','true');base.textContent=part;
      const fill=document.createElement('span');fill.className='ink-fill';fill.textContent=part;
      word.append(base,fill);fragment.append(word);
    });
    node.replaceWith(fragment);
  });
  const words=[...title.querySelectorAll('.ink-word')];
  const progress=overlay.querySelector('.case-reading-progress');
  const layout=overlay.querySelector('.case-layout');
  function update(){
    frame=0;
    if(!root.isConnected)return;
    const maximum=root.scrollHeight-root.clientHeight;
    const fraction=maximum>0?clamp(root.scrollTop/maximum):1;
    const percent=Math.round(fraction*100);
    layout.style.setProperty('--reading-progress',fraction.toFixed(5));
    progress?.setAttribute('aria-valuenow',String(percent));
    const label=progress?.querySelector('.reading-percent');
    if(label)label.textContent=`${percent}%`;
    const driver=reduced.matches?'static':native?'native':'script';
    layout.dataset.storyDriver=driver;
    layout.classList.toggle('native-story',driver==='native');
    if(driver!=='native'){
      const bounds=title.getBoundingClientRect(),viewport=root.getBoundingClientRect();
      const cover=clamp((viewport.bottom-bounds.top)/(root.clientHeight+bounds.height));
      words.forEach((word,i)=>word.style.setProperty('--ink-reveal',reduced.matches?1:clamp((cover-(.3+i*.05))/.15)));
    }
  }
  function requestUpdate(){if(!frame)frame=requestAnimationFrame(update);}
  function bind(){
    root?.removeEventListener('scroll',requestUpdate);
    root=matchMedia('(max-width: 600px)').matches?layout:overlay.querySelector('.case-scroll');
    root.addEventListener('scroll',requestUpdate,{passive:true});
    requestUpdate();
  }
  const images=[...overlay.querySelectorAll('img')];
  images.forEach(image=>image.addEventListener('load',requestUpdate));
  window.addEventListener('resize',bind);
  reduced.addEventListener('change',requestUpdate);
  bind();
  return()=>{
    root.removeEventListener('scroll',requestUpdate);
    window.removeEventListener('resize',bind);
    reduced.removeEventListener('change',requestUpdate);
    images.forEach(image=>image.removeEventListener('load',requestUpdate));
    cancelAnimationFrame(frame);
  };
}
