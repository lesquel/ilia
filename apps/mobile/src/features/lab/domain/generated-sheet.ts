/**
 * Turn the model's raw answer into blocks a hoja can paint.
 *
 * The executor answers in markdown because that is what models speak. The
 * teacher should see a table, not the pipes.
 */

export type GeneratedSheetBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] };

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
    const text = paragraphLines.join(' ').replace(/\s+/g, ' ').trim();
    paragraphLines = [];
    if (text) blocks.push({ kind: 'paragraph', text });
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
