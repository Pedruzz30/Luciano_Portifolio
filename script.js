const toggleBtn = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');

if (toggleBtn && menu) {
  toggleBtn.addEventListener('click', () => {
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
    });
  });
}

const path = window.location.pathname;
const currentPage = path === '/' ? 'index.html' : path.split('/').pop();
document.querySelectorAll('.menu a').forEach(link => {
  const href = link.getAttribute('href');
  if (href.endsWith(currentPage)) {
    link.classList.add('active');
  }
});

