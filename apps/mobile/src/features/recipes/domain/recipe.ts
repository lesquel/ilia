/**
 * A saved lab prompt: one the teacher wants to reuse in her own classroom.
 *
 * Keyed by the submission it came from, so saving the same attempt twice keeps
 * one entry rather than two copies that drift apart.
 */
export interface Recipe {
  /** The submission id. */
  id: string;
  prompt: string;
  activityTitle: string;
  /** Effective total of the evaluation, 0-100. */
  score: number;
  savedAt: string;
  note?: string;
}

/** Newest first; a recipe from the same submission replaces the old one. */
export function addRecipe(recipes: readonly Recipe[], recipe: Recipe): Recipe[] {
  return [recipe, ...recipes.filter((item) => item.id !== recipe.id)];
}

export function removeRecipe(recipes: readonly Recipe[], id: string): Recipe[] {
  return recipes.filter((item) => item.id !== id);
}

export function hasRecipe(recipes: readonly Recipe[], id: string): boolean {
  return recipes.some((item) => item.id === id);
}

/** Plain text to paste into a chat, a planning doc or a projector slide. */
export function toClassroomText(recipe: Recipe): string {
  const lines = [recipe.activityTitle, '', recipe.prompt.trim()];
  if (recipe.note?.trim()) lines.push('', `Apunte: ${recipe.note.trim()}`);
  return lines.join('\n');
}
