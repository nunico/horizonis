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
- Read `.junie/STATE.md` for current architecture, active decisions, and known constraints.
- Use `search_contents_by_grep` to find symbol definitions before assuming behavior.
- **Do not read `CHANGELOG.md`** — it is a human-facing history log. Write to it only.

## 3. Changelog

- Location: `CHANGELOG.md` in project root.
- After every task or major step, delegate to `changelog-writer`. Do not open or read the file yourself.

## 4. Testing & Validation (TDD)

All code follows the TDD-Cycle **Red-Green-Refactor**. Untested code is considered broken.

### 4.1 TDD-Cycle

1. **Red**: Write a failing test defining the desired behavior. No implementation yet.
2. **Green**: Write the minimum code to pass the test.
3. **Refactor**: Clean up while keeping tests green.

### 4.2 Coverage Requirements

| Scope                                                             | Requirement                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| Business logic (calculators, state machines, parsers, validators) | 100% path coverage via unit tests                      |
| New user-facing features                                          | E2E tests for happy path + critical error states       |
| Bug fixes                                                         | Regression test reproducing the bug before the fix     |
| New Svelte components in `apps/web/src/lib`                       | Unit tests with Vitest + Testing Library               |
| New Rust logic in `apps/desktop/src`                              | `#[cfg(test)]` unit tests + `tests/` integration tests |

### 4.3 Testing Best Practices

- **AAA Pattern**: Every test must have distinct Arrange / Act / Assert sections.
- **Behavior, not implementation**: Assert outputs and observable side effects. Never test private methods or internal state.
- **F.A.S.T**:
  - _Fast_: Unit tests run in milliseconds.
  - _Autonomous_: Tests are fully self-contained and order-independent.
  - _Self-validating_: Unambiguous pass/fail — no manual inspection.
  - _Timely_: Tests are written before or alongside implementation, never after.
- **Edge cases**: Test empty collections, `null`/`undefined`, boundary values, and invalid types.
- **Positive + negative**: Test both success and failure paths for every behavior.
- **Mocking**: Mock external dependencies (APIs, DBs, hardware). Never mock internal business logic — if tempted, refactor instead.
- **Naming**: Use descriptive sentence-style names, e.g., `it("returns an error when input is empty")`.

### 4.4 Tooling

| Stack               | Unit / Integration                       | E2E        |
| ------------------- | ---------------------------------------- | ---------- |
| TypeScript / Svelte | Vitest                                   | Playwright |
| Rust                | `#[test]` + `proptest` for complex logic | —          |

- Run `pnpm test` and `cargo test` after every change.
- Run `pnpm nx run-many --targets=check` and `pnpm lint` before marking any task complete.

## 5. Subagents

All subagents installed at `~/.junie/agents/`.

| Subagent             | Model          | When to Use                                              |
| -------------------- | -------------- | -------------------------------------------------------- |
| `planner`            | `sonnet`       | Decompose non-trivial tasks into a phased plan           |
| `implementer`        | `gpt-codex`    | Execute a plan or scoped coding task                     |
| `librarian`          | `gpt-5`        | Look up library/API docs; returns compact summary        |
| `code-reviewer`      | `sonnet`       | Review for bugs, security issues, performance            |
| `test-writer`        | `gpt-codex`    | Write unit/integration tests (use in the Red phase)      |
| `bug-detective`      | `grok`         | Trace a bug or stack trace to root cause                 |
| `devops-engineer`    | `gpt-codex`    | CI/CD pipelines, Dockerfiles, deployment configs         |
| `migration-agent`    | `sonnet`       | Database schema or API version migrations                |
| `dependency-auditor` | `gpt-5`        | Audit packages for vulnerabilities and outdated versions |
| `doc-writer`         | `gemini-flash` | Write/update docstrings, comments, READMEs               |
| `changelog-writer`   | `gemini-flash` | Append structured entry to `CHANGELOG.md`                |

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
- Use names that communicate intent; comments explain _why_, not _what_.
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

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

#### Available Svelte MCP Tools:

- `list-sections`: Use this FIRST to discover all available documentation sections. Returns a structured list with `titles`, `use_cases`, and `paths`. When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.
- `get-documentation`: Retrieves full documentation content for specific sections. Accepts single or multiple sections. After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.
- `svelte-autofixer`: Analyzes Svelte code and returns issues and suggestions. You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.
- `playground-link`: Generates a Svelte Playground link with the provided code. After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

### Rust

- `rustfmt` for formatting; `cargo clippy` with zero warnings permitted.
- Follow [RFC 430](https://github.com/rust-lang/rfcs/blob/master/text/0430-finalizing-naming-conventions.md) naming conventions.
- All `Result<T, E>` and `Option<T>` must be handled explicitly.
- No `.unwrap()` or `.expect()` in production code paths — only in tests or `main`.
- Use `proptest` for property-based testing of complex or data-driven logic.
- Unit tests in `#[cfg(test)]` modules in the same file; integration tests in `tests/`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `pnpm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

### Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

### When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
