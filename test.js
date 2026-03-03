// @ts-check
/**
 * Demonstrates the difference between stock svelte-check and the fixed version
 * when type-checking Svelte components imported from workspace dependencies.
 *
 * Usage: node test.js
 *
 * Prerequisites:
 *   - pnpm install (installs stock svelte-check + workspace deps)
 *   - git submodule update --init (pulls svelte-language-tools fork)
 *   - submodule must be built (the script handles this automatically)
 */

const { execFileSync } = require('child_process');
const { rmSync, existsSync } = require('fs');
const path = require('path');

const ROOT = __dirname;
const STOCK_CLI = path.join(ROOT, 'node_modules', '.bin', 'svelte-check');
const FIXED_CLI = path.join(
	ROOT,
	'svelte-language-tools',
	'packages',
	'svelte-check',
	'bin',
	'svelte-check'
);

// ── Colors ──────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

// ── Helpers ─────────────────────────────────────────

/**
 * Run svelte-check and return parsed errors.
 * @param {string} cli  Path to the svelte-check binary
 * @param {string} workspace  Path to the workspace/app directory
 * @returns {{ errors: Array<{file: string, line: number, column: number, code: number, message: string}>, raw: string }}
 */
function runSvelteCheck(cli, workspace) {
	// Clean incremental cache so each run is fresh
	rmSync(path.join(workspace, '.svelte-check'), { recursive: true, force: true });

	const args = [cli, '--workspace', workspace, '--tsconfig', path.join(workspace, 'tsconfig.json'), '--output', 'machine-verbose', '--incremental'];

	let stdout = '';
	try {
		stdout = execFileSync('node', args, {
			cwd: ROOT,
			encoding: 'utf-8',
			timeout: 120_000
		});
	} catch (err) {
		// svelte-check exits with code 1 when errors are found — that's expected
		stdout = /** @type {any} */ (err).stdout || '';
	}

	const errors = [];
	for (const line of stdout.split('\n')) {
		const jsonStart = line.indexOf('{');
		if (jsonStart === -1) continue;
		try {
			const entry = JSON.parse(line.slice(jsonStart));
			if (entry.type === 'ERROR') {
				errors.push({
					file: path.basename(entry.filename),
					line: entry.start.line,
					column: entry.start.character,
					code: entry.code,
					message: entry.message
				});
			}
		} catch {
			// not a JSON line
		}
	}

	return { errors, raw: stdout };
}

/**
 * Print errors in a readable format.
 * @param {Array<{file: string, line: number, column: number, code: number, message: string}>} errors
 */
function printErrors(errors) {
	if (errors.length === 0) {
		console.log(`      ${RED}No type errors detected${NC} — dependency component props resolve to 'any'`);
	} else {
		console.log(`      ${GREEN}${errors.length} type error(s) detected:${NC}`);
		for (const err of errors) {
			const msg = err.message.length > 80 ? err.message.slice(0, 80) + '...' : err.message;
			console.log(`        ${DIM}TS${err.code}${NC} ${err.file}:${err.line}:${err.column} — ${msg}`);
		}
	}
}

// ── Main ────────────────────────────────────────────

console.log('');
console.log(`${BOLD}${'='.repeat(60)}${NC}`);
console.log(`${BOLD}  svelte-check: Monorepo Dependency Type-Checking Demo${NC}`);
console.log(`${BOLD}${'='.repeat(60)}${NC}`);
console.log('');
console.log(`  This monorepo has a shared package (${CYAN}@repro/shared${NC}) with`);
console.log(`  typed Svelte 5 components, and two apps that import them`);
console.log(`  with ${BOLD}intentional type errors${NC}.`);
console.log('');

// ── Step 1: Ensure submodule is built ───────────────
const fixedBuilt = existsSync(path.join(ROOT, 'svelte-language-tools', 'packages', 'svelte-check', 'dist', 'src', 'index.js'));

