import { describe, expect, it } from 'vitest';

import { cohortListAppearance } from './entities';

describe('cohortListAppearance', () => {
  it('does not treat a failed list as an empty list', () => {
    expect(
      cohortListAppearance({
        isLoading: false,
        error: new Error('network'),
        isSuccess: false,
        itemCount: 0,
      }),
    ).toBe('error');
  });

  it('does not treat the initial load as an empty list', () => {
    expect(
      cohortListAppearance({
        isLoading: true,
        error: null,
        isSuccess: false,
        itemCount: 0,
      }),
    ).toBe('loading');
  });

  it('says empty only after a successful response with zero items', () => {
    expect(
      cohortListAppearance({
        isLoading: false,
        error: null,
        isSuccess: true,
        itemCount: 0,
      }),
    ).toBe('empty');
  });

  it('shows items when the list arrived', () => {
    expect(
      cohortListAppearance({
        isLoading: false,
        error: null,
        isSuccess: true,
        itemCount: 1,
      }),
    ).toBe('items');
  });
});
