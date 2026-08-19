#!/usr/bin/env python3
"""Validate that every official source STEP named in the canonical BOM exists."""

import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
BOM_PATH = ROOT / "bom.json"
ASSET_DIR = ROOT / "assets" / "official"


def main() -> int:
    bom = json.loads(BOM_PATH.read_text(encoding="utf-8"))
    missing = [part for part in bom["parts"] if not (ASSET_DIR / part["file"]).is_file()]
    if missing:
        print("Missing official VEX IQ STEP sources:")
        for part in missing:
            print(f"- {part['partNumber']} — {part['name']} ({part['file']})")
        return 2

    print(f"OK: {len(bom['parts'])} official source models found")
    return 0


if __name__ == "__main__":
    sys.exit(main())
