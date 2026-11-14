const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../draughts-engine.js');

function empty() { return Array(50).fill(0); }
function at(r, c) { return E.indexAt(r, c); }

test('initial position has twenty pieces per side and only dark-square indices', () => {
  const b = E.initialBoard();
  assert.equal(b.filter(x => x === 1).length, 20);
  assert.equal(b.filter(x => x === -1).length, 20);
  assert.equal(b.length, 50);
  assert.ok(E.legalMoves(b, 1).length > 0);
});

test('a man can capture backwards in international draughts', () => {
  const b = empty();
  b[at(5, 4)] = 1;
  b[at(4, 3)] = -1;
  const moves = E.legalMoves(b, 1);
  assert.ok(moves.some(m => m.from === at(5, 4) && m.to === at(3, 2) && m.captures.length === 1));
});

test('the longest available capture sequence is mandatory', () => {
  const b = empty();
  b[at(5, 4)] = 1;
  b[at(4, 3)] = -1;
  b[at(2, 1)] = -1;
  b[at(4, 5)] = -1;
  const moves = E.legalMoves(b, 1);
  assert.ok(moves.length > 0);
  assert.ok(moves.every(m => m.captures.length === 2));
});

test('a flying king may land on any empty square beyond the captured piece', () => {
  const b = empty();
  b[at(6, 1)] = 2;
  b[at(4, 3)] = -1;
  const moves = E.legalMoves(b, 1).filter(m => m.from === at(6, 1));
  assert.deepEqual(new Set(moves.map(m => m.to)), new Set([at(3, 4), at(2, 5), at(1, 6), at(0, 7)]));
});

test('applying a capture removes the captured piece and preserves the moving piece', () => {
  const b = empty();
  b[at(5, 4)] = 1;
  b[at(4, 3)] = -1;
  const move = E.legalMoves(b, 1)[0];
  const next = E.applyMove(b, move);
  assert.equal(next[at(4, 3)], 0);
  assert.equal(next[move.to], 1);
  assert.equal(b[at(5, 4)], 1);
});

test('the engine returns a legal move from the starting position', () => {
  const b = E.initialBoard();
  const result = E.searchBestMove(b, 1, { maxDepth: 1, timeMs: 1000 });
  assert.ok(result.move);
  assert.ok(E.legalMoves(b, 1).some(m => m.from === result.move.from && m.to === result.move.to));
});
