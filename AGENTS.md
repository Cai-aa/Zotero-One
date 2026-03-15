# AGENTS.md

## Cursor Cloud specific instructions

This is a **Zotero 7 desktop plugin** (`.xpi` extension), not a web app. There are no backend services, databases, or Docker containers.

### Quick reference

| Action                    | Command              |
| ------------------------- | -------------------- |
| Install deps              | `npm install`        |
| Lint / format check       | `npm run lint:check` |
| Auto-fix lint             | `npm run lint:fix`   |
| Build plugin              | `npm run build`      |
| Dev server (needs Zotero) | `npm start`          |

All commands are documented in `package.json` scripts and `CLAUDE.md`.

### Caveats

- **No automated test suite** exists (`npm test` exits with an error by design). Validate changes via `npm run lint:check` and `npm run build`.
- **`npm start`** launches `zotero-plugin serve`, which requires a running Zotero 7 desktop instance to connect to. It **cannot** run headlessly in a cloud VM. Build verification (`npm run build`) is the primary validation method in this environment.
- After `npm install`, binaries in `node_modules/.bin/` may lack execute permission. Run `chmod +x node_modules/.bin/*` if `prettier` or `eslint` fail with "Permission denied".
- The build produces `.scaffold/build/zotero-one.xpi` — this is the installable plugin artifact.
- A pre-existing Prettier formatting issue exists in `src/modules/quickPreview.ts`; `npm run lint:check` will report it.
