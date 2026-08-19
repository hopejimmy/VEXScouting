"""Render an axonometric QA preview of the generated left module."""

from pathlib import Path
import os

import FreeCAD as App
import FreeCADGui as Gui


ROOT = Path(os.environ["DRIVETRAIN_CAD_ROOT"]).resolve()
doc = App.openDocument(str(ROOT / "output" / "vex-iq-left-drive-module.FCStd"))
gui_doc = Gui.getDocument(doc.Name)

palette = {
    "228-2500-017": (0.15, 0.42, 0.90),
    "228-2500-026": (0.15, 0.42, 0.90),
    "228-2500-060": (0.13, 0.55, 0.82),
    "228-2500-086": (0.13, 0.55, 0.82),
    "228-2500-112": (0.65, 0.70, 0.78),
    "228-2500-1208": (0.95, 0.72, 0.10),
    "228-2500-1253": (0.15, 0.42, 0.90),
    "228-2500-143": (0.12, 0.14, 0.18),
    "228-2500-1925": (0.15, 0.42, 0.90),
    "228-2500-209": (0.08, 0.09, 0.11),
    "228-2500-2225": (0.68, 0.72, 0.79),
    "228-2500-2236": (0.68, 0.72, 0.79),
    "228-2536-000": (0.12, 0.14, 0.18),
    "228-2560": (0.35, 0.38, 0.43),
}

for obj in doc.Objects:
    if hasattr(obj, "PartNumber"):
        view_object = gui_doc.getObject(obj.Name)
        if view_object is not None:
            view_object.ShapeColor = palette.get(obj.PartNumber, (0.70, 0.70, 0.70))
            view_object.LineColor = (0.15, 0.17, 0.20)

view = gui_doc.activeView()
view.setAnimationEnabled(False)
view.viewAxonometric()
view.fitAll()
view.saveImage(str(ROOT / "output" / "vex-iq-left-drive-module.png"), 1600, 1100, "Current")
print("RENDER_OK")
Gui.getMainWindow().close()
