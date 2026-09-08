import type { Role, Session, User } from '@/features/auth/domain/entities';
import { ROLES } from '@/features/auth/domain/entities';

/**
 * The wire format, exactly as the API sends it (snake_case included).
 *
 * These types stay in `data`. A screen never sees them: `toSession` converts
 * them into domain entities first, so a rename on the backend touches this file
 * and nothing else.
 */

export interface UserDto {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface SessionDto {
  user: UserDto;
  access_token: string | null;
  refresh_token: string | null;
  expires_in: number | null;
}

function toRole(value: string): Role {
  // An unknown role is treated as the least privileged one rather than trusted
  // or thrown away. A new backend role must never accidentally unlock UI.
  return (ROLES as readonly string[]).includes(value) ? (value as Role) : 'student';
}

export function toUser(dto: UserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    fullName: dto.full_name,
    role: toRole(dto.role),
  };
}

export function toSession(dto: SessionDto): Session {
  const user = toUser(dto.user);

  if (!dto.access_token || !dto.refresh_token) {
    // Web: the tokens are in an httpOnly cookie and the body carries none.
    return { user };
  }

  return {
    user,
    tokens: {
      accessToken: dto.access_token,
      refreshToken: dto.refresh_token,
      expiresIn: dto.expires_in ?? 0,
    },
  };
}
