import './style.css';
import { createGalleryMotion } from './gallery-motion.js';
import { cancelPageMotion, openCase, closeCase, animateTextPanel, mountCaseScroll, playEntrance } from './page-motion.js';

const basePath = import.meta.env.BASE_URL;
const routeUrl = path => basePath + path.replace(/^\/+/, '');
const routeFromPath = path => '/' + (path.startsWith(basePath) ? path.slice(basePath.length) : path.replace(/^\/+/, '')).replace(/\/+$/, '');

const projects = [
  { slug: 'prism', name: 'Prism', services: 'Branding, UI Design', industry: 'Real Estate', description: 'A new perspective on real estate. A distinctive brand identity and digital experience connecting people, architecture and possibility.' },
  { slug: 'ara-niko', name: 'Ara Niko', services: 'Branding, UI Design, Dev.', industry: 'Hospitality', description: 'A digital identity for ARA NIKO, a creative communications studio building brand narratives for restaurants, hotels and hospitality spaces.' },
  { slug: 'cosmos', name: 'Cosmos', services: 'Branding, UI Design, Dev.', industry: 'Fintech SaaS', description: 'A clear identity for a complex world. Brand strategy, visual identity and a digital experience for the next generation of financial technology.' },
  { slug: 'halvern', name: 'Halvern', services: 'UI Design, Digital', industry: 'Wine & Hospitality', description: 'An expressive digital world at the intersection of wine, place and hospitality. A sensory experience that brings the character of the brand to life.' },
];
const logo = `<svg class="wordmark" viewBox="0 0 1888 192" role="img" aria-label="Osply" preserveAspectRatio="none">
<path fill="currentColor" fill-rule="evenodd" d="M0 18 55 0H319L374 18V174L319 192H55L0 174ZM171 9V183H203V9Z"/>
<path fill="currentColor" d="M379 18 434 0H698L753 18V78H550V9H518V91H698L753 110V174L698 192H434L379 174V114H550V183H582V101H434L379 83Z"/>
<path fill="currentColor" fill-rule="evenodd" d="M758 0H1078L1132 18V90L1078 108H929V192H758ZM929 9V99H961V9Z"/>
<path fill="currentColor" d="M1137 0H1308V183H1340V114H1511V192H1137Z"/>
<path fill="currentColor" d="M1516 0H1687V123H1719V0H1888V111L1786 141V192H1619V141L1516 111Z"/>
</svg>`;
const arrow = '<svg class="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M3 3h10v10" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
const app = document.querySelector('#app');
let active = 0;
let currentRoute = '/';
let lastWheel = 0;
let wheelDelta = 0;
let wheelReset;
let suppressCardClickUntil = 0;
let touchY = 0;
let opener = null;
let loaderDone = sessionStorage.getItem('osply-visited') === 'yes';

app.innerHTML = `
<div class="loader ${loaderDone ? 'done' : ''}" aria-hidden="true"><div class="loader-bar"><span>OSPLY — CREATIVE DIGITAL STUDIO</span><span class="progress">0%</span></div></div>
<main class="studio" id="studio">
  <header class="masthead"><a href="${routeUrl('/')}" class="brand" aria-label="Osply home">${logo}</a>
    <nav class="navigation" aria-label="Main navigation">
      <a class="studio-label" href="${routeUrl('/about')}">Creative Digital Studio</a>
      <div><a href="${routeUrl('/')}" class="work-link" aria-current="page">Work</a><span>, </span><a href="${routeUrl('/about')}">About</a></div>
      <a href="${routeUrl('/contact')}">Contact</a>
    </nav>
  </header>
  <section class="gallery" aria-label="Selected projects" aria-roledescription="carousel" tabindex="0">
    <div class="project-track">${projects.map((p, i) => `<button class="project-card" data-project="${i}" aria-label="Open ${p.name} case study"><img src="${basePath}images/${p.slug}.webp" alt="${p.name} — ${p.industry} brand identity" ${i ? 'loading="eager"' : 'fetchpriority="high"'} draggable="false"/><span class="view-project">VIEW PROJECT ${arrow}</span></button>`).join('')}</div>
    <div class="project-info" aria-live="polite"><span class="project-number">1</span><span class="project-services"></span><div class="project-list">${projects.map((p, i) => `<button data-select="${i}">${p.name}</button>`).join('')}</div><span class="project-industry"></span></div>
    <div class="gallery-controls"><button data-step="-1" aria-label="Previous project">↑</button><span>SCROLL TO EXPLORE</span><button data-step="1" aria-label="Next project">↓</button></div>
    <p class="manifesto">CHANNELING CREATIVE ENERGY INTO A STRATEGIC RESOURCE<br>THAT CHANGES THE RULES OF THE GAME AND THE<br>PERCEPTION OF THE BRAND.</p>
  </section>
  <footer class="footer"><a href="mailto:hi@osply.co">hi@osply.co</a><span>All rights reserved. ©2026</span></footer>
</main>
<div class="overlay" id="overlay" hidden></div>
`;

