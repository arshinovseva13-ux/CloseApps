#!/usr/bin/env python3
"""Streaming importer for the approved Clause AI external corpus sources.

Initial batch target: 1,000,000 records per approved source.
"""
from __future__ import annotations

import argparse
import bz2
import gzip
import hashlib
import json
import os
import re
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Iterator

import requests
from huggingface_hub import HfApi

UA = "ClauseAI-ExternalCorpusImporter/0.1 (CloseApps; provenance-preserving research import)"
SHARD_SIZE = 50_000
TIMEOUT = (30, 180)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def record_id(source: str, source_key: str) -> str:
    digest = hashlib.sha256(f"{source}:{source_key}".encode()).hexdigest()[:24]
    return f"{source}-{digest}"


def base_record(source: str, source_key: str, language: str, title: str, body: str,
                metadata: dict, source_url: str, version: str, license_name: str,
                license_notes: str, tags: list[str]) -> dict:
    return {
        "id": record_id(source, source_key),
        "record_type": "external_document",
        "source_id": source,
        "source_record_id": source_key,
        "language": language or "und",
        "title": title or source_key,
        "text": body,
        "metadata": metadata,
        "provenance": {
            "source_url": source_url,
            "retrieved_at": utc_now(),
            "source_version": version
        },
        "rights": {"license": license_name, "notes": license_notes},
        "quality": {
            "status": "imported_unreviewed",
            "fact_checked": False,
            "language_reviewed": False
        },
        "tags": tags
    }


class ShardWriter:
    def __init__(self, out_dir: Path, source: str):
        self.directory = out_dir / source
        self.directory.mkdir(parents=True, exist_ok=True)
        self.source = source
        self.index = 0
        self.count = 0
        self.total_bytes = 0
        self.file = None
        self.path = None
        self.shards = []

    def _open(self):
        self.path = self.directory / f"{self.source}-{self.index:05d}.jsonl.gz"
        self.file = gzip.open(self.path, "wt", encoding="utf-8", newline="\n", compresslevel=6)
        self.shards.append({"path": str(self.path), "records": 0})
    
    def write(self, record: dict):
        if self.file is None or self.shards[-1]["records"] >= SHARD_SIZE:
            self.close_current()
            self._open()
        self.file.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
        self.shards[-1]["records"] += 1
        self.count += 1

    def close_current(self):
        if self.file:
            self.file.close()
            self.file = None
            self.index += 1

    def finish(self):
        self.close_current()
        for shard in self.shards:
            p = Path(shard["path"])
            shard["bytes"] = p.stat().st_size
        return {"source": self.source, "records": self.count, "shards": self.shards}


def hf_records(source: str, limit: int) -> Iterator[dict]:
    from datasets import load_dataset

    if source == "fineweb":
        repo = "HuggingFaceFW/fineweb"
        config = "CC-MAIN-2024-10"
        license_name = "ODC-By 1.0"
        license_notes = "Retain dataset attribution and ODC-By 1.0 obligations; source webpages may have separate rights."
        source_url = "https://huggingface.co/datasets/HuggingFaceFW/fineweb"
        version = "CC-MAIN-2024-10; resolve and record exact Hub revision at execution"
        language = "en"
    else:
        repo = "HuggingFaceFW/fineweb-2"
        config = "rus_Cyrl"
        license_name = "ODC-By 1.0"
        license_notes = "Retain dataset attribution and ODC-By 1.0 obligations; source webpages may have separate rights."
        source_url = "https://huggingface.co/datasets/HuggingFaceFW/fineweb-2"
        version = "rus_Cyrl filtered train; resolve and record exact Hub revision at execution"
        language = "ru"

    # Resolve the mutable Hub branch exactly once, then read only that
    # immutable commit so every record in this source batch has reproducible provenance.
    revision = HfApi().dataset_info(repo_id=repo, repo_type="dataset").sha
    version = f"revision={revision}; config={config}; split=train"
    ds = load_dataset(
        repo, name=config, split="train", streaming=True, revision=revision
    )
    emitted = 0
    for item in ds:
        text = safe_text(item.get("text"))
        if len(text) < 100:
            continue
        key = safe_text(item.get("id") or item.get("url") or f"{source}-{emitted}")
        title = safe_text(item.get("title")) or safe_text(item.get("url")) or key
        meta = {k: item.get(k) for k in ("url", "date", "dump", "file_path", "language_score", "token_count") if item.get(k) is not None}
        yield base_record(source, key, language, title, text, meta, source_url, version,
                          license_name, license_notes, ["web_text", "pretraining", language])
        emitted += 1
        if emitted >= limit:
            break


