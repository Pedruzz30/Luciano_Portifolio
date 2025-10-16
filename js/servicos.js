// servicos.js — Interações da página Serviços (2025)
(() => {
  const prefersReducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let prefersReduced = prefersReducedQuery?.matches ?? false;

  /* ------------------------------
   * Intersection observer — revela elementos gradualmente
   * ------------------------------ */
  const animatedNodes = Array.from(document.querySelectorAll('[data-animate]'));
  const revealAnimatedNodes = () => {
    if (!animatedNodes.length) return;

    if (!prefersReduced && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const { target } = entry;
            const delay = Number(target.dataset.delay ?? 0);
            target.style.transitionDelay = `${delay}ms`;
            target.classList.add('is-visible');
            observer.unobserve(target);
          });
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.2 }
      );

      animatedNodes.forEach((node) => observer.observe(node));
    } else {
      animatedNodes.forEach((node) => node.classList.add('is-visible'));
    }
  };

  /* ------------------------------
   * Tilt sutil nos cards ao mover o cursor
   * ------------------------------ */
  const pointerFine = window.matchMedia?.('(pointer: fine)')?.matches ?? false;
  const serviceCards = Array.from(document.querySelectorAll('.service-card'));
  const cardTiltHandlers = new WeakMap();

  const enableCardTilt = () => {
    if (!serviceCards.length || !pointerFine) return;

    serviceCards.forEach((card) => {
      if (cardTiltHandlers.has(card)) return;

      const handleMove = (event) => {
        const bounds = card.getBoundingClientRect();
        const relativeX = (event.clientX - bounds.left) / bounds.width;
        const relativeY = (event.clientY - bounds.top) / bounds.height;
        const tiltX = (0.5 - relativeY) * 6; // graus máximos
        const tiltY = (relativeX - 0.5) * 6;

        card.style.setProperty('--card-tilt-x', `${tiltX.toFixed(2)}deg`);
        card.style.setProperty('--card-tilt-y', `${tiltY.toFixed(2)}deg`);
      };

      const resetTilt = () => {
        card.style.setProperty('--card-tilt-x', '0deg');
        card.style.setProperty('--card-tilt-y', '0deg');
      };

      card.addEventListener('pointermove', handleMove);
      card.addEventListener('pointerleave', resetTilt);
      card.addEventListener('blur', resetTilt, true);

      cardTiltHandlers.set(card, { handleMove, resetTilt });
    });
  };

  const disableCardTilt = () => {
    serviceCards.forEach((card) => {
      const handlers = cardTiltHandlers.get(card);
      if (!handlers) return;

      card.removeEventListener('pointermove', handlers.handleMove);
      card.removeEventListener('pointerleave', handlers.resetTilt);
      card.removeEventListener('blur', handlers.resetTilt, true);
      card.style.setProperty('--card-tilt-x', '0deg');
      card.style.setProperty('--card-tilt-y', '0deg');
      cardTiltHandlers.delete(card);
    });
  };

  /* ------------------------------
   * FAQ — mantém somente um aberto por vez
   * ------------------------------ */
  const faqItems = Array.from(document.querySelectorAll('.faq-item'));
  const initFaqBehavior = () => {
    if (!faqItems.length) return;
    faqItems.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        faqItems.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  };

  /* ------------------------------
   * Estado inicial + observadores de preferência
   * ------------------------------ */
  const init = () => {
    revealAnimatedNodes();
    initFaqBehavior();

    if (!prefersReduced) {
      enableParallax();
      enableCardTilt();
    } else {
      disableParallax();
      disableCardTilt();
    }
  };

  init();

  const handleMotionPreferenceChange = (event) => {
    prefersReduced = event.matches;
    if (prefersReduced) {
      disableParallax();
      disableCardTilt();
      animatedNodes.forEach((node) => node.classList.add('is-visible'));
    } else {
      enableParallax();
      enableCardTilt();
      revealAnimatedNodes();
    }
  };

  if (prefersReducedQuery?.addEventListener) {
    prefersReducedQuery.addEventListener('change', handleMotionPreferenceChange);
  } else if (prefersReducedQuery?.addListener) {
    prefersReducedQuery.addListener(handleMotionPreferenceChange);
  }
})();


// ===== Carousel Serviços: Pausar/Retomar + fallback de movimento
(() => {
  const root = document.querySelector('.carousel-servicos');
  if (!root) return;

  const track = root.querySelector('.carousel-servicos__track');
  const toggle = root.querySelector('.carousel-servicos__toggle');
  const navPrev = root.querySelector('.carousel-servicos__nav--prev');
  const navNext = root.querySelector('.carousel-servicos__nav--next');
  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  if (!track) return;

  const updateToggleCopy = (paused) => {
    if (!toggle || toggle.disabled) return;
    toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
    toggle.textContent = paused ? 'Retomar' : 'Pausar';
    toggle.setAttribute('aria-label', paused ? 'Retomar animação' : 'Pausar animação');
  };

  const setPaused = (paused) => {
    track.setAttribute('data-paused', paused ? 'true' : 'false');
    updateToggleCopy(paused);
  };

  const applyStaticLayout = () => {
    root.classList.add('is-static');
    if (toggle) {
      toggle.disabled = true;
      toggle.setAttribute('aria-disabled', 'true');
      toggle.setAttribute('aria-pressed', 'false');
      toggle.textContent = 'Movimento reduzido';
      toggle.setAttribute('aria-label', 'Animação desativada pela preferência de movimento');
    }
    track.setAttribute('data-paused', 'true');
  };

  const applyAnimatedLayout = () => {
    root.classList.remove('is-static');
    if (toggle) {
      toggle.disabled = false;
      toggle.removeAttribute('aria-disabled');
    }
    setPaused(false);
  };

  const updateLayoutFromPreference = (shouldReduce) => {
    if (shouldReduce) {
      applyStaticLayout();
    } else {
      applyAnimatedLayout();
    }
  };

  toggle?.addEventListener('click', () => {
    if (toggle.disabled) return;
    const paused = track.getAttribute('data-paused') === 'true';
    setPaused(!paused);
  });

  const scrollByStep = (direction) => {
    const firstItem = track.querySelector('.carousel-servicos__item');
    if (!firstItem) return;

    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || '0');
    const step = firstItem.getBoundingClientRect().width + gap;

    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  navPrev?.addEventListener('click', () => scrollByStep(-1));
  navNext?.addEventListener('click', () => scrollByStep(1));

  const prefersReduced = motionQuery?.matches ?? false;
  updateLayoutFromPreference(prefersReduced);

  const handlePreferenceChange = (event) => {
    updateLayoutFromPreference(event.matches);
  };

  if (motionQuery?.addEventListener) {
    motionQuery.addEventListener('change', handlePreferenceChange);
  } else if (motionQuery?.addListener) {
    motionQuery.addListener(handlePreferenceChange);
  }
})();
