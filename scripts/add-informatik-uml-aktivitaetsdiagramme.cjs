// Legt fuer das Informatik-Quiz (subject "informatics") das Thema
// "UML - Aktivit\u00e4tsdiagramme" mit deutschem Tutorial und Multiple-Choice-
// Aufgaben an. Die Aufgaben sind loesbar, wenn man den deutschsprachigen
// Wikipedia-Artikel ueber Aktivit\u00e4tsdiagramme gelesen hat:
//   https://de.wikipedia.org/wiki/Aktivit%C3%A4tsdiagramm
//
// Jede Aufgabe bezieht sich auf einen Abschnitt des Artikels. Das imageUrl
// ist das Bild, das in diesem Abschnitt angezeigt wird. Fuer die Abschnitte,
// in denen der Artikel kein Bild zeigt, wird ein Bild aus der Klipy-API zum
// Suchbegriff "UML Aktivit\u00e4tsdiagramm <Abschnitt>" bzw. ersatzweise
// "UML activity diagramm" verwendet.
//
// Der Lauf ist idempotent: Quiz und Thema werden wiederverwendet bzw. angelegt,
// Aufgaben nur, wenn es noch keine mit derselben Frage im Fach gibt.
//
// Aufruf auf dem Server (dort ist die Datenbank erreichbar):
//   node scripts/add-informatik-uml-aktivitaetsdiagramme.cjs --dry-run
//   node scripts/add-informatik-uml-aktivitaetsdiagramme.cjs

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const URL =
  process.env.MONGODB_URL ?? "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";
const SUBJECT = "informatics";
const QUIZ_NAME = "Informatik";
const OWNER_EMAIL = "imelflorianingerl@gmail.com";

const TITLE = "UML - Aktivit\u00e4tsdiagramme";

const TUTORIAL =
  '<a href="https://de.wikipedia.org/wiki/Aktivit%C3%A4tsdiagramm">Wikipedia-Artikel \u00fcber Aktivit\u00e4tsdiagramme</a>';

const INSTRUCTION = "W\u00e4hle die richtige Antwort.";

// Bilder aus dem Wikipedia-Artikel (die beiden Diagramm-Beispiele).
const WIKI_UML2 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Uml-Activity-Beispiel3_Deutsch.svg/500px-Uml-Activity-Beispiel3_Deutsch.svg.png";
const WIKI_UML1 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Uml-Activity-Beispiel1.svg/500px-Uml-Activity-Beispiel1.svg.png";

// Ersatzbilder (Klipy-Suche "UML Aktivit\u00e4tsdiagramm"). Da die Suche zu
// den Bild-freien Abschnitten jeweils dasselbe UML-Logo liefert, werden die
// Varianten reihum verwendet.
const KLIPY = [
  "https://static.klipy.com/ii/e7539ef2aad336edaa067c28ee130b3c/46/59/EDrWWcHB1lL16AO.jpg",
  "https://static.klipy.com/ii/e7539ef2aad336edaa067c28ee130b3c/c8/26/jL9WODReKstQlcx8Z.jpg",
  "https://static.klipy.com/ii/e7539ef2aad336edaa067c28ee130b3c/b1/59/1SzNfunJuSbCB0sFG.jpg",
  "https://static.klipy.com/ii/e7539ef2aad336edaa067c28ee130b3c/54/75/t9b43kD39B7gFZJuYL71.jpg",
  "https://static.klipy.com/ii/cfb42878805dcb270f51b28683e7455a/93/0a/wD0aDthwKZgB9WHF5ea.jpg",
];

