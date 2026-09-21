import { describe, expect, it } from 'vitest';

import {
  CERTIFICATE_PLAN_FEATURE,
  CERTIFICATE_PROOF,
  PLAN_BLOCKS_CERTIFICATE,
} from './copy';

const BANNED = /oficial|ministerio|mineduc|uleam|descarga/i;

describe('first-charla certificate copy', () => {
  it.each([CERTIFICATE_PROOF, PLAN_BLOCKS_CERTIFICATE, CERTIFICATE_PLAN_FEATURE])(
    'does not promise an official or downloadable credential: %s',
    (line) => {
      expect(line).not.toMatch(BANNED);
    },
  );

  it('says the proof is a code anyone can check', () => {
    expect(CERTIFICATE_PROOF.toLowerCase()).toContain('código');
    expect(CERTIFICATE_PROOF.toLowerCase()).toMatch(/verific/);
    expect(CERTIFICATE_PROOF).toMatch(/no hay pdf/i);
  });
});
