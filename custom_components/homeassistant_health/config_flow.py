"""Config flow for Home Assistant Health."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

import voluptuous as vol
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.service_info.hassio import HassioServiceInfo

from .api import (
    HomeAssistantHealthApiError,
    HomeAssistantHealthAuthError,
    HomeAssistantHealthClient,
)
from .const import CONF_TOKEN, CONF_URL, DEFAULT_URL, DOMAIN


def _schema(default_url: str = DEFAULT_URL) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(CONF_URL, default=default_url): str,
            vol.Optional(CONF_TOKEN): str,
        }
    )


def _valid_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


class HomeAssistantHealthConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Home Assistant Health."""

    VERSION = 1
    MINOR_VERSION = 1

    _hassio_discovery: HassioServiceInfo | None = None

    async def _test_connection(self, url: str, token: str = "") -> str | None:
        """Test add-on API access."""
        client = HomeAssistantHealthClient(
            async_get_clientsession(self.hass),
            url,
            token,
        )
        try:
            payload = await client.async_get_entities()
        except HomeAssistantHealthAuthError:
            return "invalid_auth"
        except HomeAssistantHealthApiError:
            return "cannot_connect"

        household = payload.get("household")
        household_id = household.get("id") if household is not None else None
        await self.async_set_unique_id(f"{DOMAIN}_{household_id or url}")
        self._abort_if_unique_id_configured(updates={CONF_URL: url, CONF_TOKEN: token})
        return None

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Handle manual setup."""
        errors: dict[str, str] = {}

        if user_input is not None:
            url = user_input[CONF_URL].rstrip("/")
            token = user_input.get(CONF_TOKEN, "").strip()

            if not _valid_url(url):
                errors[CONF_URL] = "invalid_url"
            elif error := await self._test_connection(url, token):
                errors["base"] = error
            else:
                return self.async_create_entry(
                    title="Home Assistant Health",
                    data={CONF_URL: url, CONF_TOKEN: token},
                )

        return self.async_show_form(
            step_id="user",
            data_schema=_schema(user_input[CONF_URL] if user_input else DEFAULT_URL),
            errors=errors,
        )

    async def async_step_hassio(
        self, discovery_info: HassioServiceInfo
    ) -> ConfigFlowResult:
        """Handle Supervisor app discovery."""
        self._hassio_discovery = discovery_info
        self.context.update(
            {
                "title_placeholders": {"name": discovery_info.name},
                "configuration_url": f"homeassistant://hassio/addon/{discovery_info.slug}/info",
            }
        )
        return await self.async_step_hassio_confirm()

    async def async_step_hassio_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Confirm setup from Supervisor discovery."""
        if self._hassio_discovery is None:
            return self.async_abort(reason="cannot_connect")

        config = self._hassio_discovery.config
        url = str(config.get("uri") or config.get(CONF_URL) or "").rstrip("/")
        token = str(config.get(CONF_TOKEN) or "").strip()

        if not url and config.get("host") and config.get("port"):
            url = f"http://{config['host']}:{config['port']}"

        if user_input is not None:
            if not _valid_url(url):
                return self.async_abort(reason="invalid_url")
            if error := await self._test_connection(url, token):
                return self.async_abort(reason=error)
            return self.async_create_entry(
                title=self._hassio_discovery.name,
                data={CONF_URL: url, CONF_TOKEN: token},
            )

        return self.async_show_form(
            step_id="hassio_confirm",
            description_placeholders={"addon": self._hassio_discovery.name},
        )
