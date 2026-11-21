import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneCard, Skeleton } from '@/core/ui/skeleton';

/**
 * The verdict card while the code is looked up: the glyph, the sentence and the
 * tag, the holder's name and the two facts. The search form above stays real.
 */
export function VerifyScreenSkeleton() {
  const theme = useTheme();

  return (
    <Skeleton label="Buscando el certificado">
      <BoneCard style={styles.card}>
        <View style={styles.head}>
          <Bone width={44} height={44} radius={theme.radius.md} />
          <Bone width="45%" height={18} />
          <Bone width={64} height={22} radius={theme.radius.sm} />
        </View>
        <Bone width="60%" height={24} />
        <View style={styles.facts}>
          <Bone width={160} height={12} />
          <Bone width={140} height={12} />
        </View>
      </BoneCard>
    </Skeleton>
  );
}

// Mirrors the Verdict card in verify-screen.tsx so nothing moves on load.
const styles = StyleSheet.create({
  // The real Card's padding and gap.
  card: { padding: 20.4, gap: 13.6 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 13.6, rowGap: 3.4 },
});
