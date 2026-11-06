import gzip
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from import_external import ShardWriter, base_record, record_id


class ImporterContractTests(unittest.TestCase):
    def test_record_ids_are_stable_and_source_namespaced(self):
        self.assertEqual(record_id("fineweb", "abc"), record_id("fineweb", "abc"))
        self.assertNotEqual(record_id("fineweb", "abc"), record_id("fineweb2", "abc"))

    def test_external_record_preserves_provenance_rights_and_review_state(self):
        record = base_record(
            "wikidata", "Q42", "ru", "Тест", "Текст записи",
            {"entity_type": "item"},
            "https://www.wikidata.org/wiki/Q42", "dump=2026-11-06",
            "CC0-1.0", "Structured data only", ["entity", "ru"]
        )
        self.assertEqual(record["source_record_id"], "Q42")
        self.assertEqual(record["rights"]["license"], "CC0-1.0")
        self.assertEqual(record["provenance"]["source_version"], "dump=2026-11-06")
        self.assertEqual(record["quality"]["status"], "imported_unreviewed")
        self.assertFalse(record["quality"]["fact_checked"])

    def test_canonical_registry_manifest_and_attribution_files(self):
        root = Path(__file__).resolve().parents[4]
        clause = root / "datasets" / "clause-ai"
        registry = json.loads((clause / "sources" / "registry.json").read_text(encoding="utf-8"))
        manifest = json.loads((clause / "manifest.json").read_text(encoding="utf-8"))
        schema = json.loads((clause / "schema" / "external-document.schema.json").read_text(encoding="utf-8"))
        source_ids = {source["id"] for source in registry["sources"]}
        self.assertEqual(source_ids, {"fineweb", "fineweb2", "wikidata", "openalex"})
        self.assertEqual(manifest["source_registry"], "./sources/registry.json")
        self.assertEqual(manifest["corpus_architecture"], "./CORPUS_ARCHITECTURE.md")
        self.assertEqual(manifest["external_import_plan"]["imported_records"], 0)
        self.assertEqual(manifest["total_records"], 22)
        self.assertIn("source_id", schema["required"])
        for source in registry["sources"]:
            self.assertEqual(source["first_batch"]["target_records"], 1_000_000)
            attribution = clause / "sources" / "attribution" / f'{source["id"]}.md'
            self.assertTrue(attribution.is_file(), str(attribution))

    def test_shard_writer_emits_valid_gzip_jsonl_and_exact_counts(self):
        with tempfile.TemporaryDirectory() as tmp:
            writer = ShardWriter(Path(tmp), "fixture")
            for index in range(3):
                writer.write({"id": str(index), "text": f"record {index}", "provenance": {"source_version": "fixture-v1"}, "rights": {"license": "CC0"}})
            report = writer.finish()
            self.assertEqual(report["records"], 3)
            self.assertEqual(report["source_versions"], ["fixture-v1"])
            self.assertEqual(report["licenses"], ["CC0"])
            self.assertEqual(len(report["shards"]), 1)
            shard = Path(report["shards"][0]["path"])
            self.assertEqual(report["shards"][0]["bytes"], shard.stat().st_size)
            self.assertEqual(report["shards"][0]["sha256"], hashlib.sha256(shard.read_bytes()).hexdigest())
            with gzip.open(shard, "rt", encoding="utf-8") as stream:
                rows = [json.loads(line) for line in stream]
            self.assertEqual([row["id"] for row in rows], ["0", "1", "2"])


if __name__ == "__main__":
    unittest.main()
