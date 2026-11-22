// Real Gemini sessions for the «Gemini paso a paso» cápsulas.
//   node src/real/gemini.mjs g1-el-primer-pedido
// Writes media/cursos/capsulas-gemini/rec/<slug>/{frames/, recording.json}.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { startSession, PRIVACY } from './recorder.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const courseDir = path.resolve(here, '../../../cursos/capsulas-gemini');
const slug = process.argv[2];

const INPUT = 'rich-textarea div[contenteditable="true"]';
const SEND = 'button[aria-label*="Enviar"], button[aria-label*="Send"]';

const replyCount = (s) => s.page.evaluate(() => document.querySelectorAll('message-content').length);

async function waitForAnswer(s, before, { maxMs = 120000 } = {}) {
  // Done when a new reply exists and stops growing for 3 s.
  let last = -1;
  let stableSince = Date.now();
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const len = await s.page.evaluate((n) => {
      const replies = document.querySelectorAll('message-content');
      return replies.length > n ? replies[replies.length - 1].innerText.length : 0;
    }, before);
    if (len !== last) { last = len; stableSince = Date.now(); }
    if (len > 0 && Date.now() - stableSince > 3000) return len;
    await s.pause(400);
  }
  throw new Error('Gemini did not finish answering in time');
}

async function scrollThrough(s, total = 900) {
  await s.scrollBy('infinite-scroller', total, { steps: 22, gap: 200 });
}

async function followUp(s, text, { lookAt = null, showFrom = '¿' } = {}) {
  await s.begin();
  s.mark('open');
  await s.pause(1200);
  if (lookAt) { s.mark('look'); await s.scrollToText(lookAt, { which: 'last' }); await s.pause(800); }
  await s.click(INPUT, 'type');
  await s.type(text);
  await s.pause(600);
  const before = await replyCount(s);
  await s.click(SEND, 'send');
  await waitForAnswer(s, before);
  s.mark('answer');
  await s.pause(1200);
  s.mark('scroll');
  await s.scrollToText(showFrom);
  s.mark('end');
  await s.pause(1500);
  console.log('ANSWER\n' + await s.page.evaluate(() => [...document.querySelectorAll('message-content')].at(-1).innerText));
}

const SCENARIOS = {
  async 'g1-el-primer-pedido'(s) {
    await s.begin();
    s.mark('home');
    await s.pause(1500);
    await s.click('a[aria-label="Nuevo chat"]', 'new-chat');
    await s.pause(1200);
    await s.click(INPUT, 'type-1');
    await s.type('Eres docente de Lengua de séptimo en una escuela fiscal. Mi clase dura 45 minutos. ');
    s.mark('type-2');
    await s.type('Escribe un párrafo de seis líneas sobre el huerto escolar y cinco preguntas que se contesten con el texto y que separen el tema de la idea principal. ');
    s.mark('type-3');
    await s.type('Pon la clave aparte, al final, para mí.');
    await s.pause(600);
    const before = await replyCount(s);
    await s.click(SEND, 'send');
    await waitForAnswer(s, before);
    s.mark('answer');
    await s.pause(1200);
    s.mark('scroll');
    await s.scrollToText('¿');
    s.mark('end');
    await s.pause(1500);
    await writeFile(path.join(courseDir, 'rec', 'chat.json'), JSON.stringify({ url: s.page.url() }));
    console.log('ANSWER\n' + await s.page.evaluate(() => [...document.querySelectorAll('message-content')].at(-1).innerText));
  },
  async 'g2-un-cambio-sin-empezar-de-cero'(s) {
    await followUp(s, 'Las preguntas que se contestan con un dato suelto no muestran si distinguen el tema de la idea principal. Cambia solo esas por preguntas que pidan decidir si una frase del párrafo es el tema, la idea principal o un detalle. Deja lo demás igual.', { lookAt: '¿' });
  },
  async 'g3-para-quien-va-atrasado'(s) {
    await followUp(s, 'Haz una segunda versión para tres estudiantes que todavía leen despacio: el mismo párrafo en frases más cortas y numeradas, y antes de cada pregunta una pista que diga en qué frase buscar. Deja la clave aparte.', { showFrom: 'Pista' });
  },
  async 'g4-de-gemini-a-la-hoja'(s) {
    // Exports the whole-class sheet (the reply of video 2) and finishes it in Docs.
    const sheet = s.page.locator('model-response').nth(1);
    await sheet.scrollIntoViewIfNeeded();
    await s.scrollBy('infinite-scroller', 520, { steps: 1, gap: 300 });
    await s.pause(1500);
    await s.begin();
    s.mark('open');
    await s.pause(1500);
    await sheet.hover();
    await s.pause(400);
    await s.click('model-response >> nth=1 >> button[aria-label="Mostrar más opciones"]', 'menu');
    await s.pause(700);
    await s.click('[data-test-id="export-docs-button"]', 'export');
    const open = s.page.getByText('Abrir Documentos').filter({ visible: true }).first();
    await open.waitFor({ state: 'visible', timeout: 60000 });
    await s.pause(900);
    s.mark('created');
    const opening = s.context.waitForEvent('page', { timeout: 30000 });
    await s.click('text=Abrir Documentos');
    s.hold();
    const doc = await opening;
    await s.follow(doc, PRIVACY.docs, { settleMs: 5000 });
    s.mark('docs');
    await s.pause(1500);
    await s.clickAt(512, 300);
    s.mark('chatter');
    // Everything Gemini wrote before the sheet's first heading is chatter.
    await s.press('Control+f');
    await s.type('Texto para leer en clase', { delay: 15 });
    await s.press('Enter');
    await s.press('Escape');
    await s.press('Home');
    await s.press('Control+Shift+Home');
    await s.pause(1100);
    await s.press('Backspace');
    await s.pause(500);
    s.mark('header');
    await s.press('Enter');
    await s.press('ArrowUp');
    await s.type('Escuela fiscal · Séptimo · Fecha: ________', { delay: 45 });
    await s.pause(800);
    s.mark('key');
    await s.press('Control+f');
    await s.type('Clave de respuestas', { delay: 20 });
    await s.press('Enter');
    await s.press('Escape');
    await s.pause(800);
    await s.press('Home');
    await s.press('Control+Shift+End');
    await s.pause(1400);
    s.mark('cut');
    await s.press('Control+x');
    await s.pause(1200);
    await s.press('Control+Home');
    s.mark('end');
    await s.pause(2500);
  },
};

const scenario = SCENARIOS[slug];
if (!scenario) throw new Error(`Unknown scenario: ${slug}`);
const s = await startSession({
  outDir: path.join(courseDir, 'rec', slug),
  url: slug.startsWith('g1') ? 'https://gemini.google.com/app' : JSON.parse(await readFile(path.join(courseDir, 'rec', 'chat.json'), 'utf8')).url,
  privacyCss: PRIVACY.gemini,
});
try { await scenario(s); } finally { await s.end(); }
