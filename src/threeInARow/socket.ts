// Socket.io backend for the game "Three-in-a-row".
// One player creates a session and sends the link to the other player,
// both move in turn, the server validates every move and broadcasts the
// new state (board, move list, PGN) to both players.

import type { Server, Socket } from "socket.io";
import crypto from "crypto";
import * as logic from "./gameLogic";
import type { Board, Color, SanMove } from "./gameLogic";

export interface PlayerSeat {
  socketId: string | null;
  name: string;
  color: Color;
  online: boolean;
}

export interface GameState {
  sessionId: string;
  players: { name: string; color: Color; online: boolean }[];
  board: Board;
  turn: Color;
  moves: SanMove[];
  lastMove: { from: number; to: number; color: Color } | null;
  result: string | null;
  initialFen: string;
  pgnHeaders: Record<string, string>;
  pgn: string;
}

interface Session {
  id: string;
  players: PlayerSeat[];
  board: Board;
  turn: Color;
  moves: SanMove[];
  lastMove: { from: number; to: number; color: Color } | null;
  result: string | null;
  initialFen: string;
  createdAt: Date;
  pgnHeaders: Record<string, string>;
}

type Ack = (res: { state?: GameState; ok?: boolean; error?: string }) => void;

const sessions = new Map<string, Session>();

function newSessionId(): string {
  let id: string;
  do {
    id = crypto.randomBytes(5).toString("hex");
  } while (sessions.has(id));
  return id;
}

function createSession(name: string): Session {
  const board = logic.generateInitialPlacement();
  const now = new Date();
  const session: Session = {
    id: newSessionId(),
    players: [{ socketId: null, name, color: "w", online: false }],
    board,
    turn: "w",
    moves: [],
    lastMove: null,
    result: null,
    initialFen: logic.boardToFen(board, "w", 1),
    createdAt: now,
    pgnHeaders: {},
  };
  session.pgnHeaders = {
    Event: "Three-in-a-row",
    Site: "florianingerl.github.io",
    Date: logic.todayPgnDate(now),
    Round: "1",
    White: name,
    Black: "",
    Result: "*",
    SetUp: "1",
    FEN: session.initialFen,
  };
  sessions.set(session.id, session);
  return session;
}

function otherColor(color: Color): Color {
  return color === "w" ? "b" : "w";
}

function stateOf(session: Session): GameState {
  return {
    sessionId: session.id,
    players: session.players.map((p) => ({ name: p.name, color: p.color, online: p.online })),
    board: session.board,
    turn: session.turn,
    moves: session.moves,
    lastMove: session.lastMove,
    result: session.result,
    initialFen: session.initialFen,
    pgnHeaders: session.pgnHeaders,
    pgn: logic.buildPgn(session),
  };
}

function syncPlayerNames(session: Session): void {
  const byColor: Partial<Record<Color, string>> = {};
  for (const p of session.players) byColor[p.color] = p.name;
  session.pgnHeaders.White = byColor.w || "";
  session.pgnHeaders.Black = byColor.b || "";
}

function leaveSession(socket: Socket): void {
  const sessionId = socket.data.sessionId as string | undefined;
  if (!sessionId) return;
  const session = sessions.get(sessionId);
  socket.data.sessionId = null;
  void socket.leave(sessionId);
  if (!session) return;
  const player = session.players.find((p) => p.socketId === socket.id);
  if (player) {
    player.socketId = null; // keep the seat so he can rejoin
    player.online = false;
    broadcastState(session);
  }
}

function broadcastState(session: Session): void {
  if (io) io.to(session.id).emit("state", stateOf(session));
}

// The io instance is set in attachThreeInARow, so broadcastState works
// from every handler without threading it through all function signatures.
let io: Server | null = null;

