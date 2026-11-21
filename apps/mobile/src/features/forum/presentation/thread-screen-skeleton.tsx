import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneCard, BoneLines, Skeleton } from '@/core/ui/skeleton';

const REPLIES = 2;

/** The author line: avatar, name and the facts beside it. */
function AuthorBone({ facts }: { facts: number[] }) {
  return (
    <View style={styles.facts}>
      <View style={styles.author}>
        <Bone circle height={28} />
        <Bone width={110} height={14} />
      </View>
      {facts.map((width, index) => (
        <Bone key={index} width={width} height={13} />
      ))}
    </View>
  );
}

/**
 * The discussion before it arrives, under the header the screen already shows:
 * the opening post card (author, facts, body) and the replies card.
 */
export function ThreadScreenSkeleton() {
  const theme = useTheme();

  return (
    <Skeleton label="Cargando la discusión" style={styles.group}>
      <BoneCard style={styles.question}>
        <Bone width="40%" height={18} />
        <AuthorBone facts={[70, 84]} />
        <BoneLines lines={4} height={14} gap={12} lastWidth="55%" />
      </BoneCard>

      <BoneCard style={styles.card}>
        <Bone width="30%" height={18} />
        <View>
          {Array.from({ length: REPLIES }, (_, index) => (
            <View
              key={index}
              style={[
                styles.post,
                index > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.divider } : undefined,
              ]}
            >
              <AuthorBone facts={[70]} />
              <BoneLines lines={2} height={13} gap={10} lastWidth="70%" />
            </View>
          ))}
        </View>
      </BoneCard>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  group: { gap: 20.4 },
  question: { padding: 20.4, gap: 16 },
  card: { padding: 20.4, gap: 13.6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 13.6, rowGap: 3.4 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  post: { gap: 6.8, paddingVertical: 10.2 },
});
