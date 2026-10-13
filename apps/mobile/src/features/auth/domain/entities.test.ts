import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DESTINATION,
  FULL_NAME_MAX_LENGTH,
  cleanFullName,
  isEmailFieldRejected,
  isFullNameChange,
  safeDestination,
} from './entities';

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

describe('isEmailFieldRejected', () => {
  it('detects a rejected email in a FastAPI validation detail', () => {
    const detail = [{ loc: ['body', 'email'], msg: 'special-use domain', type: 'value_error' }];
    expect(isEmailFieldRejected(detail)).toBe(true);
  });

  it('ignores errors on other fields and malformed details', () => {
    expect(isEmailFieldRejected([{ loc: ['body', 'password'] }])).toBe(false);
    expect(isEmailFieldRejected(undefined)).toBe(false);
    expect(isEmailFieldRejected([null, {}])).toBe(false);
  });
});

describe('cleanFullName', () => {
  it('trims the name the way the API stores it', () => {
    expect(cleanFullName('  Ana Pérez  ')).toBe('Ana Pérez');
  });

  it('refuses an empty or blank name', () => {
    expect(cleanFullName('')).toBeNull();
    expect(cleanFullName('   ')).toBeNull();
  });

  it('accepts a name at the limit and refuses one past it', () => {
    expect(cleanFullName('a'.repeat(FULL_NAME_MAX_LENGTH))).toHaveLength(FULL_NAME_MAX_LENGTH);
    expect(cleanFullName('a'.repeat(FULL_NAME_MAX_LENGTH + 1))).toBeNull();
  });
});

describe('isFullNameChange', () => {
  it('is true for a valid name that differs from the current one', () => {
    expect(isFullNameChange('Ana María Pérez', 'Ana Pérez')).toBe(true);
  });

  it('is false when only the surrounding spaces differ', () => {
    expect(isFullNameChange('  Ana Pérez ', 'Ana Pérez')).toBe(false);
  });

  it('is false for a name the API would refuse', () => {
    expect(isFullNameChange('   ', 'Ana Pérez')).toBe(false);
    expect(isFullNameChange('a'.repeat(FULL_NAME_MAX_LENGTH + 1), 'Ana Pérez')).toBe(false);
  });
});
