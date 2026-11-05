# Hugging Face storage grant — Clause AI FineWeb mirror

## Executive summary

Clause AI proposes a public, byte-preserving mirror of the complete `default/train` Parquet data in [HuggingFaceFW/fineweb](https://huggingface.co/datasets/HuggingFaceFW/fineweb), hosted as a Hugging Face Dataset at:

https://huggingface.co/datasets/Seva-35/clause-ai-fineweb-mirror

The source inventory is complete and pinned to revision `9bb295ddab0e05d785b879661af7260fed5140fc`. It contains **27,468 unique Parquet files totaling 53,417,984,478,442 bytes (48.583 TiB)**. We request guidance on whether Hugging Face could support this project with approximately **60 TB of public storage**, including operational headroom, through a storage grant or another no-cost community program.

**No bulk transfer has started. No paid storage or compute has been purchased or authorized.**

## Project and current status

- Project: Clause AI — FineWeb Mirror.
- Dataset source: `HuggingFaceFW/fineweb`.
- Source configuration/split: `default/train`, physically represented by the Parquet files under `data/`.
- Pinned source revision: `9bb295ddab0e05d785b879661af7260fed5140fc`.
- Exact inventory: 27,468 unique files; 53,417,984,478,442 bytes (48.583 TiB); 110 crawl snapshot directories.
- Destination: [Seva-35/clause-ai-fineweb-mirror](https://huggingface.co/datasets/Seva-35/clause-ai-fineweb-mirror).
- Implementation and reproducibility documentation: [arshinovseva13-ux/CloseApps](https://github.com/arshinovseva13-ux/CloseApps/tree/main/datasets/clause-ai/mirror-fineweb).
- Inventory workflow and downloadable artifact: [GitHub Actions run #42038315807](https://github.com/arshinovseva13-ux/CloseApps/actions/runs/42038315807).
- Current destination repository metrics observed on 2026-11-05: 13 downloads. The project is at a pre-transfer stage and does not yet have demonstrated large-scale adoption, citations, or a published verification report.

The inventory records paths and byte sizes. The source listing API did not provide source SHA-256/LFS OIDs for these files; checksums will therefore be calculated and compared during a controlled transfer pilot before any full-scale copy.

## Why this mirror may be useful

- Preserve a pinned, reproducible public copy of a widely used open dataset.
- Offer a stable, clearly attributed dataset entry with a transparent file inventory and integrity report.
- Make the source data easier to discover and consume through a separately documented Hub dataset repository.
- Keep the mirror process restartable and auditable, with per-file verification rather than treating a successful upload job as proof of completion.
- Preserve source files unchanged; no reformatting or additional data transformation is proposed.

We recognize that the source dataset is already publicly available on Hugging Face. The proposed value is therefore preservation, independent reproducibility, and a separately maintained mirror—not a claim that the source is inaccessible or that this project already has substantial community adoption.

## Requested support and questions

We would appreciate an eligibility assessment before initiating any upload.

1. Is an individual-led, pre-launch open-source project eligible for a public storage grant of this scale?
2. Could approximately 60 TB be considered, either as one allocation or through a staged allocation tied to verified milestones and community adoption?
3. If this project is not currently eligible, what measurable evidence or milestones would Hugging Face expect before reconsidering it?
4. Are there alternative no-cost programs, research partnerships, or community mirror arrangements suitable for a 48.583 TiB public dataset?
5. If support is possible, what are the exact storage quota, duration, renewal, bandwidth/egress, and retention conditions?
6. Does Hugging Face recommend a specific upload strategy for 27,468 Parquet files totaling 53.4 TB?

We understand from the current Hub storage documentation that grants are evaluated case by case and are intended for impactful open-source work where paid storage is not a viable option. The project is not presented as an academic institution or non-profit, and we do not claim grant eligibility in advance.

## Technical and operational safeguards

- Copy only the physical files under `data/` once; do not duplicate per-snapshot data or the `sample/` subsets.
- Pin the source revision for the entire mirror version.
- Preserve ODC-By 1.0 license information and attribution.
- Compute SHA-256 checksums during transfer because the inventory listing did not expose source hashes.
- Use bounded batches, a persistent resume database, and destination-side verification.
- Require written confirmation of sufficient quota and terms before any multi-terabyte transfer.
- Publish the inventory, verification results, source revision, license, and provenance.
- Do not use ephemeral GitHub Actions storage as a bulk-transfer backend.
- Do not incur paid storage, compute, or transfer charges without explicit authorization.

## Dataset and legal considerations

The source dataset is released under ODC-By 1.0. The mirror will retain attribution and provenance and will link back to the original dataset and its documentation.

The source Dataset Card warns that residual personal information may remain despite filtering. The mirror will preserve this warning and the source terms. We do not claim to have independently reviewed every record or to have removed all personal information.

## Project contact

Hugging Face account: [Seva-35](https://huggingface.co/Seva-35)

GitHub project: https://github.com/arshinovseva13-ux/CloseApps/tree/main/datasets/clause-ai/mirror-fineweb

Preferred contact channel indicated by Hugging Face's storage documentation: datasets@huggingface.co.

This document is a prepared grant inquiry. It has **not** been submitted.
