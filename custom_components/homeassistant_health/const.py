"""Constants for the Home Assistant Health integration."""

from datetime import timedelta

from homeassistant.const import Platform

DOMAIN = "homeassistant_health"

CONF_TOKEN = "token"
CONF_URL = "url"

DEFAULT_URL = "http://local-homeassistant-health:3000"
ENDPOINT = "/api/native/v1/entities"
SCAN_INTERVAL = timedelta(minutes=1)

PLATFORMS = [Platform.BINARY_SENSOR, Platform.SENSOR]
