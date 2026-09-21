/**
 * Teacher-facing certificate copy for the first charla.
 *
 * The credential is a code plus public verify. There is no PDF. The wording
 * must not sound like a ministry title or a download.
 */

export const CERTIFICATE_PROOF =
  'El certificado es un código. Cualquiera lo comprueba en la página de verificación. No hay PDF.';

export const PLAN_BLOCKS_CERTIFICATE = 'El certificado no está en tu plan.';

export const CERTIFICATE_PLAN_FEATURE = 'Certificado con código de verificación';

/** Wording the Completo plan description must use when it mentions certificates. */
export const PLAN_PRO_DESCRIPTION =
  'Todas las rutas, cupo amplio de evaluaciones, certificado con código de verificación y participación en el foro.';

const BANNED_CERTIFICATE_COPY = /oficial|ministerio|mineduc|uleam|descarga|\bbajar\b/i;

export function certificateCopyIsHonest(text: string): boolean {
  return !BANNED_CERTIFICATE_COPY.test(text);
}
