"""App updates straight from GitHub.

HATickerSec reads the latest release of github.com/Degederon/HATickerSec. When it's
newer than this copy, the panel and the Update entity offer to install it: the release's
hatickersec.zip if one is attached (checked against its size and sha256), otherwise the
release's source code. Nothing to set up, no links to share.
"""
from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta
import hashlib
import io
import json
import logging
from pathlib import Path
import re
import shutil
import tempfile
from typing import TYPE_CHECKING, Any
import zipfile

import aiohttp

from homeassistant.components import persistent_notification
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_time_interval

from .const import DOMAIN, SIGNAL_UPDATE, VERSION

if TYPE_CHECKING:
    from .engine import TickerEngine

_LOGGER = logging.getLogger(__name__)
GITHUB_RELEASES = "https://api.github.com/repos/Degederon/HATickerSec/releases/latest"
GITHUB_LATEST_PAGE = "https://github.com/Degederon/HATickerSec/releases/latest"
GITHUB_ARCHIVE = "https://github.com/Degederon/HATickerSec/archive/refs/tags/{tag}.zip"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
MAX_ZIP = 50 * 1024 * 1024
CONFIG_FILE = Path(__file__).parent / "update-config.json"


class UpdateError(Exception):
    def __init__(self, msg: str, code: str = "error") -> None:
        super().__init__(msg)
        self.code = code


def _read_baked() -> dict:
    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


# Read once when the integration loads (Home Assistant imports integrations outside the event loop).
_BAKED = _read_baked()


def baked_links() -> dict:
    """Update links built into this copy (update-config.json)."""
    return _BAKED


def is_newer(a: str, b: str) -> bool:
    def parts(v: str) -> list[int]:
        return [int(x) if x.isdigit() else 0 for x in (re.split(r"[.\-+]", str(v)) + ["0", "0", "0"])[:3]]
    return parts(a) > parts(b)


def direct_link(url: str) -> str:
    """SharePoint / OneDrive share links show a preview page unless asked for the file itself."""
    u = (url or "").strip()
    if u and re.search(r"sharepoint\.com|1drv\.ms|onedrive\.live\.com", u, re.I) and not re.search(r"[?&]download=1", u, re.I):
        u += ("&" if "?" in u else "?") + "download=1"
    return u


def _looks_like_login(text: str, final_url: str) -> bool:
    return bool(re.search(r"login\.microsoftonline\.com|<html", text[:2000], re.I) or "login.microsoftonline.com" in final_url)


