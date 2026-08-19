"""Build and validate the left BaseBot drive/chassis half from official STEP parts."""

import json
from pathlib import Path
import sys

import FreeCAD as App
import Part


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "official"
OUTPUT = ROOT / "output"
placements_path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "reference-left-placements.json"
output_stem = sys.argv[2] if len(sys.argv) > 2 else "vex-iq-left-drive-module"


def compound_from_step(path: Path):
    source_name = f"Import_{path.stem.replace('-', '_')}"
    source_doc = App.newDocument(source_name)
    Part.insert(str(path), source_name)
    source_doc.recompute()
    shapes = [obj.Shape.copy() for obj in source_doc.Objects if hasattr(obj, "Shape") and not obj.Shape.isNull()]
    App.closeDocument(source_name)
    if not shapes:
        raise RuntimeError(f"No geometry imported from {path}")
    return Part.makeCompound(shapes)


def placement_from_column_major(values):
    matrix = App.Matrix()
    matrix.A11, matrix.A12, matrix.A13, matrix.A14 = values[0], values[4], values[8], values[12]
    matrix.A21, matrix.A22, matrix.A23, matrix.A24 = values[1], values[5], values[9], values[13]
    matrix.A31, matrix.A32, matrix.A33, matrix.A34 = values[2], values[6], values[10], values[14]
    matrix.A41, matrix.A42, matrix.A43, matrix.A44 = values[3], values[7], values[11], values[15]
    return App.Placement(matrix)


data = json.loads(placements_path.read_text(encoding="utf-8"))
doc = App.newDocument("VEXIQLeftDriveModule")
groups = {}
source_shapes = {}

for occurrence in data["occurrences"]:
    part_number = occurrence["partNumber"]
    path = ASSETS / f"{part_number}.STEP"
    if not path.is_file():
        raise FileNotFoundError(f"Missing official source: {path}")
    if part_number not in source_shapes:
        source_shapes[part_number] = compound_from_step(path)
    if part_number not in groups:
        group = doc.addObject("App::DocumentObjectGroup", f"Part_{part_number.replace('-', '_')}")
        group.Label = f"{part_number} — {occurrence['description']}"
        groups[part_number] = group

    obj = doc.addObject("Part::Feature", f"Occurrence_{len(doc.Objects):03d}")
    obj.Label = occurrence["name"]
    obj.Shape = source_shapes[part_number]
    obj.Placement = placement_from_column_major(occurrence["matrix"])
    obj.addProperty("App::PropertyString", "PartNumber", "BOM")
    obj.PartNumber = part_number
    obj.addProperty("App::PropertyString", "ReferencePath", "Traceability")
    obj.ReferencePath = occurrence["referencePath"]
    groups[part_number].addObject(obj)

doc.recompute()
OUTPUT.mkdir(parents=True, exist_ok=True)
fcstd_path = OUTPUT / f"{output_stem}.FCStd"
step_path = OUTPUT / f"{output_stem}.step"
doc.saveAs(str(fcstd_path))

objects = [obj for obj in doc.Objects if hasattr(obj, "PartNumber")]
Part.export(objects, str(step_path))

check = App.newDocument("LeftModuleStepCheck")
Part.insert(str(step_path), check.Name)
check.recompute()
solids = sum(len(obj.Shape.Solids) for obj in check.Objects if hasattr(obj, "Shape"))
bounds = Part.makeCompound([obj.Shape for obj in objects]).BoundBox
if solids < len(objects):
    raise RuntimeError(f"STEP check failed: {solids} solids for {len(objects)} occurrences")

print(
    "ASSEMBLY_OK "
    f"occurrences={len(objects)} solids={solids} "
    f"bounds={bounds.XLength:.1f}x{bounds.YLength:.1f}x{bounds.ZLength:.1f}mm "
    f"step={step_path}"
)
