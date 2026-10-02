/* ================================================================
   fit.js — títulos de abertura que nunca passam da coluna

   A Fraunces tem um eixo de tamanho óptico, e nem todo navegador
   recebe ou aplica esse eixo do mesmo jeito: a mesma frase pode sair
   até 20% mais larga de um navegador para outro. Os títulos de
   abertura não quebram linha (cada linha é uma frase), então uma
   linha larga demais passaria da coluna.

   data-fit="shrink" no título: se a linha mais larga (marcada com
   data-fit-line) passar da largura do título, o corpo diminui até
   caber. Nunca aumenta. Sem JS, vale o tamanho do CSS.
   ================================================================ */

(() => {
  'use strict';

  /* Nunca reduz além disto: se uma medida vier errada (fonte ainda
     carregando, por exemplo), o pior caso é um título um pouco menor,
     nunca um título minúsculo. */
  const MIN_SCALE = 0.7;

  function textWidth(node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect().width;
  }

  function widest(el) {
    const lines = el.querySelectorAll('[data-fit-line]');
    return lines.length ? Math.max(...Array.from(lines, textWidth)) : textWidth(el);
  }

  function fit(el) {
    el.style.fontSize = '';

    const box = el.clientWidth;
    const width = widest(el);
    if (!box || !width || width <= box) return;

    const base = parseFloat(getComputedStyle(el).fontSize);
    if (!base) return;

    /* 0.98: a largura não é exatamente proporcional ao corpo (o tamanho
       óptico redesenha as letras), então sobra uma folga pequena. */
    const scale = Math.max(MIN_SCALE, (box / width) * 0.98);
    el.style.fontSize = `${base * scale}px`;
  }

  function fitAll() {
    document.querySelectorAll('[data-fit="shrink"]').forEach(fit);
  }

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fitAll);
  };

  /* A fonte pode trocar depois do primeiro ajuste, então ele roda de
     novo quando as fontes terminam de carregar. Ajustar de novo é
     barato e idempotente: cada rodada parte do tamanho do CSS. */
  function boot() {
    fitAll();
    window.addEventListener('load', schedule);
    if (document.fonts) {
      document.fonts.ready.then(schedule).catch(() => {});
      document.fonts.addEventListener?.('loadingdone', schedule);
    }
    window.addEventListener('resize', schedule, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
