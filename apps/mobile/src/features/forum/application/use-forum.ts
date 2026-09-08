import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { forumRepository, type ForumRepository } from '@/features/forum/data/forum-repository';

export const forumKeys = {
  threads: (slug: string) => ['forum', 'threads', slug] as const,
  thread: (slug: string, id: string) => ['forum', 'thread', slug, id] as const,
};

export function useThreads(slug: string, repository: ForumRepository = forumRepository) {
  const query = useQuery({
    queryKey: forumKeys.threads(slug),
    queryFn: () => repository.threads(slug),
    enabled: Boolean(slug),
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
  repository: ForumRepository = forumRepository,
) {
  const query = useQuery({
    queryKey: forumKeys.thread(slug, threadId),
    queryFn: () => repository.thread(slug, threadId),
    enabled: Boolean(slug && threadId),
    retry: false,
  });

  return {
    thread: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useOpenThread(slug: string, repository: ForumRepository = forumRepository) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { title: string; body: string }) => repository.openThread(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: forumKeys.threads(slug) });
    },
  });
}

export function useReply(
  slug: string,
  threadId: string,
  repository: ForumRepository = forumRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => repository.reply(slug, threadId, body),
    onSuccess: () => {
      // Both change: the thread gains a reply, and the listing reorders because
      // this thread just became the most recently active.
      void queryClient.invalidateQueries({ queryKey: forumKeys.thread(slug, threadId) });
      void queryClient.invalidateQueries({ queryKey: forumKeys.threads(slug) });
    },
  });
}
