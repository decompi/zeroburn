# technical notes

Date: June 9, 2026

## OpenCode plugin API

Tested OpenCode:

```txt
1.16.2
```

OpenCode loads project-local plugins from:

```txt
.opencode/plugins/
```

The plugin export is a function:

```ts
type Plugin = (input: PluginInput, options?: PluginOptions) => Promise<Hooks>;
```

Useful hooks:

- `tool.execute.before`
- `tool.execute.after`
- `event`
- `tool.definition`

Current focus:

- `tool.execute.before` for args and pre-action decisions
- `tool.execute.after` for output length and metadata

## Current observed hook payloads

`tool.execute.before` can provide:

- `tool`
- `sessionID`
- `callID`
- `args`

`tool.execute.after` can provide:

- `tool`
- `sessionID`
- `callID`
- `args`
- `title`
- `output`
- `metadata`

## Logging

Do not use `console.error` for ongoing OpenCode plugin debug logs. It writes over the TUI.

Use JSONL file logging:

```txt
.opencode/zeroburn.log
```

## Product decisions

- OpenCode only for now.
- Keep `core` independent from OpenCode.
- Keep `.local/` private and short.
- Use PR branches into `main`.
- `zeroburn` should be a cost-aware execution governor, not a generic model router.
- Avoid building only a simple tool-call observer or broad glob/bash/read guardrail.
- The product should reason about execution paths across a session.
- Main differentiator: context waste control and compression-before-heavy.
- The core should model policy decisions such as `allow`, `warn`, `block`, `compress_first`, and `require_confirmation`, even when the current adapter can only log some decisions.

## North star

`zeroburn` should eventually answer:

```txt
Is this sequence of actions a wasteful way to solve the user's request?
```

It should detect financially inefficient, context-inefficient, or stuck execution paths.

## Core concepts to preserve

- Execution-path cost governance
- Context waste control
- Compression-before-heavy
- Spend attribution
- Predictive policy decisions
- Policy enforcement where OpenCode allows it

## Build process

The implementation should follow this order:

1. Observe agent actions.
2. Normalize adapter-specific hooks into core events.
3. Track session-level execution state.
4. Generate policy decisions from core.
5. Map policy decisions to adapter behavior.
6. Add model-control or enforcement only where the adapter API allows it.

Do not assume zeroburn can send a bash/read/grep action to a lower model. A tool execution is not itself a model invocation. The model chooses to request the tool, then OpenCode executes it. Model routing requires a separate OpenCode capability to choose or influence the model for a reasoning step.

OpenCode has plugin hooks that may be relevant to investigate later:

- `chat.params`
- `experimental.provider.small_model`
- `experimental.chat.messages.transform`
- `experimental.session.compacting`
- `permission.ask`

Treat model steering as an adapter capability spike, not as the core foundation.

## Active model-control questions

The capability spike should answer:

- Does `chat.params` fire for normal user prompts?
- Does `chat.params` allow changing the actual model, or only sampling/output parameters?
- Does `chat.message` reliably expose provider/model IDs?
- Does `experimental.provider.small_model` fire, and can setting `output.model` influence small-model selection?
- Can `permission.ask` block or ask before costly tool behavior?
- Can `experimental.session.compacting` support compression-before-heavy?
- Is model tier information available directly, or do we need our own tier mapping?

## Model capability spike findings

Observed with OpenCode 1.16.2:

- `chat.message` fires and exposes `providerID`, `modelID`, agent, and variant.
- `chat.params` fires for `title` and `build` agents and exposes selected model/provider.
- `chat.params` output exposes sampling/options fields such as `reasoningEffort`, `reasoningSummary`, `textVerbosity`, `instructions`, and `maxOutputTokens`; it does not obviously expose a direct `model` assignment field.
- `experimental.provider.small_model` fires and exposes `output.model`, which appears assignable. This may influence OpenCode's configured small model, but needs a targeted follow-up test.
- `experimental.chat.system.transform` fires and can see model/session context and system message count.
- `permission.ask` did not fire in the basic package-manager prompt.
- `experimental.session.compacting` did not fire in the basic package-manager prompt.

## Permission capability finding

