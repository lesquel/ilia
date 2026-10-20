import { describe, expect, it } from 'vitest';

import { toPost, toSummary } from './forum-dto';

describe('forum author profile mapping', () => {
  it('maps an illustrated avatar on a thread summary', () => {
    const summary = toSummary({
      id: 'thread-1',
      title: 'Una pregunta',
      author_name: 'Ana Pérez',
      author_avatar_key: 'colibri',
      author_avatar_url: null,
      reply_count: 0,
      created_at: null,
      last_activity_at: null,
      is_hidden: false,
    });

    expect(summary.authorAvatarKey).toBe('colibri');
    expect(summary.authorAvatarUrl).toBeNull();
  });

  it('maps a signed photo URL on a reply', () => {
    const post = toPost({
      id: 'post-1',
      author_name: 'Lucía',
      author_avatar_key: null,
      author_avatar_url: 'https://storage.example/signed-photo',
      body: 'Así.',
      created_at: null,
      is_hidden: false,
    });

    expect(post.authorAvatarUrl).toBe('https://storage.example/signed-photo');
  });
});
