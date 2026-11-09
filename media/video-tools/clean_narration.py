"""Clean a sentence-by-sentence narration: no clicks, no noisy tails.

Each sentence was synthesised on its own and butted against silence, so a
sentence that starts or ends mid-waveform clicks, and Chatterbox sometimes
leaves a buzz after the last word. Both sound like a zipper. This trims the
tail after the last spoken window, adds short fades at both edges, rebuilds the
pauses and rewrites `<slug>.wav` and `<slug>-boundaries.json` in place.

    ILIA_COURSE_DIR=../cursos/curso-docentes .venv/bin/python clean_narration.py <slug> [<slug> ...]
"""

import json
import os
import pathlib
import sys

import numpy as np
import soundfile as sf

PAUSE = 0.3
WINDOW = 0.02  # seconds
SPEECH_FLOOR = 0.06  # window RMS relative to the sentence's loudest window
KEEP_AFTER_SPEECH = 0.12
FADE_IN = 0.012
FADE_OUT = 0.04

root = pathlib.Path(os.environ.get("ILIA_COURSE_DIR", ".")).resolve()


def clean(segment: np.ndarray, rate: int) -> np.ndarray:
    hop = int(WINDOW * rate)
    windows = [segment[i : i + hop] for i in range(0, len(segment) - hop, hop)]
    if not windows:
        return segment
    rms = np.array([np.sqrt(np.mean(w**2)) for w in windows])
    spoken = np.nonzero(rms >= rms.max() * SPEECH_FLOOR)[0]
    start = spoken[0] * hop
    end = min(len(segment), (spoken[-1] + 1) * hop + int(KEEP_AFTER_SPEECH * rate))
    out = segment[start:end].copy()
    fade_in, fade_out = int(FADE_IN * rate), int(FADE_OUT * rate)
    out[:fade_in] *= np.linspace(0.0, 1.0, fade_in)
    out[-fade_out:] *= np.linspace(1.0, 0.0, fade_out)
    return out


def main(slugs: list[str]) -> None:
    for slug in slugs:
        audio, rate = sf.read(root / f"{slug}.wav", dtype="float32")
        boundaries = json.loads((root / f"{slug}-boundaries.json").read_text(encoding="utf-8"))
        parts, cleaned, cursor = [], [], 0.0
        for index, line in enumerate(boundaries):
            start = int(line["offset"] * rate)
            end = int((line["offset"] + line["duration"]) * rate)
            segment = clean(audio[start:end], rate)
            cleaned.append({"offset": cursor, "duration": len(segment) / rate, "text": line["text"]})
            parts.append(segment)
            cursor += len(segment) / rate
            if index < len(boundaries) - 1:
                parts.append(np.zeros(int(PAUSE * rate), dtype=np.float32))
                cursor += PAUSE
        sf.write(root / f"{slug}.wav", np.concatenate(parts), rate, subtype="PCM_16")
        (root / f"{slug}-boundaries.json").write_text(
            json.dumps(cleaned, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        before = boundaries[-1]["offset"] + boundaries[-1]["duration"]
        print(f"{slug}: {before:.1f} s -> {cursor:.1f} s", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
