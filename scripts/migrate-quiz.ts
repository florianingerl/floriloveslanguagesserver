// Migriert die bestehenden Daten auf das Quiz-/Buch-Datenmodell:
//
//   1. Backup: Alle betroffenen Collections werden als EJSON-Dateien unter
//      backups/<Zeitstempel>/ gesichert, bevor irgendetwas geaendert wird.
//   2. Fuer jedes Fach (z.B. "deutsch", "nutrition") wird ein Website-Quiz
//      { website: "web", subject } angelegt (falls noch nicht vorhanden).
//   3. Exercise.quiz (frueher ein String, z.B. "deutsch") zeigt danach auf die
//      _id des Quiz-Dokuments, zusaetzlich wird Exercise.subject gesetzt.
//   4. Topic.subject wird gesetzt und Topic.quiz auf die _id des Quiz-Dokuments
//      gesetzt.
//   5. Ein Buchladen ("Flori's German books", Fach "deutsch") wird angelegt und
//      alle Buecher dem Laden zugeordnet.
//   6. Das Beispiel-Buch "Meine erste Geschichte" (Fach "deutsch") mit zwei
//      Quizzen und je fuenf Aufgaben wird nur angelegt, wenn es noch nicht da ist.
//
// Aufruf:  npm run migrate:quiz
//
// Das Skript ist idempotent: Ein zweiter Lauf legt nichts doppelt an.

import { MongoClient, ObjectId, Db } from "mongodb";
import { EJSON } from "bson";
import * as fs from "fs";
import * as path from "path";
import dbConfig from "../src/config/db.config";

// Liest das Fach eines Dokuments: neu aus "subject", alt aus "quiz" (String).
function fachAus(doc: Record<string, unknown>): string | undefined {
  if (typeof doc.subject === "string" && doc.subject) return doc.subject;
  if (typeof doc.quiz === "string" && doc.quiz) return doc.quiz;
  return undefined;
}

// Sichert die Collections als EJSON (erhaelt ObjectId- und Datumstypen).
async function backup(db: Db): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(__dirname, "..", "backups", stamp);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of ["exercises", "topics", "quizzes", "books", "bookstores"]) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(
      path.join(dir, `${name}.json`),
      EJSON.stringify(docs, undefined, 2),
    );
    console.log(`Backup ${name}: ${docs.length} Dokumente`);
  }
  console.log(`Backup liegt unter ${dir}`);
  return dir;
}

