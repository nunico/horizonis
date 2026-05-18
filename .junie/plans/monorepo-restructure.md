# Task: Convert a Tauri + SvelteKit Repository into an Nx Monorepo

Your task is to migrate the current repository — a standard single-project
Tauri app using SvelteKit as its frontend — into a well-structured Nx monorepo. Follow every step
below precisely. Do not skip steps. After each major step, verify the workspace still builds and runs.

---

## Assumptions About the Source Repo

The source repo is expected to have approximately this layout:

/
├── src/ # SvelteKit source (routes, lib, etc.)
├── src-tauri/ # Tauri Rust backend (main.rs, tauri.conf.json, Cargo.toml)
├── static/
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
└── ...

If the layout differs, adapt the paths accordingly but preserve the intent of each step.

---

## Target Monorepo Structure

/
├── apps/
│ ├── desktop/ # Tauri Rust backend (src-tauri contents)
│ │ ├── src/
│ │ ├── Cargo.toml
│ │ ├── tauri.conf.json
│ │ └── project.json
│ └── web/ # SvelteKit frontend
│ ├── src/
│ ├── static/
│ ├── svelte.config.js
│ ├── vite.config.ts
│ ├── tsconfig.json
│ ├── package.json
│ └── project.json
├── libs/ # (empty, ready for shared libraries)
├── node_modules/
├── nx.json
├── package.json # root workspace package.json
├── tsconfig.base.json
└── pnpm-workspace.yaml # or package.json workspaces if using npm/yarn

---

## Step 1 — Initialise Nx in the Existing Repo

1. Install Nx as a dev dependency and run `nx init` from the repo root:

   ```bash
   pnpm add -D nx
   pnpx nx@latest init
   ```

When prompted:

- Mark `dev`, `build`, `check`, `lint`, `test` as cacheable scripts.
- For `build`, set output to `.svelte-kit` and `build/`.
- Skip outputs for `dev`, `check`, `lint`.
- Do NOT choose an "integrated" preset if asked; choose "package-based" or accept defaults
  — we will restructure manually.

2. Confirm that `nx.json` has been created at the repo root.

---

## Step 2 — Set Up pnpm Workspaces (Recommended) or npm Workspaces

### If using pnpm:

Create `pnpm-workspace.yaml` at the root:

```yaml
packages:
  - 'apps/*'
  - 'libs/*'
```

### If using npm/yarn:

In the root `package.json`, add:

```json
"workspaces": ["apps/*", "libs/*"]
```

---

## Step 3 — Create the Monorepo Folder Structure

```bash
mkdir -p apps/web apps/desktop libs
```

---

## Step 4 — Move the SvelteKit App into `apps/web`

1. Move all SvelteKit-related files and directories into `apps/web/`:

```bash
mv src apps/web/src
mv static apps/web/static
mv svelte.config.js apps/web/svelte.config.js
mv vite.config.ts apps/web/vite.config.ts
mv tsconfig.json apps/web/tsconfig.json
```

2. Move the SvelteKit `package.json` (if it contains frontend-specific deps) into `apps/web/`.
   If the root `package.json` covers all deps, copy it to `apps/web/package.json` and then
   strip non-frontend deps from the copy; keep Tauri-agnostic frontend deps only.
3. Update `apps/web/svelte.config.js`:
   - Ensure `adapter-static` is configured (required by Tauri — no SSR).
   - Set `kit.outDir` to `.svelte-kit` (relative to `apps/web/`).
   - Set `kit.files.assets` to `static` (relative to `apps/web/`).

Minimal example:

```js
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html'
		}),
		files: {
			assets: 'static'
		}
	}
};

export default config;
```

4. Ensure `apps/web/src/routes/+layout.ts` (or `.js`) disables SSR:

```ts
export const ssr = false;
export const prerender = true;
```

