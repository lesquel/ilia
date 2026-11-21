import { describe, expect, it } from 'vitest';

import { isProfileAvatarKey, PROFILE_AVATAR_CHOICES } from './entities';

describe('profile avatar choices', () => {
  it('accepts only the published illustration keys', () => {
    for (const choice of PROFILE_AVATAR_CHOICES) expect(isProfileAvatarKey(choice.key)).toBe(true);
    expect(isProfileAvatarKey('unexpected-image')).toBe(false);
    expect(isProfileAvatarKey(null)).toBe(false);
  });
});
