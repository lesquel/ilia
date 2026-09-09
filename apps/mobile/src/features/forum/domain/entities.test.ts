import { describe, expect, it } from 'vitest';

import { replyLabel, timeAgo } from './entities';

/** A fixed "now", so these tests do not change meaning overnight. */
const NOW = new Date('2026-09-08T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('timeAgo', () => {
  it('says nothing when there is no timestamp', () => {
    expect(timeAgo(null, NOW)).toBe('');
  });

  it('reads a forum thread at a glance', () => {
    expect(timeAgo(ago(30_000), NOW)).toBe('recién');
    expect(timeAgo(ago(5 * MINUTE), NOW)).toBe('hace 5 min');
    expect(timeAgo(ago(3 * HOUR), NOW)).toBe('hace 3 h');
    expect(timeAgo(ago(2 * DAY), NOW)).toBe('hace 2 días');
    expect(timeAgo(ago(60 * DAY), NOW)).toBe('hace 2 meses');
  });

  it('uses the singular where Spanish needs it', () => {
    expect(timeAgo(ago(DAY), NOW)).toBe('hace 1 día');
    expect(timeAgo(ago(31 * DAY), NOW)).toBe('hace 1 mes');
  });

  it('never counts backwards when a clock is slightly ahead', () => {
    // Server and device clocks disagree by seconds all the time. "hace -1 min"
    // would make the app look broken over something harmless.
    expect(timeAgo(new Date(NOW.getTime() + 30_000).toISOString(), NOW)).toBe('recién');
  });
});

describe('replyLabel', () => {
  it('distinguishes none, one and many', () => {
    expect(replyLabel(0)).toBe('Sin respuestas');
    expect(replyLabel(1)).toBe('1 respuesta');
    expect(replyLabel(4)).toBe('4 respuestas');
  });
});
