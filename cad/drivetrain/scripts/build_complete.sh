#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

: "${FREECAD_PYTHON:?Set FREECAD_PYTHON to FreeCAD.app/Contents/Resources/bin/python}"

python3 "$SCRIPT_DIR/validate_sources.py"
"$FREECAD_PYTHON" "$SCRIPT_DIR/build_left_module.py" \
  "$ROOT_DIR/reference-full-placements.json" \
  vex-iq-drive-train-complete
"$FREECAD_PYTHON" "$SCRIPT_DIR/validate_driveline.py"