def wikidata_records(limit: int) -> Iterator[dict]:
    url = "https://dumps.wikimedia.org/wikidatawiki/entities/latest-all.json.bz2"
    response = requests.get(url, headers={"User-Agent": UA}, stream=True, timeout=TIMEOUT)
    response.raise_for_status()
    dump_version = response.headers.get("Last-Modified") or "latest-all (Last-Modified unavailable)"
    decompressor = bz2.BZ2Decompressor()
    buffer = b""
    emitted = 0
    # The JSON dump is an array whose entity objects are line-separated.
    for chunk in response.iter_content(chunk_size=1024 * 1024):
        if not chunk:
            continue
        buffer += decompressor.decompress(chunk)
        while b"\n" in buffer:
            line, buffer = buffer.split(b"\n", 1)
            line = line.strip().rstrip(b",")
            if not line or line in (b"[", b"]"):
                continue
            if line.startswith(b"["):
                line = line[1:].strip()
            if line.endswith(b"]"):
                line = line[:-1].strip()
            if not line:
                continue
            try:
                entity = json.loads(line)
            except json.JSONDecodeError:
                continue
            if entity.get("type") not in ("item", "property"):
                continue
            # Deterministic stride sampling spreads the subset across the complete ID range.
            numeric_id = re.search(r"([QP])(\d+)$", safe_text(entity.get("id")))
            if numeric_id and int(numeric_id.group(2)) % 100 != 0:
                continue
            labels = entity.get("labels", {})
            descriptions = entity.get("descriptions", {})
            label = safe_text(labels.get("ru", {}).get("value") or labels.get("en", {}).get("value"))
            description = safe_text(descriptions.get("ru", {}).get("value") or descriptions.get("en", {}).get("value"))
            if not label and not description:
                continue
            claims = entity.get("claims", {})
            claim_summary = []
            for prop, statements in list(claims.items())[:100]:
                values = []
                for statement in statements[:5]:
                    snak = statement.get("mainsnak", {})
                    datavalue = snak.get("datavalue", {})
                    value = datavalue.get("value")
                    if isinstance(value, dict):
                        value = value.get("id") or value.get("text") or value.get("amount") or value.get("time") or value
                    if value is not None:
                        values.append(str(value)[:200])
                if values:
                    claim_summary.append({"property": prop, "values": values})
            key = safe_text(entity.get("id"))
            body = "\n".join(x for x in (label, description) if x)
            if claim_summary:
                body += "\n\nStructured statements (property IDs and values):\n" + json.dumps(claim_summary, ensure_ascii=False)
            language = "ru" if labels.get("ru") or descriptions.get("ru") else "en"
            yield base_record(
                "wikidata", key, language, label or key, body,
                {"entity_type": entity.get("type"), "aliases": {
                    lang: [a.get("value") for a in vals[:10]]
                    for lang, vals in entity.get("aliases", {}).items() if lang in ("ru", "en")
                }, "claims": claim_summary},
                "https://www.wikidata.org/wiki/" + key,
                f"latest-all.json.bz2; Last-Modified={dump_version}",
                "CC0", "Wikidata structured data is CC0; linked media and external references are not included.",
                ["structured_knowledge", "entity", language]
            )
            emitted += 1
            if emitted >= limit:
                return


