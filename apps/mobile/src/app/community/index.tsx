import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { CommunityScreen } from '@/features/forum/presentation/community-screen';

export default function Community() {
  return <RequireAuth><CommunityScreen /></RequireAuth>;
}
