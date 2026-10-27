import { describe, expect, it } from 'vitest';

import { isSelectableAvatarPhoto, MAX_AVATAR_PHOTO_BYTES } from './avatar-file';

describe('selectable profile photos', () => {
  it('allows JPEG, PNG and WebP through the exact five MiB limit', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(isSelectableAvatarPhoto(type, MAX_AVATAR_PHOTO_BYTES)).toBe(true);
    }
  });

  it('rejects unknown formats and files over the limit', () => {
    expect(isSelectableAvatarPhoto('image/svg+xml', 128)).toBe(false);
    expect(isSelectableAvatarPhoto('image/jpeg', MAX_AVATAR_PHOTO_BYTES + 1)).toBe(false);
  });
});
