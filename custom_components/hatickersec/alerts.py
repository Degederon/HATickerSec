"""Keyword alerts and "breaking" detection.

classify() marks each headline: item["alert"] = {"breaking": bool, "keywords": [...]}
and (optionally) moves breaking headlines to the front of their bar.
"""
from __future__ import annotations

from datetime import datetime
import re

# "Not a letter or digit" in any language (Python's \W is Unicode-aware; _ counts as a separator).
_EDGE_BEFORE = r"(?:^|(?<=[\W_]))"
_EDGE_AFTER = r"(?=$|[\W_])"


def keyword_matchers(keywords) -> list[tuple[str, re.Pattern]]:
    """Whole-word, case-insensitive match for each keyword or phrase.

    "hurrican*" = any word starting with "hurrican".
    """
    out = []
    for k in keywords or []:
        k = str(k).strip()
        if not k:
            continue
        prefix = k.endswith("*")
        body = re.escape(k[:-1] if prefix else k)
        out.append((k, re.compile(_EDGE_BEFORE + body + ("" if prefix else _EDGE_AFTER), re.IGNORECASE)))
    return out


def breaking_matchers(words) -> list[tuple[re.Pattern, re.Pattern]]:
    """A headline is "breaking" when it starts with one of the words and either

    - the word is followed by a separator ("Live: ...", "Breaking — ...", "LIVE UPDATES: ..."), or
    - the word is written in capitals ("BREAKING Senate votes ...").
    """
    out = []
    for w in words or []:
        w = str(w).strip()
        if not w:
            continue
        sep = re.compile(r"^\s*[\[(]?" + re.escape(w) + r"(\s+(UPDATES?|NEWS|ALERT|NOW))?[\])]?\s*[:|–—-]", re.IGNORECASE)
        caps = re.compile(r"^\s*" + re.escape(w.upper()) + r"\b")
        out.append((sep, caps))
    return out


def classify(items: list[dict], cfg: dict | None) -> list[dict]:
    a = cfg or {}
    kws = keyword_matchers(a.get("keywords"))
    brk = breaking_matchers(a.get("breakingWords")) if a.get("breaking") else []

    out = []
    for it in items:
        title = it.get("title") or ""
        original = it.get("original") or ""
        text = f"{title} {original}"
        keywords = [w for w, rx in kws if rx.search(text)]
        breaking = any(
            sep.search(title) or caps.search(title) or (original and (sep.search(original) or caps.search(original)))
            for sep, caps in brk
        )
        alert = {"breaking": bool(breaking), "keywords": keywords} if (keywords or breaking) else None
        out.append({**it, "alert": alert})

    if a.get("breaking") and a.get("breakingFront"):
        # Stable: breaking first, everything else keeps its order.
        first = [i for i in out if i["alert"] and i["alert"]["breaking"]]
        rest = [i for i in out if not (i["alert"] and i["alert"]["breaking"])]
        return first + rest
    return out


def _to_minutes(hhmm) -> int | None:
    m = re.match(r"^(\d{1,2}):(\d{2})$", str(hhmm or ""))
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None


def in_quiet_hours(cfg: dict | None, now: datetime) -> bool:
    if not cfg or not cfg.get("quietHours"):
        return False
    start, end = _to_minutes(cfg.get("quietFrom")), _to_minutes(cfg.get("quietTo"))
    if start is None or end is None or start == end:
        return False
    t = now.hour * 60 + now.minute
    return (start <= t < end) if start < end else (t >= start or t < end)  # may wrap past midnight
