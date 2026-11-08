# Clause Astra 1 — browser checkpoint v0.2

This folder contains the actual experimental model weights converted to little-endian float16 for browser inference.

- Architecture: 4-layer causal Transformer
- Unique parameters: 874,496
- Vocabulary: 442 characters
- Context length: 192
- Training: 300 CPU steps
- Original PyTorch checkpoint size: 3,513,107 bytes
- Browser weights: 1,748,992 bytes, float16
- SHA-256 of concatenated browser weights: f6420b52c3de461761c8c1f691287d9a6fa5a192c4f651c4ec6ea4803388c7b3

The weight payload is split into 39 Base64 shards under `weights/part-001.b64` … `part-039.b64`. The browser worker downloads and concatenates them, decodes float16 values, and runs the same architecture locally. `manifest.json` lists tensor offsets and shapes.

`tokenizer.json` contains the character vocabulary. `config.json` and `metrics.json` record the training run.

## Limitations
This is a very small research prototype trained for only 300 steps, not a useful production assistant. It is not instruction-tuned and may generate incoherent or repetitive text. The browser implementation is a lightweight inference port, not a quality improvement to the model.
