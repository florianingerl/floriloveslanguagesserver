// Legt das Web-Programming-Quiz (Fach "webprogramming") fuer die Sektion
// "Webprogrammierung"/"Website erstellen" an:
//
//   1. ein Quiz-Dokument { website: "web", subject: "webprogramming" },
//   2. das Thema "TypeScript - destructuring expressions" mit dem Medium-
//      Artikel als Tutorial,
//   3. Multiple-Choice-Aufgaben zum Thema, die man loesen kann, nachdem man
//      https://medium.com/@taitasciore/es6-destructuring-in-depth-when-using-typescript-bdf7c899768a
//      gelesen hat.
//
// Als imageUrl bekommt jede Aufgabe das Bild, das im Artikel im jeweiligen
// Absatz angezeigt wird (die Code-Screenshots bzw. das Titelbild).
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

const dryRun = process.argv.includes("--dry-run");

const SUBJECT = "webprogramming";
const TOPIC_TITLE = "TypeScript - destructuring expressions";
const TUTORIAL =
  '<a href="https://medium.com/@taitasciore/es6-destructuring-in-depth-when-using-typescript-bdf7c899768a">Tutorial about destructuring expresions</a>';

// Bilder aus dem Artikel (in Reihenfolge des Erscheinens).
const MIRO = "https://miro.medium.com/v2/resize:fit:1400/";
const BILD_TITEL = MIRO + "1*00N9Hs5KCX9IwNepd7Id4A.jpeg";
const BILD_RES_CODE = MIRO + "1*CyOusrkRxuYbXG0klN2xiw.png";
const BILD_OBJ_DESTR = MIRO + "1*cHp71O-8SQW9R8Q5ABXluA.png";
const BILD_RENAME = MIRO + "1*wj60dY1g_3-3mqRMaLhKAA.png";
const BILD_DEFAULT = MIRO + "1*MVcm13tA_01gTXjOSFtBlA.png";
const BILD_DEFAULT_TYP = MIRO + "1*w9VaZ1qWsm8WycCCwF1gKQ.png";
const BILD_NESTED = MIRO + "1*buZ5Remlz2sL45RSYSrB1g.png";
const BILD_NESTED_TYP = MIRO + "1*1LvRSvwMWuuH2L4tXK4-IQ.png";
const BILD_ARRAY = MIRO + "1*SZJG9ut3NKOki9M7OkUIQw.png";
const BILD_ARRAY_ALT = MIRO + "1*be1xCNDJB6BVXAvrTo9HAA.png";
const BILD_ARRAY_DEFAULT = MIRO + "1*G33u7jQOE-7bUOXI1Vzohg.png";
const BILD_OMIT = MIRO + "1*RS6f8kYA6LeQimG9Jx0Kmw.png";
const BILD_SWAP = MIRO + "1*Doxv126PYAij1GzBB4sUIw.png";

type Option = { option: string; correct: boolean };
type Frage = {
  frage: string;
  // Die erste Option ist die richtige.
  optionen: string[];
  // An welcher Stelle (0..3) die richtige Option stehen soll.
  position: number;
  bild: string;
};

