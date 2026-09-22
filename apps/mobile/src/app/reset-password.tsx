import { GuestOnly } from '@/features/auth/presentation/guest-only';
import { ResetPasswordScreen } from '@/features/auth/presentation/reset-password-screen';

export default function ResetPassword() {
  return (
    <GuestOnly>
      <ResetPasswordScreen />
    </GuestOnly>
  );
}
