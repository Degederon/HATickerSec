"""HATickerSec update entity: shows and installs new versions from your update folder."""
from __future__ import annotations

from typing import Any

from homeassistant.components.update import UpdateEntity, UpdateEntityFeature
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import VERSION
from .entity import HATickerSecEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    add([HATickerSecUpdate(entry.runtime_data)])


class HATickerSecUpdate(HATickerSecEntity, UpdateEntity):
    _attr_supported_features = UpdateEntityFeature.INSTALL | UpdateEntityFeature.PROGRESS
    _attr_title = "HATickerSec"

    def __init__(self, engine) -> None:
        super().__init__(engine, "app_update")

    @property
    def _st(self) -> dict:
        return self.engine.updater.state

    @property
    def installed_version(self) -> str:
        return VERSION

    @property
    def latest_version(self) -> str:
        st = self._st
        if st.get("status") in ("available", "downloading", "installed") and st.get("version"):
            return st["version"]
        return VERSION

    @property
    def release_summary(self) -> str | None:
        st = self._st
        if st.get("status") == "installed":
            return "Installed — restart Home Assistant to finish."
        if st.get("status") in ("error", "signin") and st.get("error"):
            return f"⚠️ {st['error']}"[:255]
        return (st.get("notes") or None) and st["notes"][:255]

    @property
    def in_progress(self) -> bool:
        return self._st.get("status") == "downloading"

    @property
    def update_percentage(self) -> int | None:
        return self._st.get("progress") if self.in_progress else None

    async def async_install(self, version: str | None, backup: bool, **kwargs: Any) -> None:
        await self.engine.updater.async_install()
