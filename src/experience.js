// Pointer feedback and editorial project captions stay outside the WebGL canvas.
export function createExperience() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const cursor = document.createElement('div');
  cursor.className = 'project-cursor'; cursor.setAttribute('aria-hidden','true');
  cursor.innerHTML = '<span>VIEW</span><span><svg class="arrow" viewBox="0 0 16 16"><path d="M3 13 13 3M3 3h10v10" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></span>';
  document.body.append(cursor);
  document.body.classList.add('experience-ready');
  let magnetic = null;
  const reset = () => {
    cursor.classList.remove('visible');
    if (magnetic) { magnetic.style.removeProperty('translate'); magnetic = null; }
  };
  document.addEventListener('pointermove', event => {
    if (!fine.matches || reduced.matches) return;
    document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
    document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
    const card = event.target.closest('.project-card');
    cursor.classList.toggle('visible', Boolean(card) && !document.body.classList.contains('overlay-open'));
    cursor.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
    cursor.firstElementChild.textContent = card?.classList.contains('selected') ? 'VIEW' : 'FOCUS';
    const link = event.target.closest('.navigation a, .close-case, .panel-top button');
    if (magnetic !== link) { if (magnetic) magnetic.style.removeProperty('translate'); magnetic = link; }
    if (link) {
      const rect = link.getBoundingClientRect();
      const x = Math.max(-5, Math.min(5, (event.clientX - rect.left - rect.width / 2) * .12));
      const y = Math.max(-3, Math.min(3, (event.clientY - rect.top - rect.height / 2) * .12));
      link.style.translate = `${x}px ${y}px`;
    }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', reset);
  document.addEventListener('focusin', () => cursor.classList.remove('visible'));
  reduced.addEventListener('change', reset);
  return {
    update(project, index) {
      const title = document.querySelector('.project-caption-title');
      const number = document.querySelector('.caption-index');
      const category = document.querySelector('.caption-category');
      if (!title || title.textContent === project.name) return;
      title.textContent = project.name; number.textContent = String(index + 1).padStart(2,'0');
      category.textContent = project.industry;
      document.documentElement.style.setProperty('--project-progress', String((index + 1) / 4));
      if (!reduced.matches) {
        title.getAnimations().forEach(a => a.cancel());
        title.animate([{ opacity:0, transform:'translateY(30px) rotateX(-30deg)', filter:'blur(6px)' }, { opacity:1, transform:'translateY(0) rotateX(0)', filter:'blur(0)' }], { duration:650,easing:'cubic-bezier(.2,.75,.2,1)' });
      }
    },
    hideCursor: reset,
  };
}
