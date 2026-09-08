/** Public entry point of the forum feature. */

export { MAX_BODY_CHARS, MAX_TITLE_CHARS, replyLabel, timeAgo } from './domain/entities';
export type { Post, ThreadDetail, ThreadSummary } from './domain/entities';
export { forumKeys, useOpenThread, useReply, useThread, useThreads } from './application/use-forum';
