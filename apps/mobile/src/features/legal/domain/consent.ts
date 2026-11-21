/**
 * Registration needs the person to accept the Terms of Use and the Privacy
 * Policy. Client-side only: the API does not record the acceptance yet.
 */
export const CONSENT_REQUIRED_MESSAGE =
  'Para crear tu cuenta, acepta los Términos de uso y la Política de privacidad.';

export interface ConsentGate {
  allowed: boolean;
  message: string | null;
}

export function consentGate(accepted: boolean): ConsentGate {
  return accepted
    ? { allowed: true, message: null }
    : { allowed: false, message: CONSENT_REQUIRED_MESSAGE };
}
