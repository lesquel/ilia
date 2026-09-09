import { GuestOnly } from '@/features/auth/presentation/guest-only';
import { LoginScreen } from '@/features/auth/presentation/login-screen';

/** Route composition only — the screen itself lives in the auth feature. */
export default function Login() {
  return (
    <GuestOnly>
      <LoginScreen />
    </GuestOnly>
  );
}
