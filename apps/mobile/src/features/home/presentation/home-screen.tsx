import type { ReactNode } from 'react';
import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { ErrorState } from '@/core/ui/state-view';
import { useSession } from '@/features/auth';
import { enrolmentsBesides } from '@/features/enrollment/domain/entities';
import { useHomeDashboard } from '@/features/home/application/use-home-dashboard';
import { greetingFor, liaLineFor, todayLabel } from '@/features/home/domain/dashboard';
import { LandingScreen } from '@/features/landing';

import {
  ContinueHero,
  EnrolledCourseTile,
  LastLabCard,
  LiaLine,
  NearestCertificateCard,
  NoCoursesCard,
} from './home-blocks';
import { HomeScreenSkeleton } from './home-screen-skeleton';

const CONTENT_MAX_WIDTH = 1360;
const ASIDE_WIDTH = 360;

/**
 * `/`: the student's dashboard once signed in, the public landing otherwise.
 */
export function HomeScreen() {
  const { isAuthenticated, isLoading } = useSession();
  const layout = useHomeLayout();

  if (isLoading) {
    return (
      <Page>
        <HomeScreenSkeleton twoColumns={layout.twoColumns} compact={layout.compact} />
      </Page>
    );
  }

  if (!isAuthenticated) return <LandingScreen />;

  return <StudentHome />;
}

function useHomeLayout() {
  const { width } = useWindowDimensions();
  return {
    compact: width < breakpoint.compact,
    twoColumns: width >= breakpoint.medium,
  };
}

function StudentHome() {
  const theme = useTheme();
  const { user } = useSession();
  const { compact, twoColumns } = useHomeLayout();
  const { courses, continuing, hero, certificate, lastLab, isLoading, error, refetch } =
    useHomeDashboard();

  if (isLoading) {
    return (
      <Page>
        <HomeScreenSkeleton twoColumns={twoColumns} compact={compact} />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Page>
    );
  }

  const greeting = greetingFor(user?.fullName ?? '', Boolean(hero));
  const header = (
    <View style={styles.greeting}>
      {compact ? null : (
        <Text style={[styles.date, { color: theme.colors.neutral[600] }]}>
          {todayLabel(new Date())}
        </Text>
      )}
      <Text
        accessibilityRole="header"
        style={[
          compact ? styles.titlePhone : styles.title,
          { color: theme.colors.ink, fontFamily: theme.typography.display.family },
        ]}
      >
        {greeting}
      </Text>
    </View>
  );

  if (courses.length === 0) {
    return (
      <Page>
        {header}
        <NoCoursesCard />
      </Page>
    );
  }

  const heroBlock =
    hero && continuing ? (
      <ContinueHero hero={hero} slug={continuing.course.slug} compact={compact} />
    ) : null;
  const lia = <LiaLine line={liaLineFor(hero)} />;

  if (compact) {
    // Phone (MovilInicio): the hero, two tiles, the other courses, then Lía.
    const others = enrolmentsBesides(courses, continuing);
    return (
      <Page>
        {header}
        {heroBlock}
        {lastLab || certificate ? (
          <View style={styles.tiles}>
            {lastLab ? <LastLabCard lab={lastLab} compact /> : null}
            {certificate ? <NearestCertificateCard certificate={certificate} compact /> : null}
          </View>
        ) : null}
        {others.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitlePhone, { color: theme.colors.ink }]}>
              {heroBlock ? 'Tus otros cursos' : 'Tus cursos'}
            </Text>
            <View style={styles.stack}>
              {others.map((row) => (
                <EnrolledCourseTile key={row.course.id} enrolled={row} compact />
              ))}
            </View>
          </View>
        ) : null}
        {lia}
      </Page>
    );
  }

  const side = (
    <>
      {lastLab ? <LastLabCard lab={lastLab} compact={false} /> : null}
      {certificate ? <NearestCertificateCard certificate={certificate} compact={false} /> : null}
      {lia}
    </>
  );

  return (
    <Page>
      <View style={twoColumns ? styles.columns : styles.stackWide}>
        <View style={styles.main}>
          {header}
          {heroBlock}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.ink, fontFamily: theme.typography.displayBold.family },
                ]}
                accessibilityRole="header"
              >
                Tus cursos
              </Text>
              <Link href="/catalog" style={[styles.more, { color: theme.colors.accentButton }]}>
                Explorar más cursos
              </Link>
            </View>
            <View style={styles.grid}>
              {courses.map((row) => (
                <View
                  key={row.course.id}
                  style={[styles.gridItem, { width: twoColumns ? '31.5%' : '48.5%' }]}
                >
                  <EnrolledCourseTile enrolled={row} compact={false} />
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={twoColumns ? styles.aside : styles.stack}>{side}</View>
      </View>
    </Page>
  );
}

function Page({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { compact } = useHomeLayout();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={[styles.content, compact ? styles.contentPhone : undefined]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 40,
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    gap: 24,
  },
  contentPhone: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 18 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 32 },
  stackWide: { gap: 24 },
  main: { flex: 1, minWidth: 0, gap: 24 },
  aside: { width: ASIDE_WIDTH, gap: 16 },
  stack: { gap: 10 },
  greeting: { gap: 6 },
  date: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 44, lineHeight: 48, letterSpacing: -0.8 },
  titlePhone: { fontSize: 30, lineHeight: 34 },
  tiles: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  section: { gap: 14 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: { fontSize: 24 },
  sectionTitlePhone: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  more: { fontSize: 14, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  // Fixed fractions, not flexGrow: a lone card on the last row keeps its width.
  gridItem: { flexGrow: 0, flexShrink: 1 },
});
