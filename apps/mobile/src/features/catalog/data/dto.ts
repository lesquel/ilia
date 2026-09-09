import {
  LESSON_KINDS,
  LEVELS,
  type Course,
  type CoursePage,
  type CourseSummary,
  type LessonKind,
  type Level,
  type Module,
} from '@/features/catalog/domain/entities';

/** The wire format, snake_case exactly as the API sends it. */

export interface CourseSummaryDto {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: string;
  instructor_name: string;
  lesson_count: number;
  duration_seconds: number;
}

export interface LessonDto {
  id: string;
  title: string;
  kind: string;
  position: number;
  duration_seconds: number;
  has_media?: boolean;
}

export interface ActivityDto {
  id: string;
  title: string;
  max_attempts: number;
}

export interface ModuleDto {
  id: string;
  title: string;
  position: number;
  lessons: LessonDto[];
  activities?: ActivityDto[];
}

export interface CourseDetailDto extends CourseSummaryDto {
  description: string;
  modules: ModuleDto[];
}

export interface CoursePageDto {
  items: CourseSummaryDto[];
  next_cursor: string | null;
}

// An unrecognized value falls back to the safest known one rather than throwing.
// A course the backend tagged with a level this build has never heard of should
// still appear in the catalog, not blank the whole screen.
function toLevel(value: string): Level {
  return (LEVELS as readonly string[]).includes(value) ? (value as Level) : 'beginner';
}

function toLessonKind(value: string): LessonKind {
  return (LESSON_KINDS as readonly string[]).includes(value) ? (value as LessonKind) : 'text';
}

export function toCourseSummary(dto: CourseSummaryDto): CourseSummary {
  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    summary: dto.summary,
    level: toLevel(dto.level),
    instructorName: dto.instructor_name,
    lessonCount: dto.lesson_count,
    durationSeconds: dto.duration_seconds,
  };
}

function toModule(dto: ModuleDto): Module {
  return {
    id: dto.id,
    title: dto.title,
    position: dto.position,
    lessons: dto.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      kind: toLessonKind(lesson.kind),
      position: lesson.position,
      durationSeconds: lesson.duration_seconds,
      hasMedia: lesson.has_media ?? false,
    })),
    activities: (dto.activities ?? []).map((activity) => ({
      id: activity.id,
      title: activity.title,
      maxAttempts: activity.max_attempts,
    })),
  };
}

export function toCourse(dto: CourseDetailDto): Course {
  return {
    ...toCourseSummary(dto),
    description: dto.description,
    modules: dto.modules.map(toModule),
  };
}

export function toCoursePage(dto: CoursePageDto): CoursePage {
  return {
    items: dto.items.map(toCourseSummary),
    nextCursor: dto.next_cursor,
  };
}
