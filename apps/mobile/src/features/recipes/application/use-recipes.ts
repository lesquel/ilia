import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth';

import { recipeStore, type RecipeStore } from '../data/recipe-store';
import { hasRecipe, type Recipe } from '../domain/recipe';

const EMPTY: Recipe[] = [];

/**
 * The signed-in user's recetario. Local state over the device store, the same
 * shape `useDraft` uses: there is no server copy to cache or invalidate.
 */
export function useRecipes(store: RecipeStore = recipeStore) {
  const { user, isLoading: isCheckingSession } = useSession();
  const userId = user?.id ?? null;
  // The list remembers whose it is, so switching user never shows the last
  // person's recipes and "ready" needs no extra state set inside the effect.
  const [loaded, setLoaded] = useState<{ userId: string; recipes: Recipe[] } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void store.list(userId).then((list) => {
      if (!cancelled) setLoaded({ userId, recipes: list });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, store]);

  const isCurrent = userId !== null && loaded?.userId === userId;
  const recipes = isCurrent ? loaded.recipes : EMPTY;
  const isReady = userId ? isCurrent : !isCheckingSession;

  const save = useCallback(
    async (recipe: Recipe) => {
      if (!userId) return;
      setLoaded({ userId, recipes: await store.save(userId, recipe) });
    },
    [userId, store],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!userId) return;
      setLoaded({ userId, recipes: await store.remove(userId, id) });
    },
    [userId, store],
  );

  const isSaved = useCallback((id: string) => hasRecipe(recipes, id), [recipes]);

  return { recipes, isReady, canSave: Boolean(userId), save, remove, isSaved };
}