// Jede Aufgabe: der Abschnitt des Artikels, die Frage, die richtige Antwort
// zuerst, danach die falschen Antworten, und das Bild (Klipy-Index oder URL).
const EXERCISES = [
  {
    abschnitt: "Allgemein",
    bild: "klipy",
    question:
      "Was wird mit einem Aktivit\u00e4tsdiagramm meist beschrieben?",
    optionen: [
      "der Ablauf eines Anwendungsfalls",
      "die Struktur einer Klasse",
      "die Sichtbarkeit von Attributen",
      "die Vererbungshierarchie",
    ],
  },
  {
    abschnitt: "Allgemein",
    bild: "klipy",
    question:
      "Mit welchen Modellen ist die Semantik der Aktivit\u00e4tsdiagramme in UML 2 verwandt?",
    optionen: [
      "mit Petri-Netzen",
      "mit Entity-Relationship-Modellen",
      "mit Klassendiagrammen",
      "mit Datenbankschemata",
    ],
  },
  {
    abschnitt: "Symbole",
    bild: "klipy",
    question: "Woraus besteht ein Aktivit\u00e4tsdiagramm?",
    optionen: [
      "aus Symbolen",
      "aus Klassen und Attributen",
      "aus Tabellen und Schl\u00fcsseln",
      "aus einer einzigen Aktion",
    ],
  },
  {
    abschnitt: "Startknoten",
    bild: "klipy",
    question: "Wozu wird der Startknoten verwendet?",
    optionen: [
      "um den Startpunkt oder Anfangszustand einer Aktivit\u00e4t darzustellen",
      "um das Ende aller Kontrollfl\u00fcsse zu markieren",
      "um mehrere Str\u00f6me zusammenzuf\u00fchren",
      "um ein Signal zu empfangen",
    ],
  },
  {
    abschnitt: "Startknoten",
    bild: "klipy",
    question: "Wodurch kann das Symbol des Startknotens erweitert werden?",
    optionen: [
      "durch ein Notizsymbol mit erkl\u00e4rendem Kommentar",
      "durch eine Raute",
      "durch einen Balken",
      "durch einen Pin",
    ],
  },
  {
    abschnitt: "Aktivit\u00e4t",
    bild: "klipy",
    question: "Wozu dient das Symbol der Aktivit\u00e4t?",
    optionen: [
      "zur Darstellung der Aktivit\u00e4ten des Prozesses",
      "zum Markieren des Endes aller Kontrollfl\u00fcsse",
      "zum Empfangen von Signalen",
      "zum Zusammenf\u00fchren paralleler Str\u00f6me",
    ],
  },
  {
    abschnitt: "Aktion",
    bild: "klipy",
    question: "Wozu dient das Symbol der Aktion?",
    optionen: [
      "um die ausf\u00fchrbaren Teilbereiche einer Aktivit\u00e4t darzustellen",
      "um den Startpunkt einer Aktivit\u00e4t darzustellen",
      "um Kommentare hinzuzuf\u00fcgen",
      "um Objekte durch die Aktivit\u00e4t zu bewegen",
    ],
  },
  {
    abschnitt: "Kontrollfluss",
    bild: "klipy",
    question: "Wozu dient das Symbol des Kontrollflusses?",
    optionen: [
      "um den Kontrollfluss von einer Aktion zur anderen darzustellen",
      "um den Weg von Objekten darzustellen",
      "um parallele Str\u00f6me aufzuspalten",
      "um Signale zu senden",
    ],
  },
  {
    abschnitt: "Objektfluss",
    bild: "klipy",
    question: "Wozu dient das Symbol des Objektflusses?",
    optionen: [
      "um den Weg von Objekten darzustellen, die sich durch die Aktivit\u00e4t bewegen",
      "um den Kontrollfluss zwischen zwei Aktionen darzustellen",
      "um einen bedingten Verzweigungspunkt darzustellen",
      "um das Ende eines Kontrollflusses zu markieren",
    ],
  },
  {
    abschnitt: "Endknoten",
    bild: "klipy",
    question: "Was markiert der Endknoten?",
    optionen: [
      "das Ende aller Kontrollfl\u00fcsse innerhalb der Aktivit\u00e4t",
      "das Ende eines einzelnen Kontrollflusses",
      "den Startpunkt einer Aktivit\u00e4t",
      "eine bedingte Verzweigung",
    ],
  },
  {
    abschnitt: "Fluss-Endknoten",
    bild: "klipy",
    question: "Was markiert ein Fluss-Endknoten?",
    optionen: [
      "das Ende eines einzelnen Kontrollflusses",
      "das Ende aller Abl\u00e4ufe einer Aktivit\u00e4t",
      "den Anfangszustand einer Aktivit\u00e4t",
      "das Zusammenflie\u00dfen mehrerer Str\u00f6me",
    ],
  },
  {
    abschnitt: "Entscheidungsknoten",
    bild: "klipy",
    question:
      "In welcher Form wird eine bedingte Verzweigung im Kontrollfluss dargestellt?",
    optionen: [
      "in Form einer Raute",
      "in Form eines Balkens",
      "in Form eines Kreises",
      "in Form eines Rechtecks mit abgerundeten Ecken",
    ],
  },
  {
    abschnitt: "Entscheidungsknoten",
    bild: "klipy",
    question: "Wie viele Eing\u00e4nge und Ausg\u00e4nge hat ein Entscheidungsknoten?",
    optionen: [
      "einen Eingang und mehrere Ausg\u00e4nge",
      "mehrere Eing\u00e4nge und einen Ausgang",
      "genau einen Eingang und einen Ausgang",
      "mehrere Eing\u00e4nge und mehrere Ausg\u00e4nge",
    ],
  },
  {
    abschnitt: "Knoten verschmelzen",
    bild: "klipy",
    question:
      "Wie viele Eing\u00e4nge und Ausg\u00e4nge hat das Symbol zum Verschmelzen von Knoten?",
    optionen: [
      "mehrere Eing\u00e4nge, aber nur einen Ausgang",
      "einen Eingang, aber mehrere Ausg\u00e4nge",
      "genau einen Eingang und einen Ausgang",
      "mehrere Eing\u00e4nge und mehrere Ausg\u00e4nge",
    ],
  },
  {
    abschnitt: "Gabel",
    bild: "klipy",
    question: "Was bewirkt das Symbol der Gabel (Parallelisierung)?",
    optionen: [
      "es spaltet einen Aktivit\u00e4tsfluss in zwei oder mehr gleichzeitig ablaufende Aktivit\u00e4ten auf",
      "es f\u00fchrt zwei Str\u00f6me zu einem einzigen Strom zusammen",
      "es markiert das Ende eines Kontrollflusses",
      "es empf\u00e4ngt ein Signal",
    ],
  },
  {
    abschnitt: "Zusammenf\u00fchren",
    bild: "klipy",
    question: "Wie wird das Symbol zum Zusammenf\u00fchren dargestellt?",
    optionen: [
      "durch eine dicke vertikale oder horizontale Linie",
      "durch eine Raute",
      "durch einen kleinen Kreis",
      "durch ein Rechteck mit abgerundeten Ecken",
    ],
  },
  {
    abschnitt: "Senden von Signalen",
    bild: "klipy",
    question: "Wozu dient die Aktion des Sendens von Signalen?",
    optionen: [
      "um das Senden eines Signals an eine annehmende Aktivit\u00e4t darzustellen",
      "um den Empfang eines Signals darzustellen",
      "um einen bedingten Verzweigungspunkt darzustellen",
      "um das Ende aller Kontrollfl\u00fcsse zu markieren",
    ],
  },
  {
    abschnitt: "Empfang von Signalen",
    bild: "klipy",
    question:
      "Wann ist der von der Aktion des Signalempfangs ausgehende Kontrollfluss abgeschlossen?",
    optionen: [
      "nach dem Empfang des Ereignisses",
      "bereits beim Senden des Signals",
      "erst am Endknoten der gesamten Aktivit\u00e4t",
      "niemals",
    ],
  },
  {
    abschnitt: "Kommentar",
    bild: "klipy",
    question: "Wozu dient das Symbol des Kommentars?",
    optionen: [
      "um relevante Kommentare zu Elementen hinzuzuf\u00fcgen",
      "um Kontrollfl\u00fcsse zu verzweigen",
      "um Objektfl\u00fcsse darzustellen",
      "um Aktivit\u00e4tsparameter festzulegen",
    ],
  },
  {
    abschnitt: "UML 2 Aktivit\u00e4tsdiagramm",
    bild: WIKI_UML2,
    question:
      "Welches Schl\u00fcsselwort steht im Kopfbereich eines UML-2-Aktivit\u00e4tsdiagramms?",
    optionen: ["act oder activity", "class", "state", "usecase"],
  },
  {
    abschnitt: "UML 2 Aktivit\u00e4tsdiagramm",
    bild: WIKI_UML2,
    question:
      "Was ist der schwarze Punkt in einem UML-2-Aktivit\u00e4tsdiagramm?",
    optionen: [
      "der Startknoten",
      "der Endknoten",
      "ein Aktivit\u00e4tsparameterknoten",
      "ein Pin",
    ],
  },
  {
    abschnitt: "UML 1 Aktivit\u00e4tsdiagramm",
    bild: WIKI_UML1,
    question:
      "Was hat sich bei den Aktivit\u00e4tsdiagrammen von UML 1 zu UML 2 wesentlich ge\u00e4ndert?",
    optionen: [
      "die Bedeutung einzelner graphischer Symbole",
      "die Anzahl der Symbole wurde auf null reduziert",
      "es gibt keine Kontrollfl\u00fcsse mehr",
      "Aktivit\u00e4tsdiagramme sind keine Verhaltensdiagramme mehr",
    ],
  },
  {
    abschnitt: "UML 1 Aktivit\u00e4tsdiagramm",
    bild: WIKI_UML1,
    question:
      "Wof\u00fcr stehen die horizontalen, dicken Linien in einem UML-1-Aktivit\u00e4tsdiagramm?",
    optionen: [
      "f\u00fcr Parallelisierungs- und Synchronisationsknoten (Balken)",
      "f\u00fcr den Startknoten",
      "f\u00fcr einen Kommentar",
      "f\u00fcr einen Objektfluss",
    ],
  },
];

