// Real Moon longitude via Jean Meeus "Astronomical Algorithms" Ch.47 (ELP2000 abbrev.)
// Accuracy: ~0.1° for dates within ±200 years of J2000.0.
// Lahiri (Indian National) ayanamsha applied for tropical→sidereal conversion.

function mod360(x: number): number {
  return ((x % 360) + 360) % 360;
}

function d2r(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Gregorian date + UTC hour → Julian Day Number
export function dateToJd(year: number, month: number, day: number, hourUtc = 0): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5 +
    hourUtc / 24
  );
}

// Parse BirthDetails fields to JD.  Defaults to IST (+5.5 h).
export function birthJd(dob: string, tob?: string, tzOffsetHours = 5.5): number {
  const parts = dob.split("-").map(Number);
  const year = parts[0] ?? 2000;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  let hourLocal = 0;
  if (tob) {
    const tp = tob.split(":").map(Number);
    hourLocal = (tp[0] ?? 0) + (tp[1] ?? 0) / 60;
  }
  return dateToJd(year, month, day, hourLocal - tzOffsetHours);
}

// Periodic terms for Moon's longitude from Meeus Table 47.A
// Format: [D_coef, M_coef, M'_coef, F_coef, ΣL × 10⁻⁶ °]
const LONGITUDE_TERMS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 0, 1, 0, 6288774],
  [2, 0, -1, 0, 1274027],
  [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116],
  [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793],
  [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923],
  [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383],
  [2, 0, 0, -2, 15327],
  [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675],
  [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548],
  [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163],
  [1, 1, 0, 0, 4987],
  [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994],
  [4, 0, 0, 0, 3861],
  [2, 0, -3, 0, 3665],
  [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602],
  [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348],
  [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120],
  [0, 2, 0, 0, -2069],
  [2, -2, -1, 0, 2048],
  [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595],
  [4, -1, -1, 0, 1215],
  [0, 0, 2, 2, -1110],
  [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810],
  [4, -1, -2, 0, 759],
  [0, 2, -1, 0, -713],
  [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691],
  [2, -1, 0, -2, 596],
  [4, 0, 1, 0, 549],
  [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520],
  [1, 0, -2, 0, -487],
  [2, 1, 0, -2, -399],
  [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351],
  [3, 0, -2, 0, -340],
  [4, 0, -3, 0, 330],
  [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323],
  [1, 1, -1, 0, 299],
  [2, 0, 3, 0, 294],
];

// Moon's tropical longitude (degrees), Meeus Ch.47
export function moonTropicalLong(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  const Lp = mod360(
    218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000,
  );
  const D = mod360(
    297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000,
  );
  const M = mod360(357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000);
  const Mp = mod360(
    134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000,
  );
  const F = mod360(
    93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000,
  );

  // Eccentricity of Earth's orbit around Sun
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const E2 = E * E;

  let SL = 0;
  for (const [dc, mc, mpc, fc, coef] of LONGITUDE_TERMS) {
    const arg = dc * D + mc * M + mpc * Mp + fc * F;
    let factor = coef;
    const absM = Math.abs(mc);
    if (absM === 1) factor *= E;
    else if (absM === 2) factor *= E2;
    SL += factor * Math.sin(d2r(arg));
  }

  // Additive corrections
  const A1 = mod360(119.75 + 131.849 * T);
  const A2 = mod360(53.09 + 479264.29 * T);
  const Om = mod360(125.0445479 - 1934.1362608 * T + 0.0020754 * T2 + T3 / 467441);
  SL += 3958 * Math.sin(d2r(A1));
  SL += 1962 * Math.sin(d2r(Lp - F));
  SL += 318 * Math.sin(d2r(A2));
  // Nutation adjustment (small; include for completeness)
  SL -= 0.000319 * Math.sin(d2r(Om));

  return mod360(Lp + SL / 1_000_000);
}

// Lahiri (Indian National) ayanamsha in degrees at given JD.
// Value at J2000.0 = 23.85267°; precession rate ≈ 50.2564"/yr = 1.39601°/century.
export function lahiriAyanamsha(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  return 23.85267 + 1.39601 * T;
}

// Moon's sidereal longitude (Lahiri)
export function moonSiderealLong(jd: number): number {
  return mod360(moonTropicalLong(jd) - lahiriAyanamsha(jd));
}

// Nakshatra index 0-26 from sidereal longitude
export function nakshatraIndex(siderealLong: number): number {
  return Math.floor((siderealLong * 27) / 360);
}

// Rashi (Moon sign) index 0-11 from sidereal longitude
export function rashiIndex(siderealLong: number): number {
  return Math.floor(siderealLong / 30);
}

// Mars tropical longitude — simplified Keplerian orbit (Meeus, Table 31.a).
// Accuracy: ~1-2° for dates ±100 years of J2000, sufficient for house determination (30° arcs).
export function marsTropicalLong(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const L = mod360(355.45332 + 19140.30268 * T);
  const e = 0.09341233;
  const omega = mod360(336.04084 + 1.8418 * T); // longitude of perihelion
  const M = mod360(L - omega); // mean anomaly
  const Mr = d2r(M);
  // Equation of center (degrees) truncated at 3rd order — adequate for e≈0.093
  const C =
    ((2 * e - (e * e * e) / 4) * Math.sin(Mr) +
      ((5 * e * e) / 4) * Math.sin(2 * Mr) +
      ((13 * e * e * e) / 12) * Math.sin(3 * Mr)) *
    (180 / Math.PI);
  return mod360(L + C);
}

// Mars sidereal longitude (Lahiri ayanamsha)
export function marsSiderealLong(jd: number): number {
  return mod360(marsTropicalLong(jd) - lahiriAyanamsha(jd));
}
