import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneCard, BoneLines, Skeleton } from '@/core/ui/skeleton';

const CARDS = 2;

/**
 * The recipe cards while the device storage opens: title and score tag, the
 * saved date, the prompt and the two actions. The header above stays real.
 */
export function RecipesScreenSkeleton() {
  const theme = useTheme();

  return (
    <Skeleton label="Abriendo tu recetario" style={styles.group}>
      {Array.from({ length: CARDS }, (_, index) => (
        <BoneCard key={index} style={styles.card}>
          <View style={styles.header}>
            <Bone width="50%" height={16} />
            <Bone width={72} height={22} radius={theme.radius.sm} />
          </View>
          <Bone width={170} height={12} />
          <BoneLines lines={3} height={13} lastWidth="45%" />
          <View style={styles.actions}>
            <Bone width={100} height={40} radius={theme.radius.md} />
            <Bone width={90} height={40} radius={theme.radius.md} />
          </View>
        </BoneCard>
      ))}
    </Skeleton>
  );
}

// Mirrors the list and card in recipes-screen.tsx so nothing moves on load.
const styles = StyleSheet.create({
  group: { gap: 20.4 },
  // The real Card's padding, with the recipe card's own gap.
  card: { padding: 20.4, gap: 10.2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10.2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2 },
});
