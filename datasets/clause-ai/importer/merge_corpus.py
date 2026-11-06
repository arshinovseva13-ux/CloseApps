#!/usr/bin/env python3
"""Build one Clause AI corpus from Foundations and normalized external imports.

All source identity, provenance, rights and review state are retained. Exact
duplicates are reported; they are not removed unless --drop-exact-duplicates
is explicitly requested.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

SHARD_SIZE = 50_000


def read_jsonl(path: Path) -> Iterator[dict]:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as stream:
        for line_no, line in enumerate(stream, 1):
            if line.strip():
                try:
                    yield json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"{path}:{line_no}: invalid JSONL: {exc}") from exc


def normalize_foundation(row: dict) -> dict:
    content = row.get("content") or {}
    body = "\n\n".join(x for x in (
        str(content.get("summary") or "").strip(),
        str(content.get("body") or "").strip(),
        ("Key points:\n" + "\n".join("- " + str(x) for x in content.get("key_points", [])))
            if content.get("key_points") else "",
        ("Limitations: " + str(content.get("limitations")))
            if content.get("limitations") else "",
    ) if x)
    source_key = str(row.get("id") or "")
    return {
        "id": "foundations-" + hashlib.sha256(source_key.encode()).hexdigest()[:24],
        "record_type": "external_document",
        "source_id": "foundations",
        "source_record_id": source_key,
        "language": row.get("language", "und"),
        "title": row.get("title") or source_key,
        "text": body,
        "metadata": {
            "original_record_type": row.get("record_type"),
            "domain": row.get("domain"),
            "relations": row.get("relations", []),
            "original_tags": row.get("tags", []),
        },
        "provenance": {
            "source_url": "https://arshinovseva13-ux.github.io/CloseApps/datasets/clause-ai/",
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "source_version": "Clause AI Foundations repository snapshot",
            "method": (row.get("provenance") or {}).get("method", "original_synthesis"),
            "references": (row.get("provenance") or {}).get("references", []),
        },
        "rights": {
            "license": (row.get("rights") or {}).get("license", "CC-BY-4.0"),
            "notes": (row.get("rights") or {}).get("notes", "Original Clause AI content; see source record."),
        },
        "quality": {
            "status": (row.get("quality") or {}).get("status", "draft_review_required"),
            "fact_checked": bool((row.get("quality") or {}).get("fact_checked", False)),
            "language_reviewed": bool((row.get("quality") or {}).get("language_reviewed", False)),
        },
        "tags": list(dict.fromkeys(["foundations", str(row.get("domain") or "general"),
                                     str(row.get("language") or "und"), *(row.get("tags") or [])])),
    }


def text_digest(row: dict) -> str:
    normalized = " ".join(str(row.get("text", "")).casefold().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--imports", type=Path, default=Path("clause-ai-import"),
                        help="Directory containing source-specific importer folders")
    parser.add_argument("--foundations", type=Path,
                        default=Path("datasets/clause-ai/libraries/foundations"))
    parser.add_argument("--out", type=Path, default=Path("clause-ai-unified"))
    parser.add_argument("--drop-exact-duplicates", action="store_true")
    args = parser.parse_args()

    inputs: list[tuple[str, Path, bool]] = []
    for path in sorted(args.foundations.glob("*.jsonl")):
        inputs.append(("foundations", path, False))
    for source_dir in sorted(args.imports.iterdir()) if args.imports.exists() else []:
        if source_dir.is_dir() and source_dir.name != "corpus":
            for path in sorted(source_dir.glob("*.jsonl*")):
                inputs.append((source_dir.name, path, True))
    if not inputs:
        raise SystemExit("No input shards found. Run the source importer first.")

    args.out.mkdir(parents=True, exist_ok=True)
    shard_index = 0
    shard_count = 0
    shard_records = 0
    shard_path = None
    writer = None
    shards = []
    counts = Counter()
    duplicates: dict[str, list[str]] = defaultdict(list)
    seen = set()
    dropped = 0
    total_bytes = 0

    def open_shard():
        nonlocal shard_index, shard_count, shard_records, shard_path, writer
        shard_path = args.out / f"clause-ai-{shard_index:05d}.jsonl.gz"
        writer = gzip.open(shard_path, "wt", encoding="utf-8", newline="\n", compresslevel=6)
        shard_count = 0
        shard_records = 0

    def close_shard():
        nonlocal shard_index, writer
        if writer is None:
            return
        writer.close()
        digest = hashlib.sha256(shard_path.read_bytes()).hexdigest()
        shards.append({"path": shard_path.name, "records": shard_records,
                       "bytes": shard_path.stat().st_size, "sha256": digest})
        shard_index += 1
        writer = None

    open_shard()
    for source, path, external in inputs:
        for raw in read_jsonl(path):
            row = raw if external else normalize_foundation(raw)
            if not row.get("text", "").strip():
                continue
            digest = text_digest(row)
            duplicates[digest].append(row["id"])
            if args.drop_exact_duplicates and digest in seen:
                dropped += 1
                continue
            seen.add(digest)
            writer.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
            shard_records += 1
            counts[source] += 1
            if shard_records >= SHARD_SIZE:
                close_shard()
                open_shard()
    close_shard()

    duplicate_groups = [{"text_sha256": key, "record_ids": ids}
                        for key, ids in duplicates.items() if len(ids) > 1]
    duplicate_path = args.out / "duplicate-groups.jsonl"
    with duplicate_path.open("w", encoding="utf-8") as stream:
        for group in duplicate_groups:
            stream.write(json.dumps(group, ensure_ascii=False) + "\n")

    manifest = {
        "dataset": "Clause AI Unified Corpus",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "format": "gzip JSONL",
        "schema": "external-document.schema.json",
        "shard_size": SHARD_SIZE,
        "total_records": sum(counts.values()),
        "records_by_source": dict(sorted(counts.items())),
        "exact_duplicate_groups": len(duplicate_groups),
        "exact_duplicates_dropped": dropped,
        "deduplication_policy": "report_only" if not args.drop_exact_duplicates else "drop_exact_text_duplicates_keep_first",
        "shards": shards,
        "duplicate_groups_file": duplicate_path.name,
        "source_files": [str(path) for _, path, _ in inputs],
        "note": "One unified corpus; original source IDs, versions, licenses, and quality states remain attached to every record."
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
