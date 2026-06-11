# local rules

Date: June 9, 2026

`.local/` is the private restart brain for the project. Keep it short.

## What belongs here

Add or update `.local/` only when the information helps someone restart work without the original chat.

Good examples:

- current objective
- current branch or PR state
- setup steps that are not ready for public docs
- important OpenCode/API findings
- decisions that affect architecture or workflow
- next implementation milestone
- things that should not be committed

Bad examples:

- full chat transcripts
- every work session
- random thoughts
- public README-style polish
- secrets, API keys, tokens, credentials
- generated logs or OpenCode runtime files

## Current files

Use only these unless there is a clear reason to add another:

```txt
.local/handoff.md
.local/setup.md
.local/technical-notes.md
.local/rules.md
```

## File purposes

`.local/handoff.md`

Current project state: objective, branch/PR status, what is proven, what is next.

`.local/setup.md`

Private setup/run instructions for this repo.

`.local/technical-notes.md`

Durable technical findings and decisions, especially OpenCode API behavior.

`.local/rules.md`

Rules and prompts for maintaining `.local/`.

## Update rule

At the end of meaningful work, ask:

```txt
Would someone starting fresh need this?
```

If yes, update one of the files above.

If no, do not add anything.

## Prompt: start a new session

Paste this into a new AI chat:

```txt
We are working on zeroburn. Before doing anything, read these private project files:

1. .local/rules.md
2. .local/handoff.md
3. .local/setup.md
4. .local/technical-notes.md

Then inspect the current git branch and status. Do not modify files yet. Summarize the current objective, current branch state, what is already proven, and the next recommended step.
```

## Prompt: end a long session

Paste this before ending a long AI chat:

```txt
Before we stop, check whether .local should be updated. Read .local/rules.md first. Only update .local/handoff.md, .local/setup.md, or .local/technical-notes.md if the new information would help someone restart the project without this chat. Keep it concise. Do not create session logs or chat exports. Do not touch public docs unless explicitly asked.
```

## Prompt: hand off to a friend

Send this to your friend or their AI:

```txt
You are joining the zeroburn repo with no prior context. Start by reading:

1. .local/rules.md
2. .local/handoff.md
3. .local/setup.md
4. .local/technical-notes.md

Then run git status and identify the current branch. Do not make changes yet. First summarize the project objective, architecture, current repo state, setup steps, and the next safe task.
```

## Prompt: set up on a new computer

Paste this into an AI chat on a new machine:

```txt
Help me set up zeroburn on this machine. First read .local/rules.md, .local/handoff.md, .local/setup.md, and .local/technical-notes.md. Then verify dependencies, install what is missing, run pnpm install, pnpm build, and pnpm typecheck. If OpenCode is installed, run opencode --version and explain how to smoke test the local plugin. Do not commit anything or modify public docs.
```

## Prompt: should .local change?

Use this after an important discussion:

```txt
Read .local/rules.md and decide whether anything from this conversation should update .local. If yes, make the smallest useful update to .local/handoff.md, .local/setup.md, or .local/technical-notes.md. If no, say no update is needed and explain briefly. Do not create new files unless there is a clear reason.
```
