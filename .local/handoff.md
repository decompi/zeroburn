# zeroburn handoff

Date: June 9, 2026

This is the private start-here file for Matin, collaborator handoff, or an AI starting with no chat context.

## Objective

`zeroburn` is a cost-aware execution governor for AI coding agents. It should reason about whether the agent's current execution path is becoming financially inefficient, context-inefficient, or stuck in a wasteful loop.

The key question is not only "is this tool call allowed?" The key question is:

```txt
Is this sequence of actions a wasteful way to solve the user's request?
```

`zeroburn` is not trying to replace OpenCode's model selection. It is trying to prevent AI coding agents from wasting money through bad execution paths, unnecessary raw context ingestion, repeated loops, and ungoverned expensive-model usage.

Do not let the product drift into a generic model router or a basic tool-call guardrail.

## Current scope

OpenCode only for now.

Do not add VS Code, CLI, public docs, release flows, tests, or broad platform support unless explicitly asked.

## Current architecture

- `packages/core`: platform-independent governance engine.
- `packages/opencode`: OpenCode adapter that imports core.
- `.opencode/plugins/zeroburn.ts`: local OpenCode loader for this repo.
- `.local/`: private handoff/setup notes, never public.

## Current branch

```sh
feat-opencode-model-capability-logging
```

## Current working state

The OpenCode local plugin load spike worked, and the first normalized core governance event model has been explored.

Observed in `.opencode/zeroburn.log`:

- `plugin.loaded`
- `governance.event`
- `tool.execution.started`
- `tool.execution.completed`
- tool name, args, session ID, call ID, output length, and metadata

Important observed waste signal:

- OpenCode ran `glob` with `*`
- OpenCode also ran `glob` with `**/*`
- both outputs were truncated with large raw output
- this is an example of context-inefficient broad exploration

The merged session governance work added the first session-level state in core:

- `SessionGovernanceState`
- `SessionGovernanceSnapshot`
- `SessionPhase`
- per-session action history counters
- broad exploration counts
- repeated action counts
- total raw output length
- truncated output counts
- policy action escalation to `compress_first`

## Build sequence

Do not jump straight to "route bash to a lower model" without proving OpenCode can actually control model choice at that point. Bash execution itself is not a model call; the model has already decided to request the tool, and OpenCode runs the command.

The intended build sequence is:

1. Observe OpenCode behavior.
2. Normalize OpenCode events into core events.
3. Track session-level execution state.
4. Return clear policy decisions from core.
5. Discover which decisions the OpenCode adapter can enforce.
6. Add enforcement/model-control only where OpenCode exposes the needed hooks.

Model routing may become part of zeroburn, but it is not the foundation. The foundation is execution-path governance and context waste control.

## Current capability spike

We paused `feat-policy-decision-model` to test an important assumption: whether OpenCode exposes enough model-control hooks for zeroburn to steer or influence model usage.

This branch adds observational logging for:

- `chat.message`
- `chat.params`
- `experimental.provider.small_model`
- `experimental.chat.system.transform`
- `experimental.session.compacting`
- `permission.ask`

Run OpenCode and inspect `.opencode/zeroburn.log` to see which hooks fire and what they expose.

## Next implementation milestone

First, finish the OpenCode model-control capability spike.

If OpenCode exposes useful model/tier controls, wire those findings into the architecture.

If OpenCode only exposes observation/small-model preference hooks, return to `feat-policy-decision-model` and make the core policy output explicit enough that the adapter can enforce or surface it where possible.

Short-term direction:

- Make policy output explain `action`, reason, recommendation, and enforceability.
- Represent `compress_first` as a real decision, not only a string field.
- Keep OpenCode behavior as log-only unless the API confirms enforcement is possible.
- After that, run an OpenCode capability spike for model/tier information and enforcement hooks.

The core should eventually return richer policy decisions:

```txt
allow
warn
block
compress_first
require_confirmation
```

Important design note:

```txt
If OpenCode only allows observation at first, that is fine for MVP. But the core design should still model enforceable policy decisions even if the OpenCode adapter can only log some of them initially.
```

## Repo hygiene

Commit:

```txt
.opencode/plugins/zeroburn.ts
```

Ignore:

```txt
.opencode/zeroburn.log
.opencode/package.json
.opencode/package-lock.json
.opencode/node_modules/
.opencode/.gitignore
.local/
```

## Commit style

Use lowercase conventional commits:

```txt
feat: add local opencode plugin load spike
fix: resolve opencode package logging
chore: add minimal ci
refactor: normalize tool events
```
