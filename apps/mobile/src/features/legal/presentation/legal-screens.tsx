import { PRIVACY_POLICY, TERMS_OF_USE } from '@/features/legal/domain/legal-content';
import { LegalDocumentScreen } from '@/features/legal/presentation/legal-document-screen';

export function TermsScreen() {
  return (
    <LegalDocumentScreen
      document={TERMS_OF_USE}
      related={{ label: 'Leer la Política de privacidad', href: '/privacy' }}
    />
  );
}

export function PrivacyScreen() {
  return (
    <LegalDocumentScreen
      document={PRIVACY_POLICY}
      related={{ label: 'Leer los Términos de uso', href: '/terms' }}
    />
  );
}
