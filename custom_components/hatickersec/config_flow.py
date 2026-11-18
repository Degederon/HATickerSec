"""Adding HATickerSec: the welcome step — pick up to 4 categories and where the tickers go."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.helpers.selector import (
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)

from .const import DOMAIN, NAME
from .presets import PRESETS
from .starter import STARTER

MAX_CATEGORIES = 4


class HATickerSecConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        errors: dict[str, str] = {}
        if user_input is not None:
            cats = user_input.get("categories") or []
            if not cats:
                errors["categories"] = "pick_one"
            elif len(cats) > MAX_CATEGORIES:
                errors["categories"] = "too_many"
            else:
                return self.async_create_entry(
                    title=NAME, data={"welcome": {"categories": cats, "position": user_input["position"]}})

        names = {p["id"]: p["name"] for p in PRESETS}
        options = [
            SelectOptionDict(value=c["id"], label=f"{c['icon']}  {c['name']} — {c['desc']}  ({len(c['sources'])} source{'s' if len(c['sources']) != 1 else ''})")
            for c in STARTER
        ]
        schema = vol.Schema({
            vol.Required("categories", default=(user_input or {}).get("categories", ["us", "world"])):
                SelectSelector(SelectSelectorConfig(options=options, multiple=True, mode=SelectSelectorMode.LIST)),
            vol.Required("position", default=(user_input or {}).get("position", "bottom")):
                SelectSelector(SelectSelectorConfig(options=[
                    SelectOptionDict(value="bottom", label="Bottom of the screen"),
                    SelectOptionDict(value="top", label="Top of the screen"),
                    SelectOptionDict(value="card", label="Only in dashboard cards I add"),
                ], mode=SelectSelectorMode.LIST)),
        })
        return self.async_show_form(
            step_id="user", data_schema=schema, errors=errors,
            description_placeholders={"count": str(len(names))})
