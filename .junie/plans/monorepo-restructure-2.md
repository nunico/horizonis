---
sessionId: session-260518-133932-1v7s
---

# Requirements

### Overview & Goals

The goal is to complete the monorepo restructuring by moving the `e2e-tests` directory from the root to the `apps/` directory. This ensures all application-level code resides in the `apps/` directory and is managed consistently by Nx and pnpm workspaces.

### Scope

- **In Scope**:
  - Relocating `e2e-tests` to `apps/e2e-tests`.
  - Configuring Nx for the relocated package.
  - Updating configuration files (WebdriverIO, ESLint, package.json).
  - Cleaning up redundant build artifacts and lockfiles.
- **Out of Scope**:
  - Changing the content of the tests.
  - Upgrading WebdriverIO or other test dependencies.

# Technical Design

### Current Implementation

`e2e-tests` is currently a standalone package at the repository root, not fully integrated into the Nx monorepo structure. It has its own `package.json` and `pnpm-lock.yaml`.

### Proposed Changes

1.  **Migration**: Move the `e2e-tests/` directory to `apps/e2e-tests/`.
2.  **Nx Integration**: Add `apps/e2e-tests/project.json` to define Nx targets. The `test` target will execute the WebdriverIO suite.
3.  **Path Updates**:
    - `wdio.conf.js`: Update the `application` path to point to `../desktop/target/debug/tauri-app` and the `cwd` in `onPrepare` to the workspace root.
    - `eslint.config.js`: Update the file patterns for E2E tests to reflect the new location.
4.  **Dependency Management**: Remove `apps/e2e-tests/pnpm-lock.yaml` and `apps/e2e-tests/node_modules`, letting the root `pnpm-lock.yaml` manage dependencies for the entire workspace.
5.  **Root Integration**: Update the root `package.json` with an `e2e` script for easy access.

### File Structure

```text
/
├── apps/
│   ├── desktop/            # Tauri Rust backend
│   ├── e2e-tests/          # WebdriverIO E2E tests (Moved)
│   │   ├── test/
│   │   ├── package.json
│   │   ├── project.json
│   │   └── wdio.conf.js
│   └── web/                # SvelteKit frontend
├── libs/                   # For shared libraries
├── nx.json
├── package.json            # Root workspace config
├── tsconfig.base.json
└── pnpm-workspace.yaml
```

### Risks

- **Path Resolution**: The relative paths in `wdio.conf.js` must be precisely updated to account for the deeper nesting in the `apps/` directory.

### ✓ Step 1: Relocate e2e-tests to apps/e2e-tests

Move the `e2e-tests` directory from the root to `apps/e2e-tests`.

### ✓ Step 2: Configure Nx for e2e-tests

Create `apps/e2e-tests/project.json` and define Nx targets for testing and linting.

### ✓ Step 3: Update configuration paths

Update `wdio.conf.js` and `eslint.config.js` to reflect the new directory structure and ensure correct path resolution.

### ✓ Step 4: Cleanup and Dependency Management

Remove `apps/e2e-tests/pnpm-lock.yaml` and `node_modules`. Run `pnpm install` at root to link dependencies.

### ✓ Step 5: Root integration and final verification

Add `e2e` script to root `package.json` and verify the entire setup by running `nx test e2e-tests`.

# Testing

### Validation Approach

Verification will be done by running the E2E test suite and linting through Nx.

### Key Scenarios

1.  **E2E Test Execution**: `nx run e2e-tests:test` (or `nx test e2e-tests`) should correctly build the Tauri app (if not built) and run the WebdriverIO tests.
2.  **Linting**: `nx run e2e-tests:lint` (if added) or the root `pnpm lint` should correctly lint the E2E test files.
3.  **Dependency Linking**: `pnpm install` at the root should successfully link all dependencies, including those for the E2E tests.
