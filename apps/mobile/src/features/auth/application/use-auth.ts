import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/errors/api-error';
import { clearSessionScopedStorage } from '@/core/storage';
import type {
  Credentials,
  PasswordChange,
  PasswordResetConfirm,
  PasswordResetRequest,
  ProfileUpdate,
  ProfileAvatarKey,
  Registration,
  User,
} from '@/features/auth/domain/entities';
import type { AuthRepository } from '@/features/auth/domain/repository';
import { authRepository } from '@/features/auth/data/auth-repository';
import { dropSessionData } from '@/features/auth/application/session-cache';

/**
 * Application layer: the use cases a screen actually calls.
 *
 * Every hook takes the repository as a parameter defaulting to the real one, so
 * a test or a Storybook story can pass a fake without touching the network.
 */

export const authKeys = {
  session: ['auth', 'session'] as const,
};

/**
 * The current session.
 *
 * `GET /auth/me` is the single source of truth on every platform. On web it is
 * the *only* way to know: the cookie is unreadable from here, so "am I logged
 * in?" is a question only the server can answer.
 */
export function useSession(repository: AuthRepository = authRepository) {
  const query = useQuery<User | null>({
    queryKey: authKeys.session,
    queryFn: async () => {
      try {
        return await repository.currentUser();
      } catch (error) {
        // Not being logged in is a normal state, not a failure to report.
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    // Profile photo URLs expire after two minutes; refresh the identity before
    // their signed URL can remain stale for long in account/forum UI.
    staleTime: 60 * 1000,
  });

  return {
    user: query.data ?? null,
    isAuthenticated: Boolean(query.data),
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useLogin(repository: AuthRepository = authRepository) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: Credentials) => repository.login(credentials),
    onSuccess: (session) => {
      queryClient.setQueryData(authKeys.session, session.user);
    },
  });
}

export function useRegister(repository: AuthRepository = authRepository) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Registration) => repository.register(input),
    onSuccess: (session) => {
      queryClient.setQueryData(authKeys.session, session.user);
    },
  });
}

export function useLogout(repository: AuthRepository = authRepository) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await repository.logout();
      // Device-local data belonging to this session — prompt drafts can carry a
      // teacher's own pupils' names and marks (TRD §11). On a shared staffroom
      // computer it must not outlive the session.
      await clearSessionScopedStorage();
    },
    onSettled: () => {
      // Clear on settle, not on success: if the request failed, the local cache
      // must still stop showing another teacher's data.
      queryClient.setQueryData(authKeys.session, null);
      // Remove, don't invalidate: invalidating refetches every mounted query,
      // so a screen still on display fired one last request and got a 401.
      dropSessionData(queryClient);
    },
  });
}

/**
 * Change your own password.
 *
 * Every other session ends server-side; this one keeps working, because the
 * person doing it is at the keyboard. Nothing is invalidated in the cache: the
 * user did not change, only their credentials did.
 */
export function useChangePassword(repository: AuthRepository = authRepository) {
  return useMutation({
    mutationFn: (input: PasswordChange) => repository.changePassword(input),
  });
}

/**
 * Correct your own name.
 *
 * The answer is the updated user, so it goes straight into the session cache:
 * the header menu reads the same entry and shows the new name without asking
 * the server again.
 */
export function useUpdateProfile(repository: AuthRepository = authRepository) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProfileUpdate) => repository.updateProfile(input),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.session, user);
      void queryClient.invalidateQueries({ queryKey: ['forum'] });
    },
  });
}

export type AvatarUpdate =
  | { kind: 'photo'; file: Blob; contentType: string }
  | { kind: 'illustrated'; key: ProfileAvatarKey }
  | { kind: 'remove' };

export function useUpdateAvatar(repository: AuthRepository = authRepository) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AvatarUpdate) => {
      if (input.kind === 'photo') return repository.uploadAvatar(input.file, input.contentType);
      if (input.kind === 'illustrated') return repository.chooseAvatar(input.key);
      return repository.removeAvatar();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.session, user);
      void queryClient.invalidateQueries({ queryKey: ['forum'] });
    },
  });
}

export function useRequestPasswordReset(repository: AuthRepository = authRepository) {
  return useMutation({
    mutationFn: (input: PasswordResetRequest) => repository.requestPasswordReset(input),
  });
}

export function useConfirmPasswordReset(repository: AuthRepository = authRepository) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PasswordResetConfirm) => repository.confirmPasswordReset(input),
    onSuccess: (session) => {
      queryClient.setQueryData(authKeys.session, session.user);
    },
  });
}
