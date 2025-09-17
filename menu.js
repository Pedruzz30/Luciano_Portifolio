// menu.js — estável (mobile com backdrop, desktop com indicador), sem loops

if (!window.__MENU_BOOTSTRAPPED__) {
  window.__MENU_BOOTSTRAPPED__ = true;

  document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("header");
    const toggle = header?.querySelector(".menu-toggle");
    const menu   = header?.querySelector(".menu");
    const nav    = document.getElementById("nav-principal") || menu;
    const main   = document.querySelector("main");

    // Sombra do header ao rolar
    function onScroll() {
      header?.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (!toggle || !menu) return;

    // aria-controls/id
    if (nav && !toggle.getAttribute("aria-controls")) {
      toggle.setAttribute("aria-controls", nav.id || "nav-principal");
      if (!nav.id) nav.id = "nav-principal";
    }

    const firstLink = menu.querySelector("a");

    // Backdrop (mobile)
    let backdrop = document.querySelector(".menu-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "menu-backdrop";
      document.body.appendChild(backdrop);
    }

    // Utils
    const isMobile = () => window.matchMedia("(max-width: 800px)").matches;

    function lockScrollIfMobile(on) {
      document.body.style.overflow = on && isMobile() ? "hidden" : "";
    }

    function setInert(on) {
      if (!main) return;
      if ("inert" in HTMLElement.prototype) {
        // @ts-ignore
        main.inert = !!on;
      } else {
        main.setAttribute("aria-hidden", on ? "true" : "false");
      }
    }

    function isOpen() {
      return menu.classList.contains("open");
    }

    // Handlers dependentes de setOpen: usar function declaration (hoisted)
    function onKeydown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDown(e) {
      const t = e.target;
      if (!menu.contains(t) && !toggle.contains(t)) setOpen(false);
    }
    function handleResize() {
      // se saiu do mobile, limpa estados
      if (!isMobile()) {
        document.body.style.overflow = "";
        backdrop.classList.remove("is-visible");
        setInert(false);
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menu");
      } else {
        // se ainda estiver aberto no mobile, garante lock
        lockScrollIfMobile(isOpen());
      }
    }

    function setOpen(open) {
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");

      // Backdrop + scroll lock (só no mobile)
      backdrop.classList.toggle("is-visible", open && isMobile());
      lockScrollIfMobile(open);
      setInert(open);

      if (open) {
        document.addEventListener("keydown", onKeydown);
        document.addEventListener("pointerdown", onPointerDown, { passive: true });
        window.addEventListener("resize", handleResize);
        firstLink?.focus();
      } else {
        document.removeEventListener("keydown", onKeydown);
        document.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("resize", handleResize);
        toggle.focus();
      }
    }

    // Toggle mobile
    toggle.addEventListener("click", () => setOpen(!isOpen()));

    // Fecha ao clicar em link (mobile)
    menu.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => setOpen(false));
    });

    // Fecha ao tocar no backdrop
    backdrop.addEventListener("click", () => setOpen(false));

    // Fecha quando virar desktop
    const mql = window.matchMedia("(min-width: 801px)");
    const onChange = () => setOpen(false);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);

    // Indicador (desktop; no mobile o CSS já esconde)
    mountMenuIndicator(".menu");
  });
}

/* --------- Indicador deslizante (leve, sem observers pesados) --------- */

function cleanPath(url) {
  try {
    const p = new URL(url, location.href).pathname;
    return p.replace(/index\.html?$/,'').replace(/\/+$/,'') || '/';
  } catch { return '/'; }
}

function setActiveNav(menu) {
  const links = [...menu.querySelectorAll("a[href]")];
  if (!links.length) return null;

  // Respeita aria-current se existir
  let current = links.find(a => a.hasAttribute("aria-current"));
  if (current) return current;

  const here = cleanPath(location.href);
  current = links.find(a => cleanPath(a.href) === here);
  if (current) current.setAttribute("aria-current", "page");
  return current || links[0];
}

function mountMenuIndicator(selector = ".menu") {
  const menu = document.querySelector(selector);
  if (!menu) return;

  // Cria o span do indicador se não existir
  let indicator = menu.querySelector(".menu-indicator");
  if (!indicator) {
    indicator = document.createElement("span");
    indicator.className = "menu-indicator";
    indicator.setAttribute("aria-hidden", "true");
    menu.appendChild(indicator);
  }

  const links = [...menu.querySelectorAll("a[href]")];
  if (!links.length) return;

  let currentEl = setActiveNav(menu) || links[0];

  // Posição do indicador (apenas desktop)
  function place(el) {
    if (!el) return;
    if (window.matchMedia("(max-width: 800px)").matches) return; // mobile: sai fora

    const m = menu.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    indicator.style.setProperty("--x", `${r.left - m.left}px`);
    indicator.style.setProperty("--y", `${r.top  - m.top }px`);
    indicator.style.setProperty("--w", `${r.width}px`);
    indicator.style.setProperty("--h", `${r.height}px`);
    menu.classList.add("has-indicator");
  }

  // Debounce via rAF
  let raf = 0;
  function queue(el) {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => place(el));
  }

  // Interações
  links.forEach(a => {
    a.addEventListener("mouseenter", () => queue(a), { passive: true });
    a.addEventListener("focus",     () => queue(a));
    a.addEventListener("mouseleave", () => queue(currentEl), { passive: true });
    a.addEventListener("blur",       () => queue(currentEl));
    a.addEventListener("click",      () => { currentEl = a; queue(currentEl); });
  });

  // Resize / load / fonts
  window.addEventListener("resize", () => queue(currentEl));
  window.addEventListener("load",   () => queue(currentEl));
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => queue(currentEl)).catch(()=>{});
  }

  // Primeira posição
  queue(currentEl);
}




