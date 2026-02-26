# LP Auto Manager

最終更新: 2026-02-16

----------------------------------------
■ 概要
----------------------------------------

LPフォームを自動解析し、
CSVデータを元に自動送信を行う
2STEP対応LP自動送信システム。

・フォーム自動スキャン
・hiddenフィールド取得
・2段階LP自動判定
・マッピング設定
・スケジュール実行
・バックグラウンド送信

----------------------------------------
■ ディレクトリ構成
----------------------------------------

/var/www/lp-auto
│
├── app/
│   ├── app.py
│   ├── sender.py
│
├── scanner/
│   └── scan.py
│
├── definitions/
│   └── lp名.json
│
├── schedules/
│   └── lp名.json
│
├── data/
│   └── csvファイル
│
├── templates/
│   ├── index.html
│   ├── scan_result.html
│   ├── mapping.html
│   ├── schedule.html
│
└── venv/

----------------------------------------
■ 機能詳細
----------------------------------------

① LPスキャン機能

・フォーム自動検出
・入力フィールド抽出
・hiddenフィールド取得
・default値取得
・2STEP判定
・finish_url取得

scan.py にて実装


② マッピング機能

抽象キー:
NAME
TEL
EMAIL
ZIP1
ZIP2
PREF
ADDRESS1
ADDRESS2
MESSAGE

→ 実際のフォームname属性へ変換


③ definition JSON構造

{
  "name": "lp03-kanto",
  "action_url": ".../confirmation.php",
  "two_step": true,
  "finish_url": ".../finish.php",
  "mapping": {...},
  "hidden_fields": {...},
  "default_values": {...},
  "created_at": "YYYY-MM-DD HH:MM:SS"
}


④ スケジュール機能

APScheduler 使用

・開始日時指定
・間隔指定（分）
・回数指定
・バックグラウンド実行

保存先:
schedules/lp名.json


⑤ sender機能

・Session維持
・STEP1送信
・ticket取得
・STEP2送信
・2STEP対応
・CSVループ処理


ログ例:

[1/5] Processing...
ticket: xxxxxxxxx
✅ Sent (2 step OK)
===== DONE =====


----------------------------------------
■ 起動方法（開発環境）
----------------------------------------

cd /var/www/lp-auto
source venv/bin/activate
python app/app.py

アクセス:
http://サーバーIP:5000


----------------------------------------
■ 現在の完成状況
----------------------------------------

✔ フォーム自動解析
✔ 2STEP自動判定
✔ hidden対応
✔ definition生成
✔ スケジュール実行
✔ sender正常動作
✔ 2STEP送信成功確認済み

----------------------------------------
■ 今後の強化候補
----------------------------------------

・送信ログJSON保存
・成功率管理画面
・User-Agentランダム化
・リトライ機能
・IPローテーション
・nginx + gunicorn本番化

----------------------------------------
■ 注意事項
----------------------------------------

現在は開発サーバー使用中。
本番運用時は必ず:

gunicorn + nginx + systemd

へ移行すること。

----------------------------------------
■ 備考
----------------------------------------

VPS時間設定:
Asia/Tokyo 推奨

確認コマンド:
timedatectl

----------------------------------------

END