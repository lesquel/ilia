/** Landing domain. Plain TypeScript, shared by all platforms. */

const COUNT_WORDS: Record<number, string> = { 2: 'dos', 3: 'tres' };

/**
 * The heading over the courses the landing lists.
 *
 * It used to say "Los tres cursos" whatever was under it. The number is only
 * stated when it matches the cards, and it says "primeros" when the catalogue
 * holds more than the landing shows.
 */
export function featuredCoursesHeading(shown: number, catalogHasMore: boolean): string {
  if (shown === 1) return catalogHasMore ? 'El primer curso' : 'El curso';

  const word = COUNT_WORDS[shown];
  if (!word) return 'Los cursos';

  return catalogHasMore ? `Los ${word} primeros cursos` : `Los ${word} cursos`;
}
