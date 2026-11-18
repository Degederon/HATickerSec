"""HATickerSec engine: settings, feed polling, translation, alerts and the live feed to every screen.

Screens
(the dashboard card, the docked tickers and the HATickerSec panel) subscribe over
the websocket and receive:
  {"kind": "config",   "config": {...}}      display settings
  {"kind": "news",     "view": {...}}        the rows to draw
  {"kind": "chime",    ...}                  play an alert sound
  {"kind": "popup",    ...}                  show an alert pop-up
  {"kind": "status" | "settings" | "update"}   for the panel
"""
from __future__ import annotations

import asyncio
from collections.abc import Callable
import copy
import hashlib
import json
import logging
import re
import time
from typing import Any

from homeassistant.components import persistent_notification
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from . import layout
from .alerts import classify, in_quiet_hours, keyword_matchers
from .const import DOMAIN, EVENT_ALERT, SIGNAL_UPDATE, VERSION, default_settings, merge
from .feeds import FeedError, fetch_feed
from .presets import PRESETS
from .starter import STARTER
from .translate import translate_items, translate_one
from .updater import Updater

_LOGGER = logging.getLogger(__name__)

_GOOGLE_NEWS = re.compile(r"news\.google\.", re.IGNORECASE)
_PUBLISHER = re.compile(r"^(.*\S)\s+-\s+([^-]{2,60})$")
FETCH_CONCURRENCY = 12
SEEN_LIMIT = 3000


def _now_ms() -> int:
    return int(time.time() * 1000)


