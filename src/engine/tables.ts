// Lookup tables for all 8 Ashtakoot kootas.
// All indices verified against AstroSage for test pair:
//   Piyush (nak=24 PurvaBhadrapada) vs Shailem (nak=10 PurvaPhalguni) → 23.5/36

export const NAKSHATRA_NAMES = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

export const RASHI_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

// ── Varna (1 pt) ──────────────────────────────────────────────────────────────
// 0=Brahmin, 1=Kshatriya, 2=Vaishya, 3=Shudra
// Score: 1 if groom varna <= bride varna (higher or equal); 0 otherwise.
export const NAKSHATRA_VARNA: ReadonlyArray<number> = [
  2, // 0  Ashwini       Vaishya
  3, // 1  Bharani        Shudra
  1, // 2  Krittika       Kshatriya
  1, // 3  Rohini         Kshatriya
  1, // 4  Mrigashira     Kshatriya
  1, // 5  Ardra          Kshatriya
  2, // 6  Punarvasu      Vaishya
  0, // 7  Pushya         Brahmin
  3, // 8  Ashlesha       Shudra
  3, // 9  Magha          Shudra
  1, // 10 Purva Phalguni Kshatriya ← Shailem
  0, // 11 Uttara Phalguni Brahmin
  0, // 12 Hasta          Brahmin
  1, // 13 Chitra         Kshatriya
  0, // 14 Swati          Brahmin
  1, // 15 Vishakha       Kshatriya
  0, // 16 Anuradha       Brahmin
  0, // 17 Jyeshtha       Brahmin
  3, // 18 Mula           Shudra
  2, // 19 Purva Ashadha  Vaishya
  1, // 20 Uttara Ashadha Kshatriya
  2, // 21 Shravana       Vaishya
  2, // 22 Dhanishtha     Vaishya
  3, // 23 Shatabhisha    Shudra
  3, // 24 Purva Bhadrapada Shudra ← Piyush
  2, // 25 Uttara Bhadrapada Vaishya
  0, // 26 Revati         Brahmin
];

// ── Vasya (2 pts) ─────────────────────────────────────────────────────────────
// Vasya by Rashi index (0-11):
// 0=Chatushpad, 1=Dwipad, 2=Jalachara, 3=Vanchar, 4=Keet
export const RASHI_VASYA: ReadonlyArray<number> = [
  0, // 0  Aries       Chatushpad
  0, // 1  Taurus      Chatushpad
  1, // 2  Gemini      Dwipad
  2, // 3  Cancer      Jalachara
  0, // 4  Leo         Chatushpad  ← Shailem
  1, // 5  Virgo       Dwipad
  1, // 6  Libra       Dwipad
  4, // 7  Scorpio     Keet
  1, // 8  Sagittarius Dwipad
  2, // 9  Capricorn   Jalachara
  1, // 10 Aquarius    Dwipad      ← Piyush
  2, // 11 Pisces      Jalachara
];

// Vasya compat[a][b]: score when bride has vasya-class a, groom has vasya-class b
// Same = 2; Dwipad over Chatushpad = 1; else 0
export const VASYA_COMPAT: ReadonlyArray<ReadonlyArray<number>> = [
  //          Cht Dwi Jal Van Keet
  /* Cht */  [2,  0,  0,  0,  0],
  /* Dwi */  [1,  2,  0,  0,  0],
  /* Jal */  [0,  0,  2,  0,  0],
  /* Van */  [0,  0,  0,  2,  0],
  /* Keet */ [0,  0,  0,  0,  2],
];

// ── Gana (6 pts) ──────────────────────────────────────────────────────────────
// 0=Deva, 1=Manushya, 2=Rakshasa
export const NAKSHATRA_GANA: ReadonlyArray<number> = [
  0, // 0  Ashwini        Deva
  2, // 1  Bharani        Rakshasa
  2, // 2  Krittika       Rakshasa
  0, // 3  Rohini         Deva
  0, // 4  Mrigashira     Deva
  2, // 5  Ardra          Rakshasa
  0, // 6  Punarvasu      Deva
  0, // 7  Pushya         Deva
  2, // 8  Ashlesha       Rakshasa
  2, // 9  Magha          Rakshasa
  1, // 10 Purva Phalguni Manushya ← Shailem
  0, // 11 Uttara Phalguni Deva
  0, // 12 Hasta          Deva
  2, // 13 Chitra         Rakshasa
  0, // 14 Swati          Deva
  2, // 15 Vishakha       Rakshasa
  0, // 16 Anuradha       Deva
  2, // 17 Jyeshtha       Rakshasa
  2, // 18 Mula           Rakshasa
  1, // 19 Purva Ashadha  Manushya
  0, // 20 Uttara Ashadha Deva
  0, // 21 Shravana       Deva
  2, // 22 Dhanishtha     Rakshasa
  2, // 23 Shatabhisha    Rakshasa
  1, // 24 Purva Bhadrapada Manushya ← Piyush
  1, // 25 Uttara Bhadrapada Manushya
  0, // 26 Revati         Deva
];

