import asyncio
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys

import edge_tts
import numpy as np
import soundfile as sf

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
# ILIA_COURSE_DIR points the pipeline at another course folder with the same layout.
ROOT = pathlib.Path(os.environ.get("ILIA_COURSE_DIR", SCRIPT_DIR)).resolve()


def find_ffmpeg() -> str:
    """Bundled ffmpeg-static first (ffmpeg.exe on Windows, ffmpeg elsewhere), then PATH."""
    bundled = SCRIPT_DIR.parents[1] / "video-tools" / "node_modules" / "ffmpeg-static"
    for name in ("ffmpeg.exe", "ffmpeg"):
        if (bundled / name).exists():
            return str(bundled / name)
    found = shutil.which("ffmpeg")
    if not found:
        raise SystemExit("FFmpeg not found: run npm install in media/video-tools or install ffmpeg.")
    return found


FFMPEG = find_ffmpeg()
VOICE = "es-EC-AndreaNeural"
RATE = "-8%"
PITCH = "-1Hz"
SAMPLE_RATE = 24000
PAUSE = 0.3

modules = json.loads((ROOT / "videos-modulos.json").read_text(encoding="utf-8"))
requested = sys.argv[1] if len(sys.argv) > 1 else ""
module = next((item for item in modules if item["slug"] == requested), None)
if not module:
    raise SystemExit(f"Módulo desconocido: {requested}")

sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", module["narration"].strip()) if part.strip()]


async def synthesize():
    temp = ROOT / ".voice_tmp"
    temp.mkdir(exist_ok=True)
    parts = []
    boundaries = []
    cursor = 0.0
    for index, sentence in enumerate(sentences):
        mp3 = temp / f"line-{index:02}.mp3"
        wav = temp / f"line-{index:02}.wav"
        await edge_tts.Communicate(sentence, VOICE, rate=RATE, pitch=PITCH).save(str(mp3))
        subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", str(SAMPLE_RATE), "-c:a", "pcm_s16le", str(wav)], check=True)
        audio, rate = sf.read(wav, dtype="float32")
        if rate != SAMPLE_RATE:
            raise ValueError(f"Frecuencia inesperada: {rate}")
        boundaries.append({"offset": cursor, "duration": len(audio) / rate, "text": sentence})
        parts.append(audio)
        cursor += len(audio) / rate
        if index < len(sentences) - 1:
            pause = np.zeros(round(PAUSE * rate), dtype=np.float32)
            parts.append(pause)
            cursor += len(pause) / rate
        mp3.unlink(missing_ok=True)
        wav.unlink(missing_ok=True)
    audio = np.concatenate(parts)
    sf.write(ROOT / f"{requested}.wav", audio, SAMPLE_RATE, subtype="PCM_16")
    (ROOT / f"{requested}-boundaries.json").write_text(json.dumps(boundaries, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.rmdir()
    print(f"Voz {VOICE} · {len(sentences)} frases · {len(audio) / SAMPLE_RATE:.1f} s · {requested}")


asyncio.run(synthesize())
