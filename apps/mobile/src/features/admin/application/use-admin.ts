import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Role } from '@/features/auth/domain/entities';
import { adminRepository, type AdminRepository } from '@/features/admin/data/admin-repository';

export const adminKeys = {
  overview: ['admin', 'overview'] as const,
  usage: (days: number) => ['admin', 'usage', days] as const,
  users: (query: string) => ['admin', 'users', query] as const,
  audit: ['admin', 'audit'] as const,
};

export function useOverview(repository: AdminRepository = adminRepository) {
  const query = useQuery({
    queryKey: adminKeys.overview,
    queryFn: () => repository.overview(),
    // A 403 for a non-admin would fail identically forever.
    retry: false,
  });

  return { overview: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

export function useUsage(days = 30, repository: AdminRepository = adminRepository) {
  const query = useQuery({
    queryKey: adminKeys.usage(days),
    queryFn: () => repository.usage(days),
    retry: false,
  });

  return { report: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

export function useManagedUsers(
  query = '',
  offset = 0,
  repository: AdminRepository = adminRepository,
) {
  const result = useQuery({
    queryKey: [...adminKeys.users(query), offset],
    queryFn: () => repository.users(query, offset),
    retry: false,
  });

  return {
    users: result.data?.items ?? [],
    // Surfaced so the screen can say what it is not showing. A page that
    // cannot report its total is a page that lies by omission.
    total: result.data?.total ?? 0,
    page: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error,
  };
}

export function useChangeRole(
  query = '',
  repository: AdminRepository = adminRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { userId: string; role: Role }) =>
      repository.changeRole(args.userId, args.role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users(query) });
      void queryClient.invalidateQueries({ queryKey: adminKeys.overview });
      // The change was recorded, so the log is stale too.
      void queryClient.invalidateQueries({ queryKey: adminKeys.audit });
    },
  });
}

export function useAuditLog(offset = 0, repository: AdminRepository = adminRepository) {
  const query = useQuery({
    queryKey: [...adminKeys.audit, offset],
    queryFn: () => repository.audit(offset),
    retry: false,
  });

  return {
    entries: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
