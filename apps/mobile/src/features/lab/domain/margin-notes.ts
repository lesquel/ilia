/**
 * The notes Lía keeps in the folio margin.
 *
 * They are the same mechanical checks the judge runs. Lighting a note the
 * platform does not actually score would be a trick.
 */

import {
  EMPTY_ACTIVITY_CHECKS,
  type ActivityChecks,
} from '@/features/lab/domain/entities';

const ROLE_HINTS = [
  'actua como',
  'actua de',
  'sos ',
  'eres ',
  'haz de',
  'como docente',
  'como profesor',
  'como experto',
  'tu rol',
  'para alumnos',
  'para estudiantes',
  'dirigido a',
  'audiencia',
] as const;

const FORMAT_HINTS = [
  'formato',
  'tabla',
  'lista',
  'vinetas',
  'bullets',
  'json',
  'markdown',
  'parrafos',
  'columnas',
  'titulo',
  'esquema',
  'resumen de',
  'maximo de palabras',
  'palabras',
] as const;

export interface LiaMarginNote {
  label: string;
  requirement: string;
  isPresent: boolean;
}

export function foldForCheck(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase();
}

export function promptWordCount(prompt: string): number {
  const words = prompt.trim().match(/\S+/g);
  return words?.length ?? 0;
}

export function activityChecksHaveNotes(checks: ActivityChecks): boolean {
  return (
    checks.requiresRole ||
    checks.requiresFormat ||
    checks.minLength > 0 ||
    checks.maxLength > 0 ||
    checks.requiredTerms.length > 0
  );
}

function mentionsAny(foldedPrompt: string, hints: readonly string[]): boolean {
  return hints.some((hint) => foldedPrompt.includes(foldForCheck(hint)));
}

function capitalizedTerm(term: string): string {
  if (!term) return term;
  return term.charAt(0).toLocaleUpperCase() + term.slice(1);
}

export function liaMarginNotesFromChecks(checks: ActivityChecks, prompt: string): LiaMarginNote[] {
  const foldedPrompt = foldForCheck(prompt);
  const notes: LiaMarginNote[] = [];

  if (checks.requiresRole) {
    notes.push({
      label: 'Rol',
      requirement: 'Dale al modelo un rol o di para quién es la respuesta.',
      isPresent: mentionsAny(foldedPrompt, ROLE_HINTS),
    });
  }

  if (checks.requiresFormat) {
    notes.push({
      label: 'Formato',
      requirement: 'Indica en qué formato quieres la respuesta.',
      isPresent: mentionsAny(foldedPrompt, FORMAT_HINTS),
    });
  }

  if (checks.minLength > 0) {
    notes.push({
      label: `${checks.minLength} palabras`,
      requirement: `Escribe al menos ${checks.minLength} palabras.`,
      isPresent: promptWordCount(prompt) >= checks.minLength,
    });
  }

  if (checks.maxLength > 0) {
    notes.push({
      label: `Máximo ${checks.maxLength}`,
      requirement: `No superes las ${checks.maxLength} palabras.`,
      isPresent: promptWordCount(prompt) <= checks.maxLength,
    });
  }

  for (const synonyms of checks.requiredTerms) {
    const firstTerm = synonyms[0] ?? '';
    notes.push({
      label: capitalizedTerm(firstTerm),
      requirement: `Menciona: ${firstTerm}.`,
      isPresent: mentionsAny(foldedPrompt, synonyms),
    });
  }

  return notes;
}

export function shortRequirementLabel(requirement: string): string {
  const folded = foldForCheck(requirement);
  if (folded.includes('rol')) return 'Rol';
  if (folded.includes('formato')) return 'Formato';

  const atLeastMatch = requirement.match(/al menos (\d+)/i);
  if (atLeastMatch) return `${atLeastMatch[1]} palabras`;

  const atMostMatch = requirement.match(/no superes las (\d+)/i);
  if (atMostMatch) return `Máximo ${atMostMatch[1]}`;

  const mentionMatch = requirement.match(/menciona:\s*(.+?)\.?$/i);
  if (mentionMatch) {
    return capitalizedTerm(mentionMatch[1].trim());
  }

  return requirement;
}

export function requirementLooksPresent(requirement: string, prompt: string): boolean {
  const foldedPrompt = foldForCheck(prompt);
  const foldedRequirement = foldForCheck(requirement);

  if (foldedRequirement.includes('rol')) {
    return mentionsAny(foldedPrompt, ROLE_HINTS);
  }

  if (foldedRequirement.includes('formato')) {
    return mentionsAny(foldedPrompt, FORMAT_HINTS);
  }

  const atLeastMatch = requirement.match(/al menos (\d+)/i);
  if (atLeastMatch) {
    return promptWordCount(prompt) >= Number(atLeastMatch[1]);
  }

  const atMostMatch = requirement.match(/no superes las (\d+)/i);
  if (atMostMatch) {
    return promptWordCount(prompt) <= Number(atMostMatch[1]);
  }

  const mentionMatch = requirement.match(/menciona:\s*(.+?)\.?$/i);
  if (mentionMatch) {
    return foldedPrompt.includes(foldForCheck(mentionMatch[1]));
  }

  return false;
}

export function liaMarginNotes(
  requirements: string[],
  prompt: string,
  checks: ActivityChecks = EMPTY_ACTIVITY_CHECKS,
): LiaMarginNote[] {
  if (activityChecksHaveNotes(checks)) {
    return liaMarginNotesFromChecks(checks, prompt);
  }

  return requirements.map((requirement) => ({
    requirement,
    label: shortRequirementLabel(requirement),
    isPresent: requirementLooksPresent(requirement, prompt),
  }));
}
