import { GuestOnly } from '@/features/auth/presentation/guest-only';
import { ForgotPasswordScreen } from '@/features/auth/presentation/forgot-password-screen';

export default function ForgotPassword() {
  return (
    <GuestOnly>
      <ForgotPasswordScreen />
    </GuestOnly>
  );
}
