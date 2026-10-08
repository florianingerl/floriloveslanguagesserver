// Game logic for "Three-in-a-row".
//
// Rules:
//  - 8x8 chess board, each colour owns exactly one knight, one bishop, one rook.
//  - Pieces move like in ordinary chess, but capturing is never allowed
//    (a piece may neither land on nor jump over any occupied square).
//  - Players move in turn. A player wins as soon as his knight, bishop and rook
//    stand directly next to each other in one row or in one column
//    (three consecutive squares, order does not matter).
//
// The board is an array of 64 entries. Index = rank * 8 + file,
// file 0 = "a", rank 0 = "1". Every entry is null or { c: 'w'|'b', t: 'N'|'B'|'R' }.

export type Color = "w" | "b";
export type PieceType = "N" | "B" | "R";

export interface Piece {
  c: Color;
  t: PieceType;
}

export type Board = (Piece | null)[];

export interface Move {
  from: number;
  to: number;
}

export interface SanMove extends Move {
  san: string;
  color: Color;
}

export const FILES = "abcdefgh";

export function fileOf(idx: number): number {
  return idx % 8;
}

export function rankOf(idx: number): number {
  return Math.floor(idx / 8);
}

export function squareName(idx: number): string {
  return FILES[fileOf(idx)] + (rankOf(idx) + 1);
}

