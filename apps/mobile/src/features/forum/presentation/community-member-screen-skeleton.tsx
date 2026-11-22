import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, BoneCard, Skeleton } from '@/core/ui/skeleton';

const ACTIVITY_ROWS = 4;

/**
 * A participant's profile before it arrives, under the header the screen
 * already shows: the identity card (avatar, name, note) and the recent
 * activity card with its ruled rows.
 */
export function CommunityMemberScreenSkeleton() {
  const theme = useTheme();

  return (
    <Skeleton label="Cargando perfil" style={styles.group}>
      <BoneCard style={styles.card}>
        <View style={styles.identity}>
          <Bone circle height={72} />
          <View style={styles.identityCopy}>
            <Bone width="50%" height={22} />
            <Bone width="80%" height={14} />
          </View>
        </View>
      </BoneCard>

      <BoneCard style={styles.card}>
        <View style={styles.cardHead}>
          <Bone width="40%" height={18} />
          <Bone width="75%" height={13} />
        </View>
        <View>
          {Array.from({ length: ACTIVITY_ROWS }, (_, index) => (
            <View
              key={index}
              style={[
                styles.activity,
                { borderTopColor: index ? theme.colors.divider : 'transparent' },
              ]}
            >
              <Bone width={index % 2 === 0 ? '75%' : '60%'} height={14} />
              <Bone width="45%" height={13} />
            </View>
          ))}
        </View>
      </BoneCard>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  group: { gap: 18 },
  card: { padding: 20.4, gap: 13.6 },
  cardHead: { gap: 6 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 8 },
  identityCopy: { flex: 1, gap: 8 },
  activity: { paddingVertical: 13, borderTopWidth: 1, gap: 6 },
});