export function attachThreeInARow(socketServer: Server): void {
  io = socketServer;

  io.on("connection", (socket) => {
    socket.on("createSession", (payload: { name?: string }, ack?: Ack) => {
      try {
        const name = String(payload?.name ?? "").trim().slice(0, 40);
        if (!name) return ack?.({ error: "Please enter your name." });
        if (socket.data.sessionId) leaveSession(socket);
        const session = createSession(name);
        const seat = session.players.find((p) => p.color === "w");
        if (seat) {
          seat.socketId = socket.id;
          seat.online = true;
        }
        socket.data.sessionId = session.id;
        void socket.join(session.id);
        ack?.({ state: stateOf(session) });
      } catch (err) {
        console.error(err);
        ack?.({ error: "Could not create the session." });
      }
    });

    socket.on("joinSession", (payload: { sessionId?: string; name?: string }, ack?: Ack) => {
      try {
        const name = String(payload?.name ?? "").trim().slice(0, 40);
        if (!name) return ack?.({ error: "Please enter your name." });
        const session = sessions.get(String(payload?.sessionId ?? ""));
        if (!session) return ack?.({ error: "This session does not exist (any more)." });
        if (socket.data.sessionId) leaveSession(socket);
        const known = session.players.find((p) => p.name === name);
        if (known) {
          // A disconnected player may take his old seat again.
          if (known.socketId !== null) {
            return ack?.({ error: "This name is already taken in this session." });
          }
          known.socketId = socket.id;
          known.online = true;
        } else {
          if (session.players.length >= 2) {
            return ack?.({ error: "This session already has two players." });
          }
          const taken = new Set(session.players.map((p) => p.color));
          const color: Color = taken.has("w") ? "b" : "w";
          session.players.push({ socketId: socket.id, name, color, online: true });
        }
        socket.data.sessionId = session.id;
        void socket.join(session.id);
        syncPlayerNames(session);
        ack?.({ state: stateOf(session) });
        broadcastState(session);
      } catch (err) {
        console.error(err);
        ack?.({ error: "Could not join the session." });
      }
    });

    socket.on("move", (payload: { from?: number; to?: number }, ack?: Ack) => {
      const session = sessions.get(socket.data.sessionId as string);
      if (!session) return ack?.({ error: "No session." });
      const player = session.players.find((p) => p.socketId === socket.id);
      if (!player) return ack?.({ error: "You are not a player of this session." });
      if (session.result) return ack?.({ error: "The game is over." });
      if (session.turn !== player.color) return ack?.({ error: "It is not your turn." });

      const from = Number(payload?.from);
      const to = Number(payload?.to);
      const piece = session.board[from];
      const legal = Number.isInteger(from) && Number.isInteger(to) &&
        piece !== null && piece !== undefined && piece.c === player.color &&
        logic.pieceMoves(session.board, from).includes(to);
      if (!legal) return ack?.({ error: "Illegal move." });

      const san = logic.moveToSan(session.board, from, to);
      session.board = logic.applyMove(session.board, from, to);
      session.moves.push({ san, color: player.color, from, to });
      session.lastMove = { from, to, color: player.color };
      session.turn = otherColor(session.turn);

      if (logic.isWin(session.board, player.color)) {
        session.result = player.color === "w" ? "1-0" : "0-1";
      }
      session.pgnHeaders.Result = session.result || "*";
      ack?.({ ok: true });
      broadcastState(session);
    });

    socket.on("newGame", (_payload: unknown, ack?: Ack) => {
      const session = sessions.get(socket.data.sessionId as string);
      if (!session) return ack?.({ error: "No session." });
      if (!session.players.some((p) => p.socketId === socket.id)) {
        return ack?.({ error: "You are not a player of this session." });
      }
      session.board = logic.generateInitialPlacement();
      session.turn = "w";
      session.moves = [];
      session.lastMove = null;
      session.result = null;
      session.initialFen = logic.boardToFen(session.board, "w", 1);
      session.pgnHeaders.FEN = session.initialFen;
      session.pgnHeaders.Result = "*";
      session.pgnHeaders.Date = logic.todayPgnDate();
      ack?.({ ok: true });
      broadcastState(session);
    });

    socket.on("switchColors", (_payload: unknown, ack?: Ack) => {
      const session = sessions.get(socket.data.sessionId as string);
      if (!session) return ack?.({ error: "No session." });
      if (!session.players.some((p) => p.socketId === socket.id)) {
        return ack?.({ error: "You are not a player of this session." });
      }
      for (const p of session.players) p.color = otherColor(p.color);
      syncPlayerNames(session);
      ack?.({ ok: true });
      broadcastState(session);
    });

    socket.on("loadPgn", (pgn: string, ack?: Ack) => {
      const session = sessions.get(socket.data.sessionId as string);
      if (!session) return ack?.({ error: "No session." });
      if (!session.players.some((p) => p.socketId === socket.id)) {
        return ack?.({ error: "You are not a player of this session." });
      }
      try {
        const parsed = logic.parsePgn(String(pgn ?? ""));
        const start = logic.fenToBoard(parsed.initialFen);
        const replayed = logic.replaySan(start.board, start.turn, parsed.moves);
        session.board = replayed.board;
        session.turn = replayed.turn;
        session.moves = replayed.moves;
        session.result = parsed.result && parsed.result !== "*" ? parsed.result : null;
        session.initialFen = parsed.initialFen;
        const last = replayed.moves[replayed.moves.length - 1];
        session.lastMove = last ? { from: last.from, to: last.to, color: last.color } : null;
        syncPlayerNames(session);
        session.pgnHeaders = {
          Event: parsed.headers.Event || "Three-in-a-row",
          Site: parsed.headers.Site || "florianingerl.github.io",
          Date: parsed.headers.Date || logic.todayPgnDate(),
          Round: parsed.headers.Round || "1",
          White: parsed.headers.White || session.pgnHeaders.White || "",
          Black: parsed.headers.Black || session.pgnHeaders.Black || "",
          Result: parsed.result || "*",
          SetUp: "1",
          FEN: parsed.initialFen,
        };
        ack?.({ ok: true });
        broadcastState(session);
      } catch (err) {
        ack?.({ error: (err as Error).message });
      }
    });

    socket.on("disconnect", () => {
      leaveSession(socket);
    });
  });

  // Sessions live one day, then they are cleaned up.
  const cleaner = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      const busy = session.players.some((p) => p.socketId !== null);
      if (!busy && now - session.createdAt.getTime() > 24 * 60 * 60 * 1000) {
        sessions.delete(id);
      }
    }
  }, 60 * 60 * 1000);
  cleaner.unref();
}
