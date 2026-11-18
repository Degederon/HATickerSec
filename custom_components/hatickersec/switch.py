"""HATickerSec switches: the master switch and the old tray-menu toggles."""
from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .entity import HATickerSecEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    engine = entry.runtime_data
    add([ActiveSwitch(engine), FlagSwitch(engine, "only_new", "onlyNew", "mdi:new-box"),
         FlagSwitch(engine, "paused", "paused", "mdi:pause-circle"),
         FlagSwitch(engine, "hidden", "hidden", "mdi:eye-off")])


class ActiveSwitch(HATickerSecEntity, SwitchEntity):
    """HATickerSec on/off: off = no tickers, fetching or alerts."""

    _attr_icon = "mdi:newspaper-variant-multiple"
    _attr_name = None   # the main feature: named after the device, switch.hatickersec

    def __init__(self, engine) -> None:
        super().__init__(engine, "active")
        self._attr_translation_key = None

    @property
    def is_on(self) -> bool:
        return self.engine.active

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.engine.async_set_active(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.engine.async_set_active(False)


class FlagSwitch(HATickerSecEntity, SwitchEntity):
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, engine, key: str, flag: str, icon: str) -> None:
        super().__init__(engine, key)
        self._flag = flag
        self._attr_icon = icon

    @property
    def is_on(self) -> bool:
        s = self.engine.settings
        return bool(s["display"].get("onlyNew") if self._flag == "onlyNew" else s.get(self._flag))

    async def async_turn_on(self, **kwargs: Any) -> None:
        self.engine.set_flag(self._flag, True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        self.engine.set_flag(self._flag, False)
