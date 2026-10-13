// Legt das Mathematik-Quiz (Fach "mathematics") fuer die Uni-Mathe-Sektion an:
//
//   1. ein Quiz-Dokument { website: "web", subject: "mathematics" },
//   2. das Thema "Gruppen" mit dem Wikipedia-Artikel als Tutorial,
//   3. Multiple-Choice-Aufgaben zum Thema "Gruppen", die man loesen kann,
//      nachdem man https://de.wikipedia.org/wiki/Gruppe_(Mathematik) gelesen
//      hat.
//
// Als Bild dient bei den meisten Aufgaben das Bild oben im Artikel (ein
// Wuerfel); bei den Aufgaben zu zyklischen Gruppen das Bild aus dem Abschnitt
// "Zyklische Gruppen".
//
// Der Lauf ist idempotent: Quiz und Thema werden wiederverwendet, Aufgaben nur
// angelegt, wenn es noch keine mit derselben Frage im Fach gibt.
//
// Vor dem Schreiben werden quizzes, topics und exercises als EJSON gesichert.
//
// Aufruf (Produktions-Verbindung aus MONGODB_URL in .env.production):
//   NODE_ENV=production npx ts-node scripts/add-math-quiz.ts --dry-run
//   NODE_ENV=production npx ts-node scripts/add-math-quiz.ts
//
// Mit --dry-run wird nur gelesen; es wird nichts geaendert.

import { MongoClient, Db, ObjectId } from "mongodb";
import { EJSON } from "bson";
import * as fs from "fs";
import * as path from "path";
import dbConfig from "../src/config/db.config";

const dryRun = process.argv.includes("--dry-run");

const SUBJECT = "mathematics";
const TOPIC_TITLE = "Gruppen";
const TUTORIAL =
  '<a href="https://de.wikipedia.org/wiki/Gruppe_(Mathematik)">Wikipedia-Artikel \u00fcber Gruppen</a>';

// Bild oben im Artikel "Gruppe (Mathematik)" (ein Wuerfel) und das Bild im
// Abschnitt "Zyklische Gruppen".
const BILD_WUERFEL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Rubik%27s_cube.svg/500px-Rubik%27s_cube.svg.png";
const BILD_ZYKLISCH =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Cyclic_group.svg/500px-Cyclic_group.svg.png";

type Option = { option: string; correct: boolean };
type Frage = { frage: string; optionen: string[]; richtig: number; bild: string };

