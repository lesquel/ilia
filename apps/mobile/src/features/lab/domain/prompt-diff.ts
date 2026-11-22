/** A run of the later prompt, marked when it is new since the earlier one. */
export interface PromptSegment {
  text: string;
  added: boolean;
}

/** Words with the whitespace that follows them, so joining them rebuilds the text. */
function tokens(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [];
}

function word(token: string): string {
  return token.trim();
}

/**
 * What the later prompt says that the earlier one did not, word by word.
 *
 * A longest-common-subsequence over words: the kept words stay plain and
 * everything else in the later prompt is marked. Removed words are not shown;
 * the card is about what the teacher added.
 */
export function diffPromptWords(earlier: string, later: string): PromptSegment[] {
  const before = tokens(earlier).map(word);
  const afterTokens = tokens(later);
  const after = afterTokens.map(word);

  // lengths[i][j] = LCS of before[i..] and after[j..].
  const lengths: number[][] = Array.from({ length: before.length + 1 }, () =>
    new Array<number>(after.length + 1).fill(0),
  );
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      lengths[i][j] =
        before[i] === after[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const added: boolean[] = [];
  let i = 0;
  let j = 0;
  while (j < after.length) {
    if (i < before.length && before[i] === after[j]) {
      added.push(false);
      i += 1;
      j += 1;
    } else if (i < before.length && lengths[i + 1][j] >= lengths[i][j + 1]) {
      i += 1;
    } else {
      added.push(true);
      j += 1;
    }
  }

  const segments: PromptSegment[] = [];
  afterTokens.forEach((token, index) => {
    const isAdded = added[index];
    const last = segments[segments.length - 1];
    if (last && last.added === isAdded) {
      last.text += token;
    } else {
      segments.push({ text: token, added: isAdded });
    }
  });
  return segments;
}
