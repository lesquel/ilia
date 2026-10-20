import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { INSTITUTE_FULL_NAME } from '@/core/brand';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { BrandMark } from '@/core/ui/brand-mark';
import { MascotGuide } from '@/core/ui/mascot-guide';
import { breakpoint, useTheme } from '@/core/theme';
import { useSession } from '@/features/auth';
import { CourseCard, sortCoursesAlongLearningPath, useCourses } from '@/features/catalog';
import { featuredCoursesHeading } from '@/features/landing/domain/entities';
import { LandingHeroStage } from '@/features/landing/presentation/landing-hero-stage';

const FEATURED_COURSE_COUNT = 3;

const INSTITUTE_CLAIMS = [
  {
    title: 'El material te queda listo',
    body: 'Escribes el pedido como lo pegarías tú. Sales con una hoja para el lunes.',
  },
  {
    title: 'Tus alumnos reciben una mejor clase',
    body: 'Les dejas un párrafo y cinco preguntas del texto. No un cuento que no es de su año.',
  },
  {
    title: 'La escuela puede comprobarlo',
    body: 'Un código en el certificado. Nadie tiene que crear otra cuenta.',
  },
] as const;

/**
 * Public front door: better prep, a better class, then the route.
 */
export function LandingScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { isAuthenticated, isLoading: isSessionLoading } = useSession();
  const { courses, isLoading, error, hasMore, refetch } = useCourses();

  const isWide = width >= breakpoint.compact;
  const courseColumns = width >= breakpoint.medium ? 3 : width >= breakpoint.compact ? 2 : 1;
  const featuredCourses = sortCoursesAlongLearningPath(courses).slice(
    0,
    FEATURED_COURSE_COUNT,
  );
  const catalogHasMore = courses.length > featuredCourses.length || Boolean(hasMore);
  const showGuestActions = !isSessionLoading && !isAuthenticated;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.scroll}
    >
      <View style={[styles.page, { backgroundColor: theme.colors.bg }]}>
        <View style={[styles.nav, isWide ? undefined : styles.navStacked]}>
          <Link href="/" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel={`${INSTITUTE_FULL_NAME}, inicio`}>
              <BrandMark variant="monogram" height={isWide ? 44 : 36} />
            </Pressable>
          </Link>

          <View style={[styles.navLinks, isWide ? undefined : styles.navLinksStacked]}>
            <TextLink href="/catalog" label="Cursos" />
            {isAuthenticated ? (
              <>
                <TextLink href="/my-courses" label="Mis cursos" />
                <TextLink href="/certificates" label="Certificados" />
              </>
            ) : null}
            {showGuestActions ? (
              <>
                <ButtonLink href="/login" label="Iniciar sesión" kind="secondary" />
                <ButtonLink href="/register" label="Crear cuenta" kind="primary" />
              </>
            ) : null}
          </View>
        </View>

        <View style={[styles.hero, isWide ? styles.heroWide : undefined]}>
          <View style={styles.heroCopy}>
            <View style={styles.kickerRow}>
              <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
              <Text style={[styles.kicker, { color: theme.colors.accentAlt }]}>
                {INSTITUTE_FULL_NAME}
              </Text>
            </View>
            <Text
              style={[
                styles.headline,
                {
                  color: theme.colors.text,
                  fontSize: isWide ? 52 : 34,
                  lineHeight: isWide ? 56 : 38,
                },
              ]}
              accessibilityRole="header"
            >
              Prepara tu material con más oficio. Tus alumnos reciben una
              mejor clase.
            </Text>
            <Text style={[styles.lede, { color: theme.colors.neutral[600] }]}>
              Aprendes a preparar la próxima clase con más tiempo y más
              cuidado. Ellos lo notan, y te lo van a agradecer.
            </Text>
            <View style={styles.heroActions}>
              <ButtonLink href="/catalog" label="Ver los cursos" kind="primary" />
              {isSessionLoading ? null : showGuestActions ? (
                <ButtonLink href="/register" label="Crear cuenta" kind="ghost" />
              ) : (
                <ButtonLink href="/my-courses" label="Ir a mis cursos" kind="ghost" />
              )}
            </View>
          </View>

          <View style={styles.heroStage}>
            <LandingHeroStage isWide={isWide} />
          </View>
        </View>
      </View>

      <View style={[styles.proofStrip, { borderColor: theme.colors.divider }]}>
        <View style={styles.page}>
          <View style={[styles.proofRow, isWide ? undefined : { flexDirection: 'column' }]}>
            {INSTITUTE_CLAIMS.map((claim) => (
              <ProofClaim key={claim.title} title={claim.title} body={claim.body} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.page}>
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]} accessibilityRole="header">
              {featuredCoursesHeading(featuredCourses.length, catalogHasMore)}
            </Text>
            <TextLink href="/catalog" label="Ver catálogo →" />
          </View>

          {error && featuredCourses.length === 0 ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : isLoading && featuredCourses.length === 0 ? (
            <LoadingState label="Cargando cursos…" />
          ) : featuredCourses.length === 0 ? (
            <Text style={[styles.lede, { color: theme.colors.neutral[600] }]}>
              Todavía no hay cursos publicados.
            </Text>
          ) : (
            <View
              style={[
                styles.courseGrid,
                courseColumns > 1
                  ? { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' }
                  : undefined,
              ]}
            >
              {featuredCourses.map((course) => (
                <View
                  key={course.id}
                  style={
                    courseColumns > 1
                      ? {
                          width: `${100 / courseColumns}%`,
                          paddingRight: 16,
                          paddingBottom: 16,
                          alignSelf: 'stretch',
                        }
                      : { paddingBottom: 16 }
                  }
                >
                  <CourseCard course={course} />
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.page}>
        <View style={[styles.close, isWide ? styles.closeWide : undefined]}>
          <View style={styles.closeCopy}>
            <Text style={[styles.closeTitle, { color: theme.colors.text }]} accessibilityRole="header">
              Empieza por el primer curso.
            </Text>
            <Text style={[styles.lede, { color: theme.colors.neutral[600] }]}>
              Prompting para docentes. En una tarde sales con el pedido de tu
              próxima clase.
            </Text>
            <View style={styles.heroActions}>
              <ButtonLink href="/catalog" label="Ver los cursos" kind="primary" />
              {showGuestActions ? (
                <ButtonLink href="/register" label="Crear cuenta" kind="ghost" />
              ) : null}
            </View>
            <Text style={[styles.footerName, { color: theme.colors.neutral[500] }]}>
              {INSTITUTE_FULL_NAME}
            </Text>
          </View>
          <View style={styles.closeBird} pointerEvents="none">
            <MascotGuide
              line="Cuando quieras, empezamos."
              lineKey="landing-close"
              doneMood="show"
              size={isWide ? 180 : 132}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function ProofClaim({ title, body }: { title: string; body: string }) {
  const theme = useTheme();

  return (
    <View style={styles.proofClaim}>
      <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
      <Text style={[styles.proofTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.proofBody, { color: theme.colors.neutral[600] }]}>{body}</Text>
    </View>
  );
}

function TextLink({ href, label }: { href: '/catalog' | '/my-courses' | '/certificates'; label: string }) {
  const theme = useTheme();

  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link">
        {({ pressed }) => (
          <Text
            style={[
              styles.textLink,
              { color: theme.colors.neutral[700], opacity: pressed ? 0.7 : 1 },
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Link>
  );
}

function ButtonLink({
  href,
  label,
  kind,
}: {
  href: '/catalog' | '/login' | '/register' | '/my-courses';
  label: string;
  kind: 'primary' | 'secondary' | 'ghost';
}) {
  const theme = useTheme();
  const isPrimary = kind === 'primary';
  const isGhost = kind === 'ghost';

  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link">
        {({ pressed }) => (
          <View
            style={[
              styles.button,
              {
                backgroundColor: isPrimary ? theme.colors.text : 'transparent',
                borderColor: isGhost || !isPrimary ? theme.colors.divider : theme.colors.text,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonLabel,
                { color: isPrimary ? '#ffffff' : theme.colors.text },
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  page: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 20.4,
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 13.6,
    paddingVertical: 18,
  },
  navStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  navLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 13.6,
  },
  navLinksStacked: {
    width: '100%',
  },
  textLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  hero: {
    paddingTop: 12,
    paddingBottom: 48,
    gap: 32,
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
  heroCopy: {
    flex: 0.92,
    gap: 16,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalSquare: {
    width: 8,
    height: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  headline: {
    fontWeight: '700',
    letterSpacing: -1.4,
  },
  lede: {
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 520,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  button: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 22,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  heroStage: {
    flex: 1.2,
    minHeight: 280,
  },
  proofStrip: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 28,
  },
  proofRow: {
    flexDirection: 'row',
    gap: 28,
  },
  proofClaim: {
    flex: 1,
    gap: 8,
  },
  proofTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  proofBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  section: {
    paddingVertical: 48,
  },
  sectionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  courseGrid: {
    marginRight: -16,
  },
  close: {
    paddingVertical: 56,
    gap: 20,
  },
  closeWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeCopy: {
    flex: 1,
    gap: 12,
  },
  closeTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
    maxWidth: 520,
  },
  closeBird: {
    alignItems: 'flex-end',
  },
  footerName: {
    fontSize: 13,
    marginTop: 16,
  },
});
