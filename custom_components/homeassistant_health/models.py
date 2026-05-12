"""Typed payloads for the Home Assistant Health API."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict

type NativeValue = str | int | float | bool | None


class HealthEntityPayload(TypedDict):
    """Entity payload returned by the add-on native integration API."""

    uniqueId: str
    name: str
    deviceId: str
    deviceName: str
    component: str
    nativeValue: NotRequired[NativeValue]
    unitOfMeasurement: NotRequired[str]
    deviceClass: NotRequired[str]
    stateClass: NotRequired[str]
    icon: NotRequired[str]
    attributes: NotRequired[dict[str, Any]]


class HealthHouseholdPayload(TypedDict, total=False):
    """Household metadata returned by the add-on native integration API."""

    id: str


class HealthApiPayload(TypedDict):
    """Top-level native integration API payload."""

    version: int
    entities: list[HealthEntityPayload]
    household: NotRequired[HealthHouseholdPayload]
