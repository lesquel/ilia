/** Cache keys for enrollment, apart from the hooks so pure code can use them. */
export const enrollmentKeys = {
  all: ['enrollment'] as const,
  myCourses: ['enrollment', 'my-courses'] as const,
  progress: (slug: string) => ['enrollment', 'progress', slug] as const,
  lesson: (slug: string, lessonId: string) => ['enrollment', 'lesson', slug, lessonId] as const,
};
