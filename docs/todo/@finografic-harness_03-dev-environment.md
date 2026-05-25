# Dev Environment Follow-Ups

These are deferred developer-convenience items. They are not required for the current v0
package behavior, but they are worth revisiting if Codex or local shell setup friction keeps
showing up.

## Candidates

- ~~Document the required Node.js and `pnpm` environment more explicitly.~~
  **Done** — `CODEX.md` documents Node 24.3.0, pnpm 10.8.0, corepack, and the setup script.
- ~~Add a small helper script for local shell bootstrap.~~
  **Done** — setup script in `CODEX.md` runs `nvm use` (reads `.nvmrc`), `corepack enable`,
  and `pnpm install --frozen-lockfile`.
- Consider softening Husky behavior only if the environment mismatch becomes a recurring
  nuisance.
  **Status** — not needed for now. The fixed setup script ensures hooks have all required
  binaries. Revisit only if friction recurs after the setup fix.

## Notes

- Current package scripts worked correctly once the shell used the intended local Node.js and
  `pnpm` runtime.
- No `package.json` script changes are required right now.
- The Codex environment setup script was the primary friction source — it used `nvm use default`
  instead of `nvm use` (which reads `.nvmrc`), and did not enable corepack or install deps.
