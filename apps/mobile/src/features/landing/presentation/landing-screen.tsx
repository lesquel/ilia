import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { INSTITUTE_FULL_NAME } from '@/core/brand';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { BrandMark } from '@/core/ui/brand-mark';
import { breakpoint, useTheme } from '@/core/theme';
import { useSession } from '@/features/auth';
import { CourseCard, useCourses } from '@/features/catalog';

const instituteHeroPhotograph = require('../../../../assets/brand/ilia-hero-institute.png');

const FEATURED_COURSE_COUNT = 3;

const LEARNING_STEPS = [
  {
    number: '01',
    title: 'Aprendé',
    body: 'Lecciones cortas: texto, vídeo y presentaciones, organizadas en módulos que caben entre clases.',
  },
  {
    number: '02',
    title: 'Practicá',
    body: 'Cada módulo cierra con una actividad de prompting. No hay cuestionario de opción múltiple.',
  },
  {
    number: '03',
    title: 'Demostrá',
    body: 'Escribís el prompt, la plataforma lo ejecuta y te devuelve una nota con rúbrica y requisitos objetivos.',
  },
] as const;

const PLATFORM_INCLUSIONS = [
  {
    number: '01',
    title: 'Cursos prácticos',
    body: 'Módulos cortos con material que se puede retomar. El temario se ve antes de inscribirse.',
  },
  {
    number: '02',
    title: 'Laboratorio de prompts',
    body: 'El ejercicio es escribir la instrucción. Se evalúa lo que pedís y lo que obtenés.',
  },
  {
    number: '03',
    title: 'Evaluación defendible',
    body: 'La nota se ancla en requisitos medibles. Un modelo no puede certificar un prompt que no cumple el enunciado.',
  },
  {
    number: '04',
    title: 'Foro del curso',
    body: 'Discusiones entre docentes que están haciendo el mismo recorrido.',
  },
  {
    number: '05',
    title: 'Progreso real',
    body: 'Siempre se ve qué falta y dónde retomar. El porcentaje se deriva, no se inventa.',
  },
  {
    number: '06',
    title: 'Certificado verificable',
    body: 'Un código público que una escuela o la Alcaldía puede comprobar sin crear cuenta.',
  },
] as const;

/**
 * Public front door. A visitor should understand what ILIA is and see real
 * courses — not a directory of every signed-in screen.
 */
