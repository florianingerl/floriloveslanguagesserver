// Legt fuer das Informatik-Quiz (subject "informatics") das Thema
// "UML - Activity diagrams" mit englischem Tutorial und Multiple-Choice-
// Aufgaben an. Die Aufgaben sind loesbar, wenn man den englischsprachigen
// Wikipedia-Artikel ueber Activity diagrams gelesen hat:
//   https://en.wikipedia.org/wiki/Activity_diagram
//
// Der Artikel zeigt nur ein Bild: das erste Bild des Artikels (ein UML-1.x-
// Aktivit\u00e4tsdiagramm fuer einen Brainstorming-Prozess). Dieses Bild wird
// fuer alle Aufgaben als imageUrl verwendet.
//
// Alles, was in die Datenbank geschrieben wird, ist auf Englisch.
//
// Der Lauf ist idempotent: Quiz und Thema werden wiederverwendet bzw. angelegt,
// Aufgaben nur, wenn es noch keine mit derselben Frage im Fach gibt.
//
// Aufruf auf dem Server (dort ist die Datenbank erreichbar):
//   node scripts/add-informatik-uml-activity-diagrams.cjs --dry-run
//   node scripts/add-informatik-uml-activity-diagrams.cjs

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const URL =
  process.env.MONGODB_URL ?? "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";
const SUBJECT = "informatics";
const OWNER_EMAIL = "imelflorianingerl@gmail.com";

const TITLE = "UML - Activity diagrams";

const TUTORIAL =
  '<a href="https://en.wikipedia.org/wiki/Activity_diagram">Wikipedia artice on activity diagrams</a>';

const INSTRUCTION = "Choose the correct answer.";

// Das erste (und einzige) Bild des Artikels.
const FIRST_PICTURE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Activity_conducting.svg/500px-Activity_conducting.svg.png";

// Jede Aufgabe: der Abschnitt des Artikels, die Frage, die richtige Antwort
// zuerst, danach die falschen Antworten.
const EXERCISES = [
  {
    abschnitt: "Intro (erstes Bild)",
    question:
      "Which UML version does the activity diagram for a guided brainstorming process at the top of the article belong to?",
    optionen: ["UML 1.x", "UML 2.x", "UML 3.0", "SysML"],
  },
  {
    abschnitt: "Intro",
    question:
      "Which two kinds of processes are activity diagrams intended to model?",
    optionen: [
      "computational and organizational processes",
      "reactive and real-time processes",
      "sequential and recursive processes",
      "data and state processes",
    ],
  },
  {
    abschnitt: "Intro",
    question:
      "Besides primarily showing the overall control flow, what can activity diagrams also include elements showing?",
    optionen: [
      "the data flow between activities through data stores",
      "the structure of classes",
      "the inheritance hierarchy",
      "the deployment of components",
    ],
  },
  {
    abschnitt: "Intro",
    question:
      "Which semantics were the UML 2.x activity diagrams reformalized to be based on?",
    optionen: [
      "Petri net-like semantics",
      "state machine semantics",
      "queueing theory",
      "graph theory",
    ],
  },
  {
    abschnitt: "Construction",
    question:
      "In activity diagrams, what do stadia (rounded rectangles) represent?",
    optionen: ["actions", "decisions", "joins", "initial nodes"],
  },
  {
    abschnitt: "Construction",
    question: "In activity diagrams, what do diamonds represent?",
    optionen: [
      "decisions",
      "actions",
      "concurrent activities",
      "final nodes",
    ],
  },
  {
    abschnitt: "Construction",
    question: "In activity diagrams, what do bars represent?",
    optionen: [
      "the start (split) or end (join) of concurrent activities",
      "decisions",
      "actions",
      "data stores",
    ],
  },
  {
    abschnitt: "Construction",
    question:
      "In activity diagrams, what does a black circle represent?",
    optionen: [
      "the start (initial node) of the workflow",
      "the end (final node)",
      "a decision",
      "an action",
    ],
  },
  {
    abschnitt: "Construction",
    question:
      "In activity diagrams, what does an encircled black circle represent?",
    optionen: [
      "the end (final node)",
      "the start (initial node)",
      "a split",
      "a data store",
    ],
  },
  {
    abschnitt: "Construction",
    question:
      "What do the arrows in an activity diagram represent?",
    optionen: [
      "the order in which activities happen",
      "the data stored in nodes",
      "the message flow between actors",
      "the classes involved",
    ],
  },
  {
    abschnitt: "Construction",
    question:
      "Activity diagrams can be regarded as a form of a structured flowchart combined with a ...",
    optionen: [
      "traditional data flow diagram",
      "state diagram",
      "class diagram",
      "use case diagram",
    ],
  },
  {
    abschnitt: "Construction",
    question:
      "Typical flowchart techniques lack constructs for expressing ...",
    optionen: ["concurrency", "loops", "decisions", "data"],
  },
  {
    abschnitt: "Construction",
    question:
      "In UML 1.x, activity diagrams were a specialized form of which diagram?",
    optionen: [
      "state diagram",
      "sequence diagram",
      "component diagram",
      "deployment diagram",
    ],
  },
  {
    abschnitt: "Construction (UML 2.x)",
    question:
      "UML 2.x activity diagrams can be used in various domains, e.g. in the design of ...",
    optionen: [
      "embedded systems",
      "databases",
      "user interfaces",
      "compilers",
    ],
  },
];

