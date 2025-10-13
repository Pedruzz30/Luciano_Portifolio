// servicos.js — página de serviços (2024)
(() => {
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  // Animações de entrada
  const animatedNodes = [...document.querySelectorAll('[data-animate]')];
  if (!prefersReduced && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const { target } = entry;
            const delay = target.dataset.delay ?? 0;
            target.style.transitionDelay = `${delay}ms`;
            target.classList.add('is-visible');
            observer.unobserve(target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    );
    animatedNodes.forEach((node) => observer.observe(node));
  } else {
    animatedNodes.forEach((node) => node.classList.add('is-visible'));
  }

  // FAQ — somente uma pergunta aberta por vez
  const faqItems = [...document.querySelectorAll('.faq-item')];
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });
})();



