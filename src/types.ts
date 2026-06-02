export interface BirthDetails {
  name: string;
  dob: string;       // YYYY-MM-DD
  tob?: string;      // HH:MM (optional)
  pob?: string;      // place of birth
  tz?: string;       // IANA timezone
  lat?: number;
  lon?: number;
  gender: "male" | "female" | "other";
  notes?: string;
}

export interface KootaScore {
  name: string;
  score: number;
  max: number;
  notes: string;
}

export interface MatchResult {
  fixed: BirthDetails;
  candidate: BirthDetails;
  ashtakootTotal: number;
  ashtakootMax: number;
  kootas: KootaScore[];
  mangalDosha: { fixed: boolean; candidate: boolean; neutralized: boolean };
  nadiDosha: boolean;
  rajjuPorutham: boolean;
  summary: string;
  disclaimer: string;
}