if (!fixedBuilt) {
	console.log(`${CYAN}[Setup]${NC} Building svelte-language-tools submodule...`);
	console.log(`        This takes a minute on first run.\n`);
	try {
		execFileSync('pnpm', ['install'], {
			cwd: path.join(ROOT, 'svelte-language-tools'),
			encoding: 'utf-8',
			timeout: 300_000,
			stdio: 'inherit'
		});
		execFileSync('pnpm', ['-r', '--filter', 'svelte2tsx', '--filter', 'svelte-language-server', '--filter', 'svelte-check', 'run', 'build'], {
			cwd: path.join(ROOT, 'svelte-language-tools'),
			encoding: 'utf-8',
			timeout: 300_000,
			stdio: 'inherit'
		});
	} catch (err) {
		console.error(`${RED}Failed to build submodule. Run manually:${NC}`);
		console.error(`  cd svelte-language-tools && pnpm install && pnpm -r --filter svelte2tsx --filter svelte-language-server --filter svelte-check run build`);
		process.exit(1);
	}
	console.log('');
}

// ── Step 2: Stock svelte-check ──────────────────────
console.log(`${BOLD}─── Stock svelte-check v4.4.4 (from npm) ───${NC}`);
console.log(`${YELLOW}  Expected: 0 type errors (this is the bug)${NC}`);
console.log('');

console.log(`  ${CYAN}app-one${NC} (imports Button from @repro/shared):`);
const stockAppOne = runSvelteCheck(STOCK_CLI, path.join(ROOT, 'packages', 'app-one'));
printErrors(stockAppOne.errors);
console.log('');

console.log(`  ${CYAN}app-two${NC} (imports Card from @repro/shared):`);
const stockAppTwo = runSvelteCheck(STOCK_CLI, path.join(ROOT, 'packages', 'app-two'));
printErrors(stockAppTwo.errors);
console.log('');

// ── Step 3: Fixed svelte-check ──────────────────────
console.log(`${BOLD}─── Fixed svelte-check (from submodule with PR fix) ───${NC}`);
console.log(`${GREEN}  Expected: Type errors correctly detected${NC}`);
console.log('');

console.log(`  ${CYAN}app-one${NC} (imports Button from @repro/shared):`);
const fixedAppOne = runSvelteCheck(FIXED_CLI, path.join(ROOT, 'packages', 'app-one'));
printErrors(fixedAppOne.errors);
console.log('');

console.log(`  ${CYAN}app-two${NC} (imports Card from @repro/shared):`);
const fixedAppTwo = runSvelteCheck(FIXED_CLI, path.join(ROOT, 'packages', 'app-two'));
printErrors(fixedAppTwo.errors);
console.log('');

// ── Summary ─────────────────────────────────────────
const stockTotal = stockAppOne.errors.length + stockAppTwo.errors.length;
const fixedTotal = fixedAppOne.errors.length + fixedAppTwo.errors.length;

console.log(`${BOLD}${'='.repeat(60)}${NC}`);
console.log(`${BOLD}  Summary${NC}`);
console.log(`${BOLD}${'='.repeat(60)}${NC}`);
console.log('');
console.log(`  ${RED}Stock svelte-check:${NC}  ${stockTotal} error(s) found`);
console.log(`  ${GREEN}Fixed svelte-check:${NC}  ${fixedTotal} error(s) found`);
console.log('');

if (stockTotal === 0 && fixedTotal > 0) {
	console.log(`  ${GREEN}Result:${NC} The fix correctly detects type errors in`);
	console.log(`  workspace dependency Svelte components that stock`);
	console.log(`  svelte-check misses when using --incremental.`);
} else if (stockTotal > 0) {
	console.log(`  ${YELLOW}Note:${NC} Stock svelte-check also found errors.`);
	console.log(`  The bug may have been fixed in the stock version,`);
	console.log(`  or different errors were detected.`);
} else {
	console.log(`  ${RED}Note:${NC} Neither version found errors.`);
	console.log(`  Check that the workspace symlinks are set up correctly.`);
}

console.log('');
