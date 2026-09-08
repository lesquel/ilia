/** Forum domain. Plain TypeScript, shared by all platforms. */

export const MAX_TITLE_CHARS = 160;
export const MAX_BODY_CHARS = 5000;

export interface ThreadSummary {
  id: string;
  title: string;
  authorName: string;
  replyCount: number;
  createdAt: string | null;
  lastActivityAt: string | null;
  isHidden: boolean;
}

export interface Post {
  id: string;
  authorName: string;
  body: string;
  createdAt: string | null;
  isHidden: boolean;
}

export interface ThreadDetail extends ThreadSummary {
  body: string;
  posts: Post[];
}

/**
 * How long ago something happened, in words.
 *
 * A forum lives on this: "hace 2 horas" tells you whether a conversation is
 * still warm, and an ISO timestamp does not.
 */
export function timeAgo(iso: string | null, now: Date = new Date()): string {
  if (!iso) return '';

  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return 'recién';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  return `hace ${Math.floor(months / 12)} año(s)`;
}

export function replyLabel(count: number): string {
  if (count === 0) return 'Sin respuestas';
  return `${count} ${count === 1 ? 'respuesta' : 'respuestas'}`;
}
