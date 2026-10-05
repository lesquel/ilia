import { describe, expect, it, vi } from 'vitest';
import { HttpAdminRepository } from './admin-repository';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

/**
 * Proves the admin form's repository actually hits the new endpoints.
 *
 * A path constant test would still pass if `createCohort` stopped posting.
 * This one fails unless `GET /admin/cohorts` and `POST /admin/cohorts` run.
 */
class RecordingHttp {
  readonly calls: { method: string; path: string; body?: unknown }[] = [];
  private readonly listBody = {
    items: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Charla Manta — septiembre 2026',
        code: 'MANTA-SEP-01',
        created_at: '2026-09-20T12:00:00+00:00',
      },
    ],
  };
  private readonly createdBody = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Charla Manta — septiembre 2026',
    code: 'MANTA-SEP-01',
    created_at: '2026-09-20T12:00:00+00:00',
  };

  get<T>(path: string): Promise<T> {
    this.calls.push({ method: 'GET', path });
    return Promise.resolve(this.listBody as T);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    this.calls.push({ method: 'POST', path, body });
    return Promise.resolve(this.createdBody as T);
  }
}

describe('HttpAdminRepository cohorts', () => {
  it('lists cohorts with GET /admin/cohorts', async () => {
    const http = new RecordingHttp();
    const repository = new HttpAdminRepository(http as never);

    const page = await repository.cohorts();

    expect(http.calls).toEqual([{ method: 'GET', path: '/admin/cohorts' }]);
    expect(page.items).toEqual([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Charla Manta — septiembre 2026',
        code: 'MANTA-SEP-01',
        createdAt: '2026-09-20T12:00:00+00:00',
      },
    ]);
  });

  it('creates a cohort with POST /admin/cohorts and { name, code }', async () => {
    const http = new RecordingHttp();
    const repository = new HttpAdminRepository(http as never);

    const created = await repository.createCohort({
      name: 'Charla Manta — septiembre 2026',
      code: 'MANTA-SEP-01',
    });

    expect(http.calls).toEqual([
      {
        method: 'POST',
        path: '/admin/cohorts',
        body: { name: 'Charla Manta — septiembre 2026', code: 'MANTA-SEP-01' },
      },
    ]);
    expect(created.code).toBe('MANTA-SEP-01');
  });
});
