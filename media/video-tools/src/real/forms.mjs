// Real Google Forms sessions (free route) for «Una prueba corta en Google Forms».
//   node src/real/forms.mjs f1-las-preguntas-desde-gemini
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { startSession, PRIVACY } from './recorder.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const courseDir = path.resolve(here, '../../../cursos/capsulas-forms');
const slug = process.argv[2];
const DESKTOP = { viewport: { width: 1280, height: 720 }, scale: 1 };
const saved = async (name) => JSON.parse(await readFile(path.join(courseDir, 'rec', `${name}.json`), 'utf8'));

const LECTURA = 'El huerto de nuestra escuela empezó con tres cajones de madera reciclada y un puñado de semillas de tomate riñón, rábano y albahaca. Al principio nadie sabía cuánta agua necesitaba cada planta, y en la primera semana se secaron casi todos los rábanos. Desde entonces, cada grado cuida una parte. Los de quinto riegan por la mañana, los de sexto quitan la maleza y los de séptimo anotan en un cuaderno cuánto crece cada planta. Si un grado falla, el cuaderno lo muestra al día siguiente. En marzo cosechamos los primeros tomates y los llevamos al comedor. Ese día entendimos que el huerto no era de un grado ni de una profesora: una tarea grande sale bien cuando cada uno cumple su parte.';

const GEMINI_INPUT = 'rich-textarea div[contenteditable="true"]';
const GEMINI_SEND = 'button[aria-label*="Enviar"], button[aria-label*="Send"]';

async function geminiAnswer(s, before) {
  let last = -1; let since = Date.now(); const start = Date.now();
  while (Date.now() - start < 120000) {
    const len = await s.page.evaluate((n) => { const r = document.querySelectorAll('message-content'); return r.length > n ? r[r.length - 1].innerText.length : 0; }, before);
    if (len !== last) { last = len; since = Date.now(); }
    if (len > 0 && Date.now() - since > 3000) return;
    await s.pause(400);
  }
  throw new Error('Gemini did not answer');
}

