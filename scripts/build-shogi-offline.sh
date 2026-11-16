#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:-$(pwd)}"
TMP="${RUNNER_TEMP:-/tmp}/close-shogi-build"
rm -rf "$TMP"
mkdir -p "$TMP"

echo "== Build a genuinely single-threaded YaneuraOu K-P engine =="
git clone --depth 1 --branch wasm https://github.com/mizar/YaneuraOu.wasm.git "$TMP/yaneuraou-wasm"
python3 - "$TMP/yaneuraou-wasm" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])

def replace_once(path, old, new):
    p = root / path
    s = p.read_text(encoding="utf-8-sig")
    if old not in s:
        raise SystemExit(f"Expected source fragment not found: {path}: {old[:90]!r}")
    p.write_text(s.replace(old, new, 1), encoding="utf-8")

# Compile the engine without Emscripten pthreads. Its search thread is run
# synchronously inside a dedicated Web Worker instead.
makefile = root / "source/Makefile"
s = makefile.read_text(encoding="utf-8-sig")
s = s.replace("\t\tCPPFLAGS += -s USE_PTHREADS=1\n", "")
s = s.replace("\t\tLDFLAGS += -s PTHREAD_POOL_SIZE=32\n", "")
s = s.replace("\t\tCPPFLAGS += -march=wasm32\n", "")
s = s.replace("LDFLAGS += -lpthread\n", "")
needle = "\t\tCPPFLAGS += -DUSE_WASM_SIMD -msimd128\n"
if needle not in s:
    raise SystemExit("Could not locate Emscripten SIMD flags in source/Makefile")
s = s.replace(needle, needle + "\t\tCPPFLAGS += -DCLOSE_SHOGI_SINGLE_THREAD\n", 1)
if "USE_PTHREADS=1" in s or "PTHREAD_POOL_SIZE=32" in s:
    raise SystemExit("Emscripten pthread flags remain in Makefile")
makefile.write_text(s, encoding="utf-8")

# A non-pthread build does not need the pthread worker artifact.
builder = root / "script/wasm_build.js"
s = builder.read_text()
s = s.replace('["js", "worker.js", "wasm"]', '["js", "wasm"]')
builder.write_text(s)

# Provide a no-op NativeThread wrapper for the single-threaded WebAssembly build.
replace_once(
    "source/thread_win32_osx.h",
    "#if defined(__APPLE__) || defined(__MINGW32__) || defined(__MINGW64__) || defined(USE_PTHREADS)",
    """#if defined(CLOSE_SHOGI_SINGLE_THREAD)
class NativeThread {
public:
    template<class T>
    explicit NativeThread(void (T::*fn)(), T* obj) { (void)fn; (void)obj; }
    void join() {}
};
#elif defined(__APPLE__) || defined(__MINGW32__) || defined(__MINGW64__) || defined(USE_PTHREADS)"""
)

# No mutex/condition-variable members are needed in the synchronous build.
replace_once(
    "source/thread.h",
    """\t// exitフラグやsearchingフラグの状態を変更するときのmutex
\tstd::mutex mutex;

\t// idle_loop()で待機しているときに待つ対象
\tstd::condition_variable cv;""",
    """#if !defined(CLOSE_SHOGI_SINGLE_THREAD)
\t// exitフラグやsearchingフラグの状態を変更するときのmutex
\tstd::mutex mutex;

\t// idle_loop()で待機しているときに待つ対象
\tstd::condition_variable cv;
#endif"""
)

thread_cpp = root / "source/thread.cpp"
s = thread_cpp.read_text(encoding="utf-8-sig")

ctor_anchor = """Thread::Thread(size_t n) : idx(n) , stdThread(&Thread::idle_loop, this)
{
"""
ctor_new = """Thread::Thread(size_t n) : idx(n) , stdThread(&Thread::idle_loop, this)
{
#if defined(CLOSE_SHOGI_SINGLE_THREAD)
\tsearching = false;
#endif
"""
if ctor_anchor not in s:
    raise SystemExit("Could not locate Thread constructor in build patch")
s = s.replace(ctor_anchor, ctor_new, 1)

