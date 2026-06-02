// kundali-match — self-contained tele application hook.
//
// (1) DEV-ONLY .ts ASSUMPTION: this file is dynamic-imported via
//     pathToFileURL(...).href with the literal `hook.ts` filename. The current
//     dev runtime uses tsx which can import .ts directly. A future compiled
//     build must either keep the .ts source on disk or migrate BOTH call sites
//     (loadCodeAppContext + tryApplicationSlashCommand) at once.
//
// (2) DO NOT import from outside this folder or tele internals — the hook is
//     intentionally framework-agnostic. Only node:* + relative sibling files.
//     This is why we use `console.warn` instead of tele's logger; introducing
//     a tele dependency would couple plugins to the host's internals and
//     break the "copy hook.ts to applications/<slug>/" install pattern.
//
// (3) PROFILE RESOLUTION (read fresh on every getContext call):
//     Single `<installed_path>/profile.json`. The hook lives at
//     `<installed_path>/src/hook.ts`, so the profile is one level up
//     (`join(__hookDir, "..", "profile.json")`). Operator writes this via
//     `/set-profile` or the dashboard. No seed/override split — what's on
//     disk is what the AI sees.
//     If not readable/parseable, profile = null and the [FIXED-PROFILE]
//     section shows "no fixed profile configured".
//     No in-memory cache: operator edits land on the next AI turn.
//
// (4) METHODOLOGY TEXT mirrored from the kundali repo
//     (~/spaps/kundali/src/engine/methodology.ts). Drift caveat: if the
//     kundali repo's METHODOLOGY_TEXT changes, mirror the update here. The
//     methodology is a stable algorithmic constant (Ashtakoot 8 kootas), so
//     the drift risk is low.
//
// (5) handleSlashCommand("set-profile", args, chatId, ctx?):
//       - Empty args → return usage text.
//       - Non-JSON args → return error text.
//       - JSON missing required fields (name, dob, gender) → error text.
//       - Trim + cap string fields (notes ≤ 1000, others ≤ 200) before write.
//       - writeFile to sibling profile.json (atomic-enough for single-writer).
//       - NEVER throws — all I/O wrapped in try/catch returning error string.
//
// (6) METRICS POSITIONAL CONTRACT (host: apps/server/src/ai/applications.ts
//     in the tele repo — that's where the emit closures are constructed via
//     makeAppEmit(slug)). The host invokes:
//       getContext(chatId, ctx?)               — ctx is the SECOND arg
//       handleSlashCommand(cmd, args, chatId, ctx?)  — ctx is the FOURTH arg
//     ctx.emit("name", value?) bumps a per-app custom counter.
//     ctx.emitTimeseries("name", value) appends a timestamped point to a
//     per-app line-chart ring (240 samples per metric, ~2hr @ 30s cadence,
//     persisted to InfluxDB). Defensive pattern:
//       const emit = ctx?.emit ?? (() => {});
//       const emitTs = ctx?.emitTimeseries ?? (() => {});
//     ctx.storeResult(data) writes a JSONB row to kundali_matches in the app's
//     configured database (database_url in tele's application settings, falling
//     back to tele's own DB). Call fire-and-forget:
//       void storeResult?.({...}).catch(() => {});
//     All closures are no-ops when ctx is undefined — keeps the hook usable
//     from the standalone kundali repo (where ctx is undefined). Custom
//     metric names MUST match /^[a-z0-9_]{1,64}$/ at the host boundary;
//     invalid names are silently dropped (warned once per slug per type).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { calculateAshtakoot } from "./engine/ashtakoot.js";
import { mangalDosha, nadiDosha, rajjuPorutham } from "./engine/doshas.js";
import { formatMatch } from "./engine/format.js";
import type { BirthDetails } from "./types.js";

interface HookContext {
  emit?: (name: string, value?: number) => void;
  emitTimeseries?: (name: string, value: number) => void;
  storeResult?: (data: Record<string, unknown>) => Promise<void>;
}

const __hookDir = dirname(fileURLToPath(import.meta.url));
// Single profile path: sibling of the installed repo root (one level up from src/).
const overridePath = join(__hookDir, "..", "profile.json");

