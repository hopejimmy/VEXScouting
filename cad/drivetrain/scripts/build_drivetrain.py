"""Build the publishable assembly after official STEP sources are available.

Assembly placements are intentionally data-driven. The first milestone adds and
checks the left drive module; subsequent milestones append mirrored and control
components without changing source geometry.
"""

import json
from pathlib import Path
import sys

import FreeCAD as App
import Part


root = Path(sys.argv[1]).resolve()
asset_dir = root / "assets" / "official"
output_dir = root / "output"
output_dir.mkdir(parents=True, exist_ok=True)
bom = json.loads((root / "bom.json").read_text(encoding="utf-8"))

doc = App.newDocument("VEXIQDriveTrainMVP")
source_group = doc.addObject("App::DocumentObjectGroup", "OfficialSourceParts")

for part in bom["parts"]:
    source_doc = App.newDocument(f"Source_{part['partNumber'].replace('-', '_')}")
    Part.insert(str(asset_dir / part["file"]), source_doc.Name)
    source_doc.recompute()
    shapes = [obj.Shape for obj in source_doc.Objects if hasattr(obj, "Shape") and not obj.Shape.isNull()]
    if not shapes:
        raise RuntimeError(f"No shape imported from {part['file']}")
    feature = doc.addObject("Part::Feature", f"Source_{part['partNumber'].replace('-', '_')}")
    feature.Label = f"{part['name']} ({part['partNumber']})"
    feature.Shape = Part.makeCompound(shapes)
    feature.addProperty("App::PropertyInteger", "RequiredQuantity", "BOM")
    feature.RequiredQuantity = part["quantity"]
    source_group.addObject(feature)
    App.closeDocument(source_doc.Name)

doc.recompute()
fcstd_path = output_dir / "vex-iq-drive-train-source-library.FCStd"
doc.saveAs(str(fcstd_path))
print(f"SOURCE_LIBRARY_OK {fcstd_path}")
