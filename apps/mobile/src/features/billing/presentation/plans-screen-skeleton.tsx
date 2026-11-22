import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneCard, BoneLines, Skeleton } from '@/core/ui/skeleton';
import { useIsWide } from '@/core/ui/surface';

const PLANS = 2;
const FEATURES = 5;

/**
 * The plans before they load: the header, then the plan cards (side by side
 * when wide) with name, price, description and the five feature lines, and
 * the closing note.
 */
export function PlansScreenSkeleton() {
  const theme = useTheme();
  const isWide = useIsWide();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <Skeleton label="Cargando los planes" style={styles.content}>
        <Bone width={140} height={30} radius={theme.radius.md} />

        <View style={isWide ? styles.plansWide : styles.plans}>
          {Array.from({ length: PLANS }, (_, plan) => (
            <BoneCard key={plan} style={styles.card}>
              <View style={styles.planHead}>
                <Bone width="40%" height={22} />
                <Bone width={110} height={16} />
                <BoneLines lines={2} height={13} lastWidth="70%" />
              </View>
              <View style={[styles.features, { borderTopColor: theme.colors.divider }]}>
                {Array.from({ length: FEATURES }, (_, index) => (
                  <View key={index} style={styles.feature}>
                    <Bone width={16} height={16} radius={theme.radius.sm} />
                    <Bone width={index % 2 === 0 ? '60%' : '45%'} height={13} />
                    <View style={styles.spacer} />
                    <Bone width={64} height={12} />
                  </View>
                ))}
              </View>
            </BoneCard>
          ))}
        </View>

        <BoneLines lines={2} height={11} lastWidth="50%" />
      </Skeleton>
    </View>
  );
}

// Mirrors the frame, row and card in plans-screen.tsx so nothing moves on load.
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 20.4,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    gap: 20.4,
  },
  plans: { gap: 13.6 },
  plansWide: { flexDirection: 'row', alignItems: 'stretch', gap: 13.6 },
  // The real Card's padding and gap, in equal shares of the row.
  card: { flex: 1, minWidth: 0, padding: 20.4, gap: 13.6 },
  planHead: { gap: 6.8 },
  features: { gap: 10.2, paddingTop: 13.6, borderTopWidth: 1 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 10.2 },
  spacer: { flex: 1 },
});
