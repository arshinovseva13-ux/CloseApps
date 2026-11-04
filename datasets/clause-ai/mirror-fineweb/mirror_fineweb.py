#!/usr/bin/env python3
"""Inventory and resumable file-level mirror for FineWeb's data/ tree.

The script intentionally separates inventory from transfer. Run inventory first,
obtain storage approval, then run mirror from a persistent machine/disk.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

from huggingface_hub import HfApi, hf_hub_download
from huggingface_hub.hf_api import RepoFile, CommitOperationAdd

SOURCE_REPO = "HuggingFaceFW/fineweb"
DEST_REPO = "Seva-35/clause-ai-fineweb-mirror"
REPO_TYPE = "dataset"
DATA_PREFIX = "data/"


@dataclass
class InventoryItem:
    path: str
    size: int
    source_sha256: str | None
    source_lfs_oid: str | None
    source_revision: str


def sha256_file(path: Path, chunk_size: int = 8 * 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def lfs_metadata(repo_file: RepoFile) -> tuple[str | None, str | None]:
    lfs = getattr(repo_file, "lfs", None)
    if not lfs:
        return None, None
    if isinstance(lfs, dict):
        oid = lfs.get("oid")
    else:
        oid = getattr(lfs, "oid", None)
    if isinstance(oid, str) and oid.startswith("sha256:"):
        return oid.split(":", 1)[1], oid
    return None, oid if isinstance(oid, str) else None


def source_inventory(api: HfApi, revision: str | None) -> tuple[str, list[InventoryItem]]:
    info = api.repo_info(SOURCE_REPO, repo_type=REPO_TYPE, revision=revision)
    pinned_revision = info.sha
    if not pinned_revision:
        raise RuntimeError("Could not pin the source repository commit SHA.")

    rows: list[InventoryItem] = []
    for entry in api.list_repo_tree(
        SOURCE_REPO, repo_type=REPO_TYPE, revision=pinned_revision,
        path_in_repo="data", recursive=True, expand=True
    ):
        if not isinstance(entry, RepoFile):
            continue
        if not entry.path.endswith(".parquet"):
            continue
        if not entry.path.startswith(DATA_PREFIX):
            continue
        digest, oid = lfs_metadata(entry)
        rows.append(InventoryItem(
            path=entry.path,
            size=int(entry.size or 0),
            source_sha256=digest,
            source_lfs_oid=oid,
            source_revision=pinned_revision,
        ))
    rows.sort(key=lambda row: row.path)
    if not rows:
        raise RuntimeError("No Parquet files found under source data/. Refusing to continue.")
    return pinned_revision, rows


def write_inventory(workdir: Path, revision: str, rows: list[InventoryItem]) -> None:
    workdir.mkdir(parents=True, exist_ok=True)
    inventory_path = workdir / "source-inventory.jsonl"
    with inventory_path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(asdict(row), ensure_ascii=False) + "\n")
    summary = {
        "source_repo": SOURCE_REPO,
        "destination_repo": DEST_REPO,
        "repo_type": REPO_TYPE,
        "source_revision": revision,
        "scope": "data/**/*.parquet (default/train source files)",
        "file_count": len(rows),
        "total_bytes": sum(row.size for row in rows),
        "total_gib": round(sum(row.size for row in rows) / (1024 ** 3), 3),
        "total_tib": round(sum(row.size for row in rows) / (1024 ** 4), 3),
        "inventory_file": inventory_path.name,
        "status": "inventory_complete_transfer_not_started",
    }
    (workdir / "inventory-summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, indent=2))


def read_inventory(workdir: Path) -> list[InventoryItem]:
    path = workdir / "source-inventory.jsonl"
    if not path.exists():
        raise FileNotFoundError(f"{path} not found; run the inventory command first.")
    rows = []
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(InventoryItem(**json.loads(line)))
    return rows


def init_db(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute("""
        CREATE TABLE IF NOT EXISTS files (
            path TEXT PRIMARY KEY,
            size INTEGER NOT NULL,
            source_sha256 TEXT,
            state TEXT NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            verified_at TEXT
        )
    """)
    db.commit()
    return db


def seed_db(db: sqlite3.Connection, rows: list[InventoryItem]) -> None:
    db.executemany(
        """INSERT OR IGNORE INTO files(path,size,source_sha256,state)
           VALUES(?,?,?,'pending')""",
        [(r.path, r.size, r.source_sha256) for r in rows],
    )
    db.commit()


def remote_files(api: HfApi) -> dict[str, tuple[int, str | None]]:
    found: dict[str, tuple[int, str | None]] = {}
    try:
        for entry in api.list_repo_tree(
            DEST_REPO, repo_type=REPO_TYPE, recursive=True, expand=True
        ):
            if isinstance(entry, RepoFile):
                digest, _ = lfs_metadata(entry)
                found[entry.path] = (int(entry.size or 0), digest)
    except Exception as exc:
        # A new/empty destination may return a not-found response.
        text = str(exc).lower()
        if "not found" not in text and "404" not in text and "empty" not in text:
            raise
    return found


def update_state(db: sqlite3.Connection, path: str, state: str,
                 error: str | None = None) -> None:
    db.execute(
        "UPDATE files SET state=?, attempts=attempts+1, last_error=?, "
        "verified_at=CASE WHEN ?='verified' THEN CURRENT_TIMESTAMP ELSE verified_at END "
        "WHERE path=?",
        (state, error, state, path),
    )
    db.commit()


def run_mirror(args: argparse.Namespace) -> None:
    token = os.environ.get("HF_TOKEN")
    if not token:
        raise RuntimeError("HF_TOKEN is required for destination writes.")
    workdir = Path(args.workdir).resolve()
    rows = read_inventory(workdir)
    db = init_db(workdir / "mirror-state.sqlite3")
    seed_db(db, rows)
    api = HfApi(token=token)

    summary_path = workdir / "inventory-summary.json"
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    expected_revision = summary["source_revision"]
    if any(row.source_revision != expected_revision for row in rows):
        raise RuntimeError("Inventory contains mixed source revisions.")

    # Remote listing is used to safely resume after a machine/job restart.
    remote = remote_files(api)
    pending: list[InventoryItem] = []
    for row in rows:
        remote_meta = remote.get(row.path)
        if remote_meta and remote_meta[0] == row.size and (
            row.source_sha256 is None or remote_meta[1] == row.source_sha256
        ):
            db.execute(
                "UPDATE files SET state='verified',last_error=NULL,verified_at=CURRENT_TIMESTAMP WHERE path=?",
                (row.path,),
            )
        else:
            pending.append(row)
    db.commit()

    if args.max_files is not None:
        pending = pending[:args.max_files]

    print(f"Pinned source revision: {expected_revision}")
    print(f"Inventory files: {len(rows)}; already verified remotely: {len(rows)-len(pending)}")
    print(f"Files queued in this run: {len(pending)}")

    batch: list[tuple[InventoryItem, Path]] = []
    batch_bytes = 0
    completed_this_run = 0

    def upload_batch(items: list[tuple[InventoryItem, Path]]) -> None:
        nonlocal completed_this_run
        if not items:
            return
        operations = [
            CommitOperationAdd(path_in_repo=item.path, path_or_fileobj=str(local_path))
            for item, local_path in items
        ]
        api.create_commit(
            repo_id=DEST_REPO,
            repo_type=REPO_TYPE,
            operations=operations,
            commit_message=f"Mirror FineWeb data batch ({len(items)} files)",
        )
        # Re-check destination metadata after commit before marking verified.
        for item, local_path in items:
            update_state(db, item.path, "uploaded")
        for item, local_path in items:
            local_digest = sha256_file(local_path)
            if item.source_sha256 and local_digest != item.source_sha256:
                update_state(db, item.path, "failed", "Local SHA-256 differs from source LFS OID")
                raise RuntimeError(f"SHA-256 mismatch for {item.path}")
            completed_this_run += 1
            update_state(db, item.path, "verified")
            local_path.unlink(missing_ok=True)
        print(f"Verified {completed_this_run} files in this run.")

    try:
        for index, item in enumerate(pending, start=1):
            update_state(db, item.path, "downloading")
            try:
                local = Path(hf_hub_download(
                    repo_id=SOURCE_REPO,
                    filename=item.path,
                    repo_type=REPO_TYPE,
                    revision=expected_revision,
                    cache_dir=str(workdir / "hf-cache"),
                    force_download=False,
                ))
                if local.stat().st_size != item.size:
                    raise RuntimeError(
                        f"Size mismatch for {item.path}: {local.stat().st_size} != {item.size}"
                    )
                if item.source_sha256 and sha256_file(local) != item.source_sha256:
                    raise RuntimeError(f"Source SHA-256 mismatch for {item.path}")
                batch.append((item, local))
                batch_bytes += item.size
                update_state(db, item.path, "downloaded")
                if batch_bytes >= args.max_batch_bytes:
                    upload_batch(batch)
                    batch, batch_bytes = [], 0
                if index % 10 == 0:
                    print(f"Prepared {index}/{len(pending)} files.")
            except Exception as exc:
                update_state(db, item.path, "failed", str(exc)[:1000])
                raise
        upload_batch(batch)
    finally:
        db.close()

    print(f"Run complete. Files verified this run: {completed_this_run}.")
    print("A full mirror is NOT declared complete by a partial --max-files run.")


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    inv = sub.add_parser("inventory", help="List source Parquet files; no data download.")
    inv.add_argument("--workdir", default="./fineweb-mirror-work")
    inv.add_argument("--revision", default=None, help="Optional source revision; resolved and pinned.")
    mir = sub.add_parser("mirror", help="Transfer files after storage approval.")
    mir.add_argument("--workdir", default="./fineweb-mirror-work")
    mir.add_argument("--max-batch-bytes", type=int, default=8 * 1024**3)
    mir.add_argument("--max-files", type=int, default=None, help="Testing only; never a full mirror.")
    args = parser.parse_args()
    if args.command == "inventory":
        api = HfApi()
        revision, rows = source_inventory(api, args.revision)
        write_inventory(Path(args.workdir).resolve(), revision, rows)
    elif args.command == "mirror":
        run_mirror(args)


if __name__ == "__main__":
    main()
