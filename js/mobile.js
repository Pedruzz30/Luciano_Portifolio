// js/mobile.js — mobile only enhancements
(() => {
  const MOBILE_QUERY = '(max-width: 1024px)';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
  // Keyboard targets inside the mobile nav/accordions
  const focusableSelector =
    'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), [tabindex="0"]';

  const mobileMQ = window.matchMedia?.(MOBILE_QUERY);
  const motionMQ = window.matchMedia?.(REDUCED_MOTION_QUERY);

  if (!mobileMQ) return;

  let initialized = false;
  // Keeps references for nav mutation observer, event cleanup and async load fallback
  const navState = { observer: null, cleanup: null, close: null, removeLoadListener: null };
  // Tracks accordion instances and listeners for teardown
  const accordionCleanups = [];
  let accordionItems = [];
  // Reveal effect observer and safety timer
  let revealObserver = null;
  let revealSafetyTimer = null;

  const init = () => {
    if (initialized || !mobileMQ.matches) return;
    initialized = true;
    enhanceNavigation();
    initAccordions();
    initReveal();
  };

  const destroy = () => {
    if (!initialized) return;
    initialized = false;

    if (navState.observer) {
      navState.observer.disconnect();
      navState.observer = null;
    }
    if (navState.cleanup) {
      try { navState.cleanup(); } catch {}
      navState.cleanup = null;
    }
    if (navState.close) {
      try { navState.close(false); } catch {}
      navState.close = null;
    }
    if (navState.removeLoadListener) {
      try { navState.removeLoadListener(); } catch {}
      navState.removeLoadListener = null;
    }
    document.querySelectorAll('.site-nav[data-mobile-nav]').forEach((navEl) => {
      navEl.removeAttribute('data-mobile-open');
    });

    accordionCleanups.splice(0).forEach((fn) => {
      try { fn(); } catch {}
    });
    accordionItems = [];

    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
    if (revealSafetyTimer) {
      clearTimeout(revealSafetyTimer);
      revealSafetyTimer = null;
    }
    document.querySelectorAll('[data-mobile-reveal]').forEach((el) => {
      el.classList.add('is-revealed');
    });
  };

  const handleChange = (event) => {
    if (event.matches) init();
    else destroy();
  };

  if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', handleChange);
  else mobileMQ.addListener(handleChange);

  document.addEventListener('DOMContentLoaded', init);

  /* Navigation: ensure off-canvas states + fallback */
  function enhanceNavigation() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const nav = header.querySelector('.site-nav');
    const toggle = header.querySelector('.menu-toggle');
    const backdrop = header.querySelector('.nav-backdrop');

    if (!nav || !toggle || !backdrop) return;

    nav.dataset.mobileNav = 'true';
    backdrop.dataset.mobileBackdrop = 'true';

    const syncState = () => {
      const open = header.classList.contains('is-menu-open');
      nav.dataset.mobileOpen = open ? 'true' : 'false';
    };
    syncState();

    navState.observer = new MutationObserver(syncState);
    navState.observer.observe(header, { attributes: true, attributeFilter: ['class'] });

    const startFallback = () => {
      if (window.Menu?.setOpen) return;

      const isFocusable = (el) => el instanceof HTMLElement && !el.hasAttribute('disabled') && el.offsetParent !== null;
      const getFocusables = () => Array.from(nav.querySelectorAll(focusableSelector)).filter(isFocusable);

      const enforceFocus = (event) => {
        if (!header.classList.contains('is-menu-open')) return;
        if (!nav.contains(event.target) && event.target !== toggle) {
          const focusables = getFocusables();
          if (focusables.length) focusables[0].focus({ preventScroll: true });
          else toggle.focus({ preventScroll: true });
        }
      };

      const handleKeydown = (event) => {
        if (!header.classList.contains('is-menu-open')) return;

        if (event.key === 'Escape') {
          event.preventDefault();
          closeMenu();
          return;
        }

        if (event.key === 'Tab') {
          const focusables = getFocusables();
          if (!focusables.length) {
            event.preventDefault();
            return;
          }
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement;

          if (event.shiftKey) {
            if (active === first || !nav.contains(active)) {
              event.preventDefault();
              last.focus();
            }
          } else if (active === last || !nav.contains(active)) {
            event.preventDefault();
            first.focus();
          }
        }
      };

      const handlePointerDown = (event) => {
        if (!header.classList.contains('is-menu-open')) return;
        if (!(event.target instanceof Node)) return;
        if (nav.contains(event.target) || toggle.contains(event.target)) return;
        closeMenu();
      };

      const openMenu = () => {
        if (header.classList.contains('is-menu-open')) return;
        header.classList.add('is-menu-open');
        nav.classList.add('is-open');
        nav.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Fechar menu principal');
        if (backdrop) {
          backdrop.hidden = false;
          backdrop.removeAttribute('aria-hidden');
        }
        document.body.classList.add('has-open-nav');
        syncState();

        document.addEventListener('keydown', handleKeydown);
        document.addEventListener('focus', enforceFocus, true);
        document.addEventListener('pointerdown', handlePointerDown, true);

        const focusables = getFocusables();
        if (focusables.length) focusables[0].focus({ preventScroll: true });
      };

      const closeMenu = (restoreFocus = true) => {
        if (!header.classList.contains('is-menu-open')) return;
        header.classList.remove('is-menu-open');
        nav.classList.remove('is-open');
        nav.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menu principal');
        if (backdrop) {
          backdrop.hidden = true;
          backdrop.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('has-open-nav');
        syncState();

        document.removeEventListener('keydown', handleKeydown);
        document.removeEventListener('focus', enforceFocus, true);
        document.removeEventListener('pointerdown', handlePointerDown, true);

        if (restoreFocus) {
          toggle.focus({ preventScroll: true });
        }
      };

      const onToggle = () => {
        if (header.classList.contains('is-menu-open')) closeMenu();
        else openMenu();
      };

      const onBackdrop = () => closeMenu();

      toggle.addEventListener('click', onToggle);
      backdrop.addEventListener('click', onBackdrop);

      navState.cleanup = () => {
        toggle.removeEventListener('click', onToggle);
        backdrop.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', handleKeydown);
        document.removeEventListener('focus', enforceFocus, true);
        document.removeEventListener('pointerdown', handlePointerDown, true);
        document.body.classList.remove('has-open-nav');
        nav.removeAttribute('data-mobile-open');
        nav.removeAttribute('data-mobile-nav');
        backdrop.removeAttribute('data-mobile-backdrop');
      };

      navState.close = closeMenu;
    };

    if (document.readyState === 'complete') {
      startFallback();
    } else {
      const onLoad = () => {
        navState.removeLoadListener = null;
        startFallback();
      };
      window.addEventListener('load', onLoad, { once: true });
      navState.removeLoadListener = () => window.removeEventListener('load', onLoad);
    }
  }

  function initAccordions() {
    const nodes = Array.from(document.querySelectorAll('.pergunta'));
    if (!nodes.length) return;

    accordionItems = [];

    nodes.forEach((item, index) => {
      if (!(item instanceof HTMLElement)) return;
      if (item.dataset.mobileAccordion === 'ready') return;

      const summary = item.querySelector('summary');
      if (!summary) return;

      item.dataset.mobileAccordion = 'ready';

      let panel = item.querySelector('.pergunta__content');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'pergunta__content';
        const fragment = document.createDocumentFragment();
        while (summary.nextSibling) {
          fragment.appendChild(summary.nextSibling);
        }
        panel.appendChild(fragment);
        item.appendChild(panel);
      }

      const triggerId = summary.id || `pergunta-trigger-${index + 1}`;
      const panelId = panel.id || `pergunta-panel-${index + 1}`;
      summary.id = triggerId;
      panel.id = panelId;

      summary.setAttribute('role', 'button');
      summary.setAttribute('aria-controls', panelId);
      summary.setAttribute('aria-expanded', 'false');
      summary.setAttribute('tabindex', '0');
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', triggerId);
      panel.hidden = true;
      panel.style.height = '0px';
      item.dataset.accordionState = 'closed';

      let animating = false;

      const setOpen = (open, { focus = false } = {}) => {
        if (item.dataset.accordionState === (open ? 'open' : 'closed')) return;
        if (animating) return;
        animating = true;

        // Keep the native <details> state in sync to avoid browsers hiding the panel
        // when the element isn't marked as open. This also enables the [open] styles
        // already defined in the stylesheet.
        item.open = open;

        item.dataset.accordionState = open ? 'open' : 'closed';
        summary.setAttribute('aria-expanded', open ? 'true' : 'false');

        const finish = () => {
          panel.style.transition = '';
          panel.style.height = '';
          if (!open) panel.hidden = true;
          animating = false;
        };

        if (motionMQ?.matches) {
          panel.hidden = !open;
          finish();
          if (open && focus) {
            const focusable = panel.querySelector(focusableSelector);
            if (focusable instanceof HTMLElement) {
              focusable.focus({ preventScroll: true });
            }
          }
          return;
        }

        panel.hidden = false;
        const startHeight = open ? 0 : panel.scrollHeight;
        const endHeight = open ? panel.scrollHeight : 0;

        panel.style.transition = 'height 0.3s ease';
        panel.style.height = `${startHeight}px`;
        panel.offsetHeight;
        panel.style.height = `${endHeight}px`;

        panel.addEventListener('transitionend', finish, { once: true });

        if (open && focus) {
          requestAnimationFrame(() => {
            const focusable = panel.querySelector(focusableSelector);
            if (focusable instanceof HTMLElement) {
              focusable.focus({ preventScroll: true });
            }
          });
        }
      };

      const closeOthers = () => {
        accordionItems.forEach((entry) => {
          if (entry.element === item) return;
          entry.setOpen(false);
        });
      };

      const toggle = () => {
        if (item.dataset.accordionState === 'open') {
          setOpen(false);
        } else {
          closeOthers();
          setOpen(true, { focus: true });
        }
      };

      const onClick = (event) => {
        event.preventDefault();
        toggle();
      };

      const onKeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          const idx = accordionItems.findIndex((entry) => entry.element === item);
          if (idx === -1) return;
          const next = accordionItems[(idx + direction + accordionItems.length) % accordionItems.length];
          next?.summary?.focus({ preventScroll: true });
        }
      };

      summary.addEventListener('click', onClick);
      summary.addEventListener('keydown', onKeydown);

      accordionItems.push({ element: item, setOpen, summary, panel });

      accordionCleanups.push(() => {
        summary.removeEventListener('click', onClick);
        summary.removeEventListener('keydown', onKeydown);
        summary.removeAttribute('role');
        summary.removeAttribute('aria-controls');
        summary.removeAttribute('aria-expanded');
        summary.removeAttribute('tabindex');
        panel.removeAttribute('role');
        panel.removeAttribute('aria-labelledby');
        panel.hidden = false;
        panel.style.height = '';
        panel.style.transition = '';
        item.removeAttribute('data-accordion-state');
        delete item.dataset.mobileAccordion;
      });
    });
  }

  function initReveal() {
    const elements = Array.from(document.querySelectorAll('[data-mobile-reveal]'));
    if (!elements.length) return;

    if (motionMQ?.matches || typeof IntersectionObserver === 'undefined') {
      elements.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

     const revealed = new WeakSet();
    const reveal = (el) => {
      if (revealed.has(el)) return;
      revealed.add(el);
      el.classList.add('is-revealed');
      if (revealed.size === elements.length && revealSafetyTimer) {
        clearTimeout(revealSafetyTimer);
        revealSafetyTimer = null;
      }
    };

    revealSafetyTimer = window.setTimeout(() => {
      elements.forEach(reveal);
    }, 1400);

    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8%' });

    elements.forEach((el) => revealObserver.observe(el));
  }
})();
