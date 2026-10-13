import type { LucideIcon } from 'lucide-react-native';
import {
  Award,
  Ban,
  BookOpenCheck,
  FilePen,
  GraduationCap,
  Inbox,
  Presentation,
  ShieldCheck,
  UserPlus,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import {
  certificationFunnel,
  funnelSentence,
  type PlatformOverview,
} from '@/features/admin/domain/entities';
import { Card } from '@/features/admin/presentation/ui';

const TILE_GAP = 10.2;
/** Below this a tile cannot hold its icon and a two-word label on one line. */
const TILE_MIN_WIDTH = 150;
const MAX_COLUMNS = 4;

/** The platform at a glance: who is here, what is offered, what was certified. */
export function OverviewPanel({ overview }: { overview: PlatformOverview }) {
  return (
    <View style={styles.panel}>
      <StatGroup title="Personas" note={`${overview.totalUsers} cuentas en total`}>
        {(width) => (
          <>
            <StatTile width={width} glyph={GraduationCap} label="Docentes" value={overview.students} />
            <StatTile
              width={width}
              glyph={Presentation}
              label="Instructores"
              value={overview.instructors}
            />
            <StatTile
              width={width}
              glyph={ShieldCheck}
              label="Administradores"
              value={overview.admins}
            />
          </>
        )}
      </StatGroup>

      <StatGroup
        title="Cursos"
        note={`${overview.totalCourses} en total · ${overview.coursesArchived} archivados`}
      >
        {(width) => (
          <>
            <StatTile
              width={width}
              glyph={BookOpenCheck}
              label="Cursos publicados"
              value={overview.coursesPublished}
            />
            <StatTile width={width} glyph={FilePen} label="Borradores" value={overview.coursesDraft} />
            <StatTile
              width={width}
              glyph={UserPlus}
              label="Inscripciones"
              value={overview.enrollments}
            />
            <StatTile width={width} glyph={Inbox} label="Entregas" value={overview.submissions} />
          </>
        )}
      </StatGroup>

      <StatGroup title="Certificación">
        {(width) => (
          <>
            <StatTile
              width={width}
              glyph={Award}
              label="Certificados"
              value={overview.certificatesIssued}
            />
            <StatTile
              width={width}
              glyph={Ban}
              label="Revocados"
              value={overview.certificatesRevoked}
            />
          </>
        )}
      </StatGroup>

      <Card
        title="Del catálogo a la certificación"
        hint="Inscripciones, entregas y certificados emitidos en toda la plataforma. Cada barra se mide contra la mayor de las tres."
      >
        <FunnelChart overview={overview} />
      </Card>
    </View>
  );
}

/**
 * A heading and its tiles on a measured grid.
 *
 * The width is measured rather than left to `flexGrow`: a growing tile that
 * wraps alone stretches across the whole row, and a group of two would end up
 * with tiles twice as wide as a group of four. Every group lands on the same
 * columns this way.
 */
function StatGroup({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: (tileWidth: number | undefined) => ReactNode;
}) {
  const theme = useTheme();
  const [rowWidth, setRowWidth] = useState(0);

  const columns = Math.max(
    2,
    Math.min(MAX_COLUMNS, Math.floor((rowWidth + TILE_GAP) / (TILE_MIN_WIDTH + TILE_GAP))),
  );
  // Floored so rounding never pushes the last tile of a row onto the next one.
  const tileWidth =
    rowWidth > 0 ? Math.floor((rowWidth - TILE_GAP * (columns - 1)) / columns) : undefined;

  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Text accessibilityRole="header" style={[styles.groupTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        {note ? (
          <Text style={[styles.groupNote, { color: theme.colors.neutral[800] }]}>{note}</Text>
        ) : null}
      </View>
      <View
        style={styles.tiles}
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      >
        {children(tileWidth)}
      </View>
    </View>
  );
}

// Labels use neutral 800, the one secondary ink the theme flips for dark: 600
// and 700 stay mid-grey there and fall under contrast on the dark surface.
function StatTile({
  glyph,
  label,
  value,
  width,
}: {
  glyph: LucideIcon;
  label: string;
  value: number;
  width: number | undefined;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tile,
        // Until the row is measured the tile takes a fixed basis, so the first
        // frame is already a grid and not one tile per line.
        width === undefined ? styles.tileUnmeasured : { width },
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <View
        style={[
          styles.tileIcon,
          { backgroundColor: theme.colors.accentRamp[100], borderRadius: theme.radius.sm },
        ]}
      >
        <Icon glyph={glyph} size={18} color={theme.colors.accent} />
      </View>
      <Text style={[styles.tileValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: theme.colors.neutral[800] }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Three bars on one scale, each with its number written at the end.
 *
 * One hue on a neutral track: the bars are the same measure, so the length and
 * the number carry the comparison and colour says nothing on its own.
 */
function FunnelChart({ overview }: { overview: PlatformOverview }) {
  const theme = useTheme();
  const steps = certificationFunnel(overview);
  const muted = theme.colors.neutral[800];

  if (steps.length === 0) {
    return (
      <Text style={[styles.body, { color: muted }]}>
        Todavía no hay inscripciones, entregas ni certificados que comparar.
      </Text>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Del catálogo a la certificación: ${funnelSentence(steps)}.`}
      style={styles.barList}
    >
      {steps.map((step) => (
        <View key={step.key} style={styles.barRow}>
          <Text style={[styles.barLabel, { color: muted }]} numberOfLines={1}>
            {step.label}
          </Text>
          <View style={[styles.track, { backgroundColor: theme.colors.neutral[200] }]}>
            <View
              style={[
                styles.fill,
                { width: `${step.share}%`, backgroundColor: theme.colors.accent },
              ]}
            />
          </View>
          <Text style={[styles.barValue, { color: theme.colors.text }]}>{step.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 20.4 },
  group: { gap: 10.2 },
  groupHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 10.2,
    rowGap: 3.4,
  },
  groupTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  groupNote: { fontSize: 13 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: { borderWidth: 1, padding: 13.6, gap: 3.4 },
  tileUnmeasured: { flexBasis: TILE_MIN_WIDTH, flexGrow: 0 },
  tileIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6.8,
  },
  tileValue: { fontSize: 30, fontWeight: '700', lineHeight: 36, letterSpacing: -0.6 },
  tileLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  body: { fontSize: 15, lineHeight: 22 },
  barList: { gap: 10.2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10.2 },
  barLabel: { width: 104, fontSize: 13, fontWeight: '600' },
  track: { flex: 1, height: 12, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  barValue: { minWidth: 44, fontSize: 14, fontWeight: '700', textAlign: 'right' },
});
