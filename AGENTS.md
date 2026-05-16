# Agent Guidelines

This document provides guidelines for AI agents working on the Horizonis project to ensure efficient token usage, maintain long-term memory, and provide clear documentation of changes.

## 1. Token Usage Optimization

To minimize token consumption and speed up response times:

- **Targeted Code Search**: Use `search_contents_by_grep` with specific `file_extension_list` (e.g., `[*.rs]` or `[*.svelte]`) instead of broad searches.
- **Efficient File Reading**: Use `open` with `line_number` to read specific sections of large files. Avoid `open_entire_file` for files over 100 lines unless the full context is critical.
- **Concise Status Updates**: Keep `update_status` reports high-signal and brief. Focus on critical findings and next actions.
- **Batched Operations**: Use `multi_edit` when making several changes to the same file.
- **Delegate to Subagents**: Offload specialized tasks to the subagents defined in Section 5 rather than handling them inline. Subagents run on cheaper, task-optimized models.

## 2. Memory & Context Management

To maintain continuity across sessions:

- **Project Structure**: Reference the file structure documented in the plan (`.junie/plans/`) before exploring.
- **Architectural Context**: Review `CHANGELOG.md` at the start of each session to understand recent modifications and design decisions.
- **Symbol Resolution**: Before assuming a function's behavior, use `search_contents_by_grep` to find its definition.

## 3. Changelog Documentation

Documenting changes is mandatory for all agent-led tasks to provide a clear audit trail.

- **Changelog Location**: Maintain `CHANGELOG.md` in the project root.
- **Entry Timing**: After completing a task or major step, delegate immediately to the `changelog-writer` subagent.
- **How to invoke**:

  ```
  junie subagent run changelog-writer --prompt "<Task Title>: <Brief goal description>"
  ```

- **Entry Format** (handled automatically by the subagent):

  ```markdown
  ### [YYYY-MM-DD] - Task Title

  - **Summary**: Brief description of the goal.
  - **Changes**: Bulleted list of technical changes.
  - **Files Affected**: Paths to key modified files.
  - **Context**: Any non-obvious design choices or technical debt introduced.
  ```

## 4. Testing & Validation

- **Regression Testing**: Always run existing tests (`deno task test`, `cargo test`) after modifications. Delegate test writing to the `test-writer` subagent for any new logic.
- **New Coverage**: Add unit tests for any new logic added to `src-tauri` or `src/lib`.
- **Code Review**: Before finalizing a task, delegate to the `code-reviewer` subagent to catch logic errors, security issues, and performance regressions.
- **Bug Diagnosis**: When investigating a bug or stack trace, delegate to the `bug-detective` subagent before attempting a fix.

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

### Standard Workflow

For every non-trivial task, follow this sequence:

1. **Plan**: `junie subagent run planner --prompt "<task description>"`
2. **Research** (if unfamiliar APIs are involved): `junie subagent run librarian --prompt "<library or API question>"`
3. **Implement**: `junie subagent run implementer --prompt "<plan>"`
4. **Test**: `junie subagent run test-writer --prompt "<module or function to test>"`
5. **Review**: `junie subagent run code-reviewer --prompt "<files or diff to review>"`
6. **Document**: `junie subagent run changelog-writer --prompt "<Task Title>: <summary>"`

> For bugs: run `bug-detective` before step 3. For migrations: substitute `migration-agent` for `implementer`. For infra changes: use `devops-engineer` instead of `implementer`.
