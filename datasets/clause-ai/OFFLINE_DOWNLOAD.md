# Clause AI — offline download

## Fast start (Windows)

1. Download this repository as ZIP and extract it.
2. Install Python 3.10 or newer.
3. Double-click `DOWNLOAD_CLAUSE_AI_OFFLINE.bat`.
4. Wait for the download and merge to finish.
5. The offline archive will be created at `ClauseAI-Offline/ClauseAI-Offline-Data.zip`.

The default first batch is 100,000 records from each of FineWeb, FineWeb2 (Russian Cyrillic), Wikidata and OpenAlex, plus the 22 original Foundations records. This is a practical first offline pack, not the full upstream datasets. It requires internet during the initial download; after the ZIP is created, extraction and reading the corpus work offline.

For a larger first batch, run from the repository root:

```bash
py -3 -m pip install datasets huggingface_hub requests
py -3 datasets/clause-ai/importer/download_offline.py --records-per-source 1000000
```

If source shards are already downloaded and you only need to rebuild the merged corpus:

```bash
py -3 datasets/clause-ai/importer/download_offline.py --skip-download
```

The output contains gzip JSONL shards, a corpus manifest, and exact duplicate groups. Source licenses, source IDs, revisions, and quality flags remain attached to records.

## Storage

The size depends on source data and text lengths. Keep several GB free for the initial 100k-per-source pack; a 1M-per-source pack can require substantially more. Do not use the full 48.583 TiB FineWeb mirror for this first offline pack.
