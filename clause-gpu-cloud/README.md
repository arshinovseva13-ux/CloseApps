# Clause GPU Cloud

Control plane and MCP bridge for training Clause Astra on real GPU compute.

## Current project facts

- Dataset v1: 42,572 examples; 41,720 train and 852 validation, according to the Clause Astra project report.
- Candidate first base model: \`Qwen/Qwen3-0.6B-Base\`.
- The canonical Clause AI knowledge corpus in \`datasets/clause-ai\` is a separate corpus (22 original Foundations records in the current manifest). Do not confuse it with the 42,572-example Astra training export.
- Existing CPU experiments are proof-of-training only. They are not the final Astra model.
- The first cloud backend is Google's official Colab MCP endpoint: \`https://colaboratory.googleapis.com/mcp\`.

## Components

1. **MCP bridge** — exposes high-level Astra tools and forwards authorized operations to Google's official Colab MCP.
2. **GPU probe** — reports actual accelerator, VRAM, CUDA and PyTorch status from the runtime.
3. **Training engine** — reproducible LoRA adaptation using Transformers, PEFT and the Hugging Face Datasets JSON loader.
4. **Checkpoint discipline** — saves adapter weights, tokenizer, config, metrics and run metadata. It never overwrites the base model.
5. **Static dashboard** — GitHub Pages status and documentation. It does not pretend to be connected until the backend reports a real runtime.

## Official Colab MCP (primary connection; no Render)

Endpoint: https://colaboratory.googleapis.com/mcp

**Preferred architecture:** connect the ChatGPT MCP client directly to Google's official Colab endpoint. No Render service, always-on VM, or separately hosted bridge is required for this path. The repository's `mcp-server/` folder is an optional self-hosted adapter for clients that need Clause-specific tool names; it is not required to use Colab MCP directly.

Google's documented MCP tools include \`list_runtime_specs\`, \`list_runtimes\`, \`create_runtime\`, \`create_session\`, \`execute_code\`, \`get_runtime\`, and session/runtime management. Google requires MCP server enablement and authentication. Read the [official reference](https://developers.google.com/colab/api/reference/mcp).

The MCP bridge uses a Google OAuth access token supplied at runtime through \`GOOGLE_ACCESS_TOKEN\`. Never commit that token. The access token is short-lived; refresh or replace it using the Google OAuth flow configured by the operator. The bridge intentionally does not create a GPU runtime at server startup.

## Optional: run the Clause-specific bridge locally (not required for direct Colab MCP)

Do not deploy this bridge to Render. Direct Colab MCP is the preferred route for the initial Astra experiment.

## Run the bridge locally

Python 3.11+ is recommended.

\`\`\`bash
cd clause-gpu-cloud/mcp-server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export GOOGLE_ACCESS_TOKEN="YOUR_SHORT_LIVED_OAUTH_ACCESS_TOKEN"
python server.py
\`\`\`

The server uses MCP stdio transport by default, suitable for an MCP host that can launch a local process. For remote hosting, deploy behind HTTPS and add a proper user OAuth flow and per-user credential vault before exposing it to ChatGPT. Do not expose a shared static Google token to multiple users.

## Tools exposed

- \`colab_list_runtime_specs\` — discover eligible runtime specs.
- \`colab_list_runtimes\` — reuse an existing runtime.
- \`colab_create_gpu_runtime\` — create a runtime only after an explicit call.
- \`colab_execute_python\` — execute Python on a selected runtime.
- \`clause_check_gpu\` — report GPU model, VRAM, CUDA and PyTorch.
- \`clause_start_lora_training\` — start the checked-in training engine after dataset files are present in the runtime.
- \`clause_training_status\` — inspect a run's log/process state.
- \`clause_list_checkpoints\` — list saved checkpoints.

The training tool expects the train and validation JSONL files to exist on the Colab runtime. Dataset transfer is deliberately a separate step: do not assume a private Deepnote archive or an unpublished dataset is publicly downloadable.

## Training

The first run is a small LoRA experiment, not training a foundation model from scratch. The default target is Qwen3-0.6B-Base. The engine expects JSONL records containing at least one of \`text\`, \`body\`, \`content\`, \`summary\`, or \`title\`; it converts knowledge records into causal-language-model text. The validation file is required. It logs tokenized sample counts and saves adapter checkpoints.

Start with a short smoke run (100–300 steps) and verify GPU memory, loss, checkpoint integrity and sample generations before a longer run. Do not claim model quality from training loss alone.

## Costs and safety

- A GPU runtime may be limited by account tier, quotas and availability.
- No paid GPU provider is configured by default.
- No resource is provisioned until an explicit tool call.
- Runtime deletion is destructive and is not exposed as a convenience action.
- Keep OAuth tokens, private dataset URLs and checkpoint access credentials out of Git.
