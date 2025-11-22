// servicos.js — animações leves sem carrossel
(() => {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReduced = motionQuery.matches;

  const requestIdle = cb => window.requestIdleCallback ? window.requestIdleCallback(cb, { timeout: 150 }) : setTimeout(cb, 0);

  /* ========== REVEAL SUAVE ========== */
  const animated = document.querySelectorAll('[data-animate]');
  let revealObserver = null;

  const showAnimatedImmediately = () => {
    animated.forEach(el => {
      el.style.transitionDelay = '';
      el.style.transition = 'none';
      el.style.animation = 'none';
      el.classList.add('is-visible');
    });
  };

  const setupReveal = () => {
    if (!animated.length) return;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      showAnimatedImmediately();
      return;
    }

    revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = Number(entry.target.dataset.delay) || 0;
        entry.target.style.transitionDelay = `${delay}ms`;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8%' });

    animated.forEach(el => revealObserver?.observe(el));
  };

  setupReveal();

  /* ========== FAQ — mantém só um aberto ========== */
  const faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length > 1) {
    faqItems.forEach(item => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        faqItems.forEach(other => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  motionQuery.addEventListener('change', event => {
    prefersReduced = event.matches;
    if (prefersReduced) {
      if (revealObserver) {
        revealObserver.disconnect();
        revealObserver = null;
      }
      showAnimatedImmediately();
    } else {
      animated.forEach(el => {
        el.style.transition = '';
        el.style.animation = '';
        if (!el.classList.contains('is-visible')) el.style.transitionDelay = '';
      });
      if (!revealObserver) {
        requestIdle(setupReveal);
      }
    }
  });

  window.addEventListener('pagehide', () => {
    if (revealObserver) revealObserver.disconnect();
  }, { once: true });
})();