import re
from typing import Any


def count_words_cjk(text: str) -> int:
    if not text:
        return 0
    pattern = re.compile(r"[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u20000-\u2fa1f]|[a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?")
    return len(pattern.findall(text))


def walk_content(content: dict[str, Any]) -> tuple[int, int]:
    text = ""
    image_count = 0

    def rec(node: dict[str, Any]):
        nonlocal text, image_count
        if node.get("type") == "text":
            text += node.get("text", "")
        elif node.get("type") == "image":
            image_count += 1
        for child in node.get("content", []):
            if isinstance(child, dict):
                rec(child)

    if "content" in content:
        for node in content["content"]:
            if isinstance(node, dict):
                rec(node)

    return count_words_cjk(text), image_count
