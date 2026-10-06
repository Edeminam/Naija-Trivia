# Credits & licences

## Map data
State boundaries for the State Wars map come from **geoBoundaries** (William & Mary geoLab),
dataset `gbOpen NGA ADM1`, sourced from **GRID3 Nigeria State Boundaries** —
licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/).
- https://www.geoboundaries.org
- https://data.grid3.org/datasets/grid3-nigeria-state-boundaries
Runfola, D. et al. (2020) *geoBoundaries: A global database of political administrative boundaries.* PLoS ONE 15(4): e0231866.

The shapes were projected and simplified by `scripts/build-map.py` into
`apps/mobile/src/features/statewars/nigeriaPaths.ts`. Simplification changes the geometry; it is a
stylised map, not survey-grade.

## Fonts
- **Satoshi** by Indian Type Foundry, via Fontshare, under the ITF Free Font License. Embedding in apps
  and documents is permitted; redistributing the font files themselves (e.g. a *public* repository) is
  not. If this repository is made public, remove `**/Satoshi-*.ttf` and fetch the fonts at build time
  from https://www.fontshare.com/fonts/satoshi.
- **Inter** by Rasmus Andersson, SIL Open Font License 1.1, via `@expo-google-fonts/inter` / Google Fonts.

## Icons
**Lucide** (ISC licence) — https://lucide.dev

## Question sources
Every seeded question cites a source (mostly Wikipedia, CC BY-SA 4.0) in `questions.source_url`.
Questions are original wording; facts are not copyrightable but sources are kept for verification.
No song lyrics are reproduced.

## Sounds, avatars, adire pattern
Sound effects were synthesised for this project (`apps/mobile/assets/sounds`). The eight avatars and the
adire-inspired pattern (after the Yoruba *Olokun* resist-dye motif) were drawn for this project as SVG.
