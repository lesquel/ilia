import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Expo inlines only `EXPO_PUBLIC_*` names the source actually references.
 * Compose, the Dockerfile ARG, and the operator docs all bake
 * `EXPO_PUBLIC_API_URL`. If this file reads a different name, a production
 * image following those docs ships `http://localhost:8000`.
 */
const NAME = 'EXPO_PUBLIC_API_URL';
const STALE = 'EXPO_PUBLIC_API_BASE_URL';

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(here, '../../..');

describe('API URL build variable', () => {
  it('is the same name in source, Dockerfile, and compose', () => {
    const envSource = readFileSync(join(here, 'env.ts'), 'utf8');
    expect(envSource).toContain(`process.env.${NAME}`);
    expect(envSource).not.toContain(STALE);

    const dockerfile = readFileSync(join(mobileRoot, 'Dockerfile'), 'utf8');
    expect(dockerfile).toMatch(new RegExp(`^ARG ${NAME}$`, 'm'));
    expect(dockerfile).toContain(`ENV ${NAME}=\${${NAME}}`);

    const compose = readFileSync(join(mobileRoot, '../../docker-compose.yml'), 'utf8');
    expect(compose).toContain(`${NAME}: \${${NAME}:?set ${NAME}}`);
  });
});