old_destructor = """Thread::~Thread()
{
\t// 探索中にスレッドオブジェクトが解体されることはない。
\tASSERT_LV3(!searching);

\t// 探索は終わっているのでexitフラグをセットしてstart_searching()を呼べば終了するはず。
\texit = true;
\tstart_searching();
\tstdThread.join();
}"""
new_destructor = """Thread::~Thread()
{
\tASSERT_LV3(!searching);
#if !defined(CLOSE_SHOGI_SINGLE_THREAD)
\texit = true;
\tstart_searching();
\tstdThread.join();
#endif
}"""
if old_destructor not in s:
    raise SystemExit("Could not patch Thread destructor")
s = s.replace(old_destructor, new_destructor, 1)

# The idle loop is unused: MainThread::search runs synchronously on this worker.
idle_start = s.index("void Thread::idle_loop() {")
idle_end = s.index("\n}\n\n// スレッド数を変更する。", idle_start) + 2
old_idle = s[idle_start:idle_end]
idle_body = old_idle[len("void Thread::idle_loop() {"): -1]
s = s[:idle_start] + "void Thread::idle_loop() {\n#if !defined(CLOSE_SHOGI_SINGLE_THREAD)" + idle_body + "\n#endif\n}" + s[idle_end:]

old_start = """void Thread::start_searching()
{
\tstd::lock_guard<std::mutex> lk(mutex);
\tsearching = true;
\tcv.notify_one(); // idle_loop()で回っているスレッドを起こす。(次の処理をさせる)
}"""
new_start = """void Thread::start_searching()
{
#if defined(CLOSE_SHOGI_SINGLE_THREAD)
\tsearching = true;
\tsearch();
\tsearching = false;
#else
\tstd::lock_guard<std::mutex> lk(mutex);
\tsearching = true;
\tcv.notify_one();
#endif
}"""
if old_start not in s:
    raise SystemExit("Could not patch Thread::start_searching")
s = s.replace(old_start, new_start, 1)

old_wait = """void Thread::wait_for_search_finished()
{
\tstd::unique_lock<std::mutex> lk(mutex);
\tcv.wait(lk, [&] { return !searching; });
}"""
new_wait = """void Thread::wait_for_search_finished()
{
#if !defined(CLOSE_SHOGI_SINGLE_THREAD)
\tstd::unique_lock<std::mutex> lk(mutex);
\tcv.wait(lk, [&] { return !searching; });
#endif
}"""
if old_wait not in s:
    raise SystemExit("Could not patch Thread::wait_for_search_finished")
s = s.replace(old_wait, new_wait, 1)
thread_cpp.write_text(s, encoding="utf-8")

# Hash-table clearing must not spawn std::threads in the single-thread build.
misc = root / "source/misc.cpp"
s = misc.read_text(encoding="utf-8-sig")
needle = "\t\t// マルチスレッドで並列化してクリアする。"
start = s.index(needle)
end_marker = "\n\n\t\tif (name_ != nullptr)\n\t\t\tsync_cout << \"info string \" + std::string(name_) + \" : Finish clearing.\""
end = s.index(end_marker, start)
block = s[start:end]
s = s[:start] + """#if defined(CLOSE_SHOGI_SINGLE_THREAD)
\t\tstd::memset(table, 0, size);
#else
""" + block + """
#endif""" + s[end:]
misc.write_text(s, encoding="utf-8")

# Avoid referencing Emscripten's PThread runtime from the single-threaded module.
pre = root / "source/wasm_pre.js"
s = pre.read_text()
s = s.replace("    PThread.terminateAllThreads();", "    if (typeof PThread !== \"undefined\" && PThread.terminateAllThreads) PThread.terminateAllThreads();")
pre.write_text(s)
PY

docker pull emscripten/emsdk:latest
docker run --rm -v "$TMP/yaneuraou-wasm:/src" -w /src emscripten/emsdk:latest bash -lc "node script/wasm_build.js k-p"

ENGINE_DIR="$TMP/yaneuraou-wasm/npmpackages/yaneuraou.k-p/lib"
test -s "$ENGINE_DIR/yaneuraou.k-p.js"
test -s "$ENGINE_DIR/yaneuraou.k-p.wasm"