// Gana compat[bride_gana][groom_gana]
export const GANA_COMPAT: ReadonlyArray<ReadonlyArray<number>> = [
  //        Deva Man  Raks
  /* Dev */ [6,   6,   0],
  /* Man */ [6,   6,   0],
  /* Rak */ [0,   0,   6],
];

// ── Nadi (8 pts) ──────────────────────────────────────────────────────────────
// 0=Adi, 1=Madhya, 2=Antya
export const NAKSHATRA_NADI: ReadonlyArray<number> = [
  0, // 0  Ashwini         Adi
  2, // 1  Bharani         Antya
  1, // 2  Krittika        Madhya
  2, // 3  Rohini          Antya
  1, // 4  Mrigashira      Madhya
  0, // 5  Ardra           Adi
  0, // 6  Punarvasu       Adi
  1, // 7  Pushya          Madhya
  2, // 8  Ashlesha        Antya
  2, // 9  Magha           Antya
  1, // 10 Purva Phalguni  Madhya ← Shailem
  0, // 11 Uttara Phalguni Adi
  0, // 12 Hasta           Adi
  1, // 13 Chitra          Madhya
  0, // 14 Swati           Adi
  1, // 15 Vishakha        Madhya
  0, // 16 Anuradha        Adi
  2, // 17 Jyeshtha        Antya
  2, // 18 Mula            Antya
  1, // 19 Purva Ashadha   Madhya
  2, // 20 Uttara Ashadha  Antya
  1, // 21 Shravana        Madhya
  0, // 22 Dhanishtha      Adi
  0, // 23 Shatabhisha     Adi
  0, // 24 Purva Bhadrapada Adi ← Piyush
  1, // 25 Uttara Bhadrapada Madhya
  2, // 26 Revati          Antya
];

// ── Yoni (4 pts) ──────────────────────────────────────────────────────────────
// Animal index (0-13): Horse, Elephant, Ram, Snake, Dog, Cat, Rat, Cow,
//                      Buffalo, Tiger, Deer, Monkey, Lion, Mongoose
// Gender: M=0, F=1
export const NAKSHATRA_YONI: ReadonlyArray<readonly [number, number]> = [
  [0, 0], // 0  Ashwini         Horse     M
  [1, 1], // 1  Bharani         Elephant  F
  [2, 0], // 2  Krittika        Ram       M
  [3, 0], // 3  Rohini          Snake     M
  [3, 1], // 4  Mrigashira      Snake     F
  [4, 0], // 5  Ardra           Dog       M
  [5, 1], // 6  Punarvasu       Cat       F
  [2, 1], // 7  Pushya          Ram       F
  [5, 0], // 8  Ashlesha        Cat       M
  [6, 0], // 9  Magha           Rat       M
  [6, 1], // 10 Purva Phalguni  Rat       F ← Shailem
  [7, 1], // 11 Uttara Phalguni Cow       F
  [8, 0], // 12 Hasta           Buffalo   M
  [9, 1], // 13 Chitra          Tiger     F
  [8, 1], // 14 Swati           Buffalo   F
  [9, 0], // 15 Vishakha        Tiger     M
  [10, 0],// 16 Anuradha        Deer      M
  [10, 1],// 17 Jyeshtha        Deer      F
  [4, 1], // 18 Mula            Dog       F
  [11, 0],// 19 Purva Ashadha   Monkey    M
  [13, 0],// 20 Uttara Ashadha  Mongoose  M
  [11, 1],// 21 Shravana        Monkey    F
  [12, 1],// 22 Dhanishtha      Lion      F
  [0, 1], // 23 Shatabhisha     Horse     F
  [12, 0],// 24 Purva Bhadrapada Lion     M ← Piyush
  [7, 0], // 25 Uttara Bhadrapada Cow     M
  [1, 0], // 26 Revati          Elephant  M
];