class Updater:
    def __init__(self, engine: TickerEngine) -> None:
        self.engine = engine
        self.hass = engine.hass
        self.state: dict[str, Any] = {"status": "idle"}   # idle | checking | current | available | downloading | installed | signin | error
        self._timer: Callable | None = None
        self._first: Callable | None = None

    # ── Links ──────────────────────────────────────────────────────
    def manifest_url(self) -> str:
        # A private update folder can still be built in (update-config.json); otherwise GitHub releases.
        return (self.engine.settings["updates"].get("manifestUrl") or baked_links().get("manifestUrl") or GITHUB_RELEASES).strip()

    def public_state(self) -> dict:
        return {**self.state, "current": VERSION, "configured": True}

    @callback
    def _set(self, **kw: Any) -> None:
        self.state = {**self.state, **kw}
        self.engine._broadcast({"kind": "update", "state": self.public_state()})
        async_dispatcher_send(self.hass, SIGNAL_UPDATE)

    # ── Schedule ───────────────────────────────────────────────────
    @callback
    def start(self) -> None:
        self._first = async_call_later(self.hass, 20, self._scheduled)
        self.schedule()

    @callback
    def schedule(self) -> None:
        if self._timer:
            self._timer()
            self._timer = None
        u = self.engine.settings["updates"]
        if not u.get("autoCheck"):
            return
        self._timer = async_track_time_interval(self.hass, self._scheduled, timedelta(hours=max(1, int(u.get("checkHours") or 3))))

    @callback
    def stop(self) -> None:
        for unsub in (self._timer, self._first):
            if unsub:
                unsub()
        self._timer = self._first = None

    @callback
    def _scheduled(self, _now: Any) -> None:
        self._first = None
        if self.engine.settings["updates"].get("autoCheck"):
            self.hass.async_create_background_task(self.async_check(False), f"{DOMAIN}_update_check")

    # ── Check ──────────────────────────────────────────────────────
    async def _read_github(self) -> dict:
        """The latest GitHub release, in the same shape as latest.json."""
        session = async_get_clientsession(self.hass)
        try:
            async with session.get(GITHUB_RELEASES, headers={"User-Agent": "HATickerSec", "Accept": "application/vnd.github+json"},
                                   timeout=aiohttp.ClientTimeout(total=30)) as res:
                if res.status == 404:
                    raise UpdateError("no release has been published on GitHub yet", "http")
                if res.status in (403, 429):
                    return await self._read_github_page()   # API limit reached: use the release page instead
                if res.status != 200:
                    raise UpdateError(f"couldn’t reach GitHub (HTTP {res.status})", "http")
                rel = await res.json(content_type=None)
        except (aiohttp.ClientError, TimeoutError) as err:
            raise UpdateError(f"couldn’t reach GitHub ({err.__class__.__name__})", "http") from None
        version = str(rel.get("tag_name") or "").lstrip("vV")
        if not version:
            raise UpdateError("the latest GitHub release has no version tag", "bad")
        asset = next((a for a in rel.get("assets") or [] if str(a.get("name", "")).lower().endswith(".zip")), None)
        notes = (rel.get("body") or "").strip()
        first = next((ln.strip(" -*#") for ln in notes.splitlines() if ln.strip(" -*#")), "")
        return {
            "version": version,
            "notes": first[:200],
            "date": (rel.get("published_at") or "")[:10],
            "installer": asset["browser_download_url"] if asset else rel.get("zipball_url") or "",
            "size": int(asset.get("size") or 0) if asset else 0,
            "sha256": (asset.get("digest") or "").removeprefix("sha256:") if asset else "",
        }

    async def _read_github_page(self) -> dict:
        """Without the API: github.com/…/releases/latest redirects to the latest tag."""
        session = async_get_clientsession(self.hass)
        try:
            async with session.get(GITHUB_LATEST_PAGE, headers={"User-Agent": UA}, allow_redirects=False,
                                   timeout=aiohttp.ClientTimeout(total=30)) as res:
                where = res.headers.get("Location", "")
        except (aiohttp.ClientError, TimeoutError) as err:
            raise UpdateError(f"couldn’t reach GitHub ({err.__class__.__name__})", "http") from None
        m = re.search(r"/releases/tag/([^/?#]+)", where)
        if not m:
            raise UpdateError("GitHub asked to wait a little — HATickerSec will try again later", "http")
        tag = m.group(1)
        return {"version": tag.lstrip("vV"), "notes": "", "date": "", "installer": GITHUB_ARCHIVE.format(tag=tag), "size": 0, "sha256": ""}

    async def _read_manifest(self) -> dict:
        if self.manifest_url() == GITHUB_RELEASES:
            return await self._read_github()
        url = direct_link(self.manifest_url())
        if not url:
            raise UpdateError("Updates are not set up in this copy", "nolink")
        session = async_get_clientsession(self.hass)
        try:
            async with session.get(url, headers={"User-Agent": UA, "Cache-Control": "no-cache"}, allow_redirects=True,
                                   timeout=aiohttp.ClientTimeout(total=30)) as res:
                text = await res.text(errors="replace")
                status, final = res.status, str(res.url)
        except (aiohttp.ClientError, TimeoutError) as err:
            raise UpdateError(f"couldn’t reach the update folder ({err.__class__.__name__})", "http") from None
        login = _looks_like_login(text, final)
        if status != 200 or login:
            raise UpdateError(
                "SharePoint sent a sign-in page instead of latest.json — its share link must be set to “Anyone with the link”"
                if login else f"couldn’t reach latest.json in the update folder (HTTP {status})",
                "signin" if login or status in (401, 403) else "http")
        try:
            m = json.loads(text.lstrip("﻿"))
        except ValueError:
            raise UpdateError("latest.json is not valid", "bad") from None
        if not isinstance(m, dict) or not m.get("version"):
            raise UpdateError("latest.json has no version", "bad")
        return m

    async def async_check(self, manual: bool = False) -> dict:
        if self.state.get("status") in ("downloading", "installed"):
            return self.public_state()
        if not self.manifest_url():
            if manual:
                self._set(status="error", error="Updates are not set up in this copy")
            return self.public_state()
        self._set(status="checking", error=None)
        try:
            m = await self._read_manifest()
        except UpdateError as err:
            self._set(status="signin" if err.code == "signin" else "error", error=str(err))
            return self.public_state()
        if is_newer(str(m["version"]), VERSION):
            self._set(status="available", version=str(m["version"]), notes=m.get("notes") or "",
                      installer=m.get("installer") or baked_links().get("installerUrl") or "",
                      size=int(m.get("size") or 0), sha256=str(m.get("sha256") or "").lower(), date=m.get("date") or "")
            # Tell the user once per new version: the pop-up stays until it's closed (or clicked to install).
            s = self.engine.settings
            if s.get("updateNotified") != m["version"]:
                s["updateNotified"] = str(m["version"])
                self.engine._save()
                self.engine.popup({"agency": "HATickerSec", "color": "#5b8cff", "why": "UPDATE",
                                   "title": f"Version {m['version']} is available" + (f" — {m['notes']}" if m.get("notes") else ""),
                                   "foot": "Click to install now · ✕ to dismiss", "action": "update", "sticky": True})
        else:
            self._set(status="current", version=str(m["version"]))
        return self.public_state()

    # ── Install ────────────────────────────────────────────────────
    async def async_install(self) -> dict:
        if self.state.get("status") != "available":
            await self.async_check(True)
            if self.state.get("status") != "available":
                return self.public_state()
        link = direct_link(self.state.get("installer") or "")
        version = self.state.get("version")
        if not link:
            self._set(status="error", error="latest.json has no installer link")
            return self.public_state()
        self._set(status="downloading", progress=0)
        try:
            data = await self._download(link)
            await self.hass.async_add_executor_job(self._install_zip, data, version)
        except UpdateError as err:
            self._set(status="signin" if err.code == "signin" else "error", error=str(err), version=version)
            return self.public_state()
        except Exception as err:  # noqa: BLE001 - shown in the panel
            _LOGGER.exception("HATickerSec update failed")
            self._set(status="error", error=f"the update couldn’t be installed ({err})", version=version)
            return self.public_state()
        self._set(status="installed", progress=100)
        persistent_notification.async_create(
            self.hass,
            f"HATickerSec {version} is installed. Restart Home Assistant to start using it "
            "(Settings → System → ⋮ → Restart Home Assistant).",
            title="HATickerSec update installed", notification_id=f"{DOMAIN}_update_installed")
        return self.public_state()

    async def _download(self, link: str) -> bytes:
        session = async_get_clientsession(self.hass)
        expect = int(self.state.get("size") or 0)
        try:
            async with session.get(link, headers={"User-Agent": UA}, allow_redirects=True,
                                   timeout=aiohttp.ClientTimeout(total=600)) as res:
                if res.status in (401, 403):
                    raise UpdateError("the update folder asked for a sign-in — share the zip as “Anyone with the link”", "signin")
                if res.status != 200:
                    raise UpdateError(f"couldn’t download the update (HTTP {res.status})", "http")
                total = expect or int(res.headers.get("Content-Length") or 0)
                buf = io.BytesIO()
                async for chunk in res.content.iter_chunked(256 * 1024):
                    buf.write(chunk)
                    if buf.tell() > MAX_ZIP:
                        raise UpdateError("the download is far bigger than a HATickerSec release", "bad")
                    if total:
                        self._set(status="downloading", progress=min(99, int(buf.tell() * 100 / total)))
        except aiohttp.ClientError as err:
            raise UpdateError(f"the download failed ({err.__class__.__name__})", "http") from None
        data = buf.getvalue()
        if data[:2] != b"PK":
            if _looks_like_login(data[:2000].decode("utf-8", "replace"), ""):
                raise UpdateError("SharePoint sent a sign-in page instead of the zip — share it as “Anyone with the link”", "signin")
            raise UpdateError("the download is not a zip file", "bad")
        if expect and len(data) != expect:
            raise UpdateError(f"the download is the wrong size ({len(data)} bytes, expected {expect}) — try again", "bad")
        want = self.state.get("sha256") or ""
        if want and hashlib.sha256(data).hexdigest() != want:
            raise UpdateError("the download doesn’t match latest.json (sha256 differs) — it was not installed", "bad")
        return data

    def _install_zip(self, data: bytes, version: str | None) -> None:
        """Unpack the release and swap it in for the running copy (takes effect after a restart)."""
        target = Path(__file__).parent
        with tempfile.TemporaryDirectory(dir=target.parent) as tmp:
            tmpdir = Path(tmp)
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                for info in zf.infolist():
                    dest = (tmpdir / info.filename).resolve()
                    if not str(dest).startswith(str(tmpdir.resolve())):
                        raise UpdateError("the zip contains unsafe paths", "bad")
                zf.extractall(tmpdir)
            # The release may hold custom_components/hatickersec/, hatickersec/, or the files at the top.
            found = None
            for mf in sorted(tmpdir.rglob("manifest.json"), key=lambda p: len(p.parts)):
                try:
                    info = json.loads(mf.read_text(encoding="utf-8"))
                except ValueError:
                    continue
                if info.get("domain") == DOMAIN:
                    found = (mf.parent, info)
                    break
            if not found:
                raise UpdateError("the zip has no HATickerSec integration in it", "bad")
            src, info = found
            if version and str(info.get("version")) != str(version):
                raise UpdateError(f"the zip holds version {info.get('version')}, but latest.json says {version}", "bad")
            staged = target.parent / f".{DOMAIN}_new"
            old = target.parent / f".{DOMAIN}_old"
            shutil.rmtree(staged, ignore_errors=True)
            shutil.rmtree(old, ignore_errors=True)
            shutil.copytree(src, staged)
            target.rename(old)
            try:
                staged.rename(target)
            except OSError:
                old.rename(target)
                raise
            shutil.rmtree(old, ignore_errors=True)
