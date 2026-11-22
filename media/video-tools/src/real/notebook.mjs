// Real Gemini Notebook (antes NotebookLM) sessions for «Gemini Notebook paso a paso».
//   node src/real/notebook.mjs n1-tu-lectura-como-fuente
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { startSession, PRIVACY } from './recorder.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const courseDir = path.resolve(here, '../../../cursos/capsulas-notebook');
const slug = process.argv[2];
const SOURCE = path.join(courseDir, 'lectura-huerto.pdf');
const DESKTOP = { viewport: { width: 1280, height: 720 }, scale: 1 };
const notebookUrl = async () => JSON.parse(await readFile(path.join(courseDir, 'rec', 'notebook.json'), 'utf8')).url;

const ASK = 'textarea[aria-label="Cuadro de consulta"], textarea[placeholder*="Haz una pregunta"]';
const SEND = 'button[aria-label="Enviar"]';

// Done when the page text stops changing for 3.5 s after the question.
async function waitQuiet(s, { maxMs = 150000, quietMs = 3500 } = {}) {
  let last = '';
  let since = Date.now();
  const start = Date.now();
  await s.pause(2500);
  while (Date.now() - start < maxMs) {
    const now = await s.page.evaluate(() => document.body.innerText.length + ':' + document.querySelectorAll('button').length);
    if (now !== last) { last = now; since = Date.now(); }
    if (Date.now() - since > quietMs) return;
    await s.pause(400);
  }
}

async function ask(s, text) {
  await s.click(ASK, 'type');
  await s.type(text);
  await s.pause(500);
  // Two buttons are labelled «Enviar» (web search on the left, chat in the middle): take the chat's.
  const boxes = [];
  for (const btn of await s.page.locator(SEND).filter({ visible: true }).all()) boxes.push(await btn.boundingBox());
  const chat = boxes.filter(Boolean).sort((x, y) => y.x - x.x)[0];
  await s.clickAt(chat.x + chat.width / 2, chat.y + chat.height / 2, 'send');
  await waitQuiet(s);
  s.mark('answer');
  await s.pause(1500);
}

