// Renders a scene page (`<course>/<slug>.html`) into an MP4 with real motion.
//
// render-module.mjs takes one still per beat and cross-fades them. Here the
// page exposes `window.renderAt(t)`, a pure function of time, and every frame
// is a screenshot at that instant — so the result is deterministic and smooth.
//
//   ILIA_COURSE_DIR=../cursos/curso-docentes node src/render-motion.mjs <slug> [fps]
import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.env.ILIA_COURSE_DIR ?? '.');
const slug = process.argv[2];
const fps = Number(process.argv[3] ?? 24);
const modules = JSON.parse(await readFile(path.join(root, 'videos-modulos.json'), 'utf8'));
const module = modules.find((item) => item.slug === slug);
if (!module) throw new Error(`Unknown module: ${slug}`);

const boundaries = JSON.parse(await readFile(path.join(root, `${slug}-boundaries.json`), 'utf8'));
const duration = boundaries.at(-1).offset + boundaries.at(-1).duration;
const beats = module.beats.map((beat) => {
  const line = boundaries.find((item) => item.text.startsWith(beat.phrase));
  if (!line) throw new Error(`Beat phrase not found in narration: ${beat.phrase}`);
  return { ...beat, at: line.offset };
});

const stamp = (time, sep = '.', digits = 3) => {
  const whole = Math.floor(time);
  const frac = String(Math.floor((time % 1) * 10 ** digits)).padStart(digits, '0');
  return `${String(Math.floor(whole / 3600)).padStart(2, '0')}:${String(Math.floor((whole % 3600) / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}${sep}${frac}`;
};
const vttPath = path.join(root, `${slug}.vtt`);
const assPath = path.join(root, `${slug}.ass`);
await writeFile(vttPath, ['WEBVTT', '', ...boundaries.flatMap((item) => [
  `${stamp(item.offset)} --> ${stamp(item.offset + item.duration)}`,
  item.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'), '',
])].join('\n'), 'utf8');
const assTime = (time) => stamp(time, '.', 2).replace(/^0/, '');
await writeFile(assPath, [
  '[Script Info]', `Title: ILIA · ${module.title}`, 'ScriptType: v4.00+', 'PlayResX: 1280', 'PlayResY: 720',
  '', '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  'Style: Default,Arial,24,&H00171B1B,&H000000FF,&H10F7FAFB,&H10F7FAFB,1,0,3,10,0,2,140,140,52,1',
  '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ...boundaries.map((line) => `Dialogue: 0,${assTime(line.offset)},${assTime(line.offset + line.duration)},Default,,0,0,0,,${line.text.replaceAll('{', '\\{').replaceAll('}', '\\}')}`),
].join('\n'), 'utf8');

const framesDir = path.join(root, `.frames-${slug}`);
await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => { throw error; });
await page.goto(`file://${path.join(root, `${slug}.html`)}`);
await page.evaluate((data) => { window.ILIA = data; }, { beats, boundaries, duration });
const total = Math.ceil(duration * fps);
for (let frame = 0; frame < total; frame += 1) {
  // Frame 0 is the preview players show before play: use a moment where the
  // first scene is already on screen instead of the blank fade-in.
  const at = frame === 0 ? Math.min(2.5, duration) : frame / fps;
  await page.evaluate((t) => window.renderAt(t), at);
  await page.screenshot({ path: path.join(framesDir, `f${String(frame).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
}
await browser.close();

const mp4Path = path.join(root, `${slug}.mp4`);
// Captions travel as a soft track, not burned in: the lesson player reads the
// sibling .vtt and shows them with its own CC toggle (same as render-module).
const result = spawnSync(ffmpegPath, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-framerate', String(fps), '-i', path.join(framesDir, 'f%05d.jpg'),
  '-i', path.join(root, `${slug}.wav`),
  '-i', vttPath,
  '-map', '0:v:0', '-map', '1:a:0', '-map', '2:s:0',
  '-vf', 'format=yuv420p',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-af', 'loudnorm=I=-18:LRA=7:TP=-2',
  '-c:s', 'mov_text', '-metadata:s:s:0', 'language=spa', '-disposition:s:0', '0',
  '-shortest', '-movflags', '+faststart',
  '-metadata', `title=${module.title} | ILIA`,
  '-metadata', `comment=${process.env.ILIA_VOICE_NOTE ?? 'Narración sintética (voz neural). Animación generada.'}`,
  mp4Path,
], { stdio: 'inherit' });
if (result.status !== 0) throw new Error('FFmpeg failed on the final render.');
await rm(framesDir, { recursive: true, force: true });
console.log(`MP4 (${duration.toFixed(1)} s, ${total} frames): ${mp4Path}`);
