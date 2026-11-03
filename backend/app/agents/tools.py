"""The only functions specialist agents may call. Each returns data, or None
when nothing is found. Plug real data in with set_backend()."""
from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional, Protocol

from auth import AuthError, require_driver  # noqa: F401  (AuthError re-exported)


class Backend(Protocol):
    def zone_forecast(self, zone_id: str) -> Optional[Dict[str, Any]]: ...
    def driver_earnings(self, driver_id: str) -> Optional[Dict[str, Any]]: ...
    def onboarding_checklist(self, driver_id: str) -> Optional[List[Dict[str, Any]]]: ...


_backend: Optional[Backend] = None


def set_backend(b: Backend) -> None:
    global _backend
    _backend = b


def _b() -> Backend:
    if _backend is None:
        raise RuntimeError("tools backend not configured")
    return _backend


def get_zone_forecast(zone_id: str) -> Optional[Dict[str, Any]]:
    """e.g. {"zone": "Z1", "demand": 40, "supply": 25, "congestion": 0.3}"""
    return _b().zone_forecast(str(zone_id).strip())


def get_driver_earnings(driver_id: str, token: str) -> Optional[Dict[str, Any]]:
    """Rejects (AuthError) any driver_id that differs from the one in the JWT.
    The lookup uses the ID taken from the verified token, never the argument."""
    authed = require_driver(token, driver_id)
    return _b().driver_earnings(authed)


def get_onboarding_checklist(driver_id: str, token: str) -> Optional[List[Dict[str, Any]]]:
    """[{"item": "Upload licence", "done": False}, ...] for the authenticated driver."""
    authed = require_driver(token, driver_id)
    return _b().onboarding_checklist(authed)


TOOLS: Dict[str, Callable[..., Any]] = {
    "get_zone_forecast": get_zone_forecast,
    "get_driver_earnings": get_driver_earnings,
    "get_onboarding_checklist": get_onboarding_checklist,
}
