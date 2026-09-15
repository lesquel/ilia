import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

export type IdeaArtMotif = 'clock' | 'sheet' | 'pedido' | 'aula';

export function motifForIdeaScene(plainText: string, sceneIndex: number): IdeaArtMotif {
  const normalized = plainText.toLocaleLowerCase('es');
  if (/\b45\b|reloj/.test(normalized)) return 'clock';
  const rotation: IdeaArtMotif[] = ['pedido', 'sheet', 'aula', 'clock'];
  return rotation[sceneIndex % rotation.length] ?? 'pedido';
}

export function IdeaSceneArt({
  plainText,
  sceneIndex,
  compact,
}: {
  plainText: string;
  sceneIndex: number;
  compact: boolean;
}) {
  const theme = useTheme();
  const motif = motifForIdeaScene(plainText, sceneIndex);

  return (
    <View
      style={[
        styles.poster,
        compact ? styles.posterCompact : undefined,
        { backgroundColor: theme.colors.accentRamp[100] },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
      {motif === 'clock' ? <ClockMotif /> : null}
      {motif === 'sheet' ? <SheetMotif /> : null}
      {motif === 'pedido' ? <PedidoMotif /> : null}
      {motif === 'aula' ? <AulaMotif /> : null}
    </View>
  );
}

function ClockMotif() {
  const theme = useTheme();
  return (
    <View style={styles.motifCenter}>
      <View
        style={[
          styles.clockFace,
          { borderColor: theme.colors.accent, backgroundColor: theme.colors.surface },
        ]}
      >
        <Text style={[styles.clockLabel, { color: theme.colors.accent }]}>45</Text>
      </View>
    </View>
  );
}

function SheetMotif() {
  const theme = useTheme();
  return (
    <View style={styles.motifCenter}>
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.divider,
          },
        ]}
      >
        <View style={[styles.sheetLine, { backgroundColor: theme.colors.neutral[200] }]} />
        <View style={[styles.sheetLine, { backgroundColor: theme.colors.neutral[200] }]} />
        <View style={[styles.sheetLineShort, { backgroundColor: theme.colors.accentRamp[200] }]} />
        <View style={[styles.sheetLine, { backgroundColor: theme.colors.neutral[200] }]} />
      </View>
    </View>
  );
}

function PedidoMotif() {
  const theme = useTheme();
  return (
    <View style={styles.motifCenter}>
      <View
        style={[
          styles.promptCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.divider,
          },
        ]}
      >
        <Text style={[styles.promptHint, { color: theme.colors.neutral[500] }]}>prompt ▸</Text>
        <View style={[styles.sheetLine, { backgroundColor: theme.colors.neutral[200] }]} />
        <View style={[styles.sheetLineShort, { backgroundColor: theme.colors.accent }]} />
      </View>
    </View>
  );
}

function AulaMotif() {
  const theme = useTheme();
  return (
    <View style={styles.aula}>
      <View style={[styles.desk, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]} />
      <View style={[styles.desk, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]} />
      <View style={[styles.board, { backgroundColor: theme.colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    flex: 1,
    borderRadius: 20,
    minHeight: 280,
    overflow: 'hidden',
    justifyContent: 'center',
    padding: 28,
  },
  posterCompact: {
    flex: 0,
    minHeight: 160,
    padding: 16,
  },
  signalSquare: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 14,
    height: 14,
  },
  motifCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockFace: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockLabel: {
    fontSize: 40,
    fontWeight: '700',
  },
  sheet: {
    width: 132,
    height: 168,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
    transform: [{ rotate: '6deg' }],
  },
  sheetLine: {
    height: 8,
    width: '100%',
    borderRadius: 99,
  },
  sheetLineShort: {
    height: 8,
    width: '62%',
    borderRadius: 99,
  },
  promptCard: {
    width: '100%',
    maxWidth: 240,
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  promptHint: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  aula: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
  },
  desk: {
    width: 168,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
  },
  board: {
    width: 120,
    height: 72,
    marginTop: 8,
  },
});
