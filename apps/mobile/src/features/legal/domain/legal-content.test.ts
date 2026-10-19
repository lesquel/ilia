import { describe, expect, it } from 'vitest';

import { CONSENT_REQUIRED_MESSAGE, consentGate } from './consent';
import { LEGAL_LAST_UPDATED, PRIVACY_POLICY, TERMS_OF_USE, type LegalDocument } from './legal-content';

function fullText(doc: LegalDocument): string {
  return [doc.title, doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join('\n');
}

describe('legal content', () => {
  it('dates both documents with the same last update', () => {
    expect(LEGAL_LAST_UPDATED).toBe('19 de octubre de 2026');
    expect(TERMS_OF_USE.lastUpdated).toBe(LEGAL_LAST_UPDATED);
    expect(PRIVACY_POLICY.lastUpdated).toBe(LEGAL_LAST_UPDATED);
  });

  it('keeps the controller and contact placeholders until the real data is known', () => {
    const privacy = fullText(PRIVACY_POLICY);
    expect(privacy).toContain('[RESPONSABLE]');
    expect(privacy).toContain('[EMAIL DE CONTACTO]');
    expect(fullText(TERMS_OF_USE)).toContain('[EMAIL DE CONTACTO]');
  });

  it('grounds the privacy policy in the Ecuadorian data protection law', () => {
    const privacy = fullText(PRIVACY_POLICY);
    expect(privacy).toContain('Ley Orgánica de Protección de Datos Personales');
    for (const right of ['acceso', 'rectificación', 'eliminación', 'oposición', 'portabilidad']) {
      expect(privacy.toLowerCase()).toContain(right);
    }
  });

  it('tells users that AI feedback is assistive and can be wrong', () => {
    expect(fullText(TERMS_OF_USE)).toMatch(/puede contener errores/);
  });

  it('gives every section a heading and at least one paragraph', () => {
    for (const doc of [TERMS_OF_USE, PRIVACY_POLICY]) {
      for (const section of doc.sections) {
        expect(section.heading.trim()).not.toBe('');
        expect(section.paragraphs.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('consentGate', () => {
  it('blocks registration until the terms are accepted', () => {
    expect(consentGate(false)).toEqual({ allowed: false, message: CONSENT_REQUIRED_MESSAGE });
  });

  it('lets registration through once the terms are accepted', () => {
    expect(consentGate(true)).toEqual({ allowed: true, message: null });
  });
});
