"""Headline translation. Four providers:

  google     – free Google Translate web endpoint, no key (unofficial, may rate-limit)
  mymemory   – free MyMemory API, no key (about 5,000 chars/day; 50,000 with an email)
  libre      – LibreTranslate (your own server or a hosted one, optional key)
  deepl      – DeepL API (free or pro key)

Results are cached so each headline is only translated once.
"""
from __future__ import annotations

import asyncio
from collections import OrderedDict
from urllib.parse import quote

import aiohttp

MAX_CACHE = 5000
_cache: OrderedDict[str, str] = OrderedDict()


def _remember(key: str, value: str) -> None:
    if len(_cache) >= MAX_CACHE:
        _cache.popitem(last=False)
    _cache[key] = value


async def _json(session: aiohttp.ClientSession, method: str, url: str, **kw):
    async with session.request(method, url, timeout=aiohttp.ClientTimeout(total=12), **kw) as res:
        if res.status != 200:
            raise RuntimeError(f"HTTP {res.status}")
        return await res.json(content_type=None)


async def _google(session, q, src, to, cfg):
    url = ("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t"
           f"&sl={quote(src or 'auto')}&tl={quote(to)}&q={quote(q)}")
    data = await _json(session, "GET", url)
    return "".join(seg[0] for seg in (data[0] or []) if seg and seg[0])


async def _mymemory(session, q, src, to, cfg):
    pair_from = src if src and src != "auto" else "Autodetect"
    url = f"https://api.mymemory.translated.net/get?q={quote(q)}&langpair={pair_from}|{to}"
    if cfg.get("mymemoryEmail"):
        url += f"&de={quote(cfg['mymemoryEmail'])}"
    data = await _json(session, "GET", url)
    if data.get("responseStatus") and int(data["responseStatus"]) != 200:
        raise RuntimeError(data.get("responseDetails") or "MyMemory error")
    return data["responseData"]["translatedText"]


async def _libre(session, q, src, to, cfg):
    base = (cfg.get("libreUrl") or "https://libretranslate.com").rstrip("/")
    body = {"q": q, "source": src or "auto", "target": to, "format": "text"}
    if cfg.get("libreKey"):
        body["api_key"] = cfg["libreKey"]
    data = await _json(session, "POST", f"{base}/translate", json=body)
    return data["translatedText"]


async def _deepl(session, q, src, to, cfg):
    key = cfg.get("deeplKey") or ""
    if not key:
        raise RuntimeError("DeepL key missing")
    host = "https://api-free.deepl.com" if key.endswith(":fx") else "https://api.deepl.com"
    form = {"text": q, "target_lang": to.upper()}
    if src and src != "auto":
        form["source_lang"] = src.upper()
    data = await _json(session, "POST", f"{host}/v2/translate", data=form,
                       headers={"Authorization": f"DeepL-Auth-Key {key}"})
    return data["translations"][0]["text"]


PROVIDERS = {"google": _google, "mymemory": _mymemory, "libre": _libre, "deepl": _deepl}


async def translate_one(session: aiohttp.ClientSession, text: str, src: str, cfg: dict) -> str:
    to = cfg.get("target") or "en"
    key = f"{cfg.get('provider')}|{src}|{to}|{text}"
    if key in _cache:
        return _cache[key]
    fn = PROVIDERS.get(cfg.get("provider"), _google)
    out = ((await fn(session, text, src, to, cfg)) or "").strip()
    if out:
        _remember(key, out)
    return out or text


async def translate_items(session: aiohttp.ClientSession, items: list[dict], src: str, cfg: dict) -> tuple[list[dict], int]:
    """Translate headlines, three at a time. Never raises: on failure the original is kept."""
    out = [dict(i) for i in items]
    failures = 0
    sem = asyncio.Semaphore(3)

    async def one(item: dict) -> None:
        nonlocal failures
        async with sem:
            try:
                t = await translate_one(session, item["title"], src, cfg)
            except Exception:  # noqa: BLE001 - any provider failure keeps the original headline
                failures += 1
                return
            if t and t != item["title"]:
                item["original"] = item["title"]
                item["title"] = t

    await asyncio.gather(*(one(i) for i in out))
    return out, failures
