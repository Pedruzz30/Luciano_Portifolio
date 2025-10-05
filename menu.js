// menu.js — navegação responsiva com backdrop mobile e destaque simples do link ativo

if (!window.__MENU_BOOTSTRAPPED__) {
  window.__MENU_BOOTSTRAPPED__ = true;

  document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".site-header");
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
    if (!window.__MENU_BOOTSTRAPPED__) {
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

    ensureCurrentLink(menu);
  });
}

function cleanPath(url) {
  try {
    const p = new URL(url, location.href).pathname;
    return p.replace(/index\.html?$/,'').replace(/\/+$/,'') || '/';
  } catch { return '/'; }
}

function ensureCurrentLink(menu) {
  if (!menu) return;
  const links = [...menu.querySelectorAll("a[href]")];
  if (!links.length) return;
  if (links.some(a => a.hasAttribute("aria-current"))) return;

  const here = cleanPath(location.href);
  const current = links.find(a => cleanPath(a.href) === here);
  if (current) current.setAttribute("aria-current", "page");
}



