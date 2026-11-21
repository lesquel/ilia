import type { ProfileAvatarKey } from '@/features/auth/domain/entities';
import { isProfileAvatarKey } from '@/features/auth/domain/entities';
import type { Post, ThreadSummary } from '@/features/forum/domain/entities';

export interface ThreadSummaryDto {
  can_moderate?: boolean;
  id: string;
  title: string;
  author_name: string;
  author_id: string;
  author_avatar_key?: string | null;
  author_avatar_url?: string | null;
  reply_count: number;
  created_at: string | null;
  last_activity_at: string | null;
  is_hidden: boolean;
}

export interface PostDto {
  id: string;
  author_name: string;
  author_id: string;
  author_avatar_key?: string | null;
  author_avatar_url?: string | null;
  body: string;
  created_at: string | null;
  is_hidden: boolean;
}

export interface ThreadDetailDto extends ThreadSummaryDto {
  body: string;
  posts: PostDto[];
}

function avatarKey(value: string | null | undefined): ProfileAvatarKey | null {
  return isProfileAvatarKey(value) ? value : null;
}

export function toSummary(dto: ThreadSummaryDto): ThreadSummary {
  return {
    id: dto.id,
    title: dto.title,
    authorName: dto.author_name,
    authorId: dto.author_id,
    authorAvatarKey: avatarKey(dto.author_avatar_key),
    authorAvatarUrl: dto.author_avatar_url ?? null,
    replyCount: dto.reply_count,
    createdAt: dto.created_at,
    lastActivityAt: dto.last_activity_at,
    isHidden: dto.is_hidden,
    canModerate: dto.can_moderate ?? false,
  };
}

export function toPost(dto: PostDto): Post {
  return {
    id: dto.id,
    authorName: dto.author_name,
    authorId: dto.author_id,
    authorAvatarKey: avatarKey(dto.author_avatar_key),
    authorAvatarUrl: dto.author_avatar_url ?? null,
    body: dto.body,
    createdAt: dto.created_at,
    isHidden: dto.is_hidden,
  };
}