const FRAGEN: Frage[] = [
  {
    frage: "Was bedeutet Destructuring in JavaScript/TypeScript?",
    optionen: [
      "Werte aus Arrays oder Objekten in eigene Variablen entpacken",
      "Werte in Arrays oder Objekten verpacken",
      "Objekte und Arrays tief kopieren",
      "Typen zur Laufzeit pruefen",
    ],
    position: 2,
    bild: BILD_TITEL,
  },
  {
    frage:
      "Warum ist Code wie 'res.id, res.title, res.phoneNumber' unhandlich, und was ist der Vorteil von Objekt-Destructuring?",
    optionen: [
      "Mit Destructuring entpackt man mehrere Eigenschaften in einem Schritt in eigene Variablen",
      "Destructuring verhindert, dass res ueberhaupt Eigenschaften hat",
      "Destructuring macht die Zuweisung laenger und schlechter lesbar",
      "Destructuring entfernt die Eigenschaften dauerhaft aus res",
    ],
    position: 1,
    bild: BILD_RES_CODE,
  },
  {
    frage: "Gegeben ist const { id, title } = res; Was passiert hier?",
    optionen: [
      "id und title werden aus res entpackt und als gleichnamige Variablen angelegt",
      "id und title werden zu neuen Eigenschaften von res",
      "res wird in ein Array [id, title] umgewandelt",
      "id und title werden innerhalb von res umbenannt",
    ],
    position: 3,
    bild: BILD_OBJ_DESTR,
  },
  {
    frage:
      "Wie benennt man beim Objekt-Destructuring die Eigenschaft id beim Entpacken in die Variable identifier um?",
    optionen: [
      "const { id: identifier } = res;",
      "const { id as identifier } = res;",
      "const { id -> identifier } = res;",
      "const { identifier: id } = res;",
    ],
    position: 0,
    bild: BILD_RENAME,
  },
  {
    frage:
      "Wie gibt man beim Objekt-Destructuring einen Standardwert an, wenn phoneNumber fehlen darf?",
    optionen: [
      "const { phoneNumber = '000' } = res;",
      "const { phoneNumber: '000' } = res;",
      "const { phoneNumber || '000' } = res;",
      "const { phoneNumber ?? '000' } = res;",
    ],
    position: 2,
    bild: BILD_DEFAULT,
  },
  {
    frage:
      "Welchen Typ hat phoneNumber, wenn ein Standardwert gesetzt wird: const { phoneNumber = '000' } = res; ?",
    optionen: [
      "string (der Typ ist nicht mehr undefined)",
      "string | undefined",
      "any",
      "undefined",
    ],
    position: 1,
    bild: BILD_DEFAULT_TYP,
  },
  {
    frage:
      "Wie entpackt man die verschachtelte Eigenschaft c aus a.b per Destructuring?",
    optionen: [
      "const { b: { c } } = a;",
      "const { b.c } = a;",
      "const { b, c } = a;",
      "const { b->c } = a;",
    ],
    position: 3,
    bild: BILD_NESTED,
  },
  {
    frage:
      "Wie typisiert man beim Destructuring gleichzeitig die verschachtelte Eigenschaft b?",
    optionen: [
      "const { b }: { b: B } = a;",
      "const { b: B } = a;",
      "const { b } as B = a;",
      "const B { b } = a;",
    ],
    position: 0,
    bild: BILD_NESTED_TYP,
  },
  {
    frage:
      "Gegeben ist const range: [number, number] = [0, 10]; Wie entpackt man beide Werte per Array-Destructuring?",
    optionen: [
      "const [min, max] = range;",
      "const { min, max } = range;",
      "const (min, max) = range;",
      "const [min: max] = range;",
    ],
    position: 2,
    bild: BILD_ARRAY,
  },
  {
    frage:
      "Welcher Code entspricht 'const [min, max] = range;' ohne Destructuring?",
    optionen: [
      "const min = range[0]; const max = range[1];",
      "const min = range.min; const max = range.max;",
      "const min = range(0); const max = range(1);",
      "const min = range.first; const max = range.last;",
    ],
    position: 1,
    bild: BILD_ARRAY_ALT,
  },
  {
    frage:
      "Wie setzt man beim Array-Destructuring einen Standardwert fuer das erste Element und sammelt den Rest?",
    optionen: [
      "const [first = 0, ...rest] = numbers;",
      "const [first: 0, ...rest] = numbers;",
      "const [first || 0, ...rest] = numbers;",
      "const { first = 0, ...rest } = numbers;",
    ],
    position: 3,
    bild: BILD_ARRAY_DEFAULT,
  },
  {
    frage:
      "Wie schliesst man mit Destructuring Eigenschaften (z. B. someProp) aus einem Objekt aus und sammelt den Rest?",
    optionen: [
      "const { someProp, ...restProps } = props;",
      "const { someProp: ...restProps } = props;",
      "const [...restProps, someProp] = props;",
      "const { restProps } = omit(props, someProp);",
    ],
    position: 0,
    bild: BILD_OMIT,
  },
  {
    frage:
      "Wie tauscht man mit Destructuring die Werte zweier Variablen a und b?",
    optionen: [
      "[a, b] = [b, a];",
      "{ a, b } = { b, a };",
      "swap(a, b);",
      "[a, b] = (b, a);",
    ],
    position: 2,
    bild: BILD_SWAP,
  },
];

// Baut die Optionsliste: die erste Option der Frage ist die richtige und wird
// an die Stelle "position" gesetzt; die uebrigen bleiben in ihrer Reihenfolge.
function options(f: Frage): Option[] {
  const richtige = f.optionen[0];
  const falsche = f.optionen.slice(1);
  const liste: Option[] = falsche.map((option) => ({ option, correct: false }));
  const pos = Math.max(0, Math.min(f.position, liste.length));
  liste.splice(pos, 0, { option: richtige, correct: true });
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
