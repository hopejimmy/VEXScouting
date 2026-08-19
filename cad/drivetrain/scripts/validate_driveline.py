"""Check that each drive/support shaft intersects its matching wheel assembly."""

import json
from pathlib import Path
import sys

import FreeCAD as App
import Part


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "official"
data = json.loads((ROOT / "reference-full-placements.json").read_text(encoding="utf-8"))


def placement(values):
    matrix = App.Matrix()
    matrix.A11, matrix.A12, matrix.A13, matrix.A14 = values[0], values[4], values[8], values[12]
    matrix.A21, matrix.A22, matrix.A23, matrix.A24 = values[1], values[5], values[9], values[13]
    matrix.A31, matrix.A32, matrix.A33, matrix.A34 = values[2], values[6], values[10], values[14]
    matrix.A41, matrix.A42, matrix.A43, matrix.A44 = values[3], values[7], values[11], values[15]
    return App.Placement(matrix)


def load_shape(part_number):
    name = f"Validate_{part_number.replace('-', '_')}"
    doc = App.newDocument(name)
    Part.insert(str(ASSETS / f"{part_number}.STEP"), name)
    doc.recompute()
    shape = Part.makeCompound([obj.Shape.copy() for obj in doc.Objects if hasattr(obj, "Shape") and not obj.Shape.isNull()])
    App.closeDocument(name)
    return shape


occurrences = data["occurrences"]
shapes = {}
for item in occurrences:
    number = item["partNumber"]
    if number not in shapes:
        shapes[number] = load_shape(number)


def world_shape(item):
    shape = shapes[item["partNumber"]].copy()
    shape.Placement = placement(item["matrix"])
    return shape


shafts = [item for item in occurrences if item["partNumber"] in {"228-2500-2225", "228-2500-2236"}]
wheels = [item for item in occurrences if item["partNumber"] in {"228-2536-000", "228-2500-1208", "228-2500-209"}]
failures = []

for shaft in shafts:
    shaft_shape = world_shape(shaft)
    distances = sorted(
        (shaft_shape.distToShape(world_shape(wheel))[0], wheel["name"], wheel["partNumber"])
        for wheel in wheels
    )
    distance, wheel_name, wheel_number = distances[0]
    print(f"AXIS_CHECK {shaft['name']} -> {wheel_name} ({wheel_number}) gap={distance:.4f}mm")
    if distance > 0.05:
        failures.append((shaft["name"], distance))

if len(shafts) != 4:
    failures.append(("shaft count", len(shafts)))

brain = next((item for item in occurrences if item["partNumber"] == "228-6480"), None)
battery = next((item for item in occurrences if item["partNumber"] == "228-7045"), None)
motors = [item for item in occurrences if item["partNumber"] == "228-2560"]
if brain is None or battery is None:
    failures.append(("power system", "missing Brain or Battery"))
else:
    power_gap = world_shape(brain).distToShape(world_shape(battery))[0]
    print(f"POWER_CHECK Brain -> Battery gap={power_gap:.4f}mm")
    if power_gap > 0.05:
        failures.append(("Brain/Battery gap", power_gap))
if len(motors) != 2:
    failures.append(("motor count", len(motors)))
if failures:
    print(f"DRIVELINE_INVALID {failures}", file=sys.stderr)
    sys.exit(1)

print("DRIVELINE_OK shafts=4 motors=2 battery=installed")
