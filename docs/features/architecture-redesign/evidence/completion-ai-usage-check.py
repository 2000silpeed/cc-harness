#!/usr/bin/env python3
"""Verify immutable A/B inputs before dispatch; never invokes a model."""
from pathlib import Path
import hashlib
import json
import sys

HERE = Path(__file__).resolve().parent
manifest = json.loads((HERE / "completion-ai-usage-setup.json").read_text())
base = Path(manifest["isolated_root"])

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for case, details in manifest["variants"].items():
    root = base / case
    for relative, expected in details["sources"].items():
        path = root / relative
        assert digest(path) == expected, f"source changed: {path}"
        assert path.stat().st_mode & 0o222 == 0, f"source writable: {path}"
    for relative, expected in manifest["identical_inputs"].items():
        path = root / relative
        assert digest(path) == expected, f"input changed: {path}"
        assert path.stat().st_mode & 0o222 == 0, f"input writable: {path}"
schema = Path(manifest["response_schema"]["path"])
assert digest(schema) == manifest["response_schema"]["sha256"]
json.loads(schema.read_text())
assert len(manifest["trial_order"]) == 6
assert set(manifest["trial_order"]) == set(manifest["variants"])
print("PASS: source/input hashes, read-only files, schema, six-trial order")
