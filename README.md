# kundali

Standalone Vedic astrology matchmaking engine + CLI. This is a developer playground for the algorithmic side of the kundali matchmaking flow shipped as a `code`-type plugin in the `tele` repo.

## Usage

```bash
npm install
npx tsx src/cli.ts --candidate examples/sample-query.json
```

`src/cli.ts` reads the fixed profile from `profile.json` in the current working directory and the candidate profile from the path passed via `--candidate`. It prints both profiles, the Ashtakoot guna score breakdown, the dosha checks, and a one-line summary followed by the heuristic-v1 disclaimer.

## Disclaimer

**v1 is heuristic/demo-grade.** There is no live ephemeris — Ashtakoot scores and dosha flags are derived from a deterministic hash of the date-of-birth string. Output is suitable only as a development reference and visual sanity check while wiring the matchmaking UX. Do NOT present any of this to an end-user as real astrological guidance.

## Mirror obligation

This repo and the `kundali-match` plugin in the `tele` repo (`apps/server/applications/registry/kundali-match/`) share two cross-repo invariants. When either changes here, the other side MUST be updated in lockstep:

- The `METHODOLOGY_TEXT` exported from `src/engine/methodology.ts` is mirrored verbatim into `apps/server/applications/registry/kundali-match/hook.ts` in the tele repo. The hook injects this string into Gemini's system instruction on every AI turn. **When the methodology text changes here, update the hook there.**
- The `BirthDetails` interface in `src/types.ts` is mirrored both in the tele hook's inline JSON validator AND in the route-local zod schema for `PUT /api/applications/:id/profile` in `apps/server/src/api/routes/applications.ts`. **When fields are added, renamed, or removed in `BirthDetails`, update all three sites.**
- When the hook's `handleSlashCommand` JSON contract changes (new fields, renamed keys, different validation rules), update `src/types.ts` here too. The kundali CLI uses the same `BirthDetails` schema, and a drift breaks the operator's ability to copy a profile from local CLI testing into Telegram via `/set-profile`.

## Plugin Settings UI (src/ui.tsx)

`src/ui.tsx` is the source of truth for the plugin's Settings tab in tele's dashboard. It is loaded into the tele bundle by tele's `PluginSlot` via Vite's `import.meta.glob` at build time. The component uses bare `useState`/`useEffect` and bare `fetch` against tele's existing `/api/applications/:id/profile` endpoints — it does NOT import `@tele/shared`, `@tele/web`, or TanStack Query (kundali must build independently of tele).

Mirror the file into tele with:

```bash
npm run copy-ui
```

The script ASSUMES `../tele` exists as a sibling directory (i.e. `~/spaps/kundali` and `~/spaps/tele`). It fails fast with a clear message if the tele registry folder is not found. Edits made directly in tele's `apps/server/applications/registry/kundali-match/ui.tsx` are overwritten by the next `copy-ui` run — always edit `src/ui.tsx` here and copy.

**tele must be rebuilt for ui.tsx changes to appear in the dashboard.** The Vite glob is build-time; in `pnpm dev` the dev server picks up changes via HMR for the matched chunk, but PluginSlot's `useState`/`useEffect` loader does NOT re-run automatically — reload the dashboard tab to see edits.

React and `@types/react` are devDependencies only; at runtime the component shares tele's React instance (one bundle, one React).

## Future path

The heuristic engine is intentionally a placeholder. v2 should swap the deterministic-hash pseudo-nakshatra for a real ephemeris calculation. Two viable libraries:

- [`swisseph`](https://www.npmjs.com/package/swisseph) — Node binding to the Swiss Ephemeris. Most accurate, but C++ build dependency.
- [`astronomia`](https://www.npmjs.com/package/astronomia) — pure JS port of Meeus's algorithms. Less accurate at decade scale but no build deps.

Either replaces `src/engine/doshas.ts` and the `pseudoNakshatra` helper inside `src/engine/ashtakoot.ts`. The kootas themselves and the dosha thresholds stay; only the nakshatra-derivation function changes.

## No tests

There is no test harness in v1. The CLI itself is the sanity check: run it against `examples/sample-query.json` and read the output. The tele hook has mechanical smoke tests on the tele side.
