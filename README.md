# svelte-check Monorepo Dependency Type-Checking Reproduction

Demonstrates a bug in `svelte-check --incremental` where Svelte components imported from **workspace dependency packages** have their props resolved to `any` — meaning type errors are silently missed.

The fix (included as a git submodule) auto-generates `.svelte.d.ts` files for dependency packages, enabling proper type-checking.

## The Problem

In a monorepo with a shared Svelte component library:

```
packages/
  shared/         ← @repro/shared: exports Button, Card components with typed props
  app-one/        ← imports Button from @repro/shared, passes number to string prop
  app-two/        ← imports Card from @repro/shared, passes boolean to string prop
```

**Stock `svelte-check --incremental`** reports **0 errors** — the type mismatches are invisible.

**Fixed `svelte-check --incremental`** correctly reports **TS2322** errors for each type mismatch.

## Quick Start

```bash
# Clone with submodule
git clone --recurse-submodules https://github.com/datstarkey/svelte-check-monorepo-repro.git
cd svelte-check-monorepo-repro

# Install dependencies
pnpm install

# Run the comparison test
node test.js
```

> The test script will automatically build the submodule on first run (takes ~1 minute).

## Expected Output

```
─── Stock svelte-check v4.4.4 (from npm) ───
  Expected: 0 type errors (this is the bug)

  app-one (imports Button from @repro/shared):
      No type errors detected — dependency component props resolve to 'any'

  app-two (imports Card from @repro/shared):
      No type errors detected — dependency component props resolve to 'any'

─── Fixed svelte-check (from submodule with PR fix) ───
  Expected: Type errors correctly detected

  app-one (imports Button from @repro/shared):
      1 type error(s) detected:
        TS2322 App.svelte:9:9 — Type 'number' is not assignable to type 'string'.

  app-two (imports Card from @repro/shared):
      3 type error(s) detected:
        TS2322 App.svelte:9:7  — Type 'boolean' is not assignable to type 'string'.
        TS2322 App.svelte:12:7 — Type 'number' is not assignable to type 'string'.
        TS2322 App.svelte:12:17 — Type 'boolean' is not assignable to type 'string'.
```

## Structure

| Path | Description |
|------|-------------|
| `packages/shared/` | `@repro/shared` — Svelte 5 components with typed `$props()` |
| `packages/app-one/` | Frontend app importing `Button`, with intentional type error |
| `packages/app-two/` | Frontend app importing `Card`, with intentional type errors |
| `svelte-language-tools/` | Git submodule pointing to the [PR branch](https://github.com/datstarkey/language-tools/tree/feat/dependency-svelte-dts-generation) |
| `test.js` | Runs both stock and fixed svelte-check, shows comparison |

## Related

- **PR**: [sveltejs/language-tools#XXXX](https://github.com/sveltejs/language-tools/pull/XXXX) — Auto-generate `.svelte.d.ts` for dependency packages in incremental/tsgo mode