const dryRun = process.argv.includes("--dry-run");

function options(liste) {
  return liste.map((option, i) => ({ option, correct: i === 0 }));
}

let klipyIndex = 0;
function bildUrl(ex) {
  if (ex.bild === "klipy") {
    const url = KLIPY[klipyIndex % KLIPY.length];
    klipyIndex++;
    return url;
  }
  return ex.bild;
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

  // Quiz "Informatik" anlegen bzw. wiederverwenden.
  const quizzes = db.collection("quizzes");
  let quiz = await quizzes.findOne({ website: "web", subject: SUBJECT });
  if (quiz) {
    console.log(`Quiz vorhanden: ${quiz._id}`);
    if (quiz.name !== QUIZ_NAME && !dryRun) {
      await quizzes.updateOne(
        { _id: quiz._id },
        { $set: { name: QUIZ_NAME, updatedAt: new Date() } },
      );
      console.log("Quiz-Name aktualisiert.");
    }
  } else if (dryRun) {
    console.log(
      `Quiz wuerde angelegt: subject "${SUBJECT}", name "${QUIZ_NAME}"`,
    );
  } else {
    const res = await quizzes.insertOne({
      website: "web",
      subject: SUBJECT,
      name: QUIZ_NAME,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    quiz = await quizzes.findOne({ _id: res.insertedId });
    console.log(`Quiz angelegt: ${res.insertedId}`);
  }
  const quizId = quiz ? quiz._id : null;

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
    const imageUrl = bildUrl(ex);
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
      imageUrl,
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
