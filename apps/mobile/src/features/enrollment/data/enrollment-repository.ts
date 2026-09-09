import { HttpClient, httpClient } from '@/core/api/http-client';
import { toCourseSummary, type CourseSummaryDto } from '@/features/catalog/data/dto';
import { LESSON_KINDS, type LessonKind } from '@/features/catalog/domain/entities';
import type {
  CourseProgress,
  EnrolledCourse,
  Enrollment,
  LessonView,
} from '@/features/enrollment/domain/entities';

interface NextLessonDto {
  lesson_id: string;
  lesson_title: string;
  module_id: string;
  module_title: string;
}

interface ProgressDto {
  total_lessons: number;
  completed_lessons: number;
  percentage: number;
  is_complete: boolean;
  completed_lesson_ids: string[];
  next_lesson: NextLessonDto | null;
}

interface EnrollmentDto {
  id: string;
  course_id: string;
  enrolled_at: string | null;
  cohort_id: string | null;
}

interface EnrolledCourseDto {
  course: CourseSummaryDto;
  enrolled_at: string | null;
  progress: ProgressDto;
}

function toProgress(dto: ProgressDto): CourseProgress {
  return {
    totalLessons: dto.total_lessons,
    completedLessons: dto.completed_lessons,
    percentage: dto.percentage,
    isComplete: dto.is_complete,
    completedLessonIds: dto.completed_lesson_ids,
    nextLesson: dto.next_lesson
      ? {
          lessonId: dto.next_lesson.lesson_id,
          lessonTitle: dto.next_lesson.lesson_title,
          moduleId: dto.next_lesson.module_id,
          moduleTitle: dto.next_lesson.module_title,
        }
      : null,
  };
}

interface LessonViewDto {
  lesson_id: string;
  title: string;
  module_title: string;
  kind: string;
  duration_seconds: number;
  body: string;
  resource_ref: string | null;
  media_url: string | null;
  is_completed: boolean;
  position: number;
  total_lessons: number;
  previous: NextLessonDto | null;
  next: NextLessonDto | null;
}

function toNextLesson(dto: NextLessonDto | null) {
  return dto
    ? {
        lessonId: dto.lesson_id,
        lessonTitle: dto.lesson_title,
        moduleId: dto.module_id,
        moduleTitle: dto.module_title,
      }
    : null;
}

function toLessonKind(value: string): LessonKind {
  return (LESSON_KINDS as readonly string[]).includes(value) ? (value as LessonKind) : 'text';
}

export interface EnrollmentRepository {
  enroll(input: { courseSlug: string; cohortCode?: string }): Promise<Enrollment>;
  myCourses(): Promise<EnrolledCourse[]>;
  progressFor(slug: string): Promise<CourseProgress>;
  completeLesson(slug: string, lessonId: string): Promise<CourseProgress>;
  lesson(slug: string, lessonId: string): Promise<LessonView>;
}

export class HttpEnrollmentRepository implements EnrollmentRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async enroll({
    courseSlug,
    cohortCode,
  }: {
    courseSlug: string;
    cohortCode?: string;
  }): Promise<Enrollment> {
    const dto = await this.http.post<EnrollmentDto>('/enrollments', {
      course_slug: courseSlug,
      cohort_code: cohortCode?.trim() || null,
    });

    return {
      id: dto.id,
      courseId: dto.course_id,
      enrolledAt: dto.enrolled_at,
      cohortId: dto.cohort_id,
    };
  }

  async myCourses(): Promise<EnrolledCourse[]> {
    const rows = await this.http.get<EnrolledCourseDto[]>('/enrollments/me');

    return rows.map((row) => ({
      course: toCourseSummary(row.course),
      enrolledAt: row.enrolled_at,
      progress: toProgress(row.progress),
    }));
  }

  async progressFor(slug: string): Promise<CourseProgress> {
    return toProgress(
      await this.http.get<ProgressDto>(`/enrollments/me/${encodeURIComponent(slug)}`),
    );
  }

  async completeLesson(slug: string, lessonId: string): Promise<CourseProgress> {
    return toProgress(
      await this.http.post<ProgressDto>(
        `/enrollments/me/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonId)}/complete`,
        undefined,
        // The backend upsert is idempotent, but the key keeps a retry from
        // being counted twice anywhere else along the path.
        { idempotencyKey: `${slug}:${lessonId}` },
      ),
    );
  }

  async lesson(slug: string, lessonId: string): Promise<LessonView> {
    const dto = await this.http.get<LessonViewDto>(
      `/enrollments/me/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonId)}`,
    );

    return {
      lessonId: dto.lesson_id,
      title: dto.title,
      moduleTitle: dto.module_title,
      kind: toLessonKind(dto.kind),
      durationSeconds: dto.duration_seconds,
      body: dto.body,
      resourceRef: dto.resource_ref,
      mediaUrl: dto.media_url,
      isCompleted: dto.is_completed,
      position: dto.position,
      totalLessons: dto.total_lessons,
      previous: toNextLesson(dto.previous),
      next: toNextLesson(dto.next),
    };
  }
}

export const enrollmentRepository = new HttpEnrollmentRepository();
