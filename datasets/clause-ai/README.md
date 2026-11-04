# Clause AI — Universal Knowledge Corpus

**Release:** 0.2.0  
**Project:** Close Приложения / CLOSE Датасеты

Clause AI is a downloadable multilingual knowledge corpus, not a model or chatbot. Its canonical content is knowledge-first: concepts, principles, processes, explanations, and relations between ideas. It is not primarily a question-and-answer dataset.

## Release 0.2.0

The first library, **Foundations**, contains 22 original Russian and English knowledge records across physics, biology, mathematics, computer science, Earth science, astronomy, chemistry, and economics.

## Repository structure

- `manifest.json` — release catalog, libraries, shards, languages, and record counts.
- `schema/record.schema.json` — JSON Schema for knowledge records.
- `libraries/<library-id>/*.jsonl` — knowledge shards, one JSON object per line.
- `libraries/foundations/README.md` — description of the first library.
- `data/sample.jsonl` — legacy format demonstration, not part of the main corpus.

## Record design

Each record includes a stable ID, record type, domain, language, title, summary, detailed body, key points, limitations, relations, provenance, rights, quality state, and tags. Russian and English versions are separate records.

## Quality and licensing

The first library contains original explanatory syntheses. It has not yet undergone independent expert fact-checking or professional language review. All records are marked `draft_review_required`; they must not be treated as verified ground truth.

The original explanatory text is released under **CC BY 4.0** by CloseApps / Clause AI. External links and future third-party source material remain subject to their own licenses and restrictions. Record provenance and rights before adding external content. Exclude personal data, secrets, private communications, and confidential information.

## Using the corpus

- **RAG:** split the body into chunks while retaining record IDs, language, domain, and references. Index relations separately when useful.
- **Continued pretraining:** use only after licensing review, quality filtering, deduplication, and token counting with the target model's tokenizer.
- **Fine-tuning:** derive task examples as a separate transformed dataset. Keep the canonical corpus knowledge-first.

## Scale and releases

The long-term goal is a very large corpus, but no token-volume claim is made. Token counts must be measured with a named tokenizer. Every release should publish record counts, language/domain balance, quality states, licenses, and checksums.