const gallery = document.querySelector('.gallery');
const overlay = document.querySelector('#overlay');
const motion = createGalleryMotion(document.querySelector('.project-track'));
let disposeCaseMotion = () => {};
let appStarted = false;

function updateGallery(direction = 0) {
  document.querySelectorAll('.project-card').forEach((card, i) => {
    let offset = (i - active + projects.length) % projects.length;
    if (offset > 2) offset -= projects.length;
    // Keep the opposite card out of view; the other three form the vertical filmstrip.
    card.dataset.position = offset;
    card.classList.toggle('selected', offset === 0);
    card.setAttribute('aria-label', offset === 0 ? `Open ${projects[i].name} case study` : `Select ${projects[i].name}`);
    card.style.zIndex = offset === 0 ? '3' : '1';
  });
  const p = projects[active];
  document.querySelector('.project-number').textContent = active + 1;
  document.querySelector('.project-services').textContent = p.services;
  document.querySelector('.project-industry').textContent = p.industry;
  document.querySelectorAll('[data-select]').forEach((el, i) => {
    el.classList.toggle('active', i === active);
    el.setAttribute('aria-pressed', String(i === active));
    el.style.order = (i - active + 4) % 4;
  });
  motion.goTo(active, direction);
  if (direction && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.project-number, .project-services, .project-industry').forEach(el => {
      el.getAnimations().forEach(animation => animation.cancel());
      el.animate([{ opacity: 0, transform: `translateY(${direction * 12}px)` }, { opacity: 1, transform: 'translateY(0)' }], { duration: 480, easing: 'cubic-bezier(.22,.78,.18,1)' });
    });
  }
}
function select(index) { const direction = Math.sign(index - active); active = (index + projects.length) % projects.length; updateGallery(direction); }

function navigate(path, replace = false) {
  if (path === currentRoute) return;
  if (replace) history.replaceState({}, '', routeUrl(path)); else history.pushState({}, '', routeUrl(path));
  renderRoute(path);
}

function renderRoute(path) {
  disposeCaseMotion();
  cancelPageMotion();
  const wasHome = currentRoute === '/';
  currentRoute = path;
  if (path === '/') {
    closeCase(overlay.querySelector('.case-hero'), document.querySelector('.project-card.selected'));
    overlay.hidden = true;
    overlay.innerHTML = '';
    document.querySelector('.studio').inert = false;
    document.body.classList.remove('overlay-open');
    document.title = 'OSPLY — Creative Digital Studio';
    opener?.focus({ preventScroll: true });
    return;
  }
  if (wasHome) opener = document.activeElement;
  const slug = path.split('/')[2];
  const p = projects.find(p => p.slug === slug);
  if (path.startsWith('/work/') && !p) { navigate('/', true); return; }
  document.querySelector('.studio').inert = true;
  overlay.hidden = false;
  document.body.classList.add('overlay-open');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', p ? `${p.name} case study` : path === '/about' ? 'About Osply' : 'Contact Osply');
  if (p) {
    active = projects.indexOf(p); updateGallery();
    document.title = `${p.name} — ${p.industry} Case Study | OSPLY`;
    const ara = p.slug === 'ara-niko';
    overlay.innerHTML = `<div class="case-layout">
      <aside class="case-information">
        <dl><dt>CLIENT:</dt><dd>${p.name}</dd><dt>INDUSTRY:</dt><dd>${p.industry}</dd><dt>SERVICES:</dt><dd>${p.services}</dd><dt>YEAR:</dt><dd>2026</dd></dl>
        <button class="close-case" data-close aria-label="Close case study">CLOSE ${arrow}</button>
        <div class="case-description"><span>ABOUT:</span><p>${p.description}</p></div><span class="scroll-down">SCROLL DOWN ↓</span>
      </aside>
      <section class="case-scroll" aria-label="${p.name} project imagery" tabindex="0">
        <img class="case-hero" src="${basePath}images/${p.slug}.webp" alt="${p.name} visual identity" />
        ${ara ? `<img src="${basePath}images/ara-editorial.webp" alt="Ara Niko editorial website: Cultural perspective takes shape" /><img src="${basePath}images/ara-story.webp" alt="Ara Niko brand story and website presentation" /><img src="${basePath}images/ara-cases.webp" alt="Ara Niko case studies with food and hospitality photography" />` : `<div class="project-editorial ${p.slug}"><div class="editorial-top"><span>${p.name.toUpperCase()}</span><span>IDENTITY / DIGITAL — 2026</span></div><h1>${p.slug === 'prism' ? 'A different<br>perspective.' : p.slug === 'cosmos' ? 'A world of<br>possibility.' : 'Rooted in place.<br>Made to feel.'}</h1><img src="${basePath}images/${p.slug}.webp" alt="${p.name} design direction"/><p>${p.description}</p><span class="editorial-caption">STRATEGY. IDENTITY. EXPERIENCE.</span></div>`}
        <button class="next-case" data-next="${(active + 1) % 4}"><span>NEXT PROJECT ${arrow}</span><strong>${projects[(active + 1) % 4].name}</strong></button>
      </section>
    </div>`;
  } else if (path === '/about') {
    document.title = 'About — OSPLY';
    overlay.innerHTML = `<section class="text-panel about-panel"><div class="panel-top"><span>OSPLY® — INDEPENDENT CREATIVE STUDIO</span><button data-close>CLOSE ${arrow}</button></div><h1>Creative energy.<br>Strategic impact.</h1><div class="about-copy"><span>(ABOUT US)</span><p>We are an independent creative digital studio shaping brands and digital experiences. We channel creative energy into a strategic resource that changes the rules of the game and the perception of the brand.</p></div><div class="services"><span>(WHAT WE DO)</span><ul><li>Brand Strategy & Identity <span>01</span></li><li>Art Direction <span>02</span></li><li>Digital Design <span>03</span></li><li>Web Development <span>04</span></li></ul></div><a class="panel-cta" href="${routeUrl('/contact')}">Let's make something matter. ${arrow}</a></section>`;
  } else if (path === '/contact') {
    document.title = 'Contact — OSPLY';
    overlay.innerHTML = `<section class="text-panel contact-panel"><div class="panel-top"><span>LET'S START A CONVERSATION</span><button data-close>CLOSE ${arrow}</button></div><h1>Good things<br>start with hello.</h1><a class="contact-email" href="mailto:hi@osply.co">hi@osply.co ${arrow}</a><div class="contact-bottom"><p>Have a project in mind?<br>Tell us what you're thinking.</p><button id="copy-email">COPY EMAIL ${arrow}</button><span class="copy-status" role="status"></span></div></section>`;
  } else { navigate('/', true); return; }
  if (p) {
    if (wasHome && appStarted) openCase(document.querySelector('.project-card.selected'), overlay);
    disposeCaseMotion = mountCaseScroll(overlay);
  } else animateTextPanel(overlay);
  requestAnimationFrame(() => overlay.querySelector('[data-close]')?.focus({ preventScroll: true }));
}

