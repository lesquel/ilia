import { describe, expect, it } from "vitest";

import { callToAction, type CourseProgress } from "./entities";

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