const PERSONA = [
  "[KUNDALI-PERSONA]",
  "You are a Vedic astrology assistant specializing in Kundali (birth-chart) matchmaking.",
  "IMPORTANT: this v1 uses heuristic guidance only — there is no live ephemeris,",
  "no real planetary positions, and the Ashtakoot/dosha figures are illustrative.",
  "Frame answers as exploratory guidance, not as factual astrological computation.",
  "When the user asks about compatibility, compare their query against the fixed profile below.",
].join("\n");

const METHODOLOGY = [
  "[METHODOLOGY]",
  "Heuristic v1 — Ashtakoot (Guna Milan) is the 36-point Vedic compatibility framework:",
  "  1. Varna (1 pt) — spiritual compatibility / temperament caste.",
  "  2. Vashya (2 pt) — mutual control / dominance balance.",
  "  3. Tara (3 pt) — birth-star compatibility / health & wellbeing.",
  "  4. Yoni (4 pt) — sexual/physical compatibility (28 yoni archetypes).",
  "  5. Graha Maitri (5 pt) — mental/intellectual harmony (lord-of-moon-sign friendship).",
  "  6. Gana (6 pt) — temperament: Deva, Manushya, Rakshasa.",
  "  7. Bhakoot (7 pt) — emotional/financial compatibility (moon-sign distance).",
  "  8. Nadi (8 pt) — genetic/progeny compatibility; same-nadi is the heaviest dosha.",
  "Total out of 36; 18+ traditionally considered acceptable, 24+ very good.",
  "",
  "Doshas to flag in qualitative discussion:",
  "  - Mangal Dosha — Mars in 1/2/4/7/8/12 house; affects marital harmony.",
  "  - Nadi Dosha — same Nadi (Aadi/Madhya/Antya) between partners.",
  "  - Rajju Dosha — same Rajju group; relates to longevity of marriage.",
  "",
  "Remedies in classical texts include specific pujas, gemstones, and timing windows;",
  "this assistant does NOT prescribe remedies — it only frames the qualitative landscape.",
].join("\n");

interface Profile {
  name?: string;
  dob?: string;
  tob?: string;
  pob?: string;
  tz?: string;
  lat?: number;
  lon?: number;
  gender?: string;
  notes?: string;
  [k: string]: unknown;
}

async function tryReadProfile(path: string): Promise<Profile | null> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Profile;
    }
    return null;
  } catch {
    return null;
  }
}

function formatProfile(p: Profile | null): string {
  if (!p) {
    return [
      "[FIXED-PROFILE]",
      "(no fixed profile configured — operator has not run /set-profile",
      "and no seed file is present)",
    ].join("\n");
  }
  const lines: string[] = ["[FIXED-PROFILE]"];
  if (p.name) lines.push(`Name: ${p.name}`);
  if (p.dob) lines.push(`Date of birth: ${p.dob}`);
  if (p.tob) lines.push(`Time of birth: ${p.tob}`);
  if (p.pob) lines.push(`Place of birth: ${p.pob}`);
  if (p.tz) lines.push(`Timezone: ${p.tz}`);
  if (typeof p.lat === "number") lines.push(`Latitude: ${p.lat}`);
  if (typeof p.lon === "number") lines.push(`Longitude: ${p.lon}`);
  if (p.gender) lines.push(`Gender: ${p.gender}`);
  if (p.notes) lines.push(`Notes: ${p.notes}`);
  return lines.join("\n");
}

