// js/menu.js
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('header');
  if (!header) return;

  const toggle = header.querySelector('.menu-toggle');
  const menu   = header.querySelector('.menu');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  // abre/fecha no clique do botão
  toggle.addEventListener('click', () => {
    setOpen(!menu.classList.contains('open'));
  });

  // fecha ao clicar em qualquer link do menu (mobile)
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  // fecha com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  // fecha ao clicar fora
  document.addEventListener('click', (e) => {
    const clickedOutside = !menu.contains(e.target) && e.target !== toggle;
    if (clickedOutside) setOpen(false);
  });

  // marca link ativo
  let path = window.location.pathname.split('/').pop() || 'index.html';
  menu.querySelectorAll('a').forEach((a) => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // se a tela passar de 800px, garante o menu fechado (evita ficar “preso” aberto)
  const mql = window.matchMedia('(min-width: 801px)');
  const onChange = () => setOpen(false);
  if (mql.addEventListener) mql.addEventListener('change', onChange);
  else mql.addListener(onChange); // fallback
});
