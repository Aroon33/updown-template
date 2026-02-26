from flask import Flask, render_template, request, redirect, url_for, send_from_directory
import os
import subprocess
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(BASE_DIR, "downloads")

# 🔥 フルパス指定（systemd対策）
WHISPER_PATH = "/var/www/updown-template.com/venv/bin/whisper"
YTDLP_PATH = "/var/www/updown-template.com/venv/bin/yt-dlp"

app = Flask(__name__)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


# =========================
# VTT → ASS 変換関数（スタイル可変対応）
# =========================
def vtt_to_ass(
    vtt_path,
    ass_path,
    fontsize="42",
    fontcolor="&H00FFFFFF",
    outlinecolor="&H00000000",
    outline="3",
    shadow="1",
    alignment="2",
    fontname="Arial",
    bold="0",
    spacing="0",
    marginv="30"
):
    with open(vtt_path, "r", encoding="utf-8") as vtt:
        lines = vtt.readlines()

    with open(ass_path, "w", encoding="utf-8") as ass:
        ass.write(f"""[Script Info]
          ScriptType: v4.00+

          [V4+ Styles]
          Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
          Style: Default,{fontname},{fontsize},{fontcolor},&H00000000,{outlinecolor},&H00000000,{bold},0,0,0,100,100,{spacing},0,1,{outline},{shadow},{alignment},10,10,{marginv},1

          [Events]
          Format: Start, End, Style, Text
            """)

        for i in range(len(lines)):
            if "-->" in lines[i]:
                start, end = lines[i].split("-->")
                start = start.strip().replace(".", ",")
                end = end.strip().replace(".", ",")
                text = lines[i+1].strip()

                ass.write(
          f"Dialogue: {start},{end},Default,,0,0,{marginv},,{text}\n"
)




# =========================
# INDEX
# =========================
@app.route("/")
def index():
    files = []

    for f in sorted(os.listdir(DOWNLOAD_DIR), reverse=True):
        if f.endswith(".mp4"):
            base = f.replace(".mp4", "")

            txt_exists = os.path.exists(
                os.path.join(DOWNLOAD_DIR, base + ".txt")
            )

            vtt_exists = os.path.exists(
                os.path.join(DOWNLOAD_DIR, base + ".vtt")
            )

            thumb = base + ".jpg"

            files.append({
                "video": f,
                "thumb": thumb if os.path.exists(os.path.join(DOWNLOAD_DIR, thumb)) else None,
                "vtt_exists": vtt_exists,
                "ass_exists": os.path.exists(os.path.join(DOWNLOAD_DIR, base + ".ass"))
            })

    return render_template("index.html", files=files)


# =========================
# DOWNLOAD
# =========================
@app.route("/download", methods=["POST"])
def download():
    url = request.form.get("url")

    if not url:
        return redirect(url_for("index"))

    output_template = os.path.join(
        DOWNLOAD_DIR,
        "%(upload_date)s_%(title)s.%(ext)s"
    )

    # yt-dlp 実行
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

    # 最新mp4取得
    mp4_files = sorted(
        [f for f in os.listdir(DOWNLOAD_DIR) if f.endswith(".mp4")],
        key=lambda x: os.path.getmtime(os.path.join(DOWNLOAD_DIR, x)),
        reverse=True
    )

    if not mp4_files:
        return "MP4 not found after download"

    latest_video = os.path.join(DOWNLOAD_DIR, mp4_files[0])

    # =========================
    # 音声抽出（MP4はそのまま）
    # =========================
    base_name = os.path.splitext(os.path.basename(latest_video))[0]
    audio_path = os.path.join(DOWNLOAD_DIR, base_name + ".wav")

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

    print("AUDIO EXTRACT START")

    ffmpeg_result = subprocess.run(
        ffmpeg_command,
        capture_output=True,
        text=True
    )

    print("AUDIO RETURN CODE:", ffmpeg_result.returncode)
    print("AUDIO STDERR:", ffmpeg_result.stderr)

    if ffmpeg_result.returncode != 0:
        return f"Audio Extraction Error:<br><pre>{ffmpeg_result.stderr}</pre>"

    print("AUDIO EXTRACT SUCCESS")

    # =========================
    # Whisper 実行
    # =========================
    whisper_command = [
        WHISPER_PATH,
        latest_video,  # 既存動作そのまま
        "--language", "Japanese",
        "--model", "base",
        "--output_dir", DOWNLOAD_DIR,
        "--output_format", "vtt"
    ]

    print("WHISPER START")

    whisper_result = subprocess.run(
        whisper_command,
        capture_output=True,
        text=True
    )

    print("WHISPER RETURN CODE:", whisper_result.returncode)
    print("WHISPER STDERR:", whisper_result.stderr)

    if whisper_result.returncode != 0:
        return f"Whisper Error:<br><pre>{whisper_result.stderr}</pre>"

    print("WHISPER SUCCESS")

    # =========================
    # VTT → ASS 変換
    # =========================
    vtt_path = latest_video.replace(".mp4", ".vtt")
    ass_path = latest_video.replace(".mp4", ".ass")

    if os.path.exists(vtt_path):
        vtt_to_ass(vtt_path, ass_path)
        print("ASS FILE CREATED")
    else:
        print("VTT NOT FOUND")

    return redirect(url_for("index"))

