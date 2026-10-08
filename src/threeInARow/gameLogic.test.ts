// Sanity tests for the game logic. Run with: npm run test:threeinarow
import assert from "assert";
import * as L from "./gameLogic";
import type { Board } from "./gameLogic";

function idx(name: string): number {
  return (Number(name[1]) - 1) * 8 + L.FILES.indexOf(name[0]);
}

function emptyBoard(): Board {
  return new Array(64).fill(null);
}

// --- piece movement -------------------------------------------------------
{
  const board = emptyBoard();
  board[idx("d4")] = { c: "w", t: "N" };
  const moves = L.pieceMoves(board, idx("d4")).map(L.squareName).sort();
  assert.deepStrictEqual(moves, ["b3", "b5", "c2", "c6", "e2", "e6", "f3", "f5"]);
}
{
  // rook blocked by own and enemy pieces, cannot capture
  const board = emptyBoard();
  board[idx("d4")] = { c: "w", t: "R" };
  board[idx("d6")] = { c: "w", t: "B" };
  board[idx("f4")] = { c: "b", t: "N" };
  const moves = L.pieceMoves(board, idx("d4")).map(L.squareName).sort();
  // f4 (enemy knight) blocks the rook - no capturing, no jumping
  assert.deepStrictEqual(moves, ["a4", "b4", "c4", "d1", "d2", "d3", "d5", "e4"]);
}
{
  // bishop on c1, enemy rook on e3 blocks the diagonal
  const board = emptyBoard();
  board[idx("c1")] = { c: "w", t: "B" };
  board[idx("e3")] = { c: "b", t: "R" };
  const moves = L.pieceMoves(board, idx("c1")).map(L.squareName).sort();
  assert.deepStrictEqual(moves, ["a3", "b2", "d2"]);
}

// --- win detection --------------------------------------------------------
{
  const board = emptyBoard();
  board[idx("a1")] = { c: "w", t: "N" };
  board[idx("b1")] = { c: "w", t: "B" };
  board[idx("c1")] = { c: "w", t: "R" };
  assert.ok(L.isWin(board, "w"));
  assert.ok(!L.isWin(board, "b"));
}
{
  // same three pieces but NOT next to each other
  const board = emptyBoard();
  board[idx("a1")] = { c: "w", t: "N" };
  board[idx("c1")] = { c: "w", t: "B" };
  board[idx("e1")] = { c: "w", t: "R" };
  assert.ok(!L.isWin(board, "w"));
}
{
  // column win, order does not matter
  const board = emptyBoard();
  board[idx("h2")] = { c: "b", t: "N" };
  board[idx("h4")] = { c: "b", t: "B" };
  board[idx("h3")] = { c: "b", t: "R" };
  assert.ok(L.isWin(board, "b"));
}

// --- win in one move ------------------------------------------------------
{
  // triple d1-e1-f1 would need the knight on e1 - knight cannot reach it
  const board = emptyBoard();
  board[idx("a1")] = { c: "w", t: "N" };
  board[idx("d1")] = { c: "w", t: "B" };
  board[idx("f1")] = { c: "w", t: "R" };
  assert.ok(!L.canWinInOne(board, "w"));
}
{
  const board = emptyBoard();
  board[idx("f2")] = { c: "w", t: "R" };
  board[idx("h2")] = { c: "w", t: "B" };
  board[idx("g4")] = { c: "w", t: "N" };
  // triple f2-g2-h2, knight g4 cannot reach g2
  assert.ok(!L.canWinInOne(board, "w"));
}
{
  // guaranteed win in one: rook a1, rook c1, knight a3.
  // triple a1-b1-c1, knight a3 -> b1 is empty and a3-b1 is a knight move.
  const board = emptyBoard();
  board[idx("a1")] = { c: "w", t: "R" };
  board[idx("c1")] = { c: "w", t: "R" };
  board[idx("a3")] = { c: "w", t: "N" };
  assert.ok(L.canWinInOne(board, "w"));
}
{
  // ... but only if the third piece can really go there (blocked path)
  const board = emptyBoard();
  board[idx("a1")] = { c: "w", t: "B" };
  board[idx("c1")] = { c: "w", t: "B" };
  board[idx("g5")] = { c: "w", t: "N" };
  // triple a1-b1-c1, only the knight could move to b1 - it cannot
  assert.ok(!L.canWinInOne(board, "w"));
}

// --- notation -------------------------------------------------------------
{
  const board = emptyBoard();
  board[idx("b1")] = { c: "w", t: "N" };
  board[idx("f3")] = { c: "w", t: "N" };
  // both knights can reach d2 -> disambiguation by file
  assert.strictEqual(L.moveToSan(board, idx("b1"), idx("d2")), "Nbd2");
  assert.strictEqual(L.moveToSan(board, idx("f3"), idx("d2")), "Nfd2");
}
{
  const board = emptyBoard();
  board[idx("b1")] = { c: "w", t: "N" };
  board[idx("b3")] = { c: "w", t: "N" };
  // both can reach d2 -> disambiguation by rank
  assert.strictEqual(L.moveToSan(board, idx("b1"), idx("d2")), "N1d2");
  assert.strictEqual(L.moveToSan(board, idx("b3"), idx("d2")), "N3d2");
}
{
  const board = emptyBoard();
  board[idx("a1")] = { c: "w", t: "R" };
  assert.strictEqual(L.moveToSan(board, idx("a1"), idx("a5")), "Ra5");
}

// --- initial placement ----------------------------------------------------
{
  for (let i = 0; i < 200; i++) {
    const board = L.generateInitialPlacement();
    assert.ok(L.placementOk(board), "generated placement violates the rules");
  }
}

// --- FEN ------------------------------------------------------------------
{
  const board = L.generateInitialPlacement();
  const fen = L.boardToFen(board, "w", 1);
  const back = L.fenToBoard(fen);
  assert.deepStrictEqual(back.board, board);
  assert.strictEqual(back.turn, "w");
}

// --- PGN round trip -------------------------------------------------------
{
  const startBoard = L.generateInitialPlacement();
  let board = L.cloneBoard(startBoard);
  let turn: "w" | "b" = "w";
  const moves: L.SanMove[] = [];
  for (let i = 0; i < 10; i++) {
    const legal = L.legalMovesForColor(board, turn);
    if (!legal.length) break;
    const mv = legal[Math.floor(Math.random() * legal.length)];
    const san = L.moveToSan(board, mv.from, mv.to);
    moves.push({ san, color: turn, from: mv.from, to: mv.to });
    board = L.applyMove(board, mv.from, mv.to);
    turn = turn === "w" ? "b" : "w";
  }
  const initialFen = L.boardToFen(startBoard, "w", 1);
  const pgn = L.buildPgn({
    moves,
    result: null,
    pgnHeaders: {
      Event: "Three-in-a-row", Site: "test", Date: "2026.01.01", Round: "1",
      White: "Alice", Black: "Bob", Result: "*", SetUp: "1", FEN: initialFen,
    },
  });
  const parsed = L.parsePgn(pgn);
  assert.strictEqual(parsed.moves.length, moves.length);
  assert.deepStrictEqual(parsed.moves, moves.map((m) => m.san));
  assert.strictEqual(parsed.initialFen, initialFen);
  // replaying the parsed pgn reproduces the final position
  const start = L.fenToBoard(parsed.initialFen);
  const replayed = L.replaySan(start.board, start.turn, parsed.moves);
  assert.deepStrictEqual(replayed.board, board);
}

console.log("All game logic tests passed.");
