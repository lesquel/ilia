import { HttpClient, httpClient } from '@/core/api/http-client';
import type {
  Credentials,
  PasswordChange,
  PasswordResetConfirm,
  PasswordResetRequest,
  ProfileUpdate,
  Registration,
  Session,
  User,
} from '@/features/auth/domain/entities';
import type { AuthRepository, TokenStore } from '@/features/auth/domain/repository';

import { type SessionDto, type UserDto, toSession, toUser } from './dto';
import { readRefreshToken, tokenStore as defaultTokenStore } from './token-store';

/**
 * HTTP implementation of the auth repository.
 *
 * Note what is *not* here: any branch on platform. The client sends
 * `X-Client-Platform`, the backend answers with a cookie or with tokens, and
 * `TokenStore` — resolved per platform by file extension — either persists them
 * or does nothing. The flow reads the same on all three targets.
 */
export class HttpAuthRepository implements AuthRepository {
  constructor(
    private readonly http: HttpClient = httpClient,
    private readonly tokens: TokenStore = defaultTokenStore,
  ) {}

  async register(input: Registration): Promise<Session> {
    return this.persist(
      await this.http.post<SessionDto>('/auth/register', {
        email: input.email,
        full_name: input.fullName,
        password: input.password,
      }),
    );
  }

  async login(credentials: Credentials): Promise<Session> {
    return this.persist(await this.http.post<SessionDto>('/auth/login', credentials));
  }

  async refresh(): Promise<Session> {
    // Native sends the stored refresh token; on web this is null and the
    // scoped cookie carries it instead.
    const refreshToken = await readRefreshToken();

    return this.persist(
      await this.http.post<SessionDto>(
        '/auth/refresh',
        refreshToken ? { refresh_token: refreshToken } : {},
      ),
    );
  }

  async logout(): Promise<void> {
    try {
      await this.http.post<void>('/auth/logout');
    } finally {
      // Drop the local credentials even if the request failed. A logout that
      // leaves a usable token behind on a shared staffroom computer is worse
      // than one that fails loudly.
      await this.tokens.clear();
    }
  }

  async changePassword(input: PasswordChange): Promise<void> {
    await this.http.post<void>('/auth/password', {
      current_password: input.currentPassword,
      new_password: input.newPassword,
    });
  }

  async requestPasswordReset(input: PasswordResetRequest): Promise<void> {
    await this.http.post<void>('/auth/password-reset/request', { email: input.email });
  }

  async confirmPasswordReset(input: PasswordResetConfirm): Promise<Session> {
    return this.persist(
      await this.http.post<SessionDto>('/auth/password-reset/confirm', {
        reset_token: input.resetToken,
        new_password: input.newPassword,
      }),
    );
  }

  async currentUser(): Promise<User> {
    return toUser(await this.http.get<UserDto>('/auth/me'));
  }

  async updateProfile(input: ProfileUpdate): Promise<User> {
    return toUser(
      await this.http.request<UserDto>('/auth/me', {
        method: 'PATCH',
        body: { full_name: input.fullName },
      }),
    );
  }

  private async persist(dto: SessionDto): Promise<Session> {
    const session = toSession(dto);

    if (session.tokens) {
      await this.tokens.save(session.tokens);
    }

    return session;
  }
}

export const authRepository = new HttpAuthRepository();
