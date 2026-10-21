// Socket.io backend for the interactive whiteboard.
//
// One person creates a board ("whiteboard:create"). Everybody else joins with
// the invitation link ("whiteboard:join"). The objects of a board live on the
// server, so a participant receives the same board as everybody else.
//
// The clients do not send the whole board, but only the change ("whiteboard:
// update" with the changed and the deleted objects). That way two people can
// work at the same time without one of them overwriting the work of the other.
//
// Events:
//   whiteboard:create { title, name, clientId }  -> ack { board, participants }
//   whiteboard:join   { boardId, name, clientId } -> ack { board, participants }
//   whiteboard:update { boardId, clientId, upserts, deletes }
//   whiteboard:cursor { boardId, clientId, x, y }
//   whiteboard:leave  { boardId, clientId }
// The room broadcasts "whiteboard:changed", "whiteboard:participants" and
// "whiteboard:cursor".

import type { Server, Socket } from "socket.io";
import crypto from "crypto";
import { Whiteboard } from "../models/LanguageLearningModel";
import {
  freieFarbe,
  normiereName,
  normierePatch,
  sortiereObjekte,
  wendePatchAn,
} from "./boardLogic";
import type {
  WhiteboardBoard,
  WhiteboardObject,
  WhiteboardParticipant,
} from "./types";

interface Teilnehmer {
  id: string;
  name: string;
  color: string;
  socketId: string;
}

interface Board {
  id: string;
  title: string;
  objekte: Map<string, WhiteboardObject>;
  // Die Teilnehmer sind ueber ihre clientId eindeutig. So kann eine Person in
  // mehreren Tabs (oder auf dem Board und auf der Startseite) dabei sein,
  // ohne doppelt auf der Liste zu stehen.
  teilnehmer: Map<string, Teilnehmer>;
  createdAt: number;
  updatedAt: number;
  saveTimer: NodeJS.Timeout | null;
}

type Ack = (res: {
  board?: WhiteboardBoard;
  participants?: WhiteboardParticipant[];
  error?: string;
}) => void;

const boards = new Map<string, Board>();

let io: Server | null = null;

function neueBoardId(): string {
  let id: string;
  do {
    id = crypto.randomBytes(5).toString("hex");
  } while (boards.has(id));
  return id;
}

function oeffentlicheTeilnehmer(board: Board): WhiteboardParticipant[] {
  return Array.from(board.teilnehmer.values()).map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));
}

