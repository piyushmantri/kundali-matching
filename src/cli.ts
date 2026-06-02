import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { BirthDetails, MatchResult } from "./types.js";
import { calculateAshtakoot } from "./engine/ashtakoot.js";
import { mangalDosha, nadiDosha, rajjuPorutham } from "./engine/doshas.js";
import { formatMatch } from "./engine/format.js";

async function main() {
  const args = process.argv.slice(2);
  const candidateFlag = args.indexOf("--candidate");
  if (candidateFlag === -1 || !args[candidateFlag + 1]) {
    console.error("Usage: npx tsx src/cli.ts --candidate <path-to-profile.json>");
    process.exit(1);
  }

  const fixedPath = resolve(process.cwd(), "profile.json");
  const candidatePath = resolve(process.cwd(), args[candidateFlag + 1]!);

  const fixed: BirthDetails = JSON.parse(await readFile(fixedPath, "utf8"));
  const candidate: BirthDetails = JSON.parse(await readFile(candidatePath, "utf8"));

  const { total, max, kootas, fixedStar, candidateStar } = calculateAshtakoot(fixed, candidate);
  console.log(`[Fixed]     Moon: ${fixedStar.nakshatraName} (${fixedStar.nakshatra}), ${fixedStar.rashiName}, ${fixedStar.siderealLong.toFixed(2)}°`);
  console.log(`[Candidate] Moon: ${candidateStar.nakshatraName} (${candidateStar.nakshatra}), ${candidateStar.rashiName}, ${candidateStar.siderealLong.toFixed(2)}°`);
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

  const result: MatchResult = {
    fixed,
    candidate,
    ashtakootTotal: total,
    ashtakootMax: max,
    kootas,
    mangalDosha: {
      fixed: fixedMangal,
      candidate: candidateMangal,
      neutralized: fixedMangal && candidateMangal,
    },
    nadiDosha: nadi,
    rajjuPorutham: rajju,
    summary,
    disclaimer: "Real Moon longitude (Meeus ELP2000 + Lahiri ayanamsha). Mangal Dosha requires Mars position — shown as heuristic only.",
  };

  console.log(formatMatch(result));
}

main().catch((e) => { console.error(e); process.exit(1); });