echo "== Smoke-test USI protocol in Node.js =="
cd "$TMP/yaneuraou-wasm"
node <<'JS'
const path = require("path");
const create = require("./npmpackages/yaneuraou.k-p/lib/yaneuraou.k-p.js");
const base = path.resolve("./npmpackages/yaneuraou.k-p/lib");
function waitFor(engine, prefix, command, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      engine.removeMessageListener(listener);
      reject(new Error("Timed out waiting for " + prefix));
    }, timeoutMs);
    const listener = line => {
      if (line.startsWith(prefix)) {
        clearTimeout(timer);
        engine.removeMessageListener(listener);
        resolve(line);
      }
    };
    engine.addMessageListener(listener);
    engine.postMessage(command);
  });
}
(async () => {
  const engine = await create({ locateFile: f => path.join(base, f) });
  await waitFor(engine, "usiok", "usi");
  engine.postMessage("setoption name Threads value 1");
  await waitFor(engine, "readyok", "isready");
  engine.postMessage("position startpos");
  const best = await waitFor(engine, "bestmove ", "go movetime 300", 30000);
  if (!/^bestmove [1-9][a-i][1-9][a-i]/.test(best)) throw new Error("Unexpected engine response: " + best);
  engine.terminate();
  console.log("YaneuraOu single-thread smoke test passed:", best);
})().catch(error => { console.error(error); process.exit(1); });
JS

echo "== Prepare the complete local shogi application =="
git clone --depth 1 https://github.com/y4422/shogi-game.git "$TMP/shogi-app"
cd "$TMP/shogi-app"

python3 - <<'PY'
from pathlib import Path

Path("next.config.ts").write_text("""import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/CloseApps/shogi",
  trailingSlash: true,
};

export default nextConfig;
""")

