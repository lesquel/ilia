import { describe, expect, it } from 'vitest';

import {
  CERTIFICATE_PLAN_FEATURE,
  CERTIFICATE_PROOF,
  PLAN_BLOCKS_CERTIFICATE,
  PLAN_PRO_DESCRIPTION,
  certificateCopyIsHonest,
} from './copy';

describe('first-charla certificate copy', () => {
  it.each([
    CERTIFICATE_PROOF,
    PLAN_BLOCKS_CERTIFICATE,
    CERTIFICATE_PLAN_FEATURE,
    PLAN_PRO_DESCRIPTION,
  ])('does not promise an official or downloadable credential: %s', (line) => {
    expect(certificateCopyIsHonest(line)).toBe(true);
  });

  it('rejects a plan description that still promises a download', () => {
    expect(
      certificateCopyIsHonest(
        'Todas las rutas, cupo amplio de evaluaciones, certificado descargable y participación en el foro.',
      ),
    ).toBe(false);
  });

  it('says the proof is a code anyone can check', () => {
    expect(CERTIFICATE_PROOF.toLowerCase()).toContain('código');
    expect(CERTIFICATE_PROOF.toLowerCase()).toMatch(/verific/);
    expect(CERTIFICATE_PROOF).toMatch(/no hay pdf/i);
  });
});
