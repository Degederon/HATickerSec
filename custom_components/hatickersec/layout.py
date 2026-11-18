"""Groups the ticker bars on screen.

- General news (regions and custom feeds): one plain bar each, no title.
- Topic categories (Cybersecurity, Technology, ...): a thin title strip, then
  one bar per source. Collapsed, the category becomes a single bar that mixes
  the headlines of all its sources.
"""
from __future__ import annotations

import re

CATEGORIES: dict[str, dict] = {
    "United States": {"icon": "🇺🇸", "color": "#3b82f6", "label": "U.S. News"},
    "Cybersecurity": {"icon": "🛡️", "color": "#22c55e"},
    "Government Cyber Alerts": {"icon": "🏛️", "color": "#3b82f6"},
    # One ticker watching many sources: starts as a single bar, newest first.
    "Cyber Breaking News": {"icon": "⚡", "color": "#22d3ee", "consolidated": True, "defaultCollapsed": True, "newestFirst": True},
    "Breaking Across the U.S.": {"icon": "🚨", "color": "#ef4444", "consolidated": True, "defaultCollapsed": True, "newestFirst": True},
    "Technology": {"icon": "💻", "color": "#a259ff"},
    "Science & Space": {"icon": "🔭", "color": "#4c6ef5"},
    "Health": {"icon": "🩺", "color": "#ef4444"},
    "Business & Markets": {"icon": "📈", "color": "#27ae60"},
    "Sports": {"icon": "🏈", "color": "#f59e0b"},
    "Weather & Disasters": {"icon": "🌪️", "color": "#38bdf8"},
    "Gaming": {"icon": "🎮", "color": "#ec4899"},
}

HEADER_H = 22


def is_category(region: str | None) -> bool:
    return region in CATEGORIES


def is_consolidated(cat: str) -> bool:
    return bool(CATEGORIES.get(cat, {}).get("consolidated"))


def is_collapsed(cat: str, collapsed: dict | None = None) -> bool:
    """Collapsed if the user said so; otherwise the category's default.

    Consolidated categories are always one ticker: they can't be expanded.
    """
    collapsed = collapsed or {}
    if is_consolidated(cat):
        return True
    if collapsed.get(cat) in (True, False):
        return bool(collapsed[cat])
    return bool(CATEGORIES.get(cat, {}).get("defaultCollapsed"))


def layout_rows(agencies: list[dict], collapsed: dict | None = None) -> list[dict]:
    """Rows in display order. A category appears where its first source is in the list."""
    rows: list[dict] = []
    placed: set[str] = set()
    for a in agencies:
        region = a.get("region")
        if not is_category(region):
            rows.append({"kind": "bar", "id": a["id"]})
            continue
        if region in placed:
            continue
        placed.add(region)
        members = [x["id"] for x in agencies if x.get("region") == region]
        if is_collapsed(region, collapsed):
            rows.append({"kind": "merged", "cat": region, "id": f"cat:{region}", "ids": members})
        else:
            rows.append({"kind": "header", "cat": region, "count": len(members), "collapsed": False})
            rows.extend({"kind": "bar", "id": i, "cat": region} for i in members)
    return rows


def rows_height(rows: list[dict], display: dict) -> int:
    if not rows:
        return display["barHeight"]
    h = sum(HEADER_H if r["kind"] == "header" else display["barHeight"] for r in rows)
    return h + (len(rows) - 1) * display["gap"]


def _with_source(b: dict) -> list[dict]:
    return [{**it, "source": {"name": it.get("publisher") or b["name"], "color": b.get("color")}} for it in b.get("items") or []]


def _interleave(bars: list[dict]) -> list[dict]:
    """Mix headlines from several sources: one from each in turn."""
    lists = [_with_source(b) for b in bars]
    out: list[dict] = []
    i = 0
    while any(i < len(lst) for lst in lists):
        for lst in lists:
            if i < len(lst):
                out.append(lst[i])
        i += 1
    return out


_NORM = re.compile(r"[^a-z0-9 ]")


def _newest(bars: list[dict]) -> list[dict]:
    """All sources' headlines, newest first, the same story only once."""
    allitems = [it for b in bars for it in _with_source(b)]
    allitems.sort(key=lambda it: it.get("date") or 0, reverse=True)
    seen: set[str] = set()
    out = []
    for it in allitems:
        k = _NORM.sub("", it["title"].lower()).strip()
        if k in seen:
            continue
        seen.add(k)
        out.append(it)
    return out


def to_view(payload: dict, agencies: list[dict], collapsed: dict) -> dict:
    """Turn the per-agency payload into what the ticker draws."""
    by_id = {b["id"]: b for b in payload.get("bars") or []}
    rows: list[dict] = []
    for r in layout_rows(agencies, collapsed):
        if r["kind"] == "header":
            meta = CATEGORIES[r["cat"]]
            rows.append({**r, **meta, "title": meta.get("label") or r["cat"]})
            continue
        if r["kind"] == "bar":
            bar = by_id.get(r["id"])
            if bar:
                row = {"kind": "bar", "bar": bar}
                if r.get("cat"):
                    row["cat"] = r["cat"]
                rows.append(row)
            continue
        members = [by_id[i] for i in r["ids"] if i in by_id]
        with_items = [m for m in members if m.get("items")]
        meta = CATEGORIES[r["cat"]]
        label = meta.get("label") or r["cat"]
        n = len(r["ids"])
        items = _newest(with_items) if meta.get("newestFirst") else _interleave(with_items)
        err = None
        if not with_items:
            err = next((m.get("error") for m in members if m.get("error")), None)
        rows.append({
            "kind": "bar", "cat": r["cat"], "merged": True, "fixed": bool(meta.get("consolidated")),
            "bar": {
                "id": r["id"],
                "name": f"{meta['icon']} {label}" if meta.get("consolidated") else f"▸ {meta['icon']} {label} · {n}",
                "fixed": bool(meta.get("consolidated")),
                "title": f"{label} — one ticker, consolidated feed of {n} sources" if meta.get("newestFirst") else f"{label} sources",
                "color": meta["color"], "cat": r["cat"],
                # Keep the combined bar a sensible length: newest 40 across its sources.
                "items": items[:40],
                "loaded": any(m.get("loaded") for m in members),
                "error": err,
            },
        })

    # A forced (preview) bar inside a collapsed category forces the merged bar.
    force = []
    for fid in payload.get("force") or []:
        a = next((x for x in agencies if x["id"] == fid), None)
        if a and is_category(a.get("region")) and is_collapsed(a["region"], collapsed):
            force.append(f"cat:{a['region']}")
        else:
            force.append(fid)
    return {"rows": rows, "fetchedAt": payload.get("fetchedAt"), "force": force}
