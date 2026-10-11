// Socket.io backend for collaborative book writing.
//
// One writer creates a session ("book:createSession", with the book id and his
// name), the other writers join it ("book:join") via the invitation link. The
// session is only a room with a participant list; the actual book content stays
// in the database and is saved by the editor with Ctrl+S. Every sender shares
// only the Jodit editor content (the paragraphs) - inside a quiz there is no
// collaboration.
//
// Events:
//   book:createSession { bookId, name }  -> ack { sessionId, participants }
//   book:join          { sessionId, bookId?, name } -> ack { sessionId, participants }
//   book:update        { sessionId, payload } -> broadcast "book:update" { payload }
//   book:leave         { sessionId }
// Rooms broadcast "book:participants" whenever someone joins or leaves.

import type { Server, Socket } from "socket.io";
import crypto from "crypto";

export interface BookParticipant {
  socketId: string | null;
  name: string;
  color: string;
}

interface Session {
  id: string;
  // Buch, zu dem die Sitzung gehoert. Beim Beitreten muss der Einladende dasselbe
  // Buch mitschicken, damit niemand im falschen Buch landet.
  bookId: string | null;
  participants: BookParticipant[];
  createdAt: Date;
}

type Ack = (res: { sessionId?: string; participants?: BookParticipantPublic[]; error?: string }) => void;

export interface BookParticipantPublic {
  id: string;
  name: string;
  color: string;
}

const sessions = new Map<string, Session>();

// Cursor-Farben fuer die Teilnehmer.
const FARBEN = [
  "#e6194B",
  "#3cb44b",
  "#4363d8",
  "#f58231",
  "#911eb4",
  "#42d4f4",
  "#f032e6",
  "#9A6324",
  "#469990",
  "#dcbeff",
];

// Das io-Instance wird in attachBookCollaboration gesetzt, damit die Helfer
// ohne Durchreichen aller Aufrufe senden koennen.
let io: Server | null = null;

function neueSessionsId(): string {
  let id: string;
  do {
    id = crypto.randomBytes(5).toString("hex");
  } while (sessions.has(id));
  return id;
}

function freieFarbe(session: Session): string {
  const belegt = new Set(session.participants.map((p) => p.color));
  return FARBEN.find((f) => !belegt.has(f)) ?? FARBEN[session.participants.length % FARBEN.length];
}

function oeffentlicheTeilnehmer(session: Session): BookParticipantPublic[] {
  return session.participants
    .filter((p) => p.socketId !== null)
    .map((p) => ({ id: p.socketId as string, name: p.name, color: p.color }));
}

function broadcastTeilnehmer(session: Session): void {
  if (io) io.to(session.id).emit("book:participants", oeffentlicheTeilnehmer(session));
}

function entferneAusSitzung(socket: Socket): void {
  const sessionId = socket.data.bookSession as string | undefined;
  if (!sessionId) return;
  const session = sessions.get(sessionId);
  socket.data.bookSession = null;
  void socket.leave(sessionId);
  if (!session) return;
  const vorher = session.participants.length;
  session.participants = session.participants.filter((p) => p.socketId !== socket.id);
  if (session.participants.length === vorher) return;
  if (session.participants.length === 0) {
    sessions.delete(sessionId);
    return;
  }
  broadcastTeilnehmer(session);
}

export function attachBookCollaboration(socketServer: Server): void {
  io = socketServer;

  io.on("connection", (socket) => {
    socket.on("book:createSession", (payload: { bookId?: string; name?: string }, ack?: Ack) => {
      try {
        const name = String(payload?.name ?? "").trim().slice(0, 40);
        if (!name) return ack?.({ error: "Please enter your name." });
        const bookId = String(payload?.bookId ?? "").trim().slice(0, 40) || null;
        if (socket.data.bookSession) entferneAusSitzung(socket);
        const session: Session = {
          id: neueSessionsId(),
          bookId,
          participants: [{ socketId: socket.id, name, color: FARBEN[0] }],
          createdAt: new Date(),
        };
        sessions.set(session.id, session);
        socket.data.bookSession = session.id;
        void socket.join(session.id);
        ack?.({ sessionId: session.id, participants: oeffentlicheTeilnehmer(session) });
      } catch (err) {
        console.error(err);
        ack?.({ error: "Could not create the session." });
      }
    });

    socket.on("book:join", (payload: { sessionId?: string; bookId?: string; name?: string }, ack?: Ack) => {
      try {
        const name = String(payload?.name ?? "").trim().slice(0, 40);
        if (!name) return ack?.({ error: "Please enter your name." });
        const session = sessions.get(String(payload?.sessionId ?? ""));
        if (!session) {
          return ack?.({ error: "This collaboration session does not exist (any more)." });
        }
        const bookId = String(payload?.bookId ?? "").trim().slice(0, 40);
        if (session.bookId && bookId && session.bookId !== bookId) {
          return ack?.({ error: "This session belongs to a different book." });
        }
        if (socket.data.bookSession) entferneAusSitzung(socket);

        // Wer sich abgemeldet hat, kann seinen Stuhl wieder einnehmen.
        const bekannte = session.participants.find((p) => p.name === name && p.socketId === null);
        if (bekannte) {
          bekannte.socketId = socket.id;
        } else if (session.participants.some((p) => p.name === name)) {
          return ack?.({ error: "This name is already taken in this session." });
        } else {
          session.participants.push({ socketId: socket.id, name, color: freieFarbe(session) });
        }
        socket.data.bookSession = session.id;
        void socket.join(session.id);
        ack?.({ sessionId: session.id, participants: oeffentlicheTeilnehmer(session) });
        broadcastTeilnehmer(session);
      } catch (err) {
        console.error(err);
        ack?.({ error: "Could not join the session." });
      }
    });

    socket.on("book:update", (payload: { sessionId?: string; payload?: unknown }, ack?: Ack) => {
      const session = sessions.get(String(payload?.sessionId ?? ""));
      if (!session) {
        ack?.({ error: "This collaboration session does not exist (any more)." });
        return;
      }
      if (!session.participants.some((p) => p.socketId === socket.id)) {
        ack?.({ error: "You are not a participant of this session." });
        return;
      }
      // Nur die Jodit-Editor-Inhalte (Absaetze) werden weitergegeben.
      socket.to(session.id).emit("book:update", payload?.payload);
      ack?.({});
    });

    socket.on("book:leave", (_payload: unknown) => {
      entferneAusSitzung(socket);
    });

    socket.on("disconnect", () => {
      entferneAusSitzung(socket);
    });
  });

  // Sitzungen ohne Teilnehmer werden nach einem Tag aufgeraeumt.
  const cleaner = setInterval(() => {
    const jetzt = Date.now();
    for (const [id, session] of sessions) {
      const beschaeftigt = session.participants.some((p) => p.socketId !== null);
      if (!beschaeftigt && jetzt - session.createdAt.getTime() > 24 * 60 * 60 * 1000) {
        sessions.delete(id);
      }
    }
  }, 60 * 60 * 1000);
  cleaner.unref();
}