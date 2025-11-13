// Script responsável por adicionar a lógica de envio ao formulário de contato.
const form = document.querySelector('#form-contato');

if (form) {
  const feedback = form.parentElement?.querySelector('.form-feedback');
  const submitButton = form.querySelector('button[type="submit"]');

  // Exibe mensagens amigáveis no alerta ou na div de feedback.
  const showFeedback = (message, type = 'error') => {
    if (feedback) {
      feedback.textContent = message;
      feedback.classList.add('is-visible');
      feedback.classList.toggle('is-error', type === 'error');
      feedback.classList.toggle('is-success', type === 'success');
    } else {
      window.alert(message);
    }
  };

  // Remove mensagens anteriores para evitar acúmulo de avisos.
  const clearFeedback = () => {
    if (!feedback) return;
    feedback.textContent = '';
    feedback.classList.remove('is-visible', 'is-error', 'is-success');
  };

  // Fornece feedback visual enquanto a URL é preparada.
  const setLoadingState = (isLoading) => {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.setAttribute('aria-busy', String(isLoading));
    submitButton.textContent = isLoading ? 'Preparando mensagem…' : 'Enviar mensagem';
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    clearFeedback();

    const nome = form.querySelector('#nome')?.value.trim() ?? '';
    const email = form.querySelector('#email')?.value.trim() ?? '';
    const mensagem = form.querySelector('#mensagem')?.value.trim() ?? '';

    if (!nome || !email || !mensagem) {
      showFeedback('Por favor, preencha nome, e-mail e mensagem antes de enviar.');
      return;
    }

    setLoadingState(true);

    // Monta o corpo do e-mail com quebra de linha e codifica os valores.
    const subject = encodeURIComponent(`Nova mensagem de ${nome}`);
    const body = encodeURIComponent(`Nome: ${nome}\nEmail: ${email}\nMensagem: ${mensagem}`);
    const gmailUrl =
      'https://mail.google.com/mail/?view=cm&fs=1' +
      '&to=lucianopimenta.psi@gmail.com' +
      `&su=${subject}` +
      `&body=${body}`;

    window.setTimeout(() => {
      setLoadingState(false);
      showFeedback('Abrindo Gmail em uma nova aba…', 'success');
      window.open(gmailUrl, '_blank', 'noopener');
      form.reset();
    }, 300);
  };

  form.addEventListener('submit', handleSubmit);
}