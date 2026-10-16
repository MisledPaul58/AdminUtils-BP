# Changelog

All notable changes to this project are documented here. The format is loosely based on
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Reproducible build pipeline: `npm run build` compiles `src/` to `scripts/`, cleans stale
  output, and injects the pack version into `manifest.json`.
- Unit test suite (Vitest) with in-memory `@minecraft/server` mocks, covering the checksum and
  database persistence layer, wildcard permissions, change tracking, permission nodes, the
  event emitter and `deepClone`.
- ESLint configuration and a GitHub Actions CI workflow (lint, type-check, test, build, package).
- `npm run package` to produce `dist/AdminUtils BP [<mc version>] v<version>.mcpack`.
- README, editorconfig and this changelog.

### Changed
- `scripts/` build output, `node_modules/` and IDE folders are no longer tracked in git;
  `src/` is now the single source of truth.
- `tsconfig.json` pins `rootDir`, enables source maps and emits output with LF endings.
- Permissions plugin: adding a permission node now goes through a choice screen — type it from
  scratch or pick it by index from the numbered catalog list. The final form is prefilled and
  short, so the catalog list no longer bloats the submit view. Invalid input reopens the
  form instead of stranding the player.

### Fixed
- Database: checksum-verified, chunked persistence with backup restore on corruption and
  migration from the legacy `_length` format.
- `EventEmitter.emit` no longer returns early when it reaches an already-fired `once` listener —
  it now skips that single listener, so listeners registered after it keep running and `emit`
  reports the correct status. Regression test in `test/eventEmitter.test.ts`.