5. Update `apps/web/vite.config.ts` — fix any `root` or `cacheDir` paths that assumed
   the old root location:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
	// cacheDir is relative to this file's location, no changes needed normally
});
```

6. Update `apps/web/tsconfig.json` to extend a root base config:

```json
{
	"extends": "../../tsconfig.base.json",
	"compilerOptions": {
		"paths": {}
	},
	"include": ["src/**/*.d.ts", "src/**/*.ts", "src/**/*.svelte"]
}
```

---

## Step 5 — Create `apps/web/project.json`

This file registers the SvelteKit app with Nx:

```json
{
	"name": "web",
	"$schema": "../../node_modules/nx/schemas/project-schema.json",
	"projectType": "application",
	"sourceRoot": "apps/web/src",
	"targets": {
		"dev": {
			"executor": "nx:run-commands",
			"options": {
				"command": "pnpm vite dev",
				"cwd": "apps/web"
			}
		},
		"build": {
			"executor": "nx:run-commands",
			"outputs": ["{projectRoot}/build", "{projectRoot}/.svelte-kit"],
			"options": {
				"command": "pnpm vite build",
				"cwd": "apps/web"
			}
		},
		"check": {
			"executor": "nx:run-commands",
			"options": {
				"command": "pnpm svelte-check --tsconfig ./tsconfig.json",
				"cwd": "apps/web"
			}
		},
		"lint": {
			"executor": "nx:run-commands",
			"options": {
				"command": "pnpm eslint src",
				"cwd": "apps/web"
			}
		},
		"test": {
			"executor": "nx:run-commands",
			"options": {
				"command": "pnpm vitest run",
				"cwd": "apps/web"
			}
		}
	}
}
```

---

## Step 6 — Move the Tauri Backend into `apps/desktop`

1. Move all Tauri files:

```bash
mv src-tauri/src apps/desktop/src
mv src-tauri/Cargo.toml apps/desktop/Cargo.toml
mv src-tauri/tauri.conf.json apps/desktop/tauri.conf.json
mv src-tauri/build.rs apps/desktop/build.rs  # if present
mv src-tauri/icons apps/desktop/icons          # if present
```

If `src-tauri/` has a `Cargo.lock`, move it too:

```bash
mv src-tauri/Cargo.lock apps/desktop/Cargo.lock
```

2. Update `apps/desktop/tauri.conf.json`:

```json
{
	"build": {
		"beforeDevCommand": "nx run web:dev",
		"beforeBuildCommand": "nx run web:build",
		"devUrl": "http://localhost:5173",
		"frontendDist": "../web/build"
	},
	"bundle": {
		"active": true,
		"targets": "all"
	}
}
```

Key points: - `frontendDist` is relative to `apps/desktop/` and points to the SvelteKit build output. - `devUrl` must match whatever port Vite uses (default: 5173). - `beforeBuildCommand` delegates to Nx so caching is used automatically. 3. If the repo has a workspace `Cargo.toml` at the root already, leave it. Otherwise, create one
at the repo root to wire up Rust workspaces:

```toml
[workspace]
members = ["apps/desktop"]
resolver = "2"
```

Update `apps/desktop/Cargo.toml` — ensure the `package` section paths are self-contained
and do not assume the old `src-tauri/` location.

---

## Step 7 — Create `apps/desktop/project.json`

```json
{
	"name": "desktop",
	"$schema": "../../node_modules/nx/schemas/project-schema.json",
	"projectType": "application",
	"sourceRoot": "apps/desktop/src",
	"tags": ["scope:desktop", "type:app"],
	"targets": {
		"dev": {
			"executor": "nx:run-commands",
			"options": {
				"command": "cargo tauri dev",
				"cwd": "apps/desktop"
			},
			"dependsOn": []
		},
		"build": {
			"executor": "nx:run-commands",
			"outputs": ["{workspaceRoot}/target/release/bundle"],
			"options": {
				"command": "cargo tauri build",
				"cwd": "apps/desktop"
			},
			"dependsOn": ["web:build"]
		},
		"lint": {
			"executor": "nx:run-commands",
			"options": {
				"command": "cargo clippy",
				"cwd": "apps/desktop"
			}
		}
	}
}
```

---

## Step 8 — Update the Root `package.json`

The root `package.json` should now be a workspace root — it orchestrates, it does not own
app-specific scripts directly. Update it to:

```json
{
	"name": "my-app-monorepo",
	"private": true,
	"workspaces": ["apps/*", "libs/*"],
	"scripts": {
		"dev": "nx run desktop:dev",
		"build": "nx run desktop:build",
		"web:dev": "nx run web:dev",
		"web:build": "nx run web:build",
		"graph": "nx graph"
	},
	"devDependencies": {
		"nx": "latest"
	}
}
```

Move all former app-level dependencies (SvelteKit, Vite, TypeScript, etc.) into
`apps/web/package.json` if not already there. The root `package.json` should only contain
workspace tooling (`nx`, `prettier`, `eslint` configs shared across all apps).

---

## Step 9 — Create `tsconfig.base.json` at the Root

```json
{
	"$schema": "https://json.schemastore.org/tsconfig",
	"compilerOptions": {
		"rootDir": ".",
		"sourceMap": true,
		"declaration": false,
		"moduleResolution": "bundler",
		"target": "ES2022",
		"module": "ESNext",
		"lib": ["ES2022", "DOM", "DOM.Iterable"],
		"strict": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"paths": {}
	},
	"exclude": ["node_modules", "tmp"]
}
```

---

## Step 10 — Configure `nx.json`

Update `nx.json` at the root to define caching, task pipelines, and default runner:

```json
{
	"$schema": "./node_modules/nx/schemas/nx-schema.json",
	"defaultBase": "main",
	"namedInputs": {
		"default": ["{projectRoot}/**/*", "sharedGlobals"],
		"production": ["default", "!{projectRoot}/**/*.spec.ts", "!{projectRoot}/**/*.test.ts"],
		"sharedGlobals": ["{workspaceRoot}/tsconfig.base.json"]
	},
	"targetDefaults": {
		"build": {
			"dependsOn": ["^build"],
			"inputs": ["production", "^production"],
			"cache": true
		},
		"test": {
			"inputs": ["default", "^production"],
			"cache": true
		},
		"lint": {
			"inputs": ["default"],
			"cache": true
		},
		"check": {
			"inputs": ["default"],
			"cache": true
		}
	},
	"plugins": []
}
```

---

## Step 11 — Install Dependencies

```bash
# From repo root:
pnpm install   # or: npm install
```

This resolves all workspace packages and links `apps/web` and `apps/desktop` correctly.

---

## Step 12 — Verify the Migration

Run each of the following commands and confirm they succeed without errors:

```bash
# 1. Visualise the project graph
npx nx graph

