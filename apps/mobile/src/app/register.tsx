import { GuestOnly } from '@/features/auth/presentation/guest-only';
import { RegisterScreen } from '@/features/auth/presentation/register-screen';

/** Route composition only — the screen itself lives in the auth feature. */
export default function Register() {
  return (
    <GuestOnly>
      <RegisterScreen />
    </GuestOnly>
  );
}
