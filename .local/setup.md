# local setup

Date: June 9, 2026

## Install

```sh
pnpm install
brew install anomalyco/tap/opencode
opencode --version
```

Expected OpenCode version:

```txt
1.16.2
```

## Validate

```sh
pnpm build
pnpm typecheck
```

## Test local OpenCode plugin

Build first because the local loader imports `dist`:

```sh
pnpm build
opencode
```

Ask OpenCode:

```txt
list the files in this repo
```

Then inspect:

```sh
tail -n 20 .opencode/zeroburn.log
```

Expected:

- `plugin.loaded`
- `tool.execute.before`
- `tool.execute.after`

## File rules

Commit:

```txt
.opencode/plugins/zeroburn.ts
```

Do not commit:

```txt
.local/
.opencode/zeroburn.log
.opencode/package.json
.opencode/package-lock.json
.opencode/node_modules/
.opencode/.gitignore
dist/
*.tsbuildinfo
```
