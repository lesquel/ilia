/**
 * Turn the model's raw answer into blocks a hoja can paint.
 *
 * The executor answers in markdown because that is what models speak. The
 * teacher should see a table or a small exam figure, not the pipes.
 */

export type FractionPieFigure = {
  paintedSlices: number;
  totalSlices: number;
};

export type GeneratedSheetBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'figure'; figure: 'pie'; paintedSlices: number; totalSlices: number; caption: string };

const MAXIMUM_DRAWABLE_SLICES = 16;
const COMPACT_PIE_MARK =
  /\[\[\s*(?:pastel|pie|torta|pizza)\s+(\d+)(?:\s*\/\s*(\d+))?\s*\]\]/gi;
const FIGURE_WORD =
  /\b(pastel|pasteles|pie|pies|torta|tortas|pizza|pizzas|c[ií]rculo|c[ií]rculos)\b/i;
const VISUAL_SHEET_WORD =
  /\b(pastel|pasteles|pie|pies|torta|tortas|pizza|pizzas|trozos|porciones|rebanadas|dibujo|figura)\b/i;
const FIGURATIVE_HEADER = /figura|pastel|pie|torta|pizza|dibujo/i;
const SIMPLE_FRACTION = /^(\d+)\s*\/\s*(\d+)$/;

function isDrawableSliceCount(totalSlices: number): boolean {
  return totalSlices >= 2 && totalSlices <= MAXIMUM_DRAWABLE_SLICES;
}

function pieFigure(paintedSlices: number, totalSlices: number): FractionPieFigure | null {
  if (!isDrawableSliceCount(totalSlices)) return null;
  const boundedPainted = Math.min(Math.max(paintedSlices, 0), totalSlices);
  return { paintedSlices: boundedPainted, totalSlices };
}

function figureFromCompactMatch(
  paintedOrTotal: string,
  maybeTotal: string | undefined,
): FractionPieFigure | null {
  const firstNumber = Number(paintedOrTotal);
  if (maybeTotal) {
    return pieFigure(firstNumber, Number(maybeTotal));
  }
  return pieFigure(0, firstNumber);
}

export function figureFromMarkup(text: string): FractionPieFigure | null {
  const compact = new RegExp(COMPACT_PIE_MARK.source, 'i').exec(text.trim());
  if (!compact) return null;
  if (compact[0].trim() !== text.trim()) return null;
  return figureFromCompactMatch(compact[1] ?? '', compact[2]);
}

export function figureFromTableCell(
  cell: string,
  header: string,
  sheetMentionsVisual: boolean,
): FractionPieFigure | null {
  const compact = figureFromMarkup(cell);
  if (compact) return compact;

  const fractionMatch = SIMPLE_FRACTION.exec(cell.trim());
  if (!fractionMatch) return null;
  if (!FIGURATIVE_HEADER.test(header)) return null;
  if (!sheetMentionsVisual) return null;

  return pieFigure(Number(fractionMatch[1]), Number(fractionMatch[2]));
}

export function sheetMentionsVisualFigure(rawText: string): boolean {
  return VISUAL_SHEET_WORD.test(rawText);
}

