// servicos.js — versão turbo 2025
(() => {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReduced = motionQuery.matches;

  const pointerQuery = window.matchMedia('(pointer: fine)');

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

  /* ========== TILT SUTIL NOS CARDS ========== */
  const tiltCards = document.querySelectorAll('.carousel-servicos__item');
  const tiltInitialized = new Map();
  const MAX_TILT = 6;

  const setupTilt = () => {
    if (!tiltCards.length || prefersReduced || !pointerQuery.matches) return;

    tiltCards.forEach(card => {
      if (tiltInitialized.has(card)) return;
      tiltInitialized.add(card);
      let frame = null;

      const resetTilt = () => {
        card.style.transform = '';
        card.style.transition = '';
      };

      const applyTilt = e => {
        if (prefersReduced || !pointerQuery.matches) return;
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          const rotateX = (-y * MAX_TILT).toFixed(2);
          const rotateY = (x * MAX_TILT).toFixed(2);
          card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });
      };

      const handlePointerLeave = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(resetTilt);
      };

      const handlePointerDown = () => {
        card.style.transition = prefersReduced ? 'none' : 'transform 120ms ease';
      };

      const handlePointerUp = resetTilt;

      card.addEventListener('pointermove', applyTilt);
      card.addEventListener('pointerleave', handlePointerLeave);
      card.addEventListener('pointerdown', handlePointerDown);
      card.addEventListener('pointerup', handlePointerUp);

      tiltInitialized.set(card, {
        cancelFrame: () => { if (frame) cancelAnimationFrame(frame); frame = null; },
        reset: resetTilt,
        listeners: [
          ['pointermove', applyTilt],
          ['pointerleave', handlePointerLeave],
          ['pointerdown', handlePointerDown],
          ['pointerup', handlePointerUp]
        ]
      });
    });
  };

  setupTilt();

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

  /* ========== CARROSSEL (scroll + indicadores + setas) ========== */
  const root = document.querySelector('.carousel-servicos');
  if (!root) return;

  const track = root.querySelector('.carousel-servicos__track');
  const prev = root.querySelector('.carousel-servicos__nav--prev');
  const next = root.querySelector('.carousel-servicos__nav--next');
  const indicatorsWrap = root.querySelector('.carousel-indicators');

  if (!track) return;

  const items = [...track.querySelectorAll('.carousel-servicos__item')];
  if (!items.length) return;

  let currentIndex = 0;
  let scrollFrame = null;

  const clampIndex = index => Math.max(0, Math.min(items.length - 1, index));

  const getStep = () => {
    const gap = parseFloat(getComputedStyle(track).gap || '0');
    return (items[0]?.offsetWidth || 0) + gap;
  };

  const scrollToIndex = index => {
    const safeIndex = clampIndex(index);
    const target = items[safeIndex];
    if (!target) return;
    const left = target.offsetLeft;
    track.scrollTo({ left, behavior: prefersReduced ? 'auto' : 'smooth' });
  };

  const focusableSelector = 'a, button, input, textarea, select, [tabindex]';

  const setActiveItem = index => {
    currentIndex = clampIndex(index);
    items.forEach((item, i) => {
      const active = i === currentIndex;
      item.toggleAttribute('data-active', active);
      item.setAttribute('aria-hidden', String(!active));
      item.setAttribute('tabindex', active ? '0' : '-1');

      item.querySelectorAll(focusableSelector).forEach(el => {
        if (active) {
          el.removeAttribute('tabindex');
        } else {
          el.setAttribute('tabindex', '-1');
        }
      });
    });
  };

  const dots = items.map((item, i) => {
    item.setAttribute('role', 'group');
    item.setAttribute('aria-label', `Serviço ${i + 1} de ${items.length}`);
    const dot = document.createElement('button');
    dot.className = 'carousel-indicators__dot';
    dot.type = 'button';
    const title = item.querySelector('h3')?.textContent?.trim();
    dot.setAttribute('aria-label', title ? `Ir para ${title}` : `Ir para card ${i + 1}`);
    dot.addEventListener('click', () => scrollToIndex(i));
    indicatorsWrap?.appendChild(dot);
    return dot;
  });

  const updateIndicators = index => {
    dots.forEach((dot, i) => dot.toggleAttribute('aria-current', i === index));
  };

  const syncNavButtons = index => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    const left = track.scrollLeft;
    const atStart = index === 0 || left < 4;
    const atEnd = index === items.length - 1 || left > maxScroll - 4;

    if (prev) {
      prev.disabled = atStart;
      prev.setAttribute('aria-disabled', String(atStart));
    }
    if (next) {
      next.disabled = atEnd;
      next.setAttribute('aria-disabled', String(atEnd));
    }
  };

  const applyScrollState = () => {
    scrollFrame = null;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let minDist = Number.POSITIVE_INFINITY;

    items.forEach((item, i) => {
      const center = item.offsetLeft + item.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    });

    setActiveItem(nearest);
    updateIndicators(nearest);
    syncNavButtons(nearest);
  };

  const requestScrollState = () => {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(applyScrollState);
  };

  const scrollStep = direction => {
    const step = getStep();
    if (step <= 0) return;
    track.scrollBy({ left: direction * step, behavior: prefersReduced ? 'auto' : 'smooth' });
  };

 const cleanupFns = [];

  const addListener = (target, event, handler, options) => {
    target?.addEventListener(event, handler, options);
    cleanupFns.push(() => target?.removeEventListener(event, handler, options));
  };

  prev && addListener(prev, 'click', () => scrollStep(-1));
  next && addListener(next, 'click', () => scrollStep(1));

  /* Arraste */
  let isPointerDown = false;
  let startX = 0;
  let startScrollLeft = 0;
  let activePointerId = null;

  const stopDragging = () => {
    if (!isPointerDown) return;
    isPointerDown = false;
    if (activePointerId !== null) {
      try { track.releasePointerCapture(activePointerId); } catch (e) { /* noop */ }
    }
    activePointerId = null;
    track.classList.remove('is-dragging');
  };

  addListener(track, 'pointerdown', e => {
    if (e.button !== 0) return;
    isPointerDown = true;
    activePointerId = e.pointerId;
    startX = e.clientX;
    startScrollLeft = track.scrollLeft;
    track.setPointerCapture(activePointerId);
    track.classList.add('is-dragging');
  });

  addListener(track, 'pointermove', e => {
    if (!isPointerDown || e.pointerId !== activePointerId) return;
    const delta = e.clientX - startX;
    track.scrollLeft = startScrollLeft - delta;
  });

  ['pointerup', 'pointercancel'].forEach(eventName => {
   addListener(track, eventName, stopDragging);
  });

   addListener(track, 'pointerleave', e => {
    if (!isPointerDown || e.pointerId !== activePointerId) return;
    stopDragging();
  });

  /* Teclado */
 addListener(track, 'keydown', e => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        scrollStep(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        scrollStep(1);
        break;
      case 'Home':
        e.preventDefault();
        scrollToIndex(0);
        break;
      case 'End':
        e.preventDefault();
        scrollToIndex(items.length - 1);
        break;
      default:
        break;
    }
  });

  addListener(track, 'focusin', event => {
    const focusItem = event.target.closest('.carousel-servicos__item');
    if (!focusItem) return;
    const index = items.indexOf(focusItem);
    if (index >= 0) {
      requestIdle(() => scrollToIndex(index));
    }
  });

  /* Atualização visual */
    addListener(track, 'scroll', requestScrollState, { passive: true });
  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => requestScrollState())
    : null;

  if (resizeObserver) {
    resizeObserver.observe(track);
    items.forEach(item => resizeObserver.observe(item));
    cleanupFns.push(() => resizeObserver.disconnect());
  } else {
    addListener(window, 'resize', requestScrollState);
  }

  requestScrollState();

  motionQuery.addEventListener('change', event => {
    prefersReduced = event.matches;
    if (prefersReduced) {
      if (revealObserver) {
        revealObserver.disconnect();
        revealObserver = null;
      }
      showAnimatedImmediately();
      tiltInitialized.forEach((data, card) => {
        data.cancelFrame();
        data.listeners.forEach(([evt, handler]) => card.removeEventListener(evt, handler));
        data.reset();
        tiltInitialized.delete(card);
      });
    } else {
      animated.forEach(el => {
        el.style.transition = '';
        el.style.animation = '';
        if (!el.classList.contains('is-visible')) el.style.transitionDelay = '';
      });
      if (!revealObserver) {
        setupReveal();
      }
      setupTilt();
    }
  });

  pointerQuery.addEventListener('change', () => {
    if (!pointerQuery.matches || prefersReduced) {
      tiltInitialized.forEach((data, card) => {
        data.cancelFrame();
        data.listeners.forEach(([evt, handler]) => card.removeEventListener(evt, handler));
        data.reset();
        tiltInitialized.delete(card);
      });
      return;
    }
    setupTilt();
  });

  window.addEventListener('pagehide', () => {
    if (revealObserver) revealObserver.disconnect();
    tiltInitialized.forEach((data, card) => {
      data.cancelFrame();
      data.listeners.forEach(([evt, handler]) => card.removeEventListener(evt, handler));
      data.reset();
    });
    tiltInitialized.clear();
    cleanupFns.forEach(fn => fn());
  }, { once: true });
})();
