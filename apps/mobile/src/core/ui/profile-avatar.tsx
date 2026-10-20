import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { isProfileAvatarKey, type ProfileAvatarKey } from '@/features/auth/domain/entities';

export function ProfileAvatar({
  name,
  avatarKey,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarKey: ProfileAvatarKey | null;
  avatarUrl: string | null;
  size?: number;
}) {
  const theme = useTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const illustrated = avatarKey && isProfileAvatarKey(avatarKey);
  const showPhoto = Boolean(avatarUrl && !illustrated && failedUrl !== avatarUrl);
  const colors = illustrationColors(avatarKey);

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.neutral[100] },
      ]}
    >
      {showPhoto ? (
        <Image
          source={{ uri: avatarUrl! }}
          cachePolicy="none"
          contentFit="cover"
          onError={() => setFailedUrl(avatarUrl)}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : illustrated ? (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Circle cx="32" cy="32" r="32" fill={colors.background} />
          {avatarKey!.startsWith('colibri') ? (
            <>
              <Ellipse cx="31" cy="35" rx="11" ry="16" fill={colors.body} transform="rotate(20 31 35)" />
              <Ellipse cx="26" cy="27" rx="9" ry="15" fill={colors.wing} transform="rotate(-35 26 27)" />
              <Circle cx="36" cy="21" r="8" fill={colors.body} />
              <Circle cx="39" cy="19" r="1.5" fill="#111111" />
              <Polygon points="43,21 60,25 43,25" fill="#d58b35" />
              <Path d="M24 46 L15 57 L29 49" fill={colors.wing} />
            </>
          ) : avatarKey === 'sol' ? (
            <>
              {Array.from({ length: 8 }, (_, index) => (
                <Rect
                  key={index}
                  x="29"
                  y="7"
                  width="6"
                  height="11"
                  rx="3"
                  fill="#f0a92e"
                  transform={`rotate(${index * 45} 32 32)`}
                />
              ))}
              <Circle cx="32" cy="32" r="15" fill="#ffd95b" />
              <Circle cx="27" cy="30" r="1.5" fill="#423225" />
              <Circle cx="37" cy="30" r="1.5" fill="#423225" />
              <Path d="M27 36 Q32 41 37 36" fill="none" stroke="#423225" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : avatarKey === 'estrella' ? (
            <>
              <Polygon points="32,9 38,25 55,25 42,35 47,52 32,42 17,52 22,35 9,25 26,25" fill="#f4bd42" />
              <Circle cx="28" cy="31" r="1.4" fill="#423225" />
              <Circle cx="36" cy="31" r="1.4" fill="#423225" />
              <Path d="M28 36 Q32 40 36 36" fill="none" stroke="#423225" strokeWidth="1.8" strokeLinecap="round" />
            </>
          ) : avatarKey === 'montana' ? (
            <>
              <Circle cx="45" cy="18" r="7" fill="#efbd4b" />
              <Polygon points="3,54 26,21 48,54" fill="#709874" />
              <Polygon points="22,54 43,27 63,54" fill="#52755d" />
              <Polygon points="20,30 26,21 32,30 27,28 25,32" fill="#ffffff" />
              <Polygon points="38,34 43,27 49,35 44,33 42,36" fill="#ffffff" />
            </>
          ) : (
            <>
              <Path d="M32 48 C9 37 13 18 25 20 C31 21 32 28 32 28 C32 28 34 17 44 20 C57 24 48 41 32 48Z" fill={colors.body} />
              <Circle cx="32" cy="31" r="7" fill="#f5d66b" />
              <Circle cx="32" cy="31" r="3" fill="#d99641" />
              <Path d="M31 48 Q23 53 24 59 M33 48 Q41 53 40 59" fill="none" stroke="#547b55" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
        </Svg>
      ) : (
        <Text
          style={[
            styles.initial,
            {
              color: '#ffffff',
              fontSize: Math.round(size * 0.42),
              lineHeight: size,
              width: size,
              ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
            },
          ]}
        >
          {initialOf(name)}
        </Text>
      )}
    </View>
  );
}

function initialOf(name: string): string {
  return name.trim().split(/\s+/)[0]?.charAt(0).toLocaleUpperCase('es') || '?';
}

function illustrationColors(key: ProfileAvatarKey | null) {
  const variants: Record<ProfileAvatarKey, { background: string; body: string; wing: string }> = {
    colibri: { background: '#d9eff2', body: '#168c88', wing: '#43b9a9' },
    estrella: { background: '#fff0c9', body: '#eab746', wing: '#ffe07c' },
    montana: { background: '#e2eee0', body: '#66846b', wing: '#8daf7f' },
    sol: { background: '#fff0c9', body: '#f0ad32', wing: '#ffd95b' },
    orquidea: { background: '#f6e4f0', body: '#bd6da0', wing: '#dc9bc0' },
    'colibri-azul': { background: '#e0ebfa', body: '#3979b8', wing: '#73a5dc' },
    'colibri-verde': { background: '#e2eee0', body: '#558b54', wing: '#8ab875' },
    'colibri-coral': { background: '#ffebe4', body: '#da786b', wing: '#f2a092' },
  };
  return key && isProfileAvatarKey(key)
    ? variants[key]
    : { background: '#0e58d6', body: '#ffffff', wing: '#ffffff' };
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  initial: { backgroundColor: '#0e58d6', fontWeight: '700', textAlign: 'center' },
});
