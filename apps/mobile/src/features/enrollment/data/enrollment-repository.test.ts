import type { HttpClient } from '@/core/api/http-client';
import { HttpEnrollmentRepository } from './enrollment-repository';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

describe('HttpEnrollmentRepository video progress', () => {
  it('stores a video position in seconds for the current lesson', async () => {
    const calls: { path: string; body: unknown }[] = [];
    const http = {
      patch: async (path: string, body: unknown) => {
        calls.push({ path, body });
      },
    } as unknown as HttpClient;
    const repository = new HttpEnrollmentRepository(http);

    await repository.recordLessonPosition('curso-docente', 'lesson-123', 47);

    expect(calls).toEqual([{
      path: '/enrollments/me/curso-docente/lessons/lesson-123/position',
      body: { position_seconds: 47 },
    }]);
  });

  it('maps the saved position returned by the lesson endpoint', async () => {
    const http = {
      get: async () => ({
        lesson_id: 'lesson-123',
        title: 'Un primer borrador',
        module_title: 'Módulo 1',
        kind: 'video',
        duration_seconds: 120,
        body: '',
        resource_ref: 'video.mp4',
        media_url: 'https://media.example/video.mp4',
        is_completed: false,
        resume_position_seconds: 47,
        position: 1,
        total_lessons: 3,
        previous: null,
        next: null,
      }),
    } as unknown as HttpClient;
    const repository = new HttpEnrollmentRepository(http);

    const lesson = await repository.lesson('curso-docente', 'lesson-123');

    expect(lesson.resumePositionSeconds).toBe(47);
  });
});
