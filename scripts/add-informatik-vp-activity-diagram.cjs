// Legt fuer das Informatik-Quiz (subject "informatics") weitere englische
// Multiple-Choice-Aufgaben zum Thema "UML - Activity diagrams" an, die auf
// dem Artikel "What is Activity Diagram?" von Visual Paradigm beruhen:
//   https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-activity-diagram/
//
// Pro Abschnitt des Artikels wird eine Aufgabe angelegt. exercise.imageUrl ist
// das Bild, das in diesem Abschnitt angezeigt wird. Abschnitte ohne eigenes
// Bild bekommen das erste Bild des Artikels (what-is-activity-diagram.png).
//
// Zusaetzlich wird der Tutorial-Link des Themas aktualisiert: Er enthaelt ab
// jetzt zwei Links - den Wikipedia-Artikel und den Visual-Paradigm-Artikel.
//
// Alles, was in die Datenbank geschrieben wird, ist auf Englisch.
//
// Der Lauf ist idempotent: Quiz und Thema werden wiederverwendet, Aufgaben nur
// angelegt, wenn es noch keine mit derselben Frage im Fach gibt.
//
// Aufruf auf dem Server (dort ist die Datenbank erreichbar):
//   node scripts/add-informatik-vp-activity-diagram.cjs --dry-run
//   node scripts/add-informatik-vp-activity-diagram.cjs

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const URL =
  process.env.MONGODB_URL ?? "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";
const SUBJECT = "informatics";
const OWNER_EMAIL = "imelflorianingerl@gmail.com";

const TITLE = "UML - Activity diagrams";

// Der Tutorial-Link enthaelt jetzt zwei Links: Wikipedia und Visual Paradigm.
const TUTORIAL = [
  '<a href="https://en.wikipedia.org/wiki/Activity_diagram">Wikipedia artice on activity diagrams</a>',
  '<a href="https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-activity-diagram/">Visual Paradigm: What is Activity Diagram?</a>',
].join("<br/>");

const INSTRUCTION = "Choose the correct answer.";

const IMG = "https://cdn-images.visual-paradigm.com/guide/uml/what-is-activity-diagram/";

const PICTURES = {
  first: IMG + "what-is-activity-diagram.png",
  hierarchy: IMG + "01-activity-diagram-in-uml-diagram-hierarchy.png",
  basic: IMG + "02-basic-activity-diagram.png",
  wordProcessor: IMG + "03-activity-diagram-word-processor-example.png",
  processOrder: IMG + "04-activity-diagram-example-process-order.png",
  enrollment: IMG + "05-activity-diagram-example-student-enrollment.png",
  swimlane: IMG + "06-use-of-swimlane-in-activity-diagram.png",
  withoutSwimlane: IMG + "07-activity-diagram-without-swimlane-version.png",
  withSwimlane: IMG + "08-activity-diagram-with-swimlane-version.png",
  activity: IMG + "09-activity-diagram-notation-activity.png",
  action: IMG + "10-activity-diagram-notation-action.png",
  controlFlow: IMG + "11-activity-diagram-notation-control-flow.png",
  objectFlow: IMG + "12-activity-diagram-notation-object-flow.png",
  initialNode: IMG + "13-activity-diagram-notation-initial-node.png",
  activityFinal: IMG + "14-activity-diagram-notation-activity-final-node.png",
  objectNode: IMG + "15-activity-diagram-notation-object-node.png",
  decisionNode: IMG + "16-activity-diagram-notation-decision-node.png",
  mergeNode: IMG + "17-activity-diagram-notation-merge-node.png",
  forkNode: IMG + "18-activity-diagram-notation-fork-node.png",
  joinNode: IMG + "19-activity-diagram-notation-join-node.png",
  swimlanePartition: IMG + "20-activity-diagram-notation-swimlane-and-partition.png",
};

