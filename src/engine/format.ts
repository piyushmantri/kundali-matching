import type { BirthDetails, MatchResult } from "../types.js";

export function formatProfile(d: BirthDetails): string {
  const parts = [
    `Name: ${d.name}`,
    `DOB: ${d.dob}`,
    d.tob ? `TOB: ${d.tob}` : null,
    d.pob ? `POB: ${d.pob}` : null,
    d.tz ? `TZ: ${d.tz}` : null,
    d.lat != null ? `Lat: ${d.lat}` : null,
    d.lon != null ? `Lon: ${d.lon}` : null,
    `Gender: ${d.gender}`,
    d.notes ? `Notes: ${d.notes}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

export function formatMatch(r: MatchResult): string {
  const kootaLines = r.kootas.map(
    (k) => `  ${k.name}: ${k.score}/${k.max} — ${k.notes}`
  );
  const mangal = r.mangalDosha.fixed && r.mangalDosha.candidate
    ? "Both have Mangal Dosha (neutralized)"
    : r.mangalDosha.fixed || r.mangalDosha.candidate
    ? `Mangal Dosha present (${r.mangalDosha.fixed ? "fixed" : "candidate"} partner)`
    : "No Mangal Dosha";

  return [
    "=== FIXED PROFILE ===",
    formatProfile(r.fixed),
    "",
    "=== CANDIDATE PROFILE ===",
    formatProfile(r.candidate),
    "",
    `=== ASHTAKOOT SCORE: ${r.ashtakootTotal}/${r.ashtakootMax} ===`,
    ...kootaLines,
    "",
    "=== DOSHAS ===",
    mangal,
    `Nadi Dosha: ${r.nadiDosha ? "YES (mismatch)" : "No"}`,
    `Rajju Porutham: ${r.rajjuPorutham ? "Compatible" : "Incompatible"}`,
    "",
    `SUMMARY: ${r.summary}`,
    "",
    `⚠️  ${r.disclaimer}`,
  ].join("\n");
}
