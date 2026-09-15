import type { ImageSource } from 'expo-image';

const COURSE_COVER_BY_SLUG: Record<string, ImageSource> = {
  'prompting-para-docentes': require('../../../../assets/covers/prompting-para-docentes.png'),
  'notebooklm-en-el-aula': require('../../../../assets/covers/notebooklm-en-el-aula.png'),
  'evaluacion-asistida-por-ia': require('../../../../assets/covers/evaluacion-asistida-por-ia.png'),
};

const COURSE_COSTUME_BY_SLUG: Record<string, ImageSource> = {
  'prompting-para-docentes': require('../../../../assets/mascot/costume-prompting-para-docentes.png'),
  'notebooklm-en-el-aula': require('../../../../assets/mascot/costume-notebooklm-en-el-aula.png'),
  'evaluacion-asistida-por-ia': require('../../../../assets/mascot/costume-evaluacion-asistida-por-ia.png'),
};

export function coverForCourseSlug(courseSlug: string): ImageSource | undefined {
  return COURSE_COVER_BY_SLUG[courseSlug];
}

export function costumeForCourseSlug(courseSlug: string): ImageSource | undefined {
  return COURSE_COSTUME_BY_SLUG[courseSlug];
}