async function main(): Promise<void> {
  const client = new MongoClient(dbConfig.URL);
  await client.connect();
  const db = client.db();

  await backup(db);

  const exCol = db.collection("exercises");
  const topicCol = db.collection("topics");
  const quizCol = db.collection("quizzes");

  // 1) Themen lesen und daraus je Thema das Fach ableiten.
  const topics = await topicCol.find({}).toArray();
  const fachJeThema = new Map<string, string>();
  const faecher = new Set<string>();
  for (const t of topics) {
    const fach = fachAus(t as Record<string, unknown>);
    if (!fach) continue;
    fachJeThema.set(String(t._id), fach);
    faecher.add(fach);
  }

  // 2) Aufgaben lesen und Fаecher sammeln (aus Exercise oder ueber das Thema).
  const exercises = await exCol.find({}).toArray();
  for (const e of exercises) {
    const fach =
      fachAus(e as Record<string, unknown>) ??
      fachJeThema.get(String((e as Record<string, unknown>).topic));
    if (fach) faecher.add(fach);
  }

  // 3) Fuer jedes Fach ein Website-Quiz anlegen und die _id merken.
  const quizJeFach = new Map<string, ObjectId>();
  for (const fach of [...faecher].sort()) {
    let quiz = await quizCol.findOne({ website: "web", subject: fach });
    if (!quiz) {
      const now = new Date();
      const eingefuegt = await quizCol.insertOne({
        website: "web",
        subject: fach,
        createdAt: now,
        updatedAt: now,
      });
      quiz = { _id: eingefuegt.insertedId };
      console.log(`Quiz "${fach}" angelegt (${eingefuegt.insertedId}).`);
    }
    quizJeFach.set(fach, quiz._id as ObjectId);
  }

  // 4) Aufgaben umstellen: quiz -> _id, subject setzen.
  let aufgabenGeaendert = 0;
  for (const e of exercises) {
    const doc = e as Record<string, unknown>;
    const fach =
      fachAus(doc) ?? fachJeThema.get(String(doc.topic));
    if (!fach) continue;
    const quizId = quizJeFach.get(fach);
    if (!quizId) continue;
    await exCol.updateOne(
      { _id: doc._id as ObjectId },
      { $set: { quiz: quizId, subject: fach } },
    );
    aufgabenGeaendert++;
  }
  console.log(`${aufgabenGeaendert} Aufgaben migriert.`);

  // 5) Themen umstellen: subject setzen, quiz -> _id.
  let themenGeaendert = 0;
  for (const t of topics) {
    const doc = t as Record<string, unknown>;
    const fach = fachAus(doc);
    if (!fach) continue;
    const quizId = quizJeFach.get(fach);
    if (!quizId) continue;
    await topicCol.updateOne(
      { _id: doc._id as ObjectId },
      { $set: { subject: fach, quiz: quizId } },
    );
    themenGeaendert++;
  }
  console.log(`${themenGeaendert} Themen migriert.`);

  // 6) Buchladen anlegen und den Buechern zuordnen.
  const storeCol = db.collection("bookstores");
  const bookCol = db.collection("books");
  let store = await storeCol.findOne({ subject: "deutsch", website: "web" });
  if (!store) {
    const now = new Date();
    const eingefuegt = await storeCol.insertOne({
      name: "Flori's German books",
      subject: "deutsch",
      website: "web",
      createdAt: now,
      updatedAt: now,
    });
    store = { _id: eingefuegt.insertedId };
    console.log(`Buchladen angelegt (${eingefuegt.insertedId}).`);
  }
  await bookCol.updateMany(
    { store: { $exists: false } },
    { $set: { store: store._id } },
  );

  // 7) Beispiel-Buch anlegen (falls noch nicht vorhanden).
  const vorhandenesBuch = await bookCol.findOne({
    name: "Meine erste Geschichte",
  });
  if (vorhandenesBuch) {
    console.log("Beispiel-Buch existiert bereits, Schritt 7 uebersprungen.");
  } else {
    const now = new Date();
    const quiz1 = await quizCol.insertOne({
      website: "book",
      subject: "deutsch",
      name: "Wortschatz: Sterne",
      createdAt: now,
      updatedAt: now,
    });
    const quiz2 = await quizCol.insertOne({
      website: "book",
      subject: "deutsch",
      name: "Grammatik: Praeteritum",
      createdAt: now,
      updatedAt: now,
    });
    const buch = await bookCol.insertOne({
      name: "Meine erste Geschichte",
      subject: "deutsch",
      paragraphs: [
        "<p>Es war einmal ein kleiner Junge, der jeden Abend am Fenster stand und die Sterne zaehlte. Er fragte sich, ob die Sterne wohl zurueckzaehlten, wenn er sie ansah.</p>",
        "<p>Eines Tages fand er ein altes Buch in der Bibliothek seiner Grossmutter. Auf der ersten Seite stand nur ein einziger Satz: &bdquo;Wer erzaehlt, der lebt zweimal.&ldquo;</p>",
        "<p>Von diesem Moment an begann er, jeden Tag eine kleine Geschichte zu schreiben. Und mit jeder Geschichte wurde seine Welt ein bisschen groesser.</p>",
      ],
      quizzes: [quiz1.insertedId, quiz2.insertedId],
      store: store._id,
      createdAt: now,
      updatedAt: now,
    });
    // Buchrucksprung auf den Quizzen.
    await quizCol.updateMany(
      { _id: { $in: [quiz1.insertedId, quiz2.insertedId] } },
      { $set: { book: buch.insertedId } },
    );

    const aufgaben1: [string, string[], number][] = [
      ["Was zaehlte der Junge am Fenster?", ["Sterne", "Schafe", "Wolken"], 0],
      ["Wie fuehlte sich der Junge, wenn er schrieb?", ["traurig", "gluecklich", "muede"], 1],
      ["Wie alt war das Buch?", ["brandneu", "alt", "leer"], 1],
      ["Wo hatte der Junge sein Buch gefunden?", ["Bibliothek", "Keller", "Garten"], 0],
      ["Was wuchs mit jeder Geschichte?", ["seine Angst", "seine Welt", "sein Hunger"], 1],
    ];
    const aufgaben2: [string, string[], number][] = [
      ["Der Junge ___ jeden Abend am Fenster.", ["stand", "steht", "stehen"], 0],
      ["Er ___ ein altes Buch.", ["findet", "fand", "finden"], 1],
      ["Seine Welt ___ groesser.", ["wurde", "werden", "wird"], 0],
      ["Er ___ die Sterne.", ["zaehlt", "zaehlte", "zaehlen"], 1],
      ["Am Abend ___ er am Fenster.", ["steht", "stand", "stehen"], 1],
    ];

    async function aufgabenEinlegen(
      quizId: ObjectId,
      liste: [string, string[], number][],
    ): Promise<void> {
      for (const [frage, optionen, richtig] of liste) {
        await exCol.insertOne({
          quiz: quizId,
          subject: "deutsch",
          type: "multipleChoice",
          imageUrl: "",
          instruction: "Waehle die richtige Antwort.",
          question: frage,
          options: optionen.map((option, index) => ({
            option,
            correct: index === richtig,
          })),
          sentences: [],
          guessedSentences: [],
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await aufgabenEinlegen(quiz1.insertedId, aufgaben1);
    await aufgabenEinlegen(quiz2.insertedId, aufgaben2);
    console.log(
      `Beispiel-Buch angelegt (${buch.insertedId}) mit Quizzen ${quiz1.insertedId} und ${quiz2.insertedId}.`,
    );
  }

  await client.close();
  console.log("Migration abgeschlossen.");
}

main().catch((e) => {
  console.error("Migration fehlgeschlagen:", e?.message ?? e);
  process.exit(1);
});
