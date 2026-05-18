---
name: generate-changelog
description: Automates the generation of structured entries for `CHANGELOG.md` in the project root, ensuring compliance with the project guidelines.
---

# generate-changelog — update the project changelog

Automates the generation of structured entries for `CHANGELOG.md` in the project root, ensuring compliance with the project guidelines.

## Trigger

- After completing a task or a major implementation step.
- When an agent is instructed to document changes.
- Specifically delegated to by the `changelog-writer` subagent prompt.

## Workflow

1. **Analyze Changes**: Review the current diff, modified files, and task description.
2. **Format Entry**: Construct a Markdown entry using the mandatory format.
3. **Locate Insertion Point**: Find the top of the changelog (after the header).
4. **Append Entry**: Insert the new entry at the top of the list.

## Expected Format

```markdown
###### [YYYY-MM-DD] - Task Title

- **Summary**: Brief description of the goal.
- **Changes**: Bulleted list of technical changes.
- **Files Affected**: Paths to key modified files.
- **Context**: Any non-obvious design choices or technical debt introduced.
```

## Guidelines

- **Date**: Use `YYYY-MM-DD` format.
- **Task Title**: Concise and descriptive.
- **Summary**: Exactly one sentence.
- **Changes**: Bulleted technical details (max 20 words per bullet).
- **Files Affected**: Relative paths from project root.
- **Context**: Design rationale or `None.` if not applicable.
- **No Source Code**: Never modify files other than `CHANGELOG.md`.
- **Order**: Entries are sorted newest-first.
