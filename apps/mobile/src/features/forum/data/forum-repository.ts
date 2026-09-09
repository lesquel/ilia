import { HttpClient, httpClient } from '@/core/api/http-client';
import type { Post, ThreadDetail, ThreadSummary } from '@/features/forum/domain/entities';

interface ThreadSummaryDto {
  can_moderate?: boolean;
  id: string;
  title: string;
  author_name: string;
  reply_count: number;
  created_at: string | null;
  last_activity_at: string | null;
  is_hidden: boolean;
}

interface PostDto {
  id: string;
  author_name: string;
  body: string;
  created_at: string | null;
  is_hidden: boolean;
}

interface ThreadDetailDto extends ThreadSummaryDto {
  body: string;
  posts: PostDto[];
}

function toSummary(dto: ThreadSummaryDto): ThreadSummary {
  return {
    id: dto.id,
    title: dto.title,
    authorName: dto.author_name,
    replyCount: dto.reply_count,
    createdAt: dto.created_at,
    lastActivityAt: dto.last_activity_at,
    isHidden: dto.is_hidden,
    canModerate: dto.can_moderate ?? false,
  };
}

function toPost(dto: PostDto): Post {
  return {
    id: dto.id,
    authorName: dto.author_name,
    body: dto.body,
    createdAt: dto.created_at,
    isHidden: dto.is_hidden,
  };
}

export interface ForumRepository {
  threads(slug: string): Promise<ThreadSummary[]>;
  thread(slug: string, threadId: string): Promise<ThreadDetail>;
  openThread(slug: string, input: { title: string; body: string }): Promise<ThreadDetail>;
  reply(slug: string, threadId: string, body: string): Promise<Post>;
  hideThread(threadId: string, reason: string): Promise<void>;
  hidePost(postId: string, reason: string): Promise<void>;
}

export class HttpForumRepository implements ForumRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async threads(slug: string): Promise<ThreadSummary[]> {
    const rows = await this.http.get<ThreadSummaryDto[]>(
      `/forum/${encodeURIComponent(slug)}/threads`,
    );
    return rows.map(toSummary);
  }

  async thread(slug: string, threadId: string): Promise<ThreadDetail> {
    const dto = await this.http.get<ThreadDetailDto>(
      `/forum/${encodeURIComponent(slug)}/threads/${encodeURIComponent(threadId)}`,
    );
    return { ...toSummary(dto), body: dto.body, posts: dto.posts.map(toPost) };
  }

  async openThread(
    slug: string,
    input: { title: string; body: string },
  ): Promise<ThreadDetail> {
    const dto = await this.http.post<ThreadDetailDto>(
      `/forum/${encodeURIComponent(slug)}/threads`,
      input,
    );
    return { ...toSummary(dto), body: dto.body, posts: dto.posts.map(toPost) };
  }

  async reply(slug: string, threadId: string, body: string): Promise<Post> {
    return toPost(
      await this.http.post<PostDto>(
        `/forum/${encodeURIComponent(slug)}/threads/${encodeURIComponent(threadId)}/replies`,
        { body },
      ),
    );
  }

  /**
   * Moderation always carries a reason — the API requires one. A message
   * removed without a stated reason is indistinguishable from a message that
   * vanished, and the person who wrote it deserves better than that.
   */
  async hideThread(threadId: string, reason: string): Promise<void> {
    await this.http.post<unknown>(`/forum/threads/${encodeURIComponent(threadId)}/hide`, {
      reason,
    });
  }

  async hidePost(postId: string, reason: string): Promise<void> {
    await this.http.post<unknown>(`/forum/posts/${encodeURIComponent(postId)}/hide`, { reason });
  }
}

export const forumRepository = new HttpForumRepository();
