# Contributing to fayda-sdk

First off — thank you! Every contribution, from a typo fix to a new language port, helps make Fayda integration easier for Ethiopian developers.

---

## Ways to Contribute

| Type | Where to start |
|---|---|
| Bug report | [Open an issue](https://github.com/haptome/fayda-sdk/issues/new?template=bug_report.md) |
| Feature request | [Open a discussion](https://github.com/haptome/fayda-sdk/discussions) |
| Fix a bug | Pick an [open issue](https://github.com/haptome/fayda-sdk/issues) |
| Add a language port | Open a discussion first so we can align on the API contract |
| Improve docs or examples | PRs welcome — no issue needed for small fixes |
| Improve test coverage | Always welcome |

---

## Quick Start

### 1. Fork and clone

```bash
git clone git@github.com:<your-username>/fayda-sdk.git
cd fayda-sdk
```

### 2. Set up the package you're working on

**Python**
```bash
cd packages/python
python -m venv venv && source venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v
```

**Node.js**
```bash
cd packages/node
npm install && npm test
```

**React**
```bash
cd packages/react
npm install && npm test
```

**Go**
```bash
cd packages/go
go test ./... -v -race
```

**Rust**
```bash
cd packages/rust
cargo test
```

### 3. Make your change, run the tests, open a PR

All tests must pass. New features need new tests.

---

## Project Structure

```
fayda-sdk/
├── packages/
│   ├── python/          # pip: fayda-sdk
│   ├── node/            # npm: @fayda/sdk (includes NestJS module)
│   ├── react/           # npm: @fayda/react
│   ├── go/              # go get github.com/haptome/fayda-sdk/packages/go
│   └── rust/            # cargo add fayda-sdk
├── examples/            # One runnable example per language
├── tests/fixtures/      # Shared mock data (JWK, JWT, JSON responses)
├── docs/                # Full spec and API reference
└── .github/workflows/   # CI/CD — test matrix + publish on tag
```

---

## Ground Rules

### API contract is frozen

The public method names, parameter names, and return types defined in `docs/FAYDA_SDK_SPEC.md` Section 4 are **final**. Do not rename them. If you believe a breaking change is necessary, open a discussion first.

### Security-sensitive code needs extra care

The following must always use the implementations described in the spec — do not substitute alternatives without discussion:

- **PKCE** — 64 random bytes, base64url no-padding, SHA-256 challenge
- **State validation** — constant-time comparison only (no `===`)
- **JWT signing** — RS256 with the developer's RSA-2048 private key
- **UserInfo decoding** — decode JWT payload without signature verification

See `docs/CONTRIBUTING.md` for the full implementation rules.

### One concern per PR

- Bug fixes should not include refactors
- New features should not fix unrelated bugs
- Keep diffs small and focused — reviewers will thank you

### Commit message format

```
type(scope): short description

# Types: feat, fix, docs, test, refactor, ci, chore
# Scopes: python, node, react, go, rust, examples, ci

feat(go): add token refresh via silent re-auth
fix(python): correct base64url padding in PKCE verifier
docs(rust): add Axum middleware usage example
```

---

## PR Checklist

Before opening a pull request:

- [ ] All tests pass for the affected package(s)
- [ ] New behaviour is covered by tests
- [ ] No changes to the frozen public API surface (or discussion opened)
- [ ] Sandbox mode still works (zero HTTP calls when `sandbox=True`)
- [ ] PKCE uses cryptographically secure randomness
- [ ] State validation uses constant-time comparison
- [ ] `Content-Type: application/x-www-form-urlencoded` on the token endpoint call

---

## Adding a New Language Port

1. Open a discussion — link to the language's OIDC ecosystem so we can plan dependencies
2. Follow the API contract exactly (method names, param names, return types, error hierarchy)
3. Implement the full 8-point test checklist in `docs/CONTRIBUTING.md`
4. Add a runnable example in `examples/<language>/`
5. Add a CI workflow in `.github/workflows/<language>.yml`

---

## Releasing

Maintainers tag releases — contributors don't need to worry about this. For reference:

| Tag | Publishes |
|---|---|
| `python-v0.x.0` | PyPI: `fayda-sdk` |
| `node-v0.x.0` | npm: `@fayda/sdk`, `@fayda/react` |
| `go-v0.x.0` | Go module tag |
| `rust-v0.x.0` | crates.io: `fayda-sdk` |

---

## Questions?

Open a [GitHub Discussion](https://github.com/haptome/fayda-sdk/discussions) — we're happy to help.