function isOnBoard(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

export function cloneBoard(board: Board): Board {
  return board.map((p) => (p ? { c: p.c, t: p.t } : null));
}

const KNIGHT_DELTAS: ReadonlyArray<[number, number]> = [
  [1, 2], [2, 1], [2, -1], [1, -2],
  [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const ROOK_DIRS: ReadonlyArray<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS: ReadonlyArray<[number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

// All legal target squares for the piece standing on `idx`.
// Not allowed to capture, not allowed to jump over any piece.
export function pieceMoves(board: Board, idx: number): number[] {
  const piece = board[idx];
  if (!piece) return [];
  const file = fileOf(idx);
  const rank = rankOf(idx);
  const moves: number[] = [];

  if (piece.t === "N") {
    for (const [df, dr] of KNIGHT_DELTAS) {
      const f = file + df;
      const r = rank + dr;
      if (isOnBoard(f, r) && !board[r * 8 + f]) moves.push(r * 8 + f);
    }
  } else {
    const dirs = piece.t === "R" ? ROOK_DIRS : BISHOP_DIRS;
    for (const [df, dr] of dirs) {
      let f = file + df;
      let r = rank + dr;
      while (isOnBoard(f, r)) {
        const idx2 = r * 8 + f;
        if (board[idx2]) break; // blocked - capturing is not allowed
        moves.push(idx2);
        f += df;
        r += dr;
      }
    }
  }
  return moves;
}

export function applyMove(board: Board, from: number, to: number): Board {
  const next = cloneBoard(board);
  next[to] = next[from];
  next[from] = null;
  return next;
}

export function piecesOf(board: Board, color: Color): number[] {
  const res: number[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.c === color) res.push(i);
  }
  return res;
}

// All three pieces on three consecutive squares of one row or one column?
export function isWin(board: Board, color: Color): boolean {
  const idxs = piecesOf(board, color);
  if (idxs.length !== 3) return false;
  const byRow: Record<string, number[]> = {};
  const byCol: Record<string, number[]> = {};
  for (const i of idxs) {
    (byRow[rankOf(i)] = byRow[rankOf(i)] || []).push(fileOf(i));
    (byCol[fileOf(i)] = byCol[fileOf(i)] || []).push(rankOf(i));
  }
  for (const key of Object.keys(byRow)) {
    const files = byRow[key].sort((a, b) => a - b);
    if (files[1] === files[0] + 1 && files[2] === files[1] + 1) return true;
  }
  for (const key of Object.keys(byCol)) {
    const ranks = byCol[key].sort((a, b) => a - b);
    if (ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1) return true;
  }
  return false;
}

// Could this colour win with its very next move?
// That needs two of its pieces already sitting in one three-in-a-row
// square set while the third one is able to step onto the remaining square.
export function canWinInOne(board: Board, color: Color): boolean {
  const idxs = piecesOf(board, color);
  if (idxs.length !== 3) return false;
  for (let a = 0; a < 3; a++) {
    for (let b = a + 1; b < 3; b++) {
      const p1 = idxs[a];
      const p2 = idxs[b];
      const third = idxs[3 - a - b];
      const triples: number[] = [];
      if (rankOf(p1) === rankOf(p2)) {
        const f1 = fileOf(p1);
        const f2 = fileOf(p2);
        if (Math.abs(f1 - f2) <= 2) {
          const lo = Math.min(f1, f2);
          for (let start = Math.max(0, lo - 2); start <= Math.min(5, lo); start++) {
            if (f1 >= start && f1 <= start + 2 && f2 >= start && f2 <= start + 2) {
              for (let s = start; s <= start + 2; s++) {
                const sq = rankOf(p1) * 8 + s;
                if (sq !== p1 && sq !== p2) triples.push(sq);
              }
            }
          }
        }
      }
      if (fileOf(p1) === fileOf(p2)) {
        const r1 = rankOf(p1);
        const r2 = rankOf(p2);
        if (Math.abs(r1 - r2) <= 2) {
          const lo = Math.min(r1, r2);
          for (let start = Math.max(0, lo - 2); start <= Math.min(5, lo); start++) {
            if (r1 >= start && r1 <= start + 2 && r2 >= start && r2 <= start + 2) {
              for (let s = start; s <= start + 2; s++) {
                const sq = s * 8 + fileOf(p1);
                if (sq !== p1 && sq !== p2) triples.push(sq);
              }
            }
          }
        }
      }
      for (const target of triples) {
        if (!board[target] && pieceMoves(board, third).includes(target)) return true;
      }
    }
  }
  return false;
}

export function legalMovesForColor(board: Board, color: Color): Move[] {
  const res: Move[] = [];
  for (const from of piecesOf(board, color)) {
    for (const to of pieceMoves(board, from)) res.push({ from, to });
  }
  return res;
}

// Short algebraic notation, e.g. "Nb5". Disambiguation like in chess.
export function moveToSan(board: Board, from: number, to: number): string {
  const piece = board[from];
  if (!piece) return "";
  let san = piece.t;
  const rivals: number[] = [];
  for (let i = 0; i < 64; i++) {
    const other = board[i];
    if (i !== from && other && other.c === piece.c && other.t === piece.t &&
        pieceMoves(board, i).includes(to)) {
      rivals.push(i);
    }
  }
  if (rivals.length > 0) {
    const sameFile = rivals.some((r) => fileOf(r) === fileOf(from));
    const sameRank = rivals.some((r) => rankOf(r) === rankOf(from));
    if (!sameFile) san += FILES[fileOf(from)];
    else if (!sameRank) san += String(rankOf(from) + 1);
    else san += squareName(from);
  }
  san += squareName(to);
  return san;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function placementOk(board: Board): boolean {
  const white = piecesOf(board, "w");
  const black = piecesOf(board, "b");
  if (white.length !== 3 || black.length !== 3) return false;
  // white and black far away from each other
  for (const w of white) {
    for (const b of black) {
      const dist = Math.abs(fileOf(w) - fileOf(b)) + Math.abs(rankOf(w) - rankOf(b));
      if (dist < 4) return false;
    }
  }
  // nobody may win immediately
  if (isWin(board, "w") || isWin(board, "b")) return false;
  if (canWinInOne(board, "w") || canWinInOne(board, "b")) return false;
  return true;
}

// Random starting position: three pieces per colour, far apart,
// so that neither player can win immediately.
export function generateInitialPlacement(): Board {
  const types: PieceType[] = ["N", "B", "R"];
  for (let attempt = 0; attempt < 200000; attempt++) {
    const squares = shuffle([...Array(64).keys()]);
    const board: Board = new Array(64).fill(null);
    const whiteTypes = shuffle([...types]);
    const blackTypes = shuffle([...types]);
    for (let i = 0; i < 3; i++) board[squares[i]] = { c: "w", t: whiteTypes[i] };
    for (let i = 0; i < 3; i++) board[squares[3 + i]] = { c: "b", t: blackTypes[i] };
    if (placementOk(board)) return board;
  }
  // Deterministic safe fallback (also passes placementOk).
  const board: Board = new Array(64).fill(null);
  board[0] = { c: "w", t: "N" };   // a1
  board[19] = { c: "w", t: "B" };  // d3
  board[38] = { c: "w", t: "R" };  // h5
  board[57] = { c: "b", t: "R" };  // b8
  board[44] = { c: "b", t: "B" };  // e6
  board[62] = { c: "b", t: "N" };  // g8
  if (placementOk(board)) return board;
  throw new Error("Could not generate a valid initial placement");
}

export function boardToFen(board: Board, turn: Color, fullmove: number): string {
  const ranks: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = "";
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const p = board[rank * 8 + file];
      if (!p) {
        empty++;
      } else {
        if (empty) { row += empty; empty = 0; }
        row += p.c === "w" ? p.t : p.t.toLowerCase();
      }
    }
    if (empty) row += empty;
    ranks.push(row);
  }
  return `${ranks.join("/")} ${turn} - - 0 ${fullmove}`;
}

export function fenToBoard(fen: string): { board: Board; turn: Color } {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 2) throw new Error("Invalid FEN");
  const board: Board = new Array(64).fill(null);
  const rows = parts[0].split("/");
  if (rows.length !== 8) throw new Error("Invalid FEN ranks");
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of rows[r]) {
      if (ch >= "1" && ch <= "8") {
        file += Number(ch);
      } else {
        const t = ch.toUpperCase();
        if (t !== "N" && t !== "B" && t !== "R") throw new Error("Unsupported piece in FEN: " + ch);
        if (file > 7) throw new Error("Invalid FEN");
        board[(7 - r) * 8 + file] = { c: ch === ch.toUpperCase() ? "w" : "b", t: t as PieceType };
        file++;
      }
    }
    if (file !== 8) throw new Error("Invalid FEN rank width");
  }
  const turn: Color = parts[1] === "b" ? "b" : "w";
  return { board, turn };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayPgnDate(d: Date = new Date()): string {
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

export interface PgnGame {
  moves: SanMove[];
  result: string | null;
  pgnHeaders: Record<string, string>;
}

export function buildPgn(game: PgnGame): string {
  const headers = game.pgnHeaders;
  let pgn = "";
  for (const key of ["Event", "Site", "Date", "Round", "White", "Black", "Result", "SetUp", "FEN"]) {
    pgn += `[${key} "${headers[key] || ""}"]\n`;
  }
  pgn += "\n";
  const moves = game.moves;
  let line = "";
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) {
      if (i > 0) line += " ";
      line += `${Math.floor(i / 2) + 1}.`;
    }
    line += " " + moves[i].san;
  }
  const result = game.result || "*";
  line = line.trim();
  if (line) line += " ";
  line += result + "\n";
  return pgn + line;
}

