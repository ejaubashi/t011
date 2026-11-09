const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const flights = new Set();
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function cancelPageMotion() {
  for (const flight of flights) flight.cancel();
  flights.clear();
}

function flyImage(source, destination, opening) {
  const from = source.getBoundingClientRect(), to = destination.getBoundingClientRect();
  if (!from.width || !to.width || reduceMotion()) return;
  const image = document.createElement('img');
  image.src = source.tagName === 'IMG' ? source.currentSrc || source.src : source.querySelector('img').currentSrc;
  image.className = 'transition-image';
  image.alt = ''; image.setAttribute('aria-hidden', 'true');
  Object.assign(image.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.append(image);
  if (opening) destination.style.visibility = 'hidden';
  const animation = image.animate([
    { transform: 'translate(0,0) scale(1,1)', opacity: 1 },
    { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width},${to.height / from.height})`, opacity: 1 },
  ], { duration: opening ? 850 : 650, easing: 'cubic-bezier(.22,.78,.18,1)', fill: 'forwards' });
  flights.add(animation);
  const finish = () => { image.remove(); destination.style.visibility = ''; flights.delete(animation); };
  animation.finished.then(finish, finish);
}

export function openCase(card, overlay) {
  if (reduceMotion()) return;
  const hero = overlay.querySelector('.case-hero');
  const content = overlay.querySelector('.case-scroll');
  if (hero && card) flyImage(card, hero, true);
  content?.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: 950, easing: 'cubic-bezier(.22,.78,.18,1)' });
  overlay.querySelectorAll('.case-information dl, .close-case, .case-description, .scroll-down').forEach((el, i) => {
    el.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 600, delay: 200 + i * 65, fill: 'backwards', easing: 'cubic-bezier(.2,.7,.2,1)' });
  });
}

export function closeCase(hero, card) {
  if (hero && card && hero.getBoundingClientRect().bottom > 0) flyImage(hero, card, false);
}

export function animateTextPanel(overlay) {
  if (reduceMotion()) return;
  overlay.querySelectorAll('.text-panel h1, .about-copy, .services, .contact-email, .contact-bottom').forEach((el, i) => {
    el.animate([{ opacity: 0, transform: 'translateY(45px)', clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0)' }], { duration: 850, delay: 150 + i * 100, fill: 'backwards', easing: 'cubic-bezier(.22,.78,.18,1)' });
  });
}

export function mountCaseScroll(overlay) {
  const root = matchMedia('(max-width: 600px)').matches ? overlay.querySelector('.case-layout') : overlay.querySelector('.case-scroll');
  if (!root || reduceMotion()) return () => {};
  const images = [...overlay.querySelectorAll('.case-scroll > img, .project-editorial')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); } });
  }, { root, threshold: .08 });
  images.forEach((image, i) => {
    if (i > 0) { image.classList.add('scroll-reveal'); observer.observe(image); }
  });
  let last = root.scrollTop, velocity = 0, frame = 0, previousTime = 0;
  const draw = time => {
    const dt = Math.min(40, time - (previousTime || time - 16.67)); previousTime = time;
    velocity *= Math.exp(-dt / 100);
    const skew = clamp(velocity * .018, -1.8, 1.8);
    images.forEach(image => image.style.setProperty('--scroll-skew', `${skew}deg`));
    if (Math.abs(velocity) > .1) frame = requestAnimationFrame(draw);
    else { images.forEach(image => image.style.setProperty('--scroll-skew', '0deg')); frame = 0; previousTime = 0; }
  };
  const onScroll = () => {
    velocity = clamp(root.scrollTop - last, -100, 100); last = root.scrollTop;
    if (!frame) frame = requestAnimationFrame(draw);
  };
  root.addEventListener('scroll', onScroll, { passive: true });
  return () => { root.removeEventListener('scroll', onScroll); observer.disconnect(); cancelAnimationFrame(frame); };
}

export function playEntrance(motion, short = false) {
  if (reduceMotion()) return;
  const header = document.querySelector('.masthead');
  header.animate([
    { transform: `translateY(${short ? 60 : innerHeight - header.clientHeight - 24}px)`, opacity: short ? 0 : 1 },
    { transform: 'translateY(0)', opacity: 1 },
  ], { duration: short ? 700 : 1250, easing: 'cubic-bezier(.2,.8,.2,1)' });
  document.querySelector('.navigation').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, delay: short ? 0 : 400, fill: 'backwards' });
  document.querySelector('.project-track').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: short ? 0 : 180, fill: 'backwards' });
  if (!short) motion.intro();
}
