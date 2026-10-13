import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { useAddActivity } from '@/features/instructor/application/use-instructor';
import type { DimensionInput } from '@/features/instructor/data/instructor-repository';
import {
  Field,
  FieldGroup,
  FieldLabel,
  OutlineButton,
  SubCard,
} from '@/features/instructor/presentation/ui';

const MAX_DIMENSIONS = 8;

/** What a new activity starts with. Editable, and enough to be useful as-is. */
const STARTING_DIMENSIONS: DimensionInput[] = [
  {
    key: 'claridad',
    name: 'Claridad y especificidad',
    description: '¿La instrucción es inequívoca?',
    kind: 'prompt',
    weight: 2,
  },
  {
    key: 'resultado',
    name: 'Calidad del resultado',
    description: '¿La salida cumple el objetivo?',
    kind: 'result',
    weight: 1,
  },
];

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos crear la actividad.';

  switch (error.code) {
    case 'invalid_activity':
      return 'Revisa las dimensiones: cada una necesita una clave distinta y un peso mayor a cero.';
    case 'module_not_found':
      return 'Ese módulo no es de este curso.';
    case 'validation_error':
      return 'Faltan datos: el título, el enunciado y al menos una dimensión.';
    default:
      return 'No pudimos crear la actividad.';
  }
}

/**
 * Author a lab activity.
 *
 * This is the screen the product exists for: everything else in the instructor
 * area builds the course around it. Until it existed, activities had to be
 * inserted into the database by hand.
 */
