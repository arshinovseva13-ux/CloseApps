#!/usr/bin/env python3
"""Build one Clause AI corpus from Foundations and normalized external imports."""
from __future__ import annotations
import argparse, gzip, hashlib, json, sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

SHARD_SIZE = 50_000

def read_jsonl(path: Path):
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
    sections = [str(content.get("summary") or "").strip(), str(content.get("body") or "").strip()]
    if content.get("key_points"):
        sections.append("Key points:\n" + "\n".join("- " + str(x) for x in content["key_points"]))
    if content.get("limitations"):
        sections.append("Limitations: " + str(content["limitations"]))
    key = str(row.get("id") or "")
    quality = row.get("quality") or {}
    rights = row.get("rights") or {}
    provenance = row.get("provenance") or {}
    return {
        "id": "foundations-" + hashlib.sha256(key.encode()).hexdigest()[:24],
        "record_type": "external_document", "source_id": "foundations",
        "source_record_id": key, "language": row.get("language", "und"),
        "title": row.get("title") or key, "text": "\n\n".join(x for x in sections if x),
        "metadata": {"original_record_type": row.get("record_type"), "domain": row.get("domain"),
                     "relations": row.get("relations", []), "original_tags": row.get("tags", [])},
        "provenance": {"source_url": "https://arshinovseva13-ux.github.io/CloseApps/datasets/clause-ai/",
                       "retrieved_at": datetime.now(timezone.utc).isoformat(),
                       "source_version": "Clause AI Foundations repository snapshot",
                       "method": provenance.get("method", "original_synthesis"),
                       "references": provenance.get("references", [])},
        "rights": {"license": rights.get("license", "CC-BY-4.0"),
                   "notes": rights.get("notes", "Original Clause AI content; see source record.")},
        "quality": {"status": quality.get("status", "draft_review_required"),
                    "fact_checked": bool(quality.get("fact_checked", False)),
                    "language_reviewed": bool(quality.get("language_reviewed", False))},
        "tags": list(dict.fromkeys(["foundations", str(row.get("domain") or "general"),
                                    str(row.get("language") or "und"), *(row.get("tags") or [])]))
    }

def digest_text(row: dict) -> str:
    normalized = " ".join(str(row.get("text", "")).casefold().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--imports", type=Path, default=Path("clause-ai-import"))
    p.add_argument("--foundations", type=Path, default=Path("datasets/clause-ai/libraries/foundations"))
    p.add_argument("--out", type=Path, default=Path("clause-ai-unified"))
    p.add_argument("--drop-exact-duplicates", action="store_true")
    args = p.parse_args()

    inputs = [("foundations", x, False) for x in sorted(args.foundations.glob("*.jsonl"))]
    if args.imports.exists():
        for folder in sorted(args.imports.iterdir()):
            if folder.is_dir() and folder.name != "corpus":
                inputs.extend((folder.name, x, True) for x in sorted(folder.glob("*.jsonl*")))
    if not inputs:
        raise SystemExit("No input shards found. Run the source importer first.")

    args.out.mkdir(parents=True, exist_ok=True)
    db_path = args.out / ".dedup-index.sqlite3"
    db = sqlite3.connect(db_path)
    db.execute("CREATE TABLE IF NOT EXISTS records (digest TEXT NOT NULL, record_id TEXT NOT NULL)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_records_digest ON records(digest)")
    counts, shards = Counter(), []
    writer = None
    shard_path = None
    shard_records = 0
    shard_index = 0
    dropped = 0

    def open_shard():
        nonlocal writer, shard_path, shard_records
        shard_path = args.out / f"clause-ai-{shard_index:05d}.jsonl.gz"
        writer = gzip.open(shard_path, "wt", encoding="utf-8", newline="\n", compresslevel=6)
        shard_records = 0

    def close_shard():
        nonlocal writer, shard_index
        if writer is None:
            return
        writer.close()
        if shard_records:
            raw = shard_path.read_bytes()
            shards.append({"path": shard_path.name, "records": shard_records,
                           "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()})
            shard_index += 1
        else:
            shard_path.unlink(missing_ok=True)
        writer = None

    open_shard()
    for source, path, is_external in inputs:
        for raw in read_jsonl(path):
            row = raw if is_external else normalize_foundation(raw)
            if not str(row.get("text") or "").strip():
                continue
            digest = digest_text(row)
            previous = db.execute("SELECT 1 FROM records WHERE digest=? LIMIT 1", (digest,)).fetchone()
            db.execute("INSERT INTO records(digest, record_id) VALUES (?, ?)", (digest, row["id"]))
            if args.drop_exact_duplicates and previous:
                dropped += 1
                continue
            writer.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
            shard_records += 1
            counts[source] += 1
            if shard_records >= SHARD_SIZE:
                close_shard()
                open_shard()
    close_shard()
    db.commit()

    duplicate_path = args.out / "duplicate-groups.jsonl"
    duplicate_group_count = 0
    with duplicate_path.open("w", encoding="utf-8") as stream:
        query = "SELECT digest, GROUP_CONCAT(record_id, char(10)) FROM records GROUP BY digest HAVING COUNT(*) > 1"
        for digest, ids in db.execute(query):
            stream.write(json.dumps({"text_sha256": digest, "record_ids": ids.split("\n")},
                                    ensure_ascii=False) + "\n")
            duplicate_group_count += 1
    db.close()
    db_path.unlink(missing_ok=True)

    manifest = {
        "dataset": "Clause AI Unified Corpus",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "format": "gzip JSONL", "schema": "external-document.schema.json",
        "shard_size": SHARD_SIZE, "total_records": sum(counts.values()),
        "records_by_source": dict(sorted(counts.items())),
        "exact_duplicate_groups": duplicate_group_count,
        "exact_duplicates_dropped": dropped,
        "deduplication_policy": "report_only" if not args.drop_exact_duplicates else "drop_exact_text_duplicates_keep_first",
        "shards": shards, "duplicate_groups_file": duplicate_path.name,
        "source_files": [str(path) for _, path, _ in inputs],
        "note": "One unified corpus; source IDs, versions, licenses and quality states remain attached to every record."
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
