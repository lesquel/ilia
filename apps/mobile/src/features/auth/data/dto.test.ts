import { describe, expect, it } from 'vitest';

import { toUser } from './dto';

describe('toUser', () => {
  it('maps an illustrated avatar and private photo URL from the wire format', () => {
    const user = toUser({
      id: '1',
      email: 'ana@example.edu',
      full_name: 'Ana Pérez',
      role: 'student',
      avatar_key: 'colibri',
      avatar_url: null,
    });

    expect(user.avatarKey).toBe('colibri');
    expect(user.avatarUrl).toBeNull();
  });

  it('keeps older API responses compatible by falling back to initials', () => {
    const user = toUser({
      id: '1',
      email: 'ana@example.edu',
      full_name: 'Ana Pérez',
      role: 'student',
    });

    expect(user.avatarKey).toBeNull();
    expect(user.avatarUrl).toBeNull();
  });
});