document.addEventListener('click', async event => {
  const link = event.target.closest('a');
  if (link && link.origin === location.origin && link.pathname.startsWith(basePath) && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    event.preventDefault(); navigate(routeFromPath(link.pathname)); return;
  }
  const close = event.target.closest('[data-close]');
  if (close) { navigate('/'); return; }
  const card = event.target.closest('[data-project]');
  if (card && Date.now() < suppressCardClickUntil) return;
  if (card) { const i = Number(card.dataset.project); if (i === active) navigate(`/work/${projects[i].slug}`); else select(i); }
  const selector = event.target.closest('[data-select]');
  if (selector) select(Number(selector.dataset.select));
  const step = event.target.closest('[data-step]');
  if (step) select(active + Number(step.dataset.step));
  const next = event.target.closest('[data-next]');
  if (next) navigate(`/work/${projects[Number(next.dataset.next)].slug}`);
  if (event.target.closest('#copy-email')) {
    try { await navigator.clipboard.writeText('hi@osply.co'); document.querySelector('.copy-status').textContent = 'Email copied.'; }
    catch { document.querySelector('.copy-status').textContent = 'hi@osply.co — select and copy this address.'; }
  }
});
window.addEventListener('wheel', e => {
  if (currentRoute !== '/' || e.ctrlKey) return;
  e.preventDefault();
  wheelDelta += e.deltaY;
  clearTimeout(wheelReset);
  wheelReset = setTimeout(() => { wheelDelta = 0; }, 180);
  if (Date.now() - lastWheel < 220 || Math.abs(wheelDelta) < 28) return;
  lastWheel = Date.now(); select(active + Math.sign(wheelDelta)); wheelDelta = 0;
}, { passive: false });
gallery.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
gallery.addEventListener('touchend', e => { const dy = touchY - e.changedTouches[0].clientY; if (Math.abs(dy) > 35) { suppressCardClickUntil = Date.now() + 400; select(active + Math.sign(dy)); } }, { passive: true });
document.addEventListener('keydown', e => {
  if (currentRoute !== '/') {
    if (e.key === 'Escape') navigate('/');
    if (e.key === 'Tab') {
      const focusable = [...overlay.querySelectorAll('a,button,[tabindex="0"]')];
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    return;
  }
  if (['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)) {
    e.preventDefault(); select(active + (['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1));
  }
});
window.addEventListener('popstate', () => renderRoute(routeFromPath(location.pathname)));
updateGallery();
if (routeFromPath(location.pathname) !== '/') renderRoute(routeFromPath(location.pathname));
appStarted = true;
if (loaderDone && currentRoute === '/') playEntrance(motion, true);
if (!loaderDone) {
  const start = performance.now();
  const tick = now => {
    const progress = Math.min(100, Math.round((now - start) / 9));
    document.querySelector('.progress').textContent = `${progress}%`;
    document.querySelector('.loader-bar').style.width = `${Math.max(12, progress)}%`;
    if (progress < 100) requestAnimationFrame(tick);
    else { document.querySelector('.loader').classList.add('done'); sessionStorage.setItem('osply-visited', 'yes'); if (currentRoute === '/') playEntrance(motion); }
  };
  requestAnimationFrame(tick);
}
