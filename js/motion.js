/* ================================================================
   motion.js — sistema de movimento

   Um só vocabulário para o site inteiro:
     data-reveal="fade"   opacidade + 1.25rem de subida
     data-reveal="line"   linha de texto sobe por trás de uma máscara
     data-reveal="image"  cortina vertical + correção mínima de escala
     data-stagger="120"   escalona os filhos marcados do bloco
     data-draw            traço do fio, desenhado ao entrar na tela

   Regras da casa:
   - nada anima antes de o layout estar estável (fontes carregadas);
   - nada anima se o usuário pediu menos movimento;
   - sem JS, sem CSS de movimento, sem erro: o conteúdo já está lá.
   ================================================================ */

(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const supported =
    'IntersectionObserver' in window &&
    typeof document.querySelectorAll === 'function';

  /* Sem suporte ou com movimento reduzido não marcamos html.motion,
     então o CSS nunca chega a esconder nada. */
  if (!supported || reduceMotion.matches) {
    markReady();
    return;
  }

  root.classList.add('motion');

  const observers = new Set();

  /* --- Utilitários ------------------------------------------------ */

  function markReady() {
    root.classList.add('motion-ready');
  }

  function reveal(el) {
    el.classList.add('is-revealed');
  }

  /* Um observador por configuração, compartilhado entre elementos:
     evita criar dezenas de IntersectionObserver iguais. */
  function watch(elements, onEnter, options) {
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        onEnter(entry.target);
        observer.unobserve(entry.target);
      }
    }, options);

    elements.forEach((el) => observer.observe(el));
    observers.add(observer);
  }

  /* Se o usuário mudar a preferência no meio da sessão, paramos tudo
     e mostramos o conteúdo imediatamente. */
  function teardown() {
    observers.forEach((observer) => observer.disconnect());
    observers.clear();
    root.classList.remove('motion');
    document
      .querySelectorAll('[data-reveal]')
      .forEach((el) => el.classList.add('is-revealed'));
    document
      .querySelectorAll('[data-draw]')
      .forEach((el) => el.classList.add('is-drawn'));
  }

  const onPreferenceChange = (event) => {
    if (event.matches) teardown();
  };

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', onPreferenceChange);
  } else if (reduceMotion.addListener) {
    reduceMotion.addListener(onPreferenceChange);
  }

  /* --- 1. Entrada do hero ----------------------------------------
     A única sequência coreografada do site. Roda uma vez, na carga,
     e só depois das fontes: senão as linhas mascaradas saltam
     quando a Fraunces substitui a fonte de fallback. */

  function playHero() {
    const hero = document.querySelector('[data-hero]');
    if (!hero) return [];

    const steps = Array.from(hero.querySelectorAll('[data-hero-step]'));
    if (!steps.length) return [];

    steps
      .slice()
      .sort((a, b) => Number(a.dataset.heroStep) - Number(b.dataset.heroStep))
      .forEach((el, index) => {
        el.style.setProperty('--reveal-delay', `${index * 95}ms`);
      });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => steps.forEach(reveal));
    });

    return steps;
  }

  /* --- 2. Revelações por scroll ----------------------------------- */

  function bindReveals(exclude) {
    const skip = new Set(exclude);
    const targets = Array.from(
      document.querySelectorAll('[data-reveal]:not(.is-revealed)')
    ).filter((el) => !skip.has(el));

    const options = {
      threshold: 0,
      /* Dispara quando o elemento passa de ~12% da altura da janela:
         o conteúdo chega já assentado, sem animar na borda. */
      rootMargin: '0px 0px -12% 0px'
    };

    /* A cortina de imagem começa com clip-path de altura zero, e alguns
       navegadores contam o clip-path do próprio alvo no
       IntersectionObserver: a imagem recortada nunca "entra" na tela e
       fica em branco para sempre. Por isso observamos o pai, que não é
       recortado, e revelamos a imagem quando ele aparece. */
    const images = new Map();
    const others = [];

    targets.forEach((el) => {
      if (el.dataset.reveal !== 'image') {
        others.push(el);
        return;
      }
      const proxy = el.parentElement || el;
      if (!images.has(proxy)) images.set(proxy, []);
      images.get(proxy).push(el);
    });

    watch(others, reveal, options);
    watch(Array.from(images.keys()), (proxy) => images.get(proxy).forEach(reveal), options);

    bindSafetyNet();
  }

  /* Rede de segurança: se por qualquer motivo um elemento já passou
     pela tela e continua escondido, ele aparece quando a rolagem para.
     Conteúdo nunca pode depender de uma animação para existir. */
  function bindSafetyNet() {
    let timer = 0;

    const check = () => {
      const pending = document.querySelectorAll('[data-reveal]:not(.is-revealed)');
      if (!pending.length) {
        /* Tudo já apareceu: a rede não tem mais o que fazer. */
        window.removeEventListener('scroll', onScroll);
        return;
      }

      const limit = window.innerHeight;
      pending.forEach((el) => {
        const target = el.dataset.reveal === 'image' ? el.parentElement || el : el;
        if (target.getBoundingClientRect().top < limit) reveal(el);
      });
    };

    function onScroll() {
      clearTimeout(timer);
      timer = setTimeout(check, 400);
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    /* Quem abre a página direto numa âncora (index.html#sobre) já cai
       no meio dela, sem rolar: a verificação roda uma vez de saída. */
    setTimeout(check, 1200);
  }

  /* --- 3. Escalonamento -------------------------------------------
     Um bloco anuncia o intervalo; os filhos herdam o atraso. Isso
     mantém o ritmo igual em listas de tamanhos diferentes. */

  function bindStagger() {
    const groups = Array.from(document.querySelectorAll('[data-stagger]'));

    groups.forEach((group) => {
      const gap = Number(group.dataset.stagger) || 100;
      const children = Array.from(group.querySelectorAll('[data-reveal]'));
      children.forEach((child, index) => {
        child.style.setProperty('--reveal-delay', `${index * gap}ms`);
      });
    });
  }

  /* --- 4. O fio ---------------------------------------------------
     Mede o próprio traço para que o dasharray acompanhe qualquer
     tamanho de tela sem números mágicos no CSS. */

  function bindThreads() {
    const paths = Array.from(document.querySelectorAll('[data-draw]'));
    if (!paths.length) return;

    const measure = (path) => {
      let length = 0;
      try {
        length = path.getTotalLength();
      } catch {
        length = 0;
      }
      if (!length) return false;
      path.style.setProperty('--draw-length', Math.ceil(length));
      return true;
    };

    const ready = paths.filter(measure);

    watch(ready, (path) => path.classList.add('is-drawn'), {
      threshold: 0,
      rootMargin: '0px 0px -20% 0px'
    });

    /* Ao redimensionar, o traço muda de comprimento. Só recalculamos
       os que ainda não foram desenhados, para não reiniciar animação
       na cara do usuário. */
    let resizeFrame = 0;
    window.addEventListener(
      'resize',
      () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          paths.forEach((path) => {
            if (!path.classList.contains('is-drawn')) measure(path);
          });
        });
      },
      { passive: true }
    );
  }

  /* --- Início ------------------------------------------------------ */

  function start() {
    const heroSteps = playHero();
    bindStagger();
    bindReveals(heroSteps);
    bindThreads();
    markReady();
  }

  /* Esperamos as fontes para não animar sobre um layout que ainda vai
     mudar. O timeout é a rede de segurança: se a fonte demorar ou
     falhar, o movimento começa mesmo assim. */
  function boot() {
    let started = false;
    const once = () => {
      if (started) return;
      started = true;
      start();
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(once).catch(once);
      setTimeout(once, 900);
    } else {
      once();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
