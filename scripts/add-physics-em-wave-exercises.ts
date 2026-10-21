// Legt Multiple-Choice-Aufgaben zu "Elektromagnetische Wellen" (Fach "physics",
// Quiz "Physics") an. Die Inhalte beruhen auf den Fragen und Antworten des
// Chats zu EMF (Helmholtzgleichung, TM/TE/TEM, Dispersionsrelation,
// Grenzbedingungen, homogen/linear/isotrop, Eigenwertgleichung, Grenzfrequenz,
// magnetische Wand, Besselfunktionen). Sie stehen in
// scripts/physics-em-wave-exercises.ts.
//
// Das Thema wird als Topic mit dem Praefix "RWTH Aachen - " und dem Titel
// "Elektromagnetische Wellen" angelegt bzw. wiederverwendet.
//
// Der Lauf ist idempotent: Quiz und Thema werden wiederverwendet, Aufgaben nur
// angelegt, wenn es noch keine mit derselben Frage im Fach gibt.
//
// Besitzer jeder Aufgabe wird der Benutzer mit der E-Mail
// imelflorianingerl@gmail.com (siehe ADMIN_E_MAIL in src/helpers/ownership.ts).
//
// Vor dem Schreiben werden quizzes, topics und exercises als EJSON gesichert.
//
// Aufruf (Produktions-Verbindung aus MONGODB_URL in .env.production):
//   NODE_ENV=production npx ts-node scripts/add-physics-em-wave-exercises.ts --dry-run
//   NODE_ENV=production npx ts-node scripts/add-physics-em-wave-exercises.ts
//
// Mit --dry-run wird nur gelesen; es wird nichts geaendert.

import { MongoClient, Db, ObjectId } from "mongodb";
import { EJSON } from "bson";
import * as fs from "fs";
import * as path from "path";
import dbConfig from "../src/config/db.config";
import { FRAGEN, INSTRUCTION, options } from "./physics-em-wave-exercises";

const dryRun = process.argv.includes("--dry-run");

const SUBJECT = "physics";
const TOPIC_TITLE = "RWTH Aachen - Elektromagnetische Wellen";
const TUTORIAL =
  '<h2>RWTH Aachen &ndash; Elektromagnetische Wellen</h2>\n' +
  "<p>Dieses Thema fasst die zentralen Fachbegriffe der Vorlesung " +
  "&bdquo;Elektrodynamik &ndash; Elektromagnetische Wellen&ldquo; zusammen.</p>\n" +
  "<p>Die Aufgaben beruhen auf den Erklaerungen der folgenden Wikipedia-Artikel:</p>\n" +
  "<ul>\n" +
  '<li><a href="https://de.wikipedia.org/wiki/Helmholtz-Gleichung">Helmholtz-Gleichung</a></li>\n' +
  '<li><a href="https://de.wikipedia.org/wiki/Elektromagnetische_Welle">Elektromagnetische Welle</a></li>\n' +
  '<li><a href="https://de.wikipedia.org/wiki/Transversalelektromagnetische_Welle">TEM-Welle</a></li>\n' +
  '<li><a href="https://de.wikipedia.org/wiki/Wellenleiter">Wellenleiter / Hohlleiter</a></li>\n' +
  '<li><a href="https://de.wikipedia.org/wiki/Wellenvektor">Wellenvektor</a></li>\n' +
  '<li><a href="https://de.wikipedia.org/wiki/Dispersionsrelation">Dispersionsrelation</a></li>\n' +
  '<li><a href="https://de.wikipedia.org/wiki/Grenzfrequenz">Grenzfrequenz</a></li>\n' +
  '<li><a href="https://de.wikipedia.org/wiki/Poynting-Vektor">Poynting-Vektor</a></li>\n' +
  '<li><a href="https://de.wikipedia.org/wiki/Besselsche_Differentialgleichung">Besselsche Funktionen</a></li>\n' +
  "</ul>";

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

  // 1) Quiz-Dokument (Fach "physics")
  const quizzes = db.collection("quizzes");
  const quiz = await quizzes.findOne({ website: "web", subject: SUBJECT });
  if (!quiz) {
    throw new Error(`Quiz "${SUBJECT}" wurde nicht gefunden.`);
  }
  const quizId = quiz._id as ObjectId;
  console.log(`Quiz "${SUBJECT}" gefunden: ${quizId}`);

  // 2) Thema "RWTH Aachen - Elektromagnetische Wellen" anlegen oder verwenden.
  const topics = db.collection("topics");
  let topic = await topics.findOne({ subject: SUBJECT, title: TOPIC_TITLE });
  if (topic) {
    console.log(`Thema "${TOPIC_TITLE}" vorhanden: ${topic._id}`);
  } else if (dryRun) {
    console.log(`Thema "${TOPIC_TITLE}" wuerde angelegt.`);
    topic = { _id: new ObjectId() } as any;
  } else {
    const res = await topics.insertOne({
      subject: SUBJECT,
      title: TOPIC_TITLE,
      tutorial: TUTORIAL,
      quiz: quizId,
      user: besitzerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    console.log(`Thema "${TOPIC_TITLE}" angelegt: ${res.insertedId}`);
    topic = { _id: res.insertedId } as any;
  }
  const topicId = topic!._id as ObjectId;

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
      console.log(`  uebersprungen (vorhanden): ${f.frage.slice(0, 60)}`);
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
