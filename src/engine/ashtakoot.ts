import type { BirthDetails, KootaScore } from "../types.js";
import { birthJd, moonSiderealLong, nakshatraIndex, rashiIndex } from "./ephemeris.js";
import {
  NAKSHATRA_VARNA,
  RASHI_VASYA,
  VASYA_COMPAT,
  NAKSHATRA_GANA,
  GANA_COMPAT,
  NAKSHATRA_NADI,
  NAKSHATRA_YONI,
  YONI_COMPAT,
  RASHI_LORD,
  grahaMaitriScore,
  NAKSHATRA_NAMES,
  RASHI_NAMES,
} from "./tables.js";

export interface StarData {
  nakshatra: number;
  nakshatraName: string;
  rashi: number;
  rashiName: string;
  siderealLong: number;
}

export function getStarData(bd: BirthDetails): StarData {
  const jd = birthJd(bd.dob, bd.tob);
  const sl = moonSiderealLong(jd);
  const nak = nakshatraIndex(sl);
  const rashi = rashiIndex(sl);
  return {
    nakshatra: nak,
    nakshatraName: NAKSHATRA_NAMES[nak] ?? `Nak${nak}`,
    rashi,
    rashiName: RASHI_NAMES[rashi] ?? `Rashi${rashi}`,
    siderealLong: sl,
  };
}

// Varna (1 pt): groom varna <= bride varna (Brahmin=0 highest rank)
function varna(brideNak: number, groomNak: number): KootaScore {
  const bv = NAKSHATRA_VARNA[brideNak] ?? 0;
  const gv = NAKSHATRA_VARNA[groomNak] ?? 0;
  const score = gv <= bv ? 1 : 0;
  return {
    name: "Varna",
    score,
    max: 1,
    notes: score === 1 ? "Compatible varna" : "Groom varna lower than bride",
  };
}

// Vasya (2 pts): bride's vasya class over groom's
function vasya(brideRashi: number, groomRashi: number): KootaScore {
  const bv = RASHI_VASYA[brideRashi] ?? 0;
  const gv = RASHI_VASYA[groomRashi] ?? 0;
  const score = VASYA_COMPAT[bv]?.[gv] ?? 0;
  return {
    name: "Vasya",
    score,
    max: 2,
    notes: score > 0 ? "Vasya compatible" : "No vasya relation",
  };
}

// Tara (3 pts): nakshatra-distance tara type, scored bi-directionally → can be 1.5
function taraType(from: number, to: number): number {
  const pos = ((to - from + 27) % 27) + 1;
  return ((pos - 1) % 9) + 1; // 1-9
}

const TARA_FAVOURABLE = new Set([2, 4, 6, 8, 9]); // Sampat, Kshema, Sadhaka, Mitra, Param-Mitra

function tara(brideNak: number, groomNak: number): KootaScore {
  const t1 = taraType(brideNak, groomNak);
  const t2 = taraType(groomNak, brideNak);
  const f1 = TARA_FAVOURABLE.has(t1);
  const f2 = TARA_FAVOURABLE.has(t2);
  const score = f1 && f2 ? 3 : f1 || f2 ? 1.5 : 0;
  const names = ["Janma","Sampat","Vipat","Kshema","Pratyari","Sadhaka","Naidhana","Mitra","Param-Mitra"];
  return {
    name: "Tara",
    score,
    max: 3,
    notes: `Bride→Groom: ${names[t1-1] ?? t1}; Groom→Bride: ${names[t2-1] ?? t2}`,
  };
}

// Yoni (4 pts): animal compatibility + gender
function yoni(brideNak: number, groomNak: number): KootaScore {
  const [ba, bg] = NAKSHATRA_YONI[brideNak] ?? [0, 0];
  const [ga, gg] = NAKSHATRA_YONI[groomNak] ?? [0, 0];
  let score: number;
  if (ba === ga) {
    score = bg !== gg ? 4 : 2; // same animal: opp gender best, same gender ok
  } else {
    score = YONI_COMPAT[ba]?.[ga] ?? 2;
  }
  return {
    name: "Yoni",
    score,
    max: 4,
    notes: `Bride: ${yoniName(ba,bg)}; Groom: ${yoniName(ga,gg)}`,
  };
}

