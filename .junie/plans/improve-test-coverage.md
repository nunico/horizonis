# Task: Improve Test Coverage

## Objective

Analyse the codebase to identify **meaningful gaps** in test coverage — logic paths, edge cases, and error states that are untested or undertested. Write high-quality tests that verify real behavior, not tests that inflate coverage metrics.

## Phase 1: Audit

Scan the codebase and identify:

1. **Business logic with no tests** — calculators, validators, state machines, parsers, data transformers.
2. **Partially tested logic** — functions tested for the happy path only, missing edge cases, error states, or boundary values.
3. **Bug-prone areas** — complex conditionals, recursion, async flows, error handling chains.
4. **Untested integrations** — service boundaries, API calls, DB interactions with no mock-based unit tests.
5. **UI features with no E2E coverage** — user-facing flows with no Playwright tests.

For each gap found, record:

- File path and function/component name.
- What is currently tested (if anything).
- What is missing and **why it matters** (what bug could go undetected).

Do not write any tests yet.

## Phase 2: Prioritise

Rank gaps by risk:

1. **Critical** — untested business logic or error handling that could cause data loss, incorrect output, or security issues.
2. **High** — partially tested logic with known edge cases unverified.
3. **Medium** — untested integrations or UI flows.
4. **Low** — minor utilities or pure display components.

Present the prioritised list and wait for approval before proceeding.

## Phase 3: Write Tests

For each approved gap, write tests following these rules:

### Quality Rules

- **Behavior over implementation**: test inputs and observable outputs — not internal state or private methods.
- **AAA pattern**: every test has clear Arrange / Act / Assert sections.
- **One assertion per concept**: a test may have multiple `expect` calls if they verify the same behavior; split tests if verifying distinct behaviors.
- **Meaningful names**: `it("returns null when the input list is empty")` — not `it("works")`.
- **Cover all paths**: for each function, test happy path + all error states + boundary values.
- **No redundant tests**: if two tests verify the same behavior, write one.

### Do Not

- Write tests purely to hit a coverage number.
- Test framework code, generated code, or third-party libraries.
- Duplicate existing tests.
- Use `any` in TypeScript test files.
- Use `.unwrap()` in Rust tests without a comment explaining why a panic is acceptable.

### Tooling

| Stack               | Unit                                              | E2E        |
| ------------------- | ------------------------------------------------- | ---------- |
| TypeScript / Svelte | Vitest + Testing Library                          | Playwright |
| Rust                | `#[cfg(test)]` + `proptest` for data-driven cases | —          |

## Phase 4: Verify

After writing all tests:

1. Run `pnpm test` and `cargo test` — all tests must pass.
2. Run `pnpm nx run-many --targets=check` and `pnpm lint` — zero errors.
3. Confirm no existing tests were broken.
4. Update `CHANGELOG.md` via `changelog-writer`.
