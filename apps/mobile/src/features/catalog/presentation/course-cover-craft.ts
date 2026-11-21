export type CourseCoverCraft =
  | 'writing-prompt'
  | 'showing-chapter'
  | 'reading-rubric'
  | 'chat-exchange'
  | 'cited-source'
  | 'quiz-question'
  | 'three-part-slide';

const COURSE_COVER_CRAFT_BY_SLUG: Record<string, CourseCoverCraft> = {
  'introduccion-ia-docentes': 'writing-prompt',
  'ia-para-docentes': 'showing-chapter',
  'prompting-para-docentes': 'writing-prompt',
  'notebooklm-en-el-aula': 'showing-chapter',
  'evaluacion-asistida-por-ia': 'reading-rubric',
  // Cápsulas: the desk shows the tool each course records, not a generic sheet.
  'gemini-paso-a-paso': 'chat-exchange',
  'notebooklm-paso-a-paso': 'cited-source',
  'prueba-corta-en-forms': 'quiz-question',
  'lamina-en-canva': 'three-part-slide',
};

export function coverCraftForCourseSlug(courseSlug: string): CourseCoverCraft | undefined {
  return COURSE_COVER_CRAFT_BY_SLUG[courseSlug];
}
