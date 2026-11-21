import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { CommunityMemberScreen } from '@/features/forum/presentation/community-member-screen';

export default function CommunityMember() {
  return <RequireAuth><CommunityMemberScreen /></RequireAuth>;
}
