(() => {
  // ====== BASE SETUP ======
  const form = document.querySelector('#form-contato');
  if (!form) return;

  const feedback = document.querySelector('.form-feedback');
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton?.textContent?.trim() || 'Enviar mensagem';
  const nomeField = form.elements.namedItem('nome');
  const emailField = form.elements.namedItem('email');
  const mensagemField = form.elements.namedItem('mensagem');
  const honeypotField = form.querySelector('#site');
  const timeField = form.querySelector('#t0');
  const STORAGE_KEY = 'contato:v1';
  const FEEDBACK_TIMEOUT = 6000;
  const MESSAGE_MAX = 1000;
  const MIN_SUBMIT_TIME = 3000;
  const defaultEmail = 'lucianopimenta.psi@gmail.com';
  const targetEmail = (form.dataset.to || defaultEmail).trim(); // Opcional via data-to

  let feedbackTimeoutId;
  let isSubmitting = false;

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

  form.setAttribute('novalidate', 'novalidate');
  if (timeField) timeField.value = String(Date.now());

  // ====== UTILITIES ======
  const track = (name, payload = {}) => {
    window.dispatchEvent(new CustomEvent('track', { detail: { name, payload } }));
  };

  const sanitizeSingleLine = (value) =>
    String(value || '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const sanitizeMultiline = (value, max = 4000) => {
    const clean = String(value || '')
      .replace(/[<>]/g, '')
      .replace(/\r/g, '');
    return clean.slice(0, max);
  };

  const hideFeedback = () => {
    if (!feedback) return;
    feedback.textContent = '';
    feedback.classList.remove('is-error', 'is-success', 'is-visible');
  };

  const focusFeedback = () => {
    if (!feedback) return;
    window.requestAnimationFrame(() => feedback.focus());
  };

  const showFeedback = (message, type = 'info') => {
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
    track('contact_feedback', { type, message });
  };

  const openWindowSafely = (url) => {
    try {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      return Boolean(newWindow);
    } catch (error) {
      return false;
    }
  };

  const buildEmailContent = ({ nome, email, mensagem }) => {
    const safeNome = sanitizeSingleLine(nome).slice(0, 120) || 'Contato anônimo';
    const safeEmail = sanitizeSingleLine(email).slice(0, 254);
    const safeMensagem = sanitizeMultiline(mensagem, 4000);
    const subjectText = `Nova mensagem de ${safeNome}`;
    const bodyText = `Nome: ${safeNome}\nEmail: ${safeEmail}\nMensagem:\n${safeMensagem}`.slice(0, 4000);

    return {
      subjectText,
      bodyText,
      subject: encodeURIComponent(subjectText),
      body: encodeURIComponent(bodyText),
    };
  };

  const launchEmailClient = (subject, body) => {
    const gmailUrl =
      'https://mail.google.com/mail/?view=cm&fs=1' +
      `&to=${encodeURIComponent(targetEmail)}` +
      `&su=${subject}` +
      `&body=${body}`;

    if (openWindowSafely(gmailUrl)) return true;

    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${subject}&body=${body}`;
    return openWindowSafely(mailtoUrl);
  };

  const setLoadingState = (isLoading) => {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.setAttribute('aria-busy', String(isLoading));
    submitButton.textContent = isLoading ? 'Preparando mensagem…' : originalButtonText;
  };

  const setFieldError = (field, message) => {
    const input = form.elements.namedItem(field);
    const errorEl = fieldErrors[field];
    if (message) {
      input?.setAttribute('aria-invalid', 'true');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
      }
      return false;
    }
    input?.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
    return true;
  };

  const clearFieldErrors = () => {
    Object.keys(fieldErrors).forEach((field) => setFieldError(field, ''));
  };

  const isOffline = () => navigator.onLine === false;

  const isSpamAttempt = () => {
    const honeypotValue = sanitizeSingleLine(honeypotField?.value || '');
    if (honeypotValue) return true;
    const start = Number(timeField?.value || 0);
    if (!start) return false;
    return Date.now() - start < MIN_SUBMIT_TIME;
  };

  const maybeFallbackWhatsApp = (data) => {
    const whatsNumber = sanitizeSingleLine(form.dataset.whatsapp || '');
    if (!whatsNumber) return;
    const safeMensagem = sanitizeMultiline(
      `Olá, meu nome é ${data.nome}. ${data.mensagem}`,
      1000,
    );
    const whatsappUrl = `https://wa.me/${whatsNumber}?text=${encodeURIComponent(safeMensagem)}`;
    openWindowSafely(whatsappUrl);
  };

  const saveFormData = () => {
    try {
      const payload = {
        nome: nomeField?.value || '',
        email: emailField?.value || '',
        mensagem: mensagemField?.value || '',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // ignore storage errors
    }
  };

  const restoreFormData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      if (nomeField && typeof data.nome === 'string') nomeField.value = data.nome;
      if (emailField && typeof data.email === 'string') emailField.value = data.email;
      if (mensagemField && typeof data.mensagem === 'string') mensagemField.value = data.mensagem;
      updateCounter();
    } catch (error) {
      // ignore parse errors
    }
  };

  const clearSavedData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // ignore
    }
  };

  const updateCounter = () => {
    if (!mensagemField || !mensagemCounter) return;
    const count = mensagemField.value.length;
    mensagemCounter.textContent = `${count}/${MESSAGE_MAX}`;
    if (count > MESSAGE_MAX) {
      mensagemCounter.setAttribute('aria-live', 'assertive');
      mensagemCounter.dataset.status = 'overflow';
    } else {
      mensagemCounter.setAttribute('aria-live', 'polite');
      mensagemCounter.dataset.status = 'ok';
    }
  };

  // ====== CHARACTER COUNTER ======
  let mensagemCounter;
  if (mensagemField) {
    mensagemCounter = document.createElement('div');
    mensagemCounter.id = 'mensagem-counter';
    mensagemCounter.setAttribute('aria-live', 'polite');
    mensagemCounter.textContent = `0/${MESSAGE_MAX}`;
    mensagemField.insertAdjacentElement('afterend', mensagemCounter);
    mensagemField.setAttribute('maxlength', String(MESSAGE_MAX));
    mensagemField.addEventListener('input', updateCounter);
  }

  restoreFormData();

  // ====== EVENTS ======
  form.addEventListener('input', (event) => {
    if (!event.target) return;
    const name = event.target.getAttribute('name');
    if (!name) return;
    if (['nome', 'email', 'mensagem'].includes(name)) {
      saveFormData();
    }
  });

  form.addEventListener('contato:feedback', (event) => {
    const detail = event.detail || {};
    if (!detail.message) return;
    showFeedback(detail.message, detail.type || 'info');
  });

  window.addEventListener('offline', () => {
    showFeedback('Você está offline. Verifique sua conexão antes de enviar.', 'error');
  });

  window.addEventListener('online', () => {
    hideFeedback();
  });

  const validate = ({ nome, email, mensagem }) => {
    let isValid = true;
    let firstInvalidField = null;

    const checkNome = sanitizeSingleLine(nome);
    if (!checkNome) {
      if (!firstInvalidField) firstInvalidField = nomeField;
      setFieldError('nome', 'Informe seu nome completo.');
      isValid = false;
    } else {
      setFieldError('nome', '');
    }

    const checkEmail = sanitizeSingleLine(email);
    if (!checkEmail) {
      if (!firstInvalidField) firstInvalidField = emailField;
      setFieldError('email', 'Informe um e-mail válido.');
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(checkEmail)) {
      if (!firstInvalidField) firstInvalidField = emailField;
      setFieldError('email', 'Formato de e-mail inválido.');
      isValid = false;
    } else {
      setFieldError('email', '');
    }

    if (!mensagem) {
      if (!firstInvalidField) firstInvalidField = mensagemField;
      setFieldError('mensagem', 'Escreva uma mensagem antes de enviar.');
      isValid = false;
    } else if (mensagem.length > MESSAGE_MAX) {
      if (!firstInvalidField) firstInvalidField = mensagemField;
      setFieldError('mensagem', `Reduza sua mensagem para até ${MESSAGE_MAX} caracteres.`);
      isValid = false;
    } else {
      setFieldError('mensagem', '');
    }

    if (!isValid && firstInvalidField instanceof HTMLElement) {
      firstInvalidField.focus();
    }

    return isValid;
  };

  const attemptSend = (data) => {
    const { subject, body } = buildEmailContent(data);
    return launchEmailClient(subject, body);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    hideFeedback();
    clearFieldErrors();

    if (isOffline()) {
      showFeedback('Sem conexão com a internet. Tente novamente quando estiver online.', 'error');
      return;
    }

    if (isSpamAttempt()) {
      showFeedback('Não foi possível enviar. Atualize a página e tente novamente.', 'error');
      return;
    }

    const formData = new FormData(form);
    const data = {
      nome: String(formData.get('nome') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      mensagem: String(formData.get('mensagem') || '').trim(),
    };

    if (!validate(data)) {
      showFeedback('Por favor, corrija os campos destacados antes de enviar.', 'error');
      return;
    }

    isSubmitting = true;
    setLoadingState(true);
    track('contact_submit_attempt', { formId: 'form-contato' });

    let emailOpened = false;

    try {
      emailOpened = attemptSend(data);
    } finally {
      setLoadingState(false);
      isSubmitting = false;
    }

    if (emailOpened) {
      form.reset();
      timeField && (timeField.value = String(Date.now()));
      clearSavedData();
      updateCounter();
      showFeedback(
        'Abrindo seu cliente de e-mail. Caso não veja a nova aba, verifique o bloqueio de pop-ups.',
        'success',
      );
      track('contact_submit_success', { formId: 'form-contato' });
      form.dispatchEvent(new CustomEvent('contato:success'));
    } else {
      showFeedback('Não foi possível abrir seu cliente de e-mail.', 'error');
      const detail = { data };
      form.dispatchEvent(new CustomEvent('contato:emailfail', { detail }));
    }
  });

  form.addEventListener('contato:emailfail', (event) => {
    const detail = event.detail || {};
    maybeFallbackWhatsApp(detail.data || {});
  });
})();

/* ====== TESTE MANUAL SUGERIDO ======
1. Validação: envie vazio/incorreto e confirme foco no primeiro campo inválido e feedback.
2. Offline: use DevTools para simular offline e tente enviar; envio deve ser bloqueado.
3. Anti-spam: preencha o campo oculto #site ou envie antes de 3s; envio deve ser negado.
4. Gmail/mailto bloqueado: bloqueie pop-up, tente enviar e observe feedback e evento contato:emailfail.
5. Fallback WhatsApp: configure data-whatsapp no <form> e verifique abertura do link após falha de e-mail.
6. Auto-save: digite dados, recarregue a página e confirme restauração; após sucesso, dados devem sumir.
7. Analytics: execute window.addEventListener('track', console.log) e observe eventos contact_*.
*/