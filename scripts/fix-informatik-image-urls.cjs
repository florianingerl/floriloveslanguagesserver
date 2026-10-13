// Korrigiert die imageUrl der Informatik-Aufgaben ("UML - Aktivit\u00e4tsdiagramme"):
// Alle Aufgaben bekommen ausschliesslich Bilder aus dem deutschsprachigen
// Wikipedia-Artikel ueber Aktivit\u00e4tsdiagramme:
//   https://de.wikipedia.org/wiki/Aktivit%C3%A4tsdiagramm
// Der Artikel zeigt genau zwei Diagramme: das UML-2-Beispiel (erstes Bild) und
// das UML-1-Beispiel. Abschnitte, die ein eigenes Bild zeigen, behalten dieses;
// alle uebrigen Abschnitte bekommen das erste Bild des Artikels.
//
// Aufruf auf dem Server:
//   node scripts/fix-informatik-image-urls.cjs --dry-run
//   node scripts/fix-informatik-image-urls.cjs

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const URL =
  process.env.MONGODB_URL ?? "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";
const SUBJECT = "informatics";

const WIKI_UML2 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Uml-Activity-Beispiel3_Deutsch.svg/500px-Uml-Activity-Beispiel3_Deutsch.svg.png";
const WIKI_UML1 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Uml-Activity-Beispiel1.svg/500px-Uml-Activity-Beispiel1.svg.png";

const EXERCISES = [
  { frage: "Was wird mit einem Aktivit\u00e4tsdiagramm meist beschrieben?", bild: WIKI_UML2 },
  { frage: "Mit welchen Modellen ist die Semantik der Aktivit\u00e4tsdiagramme in UML 2 verwandt?", bild: WIKI_UML2 },
  { frage: "Woraus besteht ein Aktivit\u00e4tsdiagramm?", bild: WIKI_UML2 },
  { frage: "Wozu wird der Startknoten verwendet?", bild: WIKI_UML2 },
  { frage: "Wodurch kann das Symbol des Startknotens erweitert werden?", bild: WIKI_UML2 },
  { frage: "Wozu dient das Symbol der Aktivit\u00e4t?", bild: WIKI_UML2 },
  { frage: "Wozu dient das Symbol der Aktion?", bild: WIKI_UML2 },
  { frage: "Wozu dient das Symbol des Kontrollflusses?", bild: WIKI_UML2 },
  { frage: "Wozu dient das Symbol des Objektflusses?", bild: WIKI_UML2 },
  { frage: "Was markiert der Endknoten?", bild: WIKI_UML2 },
  { frage: "Was markiert ein Fluss-Endknoten?", bild: WIKI_UML2 },
  { frage: "In welcher Form wird eine bedingte Verzweigung im Kontrollfluss dargestellt?", bild: WIKI_UML2 },
  { frage: "Wie viele Eing\u00e4nge und Ausg\u00e4nge hat ein Entscheidungsknoten?", bild: WIKI_UML2 },
  { frage: "Wie viele Eing\u00e4nge und Ausg\u00e4nge hat das Symbol zum Verschmelzen von Knoten?", bild: WIKI_UML2 },
  { frage: "Was bewirkt das Symbol der Gabel (Parallelisierung)?", bild: WIKI_UML2 },
  { frage: "Wie wird das Symbol zum Zusammenf\u00fchren dargestellt?", bild: WIKI_UML2 },
  { frage: "Wozu dient die Aktion des Sendens von Signalen?", bild: WIKI_UML2 },
  { frage: "Wann ist der von der Aktion des Signalempfangs ausgehende Kontrollfluss abgeschlossen?", bild: WIKI_UML2 },
  { frage: "Wozu dient das Symbol des Kommentars?", bild: WIKI_UML2 },
  { frage: "Welches Schl\u00fcsselwort steht im Kopfbereich eines UML-2-Aktivit\u00e4tsdiagramms?", bild: WIKI_UML2 },
  { frage: "Was ist der schwarze Punkt in einem UML-2-Aktivit\u00e4tsdiagramm?", bild: WIKI_UML2 },
  { frage: "Was hat sich bei den Aktivit\u00e4tsdiagrammen von UML 1 zu UML 2 wesentlich ge\u00e4ndert?", bild: WIKI_UML1 },
  { frage: "Wof\u00fcr stehen die horizontalen, dicken Linien in einem UML-1-Aktivit\u00e4tsdiagramm?", bild: WIKI_UML1 },
];

const dryRun = process.argv.includes("--dry-run");

async function backup(db) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(__dirname, "..", "backups", stamp);
  fs.mkdirSync(dir, { recursive: true });
  for (const col of ["quizzes", "topics", "exercises"]) {
    const docs = await db.collection(col).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${col}.json`), JSON.stringify(docs, null, 2));
    console.log(`Backup ${col}: ${docs.length} Dokumente`);
  }
  console.log(`Backup-Verzeichnis: ${dir}`);
}

async function main() {
  const client = new MongoClient(URL, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db();
  console.log(`Verbunden mit Datenbank "${db.databaseName}".`);
  if (dryRun) console.log("DRY RUN: es wird nichts geaendert.");

  if (!dryRun) await backup(db);

  const exercises = db.collection("exercises");
  let aktualisiert = 0;
  let unveraendert = 0;
  let nichtGefunden = 0;
  for (const ex of EXERCISES) {
    const doc = await exercises.findOne({ subject: SUBJECT, question: ex.frage });
    if (!doc) {
      nichtGefunden++;
      console.log(`  nicht gefunden: ${ex.frage}`);
      continue;
    }
    if (doc.imageUrl === ex.bild) {
      unveraendert++;
      continue;
    }
    if (dryRun) {
      console.log(`  wuerde aktualisieren: ${ex.frage}`);
      aktualisiert++;
      continue;
    }
    await exercises.updateOne(
      { _id: doc._id },
      { $set: { imageUrl: ex.bild, updatedAt: new Date() } },
    );
    aktualisiert++;
  }
  console.log(
    `${aktualisiert} Aufgabe(n) ${dryRun ? "wuerden aktualisiert" : "aktualisiert"}, ${unveraendert} unveraendert, ${nichtGefunden} nicht gefunden.`,
  );

  await client.close();
  console.log(dryRun ? "Dry run abgeschlossen." : "Fertig.");
}

main().catch((e) => {
  console.error("Fehlgeschlagen:", e && e.message ? e.message : e);
  process.exit(1);
});