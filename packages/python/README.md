# fayda-sdk

Python SDK for Ethiopia's Fayda National Digital ID (eSignet).

## Install

```bash
pip install fayda-sdk
```

## Quick Start

```python
from fayda_sdk import FaydaClient

client = FaydaClient(
    client_id=os.environ["FAYDA_CLIENT_ID"],
    private_key_b64=os.environ["FAYDA_PRIVATE_KEY"],
    redirect_uri="https://myapp.com/auth/callback",
)

# Step 1: Generate login URL
result = client.auth.get_authorization_url()
session["fayda_state"] = result.state
session["fayda_verifier"] = result.code_verifier
return redirect(result.url)

# Step 2: Handle callback
user = client.userinfo.get_from_code(
    code=request.args["code"],
    state=request.args["state"],
    expected_state=session["fayda_state"],
    code_verifier=session["fayda_verifier"],
)
```

## Environment Variables

| Variable | Description |
|---|---|
| `FAYDA_CLIENT_ID` | Your eSignet client ID |
| `FAYDA_PRIVATE_KEY` | Base64-encoded JWK private key |
| `FAYDA_REDIRECT_URI` | OAuth callback URL |
| `FAYDA_SANDBOX` | Set to "true" for sandbox mode (optional) |

## Async Support

Use `AsyncFaydaClient` for async/await:

```python
async with AsyncFaydaClient(...) as client:
    user = await client.userinfo.get_from_code(...)
```

## Error Handling

```python
from fayda_sdk.errors import FaydaAuthError, FaydaTokenError

try:
    user = client.userinfo.get_from_code(...)
except FaydaAuthError:
    return "Invalid state — possible CSRF attack"
except FaydaTokenError as e:
    return f"Token error: {e}"
```

## Full Documentation

See [FAYDA_SDK_SPEC.md](../../docs/FAYDA_SDK_SPEC.md) for the complete API reference.