Path("lib/engine.ts").write_text("""export type EngineStatus = "idle" | "loading" | "ready" | "failed";
export type EngineVariant = "kp";

interface WorkerMessage {
  type: "ready" | "error" | "line";
  line?: string;
  error?: string;
}

declare global {
  interface Window {}
}

export interface EngineInfo {
  depth: number;
  nodes: number;
  scoreCp: number | null;
  scoreMate: number | null;
  pv: string[];
}

export interface EngineSearchResult extends EngineInfo {
  bestmove: string;
}

export type ProgressCallback = (phase: "script" | "init", percent: number | null) => void;

export class YaneuraOuEngine {
  readonly variant: EngineVariant;
  status: EngineStatus = "idle";
  onProgress: ProgressCallback | null = null;
  private worker: Worker | null = null;
  private listeners = new Set<(line: string) => void>();
  private initPromise: Promise<boolean> | null = null;
  private searchChain: Promise<unknown> = Promise.resolve();

  constructor(variant: EngineVariant) { this.variant = variant; }
  get displayName(): string { return "YaneuraOu + Suisho Petite (single-thread)"; }

  init(): Promise<boolean> {
    if (!this.initPromise) this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<boolean> {
    if (typeof window === "undefined") { this.status = "failed"; return false; }
    this.status = "loading";
    try {
      this.onProgress?.("script", null);
      const worker = new Worker("/CloseApps/shogi/engine/engine-worker.js");
      this.worker = worker;
      const ready = new Promise<void>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
          const data = event.data;
          if (data.type === "ready") resolve();
          else if (data.type === "error") reject(new Error(data.error || "Engine worker failed"));
          else if (data.type === "line" && typeof data.line === "string") {
            for (const listener of this.listeners) listener(data.line);
          }
        };
        worker.onerror = event => reject(new Error(event.message || "Engine worker error"));
      });
      worker.postMessage({ type: "init" });
      await withTimeout(ready, 30000);
      this.onProgress?.("init", null);
      await withTimeout(this.cmdWait("usi", "usiok"), 15000);
      this.post("setoption name USI_Hash value 64");
      this.post("setoption name Threads value 1");
      this.post("setoption name NetworkDelay value 0");
      this.post("setoption name NetworkDelay2 value 0");
      await withTimeout(this.cmdWait("isready", "readyok"), 60000);
      this.post("usinewgame");
      this.status = "ready";
      return true;
    } catch (error) {
      console.error("YaneuraOu single-thread init failed:", error);
      this.status = "failed";
      this.worker?.terminate();
      this.worker = null;
      return false;
    }
  }

  private post(command: string) {
    this.worker?.postMessage({ type: "command", command });
  }

  private cmdWait(command: string, prefix: string): Promise<string> {
    return new Promise(resolve => {
      const listener = (line: string) => {
        if (line.startsWith(prefix)) {
          this.listeners.delete(listener);
          resolve(line);
        }
      };
      this.listeners.add(listener);
      this.post(command);
    });
  }

  newGame() { if (this.status === "ready") this.post("usinewgame"); }

  search(sfen: string, movetimeMs: number, onInfo?: (info: EngineInfo) => void): Promise<EngineSearchResult> {
    const run = this.searchChain.then(() => this.doSearch(sfen, movetimeMs, onInfo));
    this.searchChain = run.catch(() => {});
    return run;
  }

  private doSearch(sfen: string, movetimeMs: number, onInfo?: (info: EngineInfo) => void): Promise<EngineSearchResult> {
    return new Promise((resolve, reject) => {
      if (this.status !== "ready") return reject(new Error("engine not ready"));
      const info: EngineInfo = { depth: 0, nodes: 0, scoreCp: null, scoreMate: null, pv: [] };
      const listener = (line: string) => {
        if (line.startsWith("info ") && !line.startsWith("info string")) {
          const d = line.match(/\\bdepth (\\d+)/);
          if (d) info.depth = parseInt(d[1], 10);
          const n = line.match(/\\bnodes (\\d+)/);
          if (n) info.nodes = parseInt(n[1], 10);
          const cp = line.match(/\\bscore cp (-?\\d+)/);
          if (cp) { info.scoreCp = parseInt(cp[1], 10); info.scoreMate = null; }
          const mate = line.match(/\\bscore mate (-?\\d+)/);
          if (mate) { info.scoreMate = parseInt(mate[1], 10); info.scoreCp = null; }
          const pv = line.match(/\\bpv (.+)$/);
          if (pv) info.pv = pv[1].trim().split(/\\s+/);
          if (cp || mate || pv) onInfo?.({ ...info, pv: [...info.pv] });
        } else if (line.startsWith("bestmove ")) {
          this.listeners.delete(listener);
          clearTimeout(timer);
          resolve({ ...info, bestmove: line.split(/\\s+/)[1] });
        }
      };
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error("engine search timeout"));
      }, movetimeMs + 30000);
      this.listeners.add(listener);
      this.post("position sfen " + sfen);
      this.post("go movetime " + movetimeMs);
    });
  }

  stop() { if (this.status === "ready") this.post("stop"); }

  terminate() {
    this.worker?.postMessage({ type: "terminate" });
    this.worker?.terminate();
    this.worker = null;
    this.status = "idle";
    this.initPromise = null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); },
                 error => { clearTimeout(timer); reject(error); });
  });
}

const instances = new Map<EngineVariant, YaneuraOuEngine>();
export function getEngine(variant: EngineVariant): YaneuraOuEngine {
  let engine = instances.get(variant);
  if (!engine) { engine = new YaneuraOuEngine(variant); instances.set(variant, engine); }
  return engine;
}
""")

layout = Path("app/layout.tsx")
s = layout.read_text(encoding="utf-8")
s = s.replace('<html lang="ja">', '<html lang="ru">')
s = s.replace('<body>{children}</body>', '''<body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ("serviceWorker" in navigator) {
              window.addEventListener("load", function () {
                navigator.serviceWorker.register("/CloseApps/shogi/sw.js", { scope: "/CloseApps/shogi/" }).catch(function () {});
              });
            }`,
          }}
        />
      </body>''')
layout.write_text(s, encoding="utf-8")

page = Path("app/page.tsx")
s = page.read_text(encoding="utf-8")
s = s.replace('<a href="/licenses">ライセンス・ソースコード</a>', '<a href="/CloseApps/">← В CloseApps</a> · <a href="/CloseApps/shogi/licenses/">Лицензии и исходный код</a>')
page.write_text(s, encoding="utf-8")

licenses = Path("app/licenses/page.tsx")
s = licenses.read_text(encoding="utf-8")
s = s.replace('href="/LICENSE.txt"', 'href="/CloseApps/shogi/engine/LICENSE.txt"')
s = s.replace('href="/engine/README.md"', 'href="/CloseApps/shogi/engine/README.md"')
s = s.replace('href="/">対局画面へ戻る</a>', 'href="/CloseApps/shogi/">Вернуться к игре</a>')
licenses.write_text(s, encoding="utf-8")

