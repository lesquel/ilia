import { describe, expect, it } from 'vitest';

import {
  ADMIN_COHORTS_PATH,
  createCohortBody,
  mapCohortDto,
} from './cohort-wire';

/**
 * The admin form must talk to `/admin/cohorts`. If that path or payload
 * drifts, a charla is created only via seed again.
 */
describe('cohort wire contract', () => {
  it('posts name and code to /admin/cohorts', () => {
    expect(ADMIN_COHORTS_PATH).toBe('/admin/cohorts');
    expect(
      createCohortBody({
        name: 'Charla Manta — septiembre 2026',
        code: 'MANTA-SEP-01',
      }),
    ).toEqual({
      name: 'Charla Manta — septiembre 2026',
      code: 'MANTA-SEP-01',
    });
  });

  it('lists code, name and created_at so charlas can be told apart', () => {
    expect(
      mapCohortDto({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Charla Manta — septiembre 2026',
        code: 'MANTA-SEP-01',
        created_at: '2026-09-20T12:00:00+00:00',
      }),
    ).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Charla Manta — septiembre 2026',
      code: 'MANTA-SEP-01',
      createdAt: '2026-09-20T12:00:00+00:00',
    });
  });
});
