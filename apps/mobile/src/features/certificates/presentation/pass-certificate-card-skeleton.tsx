import { StyleSheet } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, Skeleton } from '@/core/ui/skeleton';

/**
 * The bottom of the pass card while eligibility loads: a line and the issue
 * button's footprint, the answer most teachers who just passed will get. The
 * kicker, title and lede above it are already real.
 */
export function PassCertificateCardSkeleton() {
  const theme = useTheme();

  return (
    <Skeleton label="Revisando tu certificado" style={styles.group}>
      <Bone width="55%" height={14} />
      <Bone height={48} radius={theme.radius.md} style={styles.button} />
    </Skeleton>
  );
}

// Mirrors the card's gap and button in pass-certificate-card.tsx.
const styles = StyleSheet.create({
  group: { gap: 8 },
  button: { marginTop: 6 },
});
