"""Prove that this FreeCAD runtime can create, export, and re-import STEP."""

from pathlib import Path
import sys

import FreeCAD as App
import Part


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output"
OUTPUT.mkdir(parents=True, exist_ok=True)
STEP_PATH = OUTPUT / "freecad-step-smoke-test.step"

doc = App.newDocument("DriveTrainStepSmokeTest")
source = doc.addObject("Part::Feature", "PitchReference")
source.Label = "12.7 mm VEX IQ pitch reference"
source.Shape = Part.makeBox(12.7, 12.7, 12.7)
doc.recompute()
Part.export([source], str(STEP_PATH))

check = App.newDocument("StepImportCheck")
Part.insert(str(STEP_PATH), check.Name)
check.recompute()
solids = sum(len(obj.Shape.Solids) for obj in check.Objects if hasattr(obj, "Shape"))
if solids != 1:
    print(f"STEP validation failed: expected 1 solid, found {solids}", file=sys.stderr)
    sys.exit(1)

print(f"STEP_OK {STEP_PATH} solids={solids}")
