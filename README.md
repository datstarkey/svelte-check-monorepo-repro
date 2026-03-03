# svelte-check Monorepo Dependency Type-Checking Reproduction

Demonstrates a bug in `svelte-check --tsgo` where Svelte components imported from **workspace dependency packages** have their props resolved to `any` — meaning type errors are silently missed.

## The Problem

In a monorepo with a shared Svelte component library:

```
packages/
  shared/         ← @repro/shared: exports Button, Card with typed $props()
  app-one/        ← imports Button, passes number to string prop
  app-two/        ← imports Card, passes boolean/number to string props
```

Running `svelte-check --tsgo` on the apps reports **0 errors** — the type mismatches are invisible because dependency component props resolve to `any`.

## Reproduce

```bash
git clone --recurse-submodules https://github.com/datstarkey/svelte-check-monorepo-repro.git
cd svelte-check-monorepo-repro
pnpm install
```

### Step 1: Stock svelte-check (v4.4.4) — 0 errors (bug)

```bash
pnpm --filter @repro/app-one check
pnpm --filter @repro/app-two check
```

Both report **0 errors**. The intentional type mismatches (`label={123}`, `title={true}`, etc.) are not caught.

### Step 2: Build the fixed svelte-check from the submodule

```bash
cd svelte-language-tools
pnpm install
pnpm -r --filter svelte2tsx --filter svelte-language-server --filter svelte-check run build
cd ..
```

### Step 3: Swap to the fixed version

In `packages/app-one/package.json` and `packages/app-two/package.json`, change:

```diff
- "svelte-check": "catalog:",
+ "svelte-check": "file:../../svelte-language-tools/packages/svelte-check",
```

Then reinstall:

```bash
pnpm install
```

### Step 4: Fixed svelte-check — errors detected

```bash
pnpm --filter @repro/app-one check
pnpm --filter @repro/app-two check
```

Now the type errors are correctly reported:

```
app-one: ERROR "src/routes/+page.svelte" — Type 'number' is not assignable to type 'string'.
app-two: ERROR "src/routes/+page.svelte" — Type 'boolean' is not assignable to type 'string'.
app-two: ERROR "src/routes/+page.svelte" — Type 'number' is not assignable to type 'string'.
app-two: ERROR "src/routes/+page.svelte" — Type 'boolean' is not assignable to type 'string'.
```

## How the Fix Works

The fix auto-generates `.svelte.d.ts` declaration files for Svelte components found in workspace dependency packages, enabling TypeScript to properly type-check imported component props instead of resolving them to `any`.

## Structure

| Path | Description |
|------|-------------|
| `packages/shared/` | `@repro/shared` — Svelte 5 components with typed `$props()` |
| `packages/app-one/` | SvelteKit app importing `Button` with intentional type error |
| `packages/app-two/` | SvelteKit app importing `Card` with intentional type errors |
| `svelte-language-tools/` | Git submodule — [PR branch](https://github.com/datstarkey/language-tools/tree/feat/dependency-svelte-dts-generation) |
