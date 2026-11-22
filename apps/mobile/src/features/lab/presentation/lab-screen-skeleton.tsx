import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Bone, BoneCard, BoneLines, Skeleton } from '@/core/ui/skeleton';

/**
 * The lab activity before it loads: kicker, title and lede beside Lía, the
 * statement, then the sheet with the margin checklist (side by side when wide),
 * the foot with the submit button and the attempt history.
 */
export function LabScreenSkeleton() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <Skeleton label="Cargando la actividad" style={styles.content}>
        <Bone width={64} height={14} />

        <View style={styles.headingBlock}>
          <Bone width={180} height={13} />
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Bone width="75%" height={32} radius={theme.radius.md} />
              <Bone width="90%" height={17} />
            </View>
            <Bone circle height={88} />
          </View>
        </View>

        <View style={styles.statement}>
          <BoneLines lines={2} height={13} lastWidth="70%" />
        </View>

        <View style={[styles.folio, isWide ? styles.folioWide : undefined]}>
          <BoneCard style={[styles.paper, isWide ? styles.paperWide : undefined]}>
            <View style={styles.paperHint}>
              <Bone width={80} height={12} />
              <Bone width={90} height={12} />
            </View>
            <BoneLines lines={4} height={14} gap={10} lastWidth="40%" />
          </BoneCard>

          <BoneCard style={[styles.marginSlip, isWide ? styles.marginSlipWide : undefined]}>
            <Bone width={90} height={12} />
            {Array.from({ length: 4 }, (_, index) => (
              <View key={index} style={styles.marginRow}>
                <Bone width={12} height={12} radius={0} />
                <Bone width={index % 2 === 0 ? '70%' : '55%'} height={13} />
              </View>
            ))}
          </BoneCard>
        </View>

        <View style={styles.foot}>
          <View style={styles.metaText}>
            <BoneLines lines={2} height={12} lastWidth="50%" />
          </View>
          <Bone width={160} height={48} radius={theme.radius.md} />
        </View>

        <BoneCard>
          <Bone width={140} height={16} />
          <BoneLines lines={2} height={12} />
        </BoneCard>
      </Skeleton>
    </View>
  );
}

// Mirrors the frame and columns in lab-screen.tsx so nothing moves on load.
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 20.4,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 48,
    gap: 0,
  },
  headingBlock: { gap: 8, marginTop: 8, marginBottom: 12 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  headingCopy: { flex: 1, minWidth: 0, gap: 10 },
  statement: { marginBottom: 18, maxWidth: 560 },
  folio: { gap: 14, marginBottom: 16 },
  folioWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  paper: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 18,
    minHeight: 280,
    gap: 10,
  },
  paperWide: { flex: 1, minWidth: 0 },
  paperHint: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  marginSlip: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  marginSlipWide: { width: 260 },
  marginRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 4,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metaText: { flex: 1, minWidth: 200 },
});