const SCENARIOS = {
  'f1-las-preguntas-desde-gemini': {
    url: 'https://gemini.google.com/app', privacy: PRIVACY.gemini, view: {},
    async run(s) {
      await s.begin();
      s.mark('open');
      await s.pause(1200);
      await s.click('a[aria-label="Nuevo chat"]', 'new-chat');
      await s.pause(800);
      await s.click(GEMINI_INPUT, 'type');
      await s.type('Eres docente de Lengua de séptimo. Con la lectura de abajo, escribe cinco preguntas de opción múltiple con cuatro opciones: una sobre el tema, una sobre la idea principal y tres que pidan decidir si una frase es tema, idea principal o detalle. ', { delay: 18 });
      s.mark('distractors');
      await s.type('Las opciones incorrectas tienen que ser creíbles, nunca absurdas. ', { delay: 22 });
      s.mark('format');
      await s.type('Escribe cada pregunta en una línea y cada opción en su propia línea, empezando con A), B), C) y D). Marca la correcta con un asterisco al final. Sin tablas. ', { delay: 18 });
      s.mark('paste');
      await s.paste(`Lectura: ${LECTURA}`);
      await s.pause(800);
      const before = await s.page.evaluate(() => document.querySelectorAll('message-content').length);
      await s.click(GEMINI_SEND, 'send');
      await geminiAnswer(s, before);
      s.mark('answer');
      await s.pause(1200);
      s.mark('scroll');
      await s.scrollToText('¿');
      await s.pause(1500);
      s.mark('end');
      await s.pause(1500);
      const text = await s.page.evaluate(() => [...document.querySelectorAll('message-content')].at(-1).innerText);
      await writeFile(path.join(courseDir, 'rec', 'gemini-quiz.json'), JSON.stringify({ text }, null, 1));
      console.log('ANSWER\n' + text);
    },
  },
  'f2-el-formulario-en-modo-cuestionario': {
    url: 'https://docs.google.com/forms/u/0/', privacy: PRIVACY.forms, view: DESKTOP,
    async run(s) {
      await s.begin();
      s.mark('home');
      await s.pause(1500);
      const tile = await s.page.locator('.docs-homescreen-templates-templateview').first().boundingBox();
      await s.clickAt(tile.x + tile.width / 2, tile.y + tile.height / 3, 'blank');
      await s.page.locator('[role=tab]:has-text("Configuración")').first().waitFor({ timeout: 30000 });
      await s.pause(1500);
      s.mark('editor');
      await s.pause(1200);
      await s.click('[role=textbox]:has-text("Formulario sin título")', 'title');
      await s.press('Control+a');
      await s.type('Lectura: El huerto de la escuela (7.º)', { delay: 35 });
      await s.pause(800);
      await s.click('[role=tab]:has-text("Configuración")', 'settings');
      await s.pause(1500);
      await s.click('[role=checkbox][aria-label^="Convertir en cuestionario"]', 'quiz-on');
      await s.pause(3500);
      s.mark('end');
      await s.pause(1200);
      await writeFile(path.join(courseDir, 'rec', 'form.json'), JSON.stringify({ url: s.page.url() }));
    },
  },
  'f3-la-pregunta-y-su-clave': {
    url: async () => (await saved('form')).url, privacy: PRIVACY.forms, view: DESKTOP,
    async run(s) {
      const { text } = await saved('gemini-quiz');
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const qi = lines.findIndex((l) => l.includes('¿'));
      const question = lines[qi];
      const options = lines.slice(qi + 1, qi + 5).map((l) => l.replace(/^[A-D]\)\s*/, ''));
      const correct = options.findIndex((o) => o.trim().endsWith('*'));
      const clean = options.map((o) => o.replace(/\*\s*$/, '').trim());
      await s.begin();
      s.mark('open');
      await s.click('[role=tab]:has-text("Preguntas")', 'questions');
      await s.pause(1500);
      await s.click('[role=textbox]:has-text("Pregunta sin título")', 'question');
      await s.paste(question);
      await s.pause(900);
      s.mark('options');
      const first = s.page.locator('input[aria-label="valor de la opción"]').filter({ visible: true }).first();
      const fb = await first.boundingBox();
      await s.clickAt(fb.x + 60, fb.y + fb.height / 2);
      await s.press('Control+a');
      for (let i = 0; i < clean.length; i += 1) {
        await s.paste(clean[i]);
        await s.pause(500);
        if (i < clean.length - 1) await s.press('Enter');
      }
      await s.pause(1200);
      const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await s.clickText('^Clave de respuesta$', 'key');
      await s.page.locator('text=Elige las respuestas correctas').first().waitFor({ timeout: 15000 });
      await s.pause(1200);
      s.mark('points');
      await s.type('1', { delay: 80 });
      await s.pause(900);
      await s.clickText(esc(clean[correct].slice(0, 30)), 'correct');
      await s.pause(1500);
      await s.clickText('^Listo$', 'done');
      await s.pause(3000);
      s.mark('end');
      await s.pause(1200);
      console.log('Q', question, '| correct', correct, clean[correct]);
    },
  },
  'f4-pruebalo-antes-de-enviarlo': {
    url: async () => (await saved('form')).url, privacy: PRIVACY.forms, view: DESKTOP,
    async run(s) {
      const iconAt = (label) => s.page.evaluate((l) => {
        const el = [...document.querySelectorAll(`[aria-label="${l}"]`)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top < 70; });
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, label);
      await s.page.locator('[aria-label="Vista previa"]').first().waitFor({ state: 'attached', timeout: 20000 });
      const editor = s.page;
      await s.begin();
      s.mark('open');
      await s.pause(1500);
      let c = await iconAt('Publicar');
      await s.clickAt(c.x, c.y, 'publish');
      await s.page.locator('text=Publicar formulario').first().waitFor({ timeout: 15000 });
      await s.pause(2000);
      s.mark('dialog');
      await s.pause(1500);
      const confirm = await s.page.evaluate(() => {
        const el = [...document.querySelectorAll('[role=dialog] *')].filter((e) => e.children.length === 0 && e.textContent.trim() === 'Publicar').pop();
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      await s.clickAt(confirm.x, confirm.y, 'published');
      await s.pause(3000);
      await s.press('Escape');
      await s.pause(800);
      c = await iconAt('Copiar vínculo para la persona que responde');
      await s.clickAt(c.x, c.y, 'link');
      await s.pause(2500);
      s.hold();
      const view = await s.context.newPage();
      await view.goto(editor.url().replace(/\/edit.*$/, '/viewform'));
      await s.follow(view, PRIVACY.forms, { settleMs: 3500 });
      s.mark('form');
      await s.pause(1500);
      await s.clickText('El cultivo de tomate', 'answer');
      await s.pause(1200);
      await s.clickText('^Enviar$', 'submit');
      await s.page.locator('text=/Se registró tu respuesta/').first().waitFor({ timeout: 20000 });
      await s.pause(1500);
      s.mark('sent');
      await s.pause(2500);
      s.hold();
      await view.close();
      await s.follow(editor, PRIVACY.forms, { settleMs: 1500 });
      await s.clickText('^Respuestas', 'responses');
      await s.pause(3500);
      s.mark('detail');
      await s.scrollBy('body', 620, { steps: 14, gap: 200 });
      await s.pause(3500);
      s.mark('end');
      await s.pause(1500);
      console.log('TEXT\n' + (await s.page.evaluate(() => document.body.innerText)).slice(0, 900));
    },
  },
};

const scenario = SCENARIOS[slug];
if (!scenario) throw new Error(`Unknown scenario: ${slug}`);
const s = await startSession({ outDir: path.join(courseDir, 'rec', slug), url: typeof scenario.url === 'function' ? await scenario.url() : scenario.url, privacyCss: scenario.privacy, ...scenario.view });
try { await scenario.run(s); } finally { await s.end(); }
