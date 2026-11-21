export interface WebVttCue {
  start: number;
  end: number;
  text: string;
}

export function parseWebVtt(source: string): WebVttCue[] {
  return source
    .replace(/^\uFEFF?WEBVTT[^\n]*\n/, '')
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const lines = block.split(/\r?\n/).map((line) => line.trim());
      const timingIndex = lines.findIndex((line) => line.includes('-->'));
      if (timingIndex < 0) return [];

      const [start, end] = (lines[timingIndex] ?? '').split('-->').map(parseTimestamp);
      const text = lines.slice(timingIndex + 1).filter(Boolean).join(' ').replace(/<[^>]*>/g, '');
      return start === undefined || end === undefined || !text ? [] : [{ start, end, text }];
    });
}

export function cueAt(cues: WebVttCue[], seconds: number): string {
  const cue = cues.find((item) => seconds >= item.start && seconds < item.end);
  return cue?.text ?? '';
}

export function formatVideoTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function parseTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const time = value.trim().split(/\s+/)[0];
  if (!time) return undefined;
  const parts = time.replace(',', '.').split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return undefined;
  return parts.length === 3
    ? (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
    : parts.length === 2
      ? (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
      : undefined;
}
