"""Narrate a module with a locally cloned voice (Qwen3-TTS, x-vector mode).

Same contract as clone_voice.py: reads `<course>/videos-modulos.json` and writes
`<slug>.wav` (24 kHz mono) and `<slug>-boundaries.json` (one entry per
sentence), so render-motion.mjs works unchanged. Nothing leaves the machine.

x-vector mode clones the voice from the reference audio alone. The mode that
also takes the reference transcript runs away (minutes of audio) when the
transcript is not exact, so it is not used.

    ILIA_COURSE_DIR=../cursos/<course> <qwen-venv>/bin/python clone_voice_qwen.py <reference.wav> <slug> [<slug> ...]
"""

import json
import os
import pathlib
import re
import sys

import numpy as np
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

from clean_narration import clean

SAMPLE_RATE = 24000
PAUSE = 0.3
CHARS_PER_SECOND = 14
MAX_TAKES = 4

root = pathlib.Path(os.environ.get("ILIA_COURSE_DIR", ".")).resolve()
reference, *slugs = sys.argv[1:]
modules = {item["slug"]: item for item in json.loads((root / "videos-modulos.json").read_text(encoding="utf-8"))}
device = "mps" if torch.backends.mps.is_available() else "cpu"
model = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base", device_map=device, dtype=torch.float32)


def plausible(sentence: str, duration: float) -> bool:
    expected = len(sentence) / CHARS_PER_SECOND
    return expected * 0.55 <= duration <= expected * 1.6 + 0.8


def to_rate(wav: np.ndarray, rate: int) -> np.ndarray:
    if rate == SAMPLE_RATE:
        return wav
    positions = np.linspace(0, len(wav) - 1, int(len(wav) * SAMPLE_RATE / rate))
    return np.interp(positions, np.arange(len(wav)), wav).astype(np.float32)


def synthesize(sentence: str) -> np.ndarray:
    expected = len(sentence) / CHARS_PER_SECOND
    best: np.ndarray | None = None
    for _ in range(MAX_TAKES):
        wavs, rate = model.generate_voice_clone(
            text=sentence, language="Spanish", ref_audio=reference, x_vector_only_mode=True
        )
        take = to_rate(np.asarray(wavs[0], dtype=np.float32), rate)
        take = clean(take, SAMPLE_RATE)
        duration = len(take) / SAMPLE_RATE
        if best is None or abs(duration - expected) < abs(len(best) / SAMPLE_RATE - expected):
            best = take
        if plausible(sentence, duration):
            break
    assert best is not None
    if not plausible(sentence, len(best) / SAMPLE_RATE):
        print(f"  ! sin toma plausible ({len(best) / SAMPLE_RATE:.1f}s): {sentence}", flush=True)
    return best


for slug in slugs:
    narration = modules[slug]["narration"].strip()
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", narration) if part.strip()]
    parts, boundaries, cursor = [], [], 0.0
    for index, sentence in enumerate(sentences):
        wav = synthesize(sentence)
        duration = len(wav) / SAMPLE_RATE
        boundaries.append({"offset": cursor, "duration": duration, "text": sentence})
        parts.append(wav)
        cursor += duration
        if index < len(sentences) - 1:
            parts.append(np.zeros(round(PAUSE * SAMPLE_RATE), dtype=np.float32))
            cursor += PAUSE
    sf.write(root / f"{slug}.wav", np.concatenate(parts), SAMPLE_RATE, subtype="PCM_16")
    (root / f"{slug}-boundaries.json").write_text(json.dumps(boundaries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Qwen3 · {len(sentences)} frases · {cursor:.1f} s · {slug}", flush=True)
