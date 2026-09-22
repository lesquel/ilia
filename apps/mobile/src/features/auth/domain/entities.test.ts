import { describe, expect, it } from 'vitest';

import { DEFAULT_DESTINATION, safeDestination } from './entities';

describe('safeDestination', () => {
  it('keeps an internal path so the person lands where they were going', () => {
    expect(safeDestination('/lab/abc-123')).toBe('/lab/abc-123');
    expect(safeDestination('/catalog/prompting-para-docentes/forum')).toBe(
      '/catalog/prompting-para-docentes/forum',
    );
  });

  it('falls back when there is nothing to go back to', () => {
    expect(safeDestination(undefined)).toBe(DEFAULT_DESTINATION);
    expect(safeDestination(null)).toBe(DEFAULT_DESTINATION);
    expect(safeDestination('')).toBe(DEFAULT_DESTINATION);
  });

  it('refuses an absolute URL', () => {
    // The attack: someone shares `…/login?next=https://not-ilia.example`. The
    // teacher checks the URL, sees ours, types their password — and is handed
    // to a page that looks like ours and is not.
    expect(safeDestination('https://not-ilia.example')).toBe(DEFAULT_DESTINATION);
    expect(safeDestination('http://not-ilia.example/login')).toBe(DEFAULT_DESTINATION);
  });

  it('refuses a protocol-relative path, which a browser reads as another host', () => {
    // `//not-ilia.example` looks like a path and is not one. This is the case
    // a naive "must start with /" check lets straight through.
    expect(safeDestination('//not-ilia.example')).toBe(DEFAULT_DESTINATION);
    expect(safeDestination('//not-ilia.example/catalog')).toBe(DEFAULT_DESTINATION);
  });

  it('refuses anything that is not a path at all', () => {
    expect(safeDestination('javascript:alert(1)')).toBe(DEFAULT_DESTINATION);
    expect(safeDestination('catalog')).toBe(DEFAULT_DESTINATION);
  });

  it('refuses to send someone back to the auth screens', () => {
    // Logging in and landing on the login form again is a loop, not a
    // destination.
    expect(safeDestination('/login')).toBe(DEFAULT_DESTINATION);
    expect(safeDestination('/login?next=/login')).toBe(DEFAULT_DESTINATION);
    expect(safeDestination('/register')).toBe(DEFAULT_DESTINATION);
    expect(safeDestination('/forgot-password')).toBe(DEFAULT_DESTINATION);
    expect(safeDestination('/reset-password')).toBe(DEFAULT_DESTINATION);
  });

  it('ignores surrounding whitespace rather than treating it as a bad path', () => {
    expect(safeDestination('  /certificates  ')).toBe('/certificates');
  });
});
