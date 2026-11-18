"""HATickerSec — Breaking News feeds for Home Assistant.

Live headlines from the sources you choose, scrolling in glass ticker bars on
your dashboards (and docked across every Home Assistant screen).
"""
from __future__ import annotations

from pathlib import Path

import voluptuous as vol

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, Platform
from homeassistant.core import CoreState, HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, PANEL_URL, URL_BASE, VERSION
from .engine import TickerEngine
from .websocket import async_register_commands

PLATFORMS = [Platform.BUTTON, Platform.SENSOR, Platform.SWITCH, Platform.UPDATE]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
FRONTEND = Path(__file__).parent / "frontend"
PREVIEWS = ["new", "keyword", "breaking", "glow", "popup-keyword", "popup-breaking", "ha", "chime", "chime-breaking", "everything"]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Serve the ticker card / docked tickers on every Home Assistant page."""
    await hass.http.async_register_static_paths([StaticPathConfig(URL_BASE, str(FRONTEND), False)])
    frontend.add_extra_js_url(hass, f"{URL_BASE}/hatickersec.js?v={VERSION}")
    async_register_commands(hass)
    _register_services(hass)
    return True


def _engine(hass: HomeAssistant) -> TickerEngine:
    engine = hass.data.get(DOMAIN)
    if engine is None:
        raise ServiceValidationError("HATickerSec is not set up")
    return engine


@callback
def _register_services(hass: HomeAssistant) -> None:
    async def refresh(call: ServiceCall) -> None:
        await _engine(hass).async_refresh()

    async def preview(call: ServiceCall) -> None:
        await _engine(hass).async_demo(call.data["kind"])

    async def test_alert(call: ServiceCall) -> None:
        await _engine(hass).async_alert_test("notify")

    async def toggle_category(call: ServiceCall) -> None:
        _engine(hass).toggle_category(call.data["category"], call.data.get("collapsed"))

    hass.services.async_register(DOMAIN, "refresh", refresh)
    hass.services.async_register(DOMAIN, "preview", preview, vol.Schema({vol.Required("kind"): vol.In(PREVIEWS)}))
    hass.services.async_register(DOMAIN, "test_alert", test_alert)
    hass.services.async_register(DOMAIN, "toggle_category", toggle_category,
                                 vol.Schema({vol.Required("category"): cv.string, vol.Optional("collapsed"): cv.boolean}))


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    engine = TickerEngine(hass, entry)
    await engine.async_load()
    hass.data[DOMAIN] = engine
    entry.runtime_data = engine

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="hatickersec-panel",
        frontend_url_path=PANEL_URL,
        module_url=f"{URL_BASE}/hatickersec-panel.js?v={VERSION}",
        sidebar_title="HATickerSec",
        sidebar_icon="mdi:newspaper-variant-multiple",
        require_admin=True,
        config={"version": VERSION},
    )
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    if hass.state is CoreState.running:
        hass.async_create_background_task(engine.async_start(), f"{DOMAIN}_start")
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, engine.async_start)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        frontend.async_remove_panel(hass, PANEL_URL)
        engine: TickerEngine = hass.data.pop(DOMAIN)
        await engine.async_stop()
    return ok


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Removing HATickerSec forgets its settings, so adding it again starts fresh."""
    from homeassistant.helpers.storage import Store
    await Store(hass, 1, f"{DOMAIN}.settings").async_remove()
    await Store(hass, 1, f"{DOMAIN}.alerts_seen").async_remove()
