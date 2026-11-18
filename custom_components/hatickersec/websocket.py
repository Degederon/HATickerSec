"""Websocket commands used by the HATickerSec card, docked tickers and panel."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, VERSION
from .layout import CATEGORIES
from .presets import PRESETS


def _engine(hass: HomeAssistant, connection, msg) -> Any:
    engine = hass.data.get(DOMAIN)
    if engine is None:
        connection.send_error(msg["id"], "not_ready", "HATickerSec is not set up")
    return engine


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    for cmd in (ws_subscribe, ws_category, ws_set_flag, ws_set_active, ws_refresh, ws_settings_get, ws_settings_save,
                ws_feed_test, ws_translate_test, ws_demo, ws_alert_test, ws_update_state, ws_update_check, ws_update_install):
        websocket_api.async_register_command(hass, cmd)


# ── Everyone with a dashboard ──────────────────────────────────────
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Live config + headlines + alerts. Settings/status/update messages only go to admins."""
    engine = _engine(hass, connection, msg)
    if engine is None:
        return
    admin = connection.user is not None and connection.user.is_admin
    private = {"settings", "status", "update"}

    @callback
    def forward(data: dict) -> None:
        if data.get("kind") in private and not admin:
            return
        connection.send_message(websocket_api.event_message(msg["id"], data))

    connection.subscriptions[msg["id"]] = engine.subscribe(forward)
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "hatickersec/category", vol.Required("category"): str,
                                  vol.Optional("collapsed"): bool})
@callback
def ws_category(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    engine.toggle_category(msg["category"], msg.get("collapsed"))
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "hatickersec/set_flag",
                                  vol.Required("key"): vol.In(["paused", "hidden", "onlyNew"]), vol.Required("value"): bool})
@callback
def ws_set_flag(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    engine.set_flag(msg["key"], msg["value"])
    connection.send_result(msg["id"])


# ── Admin only (the HATickerSec panel) ───────────────────────────────
@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/set_active", vol.Required("on"): bool})
@websocket_api.async_response
async def ws_set_active(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    await engine.async_set_active(msg["on"])
    connection.send_result(msg["id"])


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/refresh"})
@callback
def ws_refresh(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    hass.async_create_task(engine.async_refresh())
    connection.send_result(msg["id"])


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/settings/get"})
@callback
def ws_settings_get(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], {
        "version": VERSION, "settings": engine.settings, "presets": PRESETS, "status": engine.status,
        "categories": CATEGORIES, "update": engine.updater.public_state(),
    })


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/settings/save", vol.Required("settings"): dict})
@websocket_api.async_response
async def ws_settings_save(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], await engine.async_save_settings(msg["settings"]))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/feed_test", vol.Required("url"): str})
@websocket_api.async_response
async def ws_feed_test(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], await engine.async_feed_test(msg["url"]))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/translate_test", vol.Required("cfg"): dict})
@websocket_api.async_response
async def ws_translate_test(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], await engine.async_translate_test(msg["cfg"]))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/demo", vol.Required("kind"): str})
@websocket_api.async_response
async def ws_demo(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], await engine.async_demo(msg["kind"]))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/alert_test", vol.Required("kind"): str})
@websocket_api.async_response
async def ws_alert_test(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], await engine.async_alert_test(msg["kind"]))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/update/state"})
@callback
def ws_update_state(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], engine.updater.public_state())


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/update/check"})
@websocket_api.async_response
async def ws_update_check(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], await engine.updater.async_check(True))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "hatickersec/update/install"})
@websocket_api.async_response
async def ws_update_install(hass, connection, msg) -> None:
    if (engine := _engine(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], await engine.updater.async_install())
