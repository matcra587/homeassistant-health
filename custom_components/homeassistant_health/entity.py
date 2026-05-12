"""Base entity for Home Assistant Health."""

from __future__ import annotations

from typing import Any

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import HomeAssistantHealthCoordinator
from .models import HealthEntityPayload


class HomeAssistantHealthEntity(CoordinatorEntity[HomeAssistantHealthCoordinator]):
    """Base entity backed by one API entity payload."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: HomeAssistantHealthCoordinator,
        entity: HealthEntityPayload,
    ) -> None:
        """Initialize the entity."""
        super().__init__(coordinator)
        self._unique_id = entity["uniqueId"]
        self._attr_unique_id = self._unique_id
        self._attr_name = entity["name"]
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entity["deviceId"])},
            name=entity["deviceName"],
            manufacturer="matcra587",
            model="Home Assistant Health profile",
        )

    @property
    def api_entity(self) -> HealthEntityPayload | None:
        """Return the current API entity payload."""
        return self.coordinator.entity(self._unique_id)

    @property
    def available(self) -> bool:
        """Return if the entity is available."""
        return super().available and self.api_entity is not None

    @property
    def icon(self) -> str | None:
        """Return the icon."""
        entity = self.api_entity
        return None if entity is None else entity.get("icon")

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Return extra state attributes."""
        entity = self.api_entity
        if entity is None:
            return None
        attributes = entity.get("attributes")
        return attributes if isinstance(attributes, dict) else None
