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


 // ===== Carousel Serviços: scroll por arraste, teclas e indicadores =====
(() => {
  const root = document.querySelector('.carousel-servicos');
  if (!root) return;

  const track = root.querySelector('.carousel-servicos__track');
  const navPrev = root.querySelector('.carousel-servicos__nav--prev');
  const navNext = root.querySelector('.carousel-servicos__nav--next');
  const indicatorsWrapper = root.querySelector('.carousel-indicators');
  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  if (!track) return;

  const items = Array.from(track.querySelectorAll('.carousel-servicos__item'));
  if (!items.length) return;

  const getScrollBehavior = () => (motionQuery?.matches ? 'auto' : 'smooth');

  /* ----- Indicadores ----- */
  const createIndicators = () => {
    if (!indicatorsWrapper) return [];
    indicatorsWrapper.innerHTML = '';

    return items.map((item, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-indicators__dot';
      const title = item.querySelector('h3')?.textContent?.trim();
      dot.setAttribute('aria-label', title ? `Ir para ${title}` : `Ir para card ${index + 1}`);
      if (index === 0) dot.setAttribute('aria-current', 'true');
      dot.dataset.index = String(index);
      dot.addEventListener('click', () => {
        items[index].scrollIntoView({ behavior: getScrollBehavior(), inline: 'start', block: 'nearest' });
      });
      indicatorsWrapper.appendChild(dot);
      return dot;
    });
  };

  const indicatorDots = createIndicators();

  const updateActiveIndicator = () => {
    if (!indicatorDots.length) return;
    const scrollCenter = track.scrollLeft + track.clientWidth / 2;
    let activeIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    items.forEach((item, index) => {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const distance = Math.abs(scrollCenter - itemCenter);
      if (distance < minDistance) {
        minDistance = distance;
        activeIndex = index;
      }
    });

    indicatorDots.forEach((dot, index) => {
      if (index === activeIndex) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  };

  /* ----- Setas ----- */
  const getStepSize = () => {
    const firstItem = items[0];
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0');
    return firstItem.getBoundingClientRect().width + gap;
  };

  const scrollByStep = (direction) => {
    track.scrollBy({ left: direction * getStepSize(), behavior: getScrollBehavior() });
  };

  navPrev?.addEventListener('click', () => scrollByStep(-1));
  navNext?.addEventListener('click', () => scrollByStep(1));

  const updateNavState = () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    const tolerance = 2;
    if (navPrev) navPrev.disabled = track.scrollLeft <= tolerance;
    if (navNext) navNext.disabled = track.scrollLeft >= maxScroll - tolerance;
  };

  /* ----- Arraste com pointer events ----- */
  let isPointerDown = false;
  let pointerId = null;
  let dragStartX = 0;
  let startScrollLeft = 0;

  const endDrag = () => {
    if (!isPointerDown) return;
    isPointerDown = false;
    if (pointerId !== null) {
      try {
        track.releasePointerCapture(pointerId);
      } catch (error) {
        /* ignore release errors */
      }
    }
    pointerId = null;
    track.classList.remove('is-dragging');
  };

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    isPointerDown = true;
    pointerId = event.pointerId;
    dragStartX = event.clientX;
    startScrollLeft = track.scrollLeft;
    track.setPointerCapture(pointerId);
    track.classList.add('is-dragging');
  });

  track.addEventListener('pointermove', (event) => {
    if (!isPointerDown) return;
    const deltaX = event.clientX - dragStartX;
    track.scrollLeft = startScrollLeft - deltaX;
    event.preventDefault();
  });

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('pointerleave', (event) => {
    if (isPointerDown && event.pointerType === 'mouse') {
      endDrag();
    }
  });

  /* ----- Teclado ----- */
  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByStep(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollByStep(1);
    }
  });

  /* ----- Atualizações em scroll/resize ----- */
  let rafId = 0;
  const handleScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      updateActiveIndicator();
      updateNavState();
    });
  };

  track.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', () => {
    updateActiveIndicator();
    updateNavState();
  });

  const handleMotionChange = () => {
    updateActiveIndicator();
    updateNavState();
  };

  if (motionQuery?.addEventListener) {
    motionQuery.addEventListener('change', handleMotionChange);
  } else if (motionQuery?.addListener) {
    motionQuery.addListener(handleMotionChange);
  }

  updateActiveIndicator();
  updateNavState();
})();