import { HttpClient, httpClient } from '@/core/api/http-client';
import { isProfileAvatarKey, type ProfileAvatarKey } from '@/features/auth/domain/entities';
import type { Post, ThreadDetail, ThreadSummary } from '@/features/forum/domain/entities';
import { type PostDto, type ThreadDetailDto, type ThreadSummaryDto, toPost, toSummary } from './forum-dto';

export interface ForumRepository {
  threads(slug: string, moduleId: string, cohortId?: string): Promise<ThreadSummary[]>;
  thread(slug: string, threadId: string, cohortId?: string): Promise<ThreadDetail>;
  openThread(slug: string, input: { title: string; body: string; moduleId: string; cohortId: string | null }): Promise<ThreadDetail>;
  reply(slug: string, threadId: string, body: string, cohortId?: string): Promise<Post>;
  hideThread(threadId: string, reason: string): Promise<void>;
  hidePost(postId: string, reason: string): Promise<void>;
  community(): Promise<CommunityCourse[]>;
  member(id: string): Promise<CommunityMember>;
}

export interface CommunityForumSpace { cohortId: string | null; cohortTitle: string | null }
export interface CommunityModule { id: string; title: string; forums: CommunityForumSpace[] }
export interface CommunityCourse { slug: string; title: string; summary: string; modules: CommunityModule[] }
export interface CommunityActivity {
  kind: 'discussion' | 'reply'; courseSlug: string; courseTitle: string;
  threadId: string; threadTitle: string; moduleId: string; moduleTitle: string;
  cohortId: string | null; cohortTitle: string | null;
  createdAt: string | null;
}
export interface CommunityMember {
  id: string; fullName: string; avatarKey: ProfileAvatarKey | null;
  avatarUrl: string | null; activity: CommunityActivity[];
}

export class HttpForumRepository implements ForumRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async threads(slug: string, moduleId: string, cohortId?: string): Promise<ThreadSummary[]> {
    const cohortQuery = cohortId ? `&cohort_id=${encodeURIComponent(cohortId)}` : '';
    const query = `?module_id=${encodeURIComponent(moduleId)}${cohortQuery}`;
    const rows = await this.http.get<ThreadSummaryDto[]>(
      `/forum/${encodeURIComponent(slug)}/threads${query}`,
    );
    return rows.map(toSummary);
  }

  async thread(slug: string, threadId: string, cohortId?: string): Promise<ThreadDetail> {
    const query = cohortId ? `?cohort_id=${encodeURIComponent(cohortId)}` : '';
    const dto = await this.http.get<ThreadDetailDto>(
      `/forum/${encodeURIComponent(slug)}/threads/${encodeURIComponent(threadId)}${query}`,
    );
    return { ...toSummary(dto), body: dto.body, posts: dto.posts.map(toPost) };
  }

  async openThread(
    slug: string,
    input: { title: string; body: string; moduleId: string; cohortId: string | null },
  ): Promise<ThreadDetail> {
    const dto = await this.http.post<ThreadDetailDto>(
      `/forum/${encodeURIComponent(slug)}/threads`,
      { title: input.title, body: input.body, module_id: input.moduleId, cohort_id: input.cohortId },
    );
    return { ...toSummary(dto), body: dto.body, posts: dto.posts.map(toPost) };
  }

  async reply(slug: string, threadId: string, body: string, cohortId?: string): Promise<Post> {
    const query = cohortId ? `?cohort_id=${encodeURIComponent(cohortId)}` : '';
    return toPost(
      await this.http.post<PostDto>(
        `/forum/${encodeURIComponent(slug)}/threads/${encodeURIComponent(threadId)}/replies${query}`,
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

  async community(): Promise<CommunityCourse[]> {
    const result = await this.http.get<{
      courses: {
        slug: string;
        title: string;
        summary: string;
        modules: {
          id: string;
          title: string;
          forums: { cohort_id: string | null; cohort_title: string | null }[];
        }[];
      }[];
    }>('/forum/community');
    return result.courses.map((course) => ({
      ...course,
      modules: course.modules.map((module) => ({
        id: module.id,
        title: module.title,
        forums: module.forums.map((forum) => ({
          cohortId: forum.cohort_id,
          cohortTitle: forum.cohort_title,
        })),
      })),
    }));
  }

  async member(id: string): Promise<CommunityMember> {
    const dto = await this.http.get<{
      id: string; full_name: string; avatar_key?: string | null; avatar_url?: string | null;
      activity: {
        kind: 'discussion' | 'reply'; course_slug: string; course_title: string;
        thread_id: string; thread_title: string; module_id: string;
        module_title: string; cohort_id: string | null; cohort_title: string | null;
        created_at: string | null;
      }[];
    }>(`/forum/community/members/${encodeURIComponent(id)}`);
    return {
      id: dto.id, fullName: dto.full_name,
      avatarKey: isProfileAvatarKey(dto.avatar_key)
        ? dto.avatar_key as CommunityMember['avatarKey'] : null,
      avatarUrl: dto.avatar_url ?? null,
      activity: dto.activity.map((item) => ({
        kind: item.kind, courseSlug: item.course_slug, courseTitle: item.course_title,
        threadId: item.thread_id, threadTitle: item.thread_title,
        moduleId: item.module_id, moduleTitle: item.module_title,
        cohortId: item.cohort_id, cohortTitle: item.cohort_title, createdAt: item.created_at,
      })),
    };
  }
}

export const forumRepository = new HttpForumRepository();