const ANIMAL_NAMES = ["Horse","Elephant","Ram","Snake","Dog","Cat","Rat","Cow","Buffalo","Tiger","Deer","Monkey","Lion","Mongoose"];
function yoniName(a: number, g: number): string {
  return `${ANIMAL_NAMES[a] ?? a}(${g === 0 ? "M" : "F"})`;
}

// Graha Maitri (5 pts): moon-sign lord friendship
function grahaMaitri(brideRashi: number, groomRashi: number): KootaScore {
  const bl = RASHI_LORD[brideRashi] ?? 0;
  const gl = RASHI_LORD[groomRashi] ?? 0;
  const score = grahaMaitriScore(bl, gl);
  const planets = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  return {
    name: "Graha Maitri",
    score,
    max: 5,
    notes: `${planets[bl] ?? bl} vs ${planets[gl] ?? gl}`,
  };
}

// Gana (6 pts): temperament compatibility
function gana(brideNak: number, groomNak: number): KootaScore {
  const bg = NAKSHATRA_GANA[brideNak] ?? 0;
  const gg = NAKSHATRA_GANA[groomNak] ?? 0;
  const score = GANA_COMPAT[bg]?.[gg] ?? 0;
  const names = ["Deva","Manushya","Rakshasa"];
  return {
    name: "Gana",
    score,
    max: 6,
    notes: `${names[bg] ?? bg} × ${names[gg] ?? gg}`,
  };
}

// Bhakoot (7 pts): rashi distance from bride to groom
// Bad: d ∈ {1,4,5,7,8,11} where d = (groom - bride + 12) % 12
function bhakoot(brideRashi: number, groomRashi: number): KootaScore {
  const d = (groomRashi - brideRashi + 12) % 12;
  const bad = new Set([1, 4, 5, 7, 8, 11]);
  const score = bad.has(d) ? 0 : 7;
  const pattern = d === 0 ? "1/1 same" : d === 6 ? "7/7 opposite" : `${d+1}/${12-d+1}`;
  return {
    name: "Bhakoot",
    score,
    max: 7,
    notes: `${RASHI_NAMES[brideRashi]} / ${RASHI_NAMES[groomRashi]} (${pattern})`,
  };
}

// Nadi (8 pts): different nadi = 8; same = 0 (Nadi dosha)
function nadi(brideNak: number, groomNak: number): KootaScore {
  const bn = NAKSHATRA_NADI[brideNak] ?? 0;
  const gn = NAKSHATRA_NADI[groomNak] ?? 0;
  const same = bn === gn;
  const names = ["Adi","Madhya","Antya"];
  return {
    name: "Nadi",
    score: same ? 0 : 8,
    max: 8,
    notes: same ? `Same Nadi: ${names[bn]} (dosha)` : `${names[bn]} × ${names[gn]}`,
  };
}

export function calculateAshtakoot(
  fixed: BirthDetails,
  candidate: BirthDetails,
): { total: number; max: number; kootas: KootaScore[]; fixedStar: StarData; candidateStar: StarData } {
  const fs = getStarData(fixed);
  const cs = getStarData(candidate);

  // Assign bride/groom by gender for gender-sensitive kootas (Varna, Vasya, Yoni, Bhakoot).
  // If both same gender or "other", treat fixed as bride and candidate as groom.
  const fixedIsBride = fixed.gender !== "male";
  const [bride, groom] = fixedIsBride ? [fs, cs] : [cs, fs];

  const kootas: KootaScore[] = [
    varna(bride.nakshatra, groom.nakshatra),
    vasya(bride.rashi, groom.rashi),
    tara(bride.nakshatra, groom.nakshatra),
    yoni(bride.nakshatra, groom.nakshatra),
    grahaMaitri(bride.rashi, groom.rashi),
    gana(bride.nakshatra, groom.nakshatra),
    bhakoot(bride.rashi, groom.rashi),
    nadi(bride.nakshatra, groom.nakshatra),
  ];

  const total = kootas.reduce((s, k) => s + k.score, 0);
  const max = kootas.reduce((s, k) => s + k.max, 0);
  return { total, max, kootas, fixedStar: fs, candidateStar: cs };
}
