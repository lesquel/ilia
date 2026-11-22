"""Voice for real-recording cápsulas: one clip per cue.

    python real_voice.py <course-dir> <slug>

Reads <course-dir>/real.json, synthesizes every cue of <slug> with the
narration voice and writes <course-dir>/rec/<slug>/cues/NN.wav plus
cues.json with each clip's duration and sentences (for subtitles). A clip is
skipped when its text did not change.
"""

import asyncio
import json
import pathlib
import re
import shutil
import subprocess
import sys

import edge_tts
import soundfile as sf

VOICE = "es-EC-AndreaNeural"
RATE = "-8%"
PITCH = "-1Hz"
SAMPLE_RATE = 24000
FFMPEG = shutil.which("ffmpeg") or sys.exit("ffmpeg not found")

course_dir = pathlib.Path(sys.argv[1]).resolve()
slug = sys.argv[2]
video = next((v for v in json.loads((course_dir / "real.json").read_text(encoding="utf-8")) if v["slug"] == slug), None)
if not video:
    sys.exit(f"Unknown video: {slug}")

out = course_dir / "rec" / slug / "cues"
out.mkdir(parents=True, exist_ok=True)
previous = {}
index_path = out.parent / "cues.json"
if index_path.exists():
    previous = {c["text"]: c for c in json.loads(index_path.read_text(encoding="utf-8"))}


def sentences(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text.strip()) if part.strip()]


async def synthesize() -> None:
    cues = []
    for i, cue in enumerate(video["cues"]):
        wav = out / f"{i:02}.wav"
        old = previous.get(cue["text"])
        if old and old.get("file") == wav.name and wav.exists():
            cues.append({**old, "event": cue["event"]})
            continue
        parts = []
        for j, sentence in enumerate(sentences(cue["text"])):
            mp3 = out / f"tmp-{i:02}-{j:02}.mp3"
            part = out / f"tmp-{i:02}-{j:02}.wav"
            await edge_tts.Communicate(sentence, VOICE, rate=RATE, pitch=PITCH).save(str(mp3))
            subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", str(SAMPLE_RATE), "-c:a", "pcm_s16le", str(part)], check=True)
            audio, _ = sf.read(part, dtype="float32")
            parts.append((sentence, audio))
            mp3.unlink()
            part.unlink()
        import numpy as np

        gap = np.zeros(round(0.3 * SAMPLE_RATE), dtype=np.float32)
        joined, lines, cursor = [], [], 0.0
        for k, (sentence, audio) in enumerate(parts):
            lines.append({"offset": cursor, "duration": len(audio) / SAMPLE_RATE, "text": sentence})
            joined.append(audio)
            cursor += len(audio) / SAMPLE_RATE
            if k < len(parts) - 1:
                joined.append(gap)
                cursor += len(gap) / SAMPLE_RATE
        sf.write(wav, np.concatenate(joined), SAMPLE_RATE, subtype="PCM_16")
        cues.append({"event": cue["event"], "text": cue["text"], "file": wav.name, "duration": cursor, "lines": lines})
        print(f"cue {i:02} · {cursor:.1f} s · {cue['text'][:50]}")
    index_path.write_text(json.dumps(cues, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(cues)} cues · {sum(c['duration'] for c in cues):.1f} s of voice")


asyncio.run(synthesize())
