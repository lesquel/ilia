import { HttpClient, httpClient } from '@/core/api/http-client';
import type { Level } from '@/features/catalog/domain/entities';
import type {
  AuthoredCourse,
  CourseStatus,
  ReviewItem,
  RosterEntry,
} from '@/features/instructor/domain/entities';

interface AuthoredCourseDto {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  level: string;
  status: string;
  module_count: number;
  lesson_count: number;
  duration_seconds: number;
  published_at: string | null;
  publish_blockers: string[];
}

function toCourse(dto: AuthoredCourseDto): AuthoredCourse {
  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    summary: dto.summary,
    description: dto.description,
    level: dto.level as Level,
    status: dto.status as CourseStatus,
    moduleCount: dto.module_count,
    lessonCount: dto.lesson_count,
    durationSeconds: dto.duration_seconds,
    publishedAt: dto.published_at,
    publishBlockers: dto.publish_blockers,
  };
}

export interface CourseInput {
  title: string;
  slug: string;
  summary: string;
  description: string;
  level: Level;
}

export interface LessonInput {
  title: string;
  kind: string;
  durationSeconds: number;
  body: string;
}

export interface InstructorRepository {
  courses(): Promise<AuthoredCourse[]>;
  create(input: CourseInput): Promise<AuthoredCourse>;
  update(courseId: string, input: CourseInput): Promise<AuthoredCourse>;
  publish(courseId: string): Promise<AuthoredCourse>;
  unpublish(courseId: string): Promise<AuthoredCourse>;
  addModule(courseId: string, title: string): Promise<string>;
  addLesson(courseId: string, moduleId: string, input: LessonInput): Promise<string>;
  inbox(courseId?: string): Promise<ReviewItem[]>;
  override(submissionId: string, total: number, reason: string): Promise<void>;
  roster(courseId: string): Promise<RosterEntry[]>;
}

export class HttpInstructorRepository implements InstructorRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async courses(): Promise<AuthoredCourse[]> {
    const rows = await this.http.get<AuthoredCourseDto[]>('/instructor/courses');
    return rows.map(toCourse);
  }

  async create(input: CourseInput): Promise<AuthoredCourse> {
    return toCourse(await this.http.post<AuthoredCourseDto>('/instructor/courses', input));
  }

  async update(courseId: string, input: CourseInput): Promise<AuthoredCourse> {
    return toCourse(
      await this.http.request<AuthoredCourseDto>(`/instructor/courses/${courseId}`, {
        method: 'PUT',
        body: input,
      }),
    );
  }

  async publish(courseId: string): Promise<AuthoredCourse> {
    return toCourse(
      await this.http.post<AuthoredCourseDto>(`/instructor/courses/${courseId}/publish`),
    );
  }

  async unpublish(courseId: string): Promise<AuthoredCourse> {
    return toCourse(
      await this.http.post<AuthoredCourseDto>(`/instructor/courses/${courseId}/unpublish`),
    );
  }

  async addModule(courseId: string, title: string): Promise<string> {
    const dto = await this.http.post<{ id: string }>(
      `/instructor/courses/${courseId}/modules`,
      { title },
    );
    return dto.id;
  }

  async addLesson(courseId: string, moduleId: string, input: LessonInput): Promise<string> {
    const dto = await this.http.post<{ id: string }>(
      `/instructor/courses/${courseId}/modules/${moduleId}/lessons`,
      {
        title: input.title,
        kind: input.kind,
        duration_seconds: input.durationSeconds,
        body: input.body,
      },
    );
    return dto.id;
  }

  async inbox(courseId?: string): Promise<ReviewItem[]> {
    const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : '';
    const rows = await this.http.get<
      {
        submission_id: string;
        activity_title: string;
        student_name: string;
        attempt: number;
        prompt: string;
        submitted_at: string | null;
        total: number | null;
        effective_total: number | null;
        passed: boolean;
        was_overridden: boolean;
      }[]
    >(`/instructor/submissions${query}`);

    return rows.map((row) => ({
      submissionId: row.submission_id,
      activityTitle: row.activity_title,
      studentName: row.student_name,
      attempt: row.attempt,
      prompt: row.prompt,
      submittedAt: row.submitted_at,
      total: row.total,
      effectiveTotal: row.effective_total,
      passed: row.passed,
      wasOverridden: row.was_overridden,
    }));
  }

  async override(submissionId: string, total: number, reason: string): Promise<void> {
    await this.http.post<void>(`/instructor/submissions/${submissionId}/override`, {
      total,
      reason,
    });
  }

  async roster(courseId: string): Promise<RosterEntry[]> {
    const rows = await this.http.get<
      {
        user_id: string;
        full_name: string;
        email: string;
        enrolled_at: string | null;
        cohort_name: string | null;
        lessons_completed: number;
        lessons_total: number;
        percentage: number;
        last_activity_at: string | null;
      }[]
    >(`/instructor/courses/${courseId}/roster`);

    return rows.map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      email: row.email,
      enrolledAt: row.enrolled_at,
      cohortName: row.cohort_name,
      lessonsCompleted: row.lessons_completed,
      lessonsTotal: row.lessons_total,
      percentage: row.percentage,
      lastActivityAt: row.last_activity_at,
    }));
  }
}

export const instructorRepository = new HttpInstructorRepository();
