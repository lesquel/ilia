import { describe, expect, it } from "vitest";

import type { CourseSummary } from "@/features/catalog/domain/entities";

import {
  callToAction,
  enrolmentsBesides,
  type CourseProgress,
  type EnrolledCourse,
} from "./entities";

function progress(overrides: Partial<CourseProgress> = {}): CourseProgress {
  return {
    totalLessons: 2,
    completedLessons: 0,
    percentage: 0,
    isComplete: false,
    completedLessonIds: [],
    passedActivityIds: [],
    pendingActivityCount: 0,
    isFinished: false,
    nextLesson: null,
    ...overrides,
  };
}

function enrolled(id: string): EnrolledCourse {
  return {
    course: { id } as CourseSummary,
    enrolledAt: null,
    progress: progress(),
  };
}

describe("enrolmentsBesides", () => {
  it("leaves out the course the continue block already shows", () => {
    const [first, second, third] = [enrolled("a"), enrolled("b"), enrolled("c")];

    expect(enrolmentsBesides([first, second, third], second)).toEqual([first, third]);
  });

  it("lists nothing below when the featured course is the only enrolment", () => {
    const only = enrolled("a");

    expect(enrolmentsBesides([only], only)).toEqual([]);
  });

  it("keeps every enrolment when no course is featured", () => {
    const rows = [enrolled("a"), enrolled("b")];

    expect(enrolmentsBesides(rows, undefined)).toEqual(rows);
  });
});

describe("callToAction", () => {
  it("invites to enroll without progress", () => {
    expect(callToAction(null)).toBe("Inscribirme");
  });

  it("starts or continues by lessons", () => {
    expect(callToAction(progress())).toBe("Empezar");
    expect(
      callToAction(progress({ completedLessons: 1, percentage: 50 })),
    ).toBe("Continuar");
  });

  it("sends to the practice when lessons are done but a practice is pending", () => {
    const lessonsDone = progress({
      completedLessons: 2,
      percentage: 100,
      isComplete: true,
      pendingActivityCount: 1,
    });
    expect(callToAction(lessonsDone)).toBe("Hacer la práctica");
  });

  it("offers a review only when the course is finished", () => {
    const finished = progress({
      completedLessons: 2,
      percentage: 100,
      isComplete: true,
      isFinished: true,
    });
    expect(callToAction(finished)).toBe("Repasar el curso");
  });
});
