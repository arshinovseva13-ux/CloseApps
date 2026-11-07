"""Small, reproducible LoRA continued-training run for Clause Astra.

Input: JSONL files. A record may contain text, body, content, summary and/or title.
This is corpus adaptation (causal LM), not supervised instruction fine-tuning.
"""
from __future__ import annotations

import argparse
import json
import os
import random
from pathlib import Path
from typing import Any

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--train", required=True)
    p.add_argument("--validation", required=True)
    p.add_argument("--base-model", default="Qwen/Qwen3-0.6B-Base")
    p.add_argument("--output-dir", default="./clause-astra-lora")
    p.add_argument("--max-steps", type=int, default=200)
    p.add_argument("--max-length", type=int, default=1024)
    p.add_argument("--batch-size", type=int, default=1)
    p.add_argument("--grad-accumulation", type=int, default=8)
    p.add_argument("--learning-rate", type=float, default=2e-4)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--save-steps", type=int, default=50)
    return p.parse_args()


def record_to_text(record: dict[str, Any]) -> str:
    if isinstance(record.get("text"), str) and record["text"].strip():
        return record["text"].strip()
    fields = []
    for key in ("title", "summary", "body", "content", "detailed_body", "key_points"):
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            fields.append(value.strip())
        elif isinstance(value, list):
            fields.extend(str(x).strip() for x in value if str(x).strip())
    return "\n\n".join(fields)


def main() -> None:
    args = parse_args()
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    if not torch.cuda.is_available():
        raise SystemExit("No CUDA GPU detected. Refusing to start this GPU training run.")
    if not Path(args.train).is_file() or not Path(args.validation).is_file():
        raise SystemExit("Both train and validation JSONL files must exist.")

    gpu = torch.cuda.get_device_properties(0)
    print(json.dumps({
        "event": "gpu_detected",
        "name": torch.cuda.get_device_name(0),
        "vram_gib": round(gpu.total_memory / 1024**3, 2),
        "torch": torch.__version__,
        "cuda": torch.version.cuda,
    }, ensure_ascii=False), flush=True)

    raw = load_dataset("json", data_files={"train": args.train, "validation": args.validation})
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=False)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    def normalize(batch: dict[str, list[Any]]) -> dict[str, list[str]]:
        rows = []
        for i in range(len(next(iter(batch.values())))):
            record = {k: v[i] for k, v in batch.items()}
            text = record_to_text(record)
            if text:
                rows.append(text)
        return {"text": rows}

    text_ds = raw.map(normalize, batched=True, remove_columns=raw["train"].column_names)
    text_ds = text_ds.filter(lambda x: bool(x["text"].strip()))

    def tokenize(batch: dict[str, list[str]]) -> dict[str, Any]:
        return tokenizer(batch["text"], truncation=True, max_length=args.max_length, padding=False)

    tokenized = text_ds.map(tokenize, batched=True, remove_columns=["text"])
    if len(tokenized["train"]) == 0 or len(tokenized["validation"]) == 0:
        raise SystemExit("No usable records after normalization; inspect JSONL fields.")

    bf16 = torch.cuda.is_bf16_supported()
    dtype = torch.bfloat16 if bf16 else torch.float16
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=dtype,
        device_map="auto",
        trust_remote_code=False,
    )
    model.config.use_cache = False
    model.gradient_checkpointing_enable()
    lora = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    training_args = TrainingArguments(
        output_dir=str(out),
        max_steps=args.max_steps,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=args.grad_accumulation,
        learning_rate=args.learning_rate,
        warmup_ratio=0.03,
        lr_scheduler_type="cosine",
        logging_steps=5,
        eval_strategy="steps",
        eval_steps=args.save_steps,
        save_strategy="steps",
        save_steps=args.save_steps,
        save_total_limit=3,
        bf16=bf16,
        fp16=not bf16,
        gradient_checkpointing=True,
        report_to="none",
        seed=args.seed,
        data_seed=args.seed,
        optim="adamw_torch",
        remove_unused_columns=False,
    )
    collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["validation"],
        data_collator=collator,
    )
    metadata = {
        "base_model": args.base_model,
        "task": "causal_lm_lora_corpus_adaptation",
        "train_records": len(tokenized["train"]),
        "validation_records": len(tokenized["validation"]),
        "max_steps": args.max_steps,
        "max_length": args.max_length,
        "gpu": torch.cuda.get_device_name(0),
        "vram_gib": round(gpu.total_memory / 1024**3, 2),
        "torch": torch.__version__,
        "cuda": torch.version.cuda,
        "seed": args.seed,
    }
    (out / "run_metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
    print(json.dumps({"event": "training_started", **metadata}, ensure_ascii=False), flush=True)
    result = trainer.train()
    trainer.save_model(str(out / "final-adapter"))
    tokenizer.save_pretrained(str(out / "final-adapter"))
    metrics = dict(result.metrics)
    metrics["eval"] = trainer.evaluate()
    (out / "final_metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2, default=str))
    print(json.dumps({"event": "training_finished", "metrics": metrics}, ensure_ascii=False, default=str), flush=True)


if __name__ == "__main__":
    main()
