/*
 * mongosh-Skript: loescht alle Aufgaben ohne Bild (imageUrl leer oder fehlend).
 * Vorher wird eine Sicherungskopie als JSON geschrieben, damit sich die
 * Aufgaben notfalls wiederherstellen lassen.
 *
 * Aufruf (Verbindungszeichenkette aus .env.production):
 *   mongosh "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/test" --quiet --file delete-imageless-exercises.js
 *
 * Das Skript ist idempotent: Beim zweiten Aufruf gibt es nichts mehr zu loeschen.
 */

const fs = require("fs");
const path = require("path");

// Leerer String ODER Feld fehlt.
const FILTER = { $or: [{ imageUrl: /^$/ }, { imageUrl: { $exists: false } }] };

const docs = db.exercises.find(FILTER).toArray();
print("Aufgaben ohne imageUrl: " + docs.length);

if (docs.length === 0) {
  print("Nichts zu loeschen.");
} else {
  // Sicherungskopie mit EJSON (erhaelt ObjectId und Datumstypen).
  const stempel = new Date().toISOString().replace(/[:.]/g, "-");
  const datei = path.join(
    process.cwd(),
    "backup-imageless-exercises-" + stempel + ".json"
  );
  const ejson =
    typeof EJSON !== "undefined"
      ? EJSON
      : { stringify: (v, r, s) => JSON.stringify(v, r, s) };
  fs.writeFileSync(datei, ejson.stringify(docs, null, 2), "utf8");
  print("Backup geschrieben: " + datei);
  docs.forEach(function (d) {
    print(
      "  " +
        d._id +
        " | " +
        d.type +
        " | " +
        String(d.question || d.instruction || d.gapText || "").slice(0, 70)
    );
  });

  const res = db.exercises.deleteMany(FILTER);
  print("Geloescht: " + res.deletedCount);
}

print("Verbleibende Aufgaben: " + db.exercises.countDocuments({}));