export interface ParsedPgn {
  headers: Record<string, string>;
  initialFen: string;
  moves: string[];
  result: string | null;
}

// Parse a PGN game: headers, FEN and the list of short algebraic moves.
export function parsePgn(pgn: string): ParsedPgn {
  const headers: Record<string, string> = {};
  const headerRe = /\[(\w+)\s+"([^"]*)"\]/g;
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(pgn)) !== null) headers[m[1]] = m[2];
  let body = pgn.replace(headerRe, "");
  body = body.replace(/\{[^}]*\}/g, " ");     // comments
  body = body.replace(/;[^\n]*/g, " ");        // rest of line comments
  body = body.replace(/\$\d+/g, " ");          // NAGs
  body = body.replace(/\([^()]*\)/g, " ");     // simple variations
  body = body.replace(/\d+\.(\.\.)?/g, " ");   // move numbers
  const tokens = body.split(/\s+/).filter(Boolean);
  const moves: string[] = [];
  let result: string | null = null;
  for (const tok of tokens) {
    if (tok === "1-0" || tok === "0-1" || tok === "1/2-1/2" || tok === "*") { result = tok; continue; }
    moves.push(tok.replace(/[+#]/g, ""));
  }
  const initialFen = headers.FEN && headers.SetUp === "1"
    ? headers.FEN
    : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  if (!result) result = headers.Result && headers.Result !== "*" ? headers.Result : null;
  return { headers, initialFen, moves, result };
}

// Replay a list of SAN moves on a board; returns the final position.
export function replaySan(
  startBoard: Board,
  startTurn: Color,
  sans: string[]
): { board: Board; turn: Color; moves: SanMove[] } {
  let board = startBoard;
  let turn = startTurn;
  const moves: SanMove[] = [];
  for (const san of sans) {
    const legal = legalMovesForColor(board, turn);
    let found: Move | null = null;
    for (const mv of legal) {
      if (moveToSan(board, mv.from, mv.to) === san) { found = mv; break; }
    }
    if (!found) throw new Error(`Illegal or unknown move in PGN: ${san}`);
    moves.push({ san, color: turn, from: found.from, to: found.to });
    board = applyMove(board, found.from, found.to);
    turn = turn === "w" ? "b" : "w";
  }
  return { board, turn, moves };
}
