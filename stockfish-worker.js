/* Same-origin worker shim for Stockfish 19 Lite Single.
   The engine glue is fetched from jsDelivr; the WASM binary is fetched
   from the same pinned package URL via Emscripten locateFile. */
self.Module = self.Module || {};
self.Module.locateFile = function (path) {
  return 'https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/' + path;
};
importScripts('https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/stockfish-19-lite-single.js');
