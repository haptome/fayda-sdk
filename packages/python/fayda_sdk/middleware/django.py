"""
Django middleware for fayda-sdk.

Usage:
    # urls.py
    from fayda_sdk.middleware.django import FaydaLoginView, FaydaCallbackView
    from yourapp.auth import fayda_client   # your configured FaydaClient

    class MyCallbackView(FaydaCallbackView):
        client = fayda_client
        success_url = "/dashboard"

    urlpatterns = [
        path("login/", FaydaLoginView.as_view(client=fayda_client), name="fayda_login"),
        path("auth/callback/", MyCallbackView.as_view(), name="fayda_callback"),
    ]

    # views.py (function-based)
    @fayda_login_required
    def dashboard(request):
        user = request.session["fayda_user"]
        return HttpResponse(f"Hello {user['name']}")

    # views.py (class-based)
    class DashboardView(FaydaLoginRequiredMixin, View):
        def get(self, request):
            user = request.session["fayda_user"]
            return HttpResponse(f"Hello {user['name']}")
"""
from __future__ import annotations

from functools import wraps
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from fayda_sdk.client import FaydaClient


def fayda_login_required(view_func: Callable) -> Callable:
    """Decorator that redirects unauthenticated requests to the fayda_login URL."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        from django.shortcuts import redirect
        if "fayda_user" not in request.session:
            return redirect("fayda_login")
        return view_func(request, *args, **kwargs)
    return wrapper


class FaydaLoginRequiredMixin:
    """Mixin for class-based views that enforces Fayda authentication."""

    def dispatch(self, request, *args, **kwargs):
        from django.shortcuts import redirect
        if "fayda_user" not in request.session:
            return redirect("fayda_login")
        return super().dispatch(request, *args, **kwargs)  # type: ignore[misc]


class FaydaLoginView:
    """View that starts the Fayda login redirect.

    Usage:
        path("login/", FaydaLoginView.as_view(client=fayda_client), name="fayda_login")
    """
    client: "FaydaClient"

    @classmethod
    def as_view(cls, **kwargs):
        from django.views import View

        client = kwargs.pop("client")

        class _View(View):
            def get(self, request):
                from django.shortcuts import redirect
                result = client.auth.get_authorization_url()
                request.session["fayda_state"] = result.state
                request.session["fayda_verifier"] = result.code_verifier
                return redirect(result.url)

        return _View.as_view(**kwargs)


class FaydaCallbackView:
    """Base view for the OAuth callback. Subclass and set client + success_url.

    Usage:
        class MyCallback(FaydaCallbackView):
            client = fayda_client
            success_url = "/dashboard"
    """
    client: "FaydaClient"
    success_url: str = "/"

    @classmethod
    def as_view(cls, **kwargs):
        from django.views import View

        outer_client = getattr(cls, "client", kwargs.pop("client", None))
        outer_success_url = getattr(cls, "success_url", "/")

        class _View(View):
            def get(self, request):
                from django.http import HttpResponseBadRequest
                from django.shortcuts import redirect
                if "error" in request.GET:
                    return HttpResponseBadRequest(f"Login error: {request.GET['error']}")
                try:
                    user = outer_client.userinfo.get_from_code(
                        code=request.GET["code"],
                        state=request.GET["state"],
                        expected_state=request.session.pop("fayda_state", ""),
                        code_verifier=request.session.pop("fayda_verifier", ""),
                    )
                except Exception as exc:
                    return HttpResponseBadRequest(f"Auth error: {exc}")
                request.session["fayda_user"] = {
                    "sub": user.sub,
                    "name": user.name,
                    "name_am": user.name_am,
                    "email": user.email,
                    "phone_number": user.phone_number,
                    "picture": user.picture,
                }
                return redirect(outer_success_url)

        return _View.as_view(**kwargs)
