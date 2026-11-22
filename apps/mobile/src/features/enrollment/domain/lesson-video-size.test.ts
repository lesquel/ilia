import { describe, expect, it } from 'vitest';

import { lessonVideoMaxWidth } from './lesson-video-size';

describe('lessonVideoMaxWidth', () => {
  it('shrinks the video on a short desktop window so the idea text stays in view', () => {
    // 1080 tall: 1080 - 470 reserved = 610 tall at most → 1084 wide; the column caps it.
    expect(lessonVideoMaxWidth({ windowHeight: 1080, columnMax: 860, isWide: true })).toBe(860);
    // 900 tall: 430 tall at most → 764 wide.
    expect(lessonVideoMaxWidth({ windowHeight: 900, columnMax: 860, isWide: true })).toBe(764);
  });

  it('never goes below a usable size on a very short window', () => {
    expect(lessonVideoMaxWidth({ windowHeight: 600, columnMax: 860, isWide: true })).toBe(480);
  });

  it('leaves phones at the full column width, where the page scrolls anyway', () => {
    expect(lessonVideoMaxWidth({ windowHeight: 700, columnMax: 860, isWide: false })).toBe(860);
  });
});
