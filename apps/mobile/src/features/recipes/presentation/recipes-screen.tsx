import { CalendarDays, Copy, NotebookPen } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState, LoadingState } from '@/core/ui/state-view';
import { Card, Fact, OutlineButton, ScreenHeader, Tag } from '@/core/ui/surface';

import { useRecipes } from '../application/use-recipes';
import { toClassroomText, type Recipe } from '../domain/recipe';

function savedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(date);
}

/** Web copies to the clipboard; native opens the share sheet (no expo-clipboard). */
async function copyRecipe(recipe: Recipe): Promise<boolean> {
  const text = toClassroomText(recipe);
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  }
  await Share.share({ message: text });
  return false;
}

export function RecipesScreen() {
  const theme = useTheme();
  const { recipes, isReady, remove } = useRecipes();

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      <ScreenHeader
        back={{ label: 'Historial de entregas', href: '/evaluations' }}
        title="Mi recetario"
        subtitle="Tus mejores pedidos del laboratorio, listos para usarlos en clase. Se guardan solo en este dispositivo."
      />

      {!isReady ? (
        <LoadingState label="Abriendo tu recetario…" />
      ) : recipes.length === 0 ? (
        <EmptyState
          glyph={NotebookPen}
          title="Tu recetario está vacío"
          hint="Cuando un pedido del laboratorio te funcione, guárdalo desde su resultado con «Guardar en mi recetario»."
          action={{ label: 'Ir a mis cursos', href: '/my-courses' }}
        />
      ) : (
        recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} onRemove={() => void remove(recipe.id)} />
        ))
      )}
    </ScrollView>
  );
}

function RecipeCard({ recipe, onRemove }: { recipe: Recipe; onRemove: () => void }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{recipe.activityTitle}</Text>
        <Tag label={`Nota ${recipe.score}`} tone="accent" filled />
      </View>
      <Fact glyph={CalendarDays} label={`Guardado el ${savedDate(recipe.savedAt)}`} />
      <Text style={[styles.prompt, { color: theme.colors.neutral[800] }]} selectable>
        {recipe.prompt}
      </Text>
      {recipe.note ? (
        <Text style={[styles.note, { color: theme.colors.neutral[600] }]}>Apunte: {recipe.note}</Text>
      ) : null}
      <View style={styles.actions}>
        <OutlineButton
          label={copied ? 'Copiado' : 'Copiar'}
          glyph={Copy}
          accessibilityLabel={`Copiar el pedido de ${recipe.activityTitle}`}
          onPress={() =>
            void copyRecipe(recipe)
              .then((didCopy) => setCopied(didCopy))
              .catch(() => setCopied(false))
          }
        />
        <OutlineButton
          label="Quitar"
          accessibilityLabel={`Quitar el pedido de ${recipe.activityTitle} de tu recetario`}
          onPress={onRemove}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20.4, maxWidth: 960, width: '100%', alignSelf: 'center', gap: 20.4 },
  card: { gap: 10.2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10.2 },
  title: { fontSize: 16, fontWeight: '600', flex: 1 },
  prompt: { fontSize: 14, lineHeight: 21 },
  note: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2 },
});
