---
name: Refactor
about: Propose code cleanup, modularity improvements, or tech debt reduction
title: 'refactor: '
labels: refactor
---

### Summary

A clear description of what code, module, or component is being refactored.

### Motivation

Why refactor this now? (e.g. technical debt, monolithic components, improved testability, modernizing to new browser standards).

### Current State vs. Desired State

- **Current**: How the code/architecture works today.
- **Desired**: The proposed modular or simplified architecture.

### Affected Files

- `server/src/...`
- `client/...`

### Acceptance Criteria

- [ ] Refactor completed without behavioral regressions
- [ ] Existing test suite passes (`pnpm test`)
- [ ] Code formatted with Prettier (`pnpm run format:check`)
