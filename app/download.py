import os
import subprocess
import uuid
import datetime
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")

YTDLP_PATH = "/var/www/updown-template.com/venv/bin/yt-dlp"
WHISPER_PATH = "/var/www/updown-template.com/venv/bin/whisper"

def download_video_and_subs(url):
    now = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    short_uuid = str(uuid.uuid4())[:8]
    project_id = f"{now}_{short_uuid}"

    project_path = os.path.join(PROJECTS_DIR, project_id)
    base_path = os.path.join(project_path, "base")
    os.makedirs(base_path, exist_ok=True)

    output_template = os.path.join(base_path, "video.%(ext)s")

    command = [
        YTDLP_PATH,
        "--ffmpeg-location", "/usr/bin/ffmpeg",
        "-f", "best[ext=mp4][height<=720]/best[ext=mp4]",
        "--write-thumbnail",
        "--convert-thumbnails", "jpg",
        "-o", output_template,
        url
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Download Error: {result.stderr}")

    mp4_files = [f for f in os.listdir(base_path) if f.endswith(".mp4")]
    if not mp4_files:
        raise FileNotFoundError("MP4 not found after download")

    latest_video = os.path.join(base_path, mp4_files[0])
    base_name = os.path.splitext(os.path.basename(latest_video))[0]

    audio_path = os.path.join(base_path, base_name + ".wav")
    ffmpeg_command = [
        "/usr/bin/ffmpeg",
        "-y",
        "-i", latest_video,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        audio_path
    ]
    ffmpeg_result = subprocess.run(ffmpeg_command, capture_output=True, text=True)
    if ffmpeg_result.returncode != 0:
        raise RuntimeError(f"Audio Extraction Error: {ffmpeg_result.stderr}")

    whisper_command = [
        WHISPER_PATH,
        latest_video,
        "--language", "Japanese",
        "--model", "base",
        "--output_dir", base_path,
        "--output_format", "vtt"
    ]
    whisper_result = subprocess.run(whisper_command, capture_output=True, text=True)
    if whisper_result.returncode != 0:
        raise RuntimeError(f"Whisper Error: {whisper_result.stderr}")

    metadata = {
        "project_id": project_id,
        "original_title": os.path.basename(latest_video),
        "created_at": str(datetime.datetime.now())
    }
    with open(os.path.join(project_path, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    return project_id
