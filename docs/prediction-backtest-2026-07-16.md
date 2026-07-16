# Match Prediction Backtest - 2026-07-16

## Result

| Metric | Value |
|---|---:|
| Events evaluated | 20 |
| Non-tied scored matches | 1480 |
| Accuracy | 63.0% |
| Brier score | 0.2551 |
| Constant base-rate Brier score | 0.2490 |
| Red win base rate | 53.1% |
| Fully covered matches | 220 |
| Fully covered accuracy | 79.1% |
| Fully covered Brier score | 0.2071 |
| Fully covered baseline Brier | 0.2487 |
| Missing strength slots | 3750 / 5920 (63.3%) |
| Exact 0% or 100% predictions | 470 (31.8%) |
| Tied matches excluded | 7 |
| Malformed/unscored matches excluded | 9 |

Lower Brier score is better. The constant base-rate score is the reference that always predicts the observed red-alliance win rate.

## Method

- Resolved 81 processed database events against the VEX Events API and ordered them by start date.
- Evaluated a deterministic spread of up to 20 eligible events.
- For each target event, team strength was calculated only from database event aggregates whose resolved event start date was earlier than the target event.
- Required at least 3 earlier processed events before evaluating a target event.
- The probability rule mirrors the current UI: average known team strengths on each alliance, then compute red / (red + blue). Missing teams are omitted from the average; if neither alliance has strength, probability is 50%.
- Sitting teams were excluded. Ties were excluded from binary Brier score and accuracy.

## Important Limitations

- Skills scores are current season-final values because historical skill snapshots are not stored. This leaks future information and can make results optimistic.
- The database contains only events previously selected for analysis, not every event in the season. Earlier-event training coverage is therefore incomplete and selection-biased.
- The current UI text says missing teams are counted as zero, but the implementation omits them from the alliance average. This can produce exact 0%/100% predictions when only one alliance has known strength. The backtest mirrors the implementation.
- Event aggregates are used for training; private scouting observations and within-event updates are not modeled.
- This report is a baseline risk assessment, not evidence that displayed percentages are calibrated enough for a paid accuracy claim.

## Calibration

| Predicted red range | Matches | Mean prediction | Observed red win rate | Gap |
|---|---:|---:|---:|---:|
| 0-10% | 222 | 0.0% | 32.4% | 32.4 pp |
| 10-20% | 1 | 18.8% | 0.0% | -18.8 pp |
| 20-30% | 10 | 27.5% | 10.0% | -17.5 pp |
| 30-40% | 58 | 36.4% | 22.4% | -14.0 pp |
| 40-50% | 153 | 45.3% | 32.7% | -12.6 pp |
| 50-60% | 707 | 51.1% | 57.0% | 5.9 pp |
| 60-70% | 68 | 63.7% | 82.4% | 18.6 pp |
| 70-80% | 12 | 74.9% | 100.0% | 25.1 pp |
| 80-90% | 1 | 84.5% | 100.0% | 15.5 pp |
| 90-100% | 248 | 100.0% | 71.8% | -28.2 pp |

## By Event Level

| Level | Matches | Accuracy | Brier | Baseline Brier |
|---|---:|---:|---:|---:|
| Other | 1330 | 61.7% | 0.2593 | 0.2490 |
| Signature | 150 | 74.0% | 0.2174 | 0.2493 |

## Event Sample

| Date | SKU | Event | Level | Prior events | Matches | Missing slots |
|---|---|---|---|---:|---:|---:|
| 2025-08-17 | RE-V5RC-25-0344 | Tennessee State Fair Robot Rodeo V5 Robotics Competition (HS/MS): Brought to you by the Volunteer State Robotics Foundation | Other | 3 | 45 | 171/180 |
| 2025-09-14 | RE-V5RC-25-0112 | Saratoga VEX V5 Robotics Tournament #1 | Other | 7 | 68 | 234/272 |
| 2025-10-04 | RE-V5RC-25-0407 | 2025 San Diego VEX Eighth Annual MS/HS Open Tournament: VEX V5 Robotics Competition :Push Back | Other | 11 | 47 | 167/188 |
| 2025-10-11 | RE-V5RC-25-1386 | Clash in the Canyon: VEX V5 Robotics Competition: Push Back | Other | 14 | 73 | 265/292 |
| 2025-10-18 | RE-V5RC-25-0366 | 8th Annual Damien Spartan Challenge Middle School Only: VEX V5 Robotics Competition \| Push Back | Other | 19 | 77 | 244/308 |
| 2025-10-25 | RE-V5RC-25-1388 | Legacy Push Back Tournament: VEX V5 Robotics Competition HS/MS blended | Other | 22 | 74 | 212/296 |
| 2025-11-01 | RE-V5RC-25-0104 | Caution Tape VEX V5RC Robotics Competition Halloween Qualifier | Other | 27 | 106 | 424/424 |
| 2025-11-08 | RE-V5RC-25-0133 | PYRS Salish Secondary VEX V5 Robotic Competition Fall Qualifier | Other | 30 | 104 | 287/416 |
| 2025-11-08 | RE-V5RC-25-1460 | Central Valley VEX V5 Push Back Tournament #3 | Other | 30 | 47 | 45/188 |
| 2025-11-08 | RE-V5RC-25-3009 | Pembroke Academy VEX V5 Holiday Classic | Other | 30 | 48 | 192/192 |
| 2025-11-15 | RE-V5RC-25-1026 | South San Diego 10th Annual Tournament- Push Back (Blended HS/MS): VEX V5 Robotics Competition | Other | 42 | 84 | 183/336 |
| 2025-11-16 | RE-V5RC-25-1249 | SoCal Showdown @ McBride: VEX V5 Robotics Competition : Blended MS/HS | Other | 47 | 65 | 166/260 |
| 2025-11-22 | RE-V5RC-25-2984 | Robots in the Canyon: VEX V5 Robotics Competition, Blended HS/MS, All In Person Judging | Other | 50 | 42 | 125/168 |
| 2025-12-06 | RE-V5RC-25-0102 | Black Rock Open Middle / High School Blended Event: VEX V5 Robotics Competition 2025-2026: Push Back | Other | 56 | 69 | 267/276 |
| 2025-12-06 | RE-V5RC-25-2811 | Gord Trousdell Ten Ton Robotics V5RC Middle School Tournament | Other | 56 | 43 | 77/172 |
| 2025-12-13 | RE-V5RC-25-0184 | Battle of the Bridge VEX V5 Robotics Competition - Middle School | Other | 64 | 92 | 231/368 |
| 2025-12-13 | RE-V5RC-25-1213 | Beach Brawl 12/13 @ McBride High School: VEX V5 Robotics Competition HS/MS blended | Other | 64 | 77 | 188/308 |
| 2025-12-13 | RE-V5RC-25-9914 | RoboBucs Winter Rumble #4: VEX V5 Robotics Competition, Blended HS/MS, All In Person Judging - Digital Notebooks | Other | 64 | 83 | 215/332 |
| 2025-12-20 | RE-V5RC-25-1474 | Bay Area VEX V5 Push Back Tournament #4 | Other | 74 | 86 | 15/344 |
| 2025-12-28 | RE-V5RC-25-9905 | Diamond in the Desert MS Signature Event: Middle School \| The Arizona VEX Signature Event | Signature | 80 | 150 | 42/600 |

## Decision

The current score-ratio model does not beat the constant base-rate Brier baseline on this sample. Do not market the displayed percentage as predictive accuracy; prioritize data capture and model calibration before making it a paid promise.
