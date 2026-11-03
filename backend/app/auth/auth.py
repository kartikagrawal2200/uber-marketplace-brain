"""JWT verification. HS256 by default; secret from JWT_SECRET; the driver ID
is read from the claim named by JWT_DRIVER_CLAIM (default "sub")."""
from __future__ import annotations

import hmac
import os
from typing import Optional

try:
    import jwt
except ImportError:
    from jose import jwt


class AuthError(Exception):
    pass


def verify_token(token: str, secret: Optional[str] = None) -> str:
    """Returns the authenticated driver ID string, or raises AuthError."""
    if not token or not isinstance(token, str):
        raise AuthError("missing token")
    token = token.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    secret = secret or os.environ.get("JWT_SECRET", "uber-marketplace-brain-secret-key-2026")
    claim = os.environ.get("JWT_DRIVER_CLAIM", "sub")
    alg = os.environ.get("JWT_ALGORITHM", "HS256")

    try:
        payload = jwt.decode(token, secret, algorithms=[alg])
    except Exception as e:
        raise AuthError(f"invalid token: {e}") from e

    driver_id = payload.get(claim)
    if not driver_id:
        raise AuthError(f"token missing claim: {claim}")
    return str(driver_id)


def require_driver(token: Optional[str], claimed_driver_id: Optional[str]) -> str:
    """Validates the token and confirms it authorizes `claimed_driver_id`."""
    if not token:
        raise AuthError("authorization required")
    authed_id = verify_token(token)
    if claimed_driver_id and not hmac.compare_digest(authed_id, str(claimed_driver_id)):
        raise AuthError("driver_id does not match token subject")
    return authed_id