class TickerEngine:
    """Everything HATickerSec does that isn't drawing."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self._store = Store(hass, 1, f"{DOMAIN}.settings")
        self._seen_store = Store(hass, 1, f"{DOMAIN}.alerts_seen")
        self.settings: dict = default_settings()
        self.status: dict[str, dict] = {}          # id -> {ok, error, count, updated}
        self.last_payload: dict | None = None
        self.raw_bars: list[dict] | None = None    # headlines as fetched, before alert marking
        self.latest_alert: dict | None = None
        self._listeners: set[Callable[[dict], None]] = set()
        self._refresh_unsub: Callable | None = None
        self._demo_unsub: Callable | None = None
        self._generation = 0
        self._refresh_count = 0
        self._seen: dict[str, None] = {}           # ordered set of alerted headlines (link or title)
        self._started = False
        self.updater = Updater(self)

    # ── Settings ───────────────────────────────────────────────────
    async def async_load(self) -> None:
        saved = await self._store.async_load()
        if saved is None:
            self.settings = default_settings()
            self._apply_welcome(self.entry.data.get("welcome"))
            await self._store.async_save(self.settings)
        else:
            if saved.get("display", {}).get("position") not in (None, "top", "bottom", "card"):
                saved["display"]["position"] = "card"
            self.settings = merge(default_settings(), saved)
        self._seen = dict.fromkeys(await self._seen_store.async_load() or [])

    def _apply_welcome(self, choice: dict | None) -> None:
        """Apply the categories picked when HATickerSec was added (up to 4).

        No choice = U.S. News + World News at the bottom.
        """
        s = self.settings
        ids = list((choice or {}).get("categories") or ["us", "world"])[:4]
        cats = [c for i in ids for c in STARTER if c["id"] == i]
        preset_ids = {p["id"] for p in PRESETS}
        enabled = list(dict.fromkeys(src for c in cats for src in c["sources"] if src in preset_ids))
        if enabled:
            s["enabled"] = enabled
        for c in cats:   # chosen categories start with their default (expanded, or one bar)
            if c.get("category"):
                s["display"]["collapsed"].pop(c["category"], None)
        pos = (choice or {}).get("position")
        s["display"]["position"] = pos if pos in ("top", "bottom", "card") else "bottom"

    def _save(self) -> None:
        self._store.async_delay_save(lambda: self.settings, 1)

    @property
    def active(self) -> bool:
        return self.settings.get("active") is not False

    def all_agencies(self) -> list[dict]:
        return [*PRESETS, *({"region": "Custom", **c} for c in self.settings["custom"])]

    def enabled_agencies(self) -> list[dict]:
        by_id = {a["id"]: a for a in self.all_agencies()}
        ov = self.settings["overrides"]
        return [{**by_id[i], **(ov.get(i) or {})} for i in self.settings["enabled"] if i in by_id]

    @staticmethod
    def _feed_key(s: dict) -> str:
        """Only re-download feeds when something that affects headlines changed."""
        upd = {k: v for k, v in s["updates"].items() if k not in ("autoCheck", "checkHours", "manifestUrl")}
        return json.dumps([s["enabled"], s["custom"], upd, s["translation"]], sort_keys=True)

    async def async_save_settings(self, nxt: dict) -> dict:
        before = self._feed_key(self.settings)
        alerts_before = json.dumps(self.settings["alerts"], sort_keys=True)
        # Categories are collapsed from the tickers, the master switch from its own control: keep the live state.
        nxt = copy.deepcopy(nxt)
        nxt["active"] = self.settings["active"]
        nxt["paused"] = self.settings["paused"]
        nxt["hidden"] = self.settings["hidden"]
        nxt["updateNotified"] = self.settings["updateNotified"]
        nxt.setdefault("display", {})["collapsed"] = self.settings["display"].get("collapsed", {})
        self.settings = merge(default_settings(), nxt)
        self._save()
        self.updater.schedule()
        self._broadcast_config()
        self._broadcast({"kind": "settings", "settings": self.settings})
        if self._feed_key(self.settings) != before:
            self.hass.async_create_task(self.async_refresh())
        elif json.dumps(self.settings["alerts"], sort_keys=True) != alerts_before:
            self._redecorate()
        else:
            self._send_placeholders(self.enabled_agencies())   # just names/colors changed
        return self.settings

    # ── Screens ────────────────────────────────────────────────────
    @callback
    def subscribe(self, cb: Callable[[dict], None]) -> Callable[[], None]:
        self._listeners.add(cb)
        cb({"kind": "config", "config": self.client_config()})
        cb({"kind": "news", "view": self.view()})

        @callback
        def unsub() -> None:
            self._listeners.discard(cb)
        return unsub

    @callback
    def _broadcast(self, msg: dict) -> None:
        for cb in list(self._listeners):
            try:
                cb(msg)
            except Exception:  # noqa: BLE001 - one broken screen must not stop the others
                _LOGGER.exception("HATickerSec: couldn't update a screen")

    def client_config(self) -> dict:
        """What the tickers need to draw (no keys or private settings)."""
        s = self.settings
        a = s["alerts"]
        return {
            "version": VERSION,
            "active": self.active,
            "paused": bool(s.get("paused")),
            "hidden": bool(s.get("hidden")),
            "display": s["display"],
            "translation": {"target": s["translation"]["target"], "showOriginalOnHover": s["translation"]["showOriginalOnHover"]},
            "alerts": {"highlight": a["highlight"], "glowPasses": a["glowPasses"]},
        }

    @callback
    def _broadcast_config(self) -> None:
        self._broadcast({"kind": "config", "config": self.client_config()})
        async_dispatcher_send(self.hass, SIGNAL_UPDATE)

    def view(self, payload: dict | None = None) -> dict:
        payload = payload or self.last_payload or {"bars": [], "fetchedAt": None}
        return layout.to_view(payload, self.enabled_agencies(), self.settings["display"].get("collapsed") or {})

    @callback
    def _send_news(self, payload: dict | None = None) -> None:
        self._broadcast({"kind": "news", "view": self.view(payload)})

    @callback
    def _send_placeholders(self, agencies: list[dict]) -> None:
        """Send what we have right away (new agencies show "Loading headlines...")."""
        prev = {b["id"]: b for b in (self.last_payload or {}).get("bars", [])}
        bars = []
        for a in agencies:
            name = a.get("label") or a["name"]
            if a["id"] in prev:
                bars.append({**prev[a["id"]], "name": name, "color": a["color"]})
            else:
                bars.append({"id": a["id"], "name": name, "color": a["color"], "items": [], "error": None})
        self.last_payload = {"bars": bars, "fetchedAt": (self.last_payload or {}).get("fetchedAt") or _now_ms()}
        self._send_news()

    # ── Switches from the tickers, entities and services ───────────
    async def async_set_active(self, on: bool) -> None:
        self.settings["active"] = bool(on)
        self._save()
        if not on:
            self._cancel_refresh()
        self._broadcast_config()
        self._broadcast({"kind": "settings", "settings": self.settings})
        if on:
            await self.async_refresh()

    @callback
    def set_flag(self, key: str, value: bool) -> None:
        """paused / hidden (top level) or display.onlyNew."""
        if key == "onlyNew":
            self.settings["display"]["onlyNew"] = bool(value)
        else:
            self.settings[key] = bool(value)
        self._save()
        self._broadcast_config()
        self._broadcast({"kind": "settings", "settings": self.settings})

    @callback
    def toggle_category(self, cat: str, collapsed: bool | None = None) -> None:
        if layout.is_consolidated(cat) or not layout.is_category(cat):
            return  # always one ticker
        col = self.settings["display"].setdefault("collapsed", {})
        col[cat] = (not layout.is_collapsed(cat, col)) if collapsed is None else bool(collapsed)
        self._save()
        self._broadcast_config()
        self._send_news()

    # ── Fetching ───────────────────────────────────────────────────
    async def _load_agency(self, agency: dict, s: dict) -> dict:
        session = async_get_clientsession(self.hass)
        feed = await fetch_feed(session, agency["url"])
        items = feed["items"]
        # Google News titles end with the real outlet ("... - KHOU"): show that as the source.
        if _GOOGLE_NEWS.search(agency["url"]):
            out = []
            for i in items:
                m = _PUBLISHER.match(i["title"])
                out.append({**i, "title": m.group(1), "publisher": m.group(2).strip()} if m else i)
            items = out
        # Sources with a filter (local TV in Breaking Across the U.S.) only pass matching headlines.
        if agency.get("filter"):
            matchers = keyword_matchers(agency["filter"])
            items = [i for i in items if any(rx.search(i["title"]) for _w, rx in matchers)]
            if not items:
                return {"items": [], "translated": False, "from": agency.get("lang")}
        u = s["updates"]
        max_age = u["maxAgeHours"] * 3600e3 if u["maxAgeHours"] > 0 else float("inf")
        now = _now_ms()
        picked = [i for i in items if not i.get("date") or now - i["date"] <= max_age][: u["maxPerAgency"]]
        # Sources that post rarely (e.g. Krebs on Security) would end up empty with the
        # age limit — show their newest few headlines instead of a blank bar.
        if not picked and items:
            picked = items[: min(5, u["maxPerAgency"])]

        tr = s["translation"]
        lang = agency.get("lang")
        src = lang if lang and lang != "auto" else (feed.get("language") or "auto")
        translated = False
        if tr["enabled"] and src != tr["target"][:2]:
            picked, failures = await translate_items(session, picked, src, tr)
            translated = failures < len(picked)
        return {"items": picked, "translated": translated, "from": src}

    @callback
    def _cancel_refresh(self) -> None:
        if self._refresh_unsub:
            self._refresh_unsub()
            self._refresh_unsub = None

    async def async_refresh(self, *_: Any) -> None:
        self._cancel_refresh()
        if not self.active:      # switched off: no fetching until switched on
            async_dispatcher_send(self.hass, SIGNAL_UPDATE)
            return
        self._generation += 1
        my = self._generation
        s = self.settings
        agencies = self.enabled_agencies()
        self._send_placeholders(agencies)
        prev = {b["id"]: b for b in (self.last_payload or {}).get("bars", [])}
        sem = asyncio.Semaphore(FETCH_CONCURRENCY)

        async def load(a: dict) -> dict:
            name = a.get("label") or a["name"]
            async with sem:
                try:
                    r = await self._load_agency(a, s)
                except (FeedError, Exception) as err:  # noqa: BLE001 - a bad feed only affects its own bar
                    msg = str(err) or err.__class__.__name__
                    if not isinstance(err, FeedError):
                        _LOGGER.debug("HATickerSec: %s failed", a["url"], exc_info=True)
                    self.status[a["id"]] = {"ok": False, "error": msg, "updated": _now_ms()}
                    # Keep showing the last good headlines if we have them.
                    return {"id": a["id"], "name": name, "color": a["color"],
                            "items": (prev.get(a["id"]) or {}).get("items", []), "error": msg}
            self.status[a["id"]] = {"ok": True, "count": len(r["items"]), "updated": _now_ms()}
            return {"id": a["id"], "name": name, "color": a["color"], "lang": r["from"],
                    "translated": r["translated"], "items": r["items"], "error": None, "loaded": True}

        bars = await asyncio.gather(*(load(a) for a in agencies))
        if my != self._generation:
            return               # a newer refresh started meanwhile
        self.raw_bars = list(bars)
        self.last_payload = {"bars": self._decorate(self.raw_bars, True), "fetchedAt": _now_ms()}
        self._send_news()
        self._broadcast({"kind": "status", "status": self.status})
        async_dispatcher_send(self.hass, SIGNAL_UPDATE)
        minutes = max(1, int(s["updates"]["refreshMinutes"]))
        self._refresh_unsub = async_call_later(self.hass, minutes * 60, self._timer_refresh)

    @callback
    def _timer_refresh(self, _now: Any) -> None:
        self._refresh_unsub = None
        self.hass.async_create_background_task(self.async_refresh(), f"{DOMAIN}_refresh")

    # ── Alerts ─────────────────────────────────────────────────────
    def _decorate(self, bars: list[dict], from_fetch: bool) -> list[dict]:
        """Mark keyword/breaking headlines; flag the ones that are new since last time."""
        a = self.settings["alerts"]
        now = _now_ms()
        fresh = []
        if from_fetch:
            self._refresh_count += 1
        out = []
        for b in bars:
            items = []
            for it in classify(b.get("items") or [], a):
                if it["alert"]:
                    key = it.get("link") or it["title"]
                    # Only recent headlines count as new (no flood of old ones on start-up).
                    recent = (now - it["date"] < 2 * 3600e3) if it.get("date") else self._refresh_count > 1
                    if key not in self._seen:
                        self._seen[key] = None
                        if recent:
                            fresh.append((b, it))
                            it = {**it, "flash": True}
                items.append(it)
            out.append({**b, "items": items})
        if fresh:
            while len(self._seen) > SEEN_LIMIT:
                self._seen.pop(next(iter(self._seen)))
            self._seen_store.async_delay_save(lambda: list(self._seen), 5)
            self._announce(fresh, a)
        return out

    @callback
    def _redecorate(self) -> None:
        """Re-mark headlines after alert settings change (no re-download needed)."""
        if not self.raw_bars:
            return
        prev = {b["id"]: b for b in (self.last_payload or {}).get("bars", [])}
        bars = [{**b, "name": (prev.get(b["id"]) or b)["name"], "color": (prev.get(b["id"]) or b)["color"]} for b in self.raw_bars]
        self.last_payload = {"bars": self._decorate(bars, False), "fetchedAt": (self.last_payload or {}).get("fetchedAt")}
        self._send_news()

    @staticmethod
    def _why(item: dict) -> str:
        return "BREAKING" if item["alert"]["breaking"] else f"Keyword: {', '.join(item['alert']['keywords'])}"

    def _announce(self, fresh: list[tuple[dict, dict]], a: dict) -> None:
        if not self.active:
            return
        # Every new alert headline is an event, so automations can act on it.
        for bar, item in fresh:
            data = {
                "agency": item.get("publisher") or bar["name"], "color": bar.get("color"),
                "breaking": item["alert"]["breaking"], "keywords": item["alert"]["keywords"],
                "why": self._why(item), "title": item["title"], "link": item.get("link") or "",
                "original": item.get("original") or "",
            }
            self.hass.bus.async_fire(EVENT_ALERT, data)
            self.latest_alert = {**data, "time": dt_util.utcnow().isoformat()}

        notify = [(b, i) for b, i in fresh
                  if (i["alert"]["breaking"] and a["notifyBreaking"]) or (i["alert"]["keywords"] and a["notifyKeywords"])]
        if notify:
            style = a.get("notifyStyle") or "popup"
            alerts = [{"agency": i.get("publisher") or b["name"], "color": b.get("color"), "breaking": i["alert"]["breaking"],
                       "why": self._why(i), "title": i["title"], "link": i.get("link") or ""} for b, i in notify]
            if style in ("popup", "both"):
                if len(alerts) <= 4:
                    for x in alerts:
                        self.popup(x)
                else:
                    self.popup({"agency": "HATickerSec", "color": "#5b8cff", "breaking": any(x["breaking"] for x in alerts),
                                "why": f"{len(alerts)} alerts", "title": "  •  ".join(x["title"] for x in alerts[:2]),
                                "foot": "Click to show the tickers", "showTickers": True})
            if style in ("ha", "both"):
                if len(alerts) <= 3:
                    for x in alerts:
                        self.hass.async_create_task(self.ha_notify(f"{x['agency']} — {x['why']}", x["title"], x["link"]))
                else:
                    body = "\n".join(f"• {x['title']}" for x in alerts[:4])
                    self.hass.async_create_task(self.ha_notify(f"HATickerSec — {len(alerts)} alert headlines", body))
        if a["chime"] and not in_quiet_hours(a, dt_util.now()):
            self.chime(any(i["alert"]["breaking"] for _b, i in fresh))
        async_dispatcher_send(self.hass, SIGNAL_UPDATE)

    @callback
    def popup(self, data: dict) -> None:
        self._broadcast({"kind": "popup", "popup": data})

    @callback
    def chime(self, breaking: bool, test: bool = False) -> None:
        a = self.settings["alerts"]
        self._broadcast({"kind": "chime", "volume": a["chimeVolume"], "sound": a["chimeSound"], "breaking": breaking, "test": test})

    async def ha_notify(self, title: str, body: str, link: str = "") -> dict:
        """Home Assistant notification (plus the optional notify service)."""
        message = f"{body}\n\n[Open the story]({link})" if link else body
        nid = f"{DOMAIN}_{hashlib.sha1((title + body).encode()).hexdigest()[:12]}"
        persistent_notification.async_create(self.hass, message, title=title, notification_id=nid)
        service = (self.settings["alerts"].get("notifyService") or "").strip()
        if not service:
            return {"ok": True}
        domain, _, name = service.partition(".")
        if not name:
            domain, name = "notify", domain
        if not self.hass.services.has_service(domain, name):
            return {"ok": False, "error": f"{domain}.{name} doesn't exist — check the name under Developer tools → Actions"}
        data: dict = {"title": title, "message": body}
        if link:
            data["data"] = {"url": link, "clickAction": link}
        try:
            await self.hass.services.async_call(domain, name, data, blocking=True)
        except Exception as err:  # noqa: BLE001 - report it to the panel
            return {"ok": False, "error": f"{domain}.{name} failed: {err}"}
        return {"ok": True}

    # ── Preview buttons (Panel → Alerts → Preview) ─────────────────
    def _sample_kw(self) -> str:
        kws = self.settings["alerts"].get("keywords") or []
        return kws[0].rstrip("*") if kws else "Steelers"

    def _demo_headline(self, kind: str) -> dict:
        """Put a sample headline at the front of the first bar, slide it in now, take it away after a minute."""
        if not self.last_payload or not self.last_payload.get("bars"):
            return {"ok": False, "error": "Add at least one agency first"}
        kw = self._sample_kw()
        stamp = _now_ms()
        item = {
            "new": {"title": "Sample: a headline published a minute ago gets the NEW tag", "alert": None},
            "keyword": {"title": f"Sample: {kw} headline — your keyword is marked in gold", "alert": {"breaking": False, "keywords": [kw]}, "flash": True},
            "breaking": {"title": "Sample: BREAKING headlines turn red and jump to the front", "alert": {"breaking": True, "keywords": []}, "flash": True},
            "glow": {"title": "Sample: a brand-new alert headline glows as it scrolls by", "alert": {"breaking": False, "keywords": []}, "flash": True},
        }[kind]
        sample = {"link": f"https://example.com/preview/{stamp}", "date": stamp - 60_000, **item}
        bars = [({**b, "items": [sample, *(b.get("items") or [])]} if i == 0 else b) for i, b in enumerate(self.last_payload["bars"])]
        self._send_news({"bars": bars, "fetchedAt": self.last_payload.get("fetchedAt"), "force": [bars[0]["id"]]})
        if self._demo_unsub:
            self._demo_unsub()

        @callback
        def restore(_now: Any) -> None:
            self._demo_unsub = None
            if self.last_payload and self.last_payload.get("bars"):
                self._send_news({**self.last_payload, "force": [self.last_payload["bars"][0]["id"]]})
        self._demo_unsub = async_call_later(self.hass, 60, restore)
        return {"ok": True, "bar": bars[0]["name"], "hidden": bool(self.settings.get("hidden"))}

    async def async_demo(self, kind: str) -> dict:
        a = self.settings["alerts"]
        kw = self._sample_kw()
        first = (self.last_payload or {}).get("bars", [None])[0] if (self.last_payload or {}).get("bars") else None
        agency = first["name"] if first else "HATickerSec"
        color = first["color"] if first else "#5b8cff"
        if kind in ("new", "keyword", "breaking", "glow"):
            return self._demo_headline(kind)
        if kind == "popup-keyword":
            self.popup({"agency": agency, "color": color, "why": f"Keyword: {kw}", "title": f"Sample: a {kw} headline arrived — click to read, ✕ to dismiss", "foot": "Preview"})
            return {"ok": True}
        if kind == "popup-breaking":
            self.popup({"agency": agency, "color": color, "breaking": True, "why": "BREAKING", "title": "Sample: breaking pop-ups are red and pulse three times", "foot": "Preview"})
            return {"ok": True}
        if kind == "ha":
            return {"ok": True, "ha": await self.ha_notify(f"{agency} — Keyword: {kw}", "Sample: this is a Home Assistant notification from HATickerSec.")}
        if kind in ("chime", "chime-breaking"):
            if not a["chime"]:
                return {"ok": True, "off": True}
            self.chime(kind == "chime-breaking", test=True)
            return {"ok": True, "quiet": in_quiet_hours(a, dt_util.now())}
        if kind == "everything":
            r = self._demo_headline("breaking")
            self.popup({"agency": agency, "color": color, "breaking": True, "why": "BREAKING", "title": "Sample: BREAKING — this is a full alert: red headline, glow, pop-up and chime", "foot": "Preview"})
            if a["chime"]:
                self.chime(True, test=True)
            return {**r, "chimeOff": not a["chime"]}
        return {"ok": False, "error": "Unknown preview"}

    async def async_alert_test(self, kind: str) -> dict:
        a = self.settings["alerts"]
        if kind in ("chime", "chime-breaking"):
            if not a["chime"]:
                return {"ok": True, "off": True}
            self.chime(kind == "chime-breaking", test=True)
            return {"ok": True, "quiet": in_quiet_hours(a, dt_util.now())}
        style = a.get("notifyStyle") or "popup"
        res: dict = {"ok": True, "style": style}
        if style in ("popup", "both"):
            self.popup({"agency": "HATickerSec", "color": "#f6c344", "why": "Keyword: test", "title": "This is what an alert looks like — click it to open the story, or ✕ to dismiss.", "foot": "Test alert"})
        if style in ("ha", "both"):
            res["ha"] = await self.ha_notify("HATickerSec — Keyword: test", "This is what an alert notification looks like.")
        return res

    async def async_feed_test(self, url: str) -> dict:
        try:
            f = await fetch_feed(async_get_clientsession(self.hass), url)
        except FeedError as err:
            return {"ok": False, "error": str(err)}
        except Exception as err:  # noqa: BLE001 - shown to the user
            return {"ok": False, "error": str(err) or err.__class__.__name__}
        return {"ok": True, "title": f["title"], "language": f.get("language"), "count": len(f["items"]),
                "sample": [i["title"] for i in f["items"][:3]]}

    async def async_translate_test(self, cfg: dict) -> dict:
        try:
            out = await translate_one(async_get_clientsession(self.hass), "Guten Morgen, die Nachrichten des Tages", "de", cfg)
        except Exception as err:  # noqa: BLE001 - shown to the user
            return {"ok": False, "error": str(err) or err.__class__.__name__}
        return {"ok": True, "text": out}

    # ── Lifecycle ──────────────────────────────────────────────────
    async def async_start(self, *_: Any) -> None:
        if self._started:
            return
        self._started = True
        self.updater.start()
        await self.async_refresh()

    async def async_stop(self) -> None:
        self._cancel_refresh()
        if self._demo_unsub:
            self._demo_unsub()
        self.updater.stop()
        self._listeners.clear()
        await self._store.async_save(self.settings)
        await self._seen_store.async_save(list(self._seen))

    # Helpers for entities
    def headline_count(self) -> int:
        return sum(len(b.get("items") or []) for b in (self.last_payload or {}).get("bars", []))

    def fetched_at(self):
        ms = (self.last_payload or {}).get("fetchedAt")
        return dt_util.utc_from_timestamp(ms / 1000) if ms and self.raw_bars is not None else None
