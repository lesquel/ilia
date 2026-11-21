/** Sharing a certificate: the public link, the message, and the QR modules. */
import { create } from 'qrcode';

import { formatIssueDate, type Certificate } from './entities';

/** The public page where anyone can check the certificate. */
export function verificationUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/verify/${encodeURIComponent(code)}`;
}

/** What goes out with the link, in the holder's words. */
export function shareMessage(certificate: Certificate, url: string): string {
  const date = formatIssueDate(certificate.issuedAt);
  const issued = date ? `, emitido el ${date}` : '';
  return (
    `Certificado de ${certificate.holderName} por el curso «${certificate.courseTitle}»${issued}. ` +
    `Puedes verificarlo aquí: ${url}`
  );
}

export interface QrMatrix {
  size: number;
  /** `rows[row][col]` is true for a dark module. */
  rows: boolean[][];
}

/** The QR modules for `text`, at error-correction level M. */
export function qrMatrix(text: string): QrMatrix {
  const { modules } = create(text, { errorCorrectionLevel: 'M' });
  const rows = Array.from({ length: modules.size }, (_, row) =>
    Array.from({ length: modules.size }, (_, col) => modules.get(row, col) === 1),
  );
  return { size: modules.size, rows };
}
