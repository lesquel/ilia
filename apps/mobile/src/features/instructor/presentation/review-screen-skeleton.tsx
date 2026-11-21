import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneLines, Skeleton } from '@/core/ui/skeleton';

const PLACEHOLDER_ROWS = 3;

/**
 * The review inbox rows before they arrive: student, activity line, the prompt
 * excerpt, the score and the correction link, in the same tinted card each
 * submission uses. It sits under the header the screen already shows.
 */
export function ReviewScreenSkeleton() {
  const theme = useTheme();

  return (
    <Skeleton label="Cargando entregas" style={styles.list}>
      {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
        <View
          key={index}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.neutral[100],
              borderColor: theme.colors.divider,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Bone height={18} width="45%" />
          <Bone height={13} width="60%" />
          <View style={styles.prompt}>
            <BoneLines lines={3} height={13} lastWidth="70%" />
          </View>
          <View style={styles.scores}>
            <Bone width={80} height={22} />
            <Bone width={84} height={14} />
          </View>
          <Bone width={130} height={15} />
        </View>
      ))}
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  list: { gap: 13.6 },
  card: { borderWidth: 1, padding: 20.4, gap: 6.8 },
  prompt: { marginVertical: 3.4 },
  scores: { flexDirection: 'row', alignItems: 'center', gap: 13.6 },
});
