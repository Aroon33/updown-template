from flask import Flask, render_template, request, redirect, url_for, send_from_directory
import os
import subprocess
import shutil
import json
import uuid
import datetime

import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(BASE_DIR, "downloads")
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")

PRESET_DIR = os.path.join(BASE_DIR, "presets")


CONFIG_DIR = os.path.join(BASE_DIR, "config")
RULES_PATH = os.path.join(CONFIG_DIR, "subtitle_rules.json")

with open(RULES_PATH, "r", encoding="utf-8") as f:
    SUBTITLE_RULES = json.load(f)
DEFAULT_STYLE_PATH = os.path.join(CONFIG_DIR, "default_style.json")

# 🔥 フルパス指定（systemd対策）
WHISPER_PATH = "/var/www/updown-template.com/venv/bin/whisper"
YTDLP_PATH = "/var/www/updown-template.com/venv/bin/yt-dlp"

app = Flask(__name__)

os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(PROJECTS_DIR, exist_ok=True)

# =========================
# VTT → ASS 変換関数（完全修正版）
# =========================

def format_time_for_ass(vtt_time):

    vtt_time = vtt_time.replace(",", ".").strip()

    parts = vtt_time.split(":")

    # HH:MM:SS.mmm
    if len(parts) == 3:
        h, m, s = parts

    # MM:SS.mmm
    elif len(parts) == 2:
        h = "0"
        m, s = parts

    else:
        return "0:00:00.00"

    if "." in s:
        s, ms = s.split(".")
    else:
        ms = "0"

    cs = int(ms[:2].ljust(2, "0"))  # ミリ秒→センチ秒

    return f"{int(h)}:{m}:{s}.{cs:02d}"


def auto_wrap(text, max_chars):
    lines = []
    while len(text) > max_chars:
        lines.append(text[:max_chars])
        text = text[max_chars:]
    lines.append(text)
    return "\\N".join(lines)


def vtt_to_ass(
    vtt_path,
    ass_path,
    output_width,
    output_height,
    rules,
    fontsize="42",
    fontcolor="&H00FFFFFF",
    outlinecolor="&H00000000",
    outline="3",
    shadow="1",
    alignment="2",
    fontname="Arial",
    bold="0",
    spacing="0",
    marginv="30",
    backcolor="&H00000000",
    borderstyle="1"
):

    with open(vtt_path, "r", encoding="utf-8") as f:
        content = f.read()

    import re
    blocks = re.split(r'\n\s*\n', content)

    with open(ass_path, "w", encoding="utf-8") as ass:
        safe_margin = int(output_width * rules["safe_margin_ratio"])
        ass.write(f"""[Script Info]
ScriptType: v4.00+
PlayResX: {output_width}
PlayResY: {output_height}
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,{fontname},{fontsize},{fontcolor},&H00000000,{outlinecolor},{backcolor},{bold},0,0,0,100,100,{spacing},0,{borderstyle},{outline},{shadow},{alignment},{safe_margin},{safe_margin},{marginv},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""")

        for block in blocks:
            lines = block.strip().split("\n")

            if len(lines) < 2:
                continue

            if "-->" not in block:
                continue

            if "-->" in lines[0]:
                time_line = lines[0]
                text_lines = lines[1:]
            else:
                time_line = lines[1]
                text_lines = lines[2:]

            parts = time_line.split("-->")
            if len(parts) != 2:
                continue

            start = format_time_for_ass(parts[0].strip())
            end = format_time_for_ass(parts[1].strip())

            text = "\n".join(text_lines).strip()

            max_chars = rules["max_chars_per_line"]

            if SUBTITLE_RULES["wrap_rules"]["respect_user_linebreak"] and "\n" in text:
                text = text.replace("\n", "\\N")
            else:
                text = auto_wrap(text, max_chars)

            ass.write(
                f"Dialogue: 0,{start},{end},Default,,0,0,{marginv},,{text}\n"
            )

def generate_ass_from_ratio(project_id, output_width, output_height):

    base_path = os.path.join(PROJECTS_DIR, project_id, "base")
    style_path = os.path.join(PROJECTS_DIR, project_id, "style.json")
    vtt_path = os.path.join(base_path, "video.vtt")
    ass_path = os.path.join(base_path, "video.ass")

    if not os.path.exists(style_path):
        print("style.json not found")
        return

    with open(style_path, "r", encoding="utf-8") as f:
        style = json.load(f)

    if output_height > output_width:
        base_height = 1920
    else:
        base_height = 1080

    if output_width == 1080:  # TikTok縦
        rules = SUBTITLE_RULES["vertical"]
    else:
        rules = SUBTITLE_RULES["horizontal"]


    # 🔥 ratio → px変換
    fontsize = int(base_height * style.get("font_ratio", 0.06))
    marginv = int(base_height * style.get("vertical_ratio", 0.08))

    # =========================
    # 🔥 背景処理
    # =========================
    box_enabled = style.get("box_enabled", False)
    box_color = style.get("box_color", "&H00000000")
    box_opacity = style.get("box_opacity", "00")  # 00=不透明

    if box_enabled:
        borderstyle = "3"

        # &H00RRGGBB → &HAABBGGRR 形式に変換
        # 今は &H00BBGGRR 形式前提なのでAA差し替え
        backcolor = "&H" + box_opacity + box_color[2:]
    else:
        borderstyle = "1"
        backcolor = "&H00000000"

    # =========================
    # ASS生成
    # =========================
    vtt_to_ass(
        vtt_path,
        ass_path,
        output_width,
        output_height,
        rules,
        fontsize=str(fontsize),
        fontcolor=style.get("fontcolor", "&H00FFFFFF"),
        outlinecolor=style.get("outlinecolor", "&H00000000"),
        outline=str(style.get("outline", 3)),
        shadow=str(style.get("shadow", 1)),
        alignment=str(style.get("alignment", 2)),
        fontname=style.get("fontname", "Arial"),
        marginv=str(marginv),
        backcolor=backcolor,
        borderstyle=borderstyle
    )

