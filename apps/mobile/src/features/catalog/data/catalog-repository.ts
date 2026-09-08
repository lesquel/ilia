import { HttpClient, httpClient } from '@/core/api/http-client';
import type { CatalogFilters, Course, CoursePage } from '@/features/catalog/domain/entities';
import type { CatalogRepository } from '@/features/catalog/domain/repository';

import { type CourseDetailDto, type CoursePageDto, toCourse, toCoursePage } from './dto';

export class HttpCatalogRepository implements CatalogRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async browse({
    level,
    query,
    cursor,
    limit,
  }: CatalogFilters & { cursor?: string; limit?: number }): Promise<CoursePage> {
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    if (query?.trim()) params.set('q', query.trim());
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', String(limit));

    const search = params.toString();
    const dto = await this.http.get<CoursePageDto>(
      `/catalog/courses${search ? `?${search}` : ''}`,
    );

    return toCoursePage(dto);
  }

  async getBySlug(slug: string): Promise<Course> {
    // The slug goes in the path, so it is encoded rather than interpolated raw.
    const dto = await this.http.get<CourseDetailDto>(
      `/catalog/courses/${encodeURIComponent(slug)}`,
    );

    return toCourse(dto);
  }
}

export const catalogRepository = new HttpCatalogRepository();
