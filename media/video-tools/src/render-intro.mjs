import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, rm, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', 'cursos', 'introduccion-ia-docentes');
const audioPath = path.join(root, 'narracion.wav');
const mp4Path = path.join(root, 'ia-generativa-para-docentes.mp4');
const mp3Path = path.join(root, 'narracion.mp3');
const mp3TempPath = path.join(root, 'narracion-render.mp3');
const vttPath = path.join(root, 'subtitulos.vtt');
const assPath = path.join(root, 'subtitulos.ass');
const tempDir = path.join(root, '.render');
const boundaries = JSON.parse(await readFile(path.join(root, 'boundaries.json'), 'utf8'));
const duration = boundaries.at(-1).offset + boundaries.at(-1).duration;

const beats = [
  { phrase: 'Profe, piensa', eyebrow: 'Antes de empezar la clase', title: 'Mañana tienes una hoja que preparar.', art: 'desk' },
  { phrase: 'Ya leyeron', eyebrow: 'Una meta concreta', title: 'Un cuento que ya leyó el curso.', art: 'read' },
  { phrase: 'Una inteligencia artificial', eyebrow: 'La herramienta propone', title: 'El contexto lo pones tú.', art: 'ai' },
  { phrase: 'Escribes', eyebrow: 'El primer intento', title: '«Hazme una lectura con preguntas».', art: 'vague' },
  { phrase: 'Y puede', eyebrow: 'Cuando faltan datos', title: 'La herramienta llena los espacios.', art: 'guess' },
  { phrase: 'Probemos:', eyebrow: 'Un ejemplo para séptimo', title: 'El huerto del curso.', art: 'output' },
  { phrase: 'Pide cinco', eyebrow: 'Así se ve el pedido', title: 'Una idea. Cinco preguntas.', art: 'context' },
  { phrase: 'La primera pregunta', eyebrow: 'Miremos el texto', title: '¿De qué trata?', art: 'topic' },
  { phrase: 'La siguiente', eyebrow: 'Una pregunta distinta', title: '¿Qué idea explica el párrafo?', art: 'idea' },
  { phrase: '¿Y las otras tres?', eyebrow: 'Tres pistas más', title: 'Busca las respuestas en el texto.', art: 'questions' },
  { phrase: 'Así, quien duda', eyebrow: 'Una estrategia que enseñamos', title: 'Vuelve al párrafo. Encuentra la pista.', art: 'find' },
  { phrase: 'Antes de usar', eyebrow: 'Revisar también es enseñar', title: '¿Tiene sentido para tu curso?', art: 'check' },
  { phrase: 'Si una pregunta', eyebrow: 'Ajustar es parte del trabajo', title: 'Cambia lo que no se sostiene.', art: 'edit' },
  { phrase: 'No compartas', eyebrow: 'Cuidemos la privacidad', title: 'Deja fuera nombres y calificaciones.', art: 'privacy' },
  { phrase: 'En séptimo', eyebrow: 'La destreza del ejemplo', title: 'Tema e ideas principales.', code: 'LL.3.3.3', art: 'skill' },
  { phrase: 'Para empezar', eyebrow: 'Prueba con tu próxima clase', title: 'Cuenta qué ya trabajaron.', art: 'start' },
  { phrase: 'Y ahí está', eyebrow: 'Tu criterio queda al centro', title: 'Tú decides qué llega al aula.', art: 'close' },
];
for (const beat of beats) {
  const line = boundaries.find((item) => item.text.startsWith(beat.phrase));
  if (!line) throw new Error(`No se encontró el inicio de escena: ${beat.phrase}`);
  beat.at = line.offset;
}

const stamp = (time) => {
  const millis = Math.floor((time % 1) * 1000);
  const whole = Math.floor(time);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};
