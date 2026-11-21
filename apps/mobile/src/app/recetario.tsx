import { RequireAuth } from '@/features/auth/presentation/require-auth';
import { RecipesScreen } from '@/features/recipes';

/** "Mi recetario": saved lab prompts, kept on this device. */
export default function RecetarioRoute() {
  return (
    <RequireAuth>
      <RecipesScreen />
    </RequireAuth>
  );
}
