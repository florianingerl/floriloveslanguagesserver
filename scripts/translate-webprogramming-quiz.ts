// Uebersetzt die bereits angelegten Web-Programming-Aufgaben (Fach
// "webprogramming", Thema "TypeScript - destructuring expressions") ins
// Englische.
//
// Die Aufgaben werden ueber ihr Bild (imageUrl) wiedergefunden, weil jedes Bild
// des Artikels genau zu einer Aufgabe gehoert. Gesetzt werden question,
// options und instruction; der uebrige Inhalt bleibt unveraendert.
//
// Der englische Inhalt steht in scripts/webprogramming-exercises.ts.
//
// Vor dem Schreiben wird die exercises-Collection als EJSON gesichert.
//
// Aufruf (Produktions-Verbindung aus MONGODB_URL in .env.production):
//   NODE_ENV=production npx ts-node scripts/translate-webprogramming-quiz.ts --dry-run
//   NODE_ENV=production npx ts-node scripts/translate-webprogramming-quiz.ts
//
// Mit --dry-run wird nur gelesen; es wird nichts geaendert.

import { MongoClient, Db } from "mongodb";
import { EJSON } from "bson";
import * as fs from "fs";
import * as path from "path";
import dbConfig from "../src/config/db.config";
import { FRAGEN, INSTRUCTION, options } from "./webprogramming-exercises";

const dryRun = process.argv.includes("--dry-run");
const SUBJECT = "webprogramming";

async function backup(db: Db): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(__dirname, "..", "backups", stamp);
  fs.mkdirSync(dir, { recursive: true });
  const docs = await db.collection("exercises").find({}).toArray();
  fs.writeFileSync(
    path.join(dir, "exercises.json"),
    EJSON.stringify(docs, undefined, 2),
  );
  console.log(`Backup exercises: ${docs.length} Dokumente -> ${dir}`);
  return dir;
}

async function main(): Promise<void> {
  const client = new MongoClient(dbConfig.URL);
  await client.connect();
  const db = client.db();
  console.log(`Verbunden mit Datenbank "${db.databaseName}".`);
  if (dryRun) console.log("DRY RUN: es wird nichts geaendert.");

  const exercises = db.collection("exercises");

  if (!dryRun) await backup(db);

  let uebersetzt = 0;
  let fehlend = 0;
  for (const f of FRAGEN) {
    const doc = await exercises.findOne({ subject: SUBJECT, imageUrl: f.bild });
    if (!doc) {
      console.log(`  NICHT GEFUNDEN: ${f.bild}`);
      fehlend++;
      continue;
    }
    console.log(`  Uebersetze Aufgabe ${doc._id}: ${f.frage.slice(0, 60)}`);
    if (!dryRun) {
      await exercises.updateOne(
        { _id: doc._id },
        {
          $set: {
            question: f.frage,
            options: options(f),
            instruction: INSTRUCTION,
            updatedAt: new Date(),
          },
        },
      );
    }
    uebersetzt++;
  }
  console.log(
    `${uebersetzt} Aufgabe(n) ${dryRun ? "wuerden uebersetzt" : "uebersetzt"}, ${fehlend} nicht gefunden.`,
  );

  await client.close();
  console.log(dryRun ? "Dry run abgeschlossen." : "Fertig.");
}

main().catch((e) => {
  console.error("Fehlgeschlagen:", e?.message ?? e);
  process.exit(1);
});
