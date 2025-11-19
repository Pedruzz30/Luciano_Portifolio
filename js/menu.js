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
    mq: window.matchMedia('(min-width: 1025px)')
  };

  const Menu = {
    __initialized: true,
    isOpen,
    setOpen(value) {
      if (!state.header || !state.toggle || !state.nav) return;
      value ? openMenu() : closeMenu();
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
      isOpen() ? closeMenu() : openMenu();
    });

    state.nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMenu({ restoreFocus: false }));
    });

    if (state.mq.addEventListener) state.mq.addEventListener('change', syncLayout);
    else state.mq.addListener(syncLayout);

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
    if (state.mq.matches || isOpen()) return;

    state.header.classList.add('is-menu-open');
    state.nav.classList.add('is-open');
    state.nav.setAttribute('aria-hidden', 'false');
    state.toggle.setAttribute('aria-expanded', 'true');
    state.toggle.setAttribute('aria-label', 'Fechar menu principal');
    if (state.toggleLabel) state.toggleLabel.textContent = 'Fechar menu';
    if (state.backdrop) state.backdrop.hidden = false;
    document.body.classList.add('has-open-nav');

    const focusables = getFocusable();
    if (focusables.length) focusables[0].focus({ preventScroll: true });

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('pointerdown', handlePointerDown, true);
  }

  function closeMenu(options = {}) {
    const { restoreFocus = true } = options;
    if (!state.header || !state.toggle || !state.nav) return;

    if (!isOpen()) {
      updateHiddenState();
      return;
    }

    state.header.classList.remove('is-menu-open');
    state.nav.classList.remove('is-open');
    state.toggle.setAttribute('aria-expanded', 'false');
    state.toggle.setAttribute('aria-label', 'Abrir menu principal');
    if (state.toggleLabel) state.toggleLabel.textContent = 'Abrir menu';
    if (state.backdrop) state.backdrop.hidden = true;
    document.body.classList.remove('has-open-nav');

    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('pointerdown', handlePointerDown, true);

    updateHiddenState();

    if (restoreFocus && isFocusable(state.toggle)) {
      state.toggle.focus({ preventScroll: true });
    }
  }

  function syncLayout() {
    if (!state.header || !state.nav || !state.toggle) return;

    if (state.mq.matches) {
      closeMenu({ restoreFocus: false });
      state.nav.classList.remove('is-open');
      if (state.backdrop) state.backdrop.hidden = true;
      document.body.classList.remove('has-open-nav');
    } else {
      updateHiddenState();
    }
  }

  function handleKeydown(event) {
    if (!isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === 'Tab') {
      const focusables = getFocusable();
      if (!focusables.length) {
        event.preventDefault();
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
    if (!isOpen()) return;
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

  function isFocusable(el) {
    return el instanceof HTMLElement && !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
  }

  function updateHiddenState() {
    if (!state.nav) return;
    if (state.mq.matches) {
      state.nav.removeAttribute('aria-hidden');
    } else {
      state.nav.setAttribute('aria-hidden', isOpen() ? 'false' : 'true');
    }
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


