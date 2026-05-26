(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof IntersectionObserver === 'undefined') return;

  function run() {
    const els = Array.from(document.querySelectorAll('[data-mobile-reveal]:not(.is-revealed)'));
    if (!els.length) return;

    const revealed = new WeakSet();

    const safety = setTimeout(() => {
      els.forEach(el => {
        if (!revealed.has(el)) el.classList.add('is-revealed');
      });
    }, 1200);

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        revealed.add(entry.target);
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
      if (els.every(el => el.classList.contains('is-revealed'))) {
        clearTimeout(safety);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    els.forEach(el => observer.observe(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
