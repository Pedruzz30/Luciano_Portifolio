const toggleBtn = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');

toggleBtn.addEventListener('click', () => {
  menu.classList.toggle('open');
});

menu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    menu.classList.remove('open');
  });
});

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.menu a').forEach(link => {
  const href = link.getAttribute('href');
  if (href.endsWith(currentPage)) {
    link.classList.add('active');
  }
});

