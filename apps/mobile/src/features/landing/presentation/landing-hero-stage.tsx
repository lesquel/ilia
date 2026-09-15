import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { MascotGuide } from '@/core/ui/mascot-guide';

const LIA_LANDING_LINE =
  'Tú escribes el pedido. La IA te ayuda a dejar la hoja lista.';

/**
 * Public hero: Lía writing, and the afternoon of prep collapsing into
 * a sheet the teacher can photocopy.
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
      accessibilityLabel="Lía escribe. Tres horas de armado se vuelven 45 minutos y una hoja lista para fotocopiar."
    >
      {isWide ? (
        <View style={styles.deskWide}>
          <AfternoonBefore />
          <View style={styles.liaSlot}>
            <MascotGuide
              line={LIA_LANDING_LINE}
              lineKey="landing-hero-write"
              holdMood="write"
              size={248}
            />
          </View>
          <MondayAfter />
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
          <View style={styles.timePair}>
            <AfternoonBefore />
            <MondayAfter />
          </View>
        </View>
      )}
    </View>
  );
}

function AfternoonBefore() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.timeCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
        },
      ]}
    >
      <Text style={[styles.timeStamp, { color: theme.colors.neutral[500] }]}>3 h</Text>
      <Text style={[styles.timeTitle, { color: theme.colors.text }]}>Armar a mano</Text>
      <View style={styles.paperStack} accessibilityElementsHidden>
        <View
          style={[
            styles.paperSheet,
            styles.paperBack,
            { backgroundColor: theme.colors.neutral[300], borderColor: theme.colors.neutral[400] },
          ]}
        />
        <View
          style={[
            styles.paperSheet,
            styles.paperMid,
            { backgroundColor: theme.colors.neutral[200], borderColor: theme.colors.neutral[400] },
          ]}
        />
        <View
          style={[
            styles.paperSheet,
            styles.paperFront,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.divider,
            },
          ]}
        >
          <View style={[styles.paperLine, { backgroundColor: theme.colors.neutral[300] }]} />
          <View style={[styles.paperLine, { backgroundColor: theme.colors.neutral[300], width: '70%' }]} />
          <View style={[styles.paperLine, { backgroundColor: theme.colors.neutral[300], width: '55%' }]} />
        </View>
      </View>
      <Text style={[styles.timeHint, { color: theme.colors.neutral[600] }]}>
        Buscar, recortar, rehacer.
      </Text>
    </View>
  );
}

function MondayAfter() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.timeCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.accent,
        },
      ]}
    >
      <Text style={[styles.timeStamp, { color: theme.colors.accent }]}>45 min</Text>
      <Text style={[styles.timeTitle, { color: theme.colors.text }]}>Lista para copiar</Text>
      <View
        style={[
          styles.cleanSheet,
          {
            backgroundColor: theme.colors.bg,
            borderColor: theme.colors.accentRamp[200],
          },
        ]}
        accessibilityElementsHidden
      >
        <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
        <View style={[styles.paperLine, { backgroundColor: theme.colors.accentRamp[200] }]} />
        <View style={[styles.paperLine, { backgroundColor: theme.colors.accentRamp[200], width: '80%' }]} />
        <View style={[styles.paperLine, { backgroundColor: theme.colors.accentRamp[200], width: '62%' }]} />
      </View>
      <Text style={[styles.timeHint, { color: theme.colors.neutral[600] }]}>
        Un pedido. Una hoja. Al aula.
      </Text>
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
  timePair: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  timeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    maxWidth: 200,
  },
  timeStamp: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  timeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  timeHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  paperStack: {
    height: 84,
    marginVertical: 4,
  },
  paperSheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 58,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    gap: 5,
  },
  paperBack: {
    top: 0,
    left: 2,
    right: 18,
    transform: [{ rotate: '-11deg' }],
  },
  paperMid: {
    top: 10,
    left: 16,
    right: 4,
    transform: [{ rotate: '8deg' }],
  },
  paperFront: {
    top: 22,
  },
  paperLine: {
    height: 4,
    borderRadius: 2,
    width: '90%',
  },
  cleanSheet: {
    height: 72,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginVertical: 4,
  },
  signalSquare: {
    width: 10,
    height: 10,
    marginBottom: 2,
  },
});