# 2. Build the SvelteKit frontend
npx nx run web:build

# 3. Type-check the SvelteKit app
npx nx run web:check

# 4. Start Tauri in dev mode (builds frontend first via beforeDevCommand)
npx nx run desktop:dev

# 5. Full production build of the Tauri app
npx nx run desktop:build
```

---

## Step 13 — Clean Up

1. Remove the now-empty `src-tauri/` directory if still present.
2. Remove any leftover root-level SvelteKit config files that have been moved to `apps/web/`.
3. Update `.gitignore` to cover new output paths:

```
apps/web/build/
apps/web/.svelte-kit/
target/
```

4. Update CI/CD scripts (GitHub Actions, GitLab CI, etc.) to use `nx run` commands instead
   of direct `npm run` scripts.

---

## Constraints and Rules

- Do NOT use `@nx/svelte` or `@nxext/sveltekit` plugins unless they are already in the
  project — use `nx:run-commands` for maximum compatibility and transparency.
- Do NOT upgrade or change versions of Tauri, SvelteKit, or Vite unless a version conflict
  requires it. Only migrate structure.
- Preserve all existing functionality. The migrated monorepo must build identically to
  the original project.
- Do NOT commit `node_modules/` or any generated build artefacts.
- All paths in config files (`tauri.conf.json`, `vite.config.ts`, `tsconfig.json`, etc.)
  must be relative to the file's own location, not the old project root.

```

```