export function ActivityComposer({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const theme = useTheme();
  const add = useAddActivity(courseId);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('3');
  const [dimensions, setDimensions] = useState<DimensionInput[]>(STARTING_DIMENSIONS);
  const [terms, setTerms] = useState('');
  const [minLength, setMinLength] = useState('15');
  const [requiresFormat, setRequiresFormat] = useState(true);
  const [requiresRole, setRequiresRole] = useState(true);

  const ready = title.trim().length > 0 && statement.trim().length > 0 && !add.isPending;

  const submit = () => {
    if (!ready) return;

    add.mutate(
      {
        moduleId,
        input: {
          title: title.trim(),
          statement: statement.trim(),
          maxAttempts: Number(maxAttempts) || 3,
          dimensions,
          // One line per requirement, synonyms separated by commas: matching
          // any one of them counts, so "fracciones, fraccionarios" is one rule.
          requiredTerms: terms
            .split('\n')
            .map((line) => line.split(',').map((term) => term.trim()).filter(Boolean))
            .filter((group) => group.length > 0),
          minLength: Number(minLength) || 0,
          requiresFormat,
          requiresRole,
        },
      },
      {
        onSuccess: () => {
          setTitle('');
          setStatement('');
          setTerms('');
          setDimensions(STARTING_DIMENSIONS);
          setOpen(false);
        },
      },
    );
  };

  const updateDimension = (index: number, patch: Partial<DimensionInput>) =>
    setDimensions((current) =>
      current.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );

  if (!open) {
    return <OutlineButton glyph={Plus} label="Agregar actividad" onPress={() => setOpen(true)} />;
  }

  return (
    <SubCard title="Nueva actividad">
      <FieldGroup title="La consigna">
        <FieldLabel>Título</FieldLabel>
        <Field
          value={title}
          onChangeText={setTitle}
          placeholder="Escribe tu primer prompt"
          accessibilityLabel="Título de la actividad"
        />

        <FieldLabel>Enunciado</FieldLabel>
        <Field
          value={statement}
          onChangeText={setStatement}
          multiline
          textAlignVertical="top"
          placeholder="Qué tiene que lograr el docente con su prompt."
          accessibilityLabel="Enunciado de la actividad"
        />

        <FieldLabel>Intentos</FieldLabel>
        <Field
          style={styles.number}
          value={maxAttempts}
          onChangeText={setMaxAttempts}
          keyboardType="number-pad"
          accessibilityLabel="Intentos permitidos"
        />
      </FieldGroup>

      <FieldGroup
        title="Qué se evalúa"
        hint="Los pesos son relativos: se normalizan al calificar, así que quitar una dimensión no reescala la nota de nadie."
      >
        {dimensions.map((dimension, index) => (
          <View
            key={dimension.key}
            style={[
              styles.dimension,
              { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
            ]}
          >
            <Field
              value={dimension.name}
              onChangeText={(value) => updateDimension(index, { name: value })}
              accessibilityLabel={`Nombre de la dimensión ${index + 1}`}
            />
            <Field
              value={dimension.description}
              onChangeText={(value) => updateDimension(index, { description: value })}
              placeholder="Qué mira esta dimensión"
              accessibilityLabel={`Descripción de la dimensión ${index + 1}`}
            />

            <View style={styles.dimensionRow}>
              {/* Prompt or result: the split is the product's whole point. Someone
                  who got a good answer by luck and someone who wrote a good
                  instruction do not deserve the same mark. */}
              {(['prompt', 'result'] as const).map((kind) => (
                <Pressable
                  key={kind}
                  accessibilityRole="button"
                  onPress={() => updateDimension(index, { kind })}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        dimension.kind === kind ? theme.colors.accent : 'transparent',
                      borderColor:
                        dimension.kind === kind ? theme.colors.accent : theme.colors.divider,
                      borderRadius: theme.radius.sm,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: dimension.kind === kind ? '#f2f2f3' : theme.colors.neutral[800],
                      },
                    ]}
                  >
                    {kind === 'prompt' ? 'El prompt' : 'El resultado'}
                  </Text>
                </Pressable>
              ))}

              <View style={styles.weightGroup}>
                <Text style={[styles.weightLabel, { color: theme.colors.neutral[800] }]}>Peso</Text>
                <Field
                  style={styles.weight}
                  value={String(dimension.weight)}
                  onChangeText={(value) => updateDimension(index, { weight: Number(value) || 1 })}
                  keyboardType="decimal-pad"
                  accessibilityLabel={`Peso de la dimensión ${index + 1}`}
                />

                {dimensions.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setDimensions((current) => current.filter((_, i) => i !== index))
                    }
                    style={styles.removeHit}
                  >
                    <Text style={[styles.remove, { color: theme.colors.neutral[600] }]}>
                      Quitar
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ))}

        {dimensions.length < MAX_DIMENSIONS ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setDimensions((current) => [
                ...current,
                {
                  key: `dimension_${current.length + 1}`,
                  name: 'Nueva dimensión',
                  description: '',
                  kind: 'prompt',
                  weight: 1,
                },
              ])
            }
            style={styles.addDimension}
          >
            <Text style={[styles.toggle, { color: theme.colors.accent }]}>+ Otra dimensión</Text>
          </Pressable>
        ) : null}
      </FieldGroup>

      {/* Said plainly, because it is the part of the grade that does not move. */}
      <FieldGroup
        title="Requisitos verificables"
        hint="Los comprueba la plataforma sola, sin modelo de por medio. Se le muestran al docente antes de que escriba: reprobar por algo que nadie avisó es una trampa, no una clase."
      >
        <FieldLabel>Términos que el prompt debe mencionar</FieldLabel>
        <Field
          value={terms}
          onChangeText={setTerms}
          multiline
          textAlignVertical="top"
          placeholder={'Uno por línea. Sinónimos separados por coma:\nfracciones, fraccionarios'}
          accessibilityLabel="Términos requeridos"
        />

        <FieldLabel>Palabras mínimas</FieldLabel>
        <Field
          style={styles.number}
          value={minLength}
          onChangeText={setMinLength}
          keyboardType="number-pad"
          accessibilityLabel="Palabras mínimas"
        />

        {/* The label is a sibling `Text`, which a screen reader has no way to
            associate with the switch: it would announce "interruptor, apagado"
            and nothing else. The name has to be on the control itself. */}
        <View style={styles.switchRow}>
          <Switch
            value={requiresFormat}
            onValueChange={setRequiresFormat}
            accessibilityLabel="Debe indicar en qué formato quiere la respuesta"
          />
          <Text style={[styles.switchLabel, { color: theme.colors.neutral[800] }]}>
            Debe indicar en qué formato quiere la respuesta
          </Text>
        </View>

        <View style={styles.switchRow}>
          <Switch
            value={requiresRole}
            onValueChange={setRequiresRole}
            accessibilityLabel="Debe darle un rol o una audiencia al modelo"
          />
          <Text style={[styles.switchLabel, { color: theme.colors.neutral[800] }]}>
            Debe darle un rol o una audiencia al modelo
          </Text>
        </View>
      </FieldGroup>

      {add.isError ? (
        <Text
          style={[styles.error, { color: theme.colors.accentRamp[700] }]}
          accessibilityRole="alert"
        >
          {messageFor(add.error)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
          <Text style={[styles.cancel, { color: theme.colors.neutral[600] }]}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!ready}
          onPress={submit}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.md,
              opacity: !ready ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {add.isPending ? (
            <ActivityIndicator size="small" color="#f2f2f3" />
          ) : (
            <Text style={styles.buttonLabel}>Crear actividad</Text>
          )}
        </Pressable>
      </View>
    </SubCard>
  );
}

const styles = StyleSheet.create({
  // A count, not a sentence: a full-width box would promise more than it holds.
  number: { width: 120 },
  dimension: { borderWidth: 1, padding: 10.2, gap: 6.8, marginTop: 6.8 },
  dimensionRow: { flexDirection: 'row', alignItems: 'center', gap: 6.8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, paddingHorizontal: 10.2, paddingVertical: 6.8 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  // Pushed to the far edge so weight and "Quitar" line up down the list.
  weightGroup: { flexDirection: 'row', alignItems: 'center', gap: 6.8, marginLeft: 'auto' },
  weightLabel: { fontSize: 13 },
  weight: { width: 72, textAlign: 'center' },
  removeHit: { minWidth: 48, alignItems: 'flex-end', paddingVertical: 6.8 },
  remove: { fontSize: 13, fontWeight: '600' },
  addDimension: { alignSelf: 'flex-start', paddingVertical: 6.8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10.2, marginTop: 10.2 },
  switchLabel: { fontSize: 13, flexShrink: 1 },
  error: { fontSize: 13, marginTop: 6.8 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20.4,
    marginTop: 13.6,
  },
  toggle: { fontSize: 13, fontWeight: '600' },
  cancel: { fontSize: 14, fontWeight: '600' },
  button: {
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 14, fontWeight: '600' },
});
