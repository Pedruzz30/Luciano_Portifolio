const form = document.querySelector('#form-contato');

if (form) {
  const feedback = form.parentElement.querySelector('.form-feedback');
  const submitButton = form.querySelector('button[type="submit"]');

  const fields = {
    nome: {
      input: form.querySelector('#nome'),
      error: form.querySelector('#erro-nome'),
      validators: [
        (value) => (value.trim() ? '' : 'Por favor, informe seu nome completo.'),
      ],
    },
    email: {
      input: form.querySelector('#email'),
      error: form.querySelector('#erro-email'),
      validators: [
        (value) => (value.trim() ? '' : 'O e-mail é obrigatório.'),
        (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Digite um e-mail válido.'),
      ],
    },
    mensagem: {
      input: form.querySelector('#mensagem'),
      error: form.querySelector('#erro-mensagem'),
      validators: [
        (value) => (value.trim() ? '' : 'Conte um pouco sobre o projeto.'),
        (value) => (value.trim().length >= 20 ? '' : 'Descreva em pelo menos 20 caracteres.'),
      ],
    },
  };

  const clearFeedback = () => {
    if (!feedback) return;
    feedback.classList.remove('is-visible', 'is-success', 'is-error');
    feedback.textContent = '';
  };

  const showFeedback = (message, type = 'success') => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.add('is-visible');
    feedback.classList.toggle('is-success', type === 'success');
    feedback.classList.toggle('is-error', type === 'error');
  };

  const setFieldState = (fieldConfig, message = '') => {
    const { input, error } = fieldConfig;
    if (!input || !error) return true;

    if (message) {
      error.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      return false;
    }

    error.textContent = '';
    input.removeAttribute('aria-invalid');
    return true;
  };

  const validateField = (key) => {
    const fieldConfig = fields[key];
    if (!fieldConfig) return true;

    const value = fieldConfig.input.value;
    const message = fieldConfig.validators
      .map((validator) => validator(value))
      .find((result) => result !== '');

    return setFieldState(fieldConfig, message || '');
  };

  const validateForm = () => {
    let isValid = true;
    Object.keys(fields).forEach((key) => {
      const validField = validateField(key);
      if (!validField) {
        isValid = false;
      }
    });
    return isValid;
  };

  const setLoadingState = (isLoading) => {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.setAttribute('aria-busy', String(isLoading));
    submitButton.textContent = isLoading ? 'Enviando…' : 'Enviar mensagem';
  };

  Object.values(fields).forEach(({ input }) => {
    input.addEventListener('input', (event) => {
      const { id } = event.target;
      validateField(id);
      clearFeedback();
    });

    input.addEventListener('blur', (event) => {
      const { id } = event.target;
      validateField(id);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFeedback();

    if (!validateForm()) {
      showFeedback('Por favor, corrija os campos destacados e tente novamente.', 'error');
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) {
        firstInvalid.focus();
      }
      return;
    }

    setLoadingState(true);

    window.setTimeout(() => {
      setLoadingState(false);
      form.reset();
      Object.values(fields).forEach((config) => setFieldState(config));
      showFeedback('Mensagem enviada com sucesso! Retornarei em breve.', 'success');
    }, 1200);
  });
}