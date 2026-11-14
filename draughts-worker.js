importScripts('./draughts-engine.js');
self.onmessage = function (event) {
  const data = event.data || {};
  try {
    const result = self.CloseDraughtsEngine.searchBestMove(data.board, data.side, data.options || {});
    self.postMessage({ id: data.id, result });
  } catch (error) {
    self.postMessage({ id: data.id, error: error && error.message ? error.message : String(error) });
  }
};
