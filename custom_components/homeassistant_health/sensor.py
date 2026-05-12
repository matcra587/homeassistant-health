"""Sensor platform for Home Assistant Health."""

from __future__ import annotations

from typing import cast

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfMass, UnitOfTime
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .coordinator import HomeAssistantHealthCoordinator
from .entity import HomeAssistantHealthEntity

UNIT_MAP = {
    "%": PERCENTAGE,
    "d": UnitOfTime.DAYS,
    "kg": UnitOfMass.KILOGRAMS,
}
DEVICE_CLASS_MAP = {
    "weight": SensorDeviceClass.WEIGHT,
}
STATE_CLASS_MAP: dict[str, SensorStateClass] = {
    "measurement": SensorStateClass.MEASUREMENT,
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Home Assistant Health sensors."""
    coordinator = cast(HomeAssistantHealthCoordinator, entry.runtime_data)
    seen: set[str] = set()

    @callback
    def add_entities() -> None:
        new_entities = []
        for entity in coordinator.entities_for_component("sensor"):
            unique_id = entity["uniqueId"]
            if unique_id in seen:
                continue
            seen.add(unique_id)
            new_entities.append(HomeAssistantHealthSensor(coordinator, entity))

        if new_entities:
            async_add_entities(new_entities)

    add_entities()
    entry.async_on_unload(coordinator.async_add_listener(add_entities))


class HomeAssistantHealthSensor(HomeAssistantHealthEntity, SensorEntity):
    """Native Home Assistant Health sensor."""

    @property
    def native_value(self) -> str | int | float | None:
        """Return the native value."""
        entity = self.api_entity
        if entity is None:
            return None
        value = entity.get("nativeValue")
        if isinstance(value, bool):
            return None
        return value if isinstance(value, (str, int, float)) else None

    @property
    def native_unit_of_measurement(self) -> str | None:
        """Return the native unit."""
        entity = self.api_entity
        if entity is None:
            return None
        unit = entity.get("unitOfMeasurement")
        return None if unit is None else UNIT_MAP.get(unit, unit)

    @property
    def device_class(self) -> SensorDeviceClass | None:
        """Return the device class."""
        entity = self.api_entity
        if entity is None:
            return None
        device_class = entity.get("deviceClass")
        return None if device_class is None else DEVICE_CLASS_MAP.get(device_class)

    @property
    def state_class(self) -> SensorStateClass | None:
        """Return the state class."""
        entity = self.api_entity
        if entity is None:
            return None
        state_class = entity.get("stateClass")
        return None if state_class is None else STATE_CLASS_MAP.get(state_class)
