import { HttpClient, httpClient } from '@/core/api/http-client';
import type { Post, ThreadDetail, ThreadSummary } from '@/features/forum/domain/entities';
import { type PostDto, type ThreadDetailDto, type ThreadSummaryDto, toPost, toSummary } from './forum-dto';

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
