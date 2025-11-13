(() => {
  const form = document.querySelector('#form-contato');
  if (!form) return;

  const feedback = document.querySelector('.form-feedback');
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton?.textContent?.trim() || 'Enviar mensagem';
  const FEEDBACK_TIMEOUT = 6000;
  let feedbackTimeoutId;

  const fieldErrors = {
    nome: document.getElementById('erro-nome'),
    email: document.getElementById('erro-email'),
    mensagem: document.getElementById('erro-mensagem'),
  };

  if (feedback) {
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.setAttribute('tabindex', '-1');
  }

  const hideFeedback = () => {
    if (!feedback) return;
    feedback.textContent = '';
    feedback.classList.remove('is-error', 'is-success', 'is-visible');
  };

  const focusFeedback = () => {
    if (!feedback) return;
    window.requestAnimationFrame(() => {
      feedback.focus();
    });
  };

  const showFeedback = (message, type) => {
    if (feedback) {
      window.clearTimeout(feedbackTimeoutId);
      feedback.textContent = message;
      feedback.classList.remove('is-error', 'is-success');
      feedback.classList.add(type === 'success' ? 'is-success' : 'is-error', 'is-visible');
      focusFeedback();
      feedbackTimeoutId = window.setTimeout(hideFeedback, FEEDBACK_TIMEOUT);
    } else {
      window.alert(message);
    }
  };

  const setFieldError = (field, message) => {
    const errorEl = fieldErrors[field];
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = !message;
  };

  const clearFieldErrors = () => {
    Object.keys(fieldErrors).forEach((field) => setFieldError(field, ''));
  };

  const setLoadingState = (isLoading) => {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.setAttribute('aria-busy', String(isLoading));
    submitButton.textContent = isLoading ? 'Preparando mensagem…' : originalButtonText;
  };

  const buildEmailContent = ({ nome, email, mensagem }) => {
    const subjectText = `Nova mensagem de ${nome}`;
    const bodyText = `Nome: ${nome}\nEmail: ${email}\nMensagem: ${mensagem}`;

    return {
      subjectText,
      bodyText,
      subject: encodeURIComponent(subjectText),
      body: encodeURIComponent(bodyText),
    };
  };

  const openWindowSafely = (url) => {
    try {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      return Boolean(newWindow);
    } catch (error) {
      return false;
    }
  };

  const launchEmailClient = (subject, body) => {
    const gmailUrl =
      'https://mail.google.com/mail/?view=cm&fs=1' +
      '&to=lucianopimenta.psi@gmail.com' +
      `&su=${subject}` +
      `&body=${body}`;

    if (openWindowSafely(gmailUrl)) {
      return true;
    }

    const mailtoUrl = `mailto:lucianopimenta.psi@gmail.com?subject=${subject}&body=${body}`;
    return openWindowSafely(mailtoUrl);
  };

  const validate = ({ nome, email, mensagem }) => {
    let isValid = true;

    if (!nome) {
      setFieldError('nome', 'Informe seu nome completo.');
      isValid = false;
    }

    if (!email) {
      setFieldError('email', 'Informe um e-mail válido.');
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError('email', 'Formato de e-mail inválido.');
      isValid = false;
    }

    if (!mensagem) {
      setFieldError('mensagem', 'Escreva uma mensagem antes de enviar.');
      isValid = false;
    }

    return isValid;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hideFeedback();
    clearFieldErrors();

    const formData = new FormData(form);
    const data = {
      nome: String(formData.get('nome') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      mensagem: String(formData.get('mensagem') || '').trim(),
    };

    if (!validate(data)) {
      showFeedback('Por favor, corrija os campos destacados antes de enviar.', 'error');
      const firstInvalidField = form.querySelector('.field-error:not([hidden])')?.previousElementSibling;
      if (firstInvalidField instanceof HTMLElement) {
        firstInvalidField.focus();
      }
      return;
    }

    setLoadingState(true);

    let emailOpened = false;

    try {
      const { subject, body } = buildEmailContent(data);
      emailOpened = launchEmailClient(subject, body);
    } finally {
      setLoadingState(false);
    }

    if (emailOpened) {
      form.reset();
      showFeedback('Abrindo seu cliente de e-mail. Caso não veja a nova aba, verifique o bloqueio de pop-ups.', 'success');
    } else {
      showFeedback('Não foi possível abrir seu cliente de e-mail.', 'error');
    }
  });
})();