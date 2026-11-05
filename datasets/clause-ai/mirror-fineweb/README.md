# Clause AI — FineWeb full mirror

This directory contains the controlled, resumable workflow for creating a public byte-for-byte mirror of the `default/train` Parquet files from `HuggingFaceFW/fineweb`.

## Current state

- Destination Hugging Face Dataset: [Seva-35/clause-ai-fineweb-mirror](https://huggingface.co/datasets/Seva-35/clause-ai-fineweb-mirror)
- Source: [HuggingFaceFW/fineweb](https://huggingface.co/datasets/HuggingFaceFW/fineweb)
- Source configuration: `default`, split `train`, defined by `data/*/*` in the source Dataset Card.
- Source license: ODC-By 1.0 (preserve attribution and provenance).
- File-level inventory completed successfully on 2026-11-05.
- Pinned source revision: `9bb295ddab0e05d785b879661af7260fed5140fc`.
- Inventory: **27,468 unique Parquet files**, **53,417,984,478,442 bytes** (48.583 TiB), under 110 crawl snapshot directories.
- The inventory API did not expose source SHA-256/LFS OIDs for these files; content checksums must be computed during the transfer pilot.
- Mirror status: **transfer not started**. No source data has been copied yet.
- Storage grant: **not approved**. Do not start the full transfer until capacity and terms are confirmed.

## Important scope decision

The mirror copies the source files under `data/` once. It does not copy the source `sample/` directory, evaluation files, or duplicate per-snapshot views. The `default` config is the union of the crawl snapshot files under `data/*/*`; copying both `default` and every snapshot as separate physical copies would duplicate data.

The source revision is pinned to a commit SHA before inventory and stored in the inventory manifest. A later source update is a new mirror version, not an in-place silent change.

## Workflow

1. **Inventory** — list every source file under `data/`, recording path, size, LFS SHA-256 when available, and pinned source revision.
2. **Capacity gate** — compare total bytes plus operational headroom against the approved destination quota. Recommended headroom: at least 10%.
3. **Grant gate** — obtain explicit confirmation from Hugging Face before any multi-terabyte upload.
4. **Transfer** — download one bounded batch to a persistent local/attached disk, then upload it to the destination with Xet enabled.
5. **Resume** — SQLite tracks file state locally. Existing destination objects are checked against source size and SHA-256 before being skipped.
6. **Verify** — every copied object must match source size and, where available, source LFS SHA-256. A mirror is complete only when every inventory row is verified.
7. **Publish** — write the final inventory, verification report, source revision, license and attribution into the destination Dataset Card.

## Requirements

Python 3.11+ and:

```bash
pip install -r datasets/clause-ai/mirror-fineweb/requirements-mirror.txt
```

Authentication for uploads:

```bash
export HF_TOKEN=... # write access to the destination dataset
```

Never commit a token or paste it into chat.

## Inventory

Run this first; it does not download the dataset:

```bash
python datasets/clause-ai/mirror-fineweb/mirror_fineweb.py inventory \
  --workdir ./fineweb-mirror-work
```

It writes:
- `source-inventory.jsonl` (27,468 file records)
- `inventory-summary.json`

The successful GitHub Actions artifact is [clause-ai-fineweb-source-inventory](https://github.com/arshinovseva13-ux/CloseApps/actions/runs/42038315807). It is retained by GitHub until 2026-12-05.

## Transfer

Only after grant and storage capacity are approved:

```bash
python datasets/clause-ai/mirror-fineweb/mirror_fineweb.py mirror \
  --workdir ./fineweb-mirror-work \
  --max-batch-bytes 8589934592
```

The transfer is deliberately not wired to GitHub Actions. A 53+ TB copy needs a long-lived runner, persistent disk, bandwidth planning, and an approved storage quota. GitHub Actions ephemeral storage/artifacts are not a suitable mirror backend.

## Safety and legal notes

- FineWeb is licensed ODC-By 1.0. Preserve attribution and the source Dataset Card's license terms.
- The source card warns that residual personal information may remain despite filtering. Public redistribution should be reviewed against the source terms and Hugging Face guidance before publication.
- This is a data-preservation mirror, not an assertion that every record is factually correct or independently reviewed.
- Never mark the mirror complete based on a successful job submission; only a full verified inventory can do that.
