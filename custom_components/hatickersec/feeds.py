"""Fetches RSS 2.0, RSS 1.0 (RDF) and Atom feeds (plus the CISA KEV JSON).

Each feed becomes a plain list of headlines: {"title", "link", "date" (ms or None)}.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import html
from html.entities import name2codepoint
import json
import re
import time
import xml.etree.ElementTree as ET

import aiohttp

# Look like a normal browser: some news sites (Fox, CNN...) block unusual clients.
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
HEADERS = [
    {"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5", "Accept-Language": "en-US,en;q=0.9"},
    # Second try: exactly what a browser sends when opening a page.
    {"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9", "Cache-Control": "no-cache"},
]
RETRY_STATUSES = {401, 403, 406, 429, 503}
MAX_BYTES = 20 * 1024 * 1024
XML_NS = "{http://www.w3.org/XML/1998/namespace}"


class FeedError(Exception):
    """A feed could not be loaded or read."""


# ── XML helpers ─────────────────────────────────────────────────────
def _local(tag) -> str:
    return tag.rsplit("}", 1)[-1] if isinstance(tag, str) else ""


def _kids(el, name: str) -> list:
    return [c for c in el if _local(c.tag) == name]


def _kid(el, name: str):
    for c in el:
        if _local(c.tag) == name:
            return c
    return None


def _text(el) -> str:
    return "".join(el.itertext()) if el is not None else ""


_TAG = re.compile(r"<[^>]+>")
_ESCAPED_TAG = re.compile(r"</?[a-z][^>]*>", re.IGNORECASE)
_SPACE = re.compile(r"\s+")


def clean_title(s: str) -> str:
    s = _TAG.sub("", str(s).replace("<![CDATA[", "").replace("]]>", ""))  # stray HTML
    s = html.unescape(html.unescape(s))  # twice for feeds that double-escape (&amp;amp;)
    s = _ESCAPED_TAG.sub("", s)  # HTML that was escaped in the feed
    return _SPACE.sub(" ", s).strip()


def _clean_link(s: str) -> str:
    return html.unescape(str(s or "")).strip()


def _atom_link(el) -> str:
    links = _kids(el, "link")
    if not links:
        return ""
    alt = next((l for l in links if l.get("href") and l.get("rel") in (None, "alternate")), None)
    pick = alt if alt is not None else links[0]   # (an Element with no children is falsy)
    return pick.get("href") or _text(pick)


def _parse_date(*candidates) -> int | None:
    """Milliseconds since 1970, or None. Ignores impossible dates (some feeds publish years like 3524)."""
    now = time.time()
    for c in candidates:
        s = (_text(c) if c is not None and not isinstance(c, str) else (c or "")).strip()
        if not s:
            continue
        dt = None
        try:
            dt = parsedate_to_datetime(s)
        except (TypeError, ValueError, IndexError):
            try:
                dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            except ValueError:
                dt = None
        if dt is None:
            continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        t = dt.timestamp()
        if 788918400 < t < now + 2 * 86400:  # after 1995-01-01, not more than 2 days ahead
            return int(t * 1000)
    return None


# Feeds often use HTML entities (&nbsp; &mdash; ...) that XML parsers reject,
# and stray "&" characters. Turn them into something any XML parser accepts.
_XML_ENTITIES = {"amp", "lt", "gt", "quot", "apos"}
_NAMED = re.compile(r"&([A-Za-z][A-Za-z0-9]*);")
_BARE_AMP = re.compile(r"&(?!#\d+;|#x[0-9A-Fa-f]+;|[A-Za-z][A-Za-z0-9]*;)")
_DOCTYPE = re.compile(r"<!DOCTYPE[^>\[]*(\[[^\]]*\])?\s*>", re.IGNORECASE)
_XMLDECL = re.compile(r"^\s*<\?xml[^>]*\?>")


def _fix_entity(m: re.Match) -> str:
    name = m.group(1)
    if name in _XML_ENTITIES:
        return m.group(0)
    code = name2codepoint.get(name) or name2codepoint.get(name.lower())
    return f"&#{code};" if code else f"&amp;{name};"


def _prepare(xml: str) -> str:
    xml = xml.lstrip("﻿")
    xml = _XMLDECL.sub("", xml, count=1)
    xml = _DOCTYPE.sub("", xml)  # no DTDs: nothing can declare entities
    xml = _BARE_AMP.sub("&amp;", xml)
    return _NAMED.sub(_fix_entity, xml)


def parse_feed(xml: str) -> dict:
    """Parse a feed XML string. Returns {"title", "language", "items": [...]}."""
    try:
        root = ET.fromstring(_prepare(xml))
    except ET.ParseError as err:
        raise FeedError(f"the feed is not valid XML ({err})") from None
    kind = _local(root.tag)

    if kind == "rss":  # RSS 2.0
        ch = _kid(root, "channel")
        if ch is None:
            raise FeedError("Not an RSS or Atom feed")
        return {
            "title": clean_title(_text(_kid(ch, "title"))),
            "language": (_text(_kid(ch, "language"))[:2].lower() or None),
            "items": [
                {
                    "title": clean_title(_text(_kid(it, "title"))),
                    "link": _clean_link(_text(_kid(it, "link")).strip() or _atom_link(it) or _text(_kid(it, "guid"))),
                    "date": _parse_date(_kid(it, "pubDate"), _kid(it, "date"), _kid(it, "updated"), _kid(it, "published")),
                }
                for it in _kids(ch, "item")
            ],
        }

    if kind == "RDF":  # RSS 1.0
        ch = _kid(root, "channel")
        return {
            "title": clean_title(_text(_kid(ch, "title"))) if ch is not None else "",
            "language": (_text(_kid(ch, "language"))[:2].lower() or None) if ch is not None else None,
            "items": [
                {
                    "title": clean_title(_text(_kid(it, "title"))),
                    "link": _clean_link(_text(_kid(it, "link")).strip() or next((v for k, v in it.attrib.items() if _local(k) == "about"), "")),
                    "date": _parse_date(_kid(it, "date"), _kid(it, "pubDate")),
                }
                for it in _kids(root, "item")
            ],
        }

    if kind == "feed":  # Atom
        return {
            "title": clean_title(_text(_kid(root, "title"))),
            "language": ((root.get(XML_NS + "lang") or "")[:2].lower() or None),
            "items": [
                {
                    "title": clean_title(_text(_kid(e, "title"))),
                    "link": _clean_link(_atom_link(e)),
                    "date": _parse_date(_kid(e, "updated"), _kid(e, "published")),
                }
                for e in _kids(root, "entry")
            ],
        }

    raise FeedError("Not an RSS or Atom feed")


# ── CISA Known Exploited Vulnerabilities catalog (JSON, not RSS) ────
def is_kev_json(text: str) -> bool:
    return text.lstrip().startswith("{") and re.search(r'"vulnerabilities"\s*:', text[:5000]) is not None


def parse_kev(text: str) -> dict:
    doc = json.loads(text)
    items = []
    for v in doc.get("vulnerabilities") or []:
        name = v.get("vulnerabilityName") or f"{v.get('vendorProject', '')} {v.get('product', '')}"
        items.append({
            "title": f"{v.get('cveID')}: {name} — actively exploited",
            "link": f"https://nvd.nist.gov/vuln/detail/{v.get('cveID')}",
            "date": _parse_date(f"{v['dateAdded']}T12:00:00+00:00") if v.get("dateAdded") else None,
        })
    return {"title": doc.get("title") or "CISA KEV", "language": "en", "items": items}


_FEED_START = re.compile(r"<(rss|feed|rdf:RDF|RDF)[\s>]", re.IGNORECASE)


def looks_like_feed(text: str) -> bool:
    return bool(_FEED_START.search(text[:5000])) or is_kev_json(text)


def _decode(raw: bytes, charset: str | None) -> str:
    m = re.match(rb'^\s*<\?xml[^>]*encoding=["\']([A-Za-z0-9._-]+)["\']', raw[:200])
    for enc in ([m.group(1).decode()] if m else []) + ([charset] if charset else []) + ["utf-8"]:
        try:
            return raw.decode(enc)
        except (LookupError, UnicodeDecodeError):
            continue
    return raw.decode("utf-8", errors="replace")


async def _direct_fetch(session: aiohttp.ClientSession, url: str, timeout: float) -> str:
    status, web_page = 0, False
    for headers in HEADERS:
        try:
            async with session.get(url, headers=headers, allow_redirects=True,
                                   timeout=aiohttp.ClientTimeout(total=timeout)) as res:
                status = res.status
                if res.status == 200:
                    raw = await res.content.read(MAX_BYTES)
                    text = _decode(raw, res.charset)
                    if looks_like_feed(text):
                        return text
                    web_page = True  # try the next header set
                    continue
        except asyncio.TimeoutError:
            raise FeedError("the site took too long to answer") from None
        except aiohttp.ClientError as err:
            raise FeedError(f"couldn't connect ({err.__class__.__name__})") from None
        if status not in RETRY_STATUSES:
            break
    if web_page:
        raise FeedError("site sent a web page instead of a feed")
    raise FeedError(f"HTTP {status}" + (" (site blocked the request)" if status == 403 else ""))


async def fetch_feed(session: aiohttp.ClientSession, url: str, timeout: float = 15) -> dict:
    text = await _direct_fetch(session, url, timeout)
    try:
        feed = parse_kev(text) if is_kev_json(text) else parse_feed(text)
    except (ValueError, KeyError) as err:
        raise FeedError(f"couldn't read the feed ({err})") from None
    # Drop blanks and duplicates, keep newest first when dates exist.
    seen: set[str] = set()
    items = []
    for i in feed["items"]:
        if not i["title"] or i["title"] in seen:
            continue
        seen.add(i["title"])
        items.append(i)
    if any(i["date"] for i in items):
        items.sort(key=lambda i: i["date"] or 0, reverse=True)
    feed["items"] = items
    return feed
