/**
 * Public entry point of the auth feature.
 *
 * Other features import from here and never from inside `domain`, `data` or
 * `presentation`. That is what keeps a refactor inside this folder from
 * rippling through the app.
 */

export { canActAs } from './domain/entities';
export type { Credentials, Registration, Role, Session, User } from './domain/entities';
export { useLogin, useLogout, useRegister, useSession, authKeys } from './application/use-auth';
export { installAuthTokenProvider } from './data/install';
export { AccountBar } from './presentation/account-bar';
export { RegisterScreen } from './presentation/register-screen';
export { GuestOnly } from './presentation/guest-only';
