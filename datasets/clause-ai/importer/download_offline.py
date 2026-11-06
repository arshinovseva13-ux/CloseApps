#!/usr/bin/env python3
"""One-command local Clause AI download, merge and offline packaging."""
from __future__ import annotations
import argparse
import hashlib
import json
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
IMPORTER = ROOT / "datasets" / "clause-ai" / "importer" / "import_external.py"
MERGER = ROOT / "datasets" / "clause-ai" / "importer" / "merge_corpus.py"
FOUNDATIONS = ROOT / "datasets" / "clause-ai" / "libraries" / "foundations"

def run(args):
    print("\n>>>", " ".join(map(str, args)), flush=True)
    subprocess.run(args, check=True)

def main():
    p = argparse.ArgumentParser(description="Download Clause AI data and prepare offline archives.")
    p.add_argument("--records-per-source", type=int, default=100_000)
    p.add_argument("--workdir", type=Path, default=Path("ClauseAI-Offline"))
    p.add_argument("--skip-download", action="store_true", help="Merge existing source shards only.")
    args = p.parse_args()
    if args.records_per_source < 1:
        p.error("--records-per-source must be positive")
    work = args.workdir.resolve()
    imports = work / "source-shards"
    merged = work / "unified-corpus"
    work.mkdir(parents=True, exist_ok=True)

    if not args.skip_download:
        run([sys.executable, str(IMPORTER), "--source", "all",
             "--limit", str(args.records_per_source), "--out", str(imports)])

    run([sys.executable, str(MERGER), "--imports", str(imports),
         "--foundations", str(FOUNDATIONS), "--out", str(merged)])

    manifest_path = merged / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    archive = work / "ClauseAI-Offline-Data.zip"
    checksum = hashlib.sha256()
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as z:
        files = sorted(merged.glob("*.jsonl.gz")) + [manifest_path, merged / "duplicate-groups.jsonl"]
        for path in files:
            if not path.is_file():
                continue
            arcname = "ClauseAI/" + path.name
            z.write(path, arcname)
            with path.open("rb") as f:
                for chunk in iter(lambda: f.read(1024 * 1024), b""):
                    checksum.update(chunk)
    report = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "archive": archive.name,
        "archive_bytes": archive.stat().st_size,
        "archive_sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
        "corpus_records": manifest["total_records"],
        "records_by_source": manifest["records_by_source"],
        "shards": len(manifest["shards"]),
        "dataset_manifest": "unified-corpus/manifest.json",
        "offline_use": "The ZIP contains all merged corpus shards and can be extracted and read without internet."
    }
    (work / "OFFLINE-DOWNLOAD-REPORT.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nOFFLINE ARCHIVE READY: {archive}")

if __name__ == "__main__":
    main()