# =========================
# EDIT
# =========================
@app.route("/edit/<filename>")
def edit_text(filename):
    filetype = request.args.get("type", "txt")

    if filetype not in ["txt", "ass", "vtt"]:
        return "Invalid file type"

    text_filename = filename.replace(".mp4", f".{filetype}")
    text_path = os.path.join(DOWNLOAD_DIR, text_filename)

    if not os.path.exists(text_path):
        return f"{filetype.upper()} file not found"

    with open(text_path, "r", encoding="utf-8") as f:
        content = f.read()

    return render_template(
        "edit.html",
        filename=filename,
        content=content,
        filetype=filetype
    )


@app.route("/save/<filename>", methods=["POST"])
def save_text(filename):
    filetype = request.form.get("filetype", "txt")

    if filetype not in ["txt", "ass"]:
        return "Invalid file type"

    text_filename = filename.replace(".mp4", f".{filetype}")
    text_path = os.path.join(DOWNLOAD_DIR, text_filename)

    new_content = request.form.get("content")

    with open(text_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    return redirect(url_for("index"))


# =========================
# PLAY
# =========================
@app.route("/play/<filename>")
def play_video(filename):
    return render_template("play.html", filename=filename)

# =========================
# TIKTOK/YouTubeエクスポート
# =========================
@app.route("/export/<filename>", methods=["POST"])
def export_video(filename):
    export_type = request.form.get("type")

    # =========================
    # スタイル受け取り
    # =========================
    fontsize = request.form.get("fontsize", "42")
    fontcolor = request.form.get("fontcolor", "&H00FFFFFF")
    outlinecolor = request.form.get("outlinecolor", "&H00000000")
    outline = request.form.get("outline", "3")
    shadow = request.form.get("shadow", "1")
    alignment = request.form.get("alignment", "2")
    fontname = request.form.get("fontname", "Arial")
    bold = request.form.get("bold", "0")
    spacing = request.form.get("spacing", "0")
    marginv = request.form.get("marginv", "30")

    input_path = os.path.join(DOWNLOAD_DIR, filename)
    vtt_path = input_path.replace(".mp4", ".vtt")
    ass_path = input_path.replace(".mp4", ".ass")

    # 最新スタイルでASS再生成
    if os.path.exists(vtt_path):
        vtt_to_ass(
            vtt_path,
            ass_path,
            fontsize,
            fontcolor,
            outlinecolor,
            outline,
            shadow,
            alignment,
            fontname,
            bold,
            spacing,
            marginv
        )


    if not os.path.exists(input_path):
        return "Input video not found"

    if not os.path.exists(ass_path):
        return "ASS file not found"

    base_name = filename.replace(".mp4", "")

    # =========================
    # 出力先設定
    # =========================
    if export_type == "youtube":
        output_dir = os.path.join(BASE_DIR, "exports/youtube")
        os.makedirs(output_dir, exist_ok=True)

        output_path = os.path.join(output_dir, base_name + "_yt.mp4")

        vf_filter = f"subtitles='{ass_path}'"

    elif export_type == "tiktok":
        output_dir = os.path.join(BASE_DIR, "exports/tiktok")
        os.makedirs(output_dir, exist_ok=True)

        output_path = os.path.join(output_dir, base_name + "_tt.mp4")

        vf_filter = (
            f"scale=1080:1920:force_original_aspect_ratio=increase,"
            f"crop=1080:1920,"
            f"subtitles='{ass_path}'"
        )

    else:
       return "Invalid type"

    # 元JPG
    original_jpg = input_path.replace(".mp4", ".jpg")

    # 出力JPG（動画と同じ名前）
    output_jpg = output_path.replace(".mp4", ".jpg")

    # JPGがあればexportsにコピー
    if os.path.exists(original_jpg):
         shutil.copy2(original_jpg, output_jpg)

    # =========================
    # ffmpeg 実行
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
        return f"FFmpeg Error:<br><pre>{result.stderr}</pre>"

    # =========================
    # 書き出し成功 → archiveへ移動
    # =========================
    archive_dir = os.path.join(BASE_DIR, "archive")
    os.makedirs(archive_dir, exist_ok=True)

    related_files = [
        input_path,
        input_path.replace(".mp4", ".ass"),
        input_path.replace(".mp4", ".txt"),
        input_path.replace(".mp4", ".wav"),
    ]

    for file_path in related_files:
        if os.path.exists(file_path):
            try:
                shutil.move(file_path, archive_dir)
            except Exception as e:
                print("Move error:", e)

    return redirect(url_for("index"))

# =========================
# EXPORT LIST
# =========================
@app.route("/exports")
def exports_list():
    youtube_dir = os.path.join(BASE_DIR, "exports/youtube")
    tiktok_dir = os.path.join(BASE_DIR, "exports/tiktok")

    youtube_files = []
    tiktok_files = []

    if os.path.exists(youtube_dir):
        youtube_files = sorted(
            [f for f in os.listdir(youtube_dir) if f.endswith(".mp4")],
            reverse=True
        )

    if os.path.exists(tiktok_dir):
        tiktok_files = sorted(
            [f for f in os.listdir(tiktok_dir) if f.endswith(".mp4")],
            reverse=True
        )

    return render_template(
        "exports.html",
        youtube_files=youtube_files,
        tiktok_files=tiktok_files
    )


# =========================
# EXPORT PLAY
# =========================
@app.route("/exports/play/<platform>/<filename>")
def play_export(platform, filename):
    if platform not in ["youtube", "tiktok"]:
        return "Invalid platform"

    return render_template(
        "play_export.html",
        platform=platform,
        filename=filename
    )

@app.route("/exports/file/<platform>/<filename>")
def serve_export_file(platform, filename):
    if platform not in ["youtube", "tiktok"]:
        return "Invalid platform"

    directory = os.path.join(BASE_DIR, f"exports/{platform}")
    return send_from_directory(directory, filename)



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)