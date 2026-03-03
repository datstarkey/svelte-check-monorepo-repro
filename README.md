# svelte-check Monorepo Dependency Type-Checking Reproduction

Demonstrates a bug in `svelte-check --tsgo` where Svelte components imported from **workspace dependency packages** have their props resolved to `any` — meaning type errors are silently missed.

## The Problem

In a monorepo with a shared Svelte component library:

```
packages/
  shared/       ← @repro/shared: exports Button, Card with typed $props()
  app-one/      ← imports Button, passes number to string prop (uses fixed svelte-check)
  app-two/      ← imports Card, passes boolean/number to string props (uses stock svelte-check)
```

## Setup

```bash
git clone --recurse-submodules https://github.com/datstarkey/svelte-check-monorepo-repro.git
cd svelte-check-monorepo-repro

# Build the fixed svelte-check from the submodule
cd svelte-language-tools
pnpm install
pnpm -r --filter svelte2tsx --filter svelte-language-server --filter svelte-check run build
cd ..

# Install workspace dependencies
pnpm install
```

## Reproduce

### app-two — stock svelte-check (the bug)

app-two uses **stock svelte-check v4.4.4** from npm.

```bash
pnpm --filter @repro/app-two check      # normal mode: 3 errors (works fine)
pnpm --filter @repro/app-two check:go   # --tsgo mode: 0 errors (BUG!)
```

Normal `svelte-check` catches all 3 type errors, but `--tsgo` reports **0 errors** — the dependency component props resolve to `any`.

### app-one — fixed svelte-check (the fix)

app-one uses the **fixed svelte-check** from the submodule (`file:../../svelte-language-tools/packages/svelte-check`).

```bash
pnpm --filter @repro/app-one check      # normal mode: 1 error
pnpm --filter @repro/app-one check:go   # --tsgo mode: 1 error
```

Both modes correctly report the type error: `Type 'number' is not assignable to type 'string'`.

## How the Fix Works

The fix auto-generates `.svelte.d.ts` declaration files for Svelte components found in workspace dependency packages, enabling TypeScript to properly type-check imported component props in `--tsgo`/`--incremental` mode instead of resolving them to `any`.

## Structure

| Path | Description |
|------|-------------|
| `packages/shared/` | `@repro/shared` — Svelte 5 components with typed `$props()` |
| `packages/app-one/` | SvelteKit app using **fixed** svelte-check — errors caught in both modes |
| `packages/app-two/` | SvelteKit app using **stock** svelte-check — `--tsgo` misses errors |
| `svelte-language-tools/` | Git submodule — [PR branch](https://github.com/datstarkey/language-tools/tree/feat/dependency-svelte-dts-generation) |
