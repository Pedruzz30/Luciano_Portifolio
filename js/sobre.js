const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ========= 0) Helpers ========= */
function inViewObserver(selectors, onEnter, options = { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }) {
  if (reduceMotion || !('IntersectionObserver' in window)) {
    document.querySelectorAll(selectors).forEach(el => onEnter(el));
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
  document.querySelectorAll(selectors).forEach(el => obs.observe(el));
  return obs;
}

/* ========= 1) Reveal com stagger ========= */
const revealTargets = [
  ...document.querySelectorAll('.prose .lead, .prose > p, .callout, .cta-box')
];
revealTargets.forEach((el, i) => {
  el.classList.add('reveal');
  el.style.setProperty('--delay', `${Math.min(i * 80, 320)}ms`);
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
  if (!content) return;

  const start = detailsEl.offsetHeight;
  detailsEl.open = true;
  const end = detailsEl.offsetHeight;

  const from = open ? start : end;
  const to = open ? end : start;

  detailsEl.style.height = `${from}px`;
  // reflow
  void detailsEl.offsetHeight;
  detailsEl.style.transition = 'height .28s cubic-bezier(.22,.61,.36,1)';
  detailsEl.style.height = `${to}px`;

  const clean = () => {
    detailsEl.style.height = '';
    detailsEl.style.transition = '';
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
  const onScroll = () => {
    const vh = innerHeight;
    const rect = heroProse.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const r = (center - vh * 0.5) / vh; // -1..1 aprox
    const shift = Math.max(-maxShift, Math.min(maxShift, r * maxShift));
    heroProse.style.transform = `translateY(${shift * rect.height}px)`;
  };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
}