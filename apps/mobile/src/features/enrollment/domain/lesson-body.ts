/**
 * Turns a lesson body into blocks a reader can scan.
 *
 * The catalog writes plain text with blank lines, bullets and a "Regla".
 * Dumping that into one <Text> is a wall. This file only classifies; it
 * does not decide how it looks.
 */

export type LessonInline = {
  text: string;
  strong?: boolean;
};

export type LessonBlock =
  | { type: 'paragraph'; inlines: LessonInline[] }
  | { type: 'list'; ordered: boolean; heading: string | null; items: LessonInline[][] }
  | {
      type: 'contrast';
      serveHeading: string;
      serveItems: LessonInline[][];
      avoidHeading: string;
      avoidItems: LessonInline[][];
    }
  | { type: 'callout'; kind: 'rule'; inlines: LessonInline[] }
  | { type: 'quote'; inlines: LessonInline[] };

export function parseInline(text: string): LessonInline[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part.length > 0)
    .map((part) => {
      const isStrong = part.startsWith('**') && part.endsWith('**') && part.length > 4;
      return { text: isStrong ? part.slice(2, -2) : part, strong: isStrong || undefined };
    });
}

export function parseLessonBody(body: string): LessonBlock[] {
  const chunks = body
    .trim()
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const blocks = chunks.map(classifyChunk);
  return mergeServeAndAvoidLists(blocks);
}

function classifyChunk(chunk: string): LessonBlock {
  if (/^Regla(\s+práctica)?:/i.test(chunk)) {
    return { type: 'callout', kind: 'rule', inlines: parseInline(chunk) };
  }

  const lines = chunk.split('\n').map((line) => line.trimEnd());
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  const bulletLines = nonEmpty.filter((line) => /^[•\-]\s/.test(line.trim()));
  const numberedLines = nonEmpty.filter((line) => /^\d+\.\s/.test(line.trim()));

  if (bulletLines.length > 0 && bulletLines.length + headingCount(nonEmpty, isBullet) === nonEmpty.length) {
    const headingLine = nonEmpty.find((line) => !isBullet(line));
    return {
      type: 'list',
      ordered: false,
      heading: headingLine?.trim() ?? null,
      items: bulletLines.map((line) => parseInline(line.trim().replace(/^[•\-]\s+/, ''))),
    };
  }

  if (numberedLines.length >= 2 && numberedLines.length === nonEmpty.length) {
    return {
      type: 'list',
      ordered: true,
      heading: null,
      items: numberedLines.map((line) => parseInline(line.trim().replace(/^\d+\.\s+/, ''))),
    };
  }

  const trimmed = chunk.trim();
  if (trimmed.startsWith('«') && trimmed.endsWith('»') && trimmed.length > 24) {
    return { type: 'quote', inlines: parseInline(trimmed) };
  }

  return { type: 'paragraph', inlines: parseInline(trimmed) };
}

function isBullet(line: string): boolean {
  return /^[•\-]\s/.test(line.trim());
}

function headingCount(lines: string[], isItem: (line: string) => boolean): number {
  return lines.some((line) => !isItem(line)) ? 1 : 0;
}

function mergeServeAndAvoidLists(blocks: LessonBlock[]): LessonBlock[] {
  const merged: LessonBlock[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const current = blocks[index];
    const next = blocks[index + 1];

    if (
      current?.type === 'list' &&
      !current.ordered &&
      next?.type === 'list' &&
      !next.ordered &&
      looksLikeServe(current.heading) &&
      looksLikeAvoid(next.heading)
    ) {
      merged.push({
        type: 'contrast',
        serveHeading: current.heading ?? 'Sirve para',
        serveItems: current.items,
        avoidHeading: next.heading ?? 'No sirve para',
        avoidItems: next.items,
      });
      index += 1;
      continue;
    }

    if (current) merged.push(current);
  }

  return merged;
}

function looksLikeServe(heading: string | null): boolean {
  if (!heading) return false;
  const normalized = heading.toLocaleLowerCase('es');
  return normalized.includes('sirve para') && !normalized.includes('no sirve');
}

function looksLikeAvoid(heading: string | null): boolean {
  if (!heading) return false;
  return heading.toLocaleLowerCase('es').includes('no sirve');
}
