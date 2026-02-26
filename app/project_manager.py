import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")

def list_projects():

    projects = []

    for project_id in sorted(os.listdir(PROJECTS_DIR), reverse=True):

        project_path = os.path.join(PROJECTS_DIR, project_id)

        if not os.path.isdir(project_path):
            continue

        metadata_path = os.path.join(project_path, "metadata.json")

        if not os.path.exists(metadata_path):
            continue

        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        projects.append({
            "project_id": project_id,
            "title": metadata.get("original_title", "Untitled"),
            "created_at": metadata.get("created_at", "")
        })

    return projects