// Jede Aufgabe: Abschnitt des Artikels, Bild dieses Abschnitts, Frage, richtige
// Antwort zuerst, danach die falschen Antworten.
const EXERCISES = [
  {
    abschnitt: "What is Activity Diagram?",
    imageUrl: PICTURES.hierarchy,
    question:
      "In UML, what is an activity diagram essentially an advanced version of?",
    optionen: [
      "flow chart",
      "class diagram",
      "use case diagram",
      "state machine",
    ],
  },
  {
    abschnitt: "When to Use Activity Diagram",
    imageUrl: PICTURES.first,
    question:
      "Which operation is particularly suited to be modeled with an activity diagram?",
    optionen: [
      "an operation intended to achieve a number of different things that require coordination",
      "a simple linear operation",
      "a single attribute access",
      "a database migration",
    ],
  },
  {
    abschnitt: "When to Use Activity Diagram",
    imageUrl: PICTURES.first,
    question:
      "Activity diagrams are suitable for modeling how a collection of use cases coordinate to represent ...",
    optionen: [
      "business workflows",
      "software architecture",
      "network topology",
      "database schemas",
    ],
  },
  {
    abschnitt: "Learn by Examples (basic)",
    imageUrl: PICTURES.basic,
    question: "How is a basic activity diagram best described?",
    optionen: [
      "as a flowchart-like diagram",
      "as a state machine",
      "as a class hierarchy",
      "as a deployment plan",
    ],
  },
  {
    abschnitt: "Word Processor",
    imageUrl: PICTURES.wordProcessor,
    question:
      "In the word processor example, which step is performed immediately after creating the file?",
    optionen: [
      "Save the file under a unique name within its directory",
      "Type the document",
      "Print a hard copy of the document",
      "Exit the word processing package",
    ],
  },
  {
    abschnitt: "Process Order",
    imageUrl: PICTURES.processOrder,
    question:
      "In the Process Order example, what happens once the order is received?",
    optionen: [
      "the activities split into two parallel sets of activities",
      "the order is closed immediately",
      "only one single activity is performed",
      "the customer is asked to pay first",
    ],
  },
  {
    abschnitt: "Process Order",
    imageUrl: PICTURES.processOrder,
    question:
      "In the Process Order example, on the Fill Order side, what is decided conditionally?",
    optionen: [
      "the method of delivery (overnight or regular delivery)",
      "the billing amount",
      "the order quantity",
      "the customer name",
    ],
  },
  {
    abschnitt: "Student Enrollment",
    imageUrl: PICTURES.enrollment,
    question:
      "In the Student Enrollment example, who inspects the Enrollment forms?",
    optionen: ["the registrar", "the applicant", "the professor", "the dean"],
  },
  {
    abschnitt: "Student Enrollment",
    imageUrl: PICTURES.enrollment,
    question:
      "In the Student Enrollment example, what does the registrar ask the student to do at the end?",
    optionen: [
      "pay for the initial tuition",
      "attend the overview presentation",
      "fill in the Enrollment Form",
      "enroll in all seminars",
    ],
  },
  {
    abschnitt: "Swimlane",
    imageUrl: PICTURES.swimlane,
    question: "What is a swimlane used for in an activity diagram?",
    optionen: [
      "to group activities performed by the same actor",
      "to split behavior into concurrent flows",
      "to test a condition",
      "to mark the end of the workflow",
    ],
  },
  {
    abschnitt: "Swimlane",
    imageUrl: PICTURES.swimlane,
    question:
      "Which business process is modeled with the Swimlane activity diagram in this section?",
    optionen: [
      "Staff Expenses Submission",
      "meeting a new client",
      "processing an order",
      "student enrollment",
    ],
  },
  {
    abschnitt: "Swimlane and Non-Swimlane",
    imageUrl: PICTURES.withoutSwimlane,
    question:
      "Which version of the 'meeting a new client' activity diagram is presented first?",
    optionen: [
      "the version without swimlane",
      "the version with swimlane",
      "a class diagram",
      "a sequence diagram",
    ],
  },
  {
    abschnitt: "Swimlane and Non-Swimlane",
    imageUrl: PICTURES.withSwimlane,
    question:
      "In the 'meeting a new client' example, which version groups activities performed by the same actor?",
    optionen: [
      "the version with swimlane",
      "the version without swimlane",
      "neither version",
      "both versions",
    ],
  },
  {
    abschnitt: "Notation: Activity",
    imageUrl: PICTURES.activity,
    question: "In the notation summary, what is an Activity used to represent?",
    optionen: ["a set of actions", "a single task", "an object flow", "a decision"],
  },
  {
    abschnitt: "Notation: Action",
    imageUrl: PICTURES.action,
    question: "In the notation summary, what is an Action?",
    optionen: [
      "a task to be performed",
      "a set of actions",
      "a test condition",
      "a group of actors",
    ],
  },
  {
    abschnitt: "Notation: Control Flow",
    imageUrl: PICTURES.controlFlow,
    question: "In the notation summary, what does Control Flow show?",
    optionen: [
      "the sequence of execution",
      "the flow of an object",
      "a test condition",
      "the grouping of actors",
    ],
  },
  {
    abschnitt: "Notation: Object Flow",
    imageUrl: PICTURES.objectFlow,
    question: "In the notation summary, what does Object Flow show?",
    optionen: [
      "the flow of an object from one activity (or action) to another",
      "the sequence of execution",
      "the beginning of actions",
      "the end of all flows",
    ],
  },
  {
    abschnitt: "Notation: Initial Node",
    imageUrl: PICTURES.initialNode,
    question: "In the notation summary, what does the Initial Node portray?",
    optionen: [
      "the beginning of a set of actions or activities",
      "the end of a set of actions",
      "a test condition",
      "parallel flows",
    ],
  },
  {
    abschnitt: "Notation: Activity Final Node",
    imageUrl: PICTURES.activityFinal,
    question: "In the notation summary, what does an Activity Final Node do?",
    optionen: [
      "stops all control flows and object flows in an activity (or action)",
      "stops only one single object flow",
      "begins a set of actions",
      "splits behavior into parallel flows",
    ],
  },
  {
    abschnitt: "Notation: Object Node",
    imageUrl: PICTURES.objectNode,
    question: "In the notation summary, what does an Object Node represent?",
    optionen: [
      "an object that is connected to a set of Object Flows",
      "an actor performing activities",
      "a test condition",
      "the end of an activity",
    ],
  },
  {
    abschnitt: "Notation: Decision Node",
    imageUrl: PICTURES.decisionNode,
    question: "In the notation summary, what does a Decision Node represent?",
    optionen: [
      "a test condition to ensure that the control flow only goes down one path",
      "a set of actions",
      "the beginning of the workflow",
      "a group of actors",
    ],
  },
  {
    abschnitt: "Notation: Merge Node",
    imageUrl: PICTURES.mergeNode,
    question: "In the notation summary, what does a Merge Node do?",
    optionen: [
      "brings back together different decision paths",
      "splits behavior into parallel flows",
      "stops all control flows",
      "groups activities of the same actor",
    ],
  },
  {
    abschnitt: "Notation: Fork Node",
    imageUrl: PICTURES.forkNode,
    question: "In the notation summary, what does a Fork Node do?",
    optionen: [
      "splits behavior into a set of parallel or concurrent flows",
      "brings back together decision paths",
      "stops all object flows",
      "groups activities of the same actor",
    ],
  },
  {
    abschnitt: "Notation: Join Node",
    imageUrl: PICTURES.joinNode,
    question: "In the notation summary, what does a Join Node do?",
    optionen: [
      "brings back together a set of parallel or concurrent flows",
      "splits behavior into parallel flows",
      "portrays the beginning of actions",
      "tests a condition",
    ],
  },
  {
    abschnitt: "Notation: Swimlane and Partition",
    imageUrl: PICTURES.swimlanePartition,
    question: "In the notation summary, what is a Swimlane and Partition?",
    optionen: [
      "a way to group activities performed by the same actor on an activity diagram",
      "a node that splits behavior into concurrent flows",
      "an object that is connected to Object Flows",
      "a test condition for the control flow",
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
      console.log("Tutorial mit zweitem Link aktualisiert.");
    } else if (topic.tutorial !== TUTORIAL) {
      console.log("Tutorial wuerde mit zweitem Link aktualisiert.");
    } else {
      console.log("Tutorial bereits aktuell (zwei Links).");
    }
  }
  const topicId = topic ? topic._id : null;
  if (!topic) throw new Error(`Thema "${TITLE}" nicht gefunden.`);

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
      imageUrl: ex.imageUrl,
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