// Real Canva sessions for «Una lámina en Canva».
//   node src/real/canva.mjs c1-el-borrador-con-canva-ia
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { startSession, PRIVACY } from './recorder.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const courseDir = path.resolve(here, '../../../cursos/capsulas-canva');
const slug = process.argv[2];
const DESKTOP = { viewport: { width: 1280, height: 720 }, scale: 1 };
const CANVA_MASKS = [{ x: 14, y: 662, w: 46, h: 46 }];
const EDITOR_MASKS = [{ x: 884, y: 8, w: 40, h: 40 }];
const saved = async (name) => JSON.parse(await readFile(path.join(courseDir, 'rec', `${name}.json`), 'utf8'));

async function waitQuiet(s, { maxMs = 180000, quietMs = 5000 } = {}) {
  let last = ''; let since = Date.now(); const start = Date.now();
  await s.pause(3000);
  while (Date.now() - start < maxMs) {
    const now = await s.page.evaluate(() => `${document.body.innerText.length}:${document.images.length}`);
    if (now !== last) { last = now; since = Date.now(); }
    if (Date.now() - since > quietMs) return;
    await s.pause(500);
  }
}

const SCENARIOS = {
  'c1-el-borrador-con-canva-ia': {
    url: 'https://www.canva.com/ai',
    async run(s) {
      await s.begin();
      s.mark('home');
      await s.pause(1500);
      await s.click('textarea', 'type');
      await s.type('Una lámina para proyectar en séptimo sobre la lectura «El huerto de la escuela». ', { delay: 22 });
      s.mark('parts');
      await s.type('Tres partes bien separadas: el tema, la idea principal y un detalle. Fondo claro y letra grande.', { delay: 22 });
      await s.pause(700);
      await s.press('Enter');
      s.mark('send');
      await s.pause(4000);
      s.hold();
      // Canva IA is done when it says what it created and offers «Editar el diseño».
      const done = () => s.page.evaluate(() => /Se creó/.test(document.body.innerText) && [...document.querySelectorAll('button')].some((x) => /Editar el diseño/.test(x.innerText) && x.getBoundingClientRect().width > 0));
      const start = Date.now();
      while (Date.now() - start < 600000 && !(await done())) await new Promise((res) => setTimeout(res, 3000));
      await waitQuiet(s, { maxMs: 30000, quietMs: 3000 });
      await s.resume();
      s.mark('result');
      await s.pause(4500);
      await s.clickText('^2 - ', 'slide2');
      await s.pause(5000);
      s.mark('end');
      await s.pause(1500);
      console.log('URL', s.page.url());
      console.log('TEXT\n' + (await s.page.evaluate(() => document.body.innerText)).slice(-1500));
      await writeFile(path.join(courseDir, 'rec', 'ai.json'), JSON.stringify({ url: s.page.url() }));
    },
  },
  'c1b-el-resultado': {
    url: async () => (await saved('ai')).url,
    async run(s) {
      await s.page.locator('text=/Ya está creada|Se agregó tu diseño|Se generaron|Se creó/').first().waitFor({ timeout: 30000 });
      await s.pause(1500);
      await s.begin();
      s.mark('result');
      await s.pause(3500);
      await s.clickText('^Lámina sobre El huerto', 'open-design');
      await s.pause(4000);
      s.mark('design');
      await s.pause(5000);
      s.mark('end');
      await s.pause(1200);
    },
  },
  'c2-tu-texto-en-la-lamina': {
    url: async () => (await saved('editor')).url, masks: EDITOR_MASKS,
    async run(s) {
      await s.page.getByText('La escuela cultiva un huerto').first().waitFor({ timeout: 40000 });
      await s.pause(2500);
      await s.begin();
      s.mark('editor');
      await s.pause(2000);
      const box = async (text) => {
        const r = await s.page.getByText(text).first().boundingBox();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      };
      let c = await box('La escuela cultiva un huerto');
      await s.clickAt(c.x, c.y, 'idea');
      await s.page.mouse.dblclick(c.x, c.y);
      await s.pause(700);
      await s.press('Control+a');
      await s.pause(900);
      await s.type('Una tarea grande sale bien cuando cada uno cumple su parte.', { delay: 40 });
      await s.press('Escape');
      await s.pause(1500);
      c = await box('Los estudiantes cuidan las plantas');
      await s.clickAt(c.x, c.y, 'detail');
      await s.page.mouse.dblclick(c.x, c.y);
      await s.pause(700);
      await s.press('Control+a');
      await s.pause(900);
      await s.type('En marzo cosecharon los primeros tomates.', { delay: 40 });
      await s.press('Escape');
      await s.pause(800);
      await s.clickAt(150, 640);
      s.mark('end');
      await s.pause(3500);
    },
  },
  'c3-mirala-desde-el-fondo': {
    url: async () => (await saved('editor')).url, masks: EDITOR_MASKS,
    async run(s) {
      await s.page.getByText('Una tarea grande sale bien').first().waitFor({ timeout: 40000 });
      await s.pause(2500);
      await s.begin();
      s.mark('editor');
      await s.pause(1500);
      await s.clickAt(420, 330, 'image');
      await s.pause(3500);
      await s.clickAt(150, 640);
      await s.pause(600);
      await s.clickText('^Presentar$', 'present');
      await s.pause(2500);
      s.mark('fullscreen');
      await s.pause(5000);
      await s.press('Escape');
      await s.pause(1500);
      s.mark('end');
      await s.pause(1500);
    },
  },
  'c4-descargala-en-pdf': {
    url: async () => (await saved('editor')).url, masks: EDITOR_MASKS,
    async run(s) {
      await s.page.getByText('Una tarea grande sale bien').first().waitFor({ timeout: 40000 });
      await s.pause(2500);
      await s.begin();
      s.mark('editor');
      await s.pause(1500);
      await s.clickText('^Compartir$', 'share');
      await s.pause(2000);
      await s.clickText('^Descargar$', 'download');
      await s.pause(2000);
      s.mark('panel');
      await s.pause(2500);
      await s.clickText('^Impresión$', 'print');
      await s.pause(2000);
      const got = s.page.waitForEvent('download', { timeout: 60000 }).catch(() => null);
      await s.clickText('^Descargar$', 'go', { nth: -1 });
      await s.pause(1500);
      s.mark('preparing');
      const file = await got;
      console.log('download', file ? file.suggestedFilename() : 'none');
      await s.pause(3000);
      s.mark('done');
      await s.pause(2500);
      s.mark('end');
      await s.pause(1000);
    },
  },
};

const scenario = SCENARIOS[slug];
if (!scenario) throw new Error(`Unknown scenario: ${slug}`);
const s = await startSession({ outDir: path.join(courseDir, 'rec', slug), url: typeof scenario.url === 'function' ? await scenario.url() : scenario.url, privacyCss: PRIVACY.canva, masks: scenario.masks ?? CANVA_MASKS, ...DESKTOP });
try { await scenario.run(s); } finally { await s.end({ keepOpen: true }); }
