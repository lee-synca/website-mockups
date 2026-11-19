(() => {
  const form = document.querySelector('[data-form]');
  const done = document.querySelector('[data-done]');
  if (!form || !done) return;

  const fieldOf = el => el.closest('.field');
  const setError = (field, msg) => {
    field.classList.toggle('has-error', !!msg);
    const out = field.querySelector('.field__error');
    if (out) out.textContent = msg || '';
  };

  // One check per field. Returns the field element if it fails.
  // data-msg is shown when the field is empty; data-msg-format (if set) when it's filled in wrongly.
  const checkInput = input => {
    const field = fieldOf(input);
    const value = input.type === 'checkbox' ? input.checked : input.value.trim();
    const empty = !value;
    let ok = !empty;
    if (ok && input.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (ok && input.type === 'url') ok = /^https?:\/\/\S+\.\S+/i.test(value);
    const msg = !empty && input.dataset.msgFormat ? input.dataset.msgFormat : (input.dataset.msg || field.dataset.msg);
    setError(field, ok ? '' : msg);
    return ok ? null : field;
  };
  // Chip groups: checkboxes (choose at least one) or radios (choose one).
  const checkGroup = field => {
    const ok = [...field.querySelectorAll('input[type="checkbox"], input[type="radio"]')].some(c => c.checked);
    setError(field, ok ? '' : field.dataset.msg);
    return ok ? null : field;
  };

  const required = [...form.querySelectorAll('[required]')];
  const groups = [...form.querySelectorAll('[data-group]')];

  // Clear an error as soon as the person fixes it.
  required.forEach(input => {
    const evt = input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(evt, () => { if (fieldOf(input).classList.contains('has-error')) checkInput(input); });
    input.addEventListener('blur', () => { if (input.type !== 'checkbox' && input.value.trim()) checkInput(input); });
  });
  groups.forEach(g => g.addEventListener('change', () => { if (g.classList.contains('has-error')) checkGroup(g); }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const failed = [...required.map(checkInput), ...groups.map(checkGroup)].filter(Boolean);
    if (failed.length) {
      // Send them to the first problem, in page order.
      failed.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
      const target = failed[0].querySelector('input, select, textarea');
      if (target) target.focus({ preventScroll: true });
      failed[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // NOT CONNECTED YET: this is where the application gets sent to the CRM.
    // Field names: artist, name, email, phone, region, genre,
    //   link, spotify, youtube, instagram, tiktok,
    //   stage, tracks, distributor, rights,
    //   help (several values), start,
    //   goals, notes, heard, consent
    // const fd = new FormData(form);
    // const data = Object.fromEntries(fd);
    // data.help = fd.getAll('help');
    // await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

    form.hidden = true;
    done.hidden = false;
    done.focus({ preventScroll: true });
    done.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();
