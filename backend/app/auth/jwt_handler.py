"""JWT verification. HS256 by default; secret from JWT_SECRET; the driver ID
is read from the claim named by JWT_DRIVER_CLAIM (default "sub")."""
from __future__ import annotations

import hmac
import os
from typing import Optional

import jwt  # PyJWT


class AuthError(Exception):
    pass


def verify_token(token: Optional[str], secret: Optional[str] = None) -> str:
    secret = secret or os.environ.get("JWT_SECRET")
    if not secret:
        raise AuthError("server has no JWT secret configured")
    if not token:
        raise AuthError("missing token")
    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"], options={"require": ["exp"]})
    except jwt.PyJWTError as e:
        raise AuthError("invalid token") from e
    driver_id = claims.get(os.environ.get("JWT_DRIVER_CLAIM", "sub"))
    if not driver_id:
        raise AuthError("token has no driver id")
    return str(driver_id)


def require_driver(token: Optional[str], driver_id: Optional[str]) -> str:
    """Return the authenticated driver ID; raise if it differs from `driver_id`."""
    authed = verify_token(token)
    if not driver_id or not hmac.compare_digest(authed.encode(), str(driver_id).encode()):
        raise AuthError("driver id does not match token")
    return authed
