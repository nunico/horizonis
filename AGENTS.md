# Agent Guidelines

Guidelines for AI agents on the Horizonis project. Covers token efficiency, memory, TDD, and code standards.

## 1. Token Efficiency

- Use `search_contents_by_grep` with specific `file_extension_list` (e.g., `[*.rs]`, `[*.svelte]`).
- Use `open` with `line_number` for large files. Avoid `open_entire_file` on files >100 lines unless critical.
- Keep `update_status` brief and high-signal.
- Use `multi_edit` for multiple changes to the same file.
- Delegate to subagents (Section 5) instead of handling specialized tasks inline.

## 2. Memory & Context

- Review `.junie/plans/` for project structure before exploring.
- Review `CHANGELOG.md` at session start for recent changes and decisions.
- Use `search_contents_by_grep` to find symbol definitions before assuming behavior.

## 3. Changelog

- Location: `CHANGELOG.md` in project root.
- After every task or major step, delegate to `changelog-writer`.
- Format (subagent handles automatically):

  ```markdown
  ### [YYYY-MM-DD] - Task Title
  - **Summary**: Goal.
  - **Changes**: Bulleted technical changes.
  - **Files Affected**: Key paths.
  - **Context**: Non-obvious design choices or technical debt.
  ```

## 4. Testing & Validation (TDD)

All code follows **Red-Green-Refactor**. Untested code is considered broken.

### 4.1 TDD Cycle

1. **Red**: Write a failing test defining the desired behavior. No implementation yet.
2. **Green**: Write the minimum code to pass the test.
3. **Refactor**: Clean up while keeping tests green.

### 4.2 Coverage Requirements

| Scope | Requirement |
|---|---|
| Business logic (calculators, state machines, parsers, validators) | 100% path coverage via unit tests |
| New user-facing features | E2E tests for happy path + critical error states |
| Bug fixes | Regression test reproducing the bug before the fix |
| New Svelte components in `apps/web/src/lib` | Unit tests with Vitest + Testing Library |
| New Rust logic in `apps/desktop/src` | `#[cfg(test)]` unit tests + `tests/` integration tests |

### 4.3 Testing Best Practices

- **AAA Pattern**: Every test must have distinct Arrange / Act / Assert sections.
- **Behavior, not implementation**: Assert outputs and observable side effects. Never test private methods or internal state.
- **F.A.S.T**:
  - *Fast*: Unit tests run in milliseconds.
  - *Autonomous*: Tests are fully self-contained and order-independent.
  - *Self-validating*: Unambiguous pass/fail — no manual inspection.
  - *Timely*: Tests are written before or alongside implementation, never after.
- **Edge cases**: Test empty collections, `null`/`undefined`, boundary values, and invalid types.
- **Positive + negative**: Test both success and failure paths for every behavior.
- **Mocking**: Mock external dependencies (APIs, DBs, hardware). Never mock internal business logic — if tempted, refactor instead.
- **Naming**: Use descriptive sentence-style names, e.g., `it("returns an error when input is empty")`.

### 4.4 Tooling

| Stack | Unit / Integration | E2E |
|---|---|---|
| TypeScript / Svelte | Vitest | Playwright |
| Rust | `#[test]` + `proptest` for complex logic | — |

- Run `pnpm test` and `cargo test` after every change.
- Run `pnpm nx run-many --targets=check` and `pnpm lint` before marking any task complete.

## 5. Subagents

All subagents installed at `~/.junie/agents/`.

| Subagent | Model | When to Use |
|---|---|---|
| `planner` | `sonnet` | Decompose non-trivial tasks into a phased plan |
| `implementer` | `gpt-codex` | Execute a plan or scoped coding task |
| `librarian` | `gemini-flash` | Look up library/API docs; returns compact summary |
| `code-reviewer` | `sonnet` | Review for bugs, security issues, performance |
| `test-writer` | `gpt-codex` | Write unit/integration tests (use in the Red phase) |
| `bug-detective` | `grok` | Trace a bug or stack trace to root cause |
| `devops-engineer` | `gpt-codex` | CI/CD pipelines, Dockerfiles, deployment configs |
| `migration-agent` | `sonnet` | Database schema or API version migrations |
| `dependency-auditor` | `gemini-flash` | Audit packages for vulnerabilities and outdated versions |
| `doc-writer` | `gemini-flash` | Write/update docstrings, comments, READMEs |
| `changelog-writer` | `gemini-flash` | Append structured entry to `CHANGELOG.md` |

## 6. Standard Workflow

1. **Plan** — `planner`: define architecture, scope, and testing strategy.
2. **Research** — `librarian`: look up unfamiliar APIs or libraries.
3. **Test (Red)** — `test-writer`: write failing tests before any implementation.
4. **Implement (Green)** — write minimum code to pass the tests.
5. **Refactor** — clean up; confirm `pnpm test` and `cargo test` are green.
6. **Quality Check** — `pnpm nx run-many --targets=check` + `pnpm lint`.
7. **Review** — `code-reviewer`: check for bugs, security, and performance.
8. **Document** — `doc-writer` for inline docs/READMEs; `changelog-writer` for `CHANGELOG.md`.

> **Bugs**: run `bug-detective` before step 4.
> **Migrations**: use `migration-agent` instead of `implementer`.
> **Infra**: use `devops-engineer` instead of `implementer`.
> **New dependencies**: run `dependency-auditor` before committing `package.json` or `Cargo.toml` changes.

## 7. Coding Guidelines

Prioritize **readability**, **safety**, and **maintainability**.

### General

- Break complex functions into smaller, well-named pieces.
- Use names that communicate intent; comments explain *why*, not *what*.
- Define explicit interfaces and types for all data structures.
- Document algorithm complexity (time/space) and external dependency purpose.
- No global mutable state — use dependency injection or thread-safe containers.
- No deeply nested logic — use early returns, helpers, or combinators.
- Treat all compiler warnings as errors; none are permitted in CI.
- Keep lines ≤80 characters where possible.
- Keep dependencies current; audit with `dependency-auditor` when adding or updating packages.

### TypeScript

- ESLint + Prettier for style.
- `async`/`await` for all async operations.
- No `any` — use `unknown` and narrow explicitly.
- `erasableSyntaxOnly`: no enums, namespaces, or class parameter properties.
- Use generics for reusable abstractions.
- Use template literals for string concatenation.
- Leverage auto-imports and SvelteKit-generated `$types.ts`.

### Svelte

- Organize by feature; reusable components in `$lib/components`.
- PascalCase component filenames.
- Type props explicitly: `let { name }: { name: string } = $props()`.
- Type all event handlers, refs, and SvelteKit types.
- Use `$derived()` for computed values; `$derived.by()` for multi-statement derivations.
- Never use `$effect()` for derived state — use `$derived()` instead.
- Use `$effect.tracking()` in abstractions for conditional reactive listeners.
- Use keyed `{#each}` blocks.
- Implement `+error.svelte` for route-level error boundaries.
- Type-check with `svelte-check`.

### Rust

- `rustfmt` for formatting; `cargo clippy` with zero warnings permitted.
- Follow [RFC 430](https://github.com/rust-lang/rfcs/blob/master/text/0430-finalizing-naming-conventions.md) naming conventions.
- All `Result<T, E>` and `Option<T>` must be handled explicitly.
- No `.unwrap()` or `.expect()` in production code paths — only in tests or `main`.
- Use `proptest` for property-based testing of complex or data-driven logic.
- Unit tests in `#[cfg(test)]` modules in the same file; integration tests in `tests/`.