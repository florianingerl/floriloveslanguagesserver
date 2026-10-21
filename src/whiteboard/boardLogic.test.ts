// Tests der reinen Whiteboard-Logik. Run with: npm run test:whiteboard
import assert from "assert";
import * as L from "./boardLogic";
import type { WhiteboardObject } from "./types";

function objekt(id: string, z = 0): WhiteboardObject {
  return { id, type: "note", x: 0, y: 0, w: 100, h: 100, z, color: "#000000" };
}

// --- Namen -----------------------------------------------------------------
{
  assert.strictEqual(L.normiereName("  Flori  "), "Flori");
  assert.strictEqual(L.normiereName("A\nB"), "AB");
  assert.strictEqual(L.normiereName("x".repeat(80)).length, 40);
  assert.strictEqual(L.normiereName(undefined), "");
}

// --- Farben ----------------------------------------------------------------
{
  const farbe = L.freieFarbe([{ id: "a", name: "A", color: L.FARBEN[0] }]);
  assert.notStrictEqual(farbe, L.FARBEN[0]);
  assert.ok(L.FARBEN.includes(farbe));
}

// --- Objekte pruefen -------------------------------------------------------
{
  const sauber = L.normiereObjekt({
    id: "abc",
    type: "note",
    x: 10,
    y: 20,
    w: 100,
    h: 50,
    z: 3,
    color: "#ff0000",
    text: "Hallo",
  });
  assert.ok(sauber);
  assert.strictEqual(sauber!.id, "abc");
  assert.strictEqual(sauber!.type, "note");
  assert.strictEqual(sauber!.text, "Hallo");
  assert.strictEqual(sauber!.z, 3);
}
{
  // Unbekannte Art oder fehlende Kennung wird verworfen.
  assert.strictEqual(L.normiereObjekt({ id: "a", type: "unbekannt" }), null);
  assert.strictEqual(L.normiereObjekt({ type: "note" }), null);
  assert.strictEqual(L.normiereObjekt(null), null);
}
{
  // Ein Bild wird nur behalten, wenn es eine Daten-URL ist.
  const mitBild = L.normiereObjekt({
    id: "a",
    type: "image",
    src: "data:image/png;base64,AAA",
  });
  assert.strictEqual(mitBild!.src, "data:image/png;base64,AAA");
  const mitSkript = L.normiereObjekt({
    id: "a",
    type: "image",
    src: "javascript:alert(1)",
  });
  assert.strictEqual(mitSkript!.src, undefined);
}

// --- Patches pruefen -------------------------------------------------------
{
  const patch = L.normierePatch({
    upserts: [{ id: "a", type: "rect", x: 1 }, { kaputt: true }],
    deletes: ["x", "x", "y"],
  });
  assert.strictEqual(patch.upserts.length, 1);
  assert.strictEqual(patch.deletes.length, 2);
  assert.deepStrictEqual(patch.deletes, ["x", "y"]);
}
{
  assert.deepStrictEqual(L.normierePatch(undefined), { upserts: [], deletes: [] });
  assert.deepStrictEqual(L.normierePatch({ upserts: "nope" }), { upserts: [], deletes: [] });
}

// --- Patches anwenden ------------------------------------------------------
{
  const objekte = [objekt("a", 1), objekt("b", 2)];
  const neu = L.wendePatchAn(objekte, { upserts: [objekt("c", 3)], deletes: [] });
  assert.strictEqual(neu.length, 3);
  assert.deepStrictEqual(neu.map((o) => o.id), ["a", "b", "c"]);
}
{
  // Ein geaendertes Objekt ersetzt das alte.
  const objekte = [objekt("a", 1)];
  const geaendert = { ...objekt("a", 5), x: 42 };
  const neu = L.wendePatchAn(objekte, { upserts: [geaendert], deletes: [] });
  assert.strictEqual(neu.length, 1);
  assert.strictEqual(neu[0].x, 42);
  assert.strictEqual(neu[0].z, 5);
}
{
  const objekte = [objekt("a", 1), objekt("b", 2)];
  const neu = L.wendePatchAn(objekte, { upserts: [], deletes: ["a"] });
  assert.deepStrictEqual(neu.map((o) => o.id), ["b"]);
}
{
  // Die Objekte kommen nach ihrer Reihenfolge in der Zeichenebene.
  const objekte = [objekt("c", 3), objekt("a", 1), objekt("b", 2)];
  const sortiert = L.sortiereObjekte(objekte);
  assert.deepStrictEqual(sortiert.map((o) => o.id), ["a", "b", "c"]);
}

console.log("Whiteboard-Logik: alle Tests bestanden.");
