import type { ImageSource } from 'expo-image';

import {
  coverCraftForCourseSlug,
  coverToneForCourseSlug,
  type CourseCoverCraft,
  type CourseCoverTone,
} from '@/features/catalog/presentation/course-cover-craft';

export type { CourseCoverCraft, CourseCoverTone };

export type CourseCoverScene = {
  still: ImageSource;
  craft: CourseCoverCraft;
  tone: CourseCoverTone;
};

// One Lía per course, so a row of covers never repeats her. The three first
// courses wear the costume of their own course.
const COURSE_COVER_STILL_BY_SLUG: Record<string, ImageSource> = {
  'introduccion-ia-docentes': require('../../../../assets/mascot/lia-write.png'),
  'ia-para-docentes': require('../../../../assets/mascot/lia-explain.png'),
  'prompting-para-docentes': require('../../../../assets/mascot/costume-prompting-para-docentes.png'),
  'notebooklm-en-el-aula': require('../../../../assets/mascot/costume-notebooklm-en-el-aula.png'),
  'evaluacion-asistida-por-ia': require('../../../../assets/mascot/costume-evaluacion-asistida-por-ia.png'),
  'gemini-paso-a-paso': require('../../../../assets/mascot/lia-talk.png'),
  'notebooklm-paso-a-paso': require('../../../../assets/mascot/lia-think.png'),
  'prueba-corta-en-forms': require('../../../../assets/mascot/lia-celebrate.png'),
  'lamina-en-canva': require('../../../../assets/mascot/lia-show.png'),
};

const COURSE_COSTUME_BY_SLUG: Record<string, ImageSource> = {
  'prompting-para-docentes': require('../../../../assets/mascot/costume-prompting-para-docentes.png'),
  'notebooklm-en-el-aula': require('../../../../assets/mascot/costume-notebooklm-en-el-aula.png'),
  'evaluacion-asistida-por-ia': require('../../../../assets/mascot/costume-evaluacion-asistida-por-ia.png'),
};

export function coverSceneForCourseSlug(courseSlug: string): CourseCoverScene | undefined {
  const craft = coverCraftForCourseSlug(courseSlug);
  const still = COURSE_COVER_STILL_BY_SLUG[courseSlug];
  const tone = coverToneForCourseSlug(courseSlug);
  if (!craft || !still || !tone) {
    return undefined;
  }
  return { still, craft, tone };
}

export function costumeForCourseSlug(courseSlug: string): ImageSource | undefined {
  return COURSE_COSTUME_BY_SLUG[courseSlug];
}
