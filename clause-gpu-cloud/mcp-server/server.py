"""Clause GPU Cloud MCP bridge.

This is a thin, explicit-action wrapper around Google's official Colab MCP server.
It does not provision resources on startup and never stores credentials in source.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

COLAB_MCP_URL = "https://colaboratory.googleapis.com/mcp"
MAX_CODE_CHARS = 30_000
mcp = FastMCP("Clause GPU Cloud")


def _access_token() -> str:
    token = os.environ.get("GOOGLE_ACCESS_TOKEN", "").strip()
    if not token:
        raise RuntimeError(
            "GOOGLE_ACCESS_TOKEN is not set. Authenticate with Google and provide "
            "a short-lived OAuth access token in the server environment."
        )
    return token


def _parse_sse(body: str) -> dict[str, Any]:
    """Extract the JSON-RPC response from an SSE or plain JSON response."""
    candidates = []
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("data:"):
            candidates.append(line[5:].strip())
    if not candidates:
        candidates = [body.strip()]
    for candidate in reversed(candidates):
        if not candidate or candidate == "[DONE]":
            continue
        try:
            value = json.loads(candidate)
            if isinstance(value, dict):
                return value
        except json.JSONDecodeError:
            continue
    raise RuntimeError("Colab MCP returned no parseable JSON response")


async def _colab_call(name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": name, "arguments": arguments or {}},
    }
    headers = {
        "Authorization": f"Bearer {_access_token()}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(660.0, connect=20.0)) as client:
        response = await client.post(COLAB_MCP_URL, headers=headers, json=payload)
        response.raise_for_status()
    result = _parse_sse(response.text)
    if "error" in result:
        raise RuntimeError(json.dumps(result["error"], ensure_ascii=False))
    return result.get("result", result)


def _text_result(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def _runtime_name(value: str) -> str:
    value = value.strip()
    if not re.fullmatch(r"runtimes/[a-z0-9][a-z0-9-]{0,61}[a-z0-9]", value):
        raise ValueError("runtime_name must look like runtimes/<runtime-id>")
    return value


@mcp.tool()
async def colab_list_runtime_specs() -> str:
    """List GPU/TPU/CPU runtime configurations available to the authenticated Colab account."""
    return _text_result(await _colab_call("list_runtime_specs"))


@mcp.tool()
async def colab_list_runtimes() -> str:
    """List existing Colab runtimes. Reuse one before creating another."""
    return _text_result(await _colab_call("list_runtimes"))


@mcp.tool()
async def colab_create_gpu_runtime(accelerator: str = "T4", shape: str = "SHAPE_STANDARD") -> str:
    """Create a Colab GPU runtime. Call only after the user explicitly asks to provision it.

    First inspect colab_list_runtime_specs and use an eligible accelerator/shape.
    """
    allowed_accelerators = {"T4", "L4", "A100"}
    allowed_shapes = {"SHAPE_STANDARD", "SHAPE_HIGHMEM"}
    if accelerator not in allowed_accelerators:
        raise ValueError(f"Unsupported accelerator choice: {accelerator}")
    if shape not in allowed_shapes:
        raise ValueError(f"Unsupported runtime shape: {shape}")
    runtime = {
        "runtimeSpec": {
            "variant": "VARIANT_GPU",
            "accelerator": accelerator,
            "shape": shape,
        }
    }
    return _text_result(await _colab_call("create_runtime", {"runtime": runtime}))


@mcp.tool()
async def colab_execute_python(runtime_name: str, code: str, execution_id: str = "") -> str:
    """Execute Python in a Colab runtime. Keep code focused; output is text only."""
    runtime_name = _runtime_name(runtime_name)
    if not code.strip() or len(code) > MAX_CODE_CHARS:
        raise ValueError(f"code must contain 1..{MAX_CODE_CHARS} characters")
    args: dict[str, Any] = {"runtime": runtime_name, "code": code}
    if execution_id:
        args["executionId"] = execution_id
    return _text_result(await _colab_call("execute_code", args))


@mcp.tool()
async def clause_check_gpu(runtime_name: str) -> str:
    """Inspect the actual Colab runtime GPU, VRAM, CUDA and PyTorch installation."""
    code = r'''
import json, platform, sys
result = {
  "python": sys.version.split()[0],
  "platform": platform.platform(),
  "torch_installed": False,
  "cuda_available": False,
  "gpu_name": None,
  "gpu_count": 0,
  "vram_gib": None,
  "torch_version": None,
  "cuda_version": None
}
try:
    import torch
    result["torch_installed"] = True
    result["torch_version"] = torch.__version__
    result["cuda_version"] = torch.version.cuda
    result["cuda_available"] = torch.cuda.is_available()
    result["gpu_count"] = torch.cuda.device_count()
    if result["cuda_available"]:
        result["gpu_name"] = torch.cuda.get_device_name(0)
        result["vram_gib"] = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2)
except Exception as exc:
    result["torch_error"] = str(exc)
print(json.dumps(result, ensure_ascii=False))
'''
    return await colab_execute_python(runtime_name, code)


@mcp.tool()
async def clause_start_lora_training(
    runtime_name: str,
    train_jsonl: str,
    validation_jsonl: str,
    base_model: str = "Qwen/Qwen3-0.6B-Base",
    max_steps: int = 200,
    output_dir: str = "/content/clause-astra-output",
) -> str:
    """Start the Clause Astra LoRA experiment on files already present in Colab.

    This launches a background process and writes logs to /content/clause-astra-train.log.
    It does not download or upload private datasets. Start with a short smoke run.
    """
    runtime_name = _runtime_name(runtime_name)
    for path in (train_jsonl, validation_jsonl, output_dir):
        if not path.startswith("/content/") or ".." in path.split("/"):
            raise ValueError("All paths must be safe absolute paths under /content/")
    if not 10 <= max_steps <= 2000:
        raise ValueError("max_steps must be between 10 and 2000 for the initial smoke-run tool")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", base_model):
        raise ValueError("base_model must be a Hugging Face model ID")
    script_url = "https://raw.githubusercontent.com/arshinovseva13-ux/CloseApps/main/clause-gpu-cloud/training/train_lora.py"
    code = f'''
import os, sys, subprocess, pathlib
train = {train_jsonl!r}
valid = {validation_jsonl!r}
out = {output_dir!r}
assert pathlib.Path(train).is_file(), f"Missing train file: {{train}}"
assert pathlib.Path(valid).is_file(), f"Missing validation file: {{valid}}"
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "transformers>=4.51.0", "datasets>=3.0.0", "peft>=0.15.0", "accelerate>=1.0.0", "safetensors"], check=True)
script = "/content/train_clause_astra_lora.py"
subprocess.run(["python", "-c", "import urllib.request; urllib.request.urlretrieve({script_url!r}, {script!r})"], check=True)
log = open("/content/clause-astra-train.log", "a")
cmd = [sys.executable, script, "--train", train, "--validation", valid, "--base-model", {base_model!r}, "--max-steps", {str(max_steps)!r}, "--output-dir", out]
proc = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
print("CLAUSE_TRAIN_PID=" + str(proc.pid))
print("CLAUSE_TRAIN_LOG=/content/clause-astra-train.log")
print("CLAUSE_OUTPUT_DIR=" + out)
'''
    return await colab_execute_python(runtime_name, code)


@mcp.tool()
async def clause_training_status(runtime_name: str) -> str:
    """Read the current training log and report whether a training process is active."""
    code = r'''
import os, subprocess, json, pathlib
p = subprocess.run(["bash", "-lc", "pgrep -af 'train_clause_astra_lora.py' | grep -v grep || true"], capture_output=True, text=True)
log = pathlib.Path("/content/clause-astra-train.log")
tail = ""
if log.exists():
    lines = log.read_text(errors="replace").splitlines()
    tail = "\n".join(lines[-50:])
print(json.dumps({"processes": p.stdout.strip(), "log_exists": log.exists(), "log_tail": tail}, ensure_ascii=False))
'''
    return await colab_execute_python(runtime_name, code)


@mcp.tool()
async def clause_list_checkpoints(runtime_name: str, output_dir: str = "/content/clause-astra-output") -> str:
    """List model adapter checkpoints saved in the runtime."""
    if not output_dir.startswith("/content/") or ".." in output_dir.split("/"):
        raise ValueError("output_dir must be a safe path under /content/")
    code = f'''
import pathlib, json
root = pathlib.Path({output_dir!r})
items = []
if root.exists():
    for p in sorted(root.rglob("*")):
        if p.is_file():
            items.append({{"path": str(p), "bytes": p.stat().st_size}})
print(json.dumps(items, ensure_ascii=False))
'''
    return await colab_execute_python(runtime_name, code)


if __name__ == "__main__":
    mcp.run()