export async function getContext(_chatId: string, ctx?: HookContext): Promise<string> {
  const emit = ctx?.emit ?? (() => {});
  const emitTs = ctx?.emitTimeseries ?? (() => {});
  const start = Date.now();
  try {
    const profile = await tryReadProfile(overridePath);
    if (profile) emit("profile_loaded");
    else emit("profile_missing");
    const kundaliRoot = join(__hookDir, "..");
    const computation = [
      "[COMPUTATION]",
      "When computing Ashtakoot compatibility, ALWAYS use run_shell — NEVER estimate scores yourself.",
      "The engine uses a deterministic hash of the DOB string; real Vedic nakshatra would differ.",
      "Step 1: write candidate JSON to /tmp/kundali_candidate.json using write_file tool.",
      '  Required fields: name (string), dob ("YYYY-MM-DD"), gender ("male"/"female"/"other")',
      '  Optional: tob ("HH:MM"), pob (string)',
      "  Convert natural-language dates to YYYY-MM-DD (e.g. '16th March 1995' → '1995-03-16').",
      `Step 2: run_shell with command="node_modules/.bin/tsx src/cli.ts --candidate /tmp/kundali_candidate.json" and cwd="${kundaliRoot}"`,
      "  If node_modules/.bin/tsx fails, try command=\"npx tsx src/cli.ts --candidate /tmp/kundali_candidate.json\" with same cwd.",
      "Step 3: call store_kundali_match tool with candidate_name, candidate_dob, candidate_gender, candidate_tob (if known), candidate_pob (if known), ashtakoot_total, ashtakoot_max, and a one-line summary. Do this BEFORE replying.",
      "Step 4: include the shell output verbatim in your reply.",
      "DO NOT delete or clean up /tmp/kundali_candidate.json — leave it.",
      "NEVER compute Ashtakoot scores manually — the shell command gives exact results matching the dashboard.",
    ].join("\n");
    const result = [PERSONA, formatProfile(profile), METHODOLOGY, computation].join("\n\n");
    emitTs("getcontext_duration_ms", Date.now() - start);
    return result;
  } catch (err) {
    console.warn("kundali-match getContext error:", err);
    // Emit duration on the failure path too — operator wants to see how long
    // a broken getContext takes (often points at a hang vs an immediate throw).
    emitTs("getcontext_duration_ms", Date.now() - start);
    return [PERSONA, formatProfile(null), METHODOLOGY].join("\n\n");
  }
}

const STRING_CAP = 200;
const NOTES_CAP = 1000;

const MATCH_USAGE = [
  "Usage: /match <JSON>",
  "",
  "Required fields: name, dob (YYYY-MM-DD), gender (male/female/other)",
  "Optional fields: tob (HH:MM), pob",
  "",
  "Example:",
  '/match {"name":"Shailem","dob":"1995-03-16","gender":"female","tob":"04:35","pob":"Amravati, Maharashtra"}',
].join("\n");

async function handleMatch(
  args: string,
  emit: (name: string, value?: number) => void,
  emitTs: (name: string, value: number) => void,
  storeResult?: (data: Record<string, unknown>) => Promise<void>,
): Promise<string> {
  const start = Date.now();
  if (args.trim() === "") return MATCH_USAGE;
  let raw: unknown;
  try {
    raw = JSON.parse(args);
  } catch {
    emit("match_invalid_input");
    return `Error: invalid JSON.\n\n${MATCH_USAGE}`;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    emit("match_invalid_input");
    return `Error: expected a JSON object.\n\n${MATCH_USAGE}`;
  }
  const input = raw as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const dob = typeof input.dob === "string" ? input.dob.trim() : "";
  const gender = typeof input.gender === "string" ? input.gender.trim() : "";
  const missing: string[] = [];
  if (!name) missing.push("name");
  if (!dob) missing.push("dob");
  if (!gender) missing.push("gender");
  if (missing.length > 0) {
    emit("match_invalid_input");
    return `Error: missing required field(s): ${missing.join(", ")}.\n\n${MATCH_USAGE}`;
  }

  const candidate: BirthDetails = {
    name,
    dob,
    gender: gender as BirthDetails["gender"],
    tob: typeof input.tob === "string" ? input.tob.trim() || undefined : undefined,
    pob: typeof input.pob === "string" ? input.pob.trim() || undefined : undefined,
  };

  const profile = await tryReadProfile(overridePath);
  if (!profile?.name || !profile?.dob || !profile?.gender) {
    emit("match_invalid_input");
    return "Error: no fixed profile configured. Use /set-profile first.";
  }
  const fixed: BirthDetails = {
    name: profile.name,
    dob: profile.dob,
    gender: (profile.gender ?? "other") as BirthDetails["gender"],
    tob: profile.tob,
    pob: profile.pob,
  };

  const { total, max, kootas } = calculateAshtakoot(fixed, candidate);
  const fixedMangal = mangalDosha(fixed);
  const candidateMangal = mangalDosha(candidate);
  const nadi = nadiDosha(fixed, candidate);
  const rajju = rajjuPorutham(fixed, candidate);
  const score = total / max;
  const summary = score >= 0.77
    ? `Excellent match (${total}/${max})`
    : score >= 0.5
    ? `Acceptable match (${total}/${max})`
    : `Caution advised (${total}/${max})`;

  emit("match_computed");
  const result = formatMatch({
    fixed,
    candidate,
    ashtakootTotal: total,
    ashtakootMax: max,
    kootas,
    mangalDosha: { fixed: fixedMangal, candidate: candidateMangal, neutralized: fixedMangal && candidateMangal },
    nadiDosha: nadi,
    rajjuPorutham: rajju,
    summary,
    disclaimer: "Real Moon longitude (Meeus ELP2000 + Lahiri ayanamsha). Mangal Dosha requires Mars position — shown as heuristic only.",
  });
  // Only emit duration on the successful compute path — validation-failure
  // early returns would skew the chart toward unrealistically-fast samples.
  emitTs("match_duration_ms", Date.now() - start);
  // Persist candidate + scores to the app's configured DB. Fire-and-forget:
  // a DB failure must not prevent the match result from being returned.
  void storeResult?.({
    candidate_name: candidate.name,
    candidate_dob: candidate.dob,
    candidate_gender: candidate.gender,
    candidate_tob: candidate.tob ?? null,
    candidate_pob: candidate.pob ?? null,
    ashtakoot_total: total,
    ashtakoot_max: max,
    score: total / max,
    summary,
  }).catch(() => {});
  return result;
}

