/**
 * Turns a lesson body into blocks a reader can scan.
 *
 * The catalog writes plain text with blank lines, bullets, a "Regla" and
 * fenced worked examples (`:::ejemplo`). Dumping that into one <Text> is a
 * wall. This file only classifies; it does not decide how it looks.
 */

export type LessonInline = {
  text: string;
  strong?: boolean;
};

export type ExampleKind = 'prompt' | 'output' | 'table' | 'artifact';

export type LessonTable = {
  headers: string[];
  rows: string[][];
};

export type WorkedExample = {
  title: string;
  kind: ExampleKind;
  inlines: LessonInline[];
  table: LessonTable | null;
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
  | { type: 'quote'; inlines: LessonInline[] }
  | { type: 'example'; example: WorkedExample }
  | { type: 'examplePair'; weak: WorkedExample; strong: WorkedExample }
  | { type: 'promptResult'; prompt: WorkedExample; result: WorkedExample };

const EXAMPLE_FENCE =
  /:::ejemplo(?:[ \t]+([^\n]+))?[ \t]*\n([\s\S]*?)\n[ \t]*:::/g;

export function examplePlainText(example: WorkedExample): string {
  const prose = example.inlines.map((part) => part.text).join('').trim();
  if (!example.table) {
    return prose;
  }

  const headerLine = example.table.headers.join(' · ');
  const bodyLines = example.table.rows.map((row) => row.join(' · '));
  return [prose, headerLine, ...bodyLines].filter((line) => line.length > 0).join('\n');
}

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
  const segments = splitProseAndExamples(body.trim());
  const blocks: LessonBlock[] = [];

  for (const segment of segments) {
    if (segment.kind === 'example') {
      blocks.push({ type: 'example', example: parseWorkedExample(segment.title, segment.body) });
      continue;
    }

    const chunks = segment.body
      .split(/\n{2,}/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    blocks.push(...chunks.map(classifyChunk));
  }

  return mergeAdjacentBlocks(blocks);
}

function splitProseAndExamples(
  body: string,
): ({ kind: 'prose'; body: string } | { kind: 'example'; title: string; body: string })[] {
  const segments: (
    { kind: 'prose'; body: string } | { kind: 'example'; title: string; body: string }
  )[] = [];
  let cursor = 0;
  EXAMPLE_FENCE.lastIndex = 0;

  for (const match of body.matchAll(EXAMPLE_FENCE)) {
    const matchStart = match.index ?? 0;
    const proseBefore = body.slice(cursor, matchStart).trim();
    if (proseBefore.length > 0) {
      segments.push({ kind: 'prose', body: proseBefore });
    }
    segments.push({
      kind: 'example',
      title: (match[1] ?? 'Ejemplo').trim(),
      body: match[2]?.trim() ?? '',
    });
    cursor = matchStart + match[0].length;
  }

  const proseAfter = body.slice(cursor).trim();
  if (proseAfter.length > 0) {
    segments.push({ kind: 'prose', body: proseAfter });
  }

  return segments;
}

function parseWorkedExample(title: string, body: string): WorkedExample {
  const table = parsePipeTable(body);
  const prose = table ? proseOutsidePipeTable(body) : body.trim();
  return {
    title,
    kind: table ? 'table' : inferExampleKind(title),
    inlines: prose.length > 0 ? parseInline(prose) : [],
    table,
  };
}

function proseOutsidePipeTable(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.trim().startsWith('|'))
    .join('\n')
    .trim();
}

function inferExampleKind(title: string): ExampleKind {
  const normalized = title.toLocaleLowerCase('es');
  if (looksLikeExpectedResult(title)) return 'output';
  if (
    normalized.includes('prompt') ||
    normalized.includes('pedido') ||
    normalized.includes('pides')
  ) {
    return 'prompt';
  }
  if (
    normalized.includes('devuelve') ||
    normalized.includes('salida') ||
    normalized.includes('resultado') ||
    normalized.includes('nota ') ||
    normalized.includes('guía') ||
    normalized.includes('guia') ||
    normalized.includes('hoja')
  ) {
    return 'output';
  }
  return 'artifact';
}

function parsePipeTable(text: string): LessonTable | null {
  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .map(splitTableRow)
    .filter((cells) => cells.length > 0 && !cells.every((cell) => /^[-:]+$/.test(cell)));

  if (rows.length < 2) return null;

  const [headers, ...bodyRows] = rows;
  const columnCount = headers.length;
  if (columnCount === 0) return null;
  if (bodyRows.some((row) => row.length !== columnCount)) return null;

  return { headers, rows: bodyRows };
}

function splitTableRow(line: string): string[] {
  const trimmed = line.replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
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

function mergeAdjacentBlocks(blocks: LessonBlock[]): LessonBlock[] {
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

    if (
      current?.type === 'example' &&
      next?.type === 'example' &&
      looksLikePromptExample(current.example) &&
      looksLikeExpectedResult(next.example.title)
    ) {
      merged.push({
        type: 'promptResult',
        prompt: current.example,
        result: next.example,
      });
      index += 1;
      continue;
    }

    if (
      current?.type === 'example' &&
      next?.type === 'example' &&
      looksLikeWeakExample(current.example.title) &&
      looksLikeStrongExample(next.example.title)
    ) {
      merged.push({
        type: 'examplePair',
        weak: current.example,
        strong: next.example,
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

function looksLikePromptExample(example: WorkedExample): boolean {
  const title = example.title.toLocaleLowerCase('es');
  return (
    example.kind === 'prompt' ||
    title.includes('prompt') ||
    title.includes('pedido') ||
    title.includes('pides')
  );
}

export function looksLikeExpectedResult(title: string): boolean {
  return title.toLocaleLowerCase('es').startsWith('esperamos');
}

export function displayExampleTitle(title: string): string {
  return title.replace(/^esperamos:\s*/i, '').trim();
}

function looksLikeWeakExample(title: string): boolean {
  const normalized = title.toLocaleLowerCase('es');
  return normalized.includes('flojo') || normalized.includes('antes');
}

function looksLikeStrongExample(title: string): boolean {
  const normalized = title.toLocaleLowerCase('es');
  return (
    normalized.includes('que sí') ||
    normalized.includes('que si') ||
    normalized.includes('útil') ||
    normalized.includes('util') ||
    normalized.includes('después') ||
    normalized.includes('despues')
  );
}
