from typing import Any


def update_stats_snapshot(snapshot: dict[str, Any], words_delta: int = 0, entries_delta: int = 0) -> dict[str, Any]:
    updated = dict(snapshot)
    updated["total_words"] = max(0, updated.get("total_words", 0) + words_delta)
    updated["total_entries"] = max(0, updated.get("total_entries", 0) + entries_delta)
    return updated
