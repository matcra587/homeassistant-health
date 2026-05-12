"""Binary sensor platform for Home Assistant Health."""

from __future__ import annotations

from typing import cast

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .coordinator import HomeAssistantHealthCoordinator
from .entity import HomeAssistantHealthEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Home Assistant Health binary sensors."""
    coordinator = cast(HomeAssistantHealthCoordinator, entry.runtime_data)
    seen: set[str] = set()

    @callback
    def add_entities() -> None:
        new_entities = []
        for entity in coordinator.entities_for_component("binary_sensor"):
            unique_id = entity["uniqueId"]
            if unique_id in seen:
                continue
            seen.add(unique_id)
            new_entities.append(HomeAssistantHealthBinarySensor(coordinator, entity))

        if new_entities:
            async_add_entities(new_entities)

    add_entities()
    entry.async_on_unload(coordinator.async_add_listener(add_entities))


class HomeAssistantHealthBinarySensor(HomeAssistantHealthEntity, BinarySensorEntity):
    """Native Home Assistant Health binary sensor."""

    @property
    def is_on(self) -> bool | None:
        """Return true if the binary sensor is on."""
        entity = self.api_entity
        if entity is None:
            return None
        value = entity.get("nativeValue")
        return value if isinstance(value, bool) else None
