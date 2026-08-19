# VEX IQ Drive Train CAD MVP

This folder contains the reproducible CAD pipeline for the Drive Train pilot.
The final assembly must use source STEP files supplied by VEX Robotics; placeholder
geometry must never be published as a teaching model.

## Layout

- `assets/official/` — local VEX STEP files (not committed until licensing is cleared)
- `output/` — generated FreeCAD and STEP assemblies
- `scripts/` — validation and assembly scripts
- `bom.json` — canonical part list and source filenames

## Build

Set `FREECAD_PYTHON` to the Python executable bundled with FreeCAD, then run:

```bash
FREECAD_PYTHON=/path/to/FreeCAD.app/Contents/Resources/bin/python \
  ./cad/drivetrain/scripts/build.sh
```

To rebuild the verified teaching assembly directly:

```bash
FREECAD_PYTHON=/path/to/FreeCAD.app/Contents/Resources/bin/python \
  ./cad/drivetrain/scripts/build_complete.sh
```

Generated MVP files:

- `output/vex-iq-left-drive-module.step` — one drive/chassis half
- `output/vex-iq-drive-train-mechanical.step` — four-wheel mechanical chassis
- `output/vex-iq-drive-train-complete.step` — chassis, two motors, 2nd-gen Brain and Battery

The complete assembly currently contains 96 placed part occurrences and is checked
for four shaft/wheel intersections, two motors, and an installed Brain/Battery pair.

The builder refuses to generate a publishable assembly when any official source
part is missing. Run `scripts/smoke_test.py` to verify STEP import/export without
requiring the VEX source files.

## Rights note

VEX makes IQ CAD files available for personal and educational use. Because this
project may become a paid course, redistribution and commercial-display rights
must be confirmed with VEX before source models or derived assemblies are shipped.
Until then, official STEP files stay local and generated outputs are internal MVP
artifacts only.