const vtt = ['WEBVTT', '', ...boundaries.flatMap((item) => [
  `${stamp(item.offset)} --> ${stamp(item.offset + item.duration)}`,
  item.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
  '',
])].join('\n');
await writeFile(vttPath, vtt, 'utf8');
const assTime = (time) => {
  const whole = Math.floor(time);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const centiseconds = Math.floor((time % 1) * 100);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
};
const ass = [
  '[Script Info]', 'Title: ILIA · Un primer pedido útil para tu clase', 'ScriptType: v4.00+', 'PlayResX: 1280', 'PlayResY: 720',
  '', '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  'Style: Default,Arial,21,&H001B1B17,&H000000FF,&H20FBFAF7,&H20FBFAF7,1,0,3,1,0,2,150,150,60,1',
  '', '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ...boundaries.map((line) => `Dialogue: 0,${assTime(line.offset)},${assTime(line.offset + line.duration)},Default,,0,0,0,,${line.text.replaceAll('\\', '\\\\').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('\n', '\\N')}`),
].join('\n');
await writeFile(assPath, ass, 'utf8');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => { throw error; });
await mkdir(tempDir, { recursive: true });
let html = await readFile(path.join(here, 'intro.html'), 'utf8');
html = html.replace('<script>', `<script>window.ILIA = ${JSON.stringify({ beats, boundaries, duration })};</script><script>`);
await page.setContent(html, { waitUntil: 'load' });
await page.waitForTimeout(700);
const frames = [];
for (const [index, beat] of beats.entries()) {
  await page.evaluate((time) => {
    window.renderAt(time);
    document.getElementById('caption').textContent = '';
  }, beat.at);
  for (const [phase, delay] of [1300, 150].entries()) {
    await page.waitForTimeout(delay);
    const framePath = path.join(tempDir, `scene-${String(index).padStart(2, '0')}-${phase}.png`);
    await page.screenshot({ path: framePath });
    frames.push(framePath);
    if (index === 0 && phase === 1) await writeFile(path.join(root, 'portada.png'), await readFile(framePath));
  }
}
await page.close();
await browser.close();

const transition = 0.08;
const beatDurations = beats.map((beat, index) => {
  const end = beats[index + 1]?.at ?? duration;
  return end - beat.at;
});
const sceneDurations = beatDurations.flatMap((baseDuration, index) => {
  const perFrame = baseDuration / 2;
  const transitionHold = index === beatDurations.length - 1 ? 0 : transition;
  return [perFrame + transition, perFrame + transitionHold];
});
const args = ['-hide_banner', '-loglevel', 'error', '-y'];
for (const [index, framePath] of frames.entries()) {
  args.push('-loop', '1', '-framerate', '30', '-t', sceneDurations[index].toFixed(4), '-i', framePath);
}
const audioIndex = frames.length;
args.push('-i', audioPath);
const filters = frames.map((_, index) => `[${index}:v]settb=AVTB,setpts=PTS-STARTPTS,fps=30,scale=1280:720,setsar=1,format=yuv420p[v${index}]`);
let current = 'v0';
let offset = sceneDurations[0] - transition;
for (let index = 1; index < frames.length; index += 1) {
  const next = `mix${index}`;
  filters.push(`[${current}][v${index}]xfade=transition=fade:duration=${transition}:offset=${offset.toFixed(4)}[${next}]`);
  current = next;
  if (index + 1 < frames.length) offset += sceneDurations[index] - transition;
}
const subtitleFilterPath = path.relative(process.cwd(), assPath).replaceAll('\\', '/');
filters.push(`[${current}]subtitles=${subtitleFilterPath},format=yuv420p[outv]`);
args.push(
  '-filter_complex', filters.join(';'), '-map', '[outv]', '-map', `${audioIndex}:a:0`, '-shortest',
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '19',
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-af', 'loudnorm=I=-18:LRA=7:TP=-2', '-movflags', '+faststart',
  '-metadata', 'title=Un primer pedido útil para tu clase | ILIA',
  '-metadata', 'comment=Microlección para docentes · voz neural es-EC-Andrea', mp4Path,
);
const result = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
if (result.status !== 0) throw new Error('Falló el render final con FFmpeg.');
const voiceExport = spawnSync(ffmpegPath, [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', audioPath,
  '-af', 'loudnorm=I=-18:LRA=7:TP=-2', '-c:a', 'libmp3lame', '-b:a', '160k', mp3TempPath,
], { stdio: 'inherit' });
if (voiceExport.status !== 0) throw new Error('No se pudo exportar la narración en MP3.');
await rm(mp3Path, { force: true });
await rename(mp3TempPath, mp3Path);
await rm(tempDir, { recursive: true, force: true });
console.log(`MP4 creado (${duration.toFixed(1)}s): ${mp4Path}`);
