import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/core/theme';
import { analyzePromptSignals } from '@/features/lab/domain/prompt-signals';

/** Indicador formativo: no permite inferir autoría ni uso de IA. */
export function PromptSignalsPanel({ prompt }: { prompt: string }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const result = analyzePromptSignals(prompt);
  const words = prompt.match(/[\p{L}\p{N}]+/gu) ?? [];
  const found = result.signals.filter((signal) => signal.found).length;
  const score = result.enoughText ? result.percentage : 0;
  const compact = width < 760;
  const circleRadius = 54;
  const circumference = 2 * Math.PI * circleRadius;

  const recommendation = !result.enoughText
    ? `Escribe al menos ${Math.max(0, 15 - words.length)} palabras más para activar el análisis de patrones.`
    : found >= 3
      ? 'Tu prompt reúne varias expresiones habituales. Añade el grado escolar, los conocimientos previos, un objetivo concreto y un formato verificable.'
      : 'Haz tu pedido más preciso: indica a quién va dirigido, qué materiales necesitas, qué restricciones hay y cómo debe lucir el resultado.';

  return (
    <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>ILIA · MÓDULO EXPERIMENTAL</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>Análisis inteligente del prompt</Text>
          <Text style={[styles.description, { color: theme.colors.neutral[700] }]}>
            Explora la estructura y las expresiones de tu pedido antes de enviarlo.
          </Text>
        </View>
        <View style={[styles.tag, { backgroundColor: theme.colors.accentRamp[100] }]}>
          <Text style={[styles.tagText, { color: theme.colors.accentRamp[700] }]}>V2 · EN VIVO</Text>
        </View>
      </View>

      <View style={[styles.overview, compact && styles.stacked]}>
        <View style={[styles.chartCard, { backgroundColor: theme.colors.bg, borderColor: theme.colors.divider }]}>
          <View style={styles.ringWrap} accessible accessibilityLabel={result.enoughText ? `${score} por ciento de patrones detectados` : 'Análisis pendiente'}>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <Circle cx="80" cy="80" r={circleRadius} stroke={theme.colors.neutral[300]} strokeWidth={13} fill="none" />
              <Circle
                cx="80" cy="80" r={circleRadius}
                stroke={theme.colors.accent} strokeWidth={13} fill="none"
                strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - score / 100)}
                rotation={-90} origin="80, 80"
              />
            </Svg>
            <View style={styles.ringText} pointerEvents="none">
              <Text style={[styles.percentage, { color: theme.colors.text }]}>{result.enoughText ? `${score}%` : '—'}</Text>
              <Text style={[styles.ringCaption, { color: theme.colors.neutral[600] }]}>Patrones</Text>
            </View>
          </View>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
            {result.enoughText ? `${found} de ${result.signals.length} encontrados` : 'Análisis pendiente'}
          </Text>
          <Text style={[styles.small, { color: theme.colors.neutral[600] }]}>{words.length} palabras · Mínimo 15</Text>
        </View>

        <View style={[styles.signalCard, { backgroundColor: theme.colors.bg, borderColor: theme.colors.divider }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Indicadores analizados</Text>
          {result.signals.map((signal, index) => {
            const active = result.enoughText && signal.found;
            return (
              <View key={signal.label} style={styles.signalRow}>
                <View style={[styles.signalIcon, { backgroundColor: active ? theme.colors.accentRamp[100] : theme.colors.neutral[200] }]}>
                  <Text style={{ color: active ? theme.colors.accent : theme.colors.neutral[600], fontWeight: '700' }}>
                    {active ? '✓' : '–'}
                  </Text>
                </View>
                <View style={styles.signalContent}>
                  <Text style={[styles.signalLabel, { color: theme.colors.text }]}>{index + 1}. {signal.label}</Text>
                  <View style={[styles.track, { backgroundColor: theme.colors.neutral[200] }]}>
                    <View style={[styles.fill, { backgroundColor: theme.colors.accent, width: active ? '100%' : '0%' }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.recommendation, { backgroundColor: theme.colors.accentRamp[100] }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.accentRamp[800] }]}>✦ Recomendación para mejorar tu prompt</Text>
        <Text style={[styles.recommendationText, { color: theme.colors.neutral[800] }]}>{recommendation}</Text>
      </View>

      <View style={[styles.disclaimer, { borderTopColor: theme.colors.divider }]}>
        <Text style={[styles.small, { color: theme.colors.neutral[600] }]}>
          Este porcentaje solo indica la presencia de cinco patrones lingüísticos predefinidos.
          No mide contenido generado con IA, no comprueba autoría y no debe usarse para calificar o sancionar estudiantes.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 18, padding: 20, gap: 18, marginBottom: 18 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  headingCopy: { flexGrow: 1, flexShrink: 1, minWidth: 190, gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  description: { fontSize: 14, lineHeight: 20 },
  tag: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20 },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  overview: { flexDirection: 'row', gap: 14 },
  stacked: { flexDirection: 'column' },
  chartCard: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 14, alignItems: 'center', padding: 14, justifyContent: 'center', gap: 6 },
  ringWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  ringText: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  percentage: { fontSize: 32, fontWeight: '800' },
  ringCaption: { fontSize: 12 },
  chartTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  small: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  signalCard: { flex: 2, minWidth: 0, borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signalIcon: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  signalContent: { flex: 1, gap: 6 },
  signalLabel: { fontSize: 12, lineHeight: 17 },
  track: { height: 6, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  recommendation: { borderRadius: 14, padding: 16, gap: 8 },
  recommendationText: { fontSize: 13, lineHeight: 21 },
  disclaimer: { paddingTop: 12, borderTopWidth: 1 },
});
