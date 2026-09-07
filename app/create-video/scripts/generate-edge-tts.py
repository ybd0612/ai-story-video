import asyncio
import json
import os
import subprocess
from pathlib import Path

import edge_tts

INPUT = Path(os.environ.get("STORY_FILE", "./story.json")).resolve()
OUTPUT = Path(os.environ.get("STORY_OUTPUT", "./story.with-audio.json")).resolve()
AUDIO_DIR = Path(os.environ.get("STORY_AUDIO_DIR", "./public/audio")).resolve()
VOICE = os.environ.get("EDGE_TTS_VOICE", "zh-CN-YunxiNeural")
RATE = os.environ.get("EDGE_TTS_RATE", "+0%")
PITCH = os.environ.get("EDGE_TTS_PITCH", "+0Hz")
PAUSE_SECONDS = float(os.environ.get("AUDIO_PAUSE_SECONDS", "0.5"))
FFPROBE = os.environ.get("FFPROBE_BIN", "ffprobe")


def get_audio_duration(audio_path: Path) -> float:
    result = subprocess.run(
        [
            FFPROBE,
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(audio_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    duration = float(result.stdout.strip())
    if duration <= 0:
        raise ValueError(f"无法读取有效音频时长：{audio_path}")
    return duration


async def main():
    story = json.loads(INPUT.read_text(encoding="utf-8"))
    scenes = story.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise ValueError("story.scenes 不能为空")

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    updated = []
    for index, scene in enumerate(scenes, start=1):
        filename = f"{index:02d}-{scene['id']}.mp3"
        output_path = AUDIO_DIR / filename
        target_scene = os.environ.get("TARGET_SCENE_ID")
        if target_scene and str(scene.get("id")) != target_scene:
            if not output_path.exists():
                raise ValueError(f"目标镜头补偿时发现缺失音频：{scene['id']}")
            audio_duration = get_audio_duration(output_path)
            updated.append({**scene, "audioDurationInSeconds": round(audio_duration, 3), "audioPath": (Path("media") / "audio" / filename).as_posix()})
            continue
        communicate = edge_tts.Communicate(
            scene["narration"],
            VOICE,
            rate=RATE,
            pitch=PITCH,
        )
        await communicate.save(str(output_path))
        audio_duration = get_audio_duration(output_path)
        scene_duration = max(float(scene.get("durationInSeconds", 0)), audio_duration + PAUSE_SECONDS)
        print(
            f"[{index}/{len(scenes)}] 生成旁白 {output_path}，"
            f"音频 {audio_duration:.3f}s，镜头 {scene_duration:.3f}s"
        )
        updated.append({
            **scene,
            "durationInSeconds": round(scene_duration, 3),
            "audioDurationInSeconds": round(audio_duration, 3),
            "audioPath": (Path("media") / "audio" / filename).as_posix(),
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps({**story, "scenes": updated}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"完成：{OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())
