(() => {
  if (window.Menu?.__initialized) return;

  document.documentElement.classList.add('js');

  const state = {
    header: null,
    toggle: null,
    toggleLabel: null,
    nav: null,
    backdrop: null,
    focusableSelectors:
      'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), [tabindex="0"]',
    mq: window.matchMedia('(min-width: 1025px)'),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
    focusables: [],
    transitioning: false
  };

  const Menu = {
    __initialized: true,
    isOpen,
    setOpen(value) {
      if (!state.header || !state.toggle || !state.nav) return;
      value ? openMenu() : closeMenu({ restoreFocus: false, force: true });
    },
    refreshActive() {
      ensureCurrentLink(state.nav);
    }
  };

  window.Menu = Menu;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    state.header = document.querySelector('.site-header');
    if (!state.header) return;

    state.toggle = state.header.querySelector('.menu-toggle');
    state.nav = state.header.querySelector('.site-nav');
    state.backdrop = state.header.querySelector('.nav-backdrop') || createBackdrop(state.header);
    state.toggleLabel = state.toggle?.querySelector('.visually-hidden') || null;

    ensureCurrentLink(state.nav);

    if (!state.toggle || !state.nav) return;

    if (!state.nav.id) state.nav.id = 'primary-navigation';
    state.toggle.setAttribute('aria-controls', state.nav.id);
    state.toggle.setAttribute('aria-expanded', 'false');
    state.toggle.setAttribute('aria-label', 'Abrir menu principal');

    updateHiddenState();

    state.backdrop?.addEventListener('click', () => closeMenu());

    state.toggle.addEventListener('click', () => {
       if (state.transitioning) return;
      isOpen() ? closeMenu() : openMenu();
    });

    state.nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMenu({ restoreFocus: false }));
    });

    if (state.mq.addEventListener) state.mq.addEventListener('change', syncLayout);
    else state.mq.addListener(syncLayout);

    if (state.reducedMotion?.addEventListener) {
      state.reducedMotion.addEventListener('change', () => {
        if (!state.reducedMotion) return;
        if (state.reducedMotion.matches) closeMenu({ restoreFocus: false });
      });
    }

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('pointerdown', handlePointerDown, true);
    state.nav.addEventListener('focusin', cacheFocusables);

    syncLayout();

    Menu.refreshActive = () => ensureCurrentLink(state.nav);
  }

  function createBackdrop(header) {
    const div = document.createElement('div');
    div.className = 'nav-backdrop';
    div.hidden = true;
    header.appendChild(div);
    return div;
  }

  function isOpen() {
    return !!state.header?.classList.contains('is-menu-open');
  }

  function openMenu() {
    if (!state.header || !state.toggle || !state.nav) return;
    if (state.mq.matches || isOpen() || state.transitioning) return;

    state.transitioning = true;
    updateHiddenState({ forceClosed: true });

    cacheFocusables();

    state.header.classList.add('is-menu-open');
    state.nav.classList.add('is-open');
    state.nav.setAttribute('aria-hidden', 'false');
    state.toggle.setAttribute('aria-expanded', 'true');
    state.toggle.setAttribute('aria-label', 'Fechar menu principal');
    if (state.toggleLabel) state.toggleLabel.textContent = 'Fechar menu';
     showBackdrop();
    document.body.classList.add('has-open-nav');

    const finalizeOpen = () => {
      state.nav.setAttribute('aria-hidden', 'false');
      state.transitioning = false;
      focusFirstFocusable();
    };

    if (state.reducedMotion?.matches) {
      finalizeOpen();
      return;
    }

    onNextFrame(() => {
      waitForTransitions([state.nav, state.backdrop]).finally(finalizeOpen);
    });
  }

  function closeMenu(options = {}) {
    const { restoreFocus = true, force = false, immediate = false } = options;
    if (!state.header || !state.toggle || !state.nav) return;

    if (!isOpen() && !force) {
      updateHiddenState({ forceClosed: !state.mq.matches });
      return;
    }

 if (state.transitioning && !force) return;

    state.transitioning = !immediate;
    state.header.classList.remove('is-menu-open');
    state.nav.classList.remove('is-open');
    state.toggle.setAttribute('aria-expanded', 'false');
    state.toggle.setAttribute('aria-label', 'Abrir menu principal');
    if (state.toggleLabel) state.toggleLabel.textContent = 'Abrir menu';

     const finalizeClose = () => {
      updateHiddenState({ forceClosed: true });
      state.transitioning = false;

      if (restoreFocus && isFocusable(state.toggle)) {
        state.toggle.focus({ preventScroll: true });
      }
    };

    const waiters = [hideBackdrop({ immediate })];
    if (!immediate && !state.reducedMotion?.matches) {
      onNextFrame(() => {
        waiters.push(waitForTransitions([state.nav]));
        Promise.all(waiters).finally(finalizeClose);
      });
      return;
    }

    Promise.all(waiters).finally(finalizeClose);
  }

  function syncLayout() {
    if (!state.header || !state.nav || !state.toggle) return;

    if (state.mq.matches) {
      closeMenu({ restoreFocus: false, force: true, immediate: true });
      state.transitioning = false;
      state.nav.classList.remove('is-open');
      if (state.backdrop) {
        state.backdrop.classList.remove('is-visible');
        state.backdrop.hidden = true;
      }
      document.body.classList.remove('has-open-nav');
    }

    updateHiddenState({ forceClosed: !isOpen() });
  }

  function handleKeydown(event) {
    if (!isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (state.transitioning) return;

    if (event.key === 'Tab') {
      cacheFocusables();
      const focusables = state.focusables;
      if (!focusables.length) {
        event.preventDefault();
        if (isFocusable(state.toggle)) state.toggle.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;

      if (event.shiftKey) {
        if (current === first || !state.nav.contains(current)) {
          event.preventDefault();
          last.focus();
        }
      } else if (current === last || !state.nav.contains(current)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function handlePointerDown(event) {
    if (!isOpen() || state.transitioning) return;
    if (!(event.target instanceof Node)) return;

    if (state.nav.contains(event.target) || state.toggle.contains(event.target)) {
      return;
    }

    closeMenu();
  }

  function getFocusable() {
    if (!state.nav) return [];
    return Array.from(state.nav.querySelectorAll(state.focusableSelectors)).filter(isFocusable);
  }

  function cacheFocusables() {
    state.focusables = getFocusable();
    if (!state.focusables.length && state.toggle) {
      state.focusables = [state.toggle];
    }
  }

  function focusFirstFocusable() {
    cacheFocusables();
    const [first] = state.focusables;
    if (first) first.focus({ preventScroll: true });
  }

  function isFocusable(el) {
    return el instanceof HTMLElement && !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
  }

 function updateHiddenState(options = {}) {
    const { forceClosed = false } = options;
    if (!state.nav) return;
    if (state.mq.matches) {
      state.nav.removeAttribute('aria-hidden');
    } else {
      const hidden = forceClosed || !isOpen();
      state.nav.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    }
  }

function showBackdrop() {
    if (!state.backdrop) return;
    state.backdrop.hidden = false;
    onNextFrame(() => state.backdrop?.classList.add('is-visible'));
  }

  function hideBackdrop(options = {}) {
    const { immediate = false } = options;
    if (!state.backdrop) return Promise.resolve();

    state.backdrop.classList.remove('is-visible');

    if (immediate || state.reducedMotion?.matches) {
      state.backdrop.hidden = true;
      return Promise.resolve();
    }

    return waitForTransitions([state.backdrop]).finally(() => {
      if (state.backdrop) state.backdrop.hidden = true;
    });
  }

  function onNextFrame(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  }

  function waitForTransitions(targets = []) {
    const elements = targets.filter(Boolean);
    if (!elements.length || state.reducedMotion?.matches) return Promise.resolve();

    return new Promise((resolve) => {
      let remaining = elements.length;
      const cleanup = () => {
        elements.forEach((el) => el.removeEventListener('transitionend', onEnd));
        clearTimeout(timeoutId);
        resolve();
      };

      const onEnd = (event) => {
        if (!elements.includes(event.target)) return;
        remaining -= 1;
        if (remaining <= 0) cleanup();
      };

      const timeoutId = setTimeout(cleanup, getMaxTransitionTime(elements));
      elements.forEach((el) => el.addEventListener('transitionend', onEnd));
    });
  }

  function getMaxTransitionTime(elements) {
    let max = 0;
    for (const el of elements) {
      const styles = getComputedStyle(el);
      const durations = styles.transitionDuration.split(',').map(parseTime);
      const delays = styles.transitionDelay.split(',').map(parseTime);
      for (let i = 0; i < durations.length; i += 1) {
        const total = durations[i] + (delays[i] || delays[0] || 0);
        if (total > max) max = total;
      }
    }
    return Math.max(max, 100);
  }

  function parseTime(value) {
    const num = Number(value.replace('ms', '').replace('s', ''));
    if (value.includes('ms')) return num;
    return num * 1000;
  }

  function ensureCurrentLink(nav) {
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll('a[href]'));
    if (!links.length) return;

    const currentPath = normalizePath(location.href);

    links.forEach((link) => {
      const linkPath = normalizePath(link.href);
      if (linkPath === currentPath) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function normalizePath(url) {
    try {
      const pathname = new URL(url, location.href).pathname;
      return pathname.replace(/index\.html?$/, '').replace(/\/+$/, '') || '/';
    } catch {
      return '/';
    }
  }
})();


