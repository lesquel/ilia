import { TermsScreen } from '@/features/legal';

// Public: no RequireAuth or GuestOnly. Readable before and after signing in.
export default function Terms() {
  return <TermsScreen />;
}
