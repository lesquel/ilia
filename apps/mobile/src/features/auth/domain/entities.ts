/**
 * Auth domain. Plain TypeScript — no React, no fetch, no Expo.
 *
 * This file is byte-for-byte identical on iOS, Android and web. That is the
 * whole promise of the architecture: everything that differs between platforms
 * is pushed out to `data` and `presentation`.
 */

export const ROLES = ['student', 'instructor', 'admin'] as const;

export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = {
  student: 0,
  instructor: 1,
  admin: 2,
};

/**
 * Permissions accumulate upward (PRD 5.4).
 *
 * Convenience only: the UI uses this to hide what the user cannot do. **Every
 * real check happens in the backend**, because an APK can be unzipped and
 * patched (TRD 9).
 */
export function canActAs(role: Role, required: Role): boolean {
  return RANK[role] >= RANK[required];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  fullName: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/**
 * A session as the app sees it.
 *
 * `tokens` is absent on web on purpose: there the session lives in an httpOnly
 * cookie the JavaScript cannot read, and modelling it as optional keeps that
 * fact visible in the type system instead of buried in a comment.
 */
export interface Session {
  user: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

/** Where to land after signing in. */
export const DEFAULT_DESTINATION = '/catalog';

/**
 * Sanitise the `next` parameter carried to the login screen.
 *
 * Only an internal path is ever accepted. Redirecting to whatever arrives in a
 * query string is an open redirect: a link like
 * `…/login?next=https://not-ilia.example` would take a teacher who typed their
 * password on our page straight to someone else's, and the URL they checked
 * before typing it was ours.
 *
 * Rejected: absolute URLs, protocol-relative `//host` (a browser reads that as
 * a different host), anything not starting with `/`, and the auth screens
 * themselves — bouncing someone back to the login form after logging in is a
 * loop, not a destination.
 */
export function safeDestination(next: string | undefined | null): string {
  if (!next) return DEFAULT_DESTINATION;

  const path = next.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return DEFAULT_DESTINATION;
  if (path.startsWith('/login') || path.startsWith('/register')) return DEFAULT_DESTINATION;

  return path;
}
