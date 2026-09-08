/** Certificates domain. Plain TypeScript, shared by all platforms. */

export type CertificateStatus = 'valid' | 'revoked';

export interface Certificate {
  id: string;
  code: string;
  courseTitle: string;
  holderName: string;
  issuedAt: string | null;
  status: CertificateStatus;
}

export interface Eligibility {
  met: boolean;
  lessonsTotal: number;
  lessonsCompleted: number;
  activitiesTotal: number;
  activitiesPassed: number;
  /** What is still missing, in words a teacher can act on. */
  missing: string[];
}

/**
 * What a public verification reveals.
 *
 * Deliberately minimal — no email, no id, no progress. Checking a certificate
 * must not become a way to look someone up.
 */
export interface Verification {
  valid: boolean;
  status: CertificateStatus;
  holderName: string;
  courseTitle: string;
  issuedAt: string | null;
  revokedReason: string | null;
}

export function formatIssueDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}