def load_preset(layout, name):
    path = os.path.join(PRESET_DIR, layout, f"{name}.json")

    if not os.path.exists(path):
        return None

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# =========================
# INDEX
# =========================
@app.route("/")
def index():
    projects = []

    for project_id in sorted(os.listdir(PROJECTS_DIR), reverse=True):
        project_path = os.path.join(PROJECTS_DIR, project_id)
        if not os.path.isdir(project_path):
            continue

        metadata_path = os.path.join(project_path, "metadata.json")
        base_path = os.path.join(project_path, "base")

        if not os.path.exists(metadata_path):
            continue

        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        thumb_path = os.path.join(base_path, "video.jpg")

        projects.append({
            "project_id": project_id,
            "title": metadata.get("original_title", "Untitled"),
            "created_at": metadata.get("created_at", ""),
            "thumb_exists": os.path.exists(thumb_path),
        })

    return render_template("index.html", projects=projects)

# =========================
# DOWNLOAD
# =========================
@app.route("/download", methods=["POST"])
def download():
    url = request.form.get("url")

    if not url:
        return redirect(url_for("index"))

    info_command = [YTDLP_PATH, "--dump-json", url]
    info_result = subprocess.run(info_command, capture_output=True, text=True)

    if info_result.returncode != 0:
        return f"Info Fetch Error:<br><pre>{info_result.stderr}</pre>"

    video_info = json.loads(info_result.stdout)
    original_title = video_info.get("title", "Untitled")

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
        return f"Download Error:<br><pre>{result.stderr}</pre>"

    mp4_files = [f for f in os.listdir(base_path) if f.endswith(".mp4")]

    if not mp4_files:
        return "MP4 not found after download"

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
        return f"Audio Extraction Error:<br><pre>{ffmpeg_result.stderr}</pre>"

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
        return f"Whisper Error:<br><pre>{whisper_result.stderr}</pre>"

    vtt_path = latest_video.replace(".mp4", ".vtt")
    ass_path = latest_video.replace(".mp4", ".ass")

    if os.path.exists(vtt_path):
        vtt_to_ass(vtt_path, ass_path)

    metadata = {
        "project_id": project_id,
        "original_title": original_title,
        "created_at": str(datetime.datetime.now())
    }

    with open(os.path.join(project_path, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    return redirect(url_for("index"))

# =========================
# projects
# =========================
@app.route("/projects/<project_id>/base/<filename>")
def serve_project_file(project_id, filename):
    base_path = os.path.join(PROJECTS_DIR, project_id, "base")
    return send_from_directory(base_path, filename)

# =========================
# EDIT
# =========================
@app.route("/edit/<project_id>")
def edit_text(project_id):
    filetype = request.args.get("type", "vtt")
    if filetype not in ["ass", "vtt"]:
        return "Invalid file type"

    base_path = os.path.join(PROJECTS_DIR, project_id, "base")
    text_path = os.path.join(base_path, f"video.{filetype}")

    if not os.path.exists(text_path):
        return f"{filetype.upper()} file not found"

    with open(text_path, "r", encoding="utf-8") as f:
        content = f.read()

    return render_template(
        "edit.html",
        project_id=project_id,
        content=content,
        filetype=filetype
    )

# =========================
# save
# =========================
@app.route("/save/<project_id>", methods=["POST"])
def save_text(project_id):

    filetype = request.form.get("filetype", "vtt")

    if filetype not in ["ass", "vtt"]:
        return "Invalid file type", 400

    base_path = os.path.join(PROJECTS_DIR, project_id, "base")
    text_path = os.path.join(base_path, f"video.{filetype}")

    new_content = request.form.get("content")

    with open(text_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    return "ok"   # 🔥 redirectをやめる

# =========================
# PLAY
# =========================
@app.route("/play/<project_id>")
def play_video(project_id):

    project_path = os.path.join(PROJECTS_DIR, project_id)
    base_path = os.path.join(project_path, "base")

    # -------------------------
    # ① default style 読み込み
    # -------------------------
    default_style = {
        "font_ratio": 0.06,
        "vertical_ratio": 0.08,
        "alignment": 2,
        "fontname": "Noto Sans JP",
        "fontcolor": "&H00FFFFFF",
        "outline": 3,
        "outlinecolor": "&H00000000",
        "shadow": 1,
        "box_enabled": False,
        "box_color": "&H00000000",
        "box_opacity": "00"
    }

    if os.path.exists(DEFAULT_STYLE_PATH):
        with open(DEFAULT_STYLE_PATH, "r", encoding="utf-8") as f:
            default_style.update(json.load(f))

    # -------------------------
    # ② project style 上書き
    # -------------------------
    style_path = os.path.join(project_path, "style.json")

    if os.path.exists(style_path):
        with open(style_path, "r", encoding="utf-8") as f:
            saved_style = json.load(f)
            default_style.update(saved_style)

    # -------------------------
    # ③ VTT 読み込み
    # -------------------------
    vtt_content = ""
    vtt_path = os.path.join(base_path, "video.vtt")

    if os.path.exists(vtt_path):
        with open(vtt_path, "r", encoding="utf-8") as f:
            vtt_content = f.read()

    # -------------------------
    # ④ テンプレートへ渡す
    # -------------------------
    return render_template(
        "play.html",
        project_id=project_id,
        style=default_style,
        vtt_content=vtt_content
    )


# =========================
# SAVE STYLE
# =========================
@app.route("/save_style/<project_id>", methods=["POST"])
def save_style(project_id):

    if not request.is_json:
        return "Invalid JSON", 400

    data = request.get_json()

    project_path = os.path.join(PROJECTS_DIR, project_id)

    if not os.path.exists(project_path):
        return "Project not found", 404

    path = os.path.join(project_path, "style.json")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return "ok"

# =========================
# APPLY PRESET
# =========================
@app.route("/apply_preset/<project_id>", methods=["POST"])
def apply_preset(project_id):

    layout = request.json.get("layout")
    preset = request.json.get("preset")

    data = load_preset(layout, preset)

    if not data:
        return "Preset not found", 404

    project_path = os.path.join(PROJECTS_DIR, project_id)
    style_path = os.path.join(project_path, "style.json")

    with open(style_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return "ok"

# =========================
# TIKTOK/YouTubeエクスポート
# =========================
@app.route("/export/<project_id>", methods=["POST"])
def export_video(project_id):

    export_type = request.form.get("type")

    base_path = os.path.join(PROJECTS_DIR, project_id, "base")
    exports_path = os.path.join(PROJECTS_DIR, project_id, "exports")
    os.makedirs(exports_path, exist_ok=True)

    input_path = os.path.join(base_path, "video.mp4")
    ass_path = os.path.join(base_path, "video.ass")

    if not os.path.exists(input_path):
        return "Input video not found"

    # 🔥 出力解像度決定
    if export_type == "youtube":
        layout = "horizontal"
        output_width = 1280
        output_height = 720
        output_path = os.path.join(exports_path, "youtube.mp4")

    elif export_type == "tiktok":
        layout = "vertical"
        output_width = 1080
        output_height = 1920
        output_path = os.path.join(exports_path, "tiktok.mp4")

    else:
        return "Invalid type"

    # 🔥 ASSを出力解像度基準で生成
    generate_ass_from_ratio(project_id, output_width, output_height)

    vf_filter = f"subtitles='{ass_path}':original_size={output_width}x{output_height}"

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
        return f"FFmpeg Error:<br><pre>{result.stderr}</pre>"

    thumb_src = os.path.join(base_path, "video.jpg")
    thumb_dst = os.path.join(exports_path, "thumb.jpg")

    if os.path.exists(thumb_src):
        shutil.copy2(thumb_src, thumb_dst)

    return redirect(url_for("index"))

# =========================
# EXPORT LIST
# =========================
@app.route("/exports")
def exports_list():
    project_exports = []

    if not os.path.exists(PROJECTS_DIR):
        return render_template("exports.html", project_exports=[])

    for project_id in sorted(os.listdir(PROJECTS_DIR), reverse=True):
        project_path = os.path.join(PROJECTS_DIR, project_id)
        if not os.path.isdir(project_path):
            continue

        export_path = os.path.join(project_path, "exports")
        metadata_path = os.path.join(project_path, "metadata.json")

        if not os.path.exists(export_path):
            continue

        try:
            files = [f for f in os.listdir(export_path) if f.endswith(".mp4")]
        except Exception:
            continue

        if not files:
            continue

        title = "No Title"
        created_at = ""

        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    title = data.get("original_title", "")
                    created_at = data.get("created_at", "")
            except Exception:
                pass

        categorized = {"youtube": [], "tiktok": []}

        for file in files:
            if "youtube" in file:
                categorized["youtube"].append(file)
            elif "tiktok" in file:
                categorized["tiktok"].append(file)

        project_exports.append({
            "project_id": project_id,
            "title": title,
            "created_at": created_at,
            "files": categorized
        })

    return render_template("exports.html", project_exports=project_exports)

# =========================
# EXPORT SAVE
# =========================
@app.route("/projects/<project_id>/exports/<filename>")
def serve_export_file(project_id, filename):
    exports_path = os.path.join(PROJECTS_DIR, project_id, "exports")
    return send_from_directory(exports_path, filename)

# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)