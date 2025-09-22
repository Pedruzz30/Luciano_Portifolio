// servicos.js — harmonizado com “Sobre”
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Helper viewport */
function inViewObserver(selectors, onEnter, options = { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }) {
  if (reduceMotion || !('IntersectionObserver' in window)) {
    document.querySelectorAll(selectors).forEach(el => onEnter(el));
    return { disconnect(){} };
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { onEnter(e.target); obs.unobserve(e.target); }
    });
  }, options);
  document.querySelectorAll(selectors).forEach(el => obs.observe(el));
  return obs;
}

/* Reveal com stagger — intro, cards e blocos */
const revealTargets = [
  ...document.querySelectorAll('.intro-hero'),
  ...document.querySelectorAll('#servicos .section-head'),
  ...document.querySelectorAll('.svc-card'),
  ...document.querySelectorAll('.section-description'),
  ...document.querySelectorAll('.steps .step'),
  ...document.querySelectorAll('.steps-grid .step-card'),
  ...document.querySelectorAll('.info-card'),
  ...document.querySelectorAll('.cta-final .cta-box')
];
revealTargets.forEach((el, i) => {
  el.classList.add('reveal');
  el.style.setProperty('--delay', `${Math.min(i * 70, 280)}ms`);
});
inViewObserver('.reveal', el => el.classList.add('in-view'));

/* Aproximação de cartões */
const approachTargets = [
  ...document.querySelectorAll('.svc-card, .step-card, .info-card, .cta-final .cta-box')
];
approachTargets.forEach(el => el.classList.add('card-approach'));
inViewObserver('.card-approach', el => el.classList.add('in-view'));

/* CTA pulse 1x no final */
const ctaFinal = document.querySelector('.cta-final .btn-reveal');
if (ctaFinal) {
  inViewObserver('.cta-final .btn-reveal', el => el.classList.add('cta-pulse'), { threshold: 0.8 });
}

/* Títulos com glow (sem underline) */
document.querySelectorAll('.section h2').forEach(h => h.classList.add('h2-glow'));
inViewObserver('.section h2', el => el.classList.add('in-view'));

/* (Opcional) details suave — se você decidir reativar algum <details> no futuro */
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
document.querySelectorAll('.more').forEach(d => d.addEventListener('toggle', () => animateDetails(d, d.open)));


