export const codeModuleUrl = process.env.EXPO_PUBLIC_CODE_MODULE_URL?.replace(/\/+$/, '');

export async function signInToCodeModule(
  url: string,
  credentials: { email: string; password: string },
): Promise<void> {
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
