import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openOfficialCodeModule } from './code-module-access';

const mocks = vi.hoisted(() => ({ post: vi.fn(), currentUser: vi.fn(), login: vi.fn() }));
vi.mock('@/core/api/http-client', () => ({ httpClient: { post: mocks.post } }));
vi.mock('@/features/auth/data/auth-repository', () => ({ authRepository: mocks }));

const fetchMock = vi.fn();
const assign = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', { location: { assign } });
  mocks.currentUser.mockResolvedValue({ id: 'official-user' });
  mocks.post.mockResolvedValue({ ticket: 'short-lived-ticket', correlation_id: 'correlation-fixture' });
});
afterEach(() => vi.unstubAllGlobals());

describe('Official code module handoff', () => {
  it('sends the ticket in the POST body and never in the URL', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf' }) })
      .mockResolvedValueOnce({ ok: true });
    await openOfficialCodeModule('http://localhost:8010');
    expect(mocks.currentUser).toHaveBeenCalledOnce();
    expect(mocks.post).toHaveBeenCalledWith('/auth/code-module/ticket', {});
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:8010/acceso/ilia');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ ticket: 'short-lived-ticket' });
    expect(assign).toHaveBeenCalledWith('http://localhost:8010/modulo');
  });
  it('does not issue a ticket if the module is unavailable', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    await expect(openOfficialCodeModule('http://localhost:8010')).rejects.toThrow('no está disponible');
    expect(mocks.post).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
  it('shows a rejected handoff without navigating', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Acceso vencido.' }) });
    await expect(openOfficialCodeModule('http://localhost:8010')).rejects.toThrow('Acceso vencido.');
    expect(assign).not.toHaveBeenCalled();
  });
  it('requires a secure remote destination and a valid CSRF response', async () => {
    await expect(openOfficialCodeModule('http://foreign.example.org')).rejects.toThrow('HTTPS');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await expect(openOfficialCodeModule('http://localhost:8010')).rejects.toThrow('preparar');
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
