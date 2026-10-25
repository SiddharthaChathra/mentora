# DESIGN.md — v2 "Sky Dashboard"

Light-only, calm, data-first. Pale blue canvas, a rounded white shell, Plus Jakarta Sans, one blue family, pastel stat tiles, soft 3D icons. v1 "Academic Atelier" is archived in `DESIGN.v1.md`.

Reference analysis (design/references/ref-cognify.png, ref-kouliah.png — **MANUAL STEP M1: add these files**; v2 was built from the written analysis in the redesign prompt):
- ref-cognify: blue hero stat card with frosted CTA, pastel KPI tiles in one white container, rounded stacked bars, donut with centre total, progress table, ranked list with medals.
- ref-kouliah: blue stat banner with white 3D icon badges, "Score records" line chart with value row, illustrated GPA card, mini calendar + schedule cards, pill navigation.

## 1. Tokens (`src/app/globals.css`, Tailwind v4 `@theme inline`)
| Group | Tokens |
|---|---|
| Surfaces | canvas `#EEF2F9` · shell `#F7F9FD` · surface `#FFFFFF` · surface-muted `#F4F6FA` · line `#E6EAF2` · line-strong `#D5DCE8` |
| Ink | ink-900 `#0F172A` · ink-700 `#334155` · ink-500 `#55647A` · ink-400 (decorative only) |
| Primary | 700 `#1747C9` · 600 `#2563EB` · 500 `#3B82F6` · 300 `#93C5FD` · 100 `#DBEAFE` · 50 `#EFF6FF` |
| Tiles | tile-blue `#E3EEFD` · tile-green `#E8F4E1` · tile-peach `#FDEEDD` · tile-lilac `#EEEAFD` · tile-rose `#FDE7EA` + matching `badge-*` |
| Status | success / warning (`700 #8A5300`) / danger / info / accent (100/500/700) |
| Charts | chart-1…7, chart-track, chart-grid |
| Gradients | gradient-hero, gradient-banner (`#1E56D6→#2F6BE0`), gradient-primary |
| Shadow | shadow-1/2/3, shadow-hero, shadow-glow (blue-tinted) |
| Radius | sm 10 · md 12 · lg 16 · xl 20 · 2xl 24 (cards) · 3xl 32 (shell); inputs/buttons/pills fully rounded |

Rules: tokens only (no raw hex in components; chart data ramps excepted), light only, no aurora/grain/glass. `.frost` = deep-blue translucent chip so white text stays AA on blue.

## 2. Type
Plus Jakarta Sans only (400–700) via `next/font`; same family embedded in PDFs. Page title 28/36 semibold · card title 17/24 · body 14–15 · helper 13 · table header 11 uppercase tracking .04em · numbers `tabular-nums` (`.num`, `.num-display`).

## 3. Contrast (WCAG AA, computed)
| Pair | Ratio |
|---|---|
| ink-900 on surface | 17.85 |
| ink-700 on shell | 9.82 |
| ink-500 on surface / canvas | 6.02 / 5.36 |
| white on primary-600 / banner | 5.17 / 6.25 |
| primary-700 on primary-100 | 6.19 |
| warning-700 on warning-100 | 5.68 |
| ink-700 on tile rose / peach / green | 8.77 / 9.10 / 9.10 |

## 4. Components (`src/components`)
- `ui/display.tsx`: HeroStatCard, PastelStatTile, StatBanner (mobile carousel), IllustratedScoreCard, CountUp, Greeting3D.
- `ui/primitives.tsx`: Card (24px), Pill/StatusPill (Verified = solid blue), DeltaChip (arrow + colour + "vs …"), IconChip, ProgressBar (`showValue`), ProgressRing.
- `ui/help-tip.tsx`: "?" popover from `lib/glossary.ts`.
- `charts/`: LineTrendChart/SgpaTrend, StackedRoundedBarChart, DonutWithTotal, ProgressTable, PercentBar, RankList, MiniCalendar, ScheduleCards, dumbbell, heatmap. Every chart is in `ChartFrame` with **View as table**.
- `illustrations/icons3d.tsx`: Icon3D (incl. file-pdf/doc/link), Icon3DBadge, Scene.
- Shell: icon rail, floating header (search pill, semester switcher, bell, avatar), mobile bottom nav with centre "+" quick-action sheet, product tour.

## 5. Translation table (v1 → v2)
| v1 | v2 |
|---|---|
| Instrument Serif / Geist | Plus Jakarta Sans |
| ultramarine `#3B3BF2` / apricot `#FF8A4C` | primary-600 `#2563EB` / tile + badge pastels |
| ivory `#F7F6F2`, aurora, grain, glass | canvas + shell, flat white cards, soft blue shadow |
| CGPAOrbit / SGPARibbon | IllustratedScoreCard / LineTrendChart |
| StatCard | PastelStatTile in a white container |
| Dark theme | removed (light only) |

## 6. Rules
Every view: skeleton (card-shaped), empty, error, success states. Mobile is designed separately (bottom nav, swipeable banner/tiles, stacked cards, 16px gutter). Progress bars always show their number. Students never see other students, rankings or "most improved". Charts, insights, risk flags and AI text never appear in PDFs.
