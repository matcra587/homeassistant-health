"""Client for the Home Assistant Health add-on API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, cast

from aiohttp import ClientError, ClientSession, ClientTimeout

from .const import ENDPOINT
from .models import HealthApiPayload


class HomeAssistantHealthApiError(Exception):
    """Base API error."""


class HomeAssistantHealthAuthError(HomeAssistantHealthApiError):
    """Authentication failed."""


def _validate_payload(payload: Any) -> HealthApiPayload:
    """Validate and type the API payload shape used by Home Assistant entities."""
    if not isinstance(payload, dict) or payload.get("version") != 1:
        raise HomeAssistantHealthApiError("Unexpected API payload")

    entities = payload.get("entities")
    if not isinstance(entities, list):
        raise HomeAssistantHealthApiError("Missing entities list")

    required_entity_keys = ("uniqueId", "name", "deviceId", "deviceName", "component")
    for entity in entities:
        if not isinstance(entity, dict):
            raise HomeAssistantHealthApiError("Invalid entity payload")
        for key in required_entity_keys:
            if not isinstance(entity.get(key), str):
                raise HomeAssistantHealthApiError(f"Invalid entity payload: {key}")

    household = payload.get("household")
    if household is not None and not isinstance(household, dict):
        raise HomeAssistantHealthApiError("Invalid household payload")
    if (
        isinstance(household, dict)
        and "id" in household
        and not isinstance(household["id"], str)
    ):
        raise HomeAssistantHealthApiError("Invalid household payload: id")

    return cast(HealthApiPayload, payload)


@dataclass(slots=True)
class HomeAssistantHealthClient:
    """Small async client for the add-on native integration endpoint."""

    session: ClientSession
    url: str
    token: str = ""

    async def async_get_entities(self) -> HealthApiPayload:
        """Fetch the current native entity payload."""
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        try:
            async with self.session.get(
                f"{self.url.rstrip('/')}{ENDPOINT}",
                headers=headers,
                timeout=ClientTimeout(total=10),
            ) as response:
                if response.status in (401, 403):
                    raise HomeAssistantHealthAuthError
                response.raise_for_status()
                payload = await response.json()
        except HomeAssistantHealthAuthError:
            raise
        except (ClientError, TimeoutError) as err:
            raise HomeAssistantHealthApiError from err

        return _validate_payload(payload)