function alsBoard(board: Board): WhiteboardBoard {
  return {
    id: board.id,
    title: board.title,
    objects: sortiereObjekte(Array.from(board.objekte.values())),
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

function broadcastTeilnehmer(board: Board): void {
  if (io) io.to(board.id).emit("whiteboard:participants", oeffentlicheTeilnehmer(board));
}

/** Speichert das Board in MongoDB. Fehler sind nicht schlimm: das Board
 *  laeuft dann nur so lange im Arbeitsspeicher, wie der Server laeuft. */
async function speichere(board: Board): Promise<void> {
  try {
    await Whiteboard.updateOne(
      { boardId: board.id },
      {
        $set: {
          title: board.title,
          objects: sortiereObjekte(Array.from(board.objekte.values())),
          updatedAt: new Date(board.updatedAt),
        },
        $setOnInsert: { boardId: board.id, createdAt: new Date(board.createdAt) },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("Whiteboard konnte nicht gespeichert werden:", err);
  }
}

/** Speichert das Board, aber erst nach einer kurzen Wartezeit. So werden bei
 *  schnellem Zeichnen nicht viele Schreibvorgaenge erzeugt. */
function speichereVerzoegert(board: Board): void {
  if (board.saveTimer) clearTimeout(board.saveTimer);
  board.saveTimer = setTimeout(() => {
    board.saveTimer = null;
    void speichere(board);
  }, 1500);
  board.saveTimer.unref?.();
}

/** Laedt ein Board aus MongoDB, falls es noch nicht im Arbeitsspeicher ist. */
async function ladeBoard(boardId: string): Promise<Board | null> {
  const vorhanden = boards.get(boardId);
  if (vorhanden) return vorhanden;
  try {
    const dokument = await Whiteboard.findOne({ boardId }).lean();
    if (!dokument) return null;
    const board: Board = {
      id: boardId,
      title: String(dokument.title ?? "Whiteboard"),
      objekte: new Map<string, WhiteboardObject>(),
      teilnehmer: new Map<string, Teilnehmer>(),
      createdAt: new Date(dokument.createdAt ?? Date.now()).getTime(),
      updatedAt: new Date(dokument.updatedAt ?? Date.now()).getTime(),
      saveTimer: null,
    };
    const objekte = Array.isArray(dokument.objects) ? dokument.objects : [];
    for (const objekt of objekte) {
      const sauber = objekt as WhiteboardObject;
      if (sauber && typeof sauber.id === "string") {
        board.objekte.set(sauber.id, sauber);
      }
    }
    boards.set(boardId, board);
    return board;
  } catch (err) {
    console.error("Whiteboard konnte nicht geladen werden:", err);
    return null;
  }
}

/** Entfernt einen Teilnehmer und meldet die neue Liste. */
function entferneTeilnehmer(board: Board, clientId: string): void {
  const teilnehmer = board.teilnehmer.get(clientId);
  if (!teilnehmer) return;
  board.teilnehmer.delete(clientId);
  broadcastTeilnehmer(board);
}

function entferneSocket(socket: Socket): void {
  const clientIds = socket.data.whiteboardClients as string[] | undefined;
  if (!clientIds || clientIds.length === 0) return;
  socket.data.whiteboardClients = [];
  for (const eintrag of clientIds) {
    const [boardId, clientId] = eintrag.split("|");
    const board = boardId ? boards.get(boardId) : undefined;
    if (!board) continue;
    const teilnehmer = board.teilnehmer.get(clientId);
    if (!teilnehmer || teilnehmer.socketId !== socket.id) continue;
    board.teilnehmer.delete(clientId);
    void socket.leave(board.id);
    broadcastTeilnehmer(board);
  }
}

function merke(socket: Socket, boardId: string, clientId: string): void {
  const eintraege = (socket.data.whiteboardClients as string[] | undefined) ?? [];
  const schluessel = `${boardId}|${clientId}`;
  if (!eintraege.includes(schluessel)) eintraege.push(schluessel);
  socket.data.whiteboardClients = eintraege;
}

export function attachWhiteboard(socketServer: Server): void {
  io = socketServer;

  io.on("connection", (socket) => {
    socket.on(
      "whiteboard:create",
      (payload: { title?: string; name?: string; clientId?: string }, ack?: Ack) => {
        try {
          const name = normiereName(payload?.name);
          const clientId = String(payload?.clientId ?? "").trim().slice(0, 64);
          if (!clientId) return ack?.({ error: "The board could not be created." });

          const titel = String(payload?.title ?? "").trim().slice(0, 80) || "Whiteboard";
          const board: Board = {
            id: neueBoardId(),
            title: titel,
            objekte: new Map<string, WhiteboardObject>(),
            teilnehmer: new Map<string, Teilnehmer>(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            saveTimer: null,
          };
          boards.set(board.id, board);
          void socket.join(board.id);
          merke(socket, board.id, clientId);
          // Der Ersteller wird erst beim Beitreten als Teilnehmer gefuehrt. So
          // erscheint er nicht doppelt, wenn die Seite danach das Board oeffnet.
          void speichere(board);
          ack?.({ board: alsBoard(board), participants: [] });
        } catch (err) {
          console.error(err);
          ack?.({ error: "The board could not be created." });
        }
      }
    );

    socket.on(
      "whiteboard:join",
      (payload: { boardId?: string; name?: string; clientId?: string }, ack?: Ack) => {
        void (async () => {
          try {
            const name = normiereName(payload?.name);
            const clientId = String(payload?.clientId ?? "").trim().slice(0, 64);
            const boardId = String(payload?.boardId ?? "").trim().slice(0, 64);
            if (!clientId) return ack?.({ error: "The board could not be joined." });

            const board = await ladeBoard(boardId);
            if (!board) return ack?.({ error: "This whiteboard does not exist (any more)." });

            const bekannt = board.teilnehmer.get(clientId);
            if (bekannt) {
              // Dieselbe Sitzung meldet sich erneut an (z.B. nach einem Neuladen).
              bekannt.name = name || bekannt.name;
              bekannt.socketId = socket.id;
            } else {
              board.teilnehmer.set(clientId, {
                id: clientId,
                name: name || "Guest",
                color: freieFarbe(oeffentlicheTeilnehmer(board)),
                socketId: socket.id,
              });
            }
            void socket.join(board.id);
            merke(socket, board.id, clientId);
            ack?.({ board: alsBoard(board), participants: oeffentlicheTeilnehmer(board) });
            broadcastTeilnehmer(board);
          } catch (err) {
            console.error(err);
            ack?.({ error: "The board could not be joined." });
          }
        })();
      }
    );

    socket.on(
      "whiteboard:update",
      (payload: { boardId?: string; clientId?: string; upserts?: unknown[]; deletes?: unknown[] }, ack?: Ack) => {
        try {
          const boardId = String(payload?.boardId ?? "").trim().slice(0, 64);
          const clientId = String(payload?.clientId ?? "").trim().slice(0, 64);
          const board = boards.get(boardId);
          if (!board) return ack?.({ error: "This whiteboard does not exist (any more)." });
          const teilnehmer = board.teilnehmer.get(clientId);
          if (!teilnehmer || teilnehmer.socketId !== socket.id) {
            return ack?.({ error: "You are not a participant of this whiteboard." });
          }
          const patch = normierePatch(payload);
          if (!patch.upserts.length && !patch.deletes.length) {
            ack?.({});
            return;
          }
          board.objekte = new Map(
            wendePatchAn(Array.from(board.objekte.values()), patch).map((o) => [o.id, o])
          );
          board.updatedAt = Date.now();
          io?.to(board.id).emit("whiteboard:changed", patch);
          speichereVerzoegert(board);
          ack?.({});
        } catch (err) {
          console.error(err);
          ack?.({ error: "The change could not be saved." });
        }
      }
    );

    socket.on("whiteboard:cursor", (payload: { boardId?: string; clientId?: string; x?: number; y?: number }) => {
      const boardId = String(payload?.boardId ?? "").trim().slice(0, 64);
      const clientId = String(payload?.clientId ?? "").trim().slice(0, 64);
      const board = boards.get(boardId);
      if (!board) return;
      const teilnehmer = board.teilnehmer.get(clientId);
      if (!teilnehmer || teilnehmer.socketId !== socket.id) return;
      const x = typeof payload?.x === "number" && Number.isFinite(payload.x) ? payload.x : 0;
      const y = typeof payload?.y === "number" && Number.isFinite(payload.y) ? payload.y : 0;
      socket.to(board.id).emit("whiteboard:cursor", {
        participant: { id: teilnehmer.id, name: teilnehmer.name, color: teilnehmer.color },
        x,
        y,
      });
    });

    socket.on("whiteboard:leave", (payload: { boardId?: string; clientId?: string }) => {
      const boardId = String(payload?.boardId ?? "").trim().slice(0, 64);
      const clientId = String(payload?.clientId ?? "").trim().slice(0, 64);
      const board = boards.get(boardId);
      if (!board) return;
      const eintraege = (socket.data.whiteboardClients as string[] | undefined) ?? [];
      socket.data.whiteboardClients = eintraege.filter((e) => e !== `${boardId}|${clientId}`);
      entferneTeilnehmer(board, clientId);
    });

    socket.on("disconnect", () => {
      entferneSocket(socket);
    });
  });

  // Boards, zu denen sich niemand mehr verbunden hat, werden nach einer Weile
  // aus dem Arbeitsspeicher geraeumt. In MongoDB bleiben sie erhalten.
  const cleaner = setInterval(() => {
    const jetzt = Date.now();
    for (const [id, board] of boards) {
      if (board.teilnehmer.size === 0 && jetzt - board.updatedAt > 24 * 60 * 60 * 1000) {
        if (board.saveTimer) clearTimeout(board.saveTimer);
        boards.delete(id);
      }
    }
  }, 60 * 60 * 1000);
  cleaner.unref();
}
