#!/usr/bin/env python3
"""Regression tests for the Clause AI corpus merger."""
from __future__ import annotations
import gzip
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MERGER = ROOT / "datasets" / "clause-ai" / "importer" / "merge_corpus.py"

class MergeCorpusTests(unittest.TestCase):
    def make_foundation(self, path: Path, text: str = "shared exact text") -> None:
        row = {
            "id": "foundation.test",
            "record_type": "concept",
            "domain": "testing",
            "language": "ru",
            "title": "Тест",
            "content": {"summary": text, "body": "Дополнительное объяснение", "key_points": ["Пункт"]},
            "rights": {"license": "CC-BY-4.0"},
            "quality": {"status": "draft_review_required"},
        }
        path.write_text(json.dumps(row, ensure_ascii=False) + "\n", encoding="utf-8")

    def make_external(self, path: Path, text: str = "shared exact text\n\nДополнительное объяснение\n\nKey points:\n- Пункт") -> None:
        row = {
            "id": "external-test-1",
            "record_type": "external_document",
            "source_id": "fixture",
            "source_record_id": "fixture-1",
            "language": "ru",
            "title": "Fixture",
            "text": text,
            "metadata": {},
            "provenance": {"source_url": "https://example.org", "source_version": "fixture-v1"},
            "rights": {"license": "CC0"},
            "quality": {"status": "imported_unreviewed", "fact_checked": False, "language_reviewed": False},
            "tags": ["test"],
        }
        with gzip.open(path, "wt", encoding="utf-8") as stream:
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")

    def run_merge(self, root: Path, drop: bool = False) -> dict:
        cmd = [
            sys.executable, str(MERGER),
            "--imports", str(root / "imports"),
            "--foundations", str(root / "foundations"),
            "--out", str(root / "out"),
        ]
        if drop:
            cmd.append("--drop-exact-duplicates")
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return json.loads((root / "out" / "manifest.json").read_text(encoding="utf-8"))

    def test_merges_foundations_and_gzip_external_and_reports_duplicates(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "foundations").mkdir()
            (root / "imports" / "fixture").mkdir(parents=True)
            self.make_foundation(root / "foundations" / "one.jsonl")
            self.make_external(root / "imports" / "fixture" / "one.jsonl.gz")
            manifest = self.run_merge(root)
            self.assertEqual(manifest["total_records"], 2)
            self.assertEqual(manifest["records_by_source"], {"fixture": 1, "foundations": 1})
            self.assertEqual(manifest["exact_duplicate_groups"], 1)
            shard = root / "out" / manifest["shards"][0]["path"]
            with gzip.open(shard, "rt", encoding="utf-8") as stream:
                rows = [json.loads(line) for line in stream]
            self.assertEqual(len(rows), 2)
            self.assertEqual({row["source_id"] for row in rows}, {"foundations", "fixture"})
            self.assertTrue((root / "out" / "duplicate-groups.jsonl").is_file())

    def test_optional_duplicate_drop_keeps_first_copy(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "foundations").mkdir()
            (root / "imports" / "fixture").mkdir(parents=True)
            self.make_foundation(root / "foundations" / "one.jsonl")
            self.make_external(root / "imports" / "fixture" / "one.jsonl.gz")
            manifest = self.run_merge(root, drop=True)
            self.assertEqual(manifest["total_records"], 1)
            self.assertEqual(manifest["exact_duplicates_dropped"], 1)

if __name__ == "__main__":
    unittest.main(verbosity=2)