export function LandingScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { isAuthenticated, isLoading: isSessionLoading } = useSession();
  const { courses, isLoading, error, refetch } = useCourses();

  const isWide = width >= breakpoint.compact;
  const courseColumns = width >= breakpoint.medium ? 3 : width >= breakpoint.compact ? 2 : 1;
  const featuredCourses = courses.slice(0, FEATURED_COURSE_COUNT);
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
              <BrandMark variant="monogram" height={isWide ? 48 : 40} />
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
            <Text style={[styles.kicker, { color: theme.colors.accent }]}>
              {INSTITUTE_FULL_NAME}
            </Text>
            <View style={[styles.brandRule, { backgroundColor: theme.colors.accent }]} />
            <Text
              style={[
                styles.headline,
                { color: theme.colors.text, fontSize: isWide ? 48 : 32, lineHeight: isWide ? 52 : 36 },
              ]}
            >
              Formación en inteligencia artificial que se demuestra haciendo
            </Text>
            <Text style={[styles.lede, { color: theme.colors.neutral[600] }]}>
              Un instituto, no un curso suelto. Escribís prompts, la plataforma
              mide la calidad de lo que pedís y de lo que obtenés. No hay examen
              de opción múltiple.
            </Text>
            <View style={styles.heroActions}>
              <ButtonLink href="/catalog" label="Explorar cursos" kind="primary" />
              {isSessionLoading ? null : showGuestActions ? (
                <ButtonLink href="/register" label="Comenzar ahora" kind="secondary" />
              ) : (
                <ButtonLink href="/my-courses" label="Ir a mis cursos" kind="secondary" />
              )}
            </View>
          </View>

          <View style={styles.heroIdentity}>
            {isWide ? (
              <Image
                source={instituteHeroPhotograph}
                style={[styles.heroPhotograph, { borderRadius: theme.radius.lg }]}
                contentFit="cover"
                accessibilityLabel="Interior del instituto, luz de mañana"
              />
            ) : null}
            <View
              style={[
                styles.lockupPlate,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.divider,
                  borderRadius: theme.radius.lg,
                  ...theme.shadow.md,
                },
              ]}
            >
              <BrandMark variant="lockup" height={isWide ? 220 : 160} />
            </View>
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: theme.colors.divider }]}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Cursos destacados
            </Text>
            <TextLink href="/catalog" label="Ver todos →" />
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
                courseColumns > 1 ? { flexDirection: 'row', flexWrap: 'wrap' } : undefined,
              ]}
            >
              {featuredCourses.map((course) => (
                <View
                  key={course.id}
                  style={
                    courseColumns > 1
                      ? { width: `${100 / courseColumns}%`, paddingRight: 13.6, paddingBottom: 13.6 }
                      : { paddingBottom: 13.6 }
                  }
                >
                  <CourseCard course={course} />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.section, { borderTopColor: theme.colors.divider }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Aprendé haciendo</Text>
          <Text style={[styles.lede, { color: theme.colors.neutral[600], marginBottom: 20.4 }]}>
            Cada módulo termina en una actividad ejecutable. Cada curso, en una
            evaluación que se puede defender.
          </Text>
          <View
            style={[
              styles.steps,
              {
                borderColor: theme.colors.divider,
                flexDirection: isWide ? 'row' : 'column',
                borderRadius: theme.radius.lg,
                overflow: 'hidden',
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            {LEARNING_STEPS.map((step, index) => (
              <View
                key={step.number}
                style={[
                  styles.step,
                  isWide && index < LEARNING_STEPS.length - 1
                    ? { borderRightWidth: 1, borderRightColor: theme.colors.divider }
                    : undefined,
                  !isWide && index < LEARNING_STEPS.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: theme.colors.divider }
                    : undefined,
                ]}
              >
                <Text style={[styles.stepNumber, { color: theme.colors.accent }]}>{step.number}</Text>
                <Text style={[styles.stepTitle, { color: theme.colors.text }]}>{step.title}</Text>
                <Text style={[styles.stepBody, { color: theme.colors.neutral[600] }]}>{step.body}</Text>
              </View>
            ))}
          </View>
        </View>

      </View>

      <View style={[styles.inclusionsBand, { backgroundColor: theme.colors.accentRamp[100] }]}>
        <View style={[styles.brandRule, styles.inclusionsRule]} />
        <View style={styles.page}>
          <Text style={[styles.inclusionsTitle, { color: theme.colors.text }]}>
            Qué incluye el instituto
          </Text>
          <View
            style={[
              styles.inclusionsGrid,
              {
                borderColor: theme.colors.divider,
                flexDirection: isWide ? 'row' : 'column',
                flexWrap: 'wrap',
                borderRadius: theme.radius.lg,
                overflow: 'hidden',
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            {PLATFORM_INCLUSIONS.map((inclusion) => (
              <View
                key={inclusion.number}
                style={[
                  styles.inclusion,
                  {
                    backgroundColor: theme.colors.surface,
                    width: isWide ? '33.333%' : '100%',
                    borderColor: theme.colors.divider,
                  },
                ]}
              >
                <Text style={[styles.inclusionNumber, { color: theme.colors.accent }]}>
                  {inclusion.number}
                </Text>
                <Text style={[styles.inclusionTitle, { color: theme.colors.text }]}>
                  {inclusion.title}
                </Text>
                <Text style={[styles.inclusionBody, { color: theme.colors.neutral[600] }]}>
                  {inclusion.body}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
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
  kind: 'primary' | 'secondary';
}) {
  const theme = useTheme();
  const isPrimary = kind === 'primary';

  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link">
        {({ pressed }) => (
          <View
            style={[
              styles.button,
              {
                backgroundColor: isPrimary ? theme.colors.accent : 'transparent',
                borderColor: isPrimary ? theme.colors.accent : theme.colors.divider,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonLabel,
                { color: isPrimary ? '#f2f2f3' : theme.colors.text },
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
    maxWidth: 1280,
    alignSelf: 'center',
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 13.6,
    paddingHorizontal: 20.4,
    paddingVertical: 20.4,
  },
  navStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
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
    fontSize: 15,
    fontWeight: '600',
  },
  hero: {
    paddingHorizontal: 20.4,
    paddingBottom: 40.8,
    gap: 27.2,
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 13.6,
  },
  kicker: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    maxWidth: 420,
  },
  brandRule: {
    width: 48,
    height: 2,
  },
  headline: {
    fontSize: 42,
    fontWeight: '600',
    lineHeight: 46,
    letterSpacing: -0.4,
  },
  lede: {
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 520,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10.2,
    marginTop: 6.8,
  },
  button: {
    borderWidth: 1,
    paddingVertical: 13.6,
    paddingHorizontal: 20.4,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  heroIdentity: {
    flex: 1,
    gap: 20.4,
  },
  heroPhotograph: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  lockupPlate: {
    borderWidth: 1,
    paddingVertical: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 20.4,
    paddingVertical: 40.8,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  sectionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10.2,
    marginBottom: 20.4,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '600',
  },
  courseGrid: {
    marginRight: -13.6,
  },
  steps: {
    borderWidth: 1,
  },
  step: {
    flex: 1,
    padding: 27.2,
    gap: 6.8,
  },
  stepNumber: {
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 40,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  stepBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  inclusionsBand: {
    paddingHorizontal: 20.4,
    paddingVertical: 40.8,
  },
  inclusionsRule: {
    width: 48,
    backgroundColor: '#1b70fe',
    marginBottom: 20.4,
    marginLeft: 20.4,
    borderRadius: 999,
  },
  inclusionsTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 20.4,
  },
  inclusionsGrid: {
    borderWidth: 1,
  },
  inclusion: {
    padding: 20.4,
    borderWidth: 1,
    gap: 6.8,
  },
  inclusionNumber: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
  },
  inclusionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  inclusionBody: {
    fontSize: 13,
    lineHeight: 19,
  },
});
