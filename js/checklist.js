/* ================================================================
   checklist.js — as marcações viajam junto com a mensagem

   As listas "pode ajudar quando" são caixas de seleção de verdade e já
   funcionam sem JS: o CSS conta as marcadas e mostra o resultado. Com
   JS, além disso:

     - os links do WhatsApp da mesma seção marcados com
       data-checklist-link passam a levar, na mensagem, os itens
       marcados. A pessoa vê o texto pronto no WhatsApp e pode editar
       ou apagar qualquer coisa antes de enviar;
     - o total vira texto de verdade e é anunciado a leitores de tela;
     - o resultado aparece e some também em navegadores sem :has().

   Nada é guardado: as marcações vivem só na página aberta. É um
   assunto íntimo — não vai para armazenamento, cookie nem análise.

   No HTML:
     .checklist                 o grupo (data-checklist-lead = frase
                                que abre a lista na mensagem)
     a[data-checklist-link]     links do WhatsApp que recebem a lista,
                                em qualquer lugar da mesma <section>
   ================================================================ */

(() => {
  'use strict';

  const DEFAULT_LEAD = 'Me identifiquei com:';

  const clean = (text) => text.replace(/\s+/g, ' ').trim();
  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  /* Lê o link do WhatsApp como foi escrito no HTML: o número fica no
     caminho e a saudação no parâmetro text. É dessa saudação que a
     mensagem parte, então cada link mantém o próprio começo. */
  function readLink(link) {
    try {
      const url = new URL(link.href);
      return {
        link,
        original: link.href,
        base: `${url.origin}${url.pathname}`,
        intro: url.searchParams.get('text') || ''
      };
    } catch {
      return null;
    }
  }

  /* encodeURIComponent, e não URLSearchParams: este codifica espaço
     como "+", que o WhatsApp mostra literalmente na mensagem. */
  function buildHref(entry, lead, items) {
    if (!items.length) return entry.original;

    const lines = items.map((item) => `• ${capitalize(item)}`);
    const message = [entry.intro, '', lead, ...lines].join('\n').trim();
    return `${entry.base}?text=${encodeURIComponent(message)}`;
  }

  function setup(group) {
    const boxes = Array.from(group.querySelectorAll('input[type="checkbox"]'));
    if (!boxes.length) return;

    const scope = group.closest('section') || group;
    const links = Array.from(scope.querySelectorAll('a[data-checklist-link]'))
      .map(readLink)
      .filter(Boolean);
    const lead = group.dataset.checklistLead || DEFAULT_LEAD;
    const count = group.querySelector('.checklist__count');
    const result = group.querySelector('.checklist__result');

    /* Região viva fora do resultado: o resultado começa escondido, e
       uma região que acabou de aparecer nem sempre é anunciada. */
    const status = document.createElement('p');
    status.className = 'visually-hidden';
    status.setAttribute('aria-live', 'polite');
    group.append(status);

    const labelOf = (box) => {
      const item = box.closest('.checklist__item');
      const text = item?.querySelector('.checklist__text') || item || box.parentElement;
      return clean(text?.textContent || '');
    };

    function update({ announce }) {
      const marked = boxes.filter((box) => box.checked).map(labelOf).filter(Boolean);

      if (count) count.textContent = String(marked.length);
      if (result) result.hidden = marked.length === 0;

      links.forEach((entry) => {
        entry.link.href = buildHref(entry, lead, marked);
      });

      if (announce) {
        status.textContent = marked.length
          ? `${marked.length} de ${boxes.length} marcados. A mensagem do WhatsApp já inclui suas marcações.`
          : 'Nenhum item marcado.';
      }
    }

    group.addEventListener('change', (event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') {
        update({ announce: true });
      }
    });

    /* Ao voltar para a página pelo histórico, o navegador pode
       restaurar caixas marcadas: os links precisam acompanhar. */
    window.addEventListener('pageshow', () => update({ announce: false }));

    update({ announce: false });
  }

  function boot() {
    document.querySelectorAll('.checklist').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
