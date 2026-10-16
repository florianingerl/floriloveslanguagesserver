/*
 * Legt das neue Website-Quiz "programming" (Name "Programmierung") an und
 * fuegt die Aufgaben aus unserem Chat vom 16.10.2026 ein:
 *
 *   programming  ->  C++ -> Dateien            (Schreiben/Lesen von Dateien)
 *   programming  ->  C++ -> Strings und Zahlen (Umwandlung Zahl <-> Text)
 *   webprogramming -> web design -> css -> overflow (Bilder/overflow)
 *
 * Das Thema "overflow" gibt es schon, es wird unter "css" eingehaengt, damit
 * der Baum "web design -> css -> overflow" entsteht.
 *
 * Aufruf auf dem Server (im App-Verzeichnis):
 *     node add-programming-quiz.cjs            # schreibt (mit Backup)
 *     node add-programming-quiz.cjs --dry-run  # zeigt nur, was passieren wuerde
 *
 * Das Skript ist idempotent: Vorhandenes wird wiederverwendet, Aufgaben werden
 * nur angelegt, wenn es sie (gleicher Text im gleichen Quiz) noch nicht gibt.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.production") });
const fs = require("fs");
const { MongoClient, ObjectId } = require("mongodb");

const URL = process.env.MONGODB_URL || "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";
const DRY = process.argv.includes("--dry-run");

// Besitzer: der Benutzer, dem die Inhalte gehoeren.
const OWNER = new ObjectId("6ac13ec8ad4b9e599155b16e");

// Bestehende Quiz-/Themen-Ids in der Produktionsdatenbank.
const WEBPROG_QUIZ = new ObjectId("6acdcb46372d2c9a295ad6f8");
const CSS_TOPIC = new ObjectId("6ad0e13287e8be3e7e86b01e");
const OVERFLOW_TOPIC = new ObjectId("6ad1c81d5b867002f6d8611c");

// ---------------------------------------------------------------------------
// Die Aufgaben. "topic" ist der Schluessel des Themas (siehe TOPICS unten).
// ---------------------------------------------------------------------------
const EXERCISES = [
  // ---------- C++ -> Dateien ----------
  {
    topic: "dateien",
    imageUrl: "assets/img/programming/dateien-01.svg",
    question:
      "Du willst in C Text in eine Datei schreiben. Welche Aufrufe stehen in der richtigen Reihenfolge?",
    correct: 'FILE *f = fopen("ausgabe.txt", "w"); fprintf(f, "Hallo"); fclose(f);',
    wrong: [
      'FILE *f = fopen("ausgabe.txt", "r"); fprintf(f, "Hallo"); fclose(f);',
      'FILE *f = fclose("ausgabe.txt"); fprintf(f, "Hallo"); fopen(f, "w");',
      'fprintf("ausgabe.txt", "Hallo");',
    ],
  },
  {
    topic: "dateien",
    imageUrl: "assets/img/programming/dateien-02.svg",
    question:
      "Was gibt fopen zurueck, wenn die Datei nicht geoeffnet werden kann?",
    correct: "NULL",
    wrong: ["0", "-1", 'einen leeren String ""'],
  },
  {
    topic: "dateien",
    imageUrl: "assets/img/programming/dateien-03.svg",
    question:
      'Mit welchem Modus haengst du in C mit fopen Text an eine bestehende Datei an, ohne sie zu ueberschreiben?',
    correct: '"a"',
    wrong: ['"w"', '"r"', '"x"'],
  },
  {
    topic: "dateien",
    imageUrl: "assets/img/programming/dateien-04.svg",
    question: "Wie schreibst du in C++ mit ofstream Text in eine Datei?",
    correct: 'std::ofstream f("ausgabe.txt"); f << "Hallo";',
    wrong: [
      'std::ofstream f("ausgabe.txt"); f >> "Hallo";',
      'std::ifstream f("ausgabe.txt"); f << "Hallo";',
      'std::ofstream f; f.open("r", "ausgabe.txt");',
    ],
  },
  {
    topic: "dateien",
    imageUrl: "assets/img/programming/dateien-05.svg",
    question:
      "Mit welcher Funktion liest du in C++ eine ganze Zeile aus einer Datei in einen std::string?",
    correct: "std::getline(f, zeile)",
    wrong: ["f >> zeile", "f.getline(zeile)", "f.readLine(zeile)"],
  },
  {
    topic: "dateien",
    imageUrl: "assets/img/programming/dateien-06.svg",
    question: "Du willst die 5. Zeile einer Datei lesen. Was ist der richtige Weg?",
    correct:
      "Vier Zeilen mit getline ueberspringen und danach die fuenfte Zeile lesen.",
    wrong: [
      "Mit f.seekg(5) direkt zur 5. Zeile springen und sie mit getline lesen.",
      "Die Zeilen mit f >> zeile einlesen und die fuenfte behalten.",
      "std::getline(f, zeile, 5) aufrufen.",
    ],
  },

  // ---------- C++ -> Strings und Zahlen ----------
  {
    topic: "strings",
    imageUrl: "assets/img/programming/strings-01.svg",
    question: "Wie wandelst du in C eine ganze Zahl in einen String um?",
    correct: 'char s[256]; sprintf(s, "%d", n);',
    wrong: [
      'char s[256]; sprintf(s, "%s", n);',
      'char s[256]; printf(s, "%d", n);',
      'char s[256]; sprintf(s, "%f", n);',
    ],
  },
  {
    topic: "strings",
    imageUrl: "assets/img/programming/strings-02.svg",
    question:
      "Wofuer steht der Formatspezifizierer %d in printf und sprintf?",
    correct: "fuer eine ganze Zahl in Dezimaldarstellung",
    wrong: ["fuer eine Kommazahl", "fuer einen String", "fuer ein einzelnes Zeichen"],
  },
  {
    topic: "strings",
    imageUrl: "assets/img/programming/strings-03.svg",
    question: 'Wie wandelst du in C den String "12345" in eine ganze Zahl um?',
    correct: 'int n = atoi("12345");',
    wrong: [
      'int n = tostring("12345");',
      'int n = "12345";',
      'int n = int("12345");',
    ],
  },
  {
    topic: "strings",
    imageUrl: "assets/img/programming/strings-04.svg",
    question:
      "Mit welcher Funktion wandelst du in C++ einen std::string in eine ganze Zahl um?",
    correct: "std::stoi(s)",
    wrong: ["std::to_string(s)", "std::parse_int(s)", "(int) s"],
  },
  {
    topic: "strings",
    imageUrl: "assets/img/programming/strings-05.svg",
    question:
      'Ein eingelesener String lautet "12345\\r\\n" (also mit Wagenruecklauf und Zeilenumbruch am Ende). Warum liefert atoi beziehungsweise std::stoi trotzdem 12345?',
    correct:
      "Sie wandeln so lange um, bis ein Zeichen keine Ziffer mehr ist; \\r und \\n beenden die Umwandlung.",
    wrong: [
      "Sie entfernen \\r und \\n automatisch aus dem String.",
      "\\r und \\n werden ignoriert, weil sie den Wert 0 haben.",
      "Sie loesen bei \\r und \\n einen Fehler aus.",
    ],
  },
  {
    topic: "strings",
    imageUrl: "assets/img/programming/strings-06.svg",
    question:
      "Wie wandelst du in C++ eine ganze Zahl mit std::to_string in einen String um?",
    correct: "std::string s = std::to_string(n);",
    wrong: [
      "std::string s = std::to_str(n);",
      "std::string s = std::string(n);",
      "std::string s = std::format_str(n);",
    ],
  },

  // ---------- web design -> css -> overflow ----------
  {
    topic: "overflow",
    imageUrl: "assets/img/css/overflow/overflow-11.svg",
    question:
      "Du setzt auf ein <img>-Element die CSS-Eigenschaft overflow: scroll. Was passiert?",
    correct:
      "Nichts: overflow hat auf einem <img> keine Wirkung, weil ein Bild seinen Inhalt nicht scrollt.",
    wrong: [
      "Das Bild bekommt einen Scrollbalken.",
      "Das Bild wird auf seine Rahmenbreite beschnitten.",
      "Das Bild wird auf die halbe Groesse skaliert.",
    ],
  },
  {
    topic: "overflow",
    imageUrl: "assets/img/css/overflow/overflow-12.svg",
    question: "Was bewirkt object-fit: cover auf einem Bild?",
    correct:
      "Das Bild fuellt den Rahmen vollstaendig aus, behaelt sein Seitenverhaeltnis und wird an den Raendern beschnitten.",
    wrong: [
      "Das Bild wird verzerrt, bis es genau in den Rahmen passt.",
      "Das Bild wird vollstaendig angezeigt, notfalls mit leeren Raendern.",
      "Das Bild bekommt einen Scrollbalken.",
    ],
  },
  {
    topic: "overflow",
    imageUrl: "assets/img/css/overflow/overflow-13.svg",
    question:
      "Wie erzeugst du einen scrollbaren, beschnittenen Ausschnitt eines Bildes?",
    correct:
      "Du legst das <img> in ein Wrapper-Element mit fester Groesse und overflow: auto (oder scroll).",
    wrong: [
      "Du setzt overflow: scroll direkt auf das <img>.",
      "Du setzt object-fit: scroll auf das <img>.",
      "Du setzt text-overflow: ellipsis auf das <img>.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Die Themen. "parent" zeigt auf den Schluessel eines anderen Themas.
// ---------------------------------------------------------------------------
const TOPICS = [
  {
    key: "cpp",
    subject: "programming",
    title: "C++",
    tutorial:
      '<a href="https://en.cppreference.com/w/cpp">C++-Referenz (cppreference)</a>',
  },
  {
    key: "dateien",
    parent: "cpp",
    subject: "programming",
    title: "Dateien",
    tutorial:
      '<a href="https://en.cppreference.com/w/cpp/header/fstream">Dateien lesen und schreiben (fstream, cppreference)</a>',
  },
  {
    key: "strings",
    parent: "cpp",
    subject: "programming",
    title: "Strings und Zahlen",
    tutorial:
      '<a href="https://en.cppreference.com/w/cpp/string/basic_string/stol">Umwandlung zwischen Text und Zahl (cppreference)</a>',
  },
];

async function findOrCreate(db, collection, filter, doc) {
  const vorhanden = await db.collection(collection).findOne(filter);
  if (vorhanden) {
    console.log(`  vorhanden : ${collection} ${JSON.stringify(filter)} -> ${vorhanden._id}`);
    return vorhanden._id;
  }
  if (DRY) {
    const id = new ObjectId();
    console.log(`  [dry-run] wuerde anlegen: ${collection} ${JSON.stringify(filter)} -> ${id}`);
    return id;
  }
  const jetzt = new Date();
  const ergebnis = await db
    .collection(collection)
    .insertOne({ ...doc, createdAt: jetzt, updatedAt: jetzt });
  console.log(`  angelegt  : ${collection} ${JSON.stringify(filter)} -> ${ergebnis.insertedId}`);
  return ergebnis.insertedId;
}

async function backup(db) {
  const stempel = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "");
  const ordner = path.join(__dirname, `backup-programming-quiz-${stempel}`);
  fs.mkdirSync(ordner, { recursive: true });
  for (const name of ["quizzes", "topics", "exercises"]) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(
      path.join(ordner, `${name}.json`),
      JSON.stringify(docs, null, 2),
      "utf8"
    );
    console.log(`  Backup ${name}: ${docs.length} Dokumente -> ${ordner}`);
  }
}

(async () => {
  const client = new MongoClient(URL, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db();
  console.log(`Datenbank: ${db.databaseName}${DRY ? "  (DRY-RUN)" : ""}`);

  if (!DRY) await backup(db);

  console.log("\n=== Quiz 'programming' ===");
  const programmingQuiz = await findOrCreate(
    db,
    "quizzes",
    { website: "web", subject: "programming" },
    { website: "web", subject: "programming", name: "Programmierung", user: OWNER }
  );

  console.log("\n=== Themen (programming) ===");
  const topicIds = {};
  for (const t of TOPICS) {
    const parentId = t.parent ? topicIds[t.parent] : undefined;
    const filter = { subject: "programming", title: t.title, parentId: parentId ?? null };
    // Fuer Wurzelthemen passt auch ein Dokument ohne parentId-Feld.
    const vorhanden = await db
      .collection("topics")
      .findOne(parentId ? filter : { subject: "programming", title: t.title, $or: [{ parentId: null }, { parentId: { $exists: false } }] });
    if (vorhanden) {
      topicIds[t.key] = vorhanden._id;
      console.log(`  vorhanden : topic "${t.title}" -> ${vorhanden._id}`);
      continue;
    }
    const doc = {
      subject: t.subject,
      title: t.title,
      tutorial: t.tutorial,
      quiz: programmingQuiz,
      user: OWNER,
    };
    if (parentId) doc.parentId = parentId;
    if (DRY) {
      topicIds[t.key] = new ObjectId();
      console.log(`  [dry-run] wuerde anlegen: topic "${t.title}" -> ${topicIds[t.key]}`);
      continue;
    }
    const jetzt = new Date();
    const res = await db
      .collection("topics")
      .insertOne({ ...doc, createdAt: jetzt, updatedAt: jetzt });
    topicIds[t.key] = res.insertedId;
    console.log(`  angelegt  : topic "${t.title}" -> ${res.insertedId}`);
  }

  console.log("\n=== Thema 'overflow' unter 'css' einhaengen ===");
  const overflow = await db
    .collection("topics")
    .findOne({ _id: OVERFLOW_TOPIC });
  if (!overflow) {
    console.log("  WARNUNG: overflow-Thema nicht gefunden!");
  } else if (String(overflow.parentId ?? "") === String(CSS_TOPIC)) {
    console.log("  schon unter 'css' eingehaengt.");
  } else if (DRY) {
    console.log(`  [dry-run] wuerde parentId von "${overflow.title}" auf css (${CSS_TOPIC}) setzen.`);
  } else {
    await db
      .collection("topics")
      .updateOne(
        { _id: OVERFLOW_TOPIC },
        { $set: { parentId: CSS_TOPIC, updatedAt: new Date() } }
      );
    console.log("  parentId auf 'css' gesetzt.");
  }
  topicIds["overflow"] = OVERFLOW_TOPIC;

  console.log("\n=== Aufgaben ===");
  let neu = 0;
  let uebersprungen = 0;
  for (const ex of EXERCISES) {
    const topicId = topicIds[ex.topic];
    const quiz = ex.topic === "overflow" ? WEBPROG_QUIZ : programmingQuiz;
    const subject = ex.topic === "overflow" ? "webprogramming" : "programming";
    const vorhanden = await db
      .collection("exercises")
      .findOne({ quiz, question: ex.question });
    if (vorhanden) {
      uebersprungen++;
      console.log(`  vorhanden : ${String(ex.question).slice(0, 70)}`);
      continue;
    }
    const options = [
      { option: ex.correct, correct: true },
      ...ex.wrong.map((w) => ({ option: w, correct: false })),
    ];
    const doc = {
      quiz,
      subject,
      type: "multipleChoice",
      imageUrl: ex.imageUrl,
      topic: topicId,
      user: OWNER,
      question: ex.question,
      options,
    };
    if (DRY) {
      console.log(`  [dry-run] wuerde anlegen: ${String(ex.question).slice(0, 70)}`);
      continue;
    }
    const jetzt = new Date();
    await db.collection("exercises").insertOne({ ...doc, createdAt: jetzt, updatedAt: jetzt });
    neu++;
    console.log(`  angelegt  : ${String(ex.question).slice(0, 70)}`);
  }

  console.log(`\nFertig. Neu: ${neu}, uebersprungen: ${uebersprungen}.`);
  await client.close();
})().catch((e) => {
  console.error("FEHLER:", e);
  process.exit(1);
});
