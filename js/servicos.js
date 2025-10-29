// servicos.js — versão final refinada (2025)
(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReduced = prefersReducedMotion.matches;

  /* ========== REVEAL SUAVE ========== */
  const animated = document.querySelectorAll('[data-animate]');
  if (animated.length && !prefersReduced) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = +entry.target.dataset.delay || 0;
        entry.target.style.transitionDelay = `${delay}ms`;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    animated.forEach(el => observer.observe(el));
  } else {
    animated.forEach(el => el.classList.add('is-visible'));
  }

  /* ========== TILT SUTIL NOS CARDS ========== */
  const pointerFine = window.matchMedia('(pointer: fine)').matches;
  const tiltCards = document.querySelectorAll('.carousel-servicos__item');
  if (pointerFine && !prefersReduced) {
    tiltCards.forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ========== FAQ — mantém só um aberto ========== */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach(other => {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ========== CARROSSEL (scroll + indicadores + setas) ========== */
  const root = document.querySelector('.carousel-servicos');
  if (!root) return;

  const track = root.querySelector('.carousel-servicos__track');
  const prev = root.querySelector('.carousel-servicos__nav--prev');
  const next = root.querySelector('.carousel-servicos__nav--next');
  const indicatorsWrap = root.querySelector('.carousel-indicators');
  const items = [...track.querySelectorAll('.carousel-servicos__item')];
  if (!track || !items.length) return;

  const getStep = () => {
    const first = items[0];
    const gap = parseFloat(getComputedStyle(track).gap || 0);
    return first.offsetWidth + gap;
  };

  const scrollToIndex = i => {
    const left = items[i].offsetLeft;
    track.scrollTo({ left, behavior: prefersReduced ? 'auto' : 'smooth' });
  };

  /* Indicadores */
  const dots = items.map((item, i) => {
    const btn = document.createElement('button');
    btn.className = 'carousel-indicators__dot';
    btn.type = 'button';
    btn.setAttribute('aria-label', `Ir para ${item.querySelector('h3')?.textContent ?? 'card ' + (i + 1)}`);
    btn.addEventListener('click', () => scrollToIndex(i));
    indicatorsWrap?.appendChild(btn);
    return btn;
  });

  const updateIndicators = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0, minDist = Infinity;
    items.forEach((item, i) => {
      const c = item.offsetLeft + item.offsetWidth / 2;
      const d = Math.abs(mid - c);
      if (d < minDist) { minDist = d; nearest = i; }
    });
    dots.forEach((dot, i) => dot.toggleAttribute('aria-current', i === nearest));
  };

  const updateNav = () => {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft > max - 4;
  };

  const scrollStep = dir => track.scrollBy({ left: dir * getStep(), behavior: prefersReduced ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => scrollStep(-1));
  next.addEventListener('click', () => scrollStep(1));

  /* Arraste */
  let down = false, startX = 0, startLeft = 0;
  track.addEventListener('pointerdown', e => {
    down = true;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    track.classList.add('is-dragging');
  });
  track.addEventListener('pointermove', e => {
    if (!down) return;
    track.scrollLeft = startLeft - (e.clientX - startX);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => {
    track.addEventListener(ev, () => { down = false; track.classList.remove('is-dragging'); });
  });

  /* Teclado */
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') scrollStep(-1);
    if (e.key === 'ArrowRight') scrollStep(1);
  });

  /* Atualização visual */
  track.addEventListener('scroll', () => {
    updateIndicators();
    updateNav();
  }, { passive: true });

  window.addEventListener('resize', () => {
    updateIndicators();
    updateNav();
  });

  updateIndicators();
  updateNav();
})();
