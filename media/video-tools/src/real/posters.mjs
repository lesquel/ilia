// Draws the poster of every catalog video: Lía's title card, saved as a .jpg
// next to the .mp4 so the API can hand it to the player.
//   node src/real/posters.mjs <videos.json>
// videos.json: [{ "resource": "cursos/<folder>/<name>.mp4", "course": "...", "title": "..." }]
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mediaRoot = path.resolve(here, '../../..');
const videos = JSON.parse(await readFile(process.argv[2], 'utf8'));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => { throw error; });

let made = 0;
for (const video of videos) {
  const mp4 = path.join(mediaRoot, video.resource);
  if (!existsSync(mp4)) throw new Error(`Missing video: ${video.resource}`);
  await page.goto(`file://${path.join(mediaRoot, 'cursos/capsulas-kit/real.html')}`);
  // Lía mid-sentence on the card, the way every cápsula opens.
  await page.evaluate((cfg) => window.setup(cfg), {
    course: video.course, title: video.title, speech: [[0, 1]], duration: 10, introEnd: 10,
  });
  // Only the cápsulas are presented by Lía; the other videos are the lesson itself.
  if (!video.resource.includes('/capsulas-')) {
    await page.evaluate(() => { document.querySelector('.lia-intro p').textContent = 'Video de la lección'; });
  }
  await page.evaluate(() => window.renderAt(0, null));
  await page.screenshot({ path: mp4.replace(/\.mp4$/, '.jpg'), type: 'jpeg', quality: 86 });
  made += 1;
}
await browser.close();
console.log(`${made} posters`);
