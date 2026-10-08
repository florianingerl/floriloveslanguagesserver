// End-to-end smoke test against a running server (default http://localhost:8080).
// Run with: npm run test:threeinarow:smoke
import assert from "assert";
import { io, type Socket } from "socket.io-client";
import type { GameState } from "../src/threeInARow/socket";
import * as L from "../src/threeInARow/gameLogic";

const URL = process.env.SMOKE_URL || "http://localhost:8080";
const TIMEOUT = 8000;

function idx(name: string): number {
  return (Number(name[1]) - 1) * 8 + L.FILES.indexOf(name[0]);
}

function connect(name: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(URL, { transports: ["websocket"], timeout: TIMEOUT });
    const timer = setTimeout(() => reject(new Error(`${name}: connect timeout`)), TIMEOUT);
    socket.on("connect", () => { clearTimeout(timer); resolve(socket); });
    socket.on("connect_error", (err) => { clearTimeout(timer); reject(err); });
  });
}

interface AckResult {
  state?: GameState;
  ok?: boolean;
  error?: string;
}

function emitWithAck(socket: Socket, event: string, payload?: unknown): Promise<AckResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ack timeout for ${event}`)), TIMEOUT);
    socket.timeout(TIMEOUT).emit(event, payload, (err: Error | null, res?: AckResult) => {
      clearTimeout(timer);
      if (err) reject(new Error(`no ack for ${event}: ${err.message}`));
      else resolve(res ?? {});
    });
  });
}

function waitForState(socket: Socket, what: string, ok: (s: GameState) => boolean): Promise<GameState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("state", handler);
      reject(new Error(`timeout waiting for state (${what})`));
    }, TIMEOUT);
    const handler = (s: GameState) => {
      if (ok(s)) {
        clearTimeout(timer);
        socket.off("state", handler);
        resolve(s);
      }
    };
    socket.on("state", handler);
  });
}

async function main(): Promise<void> {
  const alice = await connect("Alice");
  const bob = await connect("Bob");

  // --- create / join session ---
  const created = await emitWithAck(alice, "createSession", { name: "Alice" });
  assert.ok(created.state, "createSession should return the state");
  const sessionId = created.state!.sessionId;
  assert.strictEqual(created.state!.players.length, 1);
  assert.strictEqual(created.state!.turn, "w");
  assert.ok(L.placementOk(created.state!.board), "server must generate a valid placement");

  const joined = await emitWithAck(bob, "joinSession", { sessionId, name: "Bob" });
  assert.ok(joined.state, "joinSession should return the state");
  assert.strictEqual(joined.state!.players.length, 2);
  assert.deepStrictEqual(
    joined.state!.players.map((p) => `${p.name}:${p.color}`).sort(),
    ["Alice:w", "Bob:b"],
  );

  const eve = await connect("Eve");
  const full = await emitWithAck(eve, "joinSession", { sessionId, name: "Eve" });
  assert.strictEqual(full.error, "This session already has two players.");

  const ghost = await emitWithAck(eve, "joinSession", { sessionId: "nope", name: "Eve" });
  assert.strictEqual(ghost.error, "This session does not exist (any more).");
  eve.close();

  // --- first move by white (Alice) ---
  // Listeners are always attached BEFORE triggering the action, otherwise
  // the broadcast may arrive before the ack and be missed.
  const whiteLegal = L.legalMovesForColor(created.state!.board, "w");
  assert.ok(whiteLegal.length > 0, "white must have a legal move");
  const mv = whiteLegal[0];
  const bobSeesFirstMove = waitForState(bob, "first move", (s) => s.moves.length === 1);
  const aliceMove = await emitWithAck(alice, "move", mv);
  assert.strictEqual(aliceMove.ok, true, `first move rejected: ${aliceMove.error}`);
  let state = await bobSeesFirstMove;
  assert.strictEqual(state.turn, "b");
  assert.strictEqual(state.moves[0].color, "w");
  assert.deepStrictEqual(state.lastMove, { from: mv.from, to: mv.to, color: "w" });

  // --- rejections ---
  const illegal = await emitWithAck(bob, "move", { from: 0, to: 1 });
  assert.strictEqual(illegal.error, "Illegal move.");

  const outOfTurn = await emitWithAck(alice, "move", mv);
  assert.strictEqual(outOfTurn.error, "It is not your turn.");

  const blackLegal = L.legalMovesForColor(state.board, "b");
  assert.ok(blackLegal.length > 0, "black must have a legal move");
  const aliceSeesTwoMoves = waitForState(alice, "second move", (s) => s.moves.length === 2);
  const bobMove = await emitWithAck(bob, "move", blackLegal[0]);
  assert.strictEqual(bobMove.ok, true, `black move rejected: ${bobMove.error}`);
  state = await aliceSeesTwoMoves;
  assert.strictEqual(state.turn, "w");

  // --- switchColors / newGame ---
  const bobSeesSwitch = waitForState(bob, "switchColors", (s) =>
    s.players.some((p) => p.name === "Alice" && p.color === "b"));
  const switched = await emitWithAck(alice, "switchColors");
  assert.strictEqual(switched.ok, true);
  state = await bobSeesSwitch;
  assert.ok(state.players.some((p) => p.name === "Bob" && p.color === "w"));

  const aliceSeesFresh = waitForState(alice, "newGame", (s) =>
    s.moves.length === 0 && s.turn === "w");
  const fresh = await emitWithAck(bob, "newGame");
  assert.strictEqual(fresh.ok, true);
  state = await aliceSeesFresh;
  assert.strictEqual(state.result, null);
  assert.ok(L.placementOk(state.board), "newGame must generate a valid placement");

  // --- loadPgn with a one-move win ---
  const pgn = [
    '[Event "Smoke win"]',
    '[SetUp "1"]',
    '[FEN "n6r/4b3/8/5R2/8/8/8/3BN3 w - - 0 1"]',
    '[Result "*"]',
    "",
    "*",
  ].join("\n");
  const aliceSeesPgn = waitForState(alice, "loadPgn", (s) =>
    s.pgnHeaders.Event === "Smoke win");
  const loaded = await emitWithAck(bob, "loadPgn", pgn);
  assert.strictEqual(loaded.error, undefined, `loadPgn failed: ${loaded.error}`);
  state = await aliceSeesPgn;
  assert.strictEqual(state.moves.length, 0);
  // Bob is white after switchColors, white to move in the loaded FEN
  assert.strictEqual(state.turn, "w");
  assert.deepStrictEqual(state.board[idx("f5")], { c: "w", t: "R" });
  const aliceSeesWin = waitForState(alice, "winning move", (s) => s.result === "1-0");
  const winMove = await emitWithAck(bob, "move", { from: idx("f5"), to: idx("f1") });
  assert.strictEqual(winMove.ok, true, `winning move rejected: ${winMove.error}`);
  state = await aliceSeesWin;
  assert.strictEqual(state.pgnHeaders.Result, "1-0");
  assert.ok(state.pgn.includes("1-0"), "PGN must contain the result");

  const gameOver = await emitWithAck(bob, "move", { from: idx("d1"), to: idx("e1") });
  assert.strictEqual(gameOver.error, "The game is over.");

  // --- disconnect / rejoin keeps the seat ---
  const offlineSeen = waitForState(alice, "bob offline", (s) =>
    s.players.some((p) => p.name === "Bob" && !p.online));
  bob.close();
  state = await offlineSeen;
  assert.ok(state.players.some((p) => p.name === "Bob" && !p.online));

  const bob2 = await connect("Bob (rejoin)");
  const rejoined = await emitWithAck(bob2, "joinSession", { sessionId, name: "Bob" });
  assert.ok(rejoined.state, `rejoin failed: ${rejoined.error}`);
  assert.ok(rejoined.state!.players.some((p) => p.name === "Bob" && p.online),
    "rejoined player must be online again");

  alice.close();
  bob2.close();
  console.log("Smoke test passed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Smoke test FAILED:", err);
    process.exit(1);
  });