const USAGE = [
  "Usage: /set-profile <JSON>",
  "",
  "Required fields: name, dob (YYYY-MM-DD), gender",
  "Optional fields: tob (HH:MM), pob, tz, lat (number), lon (number), notes",
  "",
  "Caps: notes ≤ 1000 chars; all other string fields ≤ 200 chars.",
  "",
  "Example:",
  '/set-profile {"name":"Asha","dob":"1995-06-15","tob":"14:30","pob":"Mumbai","gender":"female","notes":""}',
].join("\n");

function capString(value: unknown, cap: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, cap);
}

function capNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

export async function handleSlashCommand(
  cmd: string,
  args: string,
  _chatId: string,
  ctx?: HookContext,
): Promise<string> {
  const emit = ctx?.emit ?? (() => {});
  const emitTs = ctx?.emitTimeseries ?? (() => {});
  const storeResult = ctx?.storeResult;
  if (cmd === "match") return handleMatch(args, emit, emitTs, storeResult);
  if (cmd !== "set-profile") return "Unknown command.";

  try {
    if (args.trim() === "") return USAGE;

    let raw: unknown;
    try {
      raw = JSON.parse(args);
    } catch {
      return `Error: invalid JSON. ${USAGE}`;
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return `Error: expected a JSON object. ${USAGE}`;
    }
    const input = raw as Record<string, unknown>;

    const name = capString(input.name, STRING_CAP);
    const dob = capString(input.dob, STRING_CAP);
    const gender = capString(input.gender, STRING_CAP);

    const missing: string[] = [];
    if (!name) missing.push("name");
    if (!dob) missing.push("dob");
    if (!gender) missing.push("gender");
    if (missing.length > 0) {
      return `Error: missing required field(s): ${missing.join(", ")}. ${USAGE}`;
    }

    const validated: Profile = {
      name,
      dob,
      gender,
    };
    const tob = capString(input.tob, STRING_CAP);
    if (tob !== undefined) validated.tob = tob;
    const pob = capString(input.pob, STRING_CAP);
    if (pob !== undefined) validated.pob = pob;
    const tz = capString(input.tz, STRING_CAP);
    if (tz !== undefined) validated.tz = tz;
    const lat = capNumber(input.lat);
    if (lat !== undefined) validated.lat = lat;
    const lon = capNumber(input.lon);
    if (lon !== undefined) validated.lon = lon;
    const notes = capString(input.notes, NOTES_CAP);
    if (notes !== undefined) validated.notes = notes;

    try {
      await mkdir(dirname(overridePath), { recursive: true });
      await writeFile(overridePath, JSON.stringify(validated, null, 2));
    } catch (err) {
      console.warn("kundali-match handleSlashCommand write error:", err);
      return "Error saving profile.";
    }

    emit("profile_set");
    return `Profile saved. Name: ${validated.name}, DOB: ${validated.dob}.`;
  } catch (err) {
    console.warn("kundali-match handleSlashCommand error:", err);
    return "Error saving profile.";
  }
}
