const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ========= 0) Helpers ========= */
function inViewObserver(selectors, onEnter, options = { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }) {
  const nodes = document.querySelectorAll(selectors);
  if (!nodes.length) return { disconnect(){} };

  if (reduceMotion || !('IntersectionObserver' in window)) {
    nodes.forEach(el => onEnter(el));
    return { disconnect(){} };
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        onEnter(e.target);
        obs.unobserve(e.target);
      }
    });
  }, options);
  nodes.forEach(el => obs.observe(el));
  return obs;
}

/* ========= 1) Reveal com stagger ========= */
const revealTargets = [
  ...document.querySelectorAll('.prose .lead, .prose > p, .callout, .cta-box')
];
const maxStaggerSteps = 4;
revealTargets.forEach((el, i) => {
  el.classList.add('reveal');
  const step = Math.min(i, maxStaggerSteps);
  el.dataset.staggerStep = String(step);
});

inViewObserver('.reveal', el => el.classList.add('in-view'));

/* ========= 2) Títulos com brilho breve (sem underline) ========= */
document.querySelectorAll('.section h2').forEach(h => h.classList.add('h2-glow'));
inViewObserver('.section h2', el => el.classList.add('in-view'));

/* ========= 3) Aproximação de cartões ========= */
document.querySelectorAll('.callout, .cta-box').forEach(el => el.classList.add('card-approach'));
inViewObserver('.card-approach', el => el.classList.add('in-view'));

/* ========= 4) CTA: pulse 1x quando entrar ========= */
const cta = document.querySelector('.btn-reveal');
if (cta) {
  inViewObserver('.btn-reveal', (el) => el.classList.add('cta-pulse'), { threshold: 0.8 });
}

/* ========= 5) Accordion elástico (polido) ========= */
function animateDetails(detailsEl, open) {
  if (reduceMotion) return;
  const content = [...detailsEl.children].find(n => n.tagName?.toLowerCase() !== 'summary');
  const summary = detailsEl.querySelector('summary');
  if (!content || !summary) return;

  const summaryHeight = summary.offsetHeight;
  const wasOpen = detailsEl.open;
  if (!wasOpen) detailsEl.open = true;
  const expandedHeight = summaryHeight + content.scrollHeight;
  if (!wasOpen) detailsEl.open = false;
  const from = open ? summaryHeight : expandedHeight;
  const to = open ? expandedHeight : summaryHeight;

  detailsEl.classList.add('is-animating');
  detailsEl.open = true;
  detailsEl.style.height = `${from}px`;

  requestAnimationFrame(() => {
    detailsEl.style.height = `${to}px`;
  });

  const clean = () => {
    detailsEl.classList.remove('is-animating');
    detailsEl.style.height = '';

    if (!open) detailsEl.open = false;
    detailsEl.removeEventListener('transitionend', clean);
  };
  detailsEl.addEventListener('transitionend', clean);
}
document.querySelectorAll('details.prep, details.policy').forEach(d => {
  d.addEventListener('toggle', () => animateDetails(d, d.open));
});

/* ========= 6) Micro-parallax no hero ========= */
/* Aplica em .hero-about .prose (leve, 0–1.5%) */
const heroProse = document.querySelector('.hero-about .prose');
if (heroProse && !reduceMotion) {
  heroProse.classList.add('hero-parallax');
  const maxShift = 0.015; // 1.5%
  let raf = null;

  const updateParallax = () => {
    raf = null;
    const vh = innerHeight;
    const rect = heroProse.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const r = (center - vh * 0.5) / vh; // -1..1 aprox
    const shift = Math.max(-maxShift, Math.min(maxShift, r * maxShift));
    heroProse.style.transform = `translateY(${shift * rect.height}px)`;
  };

  const scheduleParallax = () => {
    if (raf) return;
    raf = requestAnimationFrame(updateParallax);
  };

  updateParallax();

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const listenerOptions = controller ? { passive: true, signal: controller.signal } : { passive: true };

  addEventListener('scroll', scheduleParallax, listenerOptions);
  addEventListener('resize', scheduleParallax, controller ? { signal: controller.signal } : undefined);

  if (controller) {
    addEventListener('pagehide', () => controller.abort(), { once: true });
  }
}