# FineWeb mirror — execution plan

Last reviewed: 2026-11-04

## Decision record

- Destination: `Seva-35/clause-ai-fineweb-mirror` (public Hugging Face Dataset repository; creation confirmed).
- Source: `HuggingFaceFW/fineweb`.
- Scope: the source Dataset Card's `default/train` config, defined as `data/*/*`; physically mirror each source Parquet file under `data/` exactly once.
- License: ODC-By 1.0; preserve attribution and provenance.
- Funding: apply for a Hugging Face storage grant; no paid expansion authorized.
- Estimated source size: Dataset Viewer reports 53,418 GB. Treat this as an estimate pending a file-level inventory.
- Capacity request planning target: approximately 60 TB (source estimate plus operational headroom); confirm actual inventory and grant policy before upload.
- Inventory workflow: manual dispatch remains available; a push affecting this project directory also starts metadata-only inventory. This commit is intended to trigger the first run automatically.

## Phases and gates

### Phase 0 — repository and scope
- [x] Verify Hugging Face identity and write-capable OAuth scope.
- [x] Create public destination Dataset repository.
- [x] Inspect source Dataset Card and configuration declaration.
- [x] Confirm `default/train` maps to `data/*/*`.
- [x] Add mirror workflow documentation and a resumable CLI to CloseApps.
- [ ] Publish destination Dataset Card and project attribution files.

### Phase 1 — exact inventory
- [ ] Run `mirror_fineweb.py inventory` from a persistent runner.
- [ ] Record source commit SHA, every Parquet path, byte size and source LFS SHA-256.
- [ ] Produce an inventory summary with file count and exact total bytes.
- [ ] Compare inventory total with the Dataset Viewer estimate; explain any difference.

### Phase 2 — grant and capacity
- [ ] Submit the grant request in `GRANT_REQUEST.md` to Hugging Face.
- [ ] Obtain written confirmation of storage quota, eligibility, duration and any egress/transfer constraints.
- [ ] Do not begin bulk transfer until capacity is explicitly sufficient.
- [ ] If grant is declined, pause and present alternatives; do not incur paid storage without approval.

### Phase 3 — controlled transfer
- [ ] Select a persistent runner with sufficient temporary disk and reliable bandwidth.
- [ ] Start with a small approved pilot (for example, 2–3 files) to validate upload, Xet handling, resume and verification.
- [ ] Run bounded batches with SQLite state and restart-safe behavior.
- [ ] Keep source revision pinned throughout the mirror version.
- [ ] Monitor transfer, retries, quota and destination storage.

### Phase 4 — verification and publication
- [ ] Verify destination size and SHA-256 against every source file.
- [ ] Confirm every inventory row is verified; no pending, downloading or failed rows remain.
- [ ] Publish final inventory, verification report, source revision, license and attribution.
- [ ] Mark mirror complete only after all checks pass.

## Non-goals / safety constraints

- No GitHub Actions artifacts as bulk storage.
- No copying the `sample/` subsets or duplicating each snapshot on top of `data/*/*`.
- No transformation from Parquet to JSONL during mirroring.
- No claims of completeness from job submission, partial tests or the Hub's estimated dataset size.
- Never put HF tokens in Git, manifests, logs, chat messages or public issues.
- Public release requires preserving ODC-By attribution and reviewing the source card's warning about residual personal information.