Path("public/sw.js").write_text("""const CACHE_NAME = "close-shogi-offline-v2";
const BASE = "/CloseApps/shogi/";
const CORE = [BASE, BASE + "engine/engine-worker.js", BASE + "engine/yaneuraou.k-p.js", BASE + "engine/yaneuraou.k-p.wasm"];
self.addEventListener("install", event => event.waitUntil(
  caches.open(CACHE_NAME).then(async cache => {
    await cache.addAll(CORE);
    const manifest = await fetch(BASE + "offline-assets.json");
    if (!manifest.ok) throw new Error("Offline asset manifest is missing");
    await cache.addAll(await manifest.json());
  }).then(() => self.skipWaiting())
));
self.addEventListener("activate", event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("close-shogi-") && key !== CACHE_NAME).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response.ok && response.type === "basic") caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(BASE));
  }));
});
""")
PY

mkdir -p public/engine
cp "$ENGINE_DIR/yaneuraou.k-p.js" public/engine/
cp "$ENGINE_DIR/yaneuraou.k-p.wasm" public/engine/
rm -f public/engine/yaneuraou.k-p.worker.js
cat > public/engine/engine-worker.js <<'JS'
importScripts("./yaneuraou.k-p.js");

let engine = null;
self.onmessage = async event => {
  const data = event.data || {};
  if (data.type === "init" && !engine) {
    try {
      const factory = self.YaneuraOu_K_P;
      if (!factory) throw new Error("YaneuraOu factory was not loaded");
      engine = await factory({
        locateFile: file => new URL(file, self.location.href).href,
        mainScriptUrlOrBlob: new URL("./yaneuraou.k-p.js", self.location.href).href
      });
      engine.addMessageListener(line => self.postMessage({ type: "line", line }));
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({ type: "error", error: String(error) });
    }
  } else if (data.type === "command" && engine) {
    engine.postMessage(data.command);
  } else if (data.type === "terminate" && engine) {
    engine.terminate();
    engine = null;
    self.close();
  }
};
JS
cp "$TMP/yaneuraou-wasm/npmpackages/yaneuraou.k-p/LICENSE.md" public/engine/LICENSE.txt
cp "$TMP/yaneuraou-wasm/npmpackages/yaneuraou.k-p/README.md" public/engine/README.md
cat > public/engine/THIRD_PARTY_NOTICES.txt <<'EOF'
YaneuraOu WebAssembly K-P, single-threaded adaptation
Evaluation function: Suisho Petite (2021-11), embedded in the engine
Source: https://github.com/mizar/YaneuraOu.wasm
Upstream engine: https://github.com/yaneurao/YaneuraOu
Package lineage: @mizarjp/yaneuraou.k-p 7.6.3-alpha.0
License: GNU General Public License v3.0
This build removes the pthread dependency and runs the single search thread in a dedicated Web Worker.
Original copyright and license notices are retained in LICENSE.txt and README.md.
EOF

echo "== Install dependencies and export static app =="
npm ci
npm run build
python3 - "$TMP/shogi-app/out" <<'PY'
from pathlib import Path
import json, sys
out = Path(sys.argv[1])
base = "/CloseApps/shogi/"
assets = [base, base + "licenses/"]
static = out / "_next" / "static"
if not static.is_dir():
    raise SystemExit("Next static assets directory is missing")
for path in static.rglob("*"):
    if path.is_file():
        assets.append(base + path.relative_to(out).as_posix())
(out / "offline-assets.json").write_text(json.dumps(sorted(set(assets))), encoding="utf-8")
print(f"Prepared {len(assets)} offline app assets")
PY
test -s out/index.html
test -s out/offline-assets.json
test -s out/engine/yaneuraou.k-p.js
test -s out/engine/yaneuraou.k-p.wasm
test -s out/engine/engine-worker.js

rm -rf "$ROOT/shogi"
mkdir -p "$ROOT/shogi"
cp -a out/. "$ROOT/shogi/"
echo "Static offline Shogi app exported to $ROOT/shogi"
