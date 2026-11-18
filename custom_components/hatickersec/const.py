"""Constants for HATickerSec."""
from __future__ import annotations

import copy

DOMAIN = "hatickersec"
NAME = "HATickerSec"
VERSION = "1.0.5"

SIGNAL_UPDATE = f"{DOMAIN}_update"
EVENT_ALERT = f"{DOMAIN}_alert"

URL_BASE = "/hatickersec_static"
PANEL_URL = "hatickersec"
CREDIT_URL = "https://www.youtube.com/@epomd"

# Settings, kept in .storage/hatickersec.settings.
DEFAULTS: dict = {
    # Which agencies are on, in display order (top bar first).
    "enabled": ["bbc", "npr", "aljazeera"],
    # Per-agency overrides: { id: { color, label } }
    "overrides": {},
    # User-added feeds: [{ id, name, url, lang, color, region: 'Custom' }]
    "custom": [],
    "display": {
        "position": "bottom",   # top | bottom (docked over every Home Assistant page) | card (dashboard cards only)
        "maxHeightPct": 50,     # docked tickers use at most this much of the screen height, then scroll
        "barHeight": 38,
        "gap": 2,
        "fontSize": 17,
        "speed": 90,            # pixels per second
        "opacity": 0.82,        # bar background opacity
        "showLabel": True,
        "showTime": True,       # "12m" after each headline
        "newMinutes": 30,       # headlines younger than this get a NEW tag
        "onlyNew": False,       # True = scroll only headlines that are NEW
        "collapsed": {},        # { 'Cybersecurity': True } = category shown as one combined bar
        "clickThrough": False,  # True = docked bars ignore the mouse
        "alwaysOnTop": False,   # True = docked bars stay above Home Assistant dialogs
        "pauseOnHover": True,
    },
    "updates": {
        "refreshMinutes": 5,
        "maxPerAgency": 15,
        "maxAgeHours": 24,      # 0 = no limit
        "autoCheck": True,      # check for app updates by itself
        "checkHours": 3,
        "manifestUrl": "",      # latest.json share link (blank = the built-in link)
    },
    "translation": {
        "enabled": False,
        "target": "en",
        "provider": "google",   # google | mymemory | libre | deepl
        "showOriginalOnHover": True,
        "mymemoryEmail": "",
        "libreUrl": "https://libretranslate.com",
        "libreKey": "",
        "deeplKey": "",
    },
    "alerts": {
        "keywords": [],         # words or phrases, e.g. "Steelers", "Oak Creek", "hurrican*"
        "highlight": True,      # gold highlight on matching headlines
        "glowPasses": 3,        # brand-new alert headlines glow on this many passes (0 = off)
        "notifyKeywords": True,  # alert pop-up for keyword headlines
        "notifyStyle": "popup",  # popup (HATickerSec pop-up) | ha (Home Assistant notification) | both
        "notifyService": "",    # optional notify service for the HA notification, e.g. notify.mobile_app_phone
        "breaking": True,       # detect BREAKING / LIVE / URGENT headlines
        "breakingWords": ["BREAKING", "LIVE", "WATCH LIVE", "URGENT", "JUST IN", "DEVELOPING"],
        "breakingFront": True,  # move breaking headlines to the front of their bar
        "notifyBreaking": False,  # pop-up for breaking headlines
        "chime": False,         # soft sound when a new alert arrives
        "chimeVolume": 0.5,
        "chimeSound": "bell",   # bell | glass | marimba | sonar | newsflash
        "quietHours": True,
        "quietFrom": "22:00",
        "quietTo": "07:00",
    },
    "active": True,             # master switch: False = no tickers, fetching or alerts
    "paused": False,            # scrolling paused on every screen
    "hidden": False,            # docked tickers hidden on every screen (cards still show)
    "updateNotified": "",       # the version the update pop-up was last shown for
}


def default_settings() -> dict:
    return copy.deepcopy(DEFAULTS)


def merge(base, extra):
    """Deep-merge saved settings over the defaults (lists are replaced, unknown keys kept)."""
    if isinstance(base, list):
        return extra if isinstance(extra, list) else copy.deepcopy(base)
    if isinstance(base, dict):
        out = copy.deepcopy(base)
        for k, v in (extra or {}).items() if isinstance(extra, dict) else []:
            out[k] = merge(base[k], v) if k in base else v
        return out
    return base if extra is None else extra
