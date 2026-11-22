import { describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '@/core/api/http-client';

import { HttpLabRepository } from './lab-repository';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const row = (attempt: number, createdAt: string) => ({
  id: `sub-${attempt}`,
  activity_id: 'act-1',
  attempt,
  status: 'scored',
  prompt: `Pedido ${attempt}`,
  failure_reason: null,
  created_at: createdAt,
  activity_title: 'Taller · El pedido de tu próxima hoja',
  course_slug: 'gemini-paso-a-paso',
  course_title: 'Gemini paso a paso',
});

describe('HttpLabRepository.myHistory', () => {
  it('reads every attempt from one request, keeping the order the API sends', async () => {
    const paths: string[] = [];
    const http = {
      get: async (path: string) => {
        paths.push(path);
        return [row(2, '2026-11-21T12:00:00Z'), row(1, '2026-11-20T12:00:00Z')];
      },
    } as unknown as HttpClient;

    const history = await new HttpLabRepository(http).myHistory();

    expect(paths).toEqual(['/lab/submissions']);
    expect(history.map((item) => item.submission.attempt)).toEqual([2, 1]);
    expect(history[0]).toMatchObject({
      activityId: 'act-1',
      activityTitle: 'Taller · El pedido de tu próxima hoja',
      courseSlug: 'gemini-paso-a-paso',
      courseTitle: 'Gemini paso a paso',
    });
    expect(history[0]?.submission.prompt).toBe('Pedido 2');
  });
});
