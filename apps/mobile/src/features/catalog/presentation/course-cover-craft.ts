export type CourseCoverCraft =
  | 'writing-prompt'
  | 'showing-chapter'
  | 'reading-rubric'
  | 'prompt-before-after'
  | 'notebook-sources'
  | 'chat-exchange'
  | 'cited-source'
  | 'quiz-question'
  | 'three-part-slide';

/**
 * The paper colors of one cover: the wall behind the desk, the soft ink of the
 * lines, and the strong ink of the marks that carry the course's color.
 */
export type CourseCoverTone = {
  wash: string;
  mid: string;
  ink: string;
};

// One scene per course: the desk shows what that course has you make.
const COURSE_COVER_CRAFT_BY_SLUG: Record<string, CourseCoverCraft> = {
  'introduccion-ia-docentes': 'writing-prompt',
  'ia-para-docentes': 'showing-chapter',
  'prompting-para-docentes': 'prompt-before-after',
  'notebooklm-en-el-aula': 'notebook-sources',
  'evaluacion-asistida-por-ia': 'reading-rubric',
  'gemini-paso-a-paso': 'chat-exchange',
  'notebooklm-paso-a-paso': 'cited-source',
  'prueba-corta-en-forms': 'quiz-question',
  'lamina-en-canva': 'three-part-slide',
};

// Each ink keeps at least 4.5:1 on its wash, so the level label stays readable.
const COURSE_COVER_TONE_BY_SLUG: Record<string, CourseCoverTone> = {
  'introduccion-ia-docentes': { wash: '#E6EEFB', mid: '#BFD3F6', ink: '#1D56C2' },
  'ia-para-docentes': { wash: '#FCE7E1', mid: '#F2C3B5', ink: '#B23E27' },
  'prompting-para-docentes': { wash: '#FAF0D2', mid: '#EBD58E', ink: '#7F5700' },
  'notebooklm-en-el-aula': { wash: '#E6F0DF', mid: '#C2D9B3', ink: '#386E28' },
  'evaluacion-asistida-por-ia': { wash: '#F8E4EE', mid: '#EBBFD4', ink: '#9C2F60' },
  'gemini-paso-a-paso': { wash: '#E9E8FB', mid: '#C9C6F3', ink: '#4A41BE' },
  'notebooklm-paso-a-paso': { wash: '#DFF2EC', mid: '#AFDDCF', ink: '#0F6E58' },
  'prueba-corta-en-forms': { wash: '#F1E7F9', mid: '#D8C1EE', ink: '#7136AB' },
  'lamina-en-canva': { wash: '#DEF1F6', mid: '#ACDCE8', ink: '#0C6A80' },
};

export function coverCraftForCourseSlug(courseSlug: string): CourseCoverCraft | undefined {
  return COURSE_COVER_CRAFT_BY_SLUG[courseSlug];
}

export function coverToneForCourseSlug(courseSlug: string): CourseCoverTone | undefined {
  return COURSE_COVER_TONE_BY_SLUG[courseSlug];
}
