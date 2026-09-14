import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { INSTITUTE_FULL_NAME } from '@/core/brand';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { BrandMark } from '@/core/ui/brand-mark';
import { breakpoint, useTheme } from '@/core/theme';
import { useSession } from '@/features/auth';
import { CourseCard, useCourses } from '@/features/catalog';

const instituteHeroPhotograph = require('../../../../assets/brand/ilia-hero-lab.png');

const FEATURED_COURSE_COUNT = 3;

const LEARNING_STEPS = [
  {
    number: '01',
    title: 'Aprende',
    body: 'Lecciones cortas: texto, video y presentaciones, en módulos que caben entre clases.',
  },
  {
    number: '02',
    title: 'Practica',
    body: 'Cada módulo cierra con una actividad de prompting. No hay cuestionario de opción múltiple.',
  },
  {
    number: '03',
    title: 'Demuestra',
    body: 'Escribes el prompt, la plataforma lo ejecuta y te devuelve una nota con rúbrica y requisitos objetivos.',
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
    body: 'El ejercicio es escribir la instrucción. Se evalúa lo que pides y lo que obtienes.',
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

const LAB_PREVIEW_SCORES = [
  { label: 'Claridad', value: '82' },
  { label: 'Contexto', value: '78' },
  { label: 'Formato', value: '90' },
] as const;

/**
 * Public front door. A visitor should understand the product — writing
 * prompts, getting a grade — not just see an institute brochure.
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
              <Text style={[styles.kicker, { color: theme.colors.accent }]}>Laboratorio de IA</Text>
            </View>
            <Text
              style={[
                styles.headline,
                {
                  color: theme.colors.text,
                  fontSize: isWide ? 56 : 34,
                  lineHeight: isWide ? 60 : 38,
                },
              ]}
            >
              Se aprende IA escribiendo, no eligiendo A, B o C.
            </Text>
            <Text style={[styles.lede, { color: theme.colors.neutral[600] }]}>
              Escribes un prompt. La plataforma lo ejecuta y califica lo que
              pediste y lo que obtuviste. La nota se puede defender: no depende
              de un examen de memoria.
            </Text>
            <View style={styles.heroActions}>
              <ButtonLink href="/catalog" label="Explorar cursos" kind="primary" />
              {isSessionLoading ? null : showGuestActions ? (
                <ButtonLink href="/register" label="Empezar ahora" kind="ghost" />
              ) : (
                <ButtonLink href="/my-courses" label="Ir a mis cursos" kind="ghost" />
              )}
            </View>
          </View>

          <View style={styles.heroStage}>
            <Image
              source={instituteHeroPhotograph}
              style={[styles.heroPhotograph, { borderRadius: theme.radius.lg }]}
              contentFit="cover"
              accessibilityLabel="Laboratorio de ILIA: un docente escribe un prompt y recibe una evaluación"
            />
            <View
              style={[
                styles.labWindow,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.divider,
                  borderRadius: theme.radius.lg,
                  ...theme.shadow.lg,
                },
              ]}
            >
              <View style={styles.labWindowChrome}>
                <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
                <Text style={[styles.labWindowKicker, { color: theme.colors.neutral[500] }]}>
                  Sesión en vivo · evaluación
                </Text>
              </View>
              <Text style={[styles.labPrompt, { color: theme.colors.neutral[700] }]}>
                prompt ▸ actúa como docente de séptimo. Arma 5 ejercicios de
                fracciones, de menor a mayor dificultad, en una tabla con
                consigna y respuesta esperada.
              </Text>
              <View style={styles.labScores}>
                {LAB_PREVIEW_SCORES.map((score) => (
                  <View
                    key={score.label}
                    style={[styles.labScore, { borderColor: theme.colors.divider }]}
                  >
                    <Text style={[styles.labScoreLabel, { color: theme.colors.neutral[500] }]}>
                      {score.label}
                    </Text>
                    <Text style={[styles.labScoreValue, { color: theme.colors.text }]}>
                      {score.value}
                    </Text>
                  </View>
                ))}
                <View
                  style={[
                    styles.labScore,
                    { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
                  ]}
                >
                  <Text style={[styles.labScoreLabel, { color: '#ffffff', opacity: 0.8 }]}>
                    Total
                  </Text>
                  <Text style={[styles.labScoreValue, { color: '#ffffff' }]}>84</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.proofStrip, { borderColor: theme.colors.divider }]}>
        <View style={styles.page}>
          <View style={[styles.proofRow, isWide ? undefined : { flexDirection: 'column' }]}>
            <ProofClaim
              title="Sin opción múltiple"
              body="La evidencia es el prompt y el resultado, no una casilla."
            />
            <ProofClaim
              title="La nota se ancla"
              body="Lo que se puede medir, la plataforma lo mide. El modelo no vota eso."
            />
            <ProofClaim
              title="Certificado público"
              body="Una escuela verifica el código sin crear cuenta."
            />
          </View>
        </View>
      </View>

      <View style={styles.page}>
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>En el aire ahora</Text>
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
                courseColumns > 1 ? { flexDirection: 'row', flexWrap: 'wrap' } : undefined,
              ]}
            >
              {featuredCourses.map((course) => (
                <View
                  key={course.id}
                  style={
                    courseColumns > 1
                      ? { width: `${100 / courseColumns}%`, paddingRight: 16, paddingBottom: 16 }
                      : { paddingBottom: 16 }
                  }
                >
                  <CourseCard course={course} />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cómo funciona</Text>
          <Text style={[styles.lede, { color: theme.colors.neutral[600], marginBottom: 24 }]}>
            Cada módulo termina en una actividad ejecutable. Cada curso, en una
            evaluación que se puede defender.
          </Text>
          <View style={[styles.steps, isWide ? { flexDirection: 'row' } : undefined]}>
            {LEARNING_STEPS.map((step) => (
              <View
                key={step.number}
                style={[
                  styles.step,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.divider,
                    borderRadius: theme.radius.lg,
                  },
                ]}
              >
                <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
                <Text style={[styles.stepNumber, { color: theme.colors.text }]}>{step.number}</Text>
                <Text style={[styles.stepTitle, { color: theme.colors.text }]}>{step.title}</Text>
                <Text style={[styles.stepBody, { color: theme.colors.neutral[600] }]}>{step.body}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.inclusionsBand, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.page}>
          <Text style={[styles.inclusionsTitle, { color: theme.colors.text }]}>
            Qué incluye la plataforma
          </Text>
          <View style={[styles.inclusionsGrid, isWide ? undefined : { flexDirection: 'column' }]}>
            {PLATFORM_INCLUSIONS.map((inclusion) => (
              <View
                key={inclusion.number}
                style={[
                  styles.inclusion,
                  {
                    backgroundColor: theme.colors.bg,
                    borderColor: theme.colors.divider,
                    borderRadius: theme.radius.lg,
                    width: isWide ? '31.5%' : '100%',
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
    flex: 1,
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
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
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
    flex: 1.15,
    position: 'relative',
    minHeight: 280,
  },
  heroPhotograph: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  labWindow: {
    marginTop: -48,
    marginHorizontal: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  labWindowChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labWindowKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  labPrompt: {
    fontSize: 14,
    lineHeight: 21,
  },
  labScores: {
    flexDirection: 'row',
    gap: 8,
  },
  labScore: {
    flex: 1,
    borderWidth: 1,
    padding: 8,
  },
  labScoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  labScoreValue: {
    fontSize: 20,
    fontWeight: '700',
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
  steps: {
    gap: 14,
  },
  step: {
    flex: 1,
    borderWidth: 1,
    padding: 24,
    gap: 8,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  stepBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  inclusionsBand: {
    paddingVertical: 48,
    paddingHorizontal: 20.4,
  },
  inclusionsTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 22,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  inclusionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  inclusion: {
    padding: 20,
    borderWidth: 1,
    gap: 8,
  },
  inclusionNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  inclusionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inclusionBody: {
    fontSize: 13,
    lineHeight: 19,
  },
});
