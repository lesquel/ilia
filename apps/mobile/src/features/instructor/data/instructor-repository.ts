import { HttpClient, httpClient } from '@/core/api/http-client';
import { mapPage, type Page, type PageDto } from '@/core/api/page';
import {
  toCourse as toCatalogCourse,
  type CourseDetailDto,
} from '@/features/catalog/data/dto';
import type { Course } from '@/features/catalog/domain/entities';
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
  inbox(courseId?: string, offset?: number): Promise<Page<ReviewItem>>;
  override(submissionId: string, total: number, reason: string): Promise<void>;
  roster(courseId: string): Promise<RosterEntry[]>;
  detail(courseId: string): Promise<Course>;
  addActivity(courseId: string, moduleId: string, input: ActivityInput): Promise<string>;
  prepareMedia(courseId: string, lessonId: string, contentType: string): Promise<MediaUpload>;
  attachMedia(courseId: string, lessonId: string, reference: string | null): Promise<void>;
}

/** One rubric dimension the instructor writes. */
export interface DimensionInput {
  key: string;
  name: string;
  description: string;
  /** What it judges: the teacher's prompt, or the model's output (PRD 9.1). */
  kind: 'prompt' | 'result';
  weight: number;
}

export interface ActivityInput {
  title: string;
  statement: string;
  maxAttempts: number;
  dimensions: DimensionInput[];
  /** Each group is a set of synonyms — matching any one of them counts. */
  requiredTerms: string[][];
  minLength: number;
  requiresFormat: boolean;
  requiresRole: boolean;
}

/** Where to PUT the file, and the key the server chose for it. */
export interface MediaUpload {
  uploadUrl: string;
  reference: string;
  expiresIn: number;
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

  async inbox(courseId?: string, offset = 0): Promise<Page<ReviewItem>> {
    const params = new URLSearchParams({ offset: String(offset) });
    if (courseId) params.set('course_id', courseId);

    const page = await this.http.get<
      PageDto<{
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
      }>
    >(`/instructor/submissions?${params}`);

    return mapPage(page, (row) => ({
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

  async prepareMedia(
    courseId: string,
    lessonId: string,
    contentType: string,
  ): Promise<MediaUpload> {
    const dto = await this.http.post<{
      upload_url: string;
      reference: string;
      expires_in: number;
    }>(
      `/instructor/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(
        lessonId,
      )}/media`,
      { content_type: contentType },
    );

    return {
      uploadUrl: dto.upload_url,
      reference: dto.reference,
      expiresIn: dto.expires_in,
    };
  }

  async attachMedia(
    courseId: string,
    lessonId: string,
    reference: string | null,
  ): Promise<void> {
    await this.http.put<void>(
      `/instructor/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(
        lessonId,
      )}/media`,
      { reference },
    );
  }

  async addActivity(
    courseId: string,
    moduleId: string,
    input: ActivityInput,
  ): Promise<string> {
    const dto = await this.http.post<{ id: string }>(
      `/instructor/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(
        moduleId,
      )}/activities`,
      {
        title: input.title,
        statement: input.statement,
        max_attempts: input.maxAttempts,
        dimensions: input.dimensions,
        required_terms: input.requiredTerms,
        min_length: input.minLength,
        requires_format: input.requiresFormat,
        requires_role: input.requiresRole,
      },
    );

    return dto.id;
  }

  async detail(courseId: string): Promise<Course> {
    // The instructor's own endpoint, not the public catalogue: that one answers
    // 404 for a draft, which is exactly what is being edited here.
    return toCatalogCourse(
      await this.http.get<CourseDetailDto>(
        `/instructor/courses/${encodeURIComponent(courseId)}/detail`,
      ),
    );
  }
}

export const instructorRepository = new HttpInstructorRepository();
