"""Narrate a module with a locally cloned voice (Chatterbox multilingual).

Writes the same files as generate_module_voices.py — `<slug>.wav` (24 kHz mono)
and `<slug>-boundaries.json` (one entry per sentence) — so render-motion.mjs
works unchanged. Nothing leaves the machine: the reference clip and the model
both stay local.

    ILIA_COURSE_DIR=../cursos/curso-docentes \
      <chatterbox-venv>/bin/python clone_voice.py <reference.wav> <slug> [<slug> ...]
"""

import json
import os
import pathlib
import re
import sys

import torch
import torchaudio

from chatterbox.mtl_tts import ChatterboxMultilingualTTS
from clean_narration import clean

SAMPLE_RATE = 24000
PAUSE = 0.3

root = pathlib.Path(os.environ.get("ILIA_COURSE_DIR", ".")).resolve()
reference, *slugs = sys.argv[1:]
modules = {item["slug"]: item for item in json.loads((root / "videos-modulos.json").read_text(encoding="utf-8"))}
device = "mps" if torch.backends.mps.is_available() else "cpu"
model = ChatterboxMultilingualTTS.from_pretrained(device=device)

# Spanish narration runs at roughly 14 characters per second. Chatterbox now
# and then keeps babbling after the sentence or cuts it short; a take far from
# that pace is regenerated, and the closest of a few takes is kept.
CHARS_PER_SECOND = 14
MAX_TAKES = 4


def plausible(sentence: str, duration: float) -> bool:
    expected = len(sentence) / CHARS_PER_SECOND
    return expected * 0.55 <= duration <= expected * 1.6 + 0.8


def synthesize(sentence: str) -> tuple[torch.Tensor, float]:
    expected = len(sentence) / CHARS_PER_SECOND
    best: tuple[torch.Tensor, float] | None = None
    for _ in range(MAX_TAKES):
        wav = model.generate(sentence, language_id="es", audio_prompt_path=reference)
        if model.sr != SAMPLE_RATE:
            wav = torchaudio.functional.resample(wav, model.sr, SAMPLE_RATE)
        wav = wav.mean(dim=0, keepdim=True) if wav.dim() == 2 else wav.unsqueeze(0)
        duration = wav.shape[-1] / SAMPLE_RATE
        if best is None or abs(duration - expected) < abs(best[1] - expected):
            best = (wav, duration)
        if plausible(sentence, duration):
            break
    assert best is not None
    # Trim the noisy tail and fade the edges, so joined sentences never click.
    wav = torch.from_numpy(clean(best[0].squeeze(0).numpy(), SAMPLE_RATE)).unsqueeze(0)
    best = (wav, wav.shape[-1] / SAMPLE_RATE)
    if not plausible(sentence, best[1]):
        print(f"  ! sin toma plausible ({best[1]:.1f}s): {sentence}", flush=True)
    return best

for slug in slugs:
    narration = modules[slug]["narration"].strip()
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", narration) if part.strip()]
    parts, boundaries, cursor = [], [], 0.0
    for index, sentence in enumerate(sentences):
        wav, duration = synthesize(sentence)
        boundaries.append({"offset": cursor, "duration": duration, "text": sentence})
        parts.append(wav)
        cursor += duration
        if index < len(sentences) - 1:
            pause = torch.zeros(1, round(PAUSE * SAMPLE_RATE))
            parts.append(pause)
            cursor += PAUSE
    torchaudio.save(str(root / f"{slug}.wav"), torch.cat(parts, dim=-1), SAMPLE_RATE, encoding="PCM_S", bits_per_sample=16)
    (root / f"{slug}-boundaries.json").write_text(json.dumps(boundaries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Chatterbox · {len(sentences)} frases · {cursor:.1f} s · {slug}", flush=True)