def openalex_records(limit: int) -> Iterator[dict]:
    manifest_url = "https://openalex.s3.amazonaws.com/data/jsonl/works/manifest.json"
    r = requests.get(manifest_url, headers={"User-Agent": UA}, timeout=TIMEOUT)
    r.raise_for_status()
    manifest_bytes = r.content
    manifest_sha256 = hashlib.sha256(manifest_bytes).hexdigest()
    manifest = r.json()
    files = list(manifest.get("files", []))
    snapshot_version = (
        f"date={manifest.get('date', 'unknown')}; "
        f"manifest_sha256={manifest_sha256}"
    )
    # Spread the sample over snapshot partitions, not only the first update dates.
    random.Random(20261104).shuffle(files)
    emitted = 0
    for entry in files:
        s3_url = entry.get("url", "")
        if not s3_url.startswith("s3://openalex/"):
            continue
        url = "https://openalex.s3.amazonaws.com/" + s3_url.removeprefix("s3://openalex/")
        part = requests.get(url, headers={"User-Agent": UA}, stream=True, timeout=TIMEOUT)
        part.raise_for_status()
        with gzip.GzipFile(fileobj=part.raw, mode="rb") as gz:
            for raw_line in gz:
                try:
                    work = json.loads(raw_line)
                except json.JSONDecodeError:
                    continue
                title = safe_text(work.get("title")) or safe_text(work.get("display_name"))
                if not title:
                    continue
                abstract = ""
                inverted = work.get("abstract_inverted_index") or {}
                if inverted:
                    words = {}
                    for word, positions in inverted.items():
                        for pos in positions:
                            words[int(pos)] = word
                    if words:
                        abstract = " ".join(words[i] for i in range(max(words) + 1) if i in words)
                body = title + (("\n\n" + abstract) if abstract else "")
                key = safe_text(work.get("id"))
                meta = {
                    k: work.get(k) for k in (
                        "doi", "publication_year", "type", "language", "cited_by_count",
                        "authorships", "primary_location", "topics", "referenced_works",
                        "related_works", "is_oa"
                    ) if work.get(k) is not None
                }
                lang = safe_text(work.get("language")) or "und"
                yield base_record(
                    "openalex", key, lang, title, body, meta,
                    "https://openalex.org/" + key.rsplit("/", 1)[-1],
                    snapshot_version,
                    "CC0 (OpenAlex metadata)", "Metadata-only. Do not include or infer rights to linked full-text documents.",
                    ["scientific_metadata", "research", lang]
                )
                emitted += 1
                if emitted >= limit:
                    return


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="all", help="all or comma-separated: fineweb,fineweb2,wikidata,openalex")
    parser.add_argument("--limit", type=int, default=1_000_000)
    parser.add_argument("--out", type=Path, default=Path("clause-ai-import"))
    args = parser.parse_args()
    if args.limit < 1:
        parser.error("--limit must be positive")
    allowed = ["fineweb", "fineweb2", "wikidata", "openalex"]
    sources = allowed if args.source == "all" else [s.strip() for s in args.source.split(",") if s.strip()]
    unknown = set(sources) - set(allowed)
    if unknown:
        parser.error("Unknown source(s): " + ", ".join(sorted(unknown)))
    args.out.mkdir(parents=True, exist_ok=True)
    reports = []
    for source in sources:
        print(f"Starting {source}: target={args.limit:,}", flush=True)
        writer = ShardWriter(args.out, source)
        try:
            iterator = (wikidata_records(args.limit) if source == "wikidata"
                        else openalex_records(args.limit) if source == "openalex"
                        else hf_records(source, args.limit))
            for i, record in enumerate(iterator, 1):
                writer.write(record)
                if i % 10_000 == 0:
                    print(f"{source}: {i:,} records", flush=True)
            report = writer.finish()
            reports.append(report)
            print(f"Completed {source}: {report['records']:,}", flush=True)
            if report["records"] < args.limit:
                print(f"WARNING: {source} produced fewer than requested records.", flush=True)
        except Exception as exc:
            writer.finish()
            print(f"FAILED {source}: {type(exc).__name__}: {exc}", file=sys.stderr, flush=True)
            raise
    summary = {
        "dataset": "Clause AI",
        "created_at": utc_now(),
        "requested_per_source": args.limit,
        "reports": reports,
        "total_records": sum(r["records"] for r in reports),
        "note": "Imported records are unreviewed source material, not verified knowledge explanations."
    }
    (args.out / "import-report.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
