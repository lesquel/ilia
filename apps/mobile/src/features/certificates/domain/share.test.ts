import { describe, expect, it } from 'vitest';

import type { Certificate } from './entities';
import { qrMatrix, shareMessage, verificationUrl } from './share';

const certificate: Certificate = {
  id: 'c1',
  code: 'ILIA-7K2Q',
  courseTitle: 'IA en el aula',
  holderName: 'Ana Pérez',
  issuedAt: '2026-03-14T12:00:00Z',
  status: 'valid',
};

describe('verificationUrl', () => {
  it('joins the origin and the verify route', () => {
    expect(verificationUrl('https://ilia.app', 'ILIA-7K2Q')).toBe('https://ilia.app/verify/ILIA-7K2Q');
  });

  it('trims trailing slashes from the origin', () => {
    expect(verificationUrl('https://ilia.app//', 'ABC')).toBe('https://ilia.app/verify/ABC');
  });

  it('encodes the code so it stays one path segment', () => {
    expect(verificationUrl('https://ilia.app', 'a b/c')).toBe('https://ilia.app/verify/a%20b%2Fc');
  });
});

describe('shareMessage', () => {
  it('names the course, the holder and the link', () => {
    const url = 'https://ilia.app/verify/ILIA-7K2Q';
    const message = shareMessage(certificate, url);
    expect(message).toContain('IA en el aula');
    expect(message).toContain('Ana Pérez');
    expect(message).toContain(url);
  });
});

describe('qrMatrix', () => {
  it('is square and not empty', () => {
    const matrix = qrMatrix('https://ilia.app/verify/ILIA-7K2Q');
    expect(matrix.size).toBeGreaterThan(0);
    expect(matrix.rows).toHaveLength(matrix.size);
    for (const row of matrix.rows) expect(row).toHaveLength(matrix.size);
    expect(matrix.rows.flat().some(Boolean)).toBe(true);
  });

  it('is deterministic for the same text', () => {
    const text = 'https://ilia.app/verify/ILIA-7K2Q';
    const first = qrMatrix(text);
    const second = qrMatrix(text);
    // 34 chars at level M fits version 3: 29 modules a side.
    expect(first.size).toBe(29);
    expect(second.rows).toEqual(first.rows);
  });

  it('marks the top-left finder pattern dark', () => {
    const { rows } = qrMatrix('https://ilia.app/verify/X');
    expect(rows[0][0]).toBe(true);
    expect(rows[0][6]).toBe(true);
    expect(rows[1][1]).toBe(false);
  });
});