// Die erste Option ist jeweils die richtige; sie wird beim Anlegen an die
// Stelle "richtig" verschoben, damit die Loesung nicht immer vorne steht.
const FRAGEN: Frage[] = [
  {
    frage: "Welche Eigenschaft verlangt die Definition einer Gruppe NICHT?",
    optionen: [
      "Kommutativit\u00e4t (a \u00b7 b = b \u00b7 a)",
      "Assoziativit\u00e4t",
      "Ein neutrales Element",
      "Inverse Elemente",
    ],
    richtig: 0,
    bild: BILD_WUERFEL,
  },
  {
    frage: "Welche der folgenden Strukturen ist bez\u00fcglich der angegebenen Verkn\u00fcpfung eine Gruppe?",
    optionen: ["(\u2124, +)", "(\u2115, +)", "(\u2124, \u00b7)", "(\u2115, \u00b7)"],
    richtig: 0,
    bild: BILD_WUERFEL,
  },
  {
    frage: "Warum ist (\u2124, \u00b7) keine Gruppe?",
    optionen: [
      "Weil 0 in \u2124 kein Inverses hat",
      "Weil die Multiplikation nicht assoziativ ist",
      "Weil es kein neutrales Element gibt",
      "Weil \u2124 nicht abgeschlossen ist",
    ],
    richtig: 0,
    bild: BILD_WUERFEL,
  },
  {
    frage: "Was bezeichnet man als Ordnung einer endlichen Gruppe?",
    optionen: [
      "Die Anzahl ihrer Elemente",
      "Die Anzahl ihrer Erzeuger",
      "Das neutrale Element",
      "Die Anzahl ihrer Untergruppen",
    ],
    richtig: 0,
    bild: BILD_WUERFEL,
  },
  {
    frage: "Welche Aussage \u00fcber das neutrale Element e einer Gruppe gilt?",
    optionen: [
      "e \u00b7 a = a \u00b7 e = a f\u00fcr alle Elemente a",
      "e \u00b7 a = e f\u00fcr alle Elemente a",
      "Jedes Element ist sein eigenes Inverses",
      "e ist immer das gr\u00f6\u00dfte Element",
    ],
    richtig: 0,
    bild: BILD_WUERFEL,
  },
  {
    frage: "Wie hei\u00dfen Gruppen, in denen a \u00b7 b = b \u00b7 a f\u00fcr alle Elemente gilt?",
    optionen: [
      "abelsch (kommutativ)",
      "zyklisch",
      "assoziativ",
      "transitiv",
    ],
    richtig: 0,
    bild: BILD_WUERFEL,
  },
  {
    frage: "Was ist das Inverse eines Elements a in einer Gruppe?",
    optionen: [
      "Ein Element b mit a \u00b7 b = b \u00b7 a = e",
      "Ein Element b mit a \u00b7 b = a",
      "Immer a selbst",
      "Das neutrale Element",
    ],
    richtig: 0,
    bild: BILD_WUERFEL,
  },
  {
    frage:
      "Die Drehungen eines Zauberw\u00fcrfels bilden bez\u00fcglich der Hintereinanderausf\u00fchrung eine Gruppe. Was ist dabei das neutrale Element?",
    optionen: [
      "Die Drehung um 0 Grad (nichts tun)",
      "Die Drehung um 90 Grad",
      "Die Drehung um 180 Grad",
      "Das Spiegeln des W\u00fcrfels",
    ],
    richtig: 0,
    bild: BILD_WUERFEL,
  },
  {
    frage: "Was ist eine zyklische Gruppe?",
    optionen: [
      "Eine Gruppe, die von einem einzigen Element erzeugt wird",
      "Eine Gruppe, in der jede Ordnung vorkommt",
      "Eine Gruppe ohne neutrales Element",
      "Eine Gruppe mit unendlich vielen Erzeugern",
    ],
    richtig: 0,
    bild: BILD_ZYKLISCH,
  },
  {
    frage: "Von welchen Elementen wird die Gruppe (\u2124, +) erzeugt?",
    optionen: [
      "Von 1 (und \u22121)",
      "Von 0",
      "Von 2 (und \u22122)",
      "Von keinem Element",
    ],
    richtig: 0,
    bild: BILD_ZYKLISCH,
  },
  {
    frage: "Welche endliche Gruppe ist isomorph zur zyklischen Gruppe der Ordnung n?",
    optionen: [
      "(\u2124/n\u2124, +)",
      "(\u2124, +)",
      "(\u211a, +)",
      "Die symmetrische Gruppe S\u2099",
    ],
    richtig: 0,
    bild: BILD_ZYKLISCH,
  },
  {
    frage:
      "Die sechsten komplexen Einheitswurzeln (siehe Bild) bilden eine Gruppe. Welche?",
    optionen: [
      "Eine zyklische Gruppe der Ordnung 6",
      "Eine Gruppe der Ordnung 3",
      "Eine Gruppe ohne neutrales Element",
      "Eine nicht-abelsche Gruppe",
    ],
    richtig: 0,
    bild: BILD_ZYKLISCH,
  },
  {
    frage: "Welche Aussage \u00fcber Untergruppen einer zyklischen Gruppe gilt?",
    optionen: [
      "Jede Untergruppe einer zyklischen Gruppe ist wieder zyklisch",
      "Nur die triviale Untergruppe ist zyklisch",
      "Jede Untergruppe ist nicht-abelsch",
      "Eine zyklische Gruppe hat keine Untergruppen",
    ],
    richtig: 0,
    bild: BILD_ZYKLISCH,
  },
  {
    frage: "Ist jede zyklische Gruppe abelsch?",
    optionen: ["Ja", "Nein", "Nur die endlichen", "Nur die unendlichen"],
    richtig: 0,
    bild: BILD_ZYKLISCH,
  },
];

// Baut die Optionsliste so, dass die richtige Option an der Stelle "richtig"
// steht und die uebrigen in ihrer Reihenfolge folgen.
function options(f: Frage): Option[] {
  const falsche = f.optionen.filter((_, i) => i !== f.richtig);
  const liste = falsche.map((option) => ({ option, correct: false }));
  liste.splice(f.richtig, 0, { option: f.optionen[f.richtig], correct: true });
  return liste;
}

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
      name: "Mathematics",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    console.log(`Quiz "${SUBJECT}" angelegt: ${res.insertedId}`);
    quiz = await quizzes.findOne({ _id: res.insertedId });
  }
  const quizId: ObjectId = (quiz?._id as ObjectId) ?? new ObjectId();

  // 2) Thema "Gruppen"
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
      instruction: "W\u00e4hle die richtige Antwort.",
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
