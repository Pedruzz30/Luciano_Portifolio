(() => {
  function run(container) {
    const root = container || document;
    const els = Array.from(root.querySelectorAll('[data-mobile-reveal]:not(.is-revealed)'));
    if (!els.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        typeof IntersectionObserver === 'undefined') {
      els.forEach(el => el.classList.add('is-revealed'));
      return;
    }

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

  window.Reveal = { run };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => run(document), { once: true });
  } else {
    run(document);
  }
})();
