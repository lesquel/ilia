import type { ImageSource } from 'expo-image';

import {
  coverCraftForCourseSlug,
  type CourseCoverCraft,
} from '@/features/catalog/presentation/course-cover-craft';

export type { CourseCoverCraft };

export type CourseCoverScene = {
  still: ImageSource;
  craft: CourseCoverCraft;
};

const COURSE_COVER_STILL_BY_SLUG: Record<string, ImageSource> = {
  'prompting-para-docentes': require('../../../../assets/mascot/lia-write.png'),
  'notebooklm-en-el-aula': require('../../../../assets/mascot/lia-show.png'),
  'evaluacion-asistida-por-ia': require('../../../../assets/mascot/lia-think.png'),
};

const COURSE_COSTUME_BY_SLUG: Record<string, ImageSource> = {
  'prompting-para-docentes': require('../../../../assets/mascot/costume-prompting-para-docentes.png'),
  'notebooklm-en-el-aula': require('../../../../assets/mascot/costume-notebooklm-en-el-aula.png'),
  'evaluacion-asistida-por-ia': require('../../../../assets/mascot/costume-evaluacion-asistida-por-ia.png'),
};

export function coverSceneForCourseSlug(courseSlug: string): CourseCoverScene | undefined {
  const craft = coverCraftForCourseSlug(courseSlug);
  const still = COURSE_COVER_STILL_BY_SLUG[courseSlug];
  if (!craft || !still) {
    return undefined;
  }
  return { still, craft };
}

export function costumeForCourseSlug(courseSlug: string): ImageSource | undefined {
  return COURSE_COSTUME_BY_SLUG[courseSlug];
}
