import { Link, type Href } from 'expo-router';
import { ArrowLeft, type LucideIcon } from 'lucide-react-native';
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
  type ViewStyle,
} from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';

/**
 * The pieces every screen frames its content with, so a card, a field, a tag
 * and a button read the same wherever they appear.
 *
 * The instructor and admin screens each grew their own copy of these; this is
 * the same look, in the one place a feature is allowed to share from.
 */

const RESTING_SHADOW = '0 10px 28px rgba(17, 17, 17, 0.06)';
const RAISED_SHADOW = '0 18px 40px rgba(27, 112, 254, 0.16)';
/** Ink on the accent: the same off-white wherever a filled button is drawn. */
const ON_ACCENT = '#f2f2f3';

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

/** Whether there is room to lay content out side by side. */
export function useIsWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= breakpoint.compact;
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
      {title ? <SectionHeading title={title} hint={hint} /> : null}
      {children}
    </View>
  );
}

/** A framed block inside a card or beside one: bordered, never lifted. */
export function SubCard({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.subCard,
        { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
        style,
      ]}
    >
      {title ? (
        <Text style={[styles.subCardTitle, { color: theme.colors.text }]}>{title}</Text>
      ) : null}
      {children}
    </View>
  );
}

export function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={[styles.headingTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      {hint ? (
        <Text style={[styles.headingHint, { color: theme.colors.neutral[600] }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

/**
 * The top of a screen: where you are, what it is for, and what you can do
 * from here. The actions sit beside the title when there is room.
 */
export function ScreenHeader({
  kicker,
  title,
  subtitle,
  back,
  actions,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  back?: { label: string; href: Href };
  actions?: ReactNode;
}) {
  const theme = useTheme();
  const isWide = useIsWide();
  const muted = theme.colors.neutral[600];

  return (
    <View style={styles.screenHeader}>
      {back ? (
        <Link href={back.href} asChild>
          <Pressable accessibilityRole="link">
            <View style={styles.backLink}>
              <Icon glyph={ArrowLeft} size={16} color={muted} />
              <Text style={[styles.backLabel, { color: muted }]}>{back.label}</Text>
            </View>
          </Pressable>
        </Link>
      ) : null}

      <View style={[styles.screenHeaderRow, isWide ? styles.screenHeaderRowWide : undefined]}>
        <View style={styles.screenHeaderCopy}>
          {kicker ? (
            <Text style={[styles.kicker, { color: theme.colors.accent }]}>{kicker}</Text>
          ) : null}
          <Text
            accessibilityRole="header"
            style={[styles.screenTitle, { color: theme.colors.text }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.screenSubtitle, { color: muted }]}>{subtitle}</Text>
          ) : null}
        </View>
        {actions ? <View style={styles.screenHeaderActions}>{actions}</View> : null}
      </View>
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
 * A level or a state, said in a word.
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

/** One fact about a row, with the icon that says which kind of fact it is. */
export function Fact({ glyph, label }: { glyph: LucideIcon; label: string }) {
  const theme = useTheme();

  return (
    <View style={styles.fact}>
      <Icon glyph={glyph} size={14} color={theme.colors.neutral[600]} />
      <Text style={[styles.factLabel, { color: theme.colors.neutral[600] }]}>{label}</Text>
    </View>
  );
}

interface FaceProps {
  label: string;
  glyph?: LucideIcon;
  pressed: boolean;
  dimmed?: boolean;
  busy?: boolean;
  /** Fill the row instead of hugging the label: the one action of a form. */
  stretch?: boolean;
}

function PrimaryFace({ label, glyph, pressed, dimmed = false, busy = false, stretch }: FaceProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.button,
        stretch ? styles.buttonStretch : undefined,
        {
          backgroundColor: theme.colors.accent,
          borderColor: theme.colors.accent,
          borderRadius: theme.radius.md,
          opacity: dimmed ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={ON_ACCENT} />
      ) : (
        <>
          {glyph ? <Icon glyph={glyph} size={16} color={ON_ACCENT} /> : null}
          <Text style={[styles.buttonLabel, { color: ON_ACCENT }]}>{label}</Text>
        </>
      )}
    </View>
  );
}

function OutlineFace({ label, glyph, pressed, dimmed = false, stretch }: FaceProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.button,
        stretch ? styles.buttonStretch : undefined,
        {
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
          opacity: dimmed ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {glyph ? <Icon glyph={glyph} size={16} color={theme.colors.accent} /> : null}
      <Text style={[styles.buttonLabel, { color: theme.colors.text }]}>{label}</Text>
    </View>
  );
}

interface ButtonProps {
  label: string;
  glyph?: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
  /** Says what the button acts on when the visible word alone would not. */
  accessibilityLabel?: string;
  stretch?: boolean;
}

/** The action a screen or a form exists for: filled with the accent, one per group. */
export function PrimaryButton({
  label,
  glyph,
  onPress,
  disabled = false,
  busy = false,
  accessibilityLabel,
  stretch,
}: ButtonProps & { busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      // The spinner replaces the label, so the name has to be given outright.
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={stretch ? styles.hitStretch : styles.hit}
    >
      {({ pressed }) => (
        <PrimaryFace
          label={label}
          glyph={glyph}
          pressed={pressed}
          dimmed={disabled}
          busy={busy}
          stretch={stretch}
        />
      )}
    </Pressable>
  );
}

/** A secondary action: bordered, so it sits beside the primary without competing. */
export function OutlineButton({
  label,
  glyph,
  onPress,
  disabled = false,
  accessibilityLabel,
  stretch,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={stretch ? styles.hitStretch : styles.hit}
    >
      {({ pressed }) => (
        <OutlineFace
          label={label}
          glyph={glyph}
          pressed={pressed}
          dimmed={disabled}
          stretch={stretch}
        />
      )}
    </Pressable>
  );
}

interface LinkProps {
  label: string;
  glyph?: LucideIcon;
  href: Href;
  accessibilityLabel?: string;
  stretch?: boolean;
}

/** The same face as `PrimaryButton`, for the destination a screen points at. */
export function PrimaryLink({ label, glyph, href, accessibilityLabel, stretch }: LinkProps) {
  return (
    <Link href={href} asChild>
      {/* The look lives on the inner View: with `asChild` the Pressable becomes
          the anchor on web, and the anchor drops the Pressable's own style. */}
      <Pressable accessibilityRole="link" accessibilityLabel={accessibilityLabel}>
        {({ pressed }) => (
          <PrimaryFace label={label} glyph={glyph} pressed={pressed} stretch={stretch} />
        )}
      </Pressable>
    </Link>
  );
}

/** The same face as `OutlineButton`, for a secondary destination. */
export function OutlineLink({ label, glyph, href, accessibilityLabel, stretch }: LinkProps) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={accessibilityLabel}>
        {({ pressed }) => (
          <OutlineFace label={label} glyph={glyph} pressed={pressed} stretch={stretch} />
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 20.4, gap: 13.6 },
  subCard: { borderWidth: 1, padding: 13.6, gap: 6.8 },
  subCardTitle: { fontSize: 15, fontWeight: '700' },
  heading: { gap: 3.4 },
  headingTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  headingHint: { fontSize: 13, lineHeight: 19 },
  screenHeader: { gap: 6.8 },
  screenHeaderRow: { gap: 13.6 },
  screenHeaderRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  screenHeaderCopy: { flexShrink: 1, minWidth: 0, gap: 6.8 },
  screenHeaderActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
  },
  backLabel: { fontSize: 14, fontWeight: '600' },
  kicker: { fontSize: 13, fontWeight: '600' },
  screenTitle: { fontSize: 30, fontWeight: '700', lineHeight: 36, letterSpacing: -0.6 },
  screenSubtitle: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 3.4 },
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
  hit: { alignSelf: 'flex-start' },
  hitStretch: { alignSelf: 'stretch' },
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
  buttonStretch: { alignSelf: 'stretch' },
  buttonLabel: { fontSize: 14, fontWeight: '600' },
});
