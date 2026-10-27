import asyncio
import json
import pathlib
import re
import subprocess

import numpy as np
import soundfile as sf
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent
FFMPEG = ROOT.parents[1] / 'video-tools' / 'node_modules' / 'ffmpeg-static' / 'ffmpeg.exe'
VOICE = 'es-EC-AndreaNeural'
RATE = '-8%'
PITCH = '-1Hz'
SAMPLE_RATE = 24000
PAUSE = 0.28

markdown = (ROOT / 'guion.md').read_text(encoding='utf-8')
voice_text = markdown.split('## Guion de locución', 1)[1].split('## Escenas', 1)[0]
voice_text = '\n'.join(line.strip() for line in voice_text.splitlines() if line.strip() and not line.startswith('**'))
sentences = [part.strip() for part in re.split(r'(?<=[.!?])\s+', voice_text) if part.strip()]

async def synthesize():
    temp = ROOT / '.voice_tmp'
    temp.mkdir(exist_ok=True)
    parts = []
    boundaries = []
    cursor = 0.0
    for index, sentence in enumerate(sentences):
        mp3 = temp / f'line-{index:02}.mp3'
        wav = temp / f'line-{index:02}.wav'
        await edge_tts.Communicate(sentence, VOICE, rate=RATE, pitch=PITCH).save(str(mp3))
        subprocess.run([str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-y', '-i', str(mp3), '-ac', '1', '-ar', str(SAMPLE_RATE), '-c:a', 'pcm_s16le', str(wav)], check=True)
        audio, rate = sf.read(wav, dtype='float32')
        if rate != SAMPLE_RATE:
            raise ValueError(f'Frecuencia inesperada: {rate}')
        start = cursor
        duration = len(audio) / rate
        boundaries.append({'offset': start, 'duration': duration, 'text': sentence})
        parts.append(audio)
        cursor += duration
        if index < len(sentences) - 1:
            pause = np.zeros(round(PAUSE * rate), dtype=np.float32)
            parts.append(pause)
            cursor += len(pause) / rate
        mp3.unlink(missing_ok=True)
        wav.unlink(missing_ok=True)
    audio = np.concatenate(parts)
    sf.write(ROOT / 'narracion.wav', audio, SAMPLE_RATE, subtype='PCM_16')
    (ROOT / 'boundaries.json').write_text(json.dumps(boundaries, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.rmdir()
    print(f'Voz {VOICE} · {len(sentences)} frases · {len(audio) / SAMPLE_RATE:.1f} s')

asyncio.run(synthesize())
