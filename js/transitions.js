// transitions.js
(() => {
  if (!document.startViewTransition) return;

  // ===== Progress bar =====
  const progressEl = document.createElement('div');
  progressEl.id = 'nav-progress';
  progressEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progressEl);

  const progressStyle = document.createElement('style');
  progressStyle.textContent = `
    #nav-progress {
      position: fixed;
      top: 0; left: 0;
      height: 2px;
      width: 0;
      z-index: 99999;
      pointer-events: none;
      background: var(--terracota-queimado, #c6654c);
      opacity: 0;
      transition: width .35s ease, opacity .2s ease;
    }
    html.nav-loading #nav-progress { width: 72%; opacity: 1; }
    html.nav-done   #nav-progress { width: 100%; opacity: 0; }
  `;
  document.head.appendChild(progressStyle);

  function showProgress() {
    document.documentElement.classList.remove('nav-done');
    document.documentElement.classList.add('nav-loading');
  }
  function hideProgress() {
    document.documentElement.classList.remove('nav-loading');
    document.documentElement.classList.add('nav-done');
    setTimeout(() => document.documentElement.classList.remove('nav-done'), 400);
  }

  // ===== Aria-live para leitores de tela =====
  const liveRegion = document.createElement('div');
  liveRegion.className = 'visually-hidden';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  document.body.insertAdjacentElement('afterbegin', liveRegion);

  function announce(text) {
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = text; });
  }

  // ===== Helpers =====
  const sameOrigin = (url) => {
    try { return new URL(url, location.href).origin === location.origin; }
    catch { return false; }
  };
  const isModified = (e) =>
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

  function hrefKey(href) {
    try { return new URL(href, location.href).href; } catch { return href; }
  }

  function syncHead(fromDoc, toDoc) {
    const currLinks = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'));
    const nextLinks = Array.from(toDoc.head.querySelectorAll('link[rel="stylesheet"]'));

    const currHrefs = new Set(currLinks.map(l => hrefKey(l.getAttribute('href'))));
    const nextHrefs = new Set(nextLinks.map(l => hrefKey(l.getAttribute('href'))));

    for (const link of nextLinks) {
      const href = hrefKey(link.getAttribute('href'));
      if (!currHrefs.has(href)) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        l.media = link.media || 'all';
        document.head.appendChild(l);
      }
    }

    for (const link of currLinks) {
      const href = hrefKey(link.getAttribute('href'));
      const keepGlobal = /(?:^|\/)(style\.css|fonts\.googleapis\.com)/.test(href);
      if (!keepGlobal && !nextHrefs.has(href)) link.remove();
    }

    const nextDesc = toDoc.head.querySelector('meta[name="description"]');
    if (nextDesc) {
      let currDesc = document.head.querySelector('meta[name="description"]');
      if (!currDesc) {
        currDesc = document.createElement('meta');
        currDesc.setAttribute('name', 'description');
        document.head.appendChild(currDesc);
      }
      currDesc.setAttribute('content', nextDesc.getAttribute('content') || '');
    }

    const nextCanon = toDoc.head.querySelector('link[rel="canonical"]');
    if (nextCanon) {
      let currCanon = document.head.querySelector('link[rel="canonical"]');
      if (!currCanon) {
        currCanon = document.createElement('link');
        currCanon.rel = 'canonical';
        document.head.appendChild(currCanon);
      }
      currCanon.href = nextCanon.href;
    }
  }

  const normPath = (url) =>
    new URL(url, location.href).pathname.replace(/index\.html?$/, '').replace(/\/+$/, '') || '/';

  // Sincroniza hrefs dos nav-links com a página destino.
  // Necessário porque só <main> e <footer> são trocados — o <header> permanece.
  function syncNavLinks(incomingDoc) {
    const incomingLinks = Array.from(incomingDoc.querySelectorAll('.site-nav .nav-link'));
    const currentLinks  = Array.from(document.querySelectorAll('.site-nav .nav-link'));
    incomingLinks.forEach((link, i) => {
      if (currentLinks[i]) currentLinks[i].setAttribute('href', link.getAttribute('href'));
    });
  }

  function setActiveNav(url) {
    const current = new URL(url, location.href);
    const path = normPath(current.href);
    const hash = current.hash || (path === '/' ? '#inicio' : '');

    document.querySelectorAll('.site-nav .nav-link').forEach(a => {
      const link = new URL(a.href, location.href);
      const aPath = normPath(link.href);
      const active = aPath === path && (link.hash ? link.hash === hash : !hash);
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  // ===== Controle de navegação concorrente =====
  let navAbort = null;
  let navLock = false;
  history.scrollRestoration = 'manual';

  // ===== Prefetch leve =====
  const prefetchCache = new Map();
  async function prefetch(url) {
    const cacheUrl = new URL(url, location.href).href;
    if (!sameOrigin(cacheUrl)) return;
    if (prefetchCache.has(cacheUrl)) return;

    const p = fetch(cacheUrl, { headers: { 'X-Requested-With': 'view-transition' } })
      .then(async res => {
        if (!res.ok) return null;
        const html = await res.text();
        try {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const nextLinks = Array.from(doc.head.querySelectorAll('link[rel="stylesheet"]'));
          for (const link of nextLinks) {
            const href = hrefKey(link.getAttribute('href'));
            if (!href) continue;
            const exists = Array.from(document.head.querySelectorAll('link[rel="preload"][as="style"], link[rel="stylesheet"]'))
              .some(item => hrefKey(item.getAttribute('href')) === href);
            if (!exists) {
              const preload = document.createElement('link');
              preload.rel = 'preload';
              preload.as = 'style';
              preload.href = href;
              document.head.appendChild(preload);
            }
          }
        } catch {}
        return html;
      })
      .catch(() => { prefetchCache.delete(cacheUrl); return null; });

    prefetchCache.set(cacheUrl, p);
  }

  // ===== Troca de página =====
  async function fetchDoc(url, signal) {
    try {
      const cacheUrl = new URL(url, location.href).href;
      const pre = prefetchCache.get(cacheUrl);
      let html = pre ? await pre : null;

      if (!html) {
        const res = await fetch(cacheUrl, { headers: { 'X-Requested-With': 'view-transition' }, signal });
        if (!res || !res.ok) return null;
        html = await res.text();
      }

      return new DOMParser().parseFromString(html, 'text/html');
    } catch {
      return null;
    }
  }

  async function swapTo(url, pushState = true) {
    if (navLock) return;
    navLock = true;
    if (navAbort) try { navAbort.abort(); } catch {}
    navAbort = new AbortController();

    showProgress();

    const doc = await fetchDoc(url, navAbort.signal);
    if (!doc) { hideProgress(); navLock = false; location.href = url; return; }

    const newMain = doc.querySelector('main');
    const newTitle = doc.querySelector('title')?.textContent || document.title;
    if (!newMain) { hideProgress(); navLock = false; location.href = url; return; }

    document.documentElement.classList.add('no-anim');

    try { if (window.Menu?.isOpen?.()) window.Menu.setOpen(false); } catch {}

    syncHead(document, doc);

    const vt = document.startViewTransition(() => {
      const oldMain = document.querySelector('main');
      oldMain.replaceWith(newMain);

      // Substitui o footer para que conteúdo e links correspondam à página destino
      const newFooter = doc.querySelector('footer');
      const oldFooter = document.querySelector('footer');
      if (newFooter && oldFooter) oldFooter.replaceWith(newFooter);

      // Sincroniza hrefs do nav-header com a página destino
      syncNavLinks(doc);

      // Sincroniza classe do body (ex: landing-page)
      const incomingBodyClass = doc.body.getAttribute('class');
      if (incomingBodyClass !== null) document.body.className = incomingBodyClass;

      document.title = newTitle;
      if (pushState) history.pushState(null, '', url);

      const u = new URL(url, location.href);
      if (u.hash) {
        requestAnimationFrame(() => {
          const target = document.querySelector(u.hash);
          if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
          else window.scrollTo({ top: 0, behavior: 'auto' });
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }

      newMain.setAttribute('tabindex', '-1');
      newMain.focus({ preventScroll: true });
      newMain.addEventListener('blur', () => newMain.removeAttribute('tabindex'), { once: true });

      setActiveNav(url);
      try { window.Menu?.refreshActive?.(); } catch {}
    });

    Promise.resolve(vt?.finished).catch(() => {}).finally(() => {
      document.documentElement.classList.remove('no-anim');
      hideProgress();
      navLock = false;
      announce(newTitle);
      // Anima elementos [data-mobile-reveal] do novo conteúdo
      try { window.Reveal?.run?.(newMain); } catch {}
    });
  }

  // ===== Interceptores =====
  document.addEventListener('pointerenter', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    if (!sameOrigin(href)) return;
    if (a.target && a.target !== '_self') return;
    prefetch(new URL(href, location.href).href);
  }, { capture: true });

  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    if (isModified(e)) return;

    const href = a.getAttribute('href');
    if (!href) return;

    // Âncoras locais
    if (href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        history.replaceState(null, '', href);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try {
          window.setTimeout(() => window.Menu?.refreshActive?.(), 180);
          window.setTimeout(() => window.Menu?.refreshActive?.(), 640);
          window.setTimeout(() => window.Menu?.refreshActive?.(), 1100);
        } catch {}
        return;
      }
      // Alvo não existe na página atual (ex: #inicio em casal.html após view transition).
      // Navega para o index com o hash correto.
      e.preventDefault();
      swapTo(new URL('index.html' + href, location.href).href, true);
      return;
    }

    if (!sameOrigin(href)) return;
    if (a.target && a.target !== '_self') return;

    const abs = new URL(href, location.href).href;

    // mesmo path + só hash? deixa o browser rolar normalmente
    if (new URL(abs).pathname.replace(/index\.html?$/, '') === new URL(location.href).pathname.replace(/index\.html?$/, '')
        && new URL(abs).hash) return;

    e.preventDefault();
    swapTo(abs, true);
  });

  // Back/forward — libera o lock antes de navegar para não travar
  window.addEventListener('popstate', () => {
    navLock = false;
    if (navAbort) try { navAbort.abort(); } catch {}
    navAbort = null;
    swapTo(location.href, false);
  });

  setActiveNav(location.href);
})();
