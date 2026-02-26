import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")

def load_text(project_id, filetype):
    base_path = os.path.join(PROJECTS_DIR, project_id, "base")
    text_path = os.path.join(base_path, f"video.{filetype}")

    if not os.path.exists(text_path):
        raise FileNotFoundError(f"{filetype} file not found")

    with open(text_path, "r", encoding="utf-8") as f:
        return f.read()

def save_text(project_id, filetype, content):
    base_path = os.path.join(PROJECTS_DIR, project_id, "base")
    text_path = os.path.join(base_path, f"video.{filetype}")

    with open(text_path, "w", encoding="utf-8") as f:
        f.write(content)
