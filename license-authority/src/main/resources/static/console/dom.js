// Minimal DOM builder: text is always set through textContent, never parsed as HTML.
export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') element.className = value;
    else if (key === 'text') element.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.assign(element.dataset, value);
    else if (value === true) element.setAttribute(key, '');
    else element.setAttribute(key, String(value));
  }
  append(element, children);
  return element;
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export const clear = (element) => {
  element.replaceChildren();
  return element;
};

/** Replaces the content of `element`; null/false children are skipped and arrays flattened. */
export const fill = (element, ...children) => append(clear(element), children);

/** Appends children with the same rules (never the native append, which prints "null" and "[object …]"). */
export const add = (element, ...children) => append(element, children);

/**
 * Modal dialog built on <dialog>. `onSubmit(formData)` runs on submit; a thrown error is shown in the dialog and
 * keeps it open, returning false keeps it open silently. Resolves with onSubmit's result, or null if cancelled.
 */
export function openDialog({ title, body, submitLabel = 'Enregistrer', danger = false, wide = false, onSubmit }) {
  return new Promise((resolve) => {
    const error = h('p', { class: 'form-error', role: 'alert', hidden: true });
    const form = h('form', { class: 'dialog-form', method: 'dialog' },
      h('h2', { text: title }),
      body,
      error,
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'secondary', text: 'Annuler', onclick: () => dialog.close('cancel') }),
        h('button', { type: 'submit', class: danger ? 'danger' : 'primary', text: submitLabel })));
    const dialog = h('dialog', { class: wide ? 'wide' : '' }, form);
    const setError = (message) => {
      error.textContent = message;
      error.hidden = !message;
    };
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      setError('');
      try {
        const result = onSubmit ? await onSubmit(new FormData(form)) : new FormData(form);
        if (result !== false) {
          dialog.close('done');
          resolve(result ?? true);
        }
      } catch (failure) {
        setError(failure.message || 'Une erreur est survenue.');
      } finally {
        submit.disabled = false;
      }
    });
    dialog.addEventListener('close', () => {
      if (dialog.returnValue !== 'done') resolve(null);
      dialog.remove();
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

export function field(label, input, hint) {
  const id = input.id || `f-${Math.random().toString(36).slice(2, 9)}`;
  input.id = id;
  return h('div', { class: 'field' },
    h('label', { for: id, text: label }),
    input,
    hint ? h('small', { class: 'hint', text: hint }) : null);
}

export const toast = (message, kind = 'success') => {
  const region = document.getElementById('toasts');
  const item = h('div', { class: `toast ${kind}`, role: kind === 'error' ? 'alert' : 'status', text: message });
  region.append(item);
  setTimeout(() => item.remove(), 5000);
};
