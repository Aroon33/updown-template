import re

FILES = [
    "templates/play.html",
    "static/js/player.js",
    "app.py"
]

OUTPUT_FILE = "play_functions.txt"

py_pattern = re.compile(r'^\s*def\s+([a-zA-Z0-9_]+)\s*\(', re.MULTILINE)
js_pattern = re.compile(r'^\s*function\s+([a-zA-Z0-9_]+)\s*\(', re.MULTILINE)
js_window_pattern = re.compile(r'window\.([a-zA-Z0-9_]+)\s*=\s*function')

results = {}

for path in FILES:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        funcs = []
        funcs += py_pattern.findall(content)
        funcs += js_pattern.findall(content)
        funcs += js_window_pattern.findall(content)

        if funcs:
            results[path] = sorted(set(funcs))

    except FileNotFoundError:
        print(f"{path} が見つかりません")

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    for path, funcs in results.items():
        out.write(f"\n=== {path} ===\n")
        for func in funcs:
            out.write(f"{func}\n")

print("play_functions.txt 作成完了")