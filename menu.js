document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector("header");
  const toggle = header?.querySelector(".menu-toggle");
  const menu = header?.querySelector(".menu");
  const nav = document.getElementById("nav-principal") || menu;
  const main = document.querySelector("main");

  if (!toggle || !menu) return;

  // garante aria-controls
  if (nav && !toggle.getAttribute("aria-controls")) {
    toggle.setAttribute("aria-controls", nav.id || "nav-principal");
    if (!nav.id) nav.id = "nav-principal";
  }

  const firstLink = menu.querySelector("a");

  const lockScrollIfMobile = (on) => {
    const isMobile = window.innerWidth <= 800;
    document.body.style.overflow = on && isMobile ? "hidden" : "";
  };

  const setInert = (on) => {
    if (!main) return;
    // inert melhora navegação por teclado/leitor de tela quando o menu está aberto
    if ("inert" in HTMLElement.prototype) {
      main.inert = !!on;
    } else {
      // fallback brando
      main.setAttribute("aria-hidden", on ? "true" : "false");
    }
  };

  const onKeydown = (e) => {
    if (e.key === "Escape") setOpen(false);
  };

  const onPointerDown = (e) => {
    const target = e.target;
    if (!menu.contains(target) && !toggle.contains(target)) setOpen(false);
  };

  const onResize = () => lockScrollIfMobile(isOpen());

  const setOpen = (open) => {
    menu.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    lockScrollIfMobile(open);
    setInert(open);

    if (open) {
      document.addEventListener("keydown", onKeydown);
      document.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("resize", onResize);
      // foca no primeiro item do menu
      firstLink?.focus();
    } else {
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
      // retorna foco ao botão
      toggle.focus();
    }
  };

  const isOpen = () => menu.classList.contains("open");

  // expõe mini-API global
  window.Menu = { setOpen, isOpen };

  // abre/fecha no clique do botão
  toggle.addEventListener("click", () => {
    setOpen(!isOpen());
  });

  // fecha ao clicar em qualquer link do menu (mobile)
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  // se a tela passar de 800px, garante o menu fechado e destrava o scroll
  const mql = window.matchMedia("(min-width: 801px)");
  const onChange = () => setOpen(false);
  if (mql.addEventListener) mql.addEventListener("change", onChange);
  else mql.addListener(onChange); // fallback

  // ===== HERO: troca de palavras =====
  (function () {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    // Modo A: vários spans .swap-item (usa classes)
    const multi = document.querySelectorAll(".hero-swap .swap-item");
    if (multi.length > 1) {
      let i = 0;
      multi[0].classList.add("is-active");
      setInterval(() => {
        multi[i].classList.remove("is-active");
        i = (i + 1) % multi.length;
        multi[i].classList.add("is-active");
      }, 2600);
      return;
    }

    // Modo B: um único span.swap-item (troca texto)
    const single =
      document.querySelector(".hero-swap .swap-item") ||
      document.querySelector(".swap-item");
    if (!single) return;

    const words = ["escuta", "acolhimento", "clareza"];
    let i = words.indexOf(single.textContent?.trim());
    if (i < 0) i = 0;
    setInterval(() => {
      i = (i + 1) % words.length;
      single.textContent = words[i];
    }, 2600);
  })();
});