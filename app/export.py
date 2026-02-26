import os
import subprocess
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")

def run_export(
    project_id,
    export_type,
    fontsize,
    fontcolor,
    outlinecolor,
    outline,
    shadow,
    fontname,
    bold,
    spacing,
    posx,
    posy,
    box,
    boxcolor,
    vtt_to_ass_function
):

    base_path = os.path.join(PROJECTS_DIR, project_id, "base")
    exports_path = os.path.join(PROJECTS_DIR, project_id, "exports")

    os.makedirs(exports_path, exist_ok=True)

    input_path = os.path.join(base_path, "video.mp4")
    vtt_path = os.path.join(base_path, "video.vtt")
    ass_path = os.path.join(base_path, "video.ass")

    if not os.path.exists(input_path):
        raise FileNotFoundError("Input video not found")

    if not os.path.exists(vtt_path):
        raise FileNotFoundError("VTT file not found")

    # =========================
    # 解像度取得
    # =========================
    probe_cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "json",
        input_path
    ]

    probe_result = subprocess.run(probe_cmd, capture_output=True, text=True)

    if probe_result.returncode != 0:
        raise RuntimeError(f"FFprobe Error: {probe_result.stderr}")

    probe_json = json.loads(probe_result.stdout)

    width = probe_json["streams"][0]["width"]
    height = probe_json["streams"][0]["height"]

    # 比率 → 実座標変換
    if posx and posy:
        posx = int(float(posx) * width)
        posy = int(float(posy) * height)

    # =========================
    # ASS生成
    # =========================
    vtt_to_ass_function(
        vtt_path,
        ass_path,
        width,
        height,
        fontsize,
        fontcolor,
        outlinecolor,
        outline,
        shadow,
        fontname,
        bold,
        spacing,
        posx,
        posy,
        box,
        boxcolor
    )

    # =========================
    # 出力タイプ分岐
    # =========================
    if export_type == "youtube":
        output_path = os.path.join(exports_path, "youtube.mp4")
        vf_filter = f"ass={ass_path}"

    elif export_type == "tiktok":
        output_path = os.path.join(exports_path, "tiktok.mp4")
        vf_filter = (
            "scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,"
            f"ass={ass_path}"
        )
    else:
        raise ValueError("Invalid export type")

    # =========================
    # ffmpeg実行
    # =========================
    command = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-vf", vf_filter,
        "-c:a", "copy",
        output_path
    ]

    result = subprocess.run(command, capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg Error: {result.stderr}")

    return output_path
