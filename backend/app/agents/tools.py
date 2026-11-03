"""The only functions specialist agents may call."""
from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional, Protocol

try:
    from app.auth.auth import AuthError, require_driver
except ImportError:
    try:
        from ..auth.auth import AuthError, require_driver
    except ImportError:
        from auth import AuthError, require_driver


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
    return _b().zone_forecast(str(zone_id).strip())


def get_driver_earnings(driver_id: str, token: str) -> Optional[Dict[str, Any]]:
    authed = require_driver(token, driver_id)
    return _b().driver_earnings(authed)


def get_onboarding_checklist(driver_id: str, token: str) -> Optional[List[Dict[str, Any]]]:
    authed = require_driver(token, driver_id)
    return _b().onboarding_checklist(authed)


TOOLS: Dict[str, Callable[..., Any]] = {
    "get_zone_forecast": get_zone_forecast,
    "get_driver_earnings": get_driver_earnings,
    "get_onboarding_checklist": get_onboarding_checklist,
}
