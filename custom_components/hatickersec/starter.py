"""Categories offered when HATickerSec is first set up (the welcome step).

Each one installs a small, ready-picked set of sources.
"""
from __future__ import annotations

from .presets import PRESETS


def _all(region: str) -> list[str]:
    """Every source in a group, in catalog order."""
    return [p["id"] for p in PRESETS if p["region"] == region]


STARTER: list[dict] = [
    {"id": "us", "icon": "🇺🇸", "name": "U.S. News", "desc": "All the major U.S. news agencies", "category": "United States", "sources": _all("United States")},
    {"id": "cyberbreaking", "icon": "⚡", "name": "Cyber Breaking News", "desc": "One ticker, consolidated feed: zero-days, breaches, ransomware and CISA/FBI warnings from top security sources", "category": "Cyber Breaking News", "sources": _all("Cyber Breaking News")},
    {"id": "usbreaking", "icon": "🚨", "name": "Breaking Across the U.S.", "desc": "One ticker, consolidated feed: explosions, fires, evacuations and disasters from local TV stations nationwide", "category": "Breaking Across the U.S.", "sources": _all("Breaking Across the U.S.")},
    {"id": "world", "icon": "🌍", "name": "World News", "desc": "What is happening around the globe", "sources": ["bbcworld", "aljazeera"]},
    {"id": "cyber", "icon": "🛡️", "name": "Cybersecurity", "desc": "Every cybersecurity source: hacks, breaches and research", "category": "Cybersecurity", "sources": _all("Cybersecurity")},
    {"id": "govcyber", "icon": "🏛️", "name": "Government Cyber Alerts", "desc": "Every government source: CISA, FBI & IC3, UK, Canada, Australia", "category": "Government Cyber Alerts", "sources": _all("Government Cyber Alerts")},
    {"id": "tech", "icon": "💻", "name": "Technology", "desc": "Gadgets, software and the tech industry", "category": "Technology", "sources": ["ars", "verge", "techcrunch"]},
    {"id": "science", "icon": "🔭", "name": "Science & Space", "desc": "Discoveries, NASA and the night sky", "category": "Science & Space", "sources": ["nasa", "spacecom", "bbcsci"]},
    {"id": "health", "icon": "🩺", "name": "Health", "desc": "Medicine, wellness and public health", "category": "Health", "sources": _all("Health")},
    {"id": "business", "icon": "📈", "name": "Business & Markets", "desc": "Markets, money and the economy", "category": "Business & Markets", "sources": ["cnbc", "marketwatch", "bbcbiz"]},
    {"id": "sports", "icon": "🏈", "name": "Sports", "desc": "Scores, trades and big games", "category": "Sports", "sources": ["espn", "cbssports", "bbcsport"]},
    {"id": "weather", "icon": "🌪️", "name": "Weather & Disasters", "desc": "Hurricanes, earthquakes and alerts", "category": "Weather & Disasters", "sources": ["nhc", "usgs", "gdacs"]},
    {"id": "gaming", "icon": "🎮", "name": "Gaming", "desc": "Game news, reviews and releases", "category": "Gaming", "sources": ["pcgamer", "ign", "polygon"]},
]
