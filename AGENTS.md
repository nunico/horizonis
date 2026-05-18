# Agent Guidelines

This document provides guidelines for AI agents working on the Horizonis project to ensure efficient token usage, maintain long-term memory, and provide clear documentation of changes.

## 1. Token Usage Optimization

To minimize token consumption and speed up response times:

- Targeted Code Search: Use `search_contents_by_grep` with specific `file_extension_list` (e.g., `[*.rs]` or `[*.svelte]`) instead of broad searches.
- Efficient File Reading: Use `open` with `line_number` to read specific sections of large files. Avoid `open_entire_file` for files over 100 lines unless the full context is critical.
- Concise Status Updates: Keep `update_status` reports high-signal and brief. Focus on critical findings and next actions.
- Batched Operations: Use `multi_edit` when making several changes to the same file.
- Delegate to Subagents: Offload specialized tasks to the subagents defined in Section 5 rather than handling them inline. Subagents run on cheaper, task-optimized models.

## 2. Memory & Context Management

To maintain continuity across sessions:

- Project Structure: Reference the file structure documented in the plan (`.junie/plans/`) before exploring.
- Architectural Context: Review `CHANGELOG.md` at the start of each session to understand recent modifications and design decisions.
- Symbol Resolution: Before assuming a function's behavior, use `search_contents_by_grep` to find its definition.

## 3. Changelog Documentation

Documenting changes is mandatory for all agent-led tasks to provide a clear audit trail.

- Changelog Location: Maintain `CHANGELOG.md` in the project root.
- Entry Timing: After completing a task or major step, delegate immediately to the `changelog-writer` subagent.

- Entry Format (handled automatically by the subagent):

  ```markdown
  ### [YYYY-MM-DD] - Task Title

  - **Summary**: Brief description of the goal.
  - **Changes**: Bulleted list of technical changes.
  - **Files Affected**: Paths to key modified files.
  - **Context**: Any non-obvious design choices or technical debt introduced.
  ```

## 4. Testing & Validation

- Regression Testing: Always run existing tests (`pnpm test`, `cargo test`) after modifications. Delegate test writing to the `test-writer` subagent for any new logic.
- Quality Assurance: Always perform type checking, linting, and formatting checks (`pnpm nx run-many --targets=check`, `pnpm lint`) after completing any task to maintain code quality.
- New Coverage: Add unit tests for any new logic added to `src-tauri` or `src/lib`.
- Code Review: Before finalizing a task, delegate to the `code-reviewer` subagent to catch logic errors, security issues, and performance regressions.
- Bug Diagnosis: When investigating a bug or stack trace, delegate to the `bug-detective` subagent before attempting a fix.
- Implement end-to-end tests for critical user flows
- Test both positive and negative scenarios
- Test component/function/class behavior, not implementation details

## 5. Subagents

All subagents are installed at `~/.junie/agents/`. Use them to delegate specialized tasks and keep the main agent context lean.

| Subagent             | Model          | When to Use                                                               |
| -------------------- | -------------- | ------------------------------------------------------------------------- |
| `planner`            | `sonnet`       | Decompose any non-trivial task into a phased plan before implementing     |
| `implementer`        | `gpt-codex`    | Execute a plan or scoped coding task against the codebase                 |
| `librarian`          | `gemini-flash` | Look up library or API docs and return a compact usage summary            |
| `code-reviewer`      | `sonnet`       | Review a diff or file for bugs, security issues, and performance          |
| `test-writer`        | `gpt-codex`    | Generate unit/integration tests for a function or module                  |
| `bug-detective`      | `grok`         | Trace a bug, error, or stack trace to its root cause                      |
| `devops-engineer`    | `gpt-codex`    | Create or update CI/CD pipelines, Dockerfiles, and deployment configs     |
| `migration-agent`    | `sonnet`       | Plan and execute database schema or API version migrations                |
| `dependency-auditor` | `gemini-flash` | Audit packages for vulnerabilities, outdated versions, and license issues |
| `doc-writer`         | `gemini-flash` | Write or update docstrings, inline comments, and README sections          |
| `changelog-writer`   | `gemini-flash` | Append a structured entry to `CHANGELOG.md` after each task               |

### 6. Standard Workflow

For every non-trivial task, follow this sequence:

1. Plan
2. Research (if unfamiliar APIs are involved)
3. Implement
4. Test (including unit tests and regression testing)
5. Quality Check (run `pnpm nx run-many --targets=check` and `pnpm lint`)
6. Review
7. Document

> For bugs: run `bug-detective` before step 3. For migrations: substitute `migration-agent` for `implementer`. For infra changes: use `devops-engineer` instead of `implementer`.

## Coding Guidelines

- Always prioritize readability, safety, and maintainability.
- Refactor code to improve efficiency and reduce complexity.
- Break up long or complex functions into smaller, more manageable pieces
- Use descriptive variable/function/constant names, comments and error messages
- Use comments to explain complex logic and why decisions were made
- Define interfaces and types for data structures
- For algorithm-related code, include explanations of the approach used.
- For external dependencies, mention their usage and purpose in documentation.
- Ensure code compiles without warnings.
- Don't rely on global mutable state—use dependency injection or thread-safe containers.
- Avoid deeply nested logic—refactor with functions or combinators.
- Don't ignore warnings—treat them as errors during CI.
- Keep lines under 80 characters when possible.
- Keep dependencies up to date and audit for security vulnerabilities

### TypeScript

- Use ESLint and Prettier for consistent code style
- Use async/await for asynchronous operations
- Use TypeScript for type safety and better code completion
- Use modern JavaScript features and libraries (ES6+)
- Use generics when appropriate
- Leverage auto-imports for types
- Avoid using "any" type
- Write erasableSyntaxOnly compliant code only (no enums, namespaces, and class parameter properties)
- Use template literals for string concatenation

### Svelte

- Organize components in subdirectories by feature
- Create reusable components in a package's `$lib/components` directory
- Implement proper component naming (PascalCase)
- Annotate props with TypeScript: `let { name }: { name: string } = $props()`
- Type event handlers, refs, and SvelteKit's generated types
- Use generic types for reusable components
- Leverage `$types.ts` files generated by SvelteKit
- Implement proper type checking with `svelte-check`
- Use type inference where possible to reduce boilerplate
- Use keyed `{#each}` blocks for efficient list rendering
- Use `$derived()` for expensive computations to avoid unnecessary recalculations
- Use `$derived.by()` for complex derived values that require multiple statements
- Avoid `$effect()` for derived state - it's less efficient than `$derived()
- Use `$effect.tracking()` in abstractions to conditionally create reactive listeners
- Implement `+error.svelte` pages for route-level error boundaries
- Write unit tests for components using Vitest and Testing Library

### Rust

- Follow the Rust Style Guide and use `rustfmt` for automatic formatting.
- Use strong typing and leverage Rust's ownership system for memory safety.
- Handle errors gracefully using `Result<T, E>` and provide meaningful error messages.
- Use consistent naming conventions following [RFC 430](https://github.com/rust-lang/rfcs/blob/master/text/0430-finalizing-naming-conventions.md).
- Write idiomatic, safe, and efficient Rust code that follows the borrow checker's rules.
- Use `cargo clippy` to catch common mistakes and enforce best practices.
