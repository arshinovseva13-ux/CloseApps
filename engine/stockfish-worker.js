// Same-origin worker wrapper for GitHub Pages. Stockfish's matching WASM is loaded from jsDelivr.
self.Module = {
  locateFile(path) {
    if (path.endsWith(".wasm")) {
      return "https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/stockfish-19-lite-single.wasm";
    }
    return path;
  }
};
importScripts("https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/stockfish-19-lite-single.js");
