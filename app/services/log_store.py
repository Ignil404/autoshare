import json
import os
import threading
from datetime import datetime
from typing import Optional

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
LOG_FILE = os.path.join(LOG_DIR, "autoshare.jsonl")
_lock = threading.Lock()


def _ensure_dir():
    os.makedirs(LOG_DIR, exist_ok=True)


def write_log(level: str, message: str, extra: Optional[dict] = None):
    _ensure_dir()
    entry = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "level": level,
        "message": message,
    }
    if extra:
        entry["extra"] = extra
    with _lock:
        with open(LOG_FILE, "a") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_logs(
    level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 200,
) -> list[dict]:
    if not os.path.exists(LOG_FILE):
        return []
    results = []
    with open(LOG_FILE, "r") as f:
        for line in reversed(f.readlines()):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if level and entry.get("level") != level:
                continue
            if search:
                msg = entry.get("message", "").lower()
                extra_str = json.dumps(entry.get("extra", {}), ensure_ascii=False).lower()
                if search.lower() not in msg and search.lower() not in extra_str:
                    continue
            results.append(entry)
            if len(results) >= limit:
                break
    return results
