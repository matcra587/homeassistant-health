"""Data update coordinator for Home Assistant Health."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import (
    HomeAssistantHealthApiError,
    HomeAssistantHealthAuthError,
    HomeAssistantHealthClient,
)
from .const import DOMAIN, SCAN_INTERVAL
from .models import HealthApiPayload, HealthEntityPayload

_LOGGER = logging.getLogger(__name__)


class HomeAssistantHealthCoordinator(DataUpdateCoordinator[HealthApiPayload]):
    """Poll the add-on once and fan the payload out to entities."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        client: HomeAssistantHealthClient,
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            config_entry=entry,
            update_interval=SCAN_INTERVAL,
            always_update=False,
        )
        self.client = client

    async def _async_update_data(self) -> HealthApiPayload:
        """Fetch data from the add-on."""
        try:
            return await self.client.async_get_entities()
        except HomeAssistantHealthAuthError as err:
            raise ConfigEntryAuthFailed from err
        except HomeAssistantHealthApiError as err:
            raise UpdateFailed(f"Error communicating with add-on: {err}") from err

    def entities_for_component(self, component: str) -> list[HealthEntityPayload]:
        """Return API entities for one HA platform."""
        if self.data is None:
            return []
        return [
            entity
            for entity in self.data["entities"]
            if entity["component"] == component
        ]

    def entity(self, unique_id: str) -> HealthEntityPayload | None:
        """Return one API entity by unique ID."""
        for entity in self.entities_for_component(
            "sensor"
        ) + self.entities_for_component("binary_sensor"):
            if entity["uniqueId"] == unique_id:
                return entity
        return None
