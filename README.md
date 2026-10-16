<div align="center">
  <img src="pack_icon.png" alt="AdminUtils logo" width="140" />
  <h1>AdminUtils</h1>
  <p><b>Administration, moderation and utility tools for Minecraft Bedrock</b></p>
  <p>
    <a href="https://github.com/MisledPaul58/AdminUtils-BP/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/MisledPaul58/AdminUtils-BP/ci.yml?branch=release&style=flat-square&label=CI" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0--or--later-2f8f37?style=flat-square" alt="License: GPL-3.0-or-later" /></a>
    <img src="https://img.shields.io/badge/Minecraft-26.50-02A46F?style=flat-square" alt="Minecraft 26.50" />
    <img src="https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square" alt="TypeScript" />
  </p>
  <p><sub>A form-based in-game GUI for worlds, realms and servers &middot; powered by the Minecraft Script&nbsp;API</sub></p>
</div>

---

> [!IMPORTANT]
> **AdminUtils ships in two parts.** You need this **behavior pack** *and* the
> **[resource pack](https://github.com/MisledPaul58/AdminUtils-RP)** — they are one add-on split
> across two repositories. The GUI will not work without the RP.

<!-- Screenshots: drop PNGs into a `docs/` folder and add them under Features, e.g.
     ![Admin menu](docs/admin-menu.png) -->

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [First steps](#first-steps)
- [Known issues](#known-issues)
- [Building from source](#building-from-source)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

### 🛡️ Moderation

- **Ban / unban** menu
- **Jail** menu
- **Freeze** menu
- **Vanish** menu
- **Inventory inspection** — view another player's inventory
- **Kill** or **launch** a player

### 🔧 Utilities

- **Freecam** — Spectator and Experimental modes, with teleport-to-player and return-to-start
- **Projectile powers** — attach **Lightning bolt**, **Freeze** or **TNT** to snowballs, arrows and eggs
- **Admin's wand** — a single item that opens the entire GUI

### ⚙️ Administration

- **Admin & owner tag management** straight from the GUI (Settings → Admins)
- **Permissions plugin** — groups, users, wildcard nodes (`ui.settings.*`), inheritance and weight
- **Config editor** — startup message, admin/owner tags, one-click config reset
- **Reliable storage** — chunked, checksummed, auto-backed-up persistence on dynamic properties

## Requirements

- **Minecraft (Bedrock)** — target `26.50` (`min_engine_version` `[1, 26, 50]`)
- **Both packs** — the [behavior pack](https://github.com/MisledPaul58/AdminUtils-BP) and the
  [resource pack](https://github.com/MisledPaul58/AdminUtils-RP)
- **Beta APIs experiment** enabled on your world, realm or server

## Installation

1. Download `AdminUtils BP [26.50] v*.mcpack` from the
   [**latest release**](https://github.com/MisledPaul58/AdminUtils-BP/releases) (or grab the newest
   [Actions artifact](https://github.com/MisledPaul58/AdminUtils-BP/actions) if no release exists yet).
2. Download the matching resource pack — `AdminUtils RP Dark …` or `AdminUtils RP Light …` — from
   the **[resource pack repository](https://github.com/MisledPaul58/AdminUtils-RP)**.
3. Import both `.mcpack` files into Minecraft (open them, or use *Settings → Behavior/Resource Packs*).
4. Enable the **Beta APIs** experiment on the world.
5. Jump to [First steps](#first-steps).

## First steps

Once the world is loaded:

```mcfunction
/give @s au:wand
```

```mcfunction
/tag @s add -auadmin
```

- The **Admin's wand** shows up in the *sword* category of the Creative inventory (or use `/give`).
- Use it by **right-clicking** — or **holding**, on touch screens.
- The `.lang` file in the [resource pack repository](https://github.com/MisledPaul58/AdminUtils-RP/blob/release/texts/en_US.lang)
  contains every in-game string if you want to translate or reword the UI.

## Known issues

- The **Beta APIs experiment** is mandatory; without it the scripts never start.
- Both packs must be installed together (the RP's `manifest.json` is referenced by this pack).
- One-time listeners currently skip later listeners for the same event in the internal event
  emitter (regression test in `test/eventEmitter.test.ts`).
- Type checking still reports legacy errors in `src/main.ts` and `src/systems/freeCam.ts` — the
  build keeps emitting while that is being paid down (see [Building from source](#building-from-source)).

## Building from source

For contributors and anyone who wants an unreleased build.

Requirements: **Node.js 22.12+**.

```bash
git clone https://github.com/MisledPaul58/AdminUtils-BP.git
npm ci
npm run package   # builds and produces dist/AdminUtils BP [26.50] v<version>.mcpack
```

> [!NOTE]
> `src/` is the source of truth and `scripts/` is **generated** build output — it is intentionally
> not committed. Always run `npm run build` after cloning.

| Command | Description |
| --- | --- |
| `npm run build` | Clean, compile `src/` → `scripts/`, sync the version into `manifest.json` |
| `npm run watch` | Recompile on every change |
| `npm run typecheck` | Type-check `src/` and `test/` without emitting |
| `npm test` | Run the unit test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint `src/` with ESLint |
| `npm run package` | Build and produce `dist/AdminUtils BP [<mc version>] v<version>.mcpack` |

To debug in-game, attach a debugger using the bundled configuration in
[`.vscode/launch.json`](./.vscode/launch.json) (port `19144`) after enabling the Minecraft debugger.

## Testing

Unit tests run without a game client. They use lightweight in-memory stand-ins for
`@minecraft/server` and `@minecraft/server-ui` (see `test/mocks/`) so pure logic and the
persistence layer can be exercised in milliseconds.

```bash
npm test
```

Every push runs **lint → type-check → tests → build → package** in GitHub Actions
([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) and uploads the `.mcpack` as a build
artifact.

## Project structure

```
src/            TypeScript source (source of truth)
  database/       checksummed, chunked persistence layer
  permissions/    groups, users, inheritance, wildcards
  ui/             form builder + UI plugins
  systems/        freecam and other systems
  utils/          helpers (incl. a vendored copy of moment.js)
scripts/        GENERATED — compiled output loaded by Minecraft (git-ignored)
test/           Vitest tests + in-memory @minecraft/* mocks
tools/          build / clean / pack helpers (plain Node ESM)
manifest.json   pack manifest (version is injected at build time)
```

## Contributing

Bug reports and pull requests are welcome on the [issue tracker](https://github.com/MisledPaul58/AdminUtils-BP/issues).

- Fork and branch off `dev`, then open a PR against `dev`.
- CI must pass (lint, tests, build) before a PR is merged.
- Please keep the `src/` → `scripts/` split intact — never commit build output.

## License

[GPL-3.0-or-later](./LICENSE) © MisledPaul58.
