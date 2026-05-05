#!/usr/bin/env python3
"""
Survey Video Bot
----------------
Cuts up a screen recording of a survey into per-question screenshots,
then uses Claude vision to read every multiple-choice question and
report the correct answer — fast.

Usage:
    python3 survey_bot.py <video_file> [options]

Options:
    --fps       Frame extraction rate (default: 2.0)
    --threshold Pixel-diff threshold for new-question detection (default: 12.0)
    --model     Claude model to use (default: claude-sonnet-4-6)

Requirements:
    ANTHROPIC_API_KEY env var must be set.
    ffmpeg, anthropic, Pillow must be installed.
"""

import os
import sys
import json
import shutil
import base64
import subprocess
from pathlib import Path

# ── dependency check ──────────────────────────────────────────────────────────

def _require(pkg, install_hint):
    try:
        return __import__(pkg)
    except ImportError:
        print(f"Missing: {pkg}. Install with: {install_hint}")
        sys.exit(1)

_require("anthropic", "pip install anthropic")
_require("PIL", "pip install Pillow")

import anthropic
from PIL import Image, ImageChops

# ── video → frames ────────────────────────────────────────────────────────────

def extract_frames(video_path: str, frames_dir: Path, fps: float) -> list[Path]:
    frames_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vf", f"fps={fps}",
        "-q:v", "2",
        str(frames_dir / "frame_%05d.jpg"),
        "-y", "-loglevel", "error",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"ffmpeg error:\n{r.stderr}")
        sys.exit(1)
    frames = sorted(frames_dir.glob("frame_*.jpg"))
    print(f"  Extracted {len(frames)} frames at {fps} fps")
    return frames


# ── frame diff → question boundaries ─────────────────────────────────────────

def _mean_diff(p1: Path, p2: Path) -> float:
    a = Image.open(p1).convert("L").resize((320, 180))
    b = Image.open(p2).convert("L").resize((320, 180))
    diff = ImageChops.difference(a, b)
    return sum(diff.getdata()) / (320 * 180)


def detect_questions(frames: list[Path], threshold: float) -> list[Path]:
    """Return one representative frame per detected question screen."""
    if not frames:
        return []
    cuts = [frames[0]]
    for i in range(1, len(frames)):
        if _mean_diff(frames[i - 1], frames[i]) >= threshold:
            # Skip one frame so we land after any transition animation
            landing = frames[min(i + 1, len(frames) - 1)]
            cuts.append(landing)
    return cuts


# ── save question screenshots ─────────────────────────────────────────────────

def save_questions(frames: list[Path], questions_dir: Path) -> list[Path]:
    questions_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, f in enumerate(frames, 1):
        dest = questions_dir / f"question_{i:02d}.jpg"
        shutil.copy2(f, dest)
        paths.append(dest)
    return paths


# ── Claude vision analysis ────────────────────────────────────────────────────

PROMPT = """\
This screenshot is from a survey or quiz. Please:
1. Read the question text exactly.
2. List every answer choice (preserve labels like A, B, C, D or 1, 2, 3…).
3. Identify which choice is CORRECT based on your knowledge.

Respond ONLY with valid JSON — no markdown fences — in exactly this shape:
{
  "question": "<full question text>",
  "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct_answer": "A",
  "correct_text": "<full text of the correct choice>",
  "explanation": "<one-sentence reason>"
}

If the screen does not show a question (e.g. intro, completion page, navigation):
{"question": null, "choices": [], "correct_answer": null, "correct_text": null, "explanation": "Not a question screen"}
"""


def analyze(img_path: Path, client: anthropic.Anthropic, model: str) -> dict:
    with open(img_path, "rb") as fh:
        b64 = base64.standard_b64encode(fh.read()).decode()
    msg = client.messages.create(
        model=model,
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}},
                {"type": "text", "text": PROMPT},
            ],
        }],
    )
    raw = msg.content[0].text.strip()
    try:
        start, end = raw.index("{"), raw.rindex("}") + 1
        return json.loads(raw[start:end])
    except (ValueError, json.JSONDecodeError):
        return {"question": raw, "choices": [], "correct_answer": "?", "correct_text": raw, "explanation": ""}


