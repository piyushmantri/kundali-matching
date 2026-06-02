import type { BirthDetails } from "../types.js";
import { birthJd, moonSiderealLong, marsSiderealLong, nakshatraIndex, rashiIndex } from "./ephemeris.js";
import { NAKSHATRA_NADI } from "./tables.js";

// Rajju groups (nakshatra index 0-26 → group 0-4)
// Same Rajju = incompatible (longevity concern)
const NAKSHATRA_RAJJU: ReadonlyArray<number> = [
  3, // 0  Ashwini
  0, // 1  Bharani
  0, // 2  Krittika
  1, // 3  Rohini
  1, // 4  Mrigashira
  2, // 5  Ardra
  2, // 6  Punarvasu
  3, // 7  Pushya
  3, // 8  Ashlesha
  4, // 9  Magha
  4, // 10 Purva Phalguni
  4, // 11 Uttara Phalguni
  3, // 12 Hasta
  3, // 13 Chitra
  2, // 14 Swati
  2, // 15 Vishakha
  1, // 16 Anuradha
  1, // 17 Jyeshtha
  0, // 18 Mula
  0, // 19 Purva Ashadha
  0, // 20 Uttara Ashadha
  1, // 21 Shravana
  1, // 22 Dhanishtha
  2, // 23 Shatabhisha
  2, // 24 Purva Bhadrapada
  3, // 25 Uttara Bhadrapada
  4, // 26 Revati
];

// Mangal Dosha: Mars in houses 1/2/4/7/8/12 from Moon sign (Chandra Lagna method).
// Ascendant-based check omitted — requires birth location (lat/lon + timezone) for sidereal time.
// Chandra Lagna is the standard fallback and is widely used when exact lagna is unavailable.
// Accuracy: Mars position ±1-2° (Keplerian orbit, Meeus Table 31.a) — sufficient for 30° house arcs.
const MANGAL_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

export function mangalDosha(p: BirthDetails): boolean {
  const jd = birthJd(p.dob, p.tob);
  const moonRashi = rashiIndex(moonSiderealLong(jd));
  const marsRashi = rashiIndex(marsSiderealLong(jd));
  const house = ((marsRashi - moonRashi + 12) % 12) + 1;
  return MANGAL_HOUSES.has(house);
}

// Nadi dosha: same nadi = dosha (genetic incompatibility concern)
export function nadiDosha(fixed: BirthDetails, candidate: BirthDetails): boolean {
  const fjd = birthJd(fixed.dob, fixed.tob);
  const cjd = birthJd(candidate.dob, candidate.tob);
  const fn = nakshatraIndex(moonSiderealLong(fjd));
  const cn = nakshatraIndex(moonSiderealLong(cjd));
  return (NAKSHATRA_NADI[fn] ?? -1) === (NAKSHATRA_NADI[cn] ?? -2);
}

// Rajju porutham: different rajju group = compatible (true = ok)
export function rajjuPorutham(fixed: BirthDetails, candidate: BirthDetails): boolean {
  const fjd = birthJd(fixed.dob, fixed.tob);
  const cjd = birthJd(candidate.dob, candidate.tob);
  const fn = nakshatraIndex(moonSiderealLong(fjd));
  const cn = nakshatraIndex(moonSiderealLong(cjd));
  return (NAKSHATRA_RAJJU[fn] ?? -1) !== (NAKSHATRA_RAJJU[cn] ?? -2);
}
