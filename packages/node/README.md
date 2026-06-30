# @fayda/sdk

TypeScript SDK for Ethiopia's Fayda National Digital ID (eSignet).

## Install

```bash
npm install @fayda/sdk
```

## Quick Start

```typescript
import { FaydaClient } from "@fayda/sdk";

const client = new FaydaClient({
  clientId: process.env.FAYDA_CLIENT_ID!,
  privateKeyBase64: process.env.FAYDA_PRIVATE_KEY!,
  redirectUri: "https://myapp.com/auth/callback",
});

// Step 1: Generate login URL
const { url, state, codeVerifier } = await client.auth.getAuthorizationUrl();
req.session.faydaState = state;
req.session.faydaVerifier = codeVerifier;
res.redirect(url);

// Step 2: Handle callback
const user = await client.userinfo.getFromCode({
  code: req.query.code as string,
  state: req.query.state as string,
  expectedState: req.session.faydaState,
  codeVerifier: req.session.faydaVerifier,
});
```

## NestJS Integration

```typescript
import { FaydaModule, FaydaService } from "@fayda/sdk/nestjs";

@Module({
  imports: [
    FaydaModule.forRoot({
      clientId: "...",
      privateKeyBase64: "...",
      redirectUri: "...",
    }),
  ],
})
export class AppModule {}

@Controller("auth")
export class AuthController {
  constructor(private readonly fayda: FaydaService) {}

  @Get("login")
  async login() {
    const { url, state, codeVerifier } = await this.fayda.getAuthorizationUrl();
    // Store state + verifier in session...
    return { redirect: url };
  }
}
```

## Environment Variables

| Variable | Description |
|---|---|
| `FAYDA_CLIENT_ID` | Your eSignet client ID |
| `FAYDA_PRIVATE_KEY` | Base64-encoded JWK private key |
| `FAYDA_REDIRECT_URI` | OAuth callback URL |
| `FAYDA_SANDBOX` | Set to "true" for sandbox mode (optional) |

## Error Handling

```typescript
import {
  FaydaAuthError,
  FaydaTokenError,
  FaydaInvalidTransactionError,
} from "@fayda/sdk";

try {
  const user = await client.userinfo.getFromCode(params);
} catch (error) {
  if (error instanceof FaydaAuthError) {
    console.error("CSRF attack detected!");
  } else if (error instanceof FaydaInvalidTransactionError) {
    console.error("Auth flow interrupted");
  } else if (error instanceof FaydaTokenError) {
    console.error("Token error:", error.message);
  }
}
```

## Full Documentation

See [FAYDA_SDK_SPEC.md](../../docs/FAYDA_SDK_SPEC.md) for the complete API reference.
