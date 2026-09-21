import { describe, expect, it } from 'vitest';

import type { Module } from '@/features/catalog/domain/entities';

import type { CourseProgress, EnrolledCourse } from './entities';
import { primaryCourseToContinue, resumeTargetForCourse } from './resume';

const baseCourse = {
  id: 'c1',
  slug: 'prompting',
  title: 'Fundamentos',
  summary: '',
  level: 'beginner' as const,
  instructorName: 'Marc Oliver',
  lessonCount: 2,
  durationSeconds: 3600,
};

function enrolled(
  slug: string,
  percentage: number,
  completedLessons: number,
  isComplete = false,
): EnrolledCourse {
  return {
    course: { ...baseCourse, slug, title: slug },
    enrolledAt: null,
    progress: {
      totalLessons: 4,
      completedLessons,
      percentage,
      isComplete,
      completedLessonIds: [],
      passedActivityIds: [],
      nextLesson: null,
    },
  };
}

describe('primaryCourseToContinue', () => {
  it('prefers started in-progress courses over not-started ones', () => {
    const pick = primaryCourseToContinue([
      enrolled('new', 0, 0),
      enrolled('active', 40, 2),
    ]);
    expect(pick?.course.slug).toBe('active');
  });

  it('returns undefined when every course is complete', () => {
    expect(
      primaryCourseToContinue([enrolled('done', 100, 4, true)]),
    ).toBeUndefined();
  });
});

describe('resumeTargetForCourse', () => {
  const modules: Module[] = [
    {
      id: 'm1',
      title: 'Módulo 1',
      position: 1,
      lessons: [{ id: 'l1', title: 'Intro', kind: 'text', position: 1, durationSeconds: 600, hasMedia: false }],
      activities: [{ id: 'a1', title: 'Práctica', maxAttempts: 3 }],
    },
  ];

  const progress: CourseProgress = {
    totalLessons: 1,
    completedLessons: 1,
    percentage: 100,
    isComplete: false,
    completedLessonIds: ['l1'],
    passedActivityIds: [],
    nextLesson: null,
  };

  it('points at the lab when the open syllabus item is an activity', () => {
    const target = resumeTargetForCourse('prompting', 'Marc Oliver', modules, progress);
    expect(target.href).toBe('/lab/a1');
    expect(target.contextLine).toContain('Práctica');
    expect(target.contextLine).toContain('Marc Oliver');
  });
});
