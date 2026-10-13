import type { LucideIcon } from 'lucide-react-native';
import { Search } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';

/**
 * The pieces the admin sections share, so a card, a field and a tag read the
 * same on every tab.
 *
 * They mirror the instructor screens' on purpose and are not imported from
 * there: a feature does not reach into another feature's presentation.
 */

const RESTING_SHADOW = '0 10px 28px rgba(17, 17, 17, 0.06)';

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

/** Whether there is room for a list to lay its rows out as columns. */
export function useIsWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= breakpoint.compact;
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
        style,
      ]}
    />
  );
}

/** The same field with a magnifier, for an input that filters a list. */
export function SearchField({ onFocus, onBlur, ...props }: TextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.searchField,
        {
          backgroundColor: theme.colors.neutral[100],
          borderColor: focused ? theme.colors.accent : theme.colors.divider,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Icon glyph={Search} size={18} color={theme.colors.neutral[500]} />
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
        style={[styles.searchInput, { color: theme.colors.text }]}
      />
    </View>
  );
}

/**
 * A role or a state, said in a word.
 *
 * The mark is filled or hollow as well as tinted, so two tags do not depend on
 * telling a blue pill from a grey one.
 */
export function Tag({
  label,
  tone = 'neutral',
  filled = false,
}: {
  label: string;
  tone?: 'accent' | 'neutral';
  filled?: boolean;
}) {
  const theme = useTheme();
  const accent = tone === 'accent';
  const ink = accent ? theme.colors.accentRamp[800] : theme.colors.neutral[800];

  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: accent ? theme.colors.accentRamp[100] : theme.colors.neutral[200],
          borderRadius: theme.radius.sm,
        },
      ]}
    >
      <View
        style={[styles.tagMark, { borderColor: ink, backgroundColor: filled ? ink : 'transparent' }]}
      />
      <Text style={[styles.tagLabel, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** The action a form exists for: filled, one per form. */
export function PrimaryButton({
  label,
  glyph,
  onPress,
  disabled = false,
  busy = false,
}: {
  label: string;
  glyph?: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.accent,
          borderColor: theme.colors.accent,
          borderRadius: theme.radius.md,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#f2f2f3" />
      ) : (
        <>
          {glyph ? <Icon glyph={glyph} size={16} color="#f2f2f3" /> : null}
          <Text style={[styles.buttonLabel, { color: '#f2f2f3' }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** A secondary action: bordered, so it sits beside the primary without competing. */
export function OutlineButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonLabel, { color: theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The column names above a list.
 *
 * Only where the rows are laid out as columns: over stacked rows the names
 * would point at nothing.
 */
export function ListHeader({ children }: { children: ReactNode }) {
  const isWide = useIsWide();
  if (!isWide) return null;

  return <View style={styles.listHeader}>{children}</View>;
}

export function HeaderCell({ label, style }: { label: string; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();

  return (
    <Text style={[styles.headerCell, { color: theme.colors.neutral[800] }, style]} numberOfLines={1}>
      {label}
    </Text>
  );
}

/** One entry of a list: a rule above it, columns when there is room. */
export function ListRow({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isWide = useIsWide();

  return (
    <View
      style={[
        styles.listRow,
        isWide ? styles.listRowWide : undefined,
        { borderTopColor: theme.colors.divider },
      ]}
    >
      {children}
    </View>
  );
}

/** What a list says when it has nothing to show. */
export function EmptyNote({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={[styles.emptyNote, { color: theme.colors.neutral[800] }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 20.4, gap: 13.6 },
  cardHead: { gap: 3.4 },
  cardTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  cardHint: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 3.4 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 13.6,
    paddingVertical: 10.2,
    fontSize: 15,
    // The field draws its own focus colour; the browser's ring would double it.
    outlineWidth: 0,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.2,
    borderWidth: 1,
    paddingHorizontal: 13.6,
    maxWidth: 560,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 10.2, fontSize: 15, outlineWidth: 0 },
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 6.8,
    borderWidth: 1,
    paddingVertical: 10.2,
    paddingHorizontal: 13.6,
    minHeight: 44,
  },
  buttonLabel: { fontSize: 14, fontWeight: '600' },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 13.6, paddingBottom: 6.8 },
  headerCell: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  listRow: { gap: 6.8, paddingVertical: 13.6, borderTopWidth: 1 },
  listRowWide: { flexDirection: 'row', alignItems: 'center', gap: 13.6 },
  emptyNote: { fontSize: 14, lineHeight: 21 },
});
