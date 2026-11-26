(() => {
  const dialog = document.querySelector('[data-task-dialog]');
  if (!dialog) return;
  const opener = document.querySelector('[data-open-task]');
  const select = dialog.querySelector('[data-courses-url]');
  const button = dialog.querySelector('[data-create-task]');
  const message = dialog.querySelector('[data-courses-message]');
  let loading = false;
  const courses = async () => {
    if (!select || loading) return;
    loading = true;
    button.disabled = true;
    try {
      const response = await fetch(select.dataset.coursesUrl, {
        credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('No pudimos cargar los cursos. Comprueba tu sesión y la disponibilidad de ILIA.');
      const body = await response.json();
      if (!Array.isArray(body.courses)) throw new Error('ILIA devolvió una lista de cursos inválida.');
      select.replaceChildren(new Option('Selecciona un curso', ''));
      for (const course of body.courses) select.add(new Option(course.title, course.id));
      select.value = select.dataset.selected || '';
      message.textContent = body.courses.length ? '' : 'No hay cursos disponibles para tu cuenta. Gestiona tus cursos en ILIA y vuelve a abrir el formulario.';
      button.disabled = body.courses.length === 0;
    } catch (error) {
      select.replaceChildren(new Option('Cursos no disponibles', ''));
      message.textContent = error instanceof Error && error.name !== 'TypeError' ? error.message : 'No pudimos conectar con ILIA.';
    } finally { loading = false; }
  };
  const open = () => { dialog.showModal(); void courses(); };
  opener?.addEventListener('click', open);
  dialog.querySelectorAll('[data-close-task]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => opener?.focus());
  dialog.querySelector('form').addEventListener('submit', () => { button.disabled = true; });
  if (dialog.hasAttribute('data-reopen')) open();
})();
