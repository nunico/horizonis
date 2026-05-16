# Agent Guidelines

This document provides guidelines for AI agents working on the Horizonis project to ensure efficient token usage, maintain long-term memory, and provide clear documentation of changes.

## 1. Token Usage Optimization
To minimize token consumption and speed up response times:
- **Targeted Code Search**: Use `search_contents_by_grep` with specific `file_extension_list` (e.g., `[*.rs]` or `[*.svelte]`) instead of broad searches.
- **Efficient File Reading**: Use `open` with `line_number` to read specific sections of large files. Avoid `open_entire_file` for files over 100 lines unless the full context is critical.
- **Concise Status Updates**: Keep `update_status` reports high-signal and brief. Focus on critical findings and next actions.
- **Batched Operations**: Use `multi_edit` when making several changes to the same file.

## 2. Memory & Context Management
To maintain continuity across sessions:
- **Project Structure**: Reference the file structure documented in the plan (`.junie/plans/`) before exploring.
- **Architectural Context**: Review `CHANGELOG.md` at the start of each session to understand recent modifications and design decisions.
- **Symbol Resolution**: Before assuming a function's behavior, use `search_contents_by_grep` to find its definition.

## 3. Changelog Documentation
Documenting changes is mandatory for all agent-led tasks to provide a clear audit trail.
- **Changelog Location**: Maintain `CHANGELOG.md` in the project root.
- **Entry Timing**: Update the changelog immediately after completing a task or a major step.
- **Entry Format**:
  ```markdown
  ### [YYYY-MM-DD] - Task Title
  - **Summary**: Brief description of the goal.
  - **Changes**: Bulleted list of technical changes.
  - **Files Affected**: Paths to key modified files.
  - **Context**: Any non-obvious design choices or technical debt introduced.
  ```

## 4. Testing & Validation
- **Regression Testing**: Always run existing tests (`deno task test`, `cargo test`) after modifications.
- **New Coverage**: Add unit tests for any new logic added to `src-tauri` or `src/lib`.
