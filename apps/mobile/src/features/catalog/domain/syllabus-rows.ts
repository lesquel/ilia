import { nextOpenSyllabusItem, type LessonKind, type Module } from './entities';

export type SyllabusRowState = 'done' | 'current' | 'next';

export interface SyllabusRow {
  id: string;
  kind: 'lesson' | 'activity';
  title: string;
  /** Lessons are numbered across the whole course; a practice has no number. */
  number: number | undefined;
  state: SyllabusRowState;
  /** Lessons only. */
  lessonKind?: LessonKind;
  durationSeconds?: number;
}

export interface SyllabusGroup {
  module: Module;
  rows: SyllabusRow[];
}

/**
 * Each syllabus row with its state: done, the one current item (the next open
 * lesson or practice), or still ahead. A visitor has nothing done or current.
 */
export function syllabusRows(
  modules: readonly Module[],
  completedLessonIds: readonly string[],
  passedActivityIds: readonly string[],
  isEnrolled: boolean,
): SyllabusGroup[] {
  const currentId = isEnrolled
    ? nextOpenSyllabusItem([...modules], completedLessonIds, passedActivityIds)?.id
    : undefined;
  const stateOf = (id: string, isDone: boolean): SyllabusRowState => {
    if (!isEnrolled) return 'next';
    if (isDone) return 'done';
    return id === currentId ? 'current' : 'next';
  };

  let lessonNumber = 0;
  return modules.map((module) => ({
    module,
    rows: [
      ...module.lessons.map((lesson): SyllabusRow => {
        lessonNumber += 1;
        return {
          id: lesson.id,
          kind: 'lesson',
          title: lesson.title,
          number: lessonNumber,
          state: stateOf(lesson.id, completedLessonIds.includes(lesson.id)),
          lessonKind: lesson.kind,
          durationSeconds: lesson.durationSeconds,
        };
      }),
      ...module.activities.map(
        (activity): SyllabusRow => ({
          id: activity.id,
          kind: 'activity',
          title: activity.title,
          number: undefined,
          state: stateOf(activity.id, passedActivityIds.includes(activity.id)),
        }),
      ),
    ],
  }));
}

export interface CourseAdvance {
  done: number;
  total: number;
  percentage: number;
  next: Pick<SyllabusRow, 'id' | 'kind' | 'title' | 'number'> | undefined;
}

/** "Tu avance · N de M lecciones", counted against this syllabus. */
export function courseAdvance(
  modules: readonly Module[],
  completedLessonIds: readonly string[],
  passedActivityIds: readonly string[],
  isEnrolled: boolean,
): CourseAdvance {
  const rows = syllabusRows(modules, completedLessonIds, passedActivityIds, isEnrolled).flatMap(
    (group) => group.rows,
  );
  const lessons = rows.filter((row) => row.kind === 'lesson');
  const done = lessons.filter((row) => row.state === 'done').length;
  const total = lessons.length;
  const current = rows.find((row) => row.state === 'current');

  return {
    done,
    total,
    percentage: total === 0 ? 0 : Math.round((done / total) * 100),
    next: current
      ? { id: current.id, kind: current.kind, title: current.title, number: current.number }
      : undefined,
  };
}

/** The progress card's button; undefined once nothing is left. */
export function continueLabel(advance: CourseAdvance): string | undefined {
  const { next } = advance;
  if (!next) return undefined;
  if (next.kind === 'activity') return 'Ir a la práctica';
  return `${advance.done === 0 ? 'Empezar' : 'Continuar'} · lección ${next.number}`;
}

/** The kind most of the course's lessons are, for the hero's chip. */
export function dominantLessonKind(modules: readonly Module[]): LessonKind | undefined {
  const counts = new Map<LessonKind, number>();
  const order: LessonKind[] = [];
  for (const lesson of modules.flatMap((module) => module.lessons)) {
    if (!counts.has(lesson.kind)) order.push(lesson.kind);
    counts.set(lesson.kind, (counts.get(lesson.kind) ?? 0) + 1);
  }
  let best: LessonKind | undefined;
  for (const kind of order) {
    if (best === undefined || (counts.get(kind) ?? 0) > (counts.get(best) ?? 0)) best = kind;
  }
  return best;
}
