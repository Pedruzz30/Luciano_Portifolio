// transitions.js
(() => {
  if (!document.startViewTransition) return; // navegadores sem suporte: navega normal

  const sameOrigin = (url) => {
    try { const u = new URL(url, location.href); return u.origin === location.origin; }
    catch { return false; }
  };
  const isModified = (e) =>
    e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

  function setActiveNav(url){
    const path = new URL(url, location.href).pathname.replace(/index\.html?$/,'');
    document.querySelectorAll('nav.menu a').forEach(a=>{
      const aPath = new URL(a.href, location.href).pathname.replace(/index\.html?$/,'');
      a.classList.toggle('active', aPath === path);
    });
  }

  async function swapTo(url, pushState = true){
    const res = await fetch(url, { headers: { 'X-Requested-With':'view-transition' }});
    if (!res.ok) { location.href = url; return; }

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newMain = doc.querySelector('main');
    const newTitle = doc.querySelector('title')?.textContent || document.title;
    if (!newMain) { location.href = url; return; }

    document.startViewTransition(() => {
      const oldMain = document.querySelector('main');
      oldMain.replaceWith(newMain);
      document.title = newTitle;
      if (pushState) history.pushState(null, '', url);
      window.scrollTo(0, 0);

      // foco de a11y no novo conteúdo
      newMain.setAttribute('tabindex','-1');
      newMain.focus({ preventScroll: true });
      newMain.addEventListener('blur', () => newMain.removeAttribute('tabindex'), { once:true });

      setActiveNav(url);
      reinitPageBits();
    });
  }

  // qualquer script leve que precise re-inicializar na página nova
  function reinitPageBits(){
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const multi = document.querySelectorAll('.hero-swap .swap-item');
    if (multi.length > 1){
      let i = 0;
      multi.forEach(el => el.classList.remove('is-active'));
      multi[0]?.classList.add('is-active');
      setInterval(() => {
        multi[i].classList.remove('is-active');
        i = (i + 1) % multi.length;
        multi[i].classList.add('is-active');
      }, 2600);
    } else {
      const single = document.querySelector('.hero-swap .swap-item');
      if (single){
        const words = ['escuta','acolhimento','clareza'];
        let i = Math.max(0, words.indexOf((single.textContent||'').trim()));
        setInterval(() => {
          i = (i + 1) % words.length;
          single.textContent = words[i];
        }, 2600);
      }
    }
  }

  // intercepta cliques internos
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (isModified(e)) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    if (!sameOrigin(href)) return;
    if (a.target && a.target !== '_self') return;

    e.preventDefault();

    // fecha o menu se estiver aberto (usa tua mini-API)
    try { if (window.Menu?.isOpen?.()) window.Menu.setOpen(false); } catch {}

    swapTo(href, true);
  });

  // back/forward do navegador
  window.addEventListener('popstate', () => {
    swapTo(location.href, false);
  });

  // marca nav ativa ao carregar
  setActiveNav(location.href);
})();