const dryRun = process.argv.includes("--dry-run");

function options(liste) {
  return liste.map((option, i) => ({ option, correct: i === 0 }));
}

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

  const quiz = await db
    .collection("quizzes")
    .findOne({ website: "web", subject: SUBJECT });
  if (!quiz) throw new Error(`Kein Quiz mit subject "${SUBJECT}" gefunden.`);
  const quizId = quiz._id;
  console.log(`Quiz "${SUBJECT}": ${quizId}`);

  const owner = await db.collection("users").findOne({ email: OWNER_EMAIL });
  if (!owner) throw new Error(`Kein Benutzer mit E-Mail ${OWNER_EMAIL} gefunden.`);
  const ownerId = owner._id;
  console.log(`Besitzer: ${ownerId} (${OWNER_EMAIL})`);

  const topics = db.collection("topics");
  let topic = await topics.findOne({ subject: SUBJECT, title: TITLE });
  if (topic) {
    console.log(`Thema vorhanden: ${topic._id}`);
    if (topic.tutorial !== TUTORIAL && !dryRun) {
      await topics.updateOne(
        { _id: topic._id },
        { $set: { tutorial: TUTORIAL, quiz: quizId, user: ownerId, updatedAt: new Date() } },
      );
      console.log("Tutorial aktualisiert.");
    }
  } else if (dryRun) {
    console.log(`Thema wuerde angelegt: "${TITLE}"`);
  } else {
    const res = await topics.insertOne({
      subject: SUBJECT,
      title: TITLE,
      tutorial: TUTORIAL,
      quiz: quizId,
      user: ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    topic = await topics.findOne({ _id: res.insertedId });
    console.log(`Thema angelegt: ${res.insertedId}`);
  }
  const topicId = topic ? topic._id : null;

  const exercises = db.collection("exercises");
  let angelegt = 0;
  let uebersprungen = 0;
  for (const ex of EXERCISES) {
    const vorhanden = await exercises.findOne({ subject: SUBJECT, question: ex.question });
    if (vorhanden) {
      uebersprungen++;
      continue;
    }
    if (dryRun) {
      console.log(`  wuerde anlegen [${ex.abschnitt}]: ${ex.question}`);
      angelegt++;
      continue;
    }
    await exercises.insertOne({
      quiz: quizId,
      subject: SUBJECT,
      type: "multipleChoice",
      imageUrl: FIRST_PICTURE,
      topic: topicId,
      user: ownerId,
      instruction: INSTRUCTION,
      question: ex.question,
      options: options(ex.optionen),
      optionsEn: [],
      optionsFr: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    angelegt++;
  }
  console.log(
    `${angelegt} Aufgabe(n) ${dryRun ? "wuerden angelegt" : "angelegt"}, ${uebersprungen} uebersprungen (bereits vorhanden).`,
  );

  await client.close();
  console.log(dryRun ? "Dry run abgeschlossen." : "Fertig.");
}

main().catch((e) => {
  console.error("Fehlgeschlagen:", e && e.message ? e.message : e);
  process.exit(1);
});