// Legt das Web-Programming-Quiz (Fach "webprogramming") fuer die Sektion
// "Webprogrammierung"/"Website erstellen" an:
//
//   1. ein Quiz-Dokument { website: "web", subject: "webprogramming" },
//   2. das Thema "TypeScript - destructuring expressions" mit dem Medium-
//      Artikel als Tutorial,
//   3. Multiple-Choice-Aufgaben zum Thema (englisch), die man loesen kann,
//      nachdem man
//      https://medium.com/@taitasciore/es6-destructuring-in-depth-when-using-typescript-bdf7c899768a
//      gelesen hat.
//
// Der Inhalt der Aufgaben steht in scripts/webprogramming-exercises.ts. Als
// imageUrl bekommt jede Aufgabe das Bild, das im Artikel im jeweiligen Absatz
// angezeigt wird (die Code-Screenshots bzw. das Titelbild).
//
// Der Lauf ist idempotent: Quiz und Thema werden wiederverwendet, Aufgaben nur
// angelegt, wenn es noch keine mit derselben Frage im Fach gibt.
//
// Vor dem Schreiben werden quizzes, topics und exercises als EJSON gesichert.
//
// Aufruf (Produktions-Verbindung aus MONGODB_URL in .env.production):
//   NODE_ENV=production npx ts-node scripts/add-webprogramming-quiz.ts --dry-run
//   NODE_ENV=production npx ts-node scripts/add-webprogramming-quiz.ts
//
// Mit --dry-run wird nur gelesen; es wird nichts geaendert.

import { MongoClient, Db, ObjectId } from "mongodb";
import { EJSON } from "bson";
import * as fs from "fs";
import * as path from "path";
import dbConfig from "../src/config/db.config";
import { FRAGEN, INSTRUCTION, options } from "./webprogramming-exercises";

const dryRun = process.argv.includes("--dry-run");

const SUBJECT = "webprogramming";
const TOPIC_TITLE = "TypeScript - destructuring expressions";
const TUTORIAL =
  '<a href="https://medium.com/@taitasciore/es6-destructuring-in-depth-when-using-typescript-bdf7c899768a">Tutorial about destructuring expresions</a>';

async function backup(db: Db): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(__dirname, "..", "backups", stamp);
  fs.mkdirSync(dir, { recursive: true });
  for (const col of ["quizzes", "topics", "exercises"]) {
    const docs = await db.collection(col).find({}).toArray();
    fs.writeFileSync(
      path.join(dir, `${col}.json`),
      EJSON.stringify(docs, undefined, 2),
    );
    console.log(`Backup ${col}: ${docs.length} Dokumente`);
  }
  console.log(`Backup-Verzeichnis: ${dir}`);
  return dir;
}

async function main(): Promise<void> {
  const client = new MongoClient(dbConfig.URL);
  await client.connect();
  const db = client.db();
  console.log(`Verbunden mit Datenbank "${db.databaseName}".`);
  if (dryRun) console.log("DRY RUN: es wird nichts geaendert.");

  if (!dryRun) await backup(db);

  // 1) Quiz-Dokument
  const quizzes = db.collection("quizzes");
  let quiz = await quizzes.findOne({ website: "web", subject: SUBJECT });
  if (quiz) {
    console.log(`Quiz "${SUBJECT}" vorhanden: ${quiz._id}`);
  } else if (dryRun) {
    console.log(`Quiz "${SUBJECT}" wuerde angelegt (website="web").`);
  } else {
    const res = await quizzes.insertOne({
      website: "web",
      subject: SUBJECT,
      name: "Web programming",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    console.log(`Quiz "${SUBJECT}" angelegt: ${res.insertedId}`);
    quiz = await quizzes.findOne({ _id: res.insertedId });
  }
  const quizId: ObjectId = (quiz?._id as ObjectId) ?? new ObjectId();

  // 2) Thema "TypeScript - destructuring expressions"
  const topics = db.collection("topics");
  let topic = await topics.findOne({ subject: SUBJECT, title: TOPIC_TITLE });
  if (topic) {
    if (topic.tutorial !== TUTORIAL) {
      console.log(`Tutorial des Themas "${TOPIC_TITLE}" wird aktualisiert.`);
      if (!dryRun) {
        await topics.updateOne(
          { _id: topic._id },
          { $set: { tutorial: TUTORIAL, quiz: quizId } },
        );
      }
    } else {
      console.log(`Thema "${TOPIC_TITLE}" vorhanden: ${topic._id}`);
    }
  } else if (dryRun) {
    console.log(`Thema "${TOPIC_TITLE}" wuerde angelegt.`);
  } else {
    const res = await topics.insertOne({
      subject: SUBJECT,
      title: TOPIC_TITLE,
      tutorial: TUTORIAL,
      quiz: quizId,
    } as any);
    console.log(`Thema "${TOPIC_TITLE}" angelegt: ${res.insertedId}`);
    topic = await topics.findOne({ _id: res.insertedId });
  }
  const topicId: ObjectId = (topic?._id as ObjectId) ?? new ObjectId();

  // 3) Aufgaben
  const exercises = db.collection("exercises");
  let angelegt = 0;
  let uebersprungen = 0;
  for (const f of FRAGEN) {
    const vorhanden = await exercises.findOne({
      subject: SUBJECT,
      question: f.frage,
    });
    if (vorhanden) {
      uebersprungen++;
      continue;
    }
    if (dryRun) {
      console.log(`  Aufgabe wuerde angelegt: ${f.frage.slice(0, 60)}`);
      angelegt++;
      continue;
    }
    await exercises.insertOne({
      quiz: quizId,
      subject: SUBJECT,
      type: "multipleChoice",
      imageUrl: f.bild,
      topic: topicId,
      instruction: INSTRUCTION,
      question: f.frage,
      options: options(f),
      optionsEn: [],
      optionsFr: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    angelegt++;
  }
  console.log(
    `${angelegt} Aufgabe(n) ${dryRun ? "wuerden angelegt" : "angelegt"}, ${uebersprungen} uebersprungen (bereits vorhanden).`,
  );

  await client.close();
  console.log(dryRun ? "Dry run abgeschlossen." : "Fertig.");
}

main().catch((e) => {
  console.error("Fehlgeschlagen:", e?.message ?? e);
  process.exit(1);
});
