import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { useCourseAccent } from '@/features/catalog';
import type { EnrolledCourse } from '@/features/enrollment';
import type { LastLabView } from '@/features/home/application/use-home-dashboard';
import {
  courseCardFor,
  type HeroView,
  type NearestCertificateView,
} from '@/features/home/domain/dashboard';

const LIA_SHOW = require('../../../../assets/mascot/lia-show.png');
const LIA_TALK = require('../../../../assets/mascot/lia-talk.png');
const LIA_HAPPY = require('../../../../assets/mascot/lia-happy.png');

const ON_ACCENT = '#FFFFFF';
const ON_ACCENT_SOFT = 'rgba(255,255,255,0.86)';
const ON_ACCENT_CHIP = 'rgba(255,255,255,0.18)';
const ON_ACCENT_TRACK = 'rgba(255,255,255,0.25)';
const ON_ACCENT_LINE = 'rgba(255,255,255,0.4)';

/** The course being continued, in that course's own color. */
export function ContinueHero({
  hero,
  slug,
  compact,
}: {
  hero: HeroView;
  slug: string;
  compact: boolean;
}) {
  const theme = useTheme();
  const accent = useCourseAccent(slug);

  if (compact) {
    // The look lives on the inner View: with `asChild` the Pressable becomes
    // the anchor on web, and the anchor drops the Pressable's own style.
    return (
      <Link href={hero.primaryHref as Href} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${hero.primaryLabel}: ${hero.title}`}
        >
          <View style={[styles.heroPhone, { backgroundColor: accent.ink }]}>
            <Image source={LIA_SHOW} contentFit="contain" style={styles.heroPhoneLia} />
            {/* Keeps clear of Lía, who stands in the top-right corner. */}
            <View style={styles.heroPhoneChip}>
              <Chip label={hero.positionLabel} />
            </View>
            <Text
              style={[styles.heroPhoneTitle, { fontFamily: theme.typography.displayBold.family }]}
              numberOfLines={3}
            >
              {hero.title}
            </Text>
            <Text style={styles.heroPhoneCourse} numberOfLines={1}>
              {hero.courseTitle}
            </Text>
            <View style={styles.heroPhoneFoot}>
              <HeroBar percentage={hero.percentage} />
              <View style={[styles.heroButton, { borderRadius: theme.radius.md }]}>
                <Text style={[styles.heroButtonLabel, { color: theme.colors.ink }]}>
                  {hero.kind === 'activity' ? hero.primaryLabel : 'Continuar'}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    );
  }

  return (
    <View style={[styles.hero, { backgroundColor: accent.ink }]}>
      <View style={styles.heroBody}>
        <View style={styles.chips}>
          <Chip label={hero.courseTitle} />
          <Chip label={hero.positionLabel} />
        </View>
        <Text
          style={[styles.heroTitle, { fontFamily: theme.typography.displayBold.family }]}
          accessibilityRole="header"
        >
          {hero.title}
        </Text>
        {hero.moduleTitle ? <Text style={styles.heroModule}>{hero.moduleTitle}</Text> : null}

        <View style={styles.heroProgress}>
          <View style={styles.heroProgressLabels}>
            <Text style={styles.heroProgressLabel}>{hero.countLabel}</Text>
            <Text style={styles.heroProgressLabel}>{hero.percentLabel}</Text>
          </View>
          <HeroBar percentage={hero.percentage} />
        </View>

        <View style={styles.heroActions}>
          <Link href={hero.primaryHref as Href} asChild>
            <Pressable accessibilityRole="link">
              {({ pressed }) => (
                <View
                  style={[
                    styles.heroButton,
                    styles.heroButtonInline,
                    { borderRadius: theme.radius.md, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={[styles.heroButtonLabel, { color: theme.colors.ink }]}>
                    {hero.primaryLabel}
                  </Text>
                  <ArrowRight size={18} color={theme.colors.ink} strokeWidth={2.2} />
                </View>
              )}
            </Pressable>
          </Link>
          <Link href={hero.syllabusHref as Href} asChild>
            <Pressable accessibilityRole="link">
              {({ pressed }) => (
                <View
                  style={[
                    styles.heroOutline,
                    { borderRadius: theme.radius.md, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.heroOutlineLabel}>Ver el temario</Text>
                </View>
              )}
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.heroArt} pointerEvents="none">
        <View style={styles.heroArtFloor} />
        <Image source={LIA_SHOW} contentFit="contain" style={styles.heroLia} />
      </View>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function HeroBar({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[styles.heroTrack, { backgroundColor: ON_ACCENT_TRACK }]}
    >
      <View style={[styles.heroFill, { width: `${clamped}%` }]} />
    </View>
  );
}

/** A course the student is enrolled in, with its color and its progress. */
export function EnrolledCourseTile({
  enrolled,
  compact,
}: {
  enrolled: EnrolledCourse;
  compact: boolean;
}) {
  const theme = useTheme();
  const accent = useCourseAccent(enrolled.course.slug);
  const card = courseCardFor(enrolled);

  return (
    <Link href={card.href as Href} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${card.title}, ${card.countLabel}`}>
        {({ pressed }) => (
          <View
            style={[
              compact ? styles.courseRow : styles.courseCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: pressed ? accent.mid : theme.colors.divider,
                borderRadius: compact ? 16 : theme.radius.lg,
              },
            ]}
          >
            <View style={styles.courseHead}>
              <View style={[styles.initial, { backgroundColor: accent.wash }]}>
                <Text style={[styles.initialLabel, { color: accent.ink }]}>{card.initial}</Text>
              </View>
              <View style={styles.courseText}>
                <Text style={[styles.courseTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {card.title}
                </Text>
                {!compact && card.nextLine ? (
                  <Text
                    style={[styles.courseNext, { color: theme.colors.neutral[600] }]}
                    numberOfLines={2}
                  >
                    {card.nextLine}
                  </Text>
                ) : null}
                {compact ? <CourseBar percentage={card.percentage} color={accent.ink} /> : null}
              </View>
            </View>
            {compact ? null : (
              <>
                <CourseBar percentage={card.percentage} color={accent.ink} />
                <Text style={[styles.courseCount, { color: theme.colors.neutral[600] }]}>
                  {card.countLabel}
                </Text>
              </>
            )}
          </View>
        )}
      </Pressable>
    </Link>
  );
}

function CourseBar({ percentage, color }: { percentage: number; color: string }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[styles.courseTrack, { backgroundColor: theme.colors.neutral[100] }]}
    >
      <View style={[styles.courseFill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

/** A white, bordered side card. */
function SideCard({ children, tinted }: { children: ReactNode; tinted?: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.sideCard,
        {
          backgroundColor: tinted ?? theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function LastLabCard({ lab, compact }: { lab: LastLabView; compact: boolean }) {
  const theme = useTheme();
  const deltaColor = lab.deltaLine?.startsWith('+')
    ? theme.colors.success
    : theme.colors.neutral[600];

  return (
    <View style={compact ? styles.tile : undefined}>
    <Link href={lab.href as Href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Último laboratorio: ${lab.activityTitle}, ${lab.score} puntos`}
      >
        <SideCard>
          {compact ? (
            <View style={styles.tileBody}>
              <Text style={[styles.sideEyebrow, { color: theme.colors.neutral[600] }]}>
                Último lab
              </Text>
              <Text
                style={[
                  styles.tileNumber,
                  { color: theme.colors.ink, fontFamily: theme.typography.display.family },
                ]}
              >
                {lab.score}
              </Text>
              <Text style={[styles.tileDetail, { color: deltaColor }]} numberOfLines={2}>
                {lab.deltaLine ?? lab.activityTitle}
              </Text>
            </View>
          ) : (
            <View style={styles.labRow}>
              <ScoreRing score={lab.score} />
              <View style={styles.labText}>
                <Text style={[styles.sideEyebrow, { color: theme.colors.neutral[600] }]}>
                  Último laboratorio
                </Text>
                <Text style={[styles.sideTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {lab.activityTitle}
                </Text>
                {lab.deltaLine ? (
                  <Text style={[styles.labDelta, { color: deltaColor }]}>{lab.deltaLine}</Text>
                ) : null}
              </View>
            </View>
          )}
        </SideCard>
      </Pressable>
    </Link>
    </View>
  );
}

const RING_SIZE = 76;
const RING_STROKE = 8;

function ScoreRing({ score }: { score: number }) {
  const theme = useTheme();
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <View style={styles.ring}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke={theme.colors.accentRamp[100]}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke={theme.colors.accentButton}
          strokeWidth={RING_STROKE}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <Text
        style={[
          styles.ringLabel,
          { color: theme.colors.ink, fontFamily: theme.typography.display.family },
        ]}
      >
        {score}
      </Text>
    </View>
  );
}

export function NearestCertificateCard({
  certificate,
  compact,
}: {
  certificate: NearestCertificateView;
  compact: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={compact ? styles.tile : undefined}>
    <Link href={certificate.href as Href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Certificado más cercano: ${certificate.courseTitle}`}
      >
        <SideCard tinted={theme.colors.warningSoft}>
          <Text style={[styles.sideEyebrow, { color: theme.colors.warning }]}>
            {compact ? 'Tu certificado' : 'Certificado más cercano'}
          </Text>
          <Text
            style={[styles.sideTitle, { color: theme.colors.ink }]}
            numberOfLines={compact ? 2 : undefined}
          >
            {certificate.courseTitle}
          </Text>
          <Text
            style={[styles.sideBody, { color: theme.colors.neutral[800] }]}
            numberOfLines={compact ? 3 : undefined}
          >
            {certificate.remainingLine}
          </Text>
        </SideCard>
      </Pressable>
    </Link>
    </View>
  );
}

export function LiaLine({ line }: { line: string }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.lia,
        { backgroundColor: theme.colors.accentRamp[100], borderRadius: theme.radius.lg },
      ]}
    >
      <Image source={LIA_TALK} contentFit="contain" style={styles.liaStill} />
      <Text style={[styles.liaText, { color: theme.colors.accentRamp[800] }]}>
        <Text style={styles.liaName}>Lía: </Text>“{line}”
      </Text>
    </View>
  );
}

/** No enrolments yet: one friendly door to the catalog. */
export function NoCoursesCard() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.empty,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Image source={LIA_HAPPY} contentFit="contain" style={styles.emptyLia} />
      <View style={styles.emptyText}>
        <Text
          style={[
            styles.emptyTitle,
            { color: theme.colors.ink, fontFamily: theme.typography.displayBold.family },
          ]}
          accessibilityRole="header"
        >
          Todavía no empezaste un curso
        </Text>
        <Text style={[styles.sideBody, { color: theme.colors.neutral[700] }]}>
          Elige uno en el catálogo y empieza por la ruta básica. Lo que avances queda
          guardado aquí.
        </Text>
        <View style={styles.emptyAction}>
        <Link href="/catalog" asChild>
          <Pressable accessibilityRole="link">
            {({ pressed }) => (
              <View
                style={[
                  styles.heroButtonInline,
                  styles.emptyButton,
                  {
                    backgroundColor: theme.colors.accentButton,
                    borderRadius: theme.radius.md,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.heroButtonLabel, { color: ON_ACCENT }]}>Explorar cursos</Text>
                <ArrowRight size={18} color={ON_ACCENT} strokeWidth={2.2} />
              </View>
            )}
          </Pressable>
        </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroPhoneChip: {
    paddingRight: 104,
    alignItems: 'flex-start',
  },
  heroPhoneCourse: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '600',
    paddingRight: 104,
  },
  hero: {
    flexDirection: 'row',
    minHeight: 300,
    borderRadius: 28,
    overflow: 'hidden',
  },
  heroBody: { flex: 1, minWidth: 0, padding: 32, gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: ON_ACCENT_CHIP,
    maxWidth: '100%',
  },
  chipLabel: { color: ON_ACCENT, fontSize: 13, fontWeight: '600' },
  heroTitle: { color: ON_ACCENT, fontSize: 34, lineHeight: 38 },
  heroModule: { color: ON_ACCENT_SOFT, fontSize: 16, lineHeight: 24 },
  heroProgress: { marginTop: 'auto', gap: 8, maxWidth: 440 },
  heroProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  heroProgressLabel: { color: ON_ACCENT, fontSize: 13, fontWeight: '600' },
  heroTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: 999, backgroundColor: ON_ACCENT },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  heroButton: {
    height: 48,
    paddingHorizontal: 22,
    backgroundColor: ON_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonInline: { flexDirection: 'row', gap: 8 },
  heroButtonLabel: { fontSize: 16, fontWeight: '700' },
  heroOutline: {
    height: 48,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: ON_ACCENT_LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOutlineLabel: { color: ON_ACCENT, fontSize: 15, fontWeight: '600' },
  heroArt: { width: 260 },
  heroArtFloor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 86,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  heroLia: { position: 'absolute', right: 24, bottom: 20, width: 210, height: 250 },

  heroPhone: {
    minHeight: 220,
    padding: 20,
    gap: 10,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroPhoneLia: { position: 'absolute', right: -6, bottom: 64, width: 120, height: 150 },
  heroPhoneTitle: { color: ON_ACCENT, fontSize: 24, lineHeight: 28, maxWidth: 200 },
  heroPhoneFoot: { marginTop: 'auto', gap: 12 },

  courseCard: { flexGrow: 1, borderWidth: 1, padding: 18, gap: 12 },
  courseRow: { borderWidth: 1, padding: 12 },
  courseHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  initial: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialLabel: { fontSize: 17, fontWeight: '800' },
  courseText: { flex: 1, minWidth: 0, gap: 4 },
  courseTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  courseNext: { fontSize: 13, lineHeight: 18 },
  courseTrack: { height: 6, borderRadius: 999, overflow: 'hidden', marginTop: 2 },
  courseFill: { height: '100%', borderRadius: 999 },
  courseCount: { fontSize: 12, fontWeight: '600' },

  sideCard: { borderWidth: 1, padding: 20, gap: 8 },
  sideEyebrow: { fontSize: 13, fontWeight: '700' },
  sideTitle: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  sideBody: { fontSize: 14, lineHeight: 20 },
  labRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  labText: { flex: 1, minWidth: 0, gap: 4 },
  labDelta: { fontSize: 13, fontWeight: '600' },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', fontSize: 22 },
  tile: { flex: 1, minWidth: 0 },
  tileBody: { gap: 2 },
  tileNumber: { fontSize: 30, lineHeight: 36, marginTop: 4 },
  tileDetail: { fontSize: 12, fontWeight: '600' },

  lia: { minHeight: 120, paddingVertical: 20, paddingRight: 20, paddingLeft: 116, justifyContent: 'center' },
  liaStill: { position: 'absolute', left: 8, bottom: 0, width: 100, height: 120 },
  liaText: { fontSize: 14, lineHeight: 20 },
  liaName: { fontWeight: '700' },

  empty: {
    borderWidth: 1,
    padding: 24,
    gap: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  emptyLia: { width: 140, height: 160 },
  emptyText: { flex: 1, minWidth: 220, gap: 10 },
  emptyTitle: { fontSize: 24, lineHeight: 28 },
  emptyAction: { alignSelf: 'flex-start', marginTop: 6 },
  emptyButton: { height: 48, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
});
