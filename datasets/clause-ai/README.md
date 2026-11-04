# Clause AI — Dataset

**Release:** 0.1.0 (starter sample)  
**Project:** Close Приложения / CLOSE Датасеты

Clause AI is a downloadable dataset project. It is not a model or chatbot.

## Current release

This release contains only a small illustrative JSONL sample to establish the record format. It is **not** a large-scale training corpus and does not claim to contain billions or trillions of tokens. The sample records are synthetic demonstrations and should not be treated as verified factual knowledge.

## Intended workflows

- **SFT:** map `instruction`, `input`, and `output` into the trainer's expected conversation format.
- **RAG:** split approved documents into chunks, preserve metadata, embed and index them. This does not modify model weights.
- **Continued pretraining:** tokenize an appropriately licensed text corpus using the target model tokenizer. This requires an actual training pipeline and compute.

## Record format

Each line in `data/sample.jsonl` is a standalone JSON object:

- `id`: stable record identifier
- `record_type`: `instruction`, `knowledge`, or `code`
- `domain`: subject area
- `language`: BCP-47 language tag
- `content`: task or text fields
- `provenance`: source and collection metadata
- `rights`: license and usage notes
- `quality`: review state
- `tags`: searchable labels

## Responsible data policy

Before adding real external data, record its source, license, attribution requirements, and permitted uses. Exclude personal data, credentials, private messages, and confidential material. Deduplicate, validate, and review data. Synthetic examples must be labeled as synthetic and must not be presented as verified facts.

## Planned releases

1. Freeze and document the schema.
2. Add a validator and automated quality checks.
3. Add source-backed, rights-cleared domain collections.
4. Publish language/domain shards with manifests and SHA-256 checksums.
5. Add export recipes for common training and RAG workflows.

## License

The sample is provided as an illustrative project fixture. No blanket license for future dataset releases is granted by this README. Each release must state its own dataset license and source-specific restrictions.
