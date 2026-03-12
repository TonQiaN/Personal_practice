import json
import traceback
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any

from app.config import get_settings


class RuntimeLogger:
    def __init__(self) -> None:
        self._lock = Lock()

    def _log_dir(self) -> Path:
        path = get_settings().runtime_log_dir
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _log_path(self) -> Path:
        now = datetime.now()
        return self._log_dir() / f"{now:%Y-%m-%d-%H}.jsonl"

    def _serialize(self, value: Any) -> Any:
        if isinstance(value, Path):
            return str(value)
        if hasattr(value, "model_dump"):
            return value.model_dump()
        if isinstance(value, dict):
            return {key: self._serialize(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self._serialize(item) for item in value]
        return value

    def log(
        self,
        event_type: str,
        request_id: str,
        payload: dict[str, Any],
        *,
        agent_name: str | None = None,
        graph_name: str | None = None,
    ) -> None:
        entry = {
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "event_type": event_type,
            "request_id": request_id,
            "agent_name": agent_name,
            "graph_name": graph_name,
            "payload": self._serialize(payload),
        }
        line = json.dumps(entry, ensure_ascii=False)
        with self._lock:
            self._log_path().open("a", encoding="utf-8").write(f"{line}\n")
        print(f"[{entry['timestamp']}] {event_type} request_id={request_id}")

    def format_exception(self) -> str:
        return traceback.format_exc()


runtime_logger = RuntimeLogger()
