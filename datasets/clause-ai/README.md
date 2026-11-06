# Clause AI — Universal Knowledge Corpus

**Release:** 0.5.1  
**Project:** Close Приложения / CLOSE Датасеты  
**Languages:** Russian and English, with planned multilingual expansion.

Clause AI is a downloadable knowledge corpus, not a model or chatbot. Its canonical content is knowledge-first: concepts, principles, processes, explanations, and relations between ideas. It is not primarily a question-and-answer dataset.

## Current corpus status

The canonical in-repository library **Foundations** contains 22 original Russian and English knowledge records across physics, biology, mathematics, computer science, Earth science, astronomy, chemistry, and economics.

These 22 records are original explanatory syntheses, but have not undergone independent expert fact-checking or professional language review. They remain marked `draft_review_required`.

The external source registry now defines four selected datasets—FineWeb, FineWeb2, Wikidata, and OpenAlex—as one provenance-preserving Clause AI corpus. **No external records have yet been imported or published** and they are not included in the current record count. Counts and token volumes must be measured from actual, verified shards, never inferred from source catalogue estimates. See [the unified corpus architecture](./CORPUS_ARCHITECTURE.md) and [canonical source registry](./sources/registry.json).

## Notion control center

Notion is the project's private management plane:

- [Clause AI — Control Center](https://app.notion.com/p/40e542a83e97813aa57cd7044b919c2d)
- [Dataset Registry](https://app.notion.com/p/552f39d689d14342b449c6d5aed52b34)

The registry tracks source IDs, dataset category, language, license, pinned version, import status, imported record counts, shard URL, rights-review status, provenance notes, and priority.

Notion stores metadata and workflow state. It is not the bulk corpus storage layer. Large JSONL/Parquet files belong in a dedicated file store or dataset repository, with GitHub holding schemas, manifests, importer code, and the public viewer.

The Notion control center is private to the connected workspace. The public dataset viewer remains accessible without Notion access.

## External source catalogue

The public viewer currently lists these candidate sources:

- Hugging Face Datasets Hub — discovery catalogue; each dataset must be reviewed separately.
- FineWeb and FineWeb2 — large web-text corpora; pin exact snapshots/configurations and preserve attribution/provenance.
- Wikidata — structured entities and relations; start with topic-bounded subsets.
- Common Crawl — raw web archive; no blanket license for all crawled content, so wholesale import is blocked pending rights/privacy filtering.
- OpenAlex — scholarly metadata and citation graph; full-text rights are separate from metadata rights.

A source is not considered imported merely because it appears in the catalogue. Before import, record exact version/configuration, source date, license, restrictions, and transformation plan.

## Repository structure

- `manifest.json` — release catalog, libraries, shards, languages, counts, source candidates, and management links.
- `CORPUS_ARCHITECTURE.md` — unified corpus model, source-preserving layers, rights, quality gates, and execution order.
- `sources/registry.json` — canonical machine-readable registry of selected datasets, initial selections, licenses, and import status.
- `schema/record.schema.json` — JSON Schema for canonical knowledge records.
- `libraries/<library-id>/*.jsonl` — canonical knowledge shards, one JSON object per line.
- `libraries/foundations/README.md` — description of the first library.
- `data/sample.jsonl` — legacy format demonstration, not part of the main corpus.

## Record design

Each record includes a stable ID, record type, domain, language, title, summary, detailed body, key points, limitations, relations, provenance, rights, quality state, and tags. Russian and English versions are separate records.

## Professional ingestion requirements

Every imported source must go through a reproducible pipeline:

1. Pin dataset name, publisher, version/snapshot, configuration, source URL, retrieval date, and license.
2. Review redistribution, commercial-use, attribution, share-alike, and derivative-dataset conditions.
3. Download bounded shards with resumable transfers and checksum verification.
4. Parse and map source fields to the Clause AI schema while retaining original source IDs.
5. Detect language, malformed records, spam, duplicates, near-duplicates, and low-information content.
6. Apply privacy and safety filters; exclude secrets and sensitive personal data.
7. Preserve provenance and transformation metadata at record and shard level.
8. Validate schema, measure record counts, bytes, language/domain distribution, and tokens with a named tokenizer/version.
9. Publish immutable shards with checksums, source manifest, license notices, and a release changelog.
10. Never mark imported records as expert-reviewed unless an actual review has taken place.

## Quality states

The pipeline should distinguish raw import, normalization, deduplication, filtering, license review, expert review, and publication. These states are independent: passing one does not imply passing the others.

## Licensing

The original explanatory text in Foundations is released under **CC BY 4.0** by CloseApps / Clause AI. Third-party data remains subject to its own license and restrictions. A dataset's platform, hosting repository, or code license does not automatically license the data.

Exclude personal data, secrets, private communications, and confidential information. Do not republish a third-party corpus unless its terms permit the intended redistribution.

## Use cases

- **RAG:** split the body into chunks while retaining record IDs, language, domain, and references. Index relations separately when useful.
- **Continued pretraining:** use only after rights review, quality filtering, deduplication, and token counting with the target model's tokenizer.
- **Fine-tuning:** derive task examples as a separate transformed dataset. Keep the canonical corpus knowledge-first.

## Release history

- **0.5.1** — Passed a 400-record real-source smoke test (100 records per source); exact revisions and snapshot identifiers recorded. No external data has been durably published yet.
- **0.5.0** — Unified corpus architecture and canonical source registry for FineWeb, FineWeb2, Wikidata, and OpenAlex; source pinning and manual-only bulk imports.
- **0.3.1** — Added Notion control center and source registry; clarified that management metadata and bulk corpus storage are separate.
- **0.3.0** — Added catalogue of large external dataset candidates; no external corpus imported.
- **0.2.0** — Foundations library expanded to 22 bilingual records, manifest, schema, and dual-mode viewer.

## Public links

- [Clause AI website](https://arshinovseva13-ux.github.io/CloseApps/datasets/clause-ai/)
- [GitHub repository folder](https://github.com/arshinovseva13-ux/CloseApps/tree/main/datasets/clause-ai)
