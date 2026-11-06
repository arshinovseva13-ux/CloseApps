# Clause AI — unified corpus architecture

**Architecture version:** 1.0  
**Status:** integration design and import pipeline; external imports not yet published.

## Goal

Clause AI is the single canonical, provenance-preserving corpus for all datasets currently selected for this project. It combines source material into one discoverable corpus without erasing source boundaries, original identifiers, licenses, or revision history.

"Unified" means one registry, one ingestion contract, one release manifest, one validation process, and one public entry point. It does **not** mean that every source can be relicensed under one Clause AI license.

## Source registry

The authoritative machine-readable list is `sources/registry.json`.

| Source | First import target | Initial selection | Rights | Current status |
|---|---:|---|---|---|
| FineWeb | 1,000,000 | English `CC-MAIN-2024-10/train` sample | ODC-By 1.0; preserve attribution and source-page caveats | Import planned; full mirror separately inventoried |
| FineWeb2 | 1,000,000 | Russian `rus_Cyrl/train` | ODC-By 1.0; preserve attribution and Common Crawl terms | Import planned |
| Wikidata | 1,000,000 | Items and properties; structured data only | CC0 for structured data | Import planned |
| OpenAlex | 1,000,000 | Works metadata from public JSONL snapshot | CC0 for OpenAlex metadata; no full-text rights implied | Import planned |

The Hugging Face Datasets Hub is a discovery catalogue, not a single dataset. Common Crawl raw WARC is excluded from direct ingestion until source-level rights, privacy, and opt-out checks are designed and documented.

## Two complementary data layers

### 1. Source-preserving layer

Keep original source files and snapshots unchanged whenever they are mirrored. This is required for reproducibility and exact provenance.

- FineWeb full mirror is its own source-preserving project at `mirror-fineweb/`.
- The full FineWeb mirror currently has an inventory of 27,468 Parquet files, 53,417,984,478,442 bytes (48.583 TiB), pinned to revision `9bb295ddab0e05d785b879661af7260fed5140fc`.
- That mirror is not the same thing as the 1,000,000-record Clause import sample.
- FineWeb2, Wikidata, and OpenAlex may later have their own full-source mirrors only after storage and rights review. No full mirror is assumed by the first-batch import.

### 2. Unified Clause record layer

Each selected source record is normalized to `schema/external-document.schema.json` and stored as gzip-compressed JSONL, 50,000 records per shard.

Each record retains:
- stable Clause ID and original source ID;
- source ID, source URL, exact source version/revision, retrieval time;
- source metadata and language;
- original license and source-specific obligations;
- quality state, explicitly unreviewed until reviewed;
- tags for source, language, and subject.

The source-native files are never overwritten by normalized records.

## Deduplication and identity

- IDs are deterministic and namespaced by source.
- Exact duplicates across sources are detected using normalized-text SHA-256 during a later consolidation pass; source records remain traceable even when one canonical text is selected for retrieval.
- Near-duplicate detection is a separate quality stage and must not silently delete source provenance.
- Cross-source matches create links/duplicate groups, not destructive source-file deletion.
- Keep multiple source records where metadata, licensing, or wording differs materially.

## Rights model

There is no blanket "Clause AI owns all data" claim.

- FineWeb/FineWeb2: retain ODC-By 1.0 attribution and relevant upstream notices; account for the Common Crawl terms and the fact that source webpages may carry independent rights.
- Wikidata: CC0 applies to structured entity data; do not bundle media or third-party content into this import.
- OpenAlex: CC0 applies to OpenAlex metadata; abstracts/metadata are included only as distributed by OpenAlex. Linked full text and PDFs are not copied or relicensed by this pipeline.
- Foundations: original Clause AI explanatory texts remain under CC BY 4.0, separate from third-party data.
- Every release must publish a source-by-source license and attribution index. If any source has incompatible redistribution terms, exclude or separately gate that source rather than flattening its license.

## Release layout

A durable release should look like:

```text
clause-ai/
  README.md
  manifest.json
  sources/
    registry.json
    attribution/
      fineweb.md
      fineweb2.md
      wikidata.md
      openalex.md
  schema/
    record.schema.json
    external-document.schema.json
  libraries/
    foundations/
      *.jsonl
  imports/
    fineweb/
      manifest.json
      shard-00000.jsonl.gz
    fineweb2/
      manifest.json
      shard-00000.jsonl.gz
    wikidata/
      manifest.json
      shard-00000.jsonl.gz
    openalex/
      manifest.json
      shard-00000.jsonl.gz
  quality/
    validation-report.json
    duplicate-groups.jsonl
```

The actual large shards belong in durable dataset/object storage, not Git history, GitHub Pages, or 30-day workflow artifacts. GitHub stores code, schemas, source registry, small manifests, and release documentation. The Clause AI viewer links to the durable shard store.

## Quality gates

A source import is not "in Clause AI" until all required gates pass:

1. Source version and configuration are pinned and recorded.
2. Rights and redistribution review is complete for the selected data.
3. Import count and source IDs are measured from actual output.
4. JSONL parses; every record validates against the schema.
5. Source IDs are unique within source; deterministic Clause IDs are reproducible.
6. Shard sizes and SHA-256 checksums are recorded.
7. Language and empty/short-text checks are reported.
8. Exact duplicates are measured and linked without losing provenance.
9. Source attribution and license files are included.
10. Shards are uploaded to durable storage and downloaded/verified from destination.
11. Only then does the public manifest count the records as published.

## Execution order

1. Keep FineWeb's full source inventory and mirror workflow independent from the 1M sample import.
2. Pin exact source revisions/manifests at the start of each import.
3. Run small smoke tests per source, then the authorized first batch (up to 1M records per source).
4. Validate the generated files and produce a checksum report.
5. Secure durable free storage or grant approval before publishing large batches.
6. Publish source-by-source shards and attribution; update the master manifest only after destination verification.
7. Add incremental update jobs and quality review after the first release is stable.

## Current reality

- Foundations: 22 original RU/EN records in GitHub; draft review required.
- Source smoke test: passed with 100 records from each of the four sources (400 total); source revisions, licenses, and all four shard SHA-256 checksums recorded. The seven-day artifact is temporary validation evidence, not a published corpus release.
- External first batch: target 1,000,000 records per source; imported/published count remains zero until real artifacts pass all gates.
- FineWeb full mirror: inventory complete; data transfer not started.
- FineWeb2, Wikidata, OpenAlex full mirrors: not started.
- No paid storage or compute is authorized.
