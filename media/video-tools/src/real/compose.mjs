// Turns a real recording + Lía's cues into the final cápsula MP4.
//   node src/real/compose.mjs <course-folder> <slug>      (e.g. capsulas-gemini)
//
// Each cue's voice starts at its recorded event. Between two events the
// recording is sped up (waiting for an answer, long typing) when it is longer
// than the voice, and the last frame is held when the voice needs more time.
// The first cue, when its event is "intro", plays over Lía's title card.
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const courseDir = path.resolve(here, '../../../cursos', process.argv[2]);
const slug = process.argv[3];
const FPS = 24;
const SPEED_MAX = 3.5;
const LEAD = 0.15; // voice starts just after the action it describes
const TAIL = 0.45; // breathing room after each cue
const END_HOLD = 1.6;

const videos = JSON.parse(await readFile(path.join(courseDir, 'real.json'), 'utf8'));
const video = videos.find((v) => v.slug === slug);
if (!video) throw new Error(`Unknown video: ${slug}`);
const recDir = path.join(courseDir, 'rec', slug);
const { frames, events } = JSON.parse(await readFile(path.join(recDir, 'recording.json'), 'utf8'));
const cues = JSON.parse(await readFile(path.join(recDir, 'cues.json'), 'utf8'));
const recEnd = frames.at(-1).t;
const eventAt = (name) => {
  const ev = events.find((e) => e.name === name);
  if (!ev) throw new Error(`Event not recorded: ${name}`);
  return ev.t;
};

// ---- timeline: [{outStart, outDur, recStart, recDur, speed}] ----
const segments = [];
let out = 0;
const voiced = [];
let rest = cues;
if (cues[0]?.event === 'intro') {
  const d = cues[0].duration + 0.7;
  segments.push({ outStart: 0, outDur: d, recStart: 0, recDur: 0 });
  voiced.push({ cue: cues[0], at: 0.2 });
  out = d;
  rest = cues.slice(1);
}
const anchors = rest.map((cue) => ({ cue, t: eventAt(cue.event) }));
if (anchors.length && anchors[0].t > 0.05) {
  const r = anchors[0].t;
  const d = r / SPEED_MAX;
  segments.push({ outStart: out, outDur: d, recStart: 0, recDur: r });
  out += d;
}
anchors.forEach(({ cue, t }, i) => {
  const r = (anchors[i + 1]?.t ?? recEnd) - t;
  const need = LEAD + cue.duration + TAIL;
  const d = Math.max(need, r / SPEED_MAX);
  segments.push({ outStart: out, outDur: d, recStart: t, recDur: r });
  voiced.push({ cue, at: out + LEAD });
  out += d;
});
segments.push({ outStart: out, outDur: END_HOLD, recStart: recEnd, recDur: 0 });
out += END_HOLD;
const duration = out;

const recTimeAt = (t) => {
  const seg = segments.findLast((s) => t >= s.outStart) ?? segments[0];
  const local = t - seg.outStart;
  if (seg.recDur <= 0) return seg.recStart;
  // Faster than real time when the recording is longer; otherwise 1x then hold.
  const speed = Math.max(1, seg.recDur / seg.outDur);
  return seg.recStart + Math.min(seg.recDur, local * speed);
};
const frameAt = (rt) => {
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (frames[mid].t <= rt) lo = mid; else hi = mid - 1;
  }
  return frames[lo].file;
};

// ---- subtitles ----
const lines = voiced.flatMap(({ cue, at }) => cue.lines.map((l) => ({ offset: at + l.offset, duration: l.duration, text: l.text })));
const stamp = (time) => {
  const ms = Math.round(time * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s}.${String(ms % 1000).padStart(3, '0')}`;
};
const vttPath = path.join(courseDir, `${slug}.vtt`);
await writeFile(vttPath, ['WEBVTT', '', ...lines.flatMap((l) => [
  `${stamp(l.offset)} --> ${stamp(l.offset + l.duration)}`,
  l.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'), '',
])].join('\n'), 'utf8');
await writeFile(path.join(courseDir, `${slug}-boundaries.json`), JSON.stringify(lines, null, 1));

// ---- audio: each cue placed at its time ----
const wavPath = path.join(recDir, 'voice.wav');
const audioInputs = voiced.flatMap(({ cue }) => ['-i', path.join(recDir, 'cues', cue.file)]);
const delays = voiced.map(({ at }, i) => `[${i}:a]adelay=${Math.round(at * 1000)}:all=1[a${i}]`).join(';');
const mix = `${delays};${voiced.map((_, i) => `[a${i}]`).join('')}amix=inputs=${voiced.length}:normalize=0,apad,atrim=0:${duration.toFixed(3)}[out]`;
let result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...audioInputs, '-filter_complex', mix, '-map', '[out]', '-ar', '48000', wavPath], { stdio: 'inherit' });
if (result.status !== 0) throw new Error('Audio mix failed');

// ---- frames ----
const framesDir = path.join(recDir, '.out');
await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => { throw error; });
await page.goto(`file://${path.resolve(courseDir, '../capsulas-kit/real.html')}`);
const speech = lines.map((l) => [l.offset, l.offset + l.duration]);
const introEnd = cues[0]?.event === 'intro' ? segments[0].outDur : 0;
await page.evaluate((cfg) => window.setup(cfg), { course: video.course, title: video.title, speech, duration, introEnd, liaSide: video.liaSide });
const total = Math.ceil(duration * FPS);
for (let f = 0; f < total; f += 1) {
  const t = f === 0 ? Math.min(1.2, duration) : f / FPS;
  const src = `file://${path.join(recDir, 'frames', frameAt(recTimeAt(t)))}`;
  await page.evaluate(({ tt, s }) => window.renderAt(tt, s), { tt: t, s: src });
  await page.screenshot({ path: path.join(framesDir, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
}
await browser.close();

const mp4Path = path.join(courseDir, `${slug}.mp4`);
result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-framerate', String(FPS), '-i', path.join(framesDir, 'f%05d.jpg'),
  '-i', wavPath, '-i', vttPath,
  '-map', '0:v:0', '-map', '1:a:0', '-map', '2:s:0',
  '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21',
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-af', 'loudnorm=I=-18:LRA=7:TP=-2',
  '-c:s', 'mov_text', '-metadata:s:s:0', 'language=spa', '-disposition:s:0', '0',
  '-movflags', '+faststart',
  '-metadata', `title=${video.title} | ILIA`,
  '-metadata', 'comment=Grabación real de la herramienta. Narración sintética (voz neural).',
  mp4Path,
], { stdio: 'inherit' });
if (result.status !== 0) throw new Error('FFmpeg failed on the final render.');
await rm(framesDir, { recursive: true, force: true });
console.log(`MP4 ${duration.toFixed(1)} s (${total} frames): ${mp4Path}`);
