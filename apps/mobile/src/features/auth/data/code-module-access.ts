import { httpClient } from '@/core/api/http-client';
import { authRepository } from '@/features/auth/data/auth-repository';

export const codeModuleUrl = process.env.EXPO_PUBLIC_CODE_MODULE_URL?.replace(/\/+$/, '');
// Opt-in keeps previous academic setups working with their existing variables.
export const officialCodeModule = process.env.EXPO_PUBLIC_CODE_MODULE_AUTH_MODE === 'ilia';

export async function openOfficialCodeModule(url = codeModuleUrl): Promise<void> {
  if (!url) throw new Error('El módulo de código no está configurado.');
  const target = new URL(url);
  if (target.protocol !== 'https:' && !(target.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(target.hostname))) {
    throw new Error('La dirección del módulo debe usar HTTPS.');
  }
  // Check availability before issuing a handoff. No credentials in URLs or storage.
  const csrf = await fetch(`${url}/acceso/csrf`, {
    credentials: 'include', headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!csrf.ok) throw new Error('El módulo de código no está disponible.');
  const { token } = await csrf.json();
  if (typeof token !== 'string' || !token) throw new Error('No se pudo preparar el acceso.');
  // /me can renew the official cookie via the existing HTTP client if necessary.
  await authRepository.currentUser();
  const handoff = await httpClient.post<{ ticket: string; correlation_id: string }>(
    '/auth/code-module/ticket', {},
  );
  if (typeof handoff.ticket !== 'string' || !handoff.ticket) {
    throw new Error('ILIA no pudo preparar el acceso al módulo.');
  }
  const response = await fetch(`${url}/acceso/ilia`, {
    method: 'POST', credentials: 'include', signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json',
      'X-CSRF-TOKEN': token, 'X-Correlation-ID': handoff.correlation_id },
    body: JSON.stringify({ ticket: handoff.ticket }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(typeof body?.message === 'string' ? body.message : 'No se pudo abrir el módulo.');
  }
  window.location.assign(`${url}/modulo`);
}

export async function signInToCodeModule(
  url: string,
  credentials: { email: string; password: string },
): Promise<void> {
  if (officialCodeModule) {
    await authRepository.login(credentials);
    await openOfficialCodeModule(url);
    return;
  }
  const csrf = await fetch(`${url}/acceso/csrf`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!csrf.ok) throw new Error('El módulo de código no está disponible.');

  const { token } = await csrf.json();
  const response = await fetch(`${url}/acceso/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': token,
    },
    body: JSON.stringify(credentials),
  });

  if (response.status === 422) throw new Error('El correo o la contraseña del módulo son incorrectos.');
  if (response.status === 429) throw new Error('Demasiados intentos. Espera un minuto y vuelve a intentar.');
  if (!response.ok) throw new Error('No se pudo iniciar sesión en el módulo.');

  window.location.assign(`${url}/modulo`);
}
