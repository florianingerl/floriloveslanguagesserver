// Gemeinsame Typen des Whiteboards. Sie muessen mit den Typen der Website
// (website/src/types/whiteboard.ts) uebereinstimmen, weil die Objekte ueber
// Socket.IO zwischen den Browsern hin und her gehen.

export type WhiteboardObjectType =
  | "note"
  | "text"
  | "rect"
  | "ellipse"
  | "line"
  | "pen"
  | "image";

export interface WhiteboardObject {
  id: string;
  type: WhiteboardObjectType;
  /** Linke obere Ecke in Weltkoordinaten. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Reihenfolge in der Zeichenebene (groesser = weiter vorne). */
  z: number;
  /** Linienfarbe (Umriss) bzw. Schriftfarbe. */
  color: string;
  /** Fuellfarbe (z.B. bei Klebezetteln). */
  fill?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  /** Freihand: flache Liste x0,y0,x1,y1,... relativ zu x/y. */
  points?: number[];
  /** Linie: Endpunkt (absolut). */
  x2?: number;
  y2?: number;
  /** Bild: Daten-URL. */
  src?: string;
  /** Name der Person, die das Objekt angelegt hat. */
  author?: string;
}

export interface WhiteboardBoard {
  id: string;
  title: string;
  objects: WhiteboardObject[];
  createdAt: number;
  updatedAt: number;
}

export interface WhiteboardParticipant {
  id: string;
  name: string;
  color: string;
}

/** Aenderung an einem Board: geaenderte Objekte und geloeschte Objekte. */
export interface WhiteboardPatch {
  upserts: WhiteboardObject[];
  deletes: string[];
}

export interface WhiteboardCursor {
  participant: WhiteboardParticipant;
  x: number;
  y: number;
}
