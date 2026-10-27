import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', 'cursos', 'introduccion-ia-docentes');
const modules = JSON.parse(await readFile(path.join(root, 'videos-modulos.json'), 'utf8'));
const slug = process.argv[2];
const module = modules.find((item) => item.slug === slug);
if (!module) throw new Error(`Módulo desconocido: ${slug}`);
const boundaries = JSON.parse(await readFile(path.join(root, `${slug}-boundaries.json`), 'utf8'));
const audioPath = path.join(root, `${slug}.wav`);
const mp4Path = path.join(root, `${slug}.mp4`);
const vttPath = path.join(root, `${slug}.vtt`);
const assPath = path.join(root, `${slug}.ass`);
const tempDir = path.join(root, `.render-${slug}`);
const duration = boundaries.at(-1).offset + boundaries.at(-1).duration;

const beats = module.beats.map((beat) => {
  const line = boundaries.find((item) => item.text.startsWith(beat.phrase));
  if (!line) throw new Error(`No se encontró el inicio de escena: ${beat.phrase}`);
  return { ...beat, at: line.offset };
});
const stamp = (time) => {
  const millis = Math.floor((time % 1) * 1000);
  const whole = Math.floor(time);
  return `${String(Math.floor(whole / 3600)).padStart(2, '0')}:${String(Math.floor((whole % 3600) / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};
await writeFile(vttPath, ['WEBVTT', '', ...boundaries.flatMap((item) => [
  `${stamp(item.offset)} --> ${stamp(item.offset + item.duration)}`,
  item.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'), '',
])].join('\n'), 'utf8');
const assTime = (time) => {
  const whole = Math.floor(time);
  return `${Math.floor(whole / 3600)}:${String(Math.floor((whole % 3600) / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}.${String(Math.floor((time % 1) * 100)).padStart(2, '0')}`;
};
const ass = [
  '[Script Info]', `Title: ILIA · ${module.title}`, 'ScriptType: v4.00+', 'PlayResX: 1280', 'PlayResY: 720',
  '', '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  'Style: Default,Arial,21,&H001B1B17,&H000000FF,&H20FBFAF7,&H20FBFAF7,1,0,3,1,0,2,150,150,60,1',
  '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ...boundaries.map((line) => `Dialogue: 0,${assTime(line.offset)},${assTime(line.offset + line.duration)},Default,,0,0,0,,${line.text.replaceAll('\\', '\\\\').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('\n', '\\N')}`),
].join('\n');
await writeFile(assPath, ass, 'utf8');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => { throw error; });
await mkdir(tempDir, { recursive: true });
let html = await readFile(path.join(here, 'intro.html'), 'utf8');
html = html.replace('<script>', `<script>window.ILIA = ${JSON.stringify({ beats, boundaries, duration })};</script><script>`);
html = html.replace('Una práctica para preparar tu clase', module.title).replace('Un primer pedido para tu clase', module.title);
await page.setContent(html, { waitUntil: 'load' });
await page.waitForTimeout(700);
const frames = [];
for (const [index, beat] of beats.entries()) {
  await page.evaluate((time) => {
    window.renderAt(time);
    document.getElementById('caption').textContent = '';
  }, beat.at);
  await page.waitForTimeout(1150);
  const framePath = path.join(tempDir, `scene-${String(index).padStart(2, '0')}.png`);
  await page.screenshot({ path: framePath });
  frames.push(framePath);
}
await browser.close();

const transition = 0.22;
const sceneDurations = beats.map((beat, index) => {
  const end = beats[index + 1]?.at ?? duration;
  return end - beat.at;
});
const args = ['-hide_banner', '-loglevel', 'error', '-y'];
for (const [index, frame] of frames.entries()) args.push('-loop', '1', '-framerate', '30', '-t', (sceneDurations[index] + (index < frames.length - 1 ? transition : 0)).toFixed(4), '-i', frame);
const audioIndex = frames.length;
args.push('-i', audioPath);
const filters = frames.map((_, index) => `[${index}:v]settb=AVTB,setpts=PTS-STARTPTS,fps=30,scale=1280:720,setsar=1,format=yuv420p[v${index}]`);
let current = 'v0';
let offset = sceneDurations[0];
for (let index = 1; index < frames.length; index += 1) {
  const next = `mix${index}`;
  filters.push(`[${current}][v${index}]xfade=transition=fade:duration=${transition}:offset=${offset.toFixed(4)}[${next}]`);
  current = next;
  if (index + 1 < frames.length) offset += sceneDurations[index];
}
filters.push(`[${current}]subtitles=${path.relative(process.cwd(), assPath).replaceAll('\\', '/')},format=yuv420p[outv]`);
args.push('-filter_complex', filters.join(';'), '-map', '[outv]', '-map', `${audioIndex}:a:0`, '-shortest', '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-af', 'loudnorm=I=-18:LRA=7:TP=-2', '-movflags', '+faststart', '-metadata', `title=${module.title} | ILIA`, '-metadata', 'comment=Microlección para docentes · voz neural es-EC-Andrea', mp4Path);
const result = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
if (result.status !== 0) throw new Error('Falló el render final con FFmpeg.');
await rm(tempDir, { recursive: true, force: true });
console.log(`MP4 creado (${duration.toFixed(1)}s): ${mp4Path}`);
