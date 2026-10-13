import { describe, expect, it } from 'vitest';

import {
  barWidth,
  dayLabel,
  enrollmentsSentence,
  insightsSummary,
  latestDays,
  percentOf,
  progressRows,
  type CourseInsights,
} from './entities';
import { slugify } from './entities';

/**
 * The exact rule the API enforces (`app/features/catalog/domain/entities.py`).
 * Duplicated here on purpose: this test exists to catch the two sides drifting
 * apart, and importing the rule from one of them would defeat that.
 */
const BACKEND_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('slugify', () => {
  it('produces a slug the API will accept', () => {
    expect(slugify('Prompting para docentes')).toBe('prompting-para-docentes');
    expect(BACKEND_SLUG.test(slugify('Prompting para docentes'))).toBe(true);
  });

  it('strips accents rather than percent-encoding them into the URL', () => {
    // `Prompting básico` must not become `prompting-b%C3%A1sico`.
    expect(slugify('Prompting básico')).toBe('prompting-basico');
    expect(slugify('Evaluación asistida por IA')).toBe('evaluacion-asistida-por-ia');
    expect(slugify('Diseño de ñandúes')).toBe('diseno-de-nandues');
  });

  it('collapses punctuation and repeated separators', () => {
    expect(slugify('¿Qué es un prompt?')).toBe('que-es-un-prompt');
    expect(slugify('IA  —  para   el aula')).toBe('ia-para-el-aula');
  });

  it('never leaves a leading or trailing hyphen', () => {
    expect(slugify('  ¡Hola!  ')).toBe('hola');
    expect(slugify('---IA---')).toBe('ia');
  });

  it('stays valid when a long title is truncated', () => {
    // The cut is applied after trimming, so a title long enough for the limit
    // to land on a separator used to produce a trailing hyphen — which the API
    // rejects, turning a long course title into a 400 the instructor cannot
    // explain.
    const title = `${'a'.repeat(159)} bcdef`;
    const slug = slugify(title);

    expect(slug.endsWith('-')).toBe(false);
    expect(BACKEND_SLUG.test(slug)).toBe(true);
  });

  it('answers with an empty string when there is nothing to slug', () => {
    // Not a valid slug, and it must not pretend otherwise: the caller has to
    // see that the title gave nothing and ask for another one.
    expect(slugify('¿?¡!')).toBe('');
    expect(slugify('')).toBe('');
  });
});

function insights(over: Partial<CourseInsights> = {}): CourseInsights {
  return {
    enrolled: 0,
    finished: 0,
    inProgress: 0,
    notStarted: 0,
    completionRate: 0,
    lessons: [],
    activities: [],
    enrollmentsByDay: [],
    lastActivityAt: null,
    ...over,
  };
}

describe('percentOf', () => {
  it('rounds to a whole percent', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(12, 12)).toBe(100);
  });

  it('answers zero when there is nobody to divide by', () => {
    // An empty course is 0%, not NaN% on a tile.
    expect(percentOf(0, 0)).toBe(0);
    expect(percentOf(3, 0)).toBe(0);
  });

  it('never leaves the 0–100 range', () => {
    // A lesson can hold completions from people who later left the course.
    expect(percentOf(5, 4)).toBe(100);
    expect(percentOf(-1, 4)).toBe(0);
  });
});

describe('barWidth', () => {
  it('is the share of the track the bar fills', () => {
    expect(barWidth(3, 12)).toBe('25%');
    expect(barWidth(12, 12)).toBe('100%');
  });

  it('draws nothing for zero rather than a sliver that reads as someone', () => {
    expect(barWidth(0, 12)).toBe('0%');
    expect(barWidth(0, 0)).toBe('0%');
  });
});

describe('dayLabel', () => {
  it('writes the day the API sent, whatever timezone the device is in', () => {
    // Parsed by hand: `new Date('2026-10-01')` is midnight UTC, which a device
    // in Ecuador renders as 30 sep.
    expect(dayLabel('2026-10-01')).toBe('1 oct');
    expect(dayLabel('2026-01-31')).toBe('31 ene');
  });

  it('hands back what it cannot read', () => {
    expect(dayLabel('ayer')).toBe('ayer');
  });
});

describe('enrollmentsSentence', () => {
  it('says it in words when every enrolment fell on one day', () => {
    expect(enrollmentsSentence([{ day: '2026-10-13', count: 4 }])).toBe(
      'Las 4 inscripciones llegaron el 13 oct.',
    );
    expect(enrollmentsSentence([{ day: '2026-10-13', count: 1 }])).toBe(
      'La única inscripción llegó el 13 oct.',
    );
  });

  it('leaves two or more days to the chart', () => {
    expect(
      enrollmentsSentence([
        { day: '2026-10-12', count: 1 },
        { day: '2026-10-13', count: 4 },
      ]),
    ).toBeNull();
  });

  it('has nothing to say about no enrolments', () => {
    expect(enrollmentsSentence([])).toBeNull();
  });
});

describe('latestDays', () => {
  it('keeps the most recent days, still in ascending order', () => {
    const days = [1, 2, 3, 4].map((day) => ({ day: `2026-10-0${day}`, count: day }));

    expect(latestDays(days, 2).map((item) => item.day)).toEqual(['2026-10-03', '2026-10-04']);
    expect(latestDays(days, 10)).toEqual(days);
  });
});

describe('progressRows', () => {
  it('lists lessons in the order given, then the practices by who passed', () => {
    const rows = progressRows(
      insights({
        lessons: [
          { lessonId: 'l1', title: 'Anatomía', moduleTitle: 'M1', completed: 8 },
          { lessonId: 'l2', title: 'Contexto', moduleTitle: 'M1', completed: 5 },
        ],
        activities: [
          { activityId: 'a1', title: 'Primer prompt', moduleTitle: 'M1', attempted: 4, passed: 2 },
        ],
      }),
    );

    expect(rows.map((row) => [row.title, row.count, row.isPractice])).toEqual([
      ['Anatomía', 8, false],
      ['Contexto', 5, false],
      ['Primer prompt', 2, true],
    ]);
  });
});

describe('insightsSummary', () => {
  it('says how many enrolled and how many finished', () => {
    expect(insightsSummary(insights({ enrolled: 12, finished: 3, completionRate: 25 }))).toBe(
      '12 inscritos · 3 terminaron (25%)',
    );
    expect(insightsSummary(insights({ enrolled: 1, finished: 1, completionRate: 100 }))).toBe(
      '1 inscrito · 1 terminó (100%)',
    );
  });

  it('says so when nobody has enrolled', () => {
    expect(insightsSummary(insights())).toBe('Todavía no hay nadie inscrito.');
  });
});
