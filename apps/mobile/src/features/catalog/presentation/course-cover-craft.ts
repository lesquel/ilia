export type CourseCoverCraft = 'writing-prompt' | 'showing-chapter' | 'reading-rubric';

const COURSE_COVER_CRAFT_BY_SLUG: Record<string, CourseCoverCraft> = {
  'prompting-para-docentes': 'writing-prompt',
  'notebooklm-en-el-aula': 'showing-chapter',
  'evaluacion-asistida-por-ia': 'reading-rubric',
};

export function coverCraftForCourseSlug(courseSlug: string): CourseCoverCraft | undefined {
  return COURSE_COVER_CRAFT_BY_SLUG[courseSlug];
}
