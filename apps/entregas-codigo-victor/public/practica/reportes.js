(() => {
  const panel = document.getElementById('reportes-panel');
  if (!panel) return;
  const lista = document.getElementById('reportes-lista');
  const mensaje = document.getElementById('reportes-mensaje');
  const generar = document.getElementById('generar-reporte');
  const actualizar = document.getElementById('actualizar-reportes');
  let consultando = false;
  let ocupado = false;

  function elemento(tag, texto, clase) {
    const node = document.createElement(tag);
    if (texto !== undefined) node.textContent = texto;
    if (clase) node.className = clase;
    return node;
  }
  function avisar(texto, error = false) {
    mensaje.textContent = texto;
    mensaje.className = error ? 'error' : 'hint';
  }
  function fecha(valor) {
    return valor ? new Date(valor).toLocaleString('es-EC') : '—';
  }
  function dibujar(reportes) {
    const nodos = reportes.map((r) => {
      const li = elemento('li', undefined, 'report-item');
      const row = elemento('div', undefined, 'row');
      const info = elemento('div');
      const estado = ['pending', 'processing', 'completed', 'failed'].includes(r.status) ? r.status : 'failed';
      info.append(elemento('span', r.status_label, `report-badge report-badge-${estado}`));
      info.append(elemento('p', `${fecha(r.created_at)} · ${r.mode === 'async' ? 'En segundo plano' : 'Durante la solicitud'}`, 'report-description'));
      if (r.status === 'completed') {
        info.append(elemento('p', `${r.row_count} entregas incluidas. Finalizado: ${fecha(r.completed_at)}.`, 'report-description'));
      } else if (r.status === 'pending') {
        info.append(elemento('p', 'Esperando procesamiento. El estado se actualizará automáticamente.', 'report-description'));
      } else if (r.status === 'failed') {
        info.append(elemento('p', r.error_message || 'No se pudo completar el reporte.', 'error'));
      }
      row.append(info);
      if (r.download_url && r.status === 'completed') {
        const url = new URL(r.download_url, window.location.href);
        if (url.origin === window.location.origin) {
          const link = elemento('a', 'Descargar CSV', 'secondary');
          link.href = url.href;
          row.append(link);
        }
      }
      li.append(row);
      const details = elemento('details', undefined, 'report-trace');
      details.append(elemento('summary', 'Seguimiento del reporte'));
      const dl = elemento('dl');
      for (const [nombre, valor] of [
        ['Reporte', r.id], ['Correlation ID', r.correlation_id], ['Mensaje', r.message_id], ['Intentos', r.attempts],
      ]) {
        dl.append(elemento('dt', nombre), elemento('dd', String(valor)));
      }
      details.append(dl);
      li.append(details);
      return li;
    });
    lista.replaceChildren(...(nodos.length ? nodos : [elemento('li', 'Todavía no has solicitado reportes para esta tarea.', 'hint')]));
  }
  async function consultar(manual = false) {
    if (consultando) return;
    consultando = true;
    actualizar.disabled = true;
    try {
      const response = await fetch(panel.dataset.listUrl, {
        credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store',
      });
      if (!response.ok) throw new Error(response.status === 401 ? 'La sesión expiró. Vuelve a iniciar sesión.' : 'No se pudieron consultar los reportes.');
      const body = await response.json();
      dibujar(body.data);
      if (manual && !ocupado) avisar('Estados actualizados.');
    } catch (error) {
      avisar(error.message || 'No se pudo consultar el estado.', true);
    } finally {
      consultando = false;
      actualizar.disabled = false;
    }
  }
  generar.addEventListener('click', async () => {
    if (ocupado) return;
    ocupado = true;
    generar.disabled = true;
    generar.textContent = 'Solicitando…';
    try {
      const response = await fetch(panel.dataset.createUrl, {
        method: 'POST', credentials: 'same-origin',
        headers: {
          Accept: 'application/json', 'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify({ exercise_id: Number(panel.dataset.exerciseId) }),
      });
      const body = await response.json();
      if (!response.ok) {
        const textos = { 401: 'La sesión expiró. Vuelve a iniciar sesión.',
          403: 'No tienes permisos para solicitar este reporte.',
          419: 'La sesión cambió. Recarga la página antes de continuar.',
          429: 'Has solicitado varios reportes. Espera un minuto.' };
        throw new Error(textos[response.status] || body.message || 'No se pudo solicitar el reporte.');
      }
      avisar('Solicitud aceptada. El reporte aparecerá disponible cuando termine de generarse.');
    } catch (error) {
      avisar(error.message || 'No se pudo confirmar la solicitud. Revisa los reportes antes de repetirla.', true);
    } finally {
      ocupado = false;
      generar.disabled = false;
      generar.textContent = 'Generar reporte';
      await consultar();
    }
  });
  actualizar.addEventListener('click', () => consultar(true));
  consultar();
  const timer = window.setInterval(() => { if (!document.hidden) consultar(); }, 4000);
  window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
  window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });
})();