# ── pretty print ──────────────────────────────────────────────────────────────

def print_result(n: int, total: int, r: dict, screenshot: Path):
    sep = "─" * 60
    print(sep)
    print(f"  Question {n}/{total}   [{screenshot.name}]")
    print(sep)
    if not r.get("question"):
        print("  (not a question screen — skipped)")
        return
    print(f"\n  Q: {r['question']}\n")
    for c in r.get("choices", []):
        marker = "▶" if c.startswith(r.get("correct_answer", "")) else " "
        print(f"  {marker} {c}")
    print(f"\n  ✓ CORRECT: {r.get('correct_answer')} — {r.get('correct_text')}")
    if r.get("explanation"):
        print(f"    {r['explanation']}")
    print()


# ── main ──────────────────────────────────────────────────────────────────────

def parse_args():
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        print(__doc__)
        sys.exit(0)
    video = args[0]
    fps = 2.0
    threshold = 12.0
    model = "claude-sonnet-4-6"
    i = 1
    while i < len(args):
        if args[i] == "--fps" and i + 1 < len(args):
            fps = float(args[i + 1]); i += 2
        elif args[i] == "--threshold" and i + 1 < len(args):
            threshold = float(args[i + 1]); i += 2
        elif args[i] == "--model" and i + 1 < len(args):
            model = args[i + 1]; i += 2
        else:
            i += 1
    return video, fps, threshold, model


def main():
    video, fps, threshold, model = parse_args()

    if not os.path.exists(video):
        print(f"Error: '{video}' not found.")
        sys.exit(1)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY is not set.")
        sys.exit(1)

    print(f"\n{'═'*60}")
    print(f"  SURVEY VIDEO BOT")
    print(f"{'═'*60}")
    print(f"  Video    : {video}")
    print(f"  FPS      : {fps}")
    print(f"  Threshold: {threshold}")
    print(f"  Model    : {model}")
    print(f"{'═'*60}\n")

    out = Path("survey_output")
    if out.exists():
        shutil.rmtree(out)

    # Step 1 — extract frames
    print("Step 1/4  Extracting frames…")
    frames = extract_frames(video, out / "frames", fps)

    # Step 2 — detect question screens
    print("Step 2/4  Detecting question boundaries…")
    q_frames = detect_questions(frames, threshold)
    print(f"  Detected {len(q_frames)} distinct screens")

    # Step 3 — save screenshots
    print("Step 3/4  Saving question screenshots…")
    screenshots = save_questions(q_frames, out / "questions")
    print(f"  Saved {len(screenshots)} screenshots → survey_output/questions/")

    print(f"\n{'═'*60}")
    print(f"  CUT {len(screenshots)} QUESTION SCREENSHOT(S)")
    print(f"{'═'*60}\n")

    # Step 4 — Claude analysis
    print("Step 4/4  Analysing with Claude vision…\n")
    client = anthropic.Anthropic(api_key=api_key)
    results = []
    for i, shot in enumerate(screenshots, 1):
        r = analyze(shot, client, model)
        r["screenshot"] = str(shot)
        results.append(r)
        print_result(i, len(screenshots), r, shot)

    # Save JSON results
    results_path = out / "results.json"
    with open(results_path, "w") as fh:
        json.dump(results, fh, indent=2)

    answered = sum(1 for r in results if r.get("correct_answer") not in (None, "?"))
    print(f"{'═'*60}")
    print(f"  DONE — {len(screenshots)} screenshots, {answered} answered")
    print(f"  Results JSON → {results_path}")
    print(f"{'═'*60}\n")


if __name__ == "__main__":
    main()
