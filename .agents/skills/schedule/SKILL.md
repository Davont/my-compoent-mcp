---
name: schedule
description: Work order scheduler. Reads .noodle/mise.json, writes .noodle/orders-next.json.
schedule: "When no active orders exist, after backlog changes, or when session history suggests re-evaluation"
---

# Schedule

Read `.noodle/mise.json`, write `.noodle/orders-next.json`.
The loop atomically promotes orders-next.json into orders.json — never write orders.json directly.
Use `noodle schema mise` and `noodle schema orders` as the schema source of truth.

Operate fully autonomously. Only ask the user when backlog is empty and there is no actionable work; ask whether they want a backlog-adapter setup order scheduled.

## Project Context

This is an MCP Server (`@my-design/mcp`) for a component library. It powers an AI design-to-code pipeline: DSL input → page code using `@my-design/react`. The backlog lives in `TODO.md` and covers MCP tool enhancements, documentation gaps, security hardening, and design-to-code integration.

Key commands: `npm run build` (rslib), `npx rstest run` (tests).

## Task Types

Read task_types from mise to discover every schedulable task type and its schedule hint.
Each order contains sequential stages — use task_key on each stage to bind it to a task type.

### Orders

An order groups related stages into a pipeline. Execute → quality → reflect should be stages within ONE order, not separate orders.
Use the plan ID (as a string) as the order id.

### Synthesizing Follow-Up Stages

After scheduling an execute stage, add follow-up stages to the same order:
- Quality after Execute — review the cook's work (use `adversarial-review` task type when available)
- Reflect after Quality — capture learnings

## Scheduling Criteria

When prioritizing backlog items, consider:

1. **Priority markers** — items explicitly marked 高 (high) > 中 (medium) > 低 (low)
2. **Dependencies** — items that unblock other work go first (e.g., SECTION_MAP registration unblocks Related component support)
3. **Risk** — security issues (path traversal, symlink bypass) before feature work
4. **Scope** — prefer small, well-defined items over ambiguous ones that need user discussion
5. **Items marked 待讨论 (needs discussion)** — skip these unless the user has provided a decision; they require user input before scheduling

## Backlog Shape

The backlog in `TODO.md` uses numbered sections with:
- 待讨论 (needs discussion) — items requiring user decision before work can start
- 待验证 & 待规划 (needs verification / planning) — items that may need investigation first
- Unnumbered bullet items at the bottom — smaller bugs and fixes, good candidates for quick wins

When scheduling, map TODO items to orders by grouping related items (e.g., SECTION_MAP items #1 and #2 can be one order).
