---
sessionId: session-260519-205422-9o2b
---

# Requirements

### Overview & Goals
The user reported a runtime `TypeError` in `Navigation.svelte` and a discrepancy between WebStorm's code analysis (which finds 39 errors) and the agent's initial findings. The goal is to fix the runtime error, add regression tests, and resolve all type-related issues to match WebStorm's analysis.

### Scope
- **In Scope**:
    - Fixing `Navigation.svelte` and `SolarSystemMap.svelte` runtime errors.
    - Resolving type mismatches and unresolved references in the `apps/web` project.
    - Improving the robustness of cluster state handling.
    - Updating test suites to cover edge cases.
- **Out of Scope**:
    - Changing the core procedural generation logic.
    - Modifying the desktop app unless necessary for type sharing.

# Technical Design

### Current Implementation
- The project uses Svelte 5 runes (`$derived`, `$state`) and Svelte stores.
- `Navigation.svelte` and `SolarSystemMap.svelte` use `$derived` to find a system in the `$cluster` store.
- The current implementation `$cluster?.Systems.find(...)` is unsafe if `$cluster` is not null but lacks `Systems`, or if the environment's optional chaining behavior differs (e.g., during SSR).

### Proposed Changes
1.  **Robust Cluster Access**:
    - Update `$derived` expressions to safely handle cases where `Systems` might be missing.
    - `let system = $derived($cluster?.Systems?.find((s) => s.Id === $activeSystemId));`
2.  **Type Reference Fixes**:
    - Ensure all types are imported using consistent paths (e.g., `$lib/types/stellar`).
    - Verify that `procedural-gen` WASM types are correctly recognized by the build system.
3.  **Code Analysis Sync**:
    - Investigate why `svelte-check` reports 0 errors while WebStorm reports 39.
    - Potential causes: missing `.svelte-kit/tsconfig.json` (fixed during investigation), stale cache, or misconfigured `svelte-check` in `project.json`.
    - Run `eslint` with `eslint-plugin-svelte` to identify additional issues.

### Risks
- **Mismatched Types**: Fixing one type error might reveal others if the underlying data models are inconsistent.
- **State Transitions**: The cluster state might be briefly invalid during loading; the UI must handle this gracefully without crashing.

# Testing

### Validation Approach
- **Unit Tests**: Run `vitest` for `Navigation.test.ts` and ensure all tests pass, including new regression cases.
- **Static Analysis**: Run `svelte-check` and `eslint` and ensure they match the expected clean state (0 errors).
- **Runtime Check**: Verify that `pnpm run web:dev` no longer produces `TypeError` in the console.

### Key Scenarios
- Cluster is `null`.
- Cluster is an empty object `{}`.
- `activeSystemId` is `null`.
- `activeSystemId` refers to a non-existent system.

# Delivery Steps

### ✓ Step 1: Fix runtime TypeError and add regression tests
- Fix `Navigation.svelte` and `SolarSystemMap.svelte` to safely handle cases where `$cluster` or `$cluster.Systems` is undefined/null.
- Use explicit checks or safer optional chaining to prevent runtime `TypeError`.
- Update `Navigation.test.ts` with a regression test case simulating an invalid cluster state.

### ✓ Step 2: Resolve type mismatches and unresolved references
- Review and fix imports in Svelte components to resolve "unresolved type references".
- Ensure consistent use of `$lib` alias.
- Address "Type mismatch" errors by explicitly typing variables and fixing comparison types.
- Validate that `svelte-check` and `eslint` are correctly configured to catch these issues in the future.