import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  forumRepository,
  type CommunityCourse,
  type CommunityMember,
  type ForumRepository,
} from '@/features/forum/data/forum-repository';

export const forumKeys = {
  community: ['forum', 'community'] as const,
  member: (id: string) => ['forum', 'community', 'member', id] as const,
  threads: (slug: string, moduleId?: string, cohortId?: string) =>
    ['forum', 'threads', slug, moduleId ?? null, cohortId ?? null] as const,
  thread: (slug: string, id: string) => ['forum', 'thread', slug, id] as const,
};

export function useCommunity(repository: ForumRepository = forumRepository) {
  const query = useQuery({ queryKey: forumKeys.community, queryFn: () => repository.community(), retry: false });
  return { courses: (query.data ?? []) as CommunityCourse[], isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function useCommunityMember(
  id: string,
  repository: ForumRepository = forumRepository,
) {
  const query = useQuery({ queryKey: forumKeys.member(id), queryFn: () => repository.member(id), enabled: Boolean(id), retry: false });
  return {
    member: (query.data ?? null) as CommunityMember | null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useThreads(
  slug: string,
  moduleId: string,
  cohortId?: string,
  repository: ForumRepository = forumRepository,
) {
  const query = useQuery({
    queryKey: forumKeys.threads(slug, moduleId, cohortId),
    queryFn: () => repository.threads(slug, moduleId, cohortId),
    enabled: Boolean(slug && moduleId),
    // "Not enrolled" answers 403 and would fail identically forever.
    retry: false,
  });

  return {
    threads: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useThread(
  slug: string,
  threadId: string,
  cohortId?: string,
  repository: ForumRepository = forumRepository,
) {
  const query = useQuery({
    queryKey: [...forumKeys.thread(slug, threadId), cohortId ?? null],
    queryFn: () => repository.thread(slug, threadId, cohortId),
    enabled: Boolean(slug && threadId),
    retry: false,
  });

  return {
    thread: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useOpenThread(
  slug: string,
  repository: ForumRepository = forumRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { title: string; body: string; moduleId: string; cohortId: string | null }) =>
      repository.openThread(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['forum', 'threads', slug] });
    },
  });
}

export function useReply(
  slug: string,
  threadId: string,
  cohortId?: string,
  repository: ForumRepository = forumRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => repository.reply(slug, threadId, body, cohortId),
    onSuccess: () => {
      // Both change: the thread gains a reply, and the listing reorders because
      // this thread just became the most recently active.
      void queryClient.invalidateQueries({ queryKey: ['forum', 'thread', slug, threadId] });
      void queryClient.invalidateQueries({ queryKey: ['forum', 'community', 'member'] });
      void queryClient.invalidateQueries({ queryKey: ['forum', 'threads', slug] });
    },
  });
}

/**
 * Hide a thread or a reply.
 *
 * Both listing and detail are invalidated: a thread hidden from the detail view
 * must not still read as visible in the list behind it.
 */
export function useModerate(slug: string, repository: ForumRepository = forumRepository) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { kind: 'thread' | 'post'; id: string; reason: string }) =>
      input.kind === 'thread'
        ? repository.hideThread(input.id, input.reason)
        : repository.hidePost(input.id, input.reason),
    onSuccess: (_result, input) => {
      // Both views, and only this course's. A thread hidden from the detail
      // must not still read as visible in the list behind it.
      void queryClient.invalidateQueries({ queryKey: ['forum', 'threads', slug] });
      if (input.kind === 'thread') {
        void queryClient.invalidateQueries({ queryKey: forumKeys.thread(slug, input.id) });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['forum', 'thread', slug] });
      }
      void queryClient.invalidateQueries({ queryKey: forumKeys.community });
      void queryClient.invalidateQueries({ queryKey: ['forum', 'community', 'member'] });
    },
  });
}
