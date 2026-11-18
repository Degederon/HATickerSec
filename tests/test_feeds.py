"""Checks for the feed reader, alert matching and bar layout. Run with: python3 tests/test_feeds.py

feeds.py, alerts.py and layout.py have no Home Assistant imports, so this runs without Home Assistant installed.
"""

import importlib.util
import sys
import time
import types
from pathlib import Path

PKG = Path(__file__).resolve().parents[1] / "custom_components" / "hatickersec"
sys.modules.setdefault("aiohttp", types.ModuleType("aiohttp"))   # only used for fetching, not needed here
pkg = types.ModuleType("hatickersec")
pkg.__path__ = [str(PKG)]
sys.modules["hatickersec"] = pkg


def load(name):
    spec = importlib.util.spec_from_file_location(f"hatickersec.{name}", PKG / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


feeds, alerts, presets, layout = load("feeds"), load("alerts"), load("presets"), load("layout")
failures = 0


def check(cond, what):
    global failures
    print(("ok    " if cond else "FAIL  ") + what)
    failures += 0 if cond else 1


# ── Feed reader ──────────────────────────────────────────────────
RSS = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE rss [<!ENTITY nbsp "&#160;">]>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel><title>Messy &amp; Co</title><language>en-us</language>
<item><title><![CDATA[BREAKING: Fire at plant &mdash; <b>evacuations</b> ordered]]></title><link>https://ex.com/a?x=1&amp;y=2</link><pubDate>Tue, 18 Nov 2025 13:00:00 GMT</pubDate></item>
<item><title>Steelers win&nbsp;again &amp;amp; again</title><guid>https://ex.com/b</guid><dc:date>2025-11-18T12:30:00Z</dc:date></item>
<item><title>AT&T outage hits millions</title><link>https://ex.com/c</link><pubDate>Tue, 18 Nov 3524 13:00:00 GMT</pubDate></item>
<item><title>Live updates: hurricane nears coast</title><atom:link href="https://ex.com/d" rel="alternate"/></item>
</channel></rss>"""
f = feeds.parse_feed(RSS)
t = [i["title"] for i in f["items"]]
check(f["title"] == "Messy & Co" and f["language"] == "en", "RSS title and language")
check(t[0] == "BREAKING: Fire at plant — evacuations ordered", "CDATA, HTML and &mdash; cleaned")
check(t[1] == "Steelers win again & again", "&nbsp; and double-escaped &amp;amp;")
check(t[2] == "AT&T outage hits millions", "a bare & doesn't break the feed")
check(f["items"][0]["link"] == "https://ex.com/a?x=1&y=2", "links unescaped")
check(f["items"][2]["date"] is None, "impossible dates ignored")
check(f["items"][3]["link"] == "https://ex.com/d", "atom:link inside RSS")

ATOM = """<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="de-DE"><title>Atom</title>
<entry><title>Erdbeben</title><link rel="self" href="https://ex.de/self"/><link rel="alternate" href="https://ex.de/1"/><updated>2025-11-18T10:00:00+01:00</updated></entry></feed>"""
a = feeds.parse_feed(ATOM)
check(a["language"] == "de" and a["items"][0]["link"] == "https://ex.de/1", "Atom: language and the alternate link")
check(a["items"][0]["date"] == 1763456400000, "Atom: date with time zone")

RDF = """<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel rdf:about="https://dw.com"><title>DW</title></channel>
<item rdf:about="https://dw.com/x1"><title>JUST IN Something happened</title></item></rdf:RDF>"""
r = feeds.parse_feed(RDF)
check(r["items"][0]["link"] == "https://dw.com/x1", "RSS 1.0 (RDF) uses rdf:about")

KEV = '{"title":"KEV","vulnerabilities":[{"cveID":"CVE-2026-1111","vulnerabilityName":"Acme RCE","dateAdded":"2026-01-02"}]}'
check(feeds.is_kev_json(KEV) and feeds.parse_kev(KEV)["items"][0]["title"] == "CVE-2026-1111: Acme RCE — actively exploited", "CISA KEV JSON")

# ── Alerts ───────────────────────────────────────────────────────
cfg = {"keywords": ["Steelers", "Oak Creek", "hurrican*"], "breaking": True, "breakingFront": True,
       "breakingWords": ["BREAKING", "LIVE", "URGENT", "JUST IN"]}
out = alerts.classify([{"title": x} for x in [
    "Liverpool beats Chelsea", "live music returns", "Steelers sign quarterback", "Oak Creekside opens",
    "Hurricanes approach Florida", "Live: match report", "[URGENT]: recall issued", "BREAKING Senate votes"]], cfg)
mark = {i["title"]: i["alert"] for i in out}
check(mark["Liverpool beats Chelsea"] is None and mark["live music returns"] is None, "'Liverpool' and 'live music' aren't breaking")
check(mark["Steelers sign quarterback"]["keywords"] == ["Steelers"], "keyword match")
check(mark["Oak Creekside opens"] is None, "whole words only")
check(mark["Hurricanes approach Florida"]["keywords"] == ["hurrican*"], "word* matches variations")
check(all(mark[x]["breaking"] for x in ["Live: match report", "[URGENT]: recall issued", "BREAKING Senate votes"]), "breaking: separator, brackets, capitals")
check(out[0]["alert"] and out[0]["alert"]["breaking"], "breaking headlines move to the front")

inc = alerts.keyword_matchers(next(p["filter"] for p in presets.PRESETS if p["id"] == "abc7ny"))
check(any(rx.search("Warehouse fire forces evacuation") for _w, rx in inc), "local-station incident filter passes a fire")
check(not any(rx.search("FireFox update released") for _w, rx in inc), "...but not 'FireFox'")

from datetime import datetime
q = {"quietHours": True, "quietFrom": "22:00", "quietTo": "07:00"}
check(alerts.in_quiet_hours(q, datetime(2026, 1, 1, 23, 30)) and not alerts.in_quiet_hours(q, datetime(2026, 1, 1, 12, 0)), "quiet hours across midnight")

# ── Layout ───────────────────────────────────────────────────────
by_id = {p["id"]: p for p in presets.PRESETS}
agencies = [by_id[i] for i in ["bbc", "krebs", "thn", "cb-zeroday", "cb-ransom"]]
now = int(time.time() * 1000)
bars = [{"id": a["id"], "name": a["name"], "color": a["color"], "loaded": True, "error": None,
         "items": [{"title": f"{a['name']} {n}", "date": now - n * 60000} for n in range(2)] + [{"title": "Same story!", "date": now}]}
        for a in agencies]
v = layout.to_view({"bars": bars, "fetchedAt": now}, agencies, {})
kinds = [(r["kind"], r.get("cat")) for r in v["rows"]]
check(kinds[0] == ("bar", None) and kinds[1] == ("header", "Cybersecurity"), "a plain bar, then a category title strip")
merged = next(r for r in v["rows"] if r.get("merged"))
check(merged["bar"]["fixed"] and merged["cat"] == "Cyber Breaking News", "Cyber Breaking News is always one ticker")
check([i["title"] for i in merged["bar"]["items"]].count("Same story!") == 1, "the same story shows once in a consolidated ticker")
v2 = layout.to_view({"bars": bars, "fetchedAt": now}, agencies, {"Cybersecurity": True})
check(any(r.get("merged") and r["cat"] == "Cybersecurity" for r in v2["rows"]), "a collapsed category becomes one bar")

check(len(presets.PRESETS) == 147 and len({p["id"] for p in presets.PRESETS}) == 147, "147 sources, unique ids")

print(f"\n{failures} failure(s)")
sys.exit(1 if failures else 0)
