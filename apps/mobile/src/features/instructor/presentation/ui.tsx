import { Link, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { STATUS_LABELS, type CourseStatus } from '@/features/instructor/domain/entities';

/**
 * The pieces the instructor screens share, so a card, an input and a status
 * read the same on the list, the editor and the roster.
 */

const RESTING_SHADOW = '0 10px 28px rgba(17, 17, 17, 0.06)';
const RAISED_SHADOW = '0 18px 40px rgba(27, 112, 254, 0.16)';

/** The web-only lift a card that is a link takes under the pointer. */
export function cardLift(raised: boolean): ViewStyle {
  if (Platform.OS !== 'web') return {};

  return {
    boxShadow: raised ? RAISED_SHADOW : RESTING_SHADOW,
    transform: [{ translateY: raised ? -3 : 0 }],
    transitionProperty: 'box-shadow, transform, border-color',
    transitionDuration: '160ms',
  } as unknown as ViewStyle;
}

export function Card({
  title,
  hint,
  children,
  style,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
        Platform.OS === 'web'
          ? ({ boxShadow: RESTING_SHADOW } as unknown as ViewStyle)
          : undefined,
        style,
      ]}
    >
      {title ? (
        <View style={styles.cardHead}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
          {hint ? (
            <Text style={[styles.cardHint, { color: theme.colors.neutral[600] }]}>{hint}</Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** A form that opens inside a card: framed, so it reads as one thing to finish. */
export function SubCard({ title, children }: { title?: string; children: ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.subCard,
        { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
      ]}
    >
      {title ? (
        <Text style={[styles.subCardTitle, { color: theme.colors.text }]}>{title}</Text>
      ) : null}
      {children}
    </View>
  );
}

/** A heading for a group of fields inside a form. */
export function FieldGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: theme.colors.text }]}>{title}</Text>
      {hint ? (
        <Text style={[styles.groupHint, { color: theme.colors.neutral[600] }]}>{hint}</Text>
      ) : null}
      {children}
    </View>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={[styles.label, { color: theme.colors.neutral[800] }]}>{children}</Text>;
}

/** A text input whose border takes the accent while it holds the focus. */
export function Field({ onFocus, onBlur, style, ...props }: TextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={theme.colors.neutral[500]}
      {...props}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        {
          backgroundColor: theme.colors.neutral[100],
          borderColor: focused ? theme.colors.accent : theme.colors.divider,
          color: theme.colors.text,
          borderRadius: theme.radius.md,
        },
        props.multiline ? styles.textarea : undefined,
        style,
      ]}
    />
  );
}

/**
 * Draft or published, said in a word.
 *
 * The mark is filled for a live course and hollow for the rest, so the two do
 * not depend on telling a blue pill from a grey one.
 */
export function StatusTag({ status }: { status: CourseStatus }) {
  const theme = useTheme();
  const live = status === 'published';
  const ink = live ? theme.colors.accentRamp[800] : theme.colors.neutral[800];

  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: live ? theme.colors.accentRamp[100] : theme.colors.neutral[200],
          borderRadius: theme.radius.sm,
        },
      ]}
    >
      <View
        style={[styles.tagMark, { borderColor: ink, backgroundColor: live ? ink : 'transparent' }]}
      />
      <Text style={[styles.tagLabel, { color: ink }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

export function Fact({ glyph, label }: { glyph: LucideIcon; label: string }) {
  const theme = useTheme();

  return (
    <View style={styles.fact}>
      <Icon glyph={glyph} size={14} color={theme.colors.neutral[600]} />
      <Text style={[styles.factLabel, { color: theme.colors.neutral[600] }]}>{label}</Text>
    </View>
  );
}

function OutlineFace({
  label,
  glyph,
  pressed,
  dimmed = false,
}: {
  label: string;
  glyph?: LucideIcon;
  pressed: boolean;
  dimmed?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.outline,
        {
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
          opacity: dimmed ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {glyph ? <Icon glyph={glyph} size={16} color={theme.colors.accent} /> : null}
      <Text style={[styles.outlineLabel, { color: theme.colors.text }]}>{label}</Text>
    </View>
  );
}

/** A secondary action: bordered, so it sits beside the primary without competing. */
export function OutlineButton({
  label,
  glyph,
  onPress,
  disabled = false,
}: {
  label: string;
  glyph?: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.outlineHit}
    >
      {({ pressed }) => (
        <OutlineFace label={label} glyph={glyph} pressed={pressed} dimmed={disabled} />
      )}
    </Pressable>
  );
}

/** The same face as `OutlineButton`, for a secondary destination. */
export function OutlineLink({
  label,
  glyph,
  href,
}: {
  label: string;
  glyph?: LucideIcon;
  href: Href;
}) {
  return (
    <Link href={href} asChild>
      {/* The look lives on the inner View: with `asChild` the Pressable becomes
          the anchor on web, and the anchor drops the Pressable's own style. */}
      <Pressable accessibilityRole="link">
        {({ pressed }) => <OutlineFace label={label} glyph={glyph} pressed={pressed} />}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 20.4, gap: 13.6 },
  cardHead: { gap: 3.4 },
  cardTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  cardHint: { fontSize: 13, lineHeight: 19 },
  subCard: { borderWidth: 1, padding: 13.6, gap: 6.8 },
  subCardTitle: { fontSize: 15, fontWeight: '700' },
  group: { gap: 3.4, marginTop: 10.2 },
  groupTitle: { fontSize: 14, fontWeight: '700' },
  groupHint: { fontSize: 12, lineHeight: 18 },
  label: { fontSize: 13, marginTop: 6.8, marginBottom: 3.4 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 13.6,
    paddingVertical: 10.2,
    fontSize: 15,
    // The field draws its own focus colour; the browser's ring would double it.
    outlineWidth: 0,
  },
  textarea: { minHeight: 90 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagMark: { width: 8, height: 8, borderWidth: 2 },
  tagLabel: { fontSize: 12, fontWeight: '700' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factLabel: { fontSize: 13 },
  outlineHit: { alignSelf: 'flex-start' },
  outline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6.8,
    borderWidth: 1,
    paddingVertical: 10.2,
    paddingHorizontal: 13.6,
    minHeight: 44,
  },
  outlineLabel: { fontSize: 14, fontWeight: '600' },
});
