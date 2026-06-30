"""
Flask middleware for fayda-sdk.

Usage:
    from fayda_sdk import FaydaClient
    from fayda_sdk.middleware.flask import FaydaFlask, fayda_login_required

    client = FaydaClient(client_id=..., private_key_b64=..., redirect_uri=...)
    fayda = FaydaFlask(app, client)          # wires /login and /auth/callback

    @app.route("/dashboard")
    @fayda_login_required
    def dashboard():
        from flask import g
        return f"Hello {g.fayda_user['name']}"
"""
from __future__ import annotations

from functools import wraps
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from fayda_sdk.client import FaydaClient


def fayda_login_required(f: Callable) -> Callable:
    """Decorator that redirects unauthenticated requests to /login.

    Sets g.fayda_user for the duration of the request.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import g, redirect, session
        if "fayda_user" not in session:
            return redirect("/login")
        g.fayda_user = session["fayda_user"]
        return f(*args, **kwargs)
    return decorated


class FaydaFlask:
    """Wires Fayda login and callback routes onto a Flask app.

    Args:
        app:          Flask application instance.
        client:       Configured FaydaClient.
        login_path:   Route that starts the login redirect (default /login).
        callback_path: Route Fayda redirects back to (default /auth/callback).
        after_login:  Where to send the user after success (default /).
        after_logout: Where to send the user after logout (default /).
    """

    def __init__(
        self,
        app,
        client: "FaydaClient",
        login_path: str = "/login",
        callback_path: str = "/auth/callback",
        after_login: str = "/",
        after_logout: str = "/",
    ) -> None:
        self.client = client

        @app.route(login_path)
        def _fayda_login():
            from flask import redirect, session
            result = client.auth.get_authorization_url()
            session["fayda_state"] = result.state
            session["fayda_verifier"] = result.code_verifier
            return redirect(result.url)

        @app.route(callback_path)
        def _fayda_callback():
            from flask import redirect, request, session
            if "error" in request.args:
                return f"Login failed: {request.args['error']}", 400
            try:
                user = client.userinfo.get_from_code(
                    code=request.args["code"],
                    state=request.args["state"],
                    expected_state=session.pop("fayda_state", ""),
                    code_verifier=session.pop("fayda_verifier", ""),
                )
            except Exception as exc:
                return f"Auth error: {exc}", 400
            session["fayda_user"] = {
                "sub": user.sub,
                "name": user.name,
                "name_am": user.name_am,
                "email": user.email,
                "phone_number": user.phone_number,
                "picture": user.picture,
            }
            return redirect(after_login)

        @app.route("/logout")
        def _fayda_logout():
            from flask import redirect, session
            session.pop("fayda_user", None)
            return redirect(after_logout)
