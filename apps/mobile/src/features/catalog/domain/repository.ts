import type { CatalogFilters, Course, CoursePage } from './entities';

export interface CatalogRepository {
  browse(input: CatalogFilters & { cursor?: string; limit?: number }): Promise<CoursePage>;
  getBySlug(slug: string): Promise<Course>;
}
