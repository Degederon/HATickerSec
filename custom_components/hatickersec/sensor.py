"""HATickerSec sensors: last update, headline count, latest alert."""
from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .entity import HATickerSecEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    engine = entry.runtime_data
    add([LastUpdated(engine), Headlines(engine), LatestAlert(engine)])


class LastUpdated(HATickerSecEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_icon = "mdi:update"

    def __init__(self, engine) -> None:
        super().__init__(engine, "last_updated")

    @property
    def native_value(self):
        return self.engine.fetched_at()

    @property
    def extra_state_attributes(self) -> dict:
        st = self.engine.status
        bad = {i: s.get("error") for i, s in st.items() if not s.get("ok")}
        return {"sources_ok": sum(1 for s in st.values() if s.get("ok")), "sources_failing": len(bad),
                "failing": dict(list(bad.items())[:20])}


class Headlines(HATickerSecEntity, SensorEntity):
    _attr_icon = "mdi:newspaper"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "headlines"

    def __init__(self, engine) -> None:
        super().__init__(engine, "headlines")

    @property
    def native_value(self) -> int:
        return self.engine.headline_count()

    @property
    def extra_state_attributes(self) -> dict:
        return {"sources": len(self.engine.settings["enabled"])}


class LatestAlert(HATickerSecEntity, SensorEntity):
    """The newest keyword or breaking headline (attributes say why)."""

    _attr_icon = "mdi:bell-alert"

    def __init__(self, engine) -> None:
        super().__init__(engine, "latest_alert")

    @property
    def native_value(self) -> str | None:
        a = self.engine.latest_alert
        return a["title"][:255] if a else None

    @property
    def extra_state_attributes(self) -> dict:
        a = self.engine.latest_alert or {}
        return {k: a.get(k) for k in ("agency", "why", "breaking", "keywords", "link", "time")}