const SCENARIOS = {
  'n1-tu-lectura-como-fuente': {
    url: () => 'https://notebook.google.com/',
    async run(s) {
      await s.begin();
      s.mark('home');
      await s.pause(1800);
      await s.click('button:has-text("Nuevo cuaderno")', 'new');
      await s.page.locator('button:has-text("Fuentes")').filter({ visible: true }).first().waitFor({ timeout: 30000 });
      await s.pause(2500);
      if (!(await s.page.locator('text=Subir archivos').filter({ visible: true }).count())) {
        await s.click('button:has-text("Fuentes")', 'add');
      } else {
        s.mark('add');
      }
      await s.page.locator('text=Subir archivos').filter({ visible: true }).first().waitFor({ timeout: 30000 });
      await s.pause(1200);
      s.mark('dialog');
      await s.pause(1500);
      await s.upload('button:has-text("Subir archivos")', SOURCE, 'upload');
      await s.page.locator('text=/1 fuente/').first().waitFor({ state: 'visible', timeout: 90000 });
      s.mark('ready');
      await s.pause(6000);
      s.mark('end');
      await s.pause(1500);
      await writeFile(path.join(courseDir, 'rec', 'notebook.json'), JSON.stringify({ url: s.page.url() }));
    },
  },
  'n2-preguntas-con-citas': {
    url: notebookUrl,
    async run(s) {
      await s.begin();
      s.mark('open');
      await s.pause(1500);
      await ask(s, 'Escribe cinco preguntas para séptimo que se contesten solo con esta lectura: una sobre el tema, una sobre la idea principal y tres que pidan decidir si una frase es el tema, la idea principal o un detalle. Pon la clave aparte.');
      s.mark('scroll');
      // Bring the 4th citation of the answer to the middle of the chat, then open it.
      const distance = await s.page.evaluate(() => {
        const marks = [...document.querySelectorAll('button.citation-marker')];
        const target = marks[Math.min(3, marks.length - 1)];
        if (!target) return null;
        target.setAttribute('data-ilia-cite', '1');
        return target.getBoundingClientRect().top - 330;
      });
      if (distance === null) throw new Error('No citations in the answer');
      await s.scrollBy('button[data-ilia-cite]', distance, { steps: 16, gap: 170 });
      await s.pause(700);
      await s.click('button[data-ilia-cite]', 'cite');
      await s.pause(5000);
      s.mark('end');
      await s.pause(1200);
      console.log('ANSWER\n' + (await s.page.evaluate(() => document.body.innerText)).slice(-2500));
    },
  },
  'n3-cuestionario-desde-studio': {
    url: notebookUrl,
    async run(s) {
      await s.begin();
      s.mark('open');
      await s.pause(1500);
      await s.click('button:has-text("Cuestionario"), [role=button]:has-text("Cuestionario")', 'quiz');
      await s.page.locator('text=Generar ahora').filter({ visible: true }).first().waitFor({ timeout: 20000 });
      await s.pause(1200);
      s.mark('options');
      await s.pause(2500);
      await s.click('button:has-text("Varias respuestas")', 'types');
      await s.pause(600);
      await s.click('button:has-text("Fácil")', 'level');
      await s.pause(800);
      const topic = s.page.locator('textarea').filter({ visible: true }).last();
      const box = await topic.boundingBox();
      await s.clickAt(box.x + 40, box.y + box.height / 2, 'topic');
      await s.type('Preguntas para séptimo que separen el tema, la idea principal y los detalles de la lectura.');
      await s.pause(800);
      await s.click('button:has-text("Generar ahora")', 'generate');
      await s.pause(3000);
      s.hold();
      // Generating takes minutes: wait off camera until a finished quiz shows up in Studio.
      const start = Date.now();
      while (Date.now() - start < 420000) {
        const busy = await s.page.evaluate(() => /Generando|generando|Creando/.test(document.body.innerText));
        if (!busy && Date.now() - start > 15000) break;
        await new Promise((res) => setTimeout(res, 2000));
      }
      await new Promise((res) => setTimeout(res, 3000));
      console.log('STUDIO\n' + await s.page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.getBoundingClientRect().x > 940 && e.textContent.trim()).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}: ${e.textContent.trim().slice(0, 50)}`).slice(0, 40).join('\n')));
      const notNow = s.page.locator('button:has-text("Ahora no")').filter({ visible: true });
      if (await notNow.count()) { await notNow.first().click(); await new Promise((res) => setTimeout(res, 1200)); }
      await s.resume();
      s.mark('ready');
      await s.pause(2500);
      const item = s.page.locator('span.mat-mdc-tooltip-trigger').filter({ hasText: /Cuestionario/ }).filter({ visible: true }).first();
      if (await item.count()) {
        const ib = await item.boundingBox();
        await s.clickAt(ib.x + ib.width / 2, ib.y + ib.height / 2, 'open-quiz');
        await s.pause(6000);
      } else {
        console.log('quiz item not found');
      }
      s.mark('quiz');
      await s.pause(5000);
      s.mark('end');
      await s.pause(1200);
    },
  },
  'n4-lo-que-no-esta-en-la-fuente': {
    url: notebookUrl,
    async run(s) {
      await s.begin();
      s.mark('open');
      await s.pause(1500);
      await ask(s, '¿En qué año se fundó la escuela y cuántos estudiantes tiene?');
      s.mark('end');
      await s.pause(4000);
      console.log('ANSWER\n' + (await s.page.evaluate(() => document.body.innerText)).slice(-1500));
    },
  },
};

const scenario = SCENARIOS[slug];
if (!scenario) throw new Error(`Unknown scenario: ${slug}`);
const s = await startSession({ outDir: path.join(courseDir, 'rec', slug), url: await scenario.url(), privacyCss: PRIVACY.notebook, ...DESKTOP });
try { await scenario.run(s); } finally { await s.end(); }
