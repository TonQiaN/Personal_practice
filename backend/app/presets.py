import json

from app.config import get_settings
from app.models import JobDescriptionInput


def load_preset_jds() -> list[JobDescriptionInput]:
    path = get_settings().preset_jd_path
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    return [JobDescriptionInput.model_validate(item) for item in data]
