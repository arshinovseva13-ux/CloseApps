# Hugging Face storage grant — Clause AI FineWeb mirror

## Project

**Clause AI** is an open data infrastructure project. We propose a public, reproducible mirror of the complete `default/train` configuration of [HuggingFaceFW/fineweb](https://huggingface.co/datasets/HuggingFaceFW/fineweb).

Destination:
https://huggingface.co/datasets/Seva-35/clause-ai-fineweb-mirror

Project repository:
https://github.com/arshinovseva13-ux/CloseApps

## Requested support

The FineWeb Dataset Viewer currently reports approximately **53,418 GB** for `default/train`. We request consideration for approximately **60 TB** of public dataset storage, subject to an exact file-level inventory and Hugging Face's grant assessment.

No bulk upload has started. The destination repository exists but is currently only a repository shell.

## Intended public benefit

- Preserve a reproducible public copy of the source Parquet files.
- Make the dataset easier to discover and consume through the Hugging Face Hub.
- Publish a pinned source revision, file inventory, integrity report, license and attribution.
- Provide a transparent, resumable mirror process rather than an undocumented copy.
- Keep the source files unchanged and separate imported source data from Clause AI's own authored knowledge records.

## Technical safeguards

- Source: `HuggingFaceFW/fineweb`, configuration `default`, split `train`.
- Source Dataset Card defines the configuration as `data/*/*`.
- The mirror copies each physical Parquet file under `data/` once; it does not duplicate snapshot data under a second folder.
- The source repository revision is pinned before inventory.
- Every file is tracked by path, byte size and source LFS SHA-256 where available.
- Transfers are bounded, restartable and verified before completion is recorded.
- Destination is a public Hugging Face Dataset repository using the Hub's large-file storage.
- The mirror will preserve the source ODC-By 1.0 license and attribution.

## Important limitations

The source Dataset Card notes that residual personal information may remain despite filtering. We will preserve this warning and follow Hugging Face guidance and applicable source terms. We do not claim independent review of every record.

## Request for guidance

Please advise:
1. Whether this project is eligible for a public dataset storage grant.
2. Whether a grant of approximately 60 TB can be considered.
3. What evidence, application form or project metrics are required.
4. Whether any transfer, retention, bandwidth or egress conditions apply.
5. Whether Hugging Face recommends a specific upload strategy for a mirror of this scale.

## Contact

Hugging Face account: [Seva-35](https://huggingface.co/Seva-35)

Submission channel to confirm from current Hugging Face grant guidance:
datasets@huggingface.co

This file is a prepared application brief. It has not been submitted.