function naturalPieFromText(text: string): { figure: FractionPieFigure; caption: string } | null {
  if (!FIGURE_WORD.test(text)) return null;

  const paintedOfWhole = text.match(
    /(\d+)\s+de\s+(\d+)\s+(?:trozos|partes|porciones|rebanadas)/i,
  );
  const dividedInto = text.match(
    /dividid[oa]s?\s+en\s+(\d+)\s+(?:trozos|partes|porciones|rebanadas)/i,
  );
  const pieOfSlices = text.match(
    /(?:pastel|pie|torta|pizza|c[ií]rculo).{0,40}(?:de|con|en|tiene|tienen)\s+(\d+)\s+(?:trozos|partes|porciones|rebanadas)/i,
  );
  const cutInto = text.match(
    /cortad[oa]s?\s+en\s+(\d+)\s+(?:trozos|partes|porciones|rebanadas)/i,
  );
  const paintedSlicesMatch = text.match(
    /(?:de los cuales\s+|de ellos\s+|de estos\s+|de estas\s+)?(\d+)(?:\s+de esos|\s+de estas|\s+de estos|\s+de esas)?(?:\s+(?:trozos|partes|porciones|rebanadas))?(?:\s+iguales)?(?:\s+(?:están|esta|están|hay))?\s+(?:pintad|sombread|coloread|marcados)/i,
  );

  let totalSlices: number | null = null;
  let paintedSlices = 0;

  if (paintedOfWhole) {
    paintedSlices = Number(paintedOfWhole[1]);
    totalSlices = Number(paintedOfWhole[2]);
  } else {
    if (dividedInto) totalSlices = Number(dividedInto[1]);
    else if (pieOfSlices) totalSlices = Number(pieOfSlices[1]);
    else if (cutInto) totalSlices = Number(cutInto[1]);
    if (paintedSlicesMatch) paintedSlices = Number(paintedSlicesMatch[1]);
  }

  if (totalSlices === null) return null;
  const figure = pieFigure(paintedSlices, totalSlices);
  if (!figure) return null;

  const question = text.match(/¿[^?]+?\?/g);
  const caption = question ? question.join(' ') : text.replace(/\s+/g, ' ').trim();
  return { figure, caption };
}

function blocksFromParagraph(rawParagraph: string): GeneratedSheetBlock[] {
  const paragraph = rawParagraph
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!paragraph) return [];

  const blocks: GeneratedSheetBlock[] = [];
  let cursor = 0;
  const compactMatcher = new RegExp(COMPACT_PIE_MARK.source, 'gi');
  let compactMatch = compactMatcher.exec(paragraph);
  let foundCompact = false;

  while (compactMatch) {
    foundCompact = true;
    const textBefore = paragraph.slice(cursor, compactMatch.index).trim();
    if (textBefore) blocks.push({ kind: 'paragraph', text: textBefore });
    const figure = figureFromCompactMatch(compactMatch[1] ?? '', compactMatch[2]);
    if (figure) {
      blocks.push({
        kind: 'figure',
        figure: 'pie',
        paintedSlices: figure.paintedSlices,
        totalSlices: figure.totalSlices,
        caption: '',
      });
    }
    cursor = compactMatch.index + compactMatch[0].length;
    compactMatch = compactMatcher.exec(paragraph);
  }

  const textAfter = paragraph.slice(cursor).trim();
  if (foundCompact) {
    if (textAfter) {
      const lastFigure = blocks[blocks.length - 1];
      if (lastFigure?.kind === 'figure' && !lastFigure.caption) {
        lastFigure.caption = textAfter;
      } else {
        blocks.push({ kind: 'paragraph', text: textAfter });
      }
    }
    return blocks;
  }

  const natural = naturalPieFromText(paragraph);
  if (natural) {
    return [
      {
        kind: 'figure',
        figure: 'pie',
        paintedSlices: natural.figure.paintedSlices,
        totalSlices: natural.figure.totalSlices,
        caption: natural.caption,
      },
    ];
  }

  return [{ kind: 'paragraph', text: paragraph }];
}

function isPipeRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.includes('|', 1);
}

function isSeparatorRow(line: string): boolean {
  const cells = cellsFromPipeRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function cellsFromPipeRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function blocksFromGeneratedText(rawText: string): GeneratedSheetBlock[] {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const blocks: GeneratedSheetBlock[] = [];
  let paragraphLines: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    const text = paragraphLines.join(' ');
    paragraphLines = [];
    blocks.push(...blocksFromParagraph(text));
  };

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (isPipeRow(line)) {
      flushParagraph();
      const tableLines: string[] = [];
      while (index < lines.length && isPipeRow(lines[index] ?? '')) {
        tableLines.push(lines[index] ?? '');
        index += 1;
      }
      const bodyLines = tableLines.filter((tableLine) => !isSeparatorRow(tableLine));
      if (bodyLines.length === 0) continue;
      const [headerLine, ...dataLines] = bodyLines;
      const headers = cellsFromPipeRow(headerLine ?? '');
      const rows = dataLines.map((dataLine) => cellsFromPipeRow(dataLine));
      if (headers.length > 0) {
        blocks.push({ kind: 'table', headers, rows });
      }
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
    } else {
      paragraphLines.push(line.trim());
    }
    index += 1;
  }

  flushParagraph();
  return blocks;
}
