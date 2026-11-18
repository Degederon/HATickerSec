"""HATickerSec buttons: refresh now, check for updates."""
from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .entity import HATickerSecEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    engine = entry.runtime_data
    add([RefreshButton(engine), CheckUpdatesButton(engine)])


class RefreshButton(HATickerSecEntity, ButtonEntity):
    _attr_icon = "mdi:refresh"

    def __init__(self, engine) -> None:
        super().__init__(engine, "refresh")

    async def async_press(self) -> None:
        await self.engine.async_refresh()


class CheckUpdatesButton(HATickerSecEntity, ButtonEntity):
    _attr_icon = "mdi:cloud-search"
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, engine) -> None:
        super().__init__(engine, "check_updates")

    async def async_press(self) -> None:
        await self.engine.updater.async_check(True)