OpenCode permission evaluation is real, but the current local state appears to be auto-allowing broad actions before `permission.ask` gets a chance to fire.

Observed in OpenCode logs:

```txt
service=permission permission=bash pattern=pwd action={"permission":"*","action":"allow","pattern":"*"} evaluated
service=permission permission=bash pattern=ls -la action={"permission":"*","action":"allow","pattern":"*"} evaluated
```

Observed in zeroburn logs:

- `tool.execute.before` and `tool.execute.after` fire for `bash`.
- `permission.ask` did not fire for those bash commands.

Current interpretation:

```txt
Bash/tool detection works. The missing permission prompt is likely caused by OpenCode's saved/runtime wildcard allow rule, not by zeroburn missing bash events.
```

Next test should force OpenCode permissions back to `ask` in a temporary config or clean permission state, then verify whether zeroburn can observe or modify `permission.ask`.

Follow-up result:

- Temporary local `opencode.jsonc` with `permission.bash = "ask"` works.
- OpenCode asks before running `bash`.
- The direct plugin hook `"permission.ask"` did not appear to fire.
- The general plugin `event` hook does receive permission lifecycle events.

Observed event-bus payloads:

```txt
permission.asked
permission.replied
```

Useful `permission.asked` fields:

- `permission`, such as `bash`
- `patterns`, such as `["pwd"]`
- `metadata.command`
- `metadata.description`
- `tool.callID`
- `tool.messageID`

This is an important enforcement lever:

```txt
zeroburn can correlate a permission request with a tool execution through callID.
```

Next architecture step:

- Normalize OpenCode permission events into core governance events.
- Use core policy decisions to decide whether a permission request should be allowed, warned, blocked, or require confirmation.
- Treat OpenCode permissions as the first real enforcement surface, while model steering remains a separate capability question.

## OpenCode source-code routing findings

Inspected OpenCode source from:

```txt
https://github.com/anomalyco/opencode
```

Key source findings:

- Model selection happens before an LLM request starts.
- Tool definitions are passed into that same model request.
- Bash/read/glob/edit execution is not a separate LLM call; it is a tool requested by the already-selected model.
- `chat.params` can mutate request parameters/options, but it does not expose direct model replacement.
- `experimental.provider.small_model` exists, but OpenCode source primarily uses the small model path for title/utility work, not per-tool routing.
- OpenCode permission events are a real interruption point before tool execution.
- OpenCode provider configuration supports custom providers/models and `baseURL`, which makes a zeroburn gateway/launcher plausible.

Product implication:

```txt
Plugin-only zeroburn can govern tool execution and context waste, but cannot force per-tool model routing inside an already-running reasoning turn.
```

Best marketable direction:

- Keep the OpenCode plugin for local observability, permission governance, and compression-before-heavy.
- Add a `zeroburn launch opencode` concept later that starts OpenCode with managed permission/config policy.
- Consider a zeroburn model gateway/provider as the stronger commercial layer:
  - OpenCode points provider/model config at zeroburn.
  - zeroburn forwards to real providers.
  - zeroburn records token/cost attribution.
  - zeroburn can route future LLM requests by agent/session/model/task metadata.
  - zeroburn can enforce budgets centrally.

Important limitation:

```txt
A gateway can route LLM requests, but it still cannot reroute a single bash tool execution after a heavy model has already decided to call the tool. To avoid that waste, zeroburn must either steer the session/model before the request or block/interrupt/require compression at the permission/tool boundary.
```

Current interpretation:

```txt
OpenCode exposes model identity and some model-adjacent controls, but this does not prove per-tool model routing.
```

The likely path is:

- use model IDs/cost metadata for tier awareness and attribution
- use `chat.params` for reasoning/output parameter governance where useful
- test `experimental.provider.small_model` separately for cheap-model steering
- keep tool execution governance separate from model routing

## Short-term MVP direction

- Track actions over a session.
- Group actions into phases:
  - exploration
  - implementation
  - validation
  - debugging
- Detect broad/raw context exploration.
- Detect repeated action loops.
- Detect heavy-model exploration risk if tier/model information is available.
- Produce a report showing waste signals and what should have happened instead.
- Add the first real compression-required policy.
