import { describe, expect, it } from 'vitest';

import { labMascotMotion, pageEntryOffset, quizFeedbackDelay, quizMascotReaction } from './lesson-motion';

describe('lesson motion', () => {
  it('celebrates a passing quiz', () => {
    expect(quizMascotReaction(true)).toEqual({ mood: 'celebrate', motion: 'celebrate' });
  });

  it('gives a brief playful reaction to a missed quiz', () => {
    expect(quizMascotReaction(false)).toEqual({ mood: 'angry', motion: 'shake' });
  });

  it('enters the next and previous page from opposite sides', () => {
    expect(pageEntryOffset('forward')).toBe(14);
    expect(pageEntryOffset('backward')).toBe(-14);
  });

  it('gives each lab phase a motion that explains what is happening', () => {
    expect(labMascotMotion('composing')).toBe('write');
    expect(labMascotMotion('processing')).toBe('think');
    expect(labMascotMotion('revealed')).toBe('reveal');
    expect(labMascotMotion('idle')).toBe('none');
  });

  it('stages quiz feedback in reading order with a short capped delay', () => {
    expect(quizFeedbackDelay(0)).toBe(0);
    expect(quizFeedbackDelay(1)).toBe(55);
    expect(quizFeedbackDelay(5)).toBe(220);
    expect(quizFeedbackDelay(-1)).toBe(0);
  });
});
