import { Bookmark, BookmarkCheck } from 'lucide-react-native';

import { OutlineButton } from '@/core/ui/surface';

import { useRecipes } from '../application/use-recipes';

interface Props {
  submissionId: string;
  prompt: string;
  activityTitle: string;
  score: number;
}

/** Toggles one lab attempt in and out of "Mi recetario". */
export function SaveRecipeButton({ submissionId, prompt, activityTitle, score }: Props) {
  const { canSave, isReady, isSaved, save, remove } = useRecipes();
  if (!canSave || !isReady) return null;

  const saved = isSaved(submissionId);

  return (
    <OutlineButton
      label={saved ? 'Guardado en tu recetario' : 'Guardar en mi recetario'}
      glyph={saved ? BookmarkCheck : Bookmark}
      accessibilityLabel={
        saved ? 'Quitar este pedido de tu recetario' : 'Guardar este pedido en tu recetario'
      }
      onPress={() =>
        void (saved
          ? remove(submissionId)
          : save({
              id: submissionId,
              prompt,
              activityTitle,
              score: Math.round(score),
              savedAt: new Date().toISOString(),
            }))
      }
    />
  );
}
