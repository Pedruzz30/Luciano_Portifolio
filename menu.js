document.addEventListener('DOMContentLoaded',function(){
  const toggle=document.querySelector('.menu-toggle');
  const menu=document.querySelector('.menu');
  if(toggle){
    toggle.addEventListener('click',()=>{
      const expanded=toggle.getAttribute('aria-expanded')==='true';
      toggle.setAttribute('aria-expanded',(!expanded).toString());
      menu.classList.toggle('open');
    });
    menu.querySelectorAll('a').forEach(link=>{
      link.addEventListener('click',()=>{
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded','false');
      });
    });
  }
  let path=window.location.pathname.split('/').pop();
  if(path==='') path='index.html';
  document.querySelectorAll('.menu a').forEach(a=>{
    if(a.getAttribute('href')===path){a.classList.add('active');}
  });
});

