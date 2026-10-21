// Legt allgemeine Multiple-Choice-Aufgaben zum Web-Programming-Quiz (Fach
// "webprogramming") an. Die Inhalte beruhen auf den allgemeinen Web-Themen aus
// dem Chat von heute (CSS white-space, CSS cursor, Links/Buttons/Accessibility)
// und stehen in scripts/webprogramming-chat-exercises.ts.
//
// Der Lauf ist idempotent: Quiz und Themen werden wiederverwendet, Aufgaben nur
// angelegt, wenn es noch keine mit derselben Frage im Fach gibt.
//
// Besitzer jeder Aufgabe wird der Benutzer mit der E-Mail
// imelflorianingerl@gmail.com (siehe ADMIN_E_MAIL in src/helpers/ownership.ts).
//
// Vor dem Schreiben werden quizzes, topics und exercises als EJSON gesichert.
//
// Aufruf (Produktions-Verbindung aus MONGODB_URL in .env.production):
//   NODE_ENV=production npx ts-node scripts/add-webprogramming-chat-exercises.ts --dry-run
//   NODE_ENV=production npx ts-node scripts/add-webprogramming-chat-exercises.ts
//
// Mit --dry-run wird nur gelesen; es wird nichts geaendert.

import { MongoClient, Db, ObjectId } from "mongodb";
import { EJSON } from "bson";
import * as fs from "fs";
import * as path from "path";
import dbConfig from "../src/config/db.config";
import { FRAGEN, INSTRUCTION, THEMEN, options } from "./webprogramming-chat-exercises";

const dryRun = process.argv.includes("--dry-run");

const SUBJECT = "webprogramming";

// Der Besitzer jeder Aufgabe. Entspricht ADMIN_E_MAIL aus
// src/helpers/ownership.ts (dort bewusst nicht importiert, weil dieser Import
// das Mongoose-Modell und damit eine DB-Verbindung mitziehen wuerde).
const ADMIN_E_MAIL = "imelflorianingerl@gmail.com";

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

  // 0) Besitzer ermitteln: der Benutzer mit der Admin-E-Mail.
  const besitzerDoc = await db
    .collection("users")
    .findOne({ email: ADMIN_E_MAIL }, { projection: { _id: 1 } });
  if (!besitzerDoc) {
    throw new Error(
      `Benutzer mit E-Mail "${ADMIN_E_MAIL}" wurde nicht gefunden.`,
    );
  }
  const besitzerId = besitzerDoc._id as ObjectId;
  console.log(`Besitzer: ${ADMIN_E_MAIL} (${besitzerId}).`);

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

  // 2) Themen anlegen (oder wiederverwenden).
  const topics = db.collection("topics");
  const topicIds = new Map<string, ObjectId>();
  for (const t of THEMEN) {
    let topic = await topics.findOne({ subject: SUBJECT, title: t.titel });
    if (topic) {
      console.log(`Thema "${t.titel}" vorhanden: ${topic._id}`);
      if (!dryRun && topic.tutorial !== t.tutorial) {
        await topics.updateOne(
          { _id: topic._id },
          { $set: { tutorial: t.tutorial, quiz: quizId } },
        );
      }
    } else if (dryRun) {
      console.log(`Thema "${t.titel}" wuerde angelegt.`);
      topic = { _id: new ObjectId() } as any;
    } else {
      const res = await topics.insertOne({
        subject: SUBJECT,
        title: t.titel,
        tutorial: t.tutorial,
        quiz: quizId,
        user: besitzerId,
      } as any);
      console.log(`Thema "${t.titel}" angelegt: ${res.insertedId}`);
      topic = { _id: res.insertedId } as any;
    }
    topicIds.set(t.titel, topic!._id as ObjectId);
  }

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
    const topicId = topicIds.get(f.thema);
    if (!topicId) {
      throw new Error(`Kein Thema fuer Aufgabe "${f.frage}" gefunden.`);
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
      user: besitzerId,
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
