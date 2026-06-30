"""
Django example: Login with Fayda ID

Setup:
    pip install django fayda-sdk

    # settings.py
    FAYDA_CLIENT_ID = "your-client-id"
    FAYDA_PRIVATE_KEY_B64 = "base64-encoded-jwk"
    FAYDA_REDIRECT_URI = "http://yourapp.et/auth/callback"
    SESSION_ENGINE = "django.contrib.sessions.backends.db"

    # urls.py
    urlpatterns = [
        path("login/", views.login, name="login"),
        path("auth/callback", views.callback, name="callback"),
        path("profile/", views.profile, name="profile"),
        path("logout/", views.logout_view, name="logout"),
    ]
"""

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_GET

from fayda_sdk import FaydaClient

_client = FaydaClient(
    client_id=settings.FAYDA_CLIENT_ID,
    private_key_b64=settings.FAYDA_PRIVATE_KEY_B64,
    redirect_uri=settings.FAYDA_REDIRECT_URI,
)


@require_GET
def login(request: HttpRequest) -> HttpResponse:
    """Step 1 — generate PKCE + state, redirect to Fayda."""
    result = _client.auth.get_authorization_url(
        claims={"userinfo": {"name": {"essential": True}}}
    )
    request.session["fayda_state"] = result.state
    request.session["fayda_code_verifier"] = result.code_verifier
    return redirect(result.url)


@require_GET
def callback(request: HttpRequest) -> HttpResponse:
    """Step 2 — exchange code for tokens and fetch user."""
    code = request.GET.get("code")
    state = request.GET.get("state")
    error = request.GET.get("error")

    if error:
        return HttpResponse(f"Auth error: {request.GET.get('error_description', error)}", status=400)

    if not code or not state:
        return HttpResponse("Missing code or state", status=400)

    expected_state = request.session.pop("fayda_state", None)
    code_verifier = request.session.pop("fayda_code_verifier", None)

    if not expected_state or not code_verifier:
        return HttpResponse("Session expired", status=400)

    try:
        user = _client.userinfo.get_from_code(
            code=code,
            state=state,
            expected_state=expected_state,
            code_verifier=code_verifier,
        )
    except Exception as exc:
        return HttpResponse(f"Login failed: {exc}", status=400)

    request.session["fayda_user"] = {
        "sub": user.sub,
        "name": user.name,
        "name_am": user.name_am,
        "name_en": user.name_en,
        "email": user.email,
        "phone_number": user.phone_number,
    }
    return redirect("/profile/")


@require_GET
def profile(request: HttpRequest) -> JsonResponse:
    """Protected page — show user data."""
    user_data = request.session.get("fayda_user")
    if not user_data:
        return redirect("/login/")
    return JsonResponse(user_data)


@require_GET
def logout_view(request: HttpRequest) -> HttpResponse:
    """Clear session and return to home."""
    request.session.flush()
    return redirect("/")