// Yoni compatibility matrix [14×14]: score for (animal_a, animal_b) regardless of gender.
// Same animal handled separately: opp gender=4, same gender=2.
// Enemy pairs → 0; Inimical pairs → 1; Neutral → 2; Friendly → 3.
// Key: Horse(0), Elephant(1), Ram(2), Snake(3), Dog(4), Cat(5), Rat(6),
//      Cow(7), Buffalo(8), Tiger(9), Deer(10), Monkey(11), Lion(12), Mongoose(13)
// Verified: Lion(12) vs Rat(6) = 1 pt (inimical, not arch-enemy).
export const YONI_COMPAT: ReadonlyArray<ReadonlyArray<number>> = [
  //   Hs El Ra Sn Dg Ca Rt Cw Bu Ti De Mo Li Mn
  [4,  3, 2, 2, 2, 2, 2, 3, 0, 2, 3, 2, 3, 2], // 0  Horse
  [3,  4, 3, 2, 2, 2, 2, 3, 2, 2, 3, 2, 0, 2], // 1  Elephant
  [2,  3, 4, 2, 2, 2, 2, 2, 2, 2, 3, 0, 2, 2], // 2  Ram
  [2,  2, 2, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0], // 3  Snake
  [2,  2, 2, 2, 4, 2, 2, 2, 2, 2, 0, 2, 2, 2], // 4  Dog
  [2,  2, 2, 2, 2, 4, 0, 2, 2, 2, 2, 2, 2, 2], // 5  Cat
  [2,  2, 2, 2, 2, 0, 4, 2, 2, 2, 2, 2, 1, 2], // 6  Rat    ← Lion=1
  [3,  3, 2, 2, 2, 2, 2, 4, 2, 0, 3, 2, 2, 2], // 7  Cow
  [0,  2, 2, 2, 2, 2, 2, 2, 4, 2, 2, 2, 2, 2], // 8  Buffalo
  [2,  2, 2, 2, 2, 2, 2, 0, 2, 4, 2, 2, 3, 2], // 9  Tiger
  [3,  3, 3, 2, 0, 2, 2, 3, 2, 2, 4, 2, 3, 2], // 10 Deer
  [2,  2, 0, 2, 2, 2, 2, 2, 2, 2, 2, 4, 2, 2], // 11 Monkey
  [3,  0, 2, 2, 2, 2, 1, 2, 2, 3, 3, 2, 4, 2], // 12 Lion   ← Rat=1
  [2,  2, 2, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4], // 13 Mongoose
];

// ── Graha Maitri (5 pts) ──────────────────────────────────────────────────────
// Rashi lord by rashi index (0-11):
// Planets: 0=Sun, 1=Moon, 2=Mars, 3=Mercury, 4=Jupiter, 5=Venus, 6=Saturn
export const RASHI_LORD: ReadonlyArray<number> = [
  2, // 0  Aries       Mars
  5, // 1  Taurus      Venus
  3, // 2  Gemini      Mercury
  1, // 3  Cancer      Moon
  0, // 4  Leo         Sun    ← Shailem
  3, // 5  Virgo       Mercury
  5, // 6  Libra       Venus
  2, // 7  Scorpio     Mars
  4, // 8  Sagittarius Jupiter
  6, // 9  Capricorn   Saturn
  6, // 10 Aquarius    Saturn ← Piyush
  4, // 11 Pisces      Jupiter
];

// Planet friendship: PLANET_FRIEND[p1][p2] = relation of p1 toward p2
// 2=Friend, 1=Neutral, 0=Enemy
// Planets: 0=Sun, 1=Moon, 2=Mars, 3=Mercury, 4=Jupiter, 5=Venus, 6=Saturn
export const PLANET_FRIEND: ReadonlyArray<ReadonlyArray<number>> = [
  //         Sun Mon Mar Mer Jup Ven Sat
  /* Sun */ [2,  2,  2,  1,  2,  0,  0],
  /* Mon */ [2,  2,  1,  2,  1,  1,  1],
  /* Mar */ [2,  2,  2,  0,  2,  1,  1],
  /* Mer */ [2,  0,  1,  2,  1,  2,  1],
  /* Jup */ [2,  2,  2,  0,  2,  0,  1],
  /* Ven */ [0,  0,  1,  2,  1,  2,  2],
  /* Sat */ [0,  0,  0,  2,  1,  2,  2],
];

// Graha Maitri score from two lords' mutual relations
// relation pair (f1, f2): 2+2=5, 2+1=4 or 4, 2+0=1, 1+1=3, 1+0=1, 0+0=0
export function grahaMaitriScore(lord1: number, lord2: number): number {
  const r1 = PLANET_FRIEND[lord1]?.[lord2] ?? 1;
  const r2 = PLANET_FRIEND[lord2]?.[lord1] ?? 1;
  const sum = r1 + r2;
  if (sum === 4) return 5;       // both friends
  if (sum === 3) return 4;       // one friend + one neutral
  if (sum === 2 && r1 === r2) return 3; // both neutral
  if (sum === 2) return 2;       // friend + enemy (partial)
  if (sum === 1) return 1;       // neutral + enemy
  return 0;                       // both enemies
}
