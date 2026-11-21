export const MAX_AVATAR_PHOTO_BYTES = 5 * 1024 * 1024;

const AVATAR_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Client-side selection guard; the API checks the actual bytes as authority. */
export function isSelectableAvatarPhoto(contentType: string, size: number): boolean {
  return AVATAR_PHOTO_TYPES.has(contentType) && size >= 0 && size <= MAX_AVATAR_PHOTO_BYTES;
}
