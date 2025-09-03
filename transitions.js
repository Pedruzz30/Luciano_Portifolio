// transitions.js (v2 turbo)
(() => {
  // Progressive Enhancement: sem suporte, vida que segue
  if (!document.startViewTransition) return;

  // ===== Helpers =====
  const sameOrigin = (url) => {
    try { return new URL(url, location.href).origin === location.origin; }
    catch { return false; }
  };
  const isModified = (e) =>
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

  // normaliza path (tira /index.html)
  const normPath = (url) =>
    new URL(url, location.href).pathname.replace(/index\.html?$/,'') || '/';

  function setActiveNav(url){
    const path = normPath(url);
    document.querySelectorAll('nav.menu a').forEach(a=>{
      const aPath = normPath(a.href);
      a.classList.toggle('active', aPath === path);
      if (aPath === path) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
  }

  // timers/limpezas entre páginas
  let cleanupFns = [];
  function addCleanup(fn){ cleanupFns.push(fn); }
  function runCleanup(){
    for (const fn of cleanupFns) { try { fn(); } catch {} }
    cleanupFns = [];
  }

  // controla navegações concorrentes
  let navAbort = null;
  let navLock = false;
  history.scrollRestoration = 'manual';

  // ===== Prefetch leve =====
  const prefetchCache = new Map(); // url -> Promise<Response>
  function prefetch(url){
    if (!sameOrigin(url)) return;
    if (prefetchCache.has(url)) return;
    prefetchCache.set(url,
      fetch(url, { headers:{ 'X-Requested-With':'view-transition' }})
        .catch(()=>null)
    );
  }

  // ===== Troca de página =====
  async function fetchDoc(url){
    try {
      // usa prefetch se existir
      const pre = prefetchCache.get(url);
      const res = pre ? await pre : await fetch(url, { headers:{ 'X-Requested-With':'view-transition' }});
      if (!res || !res.ok) return null;
      const html = await res.text();
      return new DOMParser().parseFromString(html, 'text/html');
    } catch {
      return null;
    }
  }

  async function swapTo(url, pushState = true, sourceEl = null){
    // evita corrida
    if (navLock) return;
    navLock = true;
    if (navAbort) try { navAbort.abort(); } catch {}
    navAbort = new AbortController();

    const doc = await fetchDoc(url);
    if (!doc) { location.href = url; return; }

    const newMain = doc.querySelector('main');
    const newTitle = doc.querySelector('title')?.textContent || document.title;
    if (!newMain) { location.href = url; return; }

    // fecha menu se estiver aberto
    try { if (window.Menu?.isOpen?.()) window.Menu.setOpen(false); } catch {}

    // execução da transição + troca do DOM
    const vt = document.startViewTransition(() => {
      runCleanup(); // limpa timers da página anterior

      const oldMain = document.querySelector('main');
      oldMain.replaceWith(newMain);

      document.title = newTitle;
      if (pushState) history.pushState(null, '', url);

      // rola pro topo (ou pra hash se tiver)
      const u = new URL(url, location.href);
      if (u.hash) {
        // tenta rolar até o id da hash
        requestAnimationFrame(() => {
          const target = document.querySelector(u.hash);
          if (target) target.scrollIntoView({ behavior:'instant', block:'start' });
          else window.scrollTo({ top: 0, behavior: 'instant' });
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      // foco de a11y
      newMain.setAttribute('tabindex','-1');
      newMain.focus({ preventScroll: true });
      newMain.addEventListener('blur', () => newMain.removeAttribute('tabindex'), { once:true });

      setActiveNav(url);
      reinitPageBits();
    });

    // libera lock quando terminar
    Promise.resolve(vt?.finished).catch(()=>{}).finally(()=>{
      navLock = false;
    });
  }

  // ===== Reinit de scripts da página =====
  function reinitPageBits(){
    // hero swap (sem acumular interval)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced){
      const multi = document.querySelectorAll('.hero-swap .swap-item');
      if (multi.length > 1){
        let i = 0;
        multi.forEach(el => el.classList.remove('is-active'));
        multi[0]?.classList.add('is-active');
        const id = setInterval(() => {
          multi[i].classList.remove('is-active');
          i = (i + 1) % multi.length;
          multi[i].classList.add('is-active');
        }, 2600);
        addCleanup(() => clearInterval(id));
      } else {
        const single = document.querySelector('.hero-swap .swap-item');
        if (single){
          const words = ['escuta','acolhimento','clareza'];
          let i = Math.max(0, words.indexOf((single.textContent||'').trim()));
          const id = setInterval(() => {
            i = (i + 1) % words.length;
            single.textContent = words[i];
          }, 2600);
          addCleanup(() => clearInterval(id));
        }
      }
    }
  }

  // ===== Interceptores =====
  // Prefetch em hover/toque
  document.addEventListener('pointerenter', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    if (!sameOrigin(href)) return;
    if (a.target && a.target !== '_self') return;
    prefetch(new URL(href, location.href).href);
  }, { capture: true });

  // Navegação com transição
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    if (isModified(e)) return;

    const href = a.getAttribute('href');
    if (!href) return;

    // Âncoras locais: rola suave e sai
    if (href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    if (!sameOrigin(href)) return;
    if (a.target && a.target !== '_self') return;

    const abs = new URL(href, location.href).href;

    // mesmo path? se só mudar hash, deixa o comportamento padrão (já tratamos acima)
    if (normPath(abs) === normPath(location.href) && new URL(abs).hash) return;

    e.preventDefault();
    swapTo(abs, true, a);
  });

  // Back/forward
  window.addEventListener('popstate', () => {
    swapTo(location.href, false);
  });

  // Marca nav ativa na carga
  setActiveNav(location.href);

  // Inicializa scripts da página atual
  reinitPageBits();
})();
