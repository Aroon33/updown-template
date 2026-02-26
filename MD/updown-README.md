=========================================
VIDEO AUTOMATION SYSTEM (PRODUCTION)
=========================================

■ VPS環境
-----------------------------------------
Provider: ConoHa VPS
IP: 163.44.116.192
OS: Ubuntu
Domain: updown-template.com
SSL: Let's Encrypt (Certbot)

Web構成:
Browser
  ↓
Nginx (80/443)
  ↓
Gunicorn (127.0.0.1:8000)
  ↓
Flask App

本番URL:
https://updown-template.com


=========================================
■ ディレクトリ構成
=========================================

/var/www/updown-template.com/
│
├── app/
│   ├── app.py
│   ├── audio_processor.py
│   │
│   ├── downloads/            # 元動画・字幕・音声・生成動画
│   │
│   ├── archive/              # 処理完了ファイル
│   │
│   ├── exports/              # 書き出し動画
│   │   ├── youtube/
│   │   ├── tiktok/
│   │   └── lip_sync/         # 静止画動画生成
│   │
│   ├── wav2lip/              # 口パクAI環境
│   │   ├── inference.py
│   │   ├── checkpoints/
│   │   ├── test.jpg
│   │   └── venv_wav2lip/
│   │
│   ├── templates/
│   │   ├── index.html
│   │   ├── edit.html
│   │   ├── exports.html
│   │   └── play.html
│   │
│   ├── static/
│   └── __pycache__/
│
└── venv/                     # Flask本体仮想環境


=========================================
■ 仮想環境
=========================================

① Flask用仮想環境
-----------------------------------------
source /var/www/updown-template.com/venv/bin/activate

インストール済:
flask
gunicorn
yt-dlp
openai-whisper
torch
ffmpeg
tiktoken
requests
tqdm
regex
sympy
triton
librosa
moviepy
opencv-python
face-recognition


② Wav2Lip用仮想環境
-----------------------------------------
/var/www/updown-template.com/app/wav2lip/venv_wav2lip

有効化:
source venv_wav2lip/bin/activate


=========================================
■ 動画処理フロー
=========================================

① YouTube URL入力
② yt-dlp ダウンロード
③ Whisper 文字起こし
④ VTT生成
⑤ VTT → ASS変換
⑥ ASS編集（フォント・サイズ・位置調整）
⑦ 音声分離（mp4 → wav）
⑧ ボイス変換（male / female / robot）
⑨ 静止画 + 音声 + ASSで動画生成
⑩ exports/lip_syncへ出力
⑪ downloadsへ移動 → ブラウザ確認


=========================================
■ 現在完成している機能
=========================================

✔ YouTubeダウンロード
✔ Whisper文字起こし
✔ VTT生成
✔ ASS字幕編集UI
✔ テロップON/OFFプレビュー
✔ 音声分離
✔ ボイスチェンジ（3パターン）
✔ 静止画動画生成
✔ ブラウザ確認可能
✔ サーバー本番運用中


=========================================
■ 重要パス
=========================================

Python:
/var/www/updown-template.com/venv/bin/python

Whisper:
/var/www/updown-template.com/venv/bin/whisper

yt-dlp:
/var/www/updown-template.com/venv/bin/yt-dlp

ffmpeg:
/usr/bin/ffmpeg


=========================================
■ 今後予定
=========================================

・Wav2Lipチェックポイント導入（PC作業）
・口パク生成
・TikTok縦動画最適化
・一括バッチ生成
・Flask UI統合ボタン実装
・AI人物動画生成統合

2️⃣ Whisperを非同期化（Celery導入）
3️⃣ ショート自動切り抜き
4️⃣ サムネ自動生成
5️⃣ 管理者ログイン機能
6️⃣ 自動YouTube API投稿


=========================================
SYSTEM STATUS
=========================================

Production Running
Static Avatar Generation Complete
Voice Variant System Complete
LipSync Ready (Checkpoint Pending)

=========================================

2026/02/22