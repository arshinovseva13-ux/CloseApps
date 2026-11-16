#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:-$(pwd)}"
TMP="${RUNNER_TEMP:-/tmp}/close-shogi-build"
rm -rf "$TMP"
mkdir -p "$TMP"

echo "== Build single-threaded YaneuraOu K-P + Suisho Petite =="
git clone --depth 1 --branch wasm https://github.com/mizar/YaneuraOu.wasm.git "$TMP/yaneuraou-wasm"
python3 - "$TMP/yaneuraou-wasm" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1])
makefile = root / "source/Makefile"
text = makefile.read_text()
text = text.replace("\t\tCPPFLAGS += -s USE_PTHREADS=1\n", "")
text = text.replace("\t\tLDFLAGS += -s PTHREAD_POOL_SIZE=32\n", "")
if "USE_PTHREADS=1" in text or "PTHREAD_POOL_SIZE=32" in text:
    raise SystemExit("Could not remove Emscripten pthread flags")
makefile.write_text(text)
# A non-pthread build has no Emscripten pthread worker artifact.
builder = root / "script/wasm_build.js"
src = builder.read_text()
src = src.replace('["js", "worker.js", "wasm"]', '["js", "wasm"]')
builder.write_text(src)
PY

docker pull emscripten/emsdk:latest
docker run --rm -v "$TMP/yaneuraou-wasm:/src" -w /src emscripten/emsdk:latest bash -lc "node script/wasm_build.js k-p"

ENGINE_DIR="$TMP/yaneuraou-wasm/npmpackages/yaneuraou.k-p/lib"
test -s "$ENGINE_DIR/yaneuraou.k-p.js"
test -s "$ENGINE_DIR/yaneuraou.k-p.wasm"

echo "== Prepare the complete local shogi application =="
git clone --depth 1 https://github.com/y4422/shogi-game.git "$TMP/shogi-app"
cd "$TMP/shogi-app"

python3 - <<'PY'
from pathlib import Path

# GitHub Pages static export under /CloseApps/shogi/.
Path("next.config.ts").write_text("""import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/CloseApps/shogi",
  trailingSlash: true,
};

export default nextConfig;
""")

engine = Path("lib/engine.ts")
s = engine.read_text()
s = s.replace('script: "/engine/yaneuraou.k-p.js",', 'script: "/CloseApps/shogi/engine/yaneuraou.k-p.js",')
s = s.replace('dir: "/engine/",', 'dir: "/CloseApps/shogi/engine/",')
s = s.replace('if (typeof window === "undefined" || typeof SharedArrayBuffer === "undefined") {', 'if (typeof window === "undefined") {')
s = s.replace('const threads = Math.min(8, Math.max(2, (navigator.hardwareConcurrency || 4) - 2));', 'const threads = 1; // Single-threaded build: works without SharedArrayBuffer/COOP/COEP.')
s = s.replace('this.post("setoption name USI_Hash value 128");', 'this.post("setoption name USI_Hash value 64");')
if 'SharedArrayBuffer' in s:
    raise SystemExit("SharedArrayBuffer dependency remains in engine wrapper")
engine.write_text(s)

layout = Path("app/layout.tsx")
s = layout.read_text().replace('<html lang="ja">', '<html lang="ru">')
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
layout.write_text(s)

page = Path("app/page.tsx")
s = page.read_text()
s = s.replace('<a href="/licenses">ライセンス・ソースコード</a>', '<a href="/CloseApps/">← В CloseApps</a> · <a href="/CloseApps/shogi/licenses/">Лицензии и исходный код</a>')
page.write_text(s)

licenses = Path("app/licenses/page.tsx")
s = licenses.read_text()
s = s.replace('href="/LICENSE.txt"', 'href="/CloseApps/shogi/LICENSE.txt"')
s = s.replace('href="/engine/README.md"', 'href="/CloseApps/shogi/engine/README.md"')
s = s.replace('href="/">対局画面へ戻る</a>', 'href="/CloseApps/shogi/">Вернуться к игре</a>')
licenses.write_text(s)

Path("public/sw.js").write_text("""const CACHE_NAME = "close-shogi-offline-v1";
const BASE = "/CloseApps/shogi/";
const CORE = [
  BASE,
  BASE + "engine/yaneuraou.k-p.js",
  BASE + "engine/yaneuraou.k-p.wasm"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("close-shogi-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(BASE));
    })
  );
});
""")
PY

mkdir -p public/engine
cp "$ENGINE_DIR/yaneuraou.k-p.js" public/engine/
cp "$ENGINE_DIR/yaneuraou.k-p.wasm" public/engine/
cp "$TMP/yaneuraou-wasm/npmpackages/yaneuraou.k-p/LICENSE.md" public/engine/LICENSE.txt
cp "$TMP/yaneuraou-wasm/npmpackages/yaneuraou.k-p/README.md" public/engine/README.md
cat > public/engine/THIRD_PARTY_NOTICES.txt <<'EOF'
YaneuraOu WebAssembly K-P, single-threaded build
Evaluation function: Suisho Petite (2021-11), embedded in the engine
Source: https://github.com/mizar/YaneuraOu.wasm
Upstream engine: https://github.com/yaneurao/YaneuraOu
Package lineage: @mizarjp/yaneuraou.k-p 7.6.3-alpha.0
License: GNU General Public License v3.0
The original copyright and license notices are retained in LICENSE.txt and README.md.
EOF

echo "== Install dependencies and export static app =="
npm ci
npm run build
test -s out/index.html
test -s out/engine/yaneuraou.k-p.js
test -s out/engine/yaneuraou.k-p.wasm

rm -rf "$ROOT/shogi"
mkdir -p "$ROOT/shogi"
cp -a out/. "$ROOT/shogi/"
echo "Static Shogi app exported to $ROOT/shogi"
