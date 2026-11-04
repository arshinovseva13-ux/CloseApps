# Clause AI — external corpus importer

This pipeline prepares **four real source imports**, with a target of 1,000,000 records per source:

| Source | Selection | Notes |
|---|---|---|
| FineWeb | English, pinned crawl configuration | ODC-By 1.0; attribution retained |
| FineWeb2 | Russian, `rus_Cyrl` subset | ODC-By 1.0; English is already represented by FineWeb |
| Wikidata | Weekly JSON entity dump | CC0 structured data; media is excluded |
| OpenAlex | Works from public JSONL snapshot | Metadata only; linked full texts are excluded |

The Hugging Face Hub registry entry is a **discovery catalogue**, not a dataset, so it is not counted as a fifth import. Common Crawl remains excluded because its raw content has no single blanket license and needs source-level rights/privacy review.

## Important storage boundary

The importer writes gzip-compressed JSONL shards locally. The GitHub Actions workflow uploads them as a temporary workflow artifact (30-day retention). **It does not commit multi-gigabyte data into the CloseApps source repository or GitHub Pages.** To make the corpus permanently downloadable from the Clause AI site, the generated shards must then be copied to a durable dataset store (for example, a dedicated Hugging Face dataset repository or object storage) and the resulting URLs/checksums added to the manifest.

No record counter is increased until all shards are downloaded, validated, and published to durable storage.

## Run locally

Python 3.11+:

```bash
python -m pip install -r datasets/clause-ai/importer/requirements.txt
python datasets/clause-ai/importer/import_external.py --source all --limit 1000000 --out ./clause-ai-import
```

Choose individual sources with `--source fineweb,fineweb2,wikidata,openalex`.

## GitHub Actions

Open **Actions → Clause AI external corpus import → Run workflow**. The default limit is 1,000,000 per source. The workflow is manual so a push to the website does not unexpectedly start a multi-terabyte-source ingestion job.

The importer uses streaming where possible and writes 50,000-record shards. Wikidata requires scanning its compressed public dump to reach the first million entities; this can take substantial time and network bandwidth. OpenAlex reads the public snapshot, not the full-text archive.

## Record format

Each JSONL row uses `schema/external-document.schema.json`. Original source identifiers and useful metadata are retained. Raw web text is not falsely represented as an independently verified knowledge explanation: all imported records are marked `imported_unreviewed`.

## License and quality safeguards

- FineWeb/FineWeb2: retain ODC-By attribution and source provenance.
- Wikidata: CC0 structured entity data; no media or linked files.
- OpenAlex: metadata-only import; do not infer that metadata terms license linked full texts.
- All imports: source IDs, retrieval time, version/config, and license notes are retained.
- No automatic claim of expert fact-checking or language review.
