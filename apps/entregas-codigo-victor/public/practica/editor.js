for (const form of document.querySelectorAll('.editor')) {
    const input = form.elements.code;
    const steps = form.querySelector('[data-steps]');
    const result = form.querySelector('[data-result]');
    const submit = form.querySelector('button[type=submit]');
    const history = [];
    let timer;
    let paste;

    function record(kind, chars = 0) {
        clearTimeout(timer);
        if (kind === 'typing' && input.value === (history.at(-1)?.code ?? '')) return;

        history.push({ kind, code: input.value, pasted_chars: chars });
        const pastes = history.filter((step) => step.kind === 'paste').length;
        steps.textContent = `${history.length} pasos · ${pastes} pegados`;

        if (history.length === 100) {
            input.readOnly = true;
            result.textContent = 'Se alcanzó el límite de 100 pasos. Puedes entregar el código actual.';
        }
    }

    input.addEventListener('paste', (event) => {
        if (input.readOnly) return;
        record('typing');
        if (input.readOnly) {
            event.preventDefault();
            return;
        }
        const start = input.selectionStart;
        const remaining = input.value.length - (input.selectionEnd - start);
        paste = { start, remaining };
        // Si el navegador no inserta el contenido, no queda un pegado pendiente.
        setTimeout(() => { paste = undefined; }, 0);
    });

    input.addEventListener('input', (event) => {
        clearTimeout(timer);
        if (event.inputType === 'insertFromPaste' && paste) {
            const insertedLength = input.value.length - paste.remaining;
            const chars = Array.from(input.value.slice(paste.start, paste.start + insertedLength)).length;
            if (chars > 0) {
                record('paste', chars);
                return;
            }
        }
        timer = setTimeout(() => record('typing'), 650);
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        record('typing');
        const payload = {
            exercise_id: Number(form.dataset.exercise),
            language: form.dataset.language,
            code: input.value,
            history,
            ai_usage: form.elements.ai_usage.value,
        };

        if (!payload.code.trim()) {
            result.textContent = 'Escribe el código antes de entregar.';
            return;
        }

        submit.disabled = true;
        input.readOnly = true;
        form.elements.ai_usage.disabled = true;
        result.classList.remove('error');
        result.textContent = 'Enviando…';

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
                },
                body: JSON.stringify(payload),
            });
            const body = await response.json();
            if (!response.ok) {
                throw new Error(response.status === 419 || response.status === 401
                    ? 'La sesión venció. Copia tu código antes de volver a iniciar sesión.'
                    : Object.values(body.errors ?? {})[0]?.[0] ?? 'No se pudo guardar la entrega.');
            }
            result.textContent = `Entrega #${body.data.submission_id} guardada.`;
        } catch (error) {
            submit.disabled = false;
            input.readOnly = history.length >= 100;
            form.elements.ai_usage.disabled = false;
            result.classList.add('error');
            result.textContent = error instanceof TypeError ? 'No se pudo conectar con el módulo.' : error.message;
        }
    });
}
