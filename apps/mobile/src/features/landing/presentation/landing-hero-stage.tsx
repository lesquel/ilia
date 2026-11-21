import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { MascotGuide } from '@/core/ui/mascot-guide';

const LIA_LANDING_LINE =
  'Tú dejas el material listo. El lunes ellos tienen una mejor clase.';

/**
 * Public hero: the oficio, not a clock. A vague pedido versus the Monday sheet.
 */
export function LandingHeroStage({ isWide }: { isWide: boolean }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.field,
        isWide ? styles.fieldWide : undefined,
        { backgroundColor: theme.colors.accentRamp[100] },
      ]}
      accessibilityLabel="A la izquierda, el pedido que casi mandas. A la derecha, la hoja que sí les puedes dejar el lunes. Lía escribe."
    >
      {isWide ? (
        <View style={styles.deskWide}>
          <VaguePedidoCard />
          <View style={styles.liaSlot}>
            <MascotGuide
              line={LIA_LANDING_LINE}
              lineKey="landing-hero-write"
              holdMood="write"
              size={248}
            />
          </View>
          <MondaySheetCard />
        </View>
      ) : (
        <View style={styles.deskNarrow}>
          <View style={styles.liaSlot}>
            <MascotGuide
              line={LIA_LANDING_LINE}
              lineKey="landing-hero-write"
              holdMood="write"
              size={168}
            />
          </View>
          <View style={styles.contrastPair}>
            <VaguePedidoCard />
            <MondaySheetCard />
          </View>
        </View>
      )}
    </View>
  );
}

function VaguePedidoCard() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.contrastCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
        },
      ]}
    >
      <Text style={[styles.contrastKicker, { color: theme.colors.neutral[600] }]}>
        Veamos qué pasa si pides algo como esto.
      </Text>
      <Text style={[styles.pedidoQuote, { color: theme.colors.text }]}>
        «Hazme una lectura de séptimo, bien creativa, con varias preguntas.»
      </Text>
      <Text style={[styles.contrastHint, { color: theme.colors.neutral[600] }]}>
        Así casi siempre te llega un cuento o una receta. El lunes no te sirve.
      </Text>
    </View>
  );
}

function MondaySheetCard() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.contrastCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.accent,
        },
      ]}
    >
      <Text style={[styles.contrastKicker, { color: theme.colors.accentAlt }]}>
        El mismo tema, escrito como lo pegarías tú.
      </Text>
      <View
        style={[
          styles.mondaySheet,
          {
            backgroundColor: theme.colors.bg,
            borderColor: theme.colors.accentRamp[200],
          },
        ]}
        accessibilityElementsHidden
      >
        <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
        <View style={[styles.paperLine, { backgroundColor: theme.colors.accentRamp[200] }]} />
        <View
          style={[styles.paperLine, { backgroundColor: theme.colors.accentRamp[200], width: '88%' }]}
        />
        <View
          style={[styles.paperLine, { backgroundColor: theme.colors.accentRamp[200], width: '70%' }]}
        />
        <View style={styles.questionList}>
          <QuestionRow />
          <QuestionRow />
          <QuestionRow />
          <QuestionRow />
          <QuestionRow />
        </View>
      </View>
      <Text style={[styles.contrastHint, { color: theme.colors.neutral[600] }]}>
        Un párrafo con una idea y cinco preguntas que se contestan con el
        texto. Eso es lo que les dejas el lunes.
      </Text>
    </View>
  );
}

function QuestionRow() {
  const theme = useTheme();

  return (
    <View style={styles.questionRow}>
      <View style={[styles.questionMark, { backgroundColor: theme.colors.accent }]} />
      <View style={[styles.paperLine, { backgroundColor: theme.colors.neutral[300], flex: 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: 20,
    padding: 20,
    minHeight: 360,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fieldWide: {
    minHeight: 460,
    padding: 28,
  },
  deskWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  deskNarrow: {
    gap: 16,
    alignItems: 'center',
  },
  liaSlot: {
    alignItems: 'center',
    zIndex: 1,
  },
  contrastPair: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  contrastCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    maxWidth: 260,
  },
  contrastKicker: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  pedidoQuote: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  contrastHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  mondaySheet: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  paperLine: {
    height: 4,
    borderRadius: 2,
    width: '90%',
  },
  signalSquare: {
    width: 10,
    height: 10,
    marginBottom: 2,
  },
  questionList: {
    marginTop: 4,
    gap: 5,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questionMark: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
});
