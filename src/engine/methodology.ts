export const METHODOLOGY_TEXT = `
## Vedic Matchmaking Methodology (Heuristic v1)

### Ashtakoot Guna Milan (36 points total)
1. Varna (1 pt) — spiritual compatibility
2. Vashya (2 pts) — mutual attraction / control
3. Tara (3 pts) — health & longevity compatibility
4. Yoni (4 pts) — intimate / physical compatibility
5. Graha Maitri (5 pts) — mental compatibility & friendship
6. Gana (6 pts) — temperament (Deva/Manushya/Rakshasa)
7. Bhakoot (7 pts) — love, health, family prosperity
8. Nadi (8 pts) — genetic health / Dosha indicator

Interpretation:
- 36/36: Perfect (rare)
- ≥ 28: Excellent
- 18–27: Acceptable
- < 18: Caution advised

### Doshas checked
**Mangal Dosha**: Mars in 1st, 4th, 7th, 8th, or 12th house (heuristic: derived from DOB hash).
- Both partners having Mangal Dosha neutralizes it.

**Nadi Dosha**: Both partners in the same Nadi (Adi/Madhya/Antya) = mismatch (8 pts penalty).
- Exception: same Rashi but different Nakshatra.

**Rajju Porutham**: Nakshatra group compatibility — one of the most critical in South Indian tradition.

### Important Disclaimer
This v1 implementation uses a deterministic heuristic (DOB hash → pseudo-nakshatra) instead of a live ephemeris. Scores and dosha flags are approximations for demonstration purposes only. For real matchmaking, use a certified Jyotishi with accurate birth time and geographic coordinates.
`.trim();
