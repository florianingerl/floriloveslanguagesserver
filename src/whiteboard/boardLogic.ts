// Reine Logik des Whiteboards ohne Socket.IO. Das laesst sich leicht testen
// (siehe boardLogic.test.ts) und haelt die Socket-Datei klein.

import type {
  WhiteboardObject,
  WhiteboardObjectType,
  WhiteboardParticipant,
  WhiteboardPatch,
} from "./types";

// Farben fuer die Cursor der Teilnehmer.
export const FARBEN = [
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

const OBJEKT_ARTEN: WhiteboardObjectType[] = [
  "note",
  "text",
  "rect",
  "ellipse",
  "line",
  "pen",
  "image",
];

// Grenzen, damit ein einzelner Browser den Server nicht mit einem riesigen
// Bild oder Millionen Punkten ueberlasten kann.
export const MAX_OBJEKTE_PRO_PATCH = 200;
export const MAX_PUNKTE_PRO_OBJEKT = 4000;
export const MAX_TEXTLAENGE = 5000;
export const MAX_BILDGROESSE = 1_500_000;

export interface NormiertesPatch {
  upserts: WhiteboardObject[];
  deletes: string[];
}

/** Kuerzt den Namen und entfernt Steuerzeichen. */
export function normiereName(name: unknown): string {
  const text = String(name ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 40);
  return text;
}

/** Sucht eine Farbe, die noch niemand benutzt. */
export function freieFarbe(teilnehmer: WhiteboardParticipant[]): string {
  const belegt = new Set(teilnehmer.map((p) => p.color));
  return FARBEN.find((f) => !belegt.has(f)) ?? FARBEN[teilnehmer.length % FARBEN.length];
}

function istZahl(wert: unknown): wert is number {
  return typeof wert === "number" && Number.isFinite(wert);
}

/**
 * Prueft ein Objekt aus dem Netzwerk und macht daraus ein sauberes Objekt.
 * Unbekannte Felder fallen weg, Texte und Bilddaten werden gekuerzt.
 */
export function normiereObjekt(eingabe: unknown): WhiteboardObject | null {
  if (!eingabe || typeof eingabe !== "object") return null;
  const roh = eingabe as Record<string, unknown>;
  const id = String(roh.id ?? "").trim().slice(0, 64);
  const typ = String(roh.type ?? "") as WhiteboardObjectType;
  if (!id || !OBJEKT_ARTEN.includes(typ)) return null;

  const objekt: WhiteboardObject = {
    id,
    type: typ,
    x: istZahl(roh.x) ? roh.x : 0,
    y: istZahl(roh.y) ? roh.y : 0,
    w: istZahl(roh.w) ? roh.w : 0,
    h: istZahl(roh.h) ? roh.h : 0,
    z: istZahl(roh.z) ? roh.z : 0,
    color: String(roh.color ?? "#323f4b").slice(0, 32),
  };

  if (typeof roh.fill === "string") objekt.fill = roh.fill.slice(0, 32);
  if (istZahl(roh.strokeWidth)) {
    objekt.strokeWidth = Math.min(Math.max(roh.strokeWidth, 1), 64);
  }
  if (istZahl(roh.fontSize)) {
    objekt.fontSize = Math.min(Math.max(roh.fontSize, 6), 400);
  }
  if (typeof roh.text === "string") {
    objekt.text = roh.text.slice(0, MAX_TEXTLAENGE);
  }
  if (typeof roh.author === "string") {
    objekt.author = roh.author.slice(0, 40);
  }
  if (istZahl(roh.x2)) objekt.x2 = roh.x2;
  if (istZahl(roh.y2)) objekt.y2 = roh.y2;
  if (Array.isArray(roh.points)) {
    const punkte = roh.points.filter(istZahl).slice(0, MAX_PUNKTE_PRO_OBJEKT);
    objekt.points = punkte;
  }
  if (typeof roh.src === "string" && roh.src.startsWith("data:image/")) {
    objekt.src = roh.src.slice(0, MAX_BILDGROESSE);
  }
  return objekt;
}

/** Prueft einen Patch aus dem Netzwerk. */
export function normierePatch(eingabe: unknown): NormiertesPatch {
  const leer: NormiertesPatch = { upserts: [], deletes: [] };
  if (!eingabe || typeof eingabe !== "object") return leer;
  const roh = eingabe as Record<string, unknown>;

  const upserts: WhiteboardObject[] = [];
  if (Array.isArray(roh.upserts)) {
    for (const eintrag of roh.upserts.slice(0, MAX_OBJEKTE_PRO_PATCH)) {
      const objekt = normiereObjekt(eintrag);
      if (objekt) upserts.push(objekt);
    }
  }

  const deletes: string[] = [];
  if (Array.isArray(roh.deletes)) {
    for (const eintrag of roh.deletes.slice(0, MAX_OBJEKTE_PRO_PATCH)) {
      const id = String(eintrag ?? "").trim().slice(0, 64);
      if (id && !deletes.includes(id)) deletes.push(id);
    }
  }

  return { upserts, deletes };
}

/**
 * Wendet eine Aenderung auf die Objekte eines Boards an.
 * Geaenderte Objekte ersetzen das alte Objekt mit derselben Kennung, neue
 * Objekte kommen hinzu, geloeschte Objekte verschwinden.
 */
export function wendePatchAn(
  objekte: WhiteboardObject[],
  patch: WhiteboardPatch
): WhiteboardObject[] {
  const neu = new Map<string, WhiteboardObject>();
  for (const objekt of objekte) neu.set(objekt.id, objekt);
  for (const objekt of patch.upserts) neu.set(objekt.id, objekt);
  for (const id of patch.deletes) neu.delete(id);
  return Array.from(neu.values()).sort((a, b) => a.z - b.z);
}

/** Sortiert die Objekte nach ihrer Reihenfolge in der Zeichenebene. */
export function sortiereObjekte(objekte: WhiteboardObject[]): WhiteboardObject[] {
  return [...objekte].sort((a, b) => a.z - b.z);
}
