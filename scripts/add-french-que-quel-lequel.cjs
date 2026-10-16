// Legt fuer das Franzoesisch-Quiz (subject "french") das Thema
// "Que, quel/quelle/quels/quelles ou lequel/laquelle/lesquels/lesquelles"
// mit franzoesischem Tutorial und Multiple-Choice-Aufgaben an.
//
// Jede Aufgabe ist Multiple Choice und hat in der Frage genau eine Luecke
// "___". Die richtige Option ist das, was in die Luecke kommt. Zu jeder
// Aufgabe gehoert ein zufaelliges Bild aus der Klipy-API, dessen Beschreibung
// den Inhalt der Frage bestimmt.
//
// Der Lauf ist idempotent: Quiz und Thema werden wiederverwendet, Aufgaben nur
// angelegt, wenn es noch keine mit derselben Frage im Fach "french" gibt.
//
// Aufruf auf dem Server (dort ist die Datenbank erreichbar):
//   node scripts/add-french-que-quel-lequel.cjs --dry-run
//   node scripts/add-french-que-quel-lequel.cjs

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const URL = process.env.MONGODB_URL ?? "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";
const SUBJECT = "french";
const OWNER_EMAIL = "imelflorianingerl@gmail.com";

const TITLE =
  "Que, quel/quelle/quels/quelles ou lequel/laquelle/lesquels/lesquelles";

const TUTORIAL = [
  "<h2>Que, quel/quelle/quels/quelles ou lequel/laquelle/lesquels/lesquelles ?</h2>",
  "<p><strong>Que</strong> est un pronom interrogatif. Il remplace une chose et il est le compl\u00e9ment direct du verbe. Il n'est jamais suivi d'un nom : <em>Que fais-tu ? Que veux-tu manger ? Que regardes-tu ?</em></p>",
  "<p><strong>Quel, quelle, quels, quelles</strong> est un adjectif interrogatif. Il accompagne toujours un nom et il s'accorde en genre et en nombre avec ce nom : <em>Quel livre ? Quelle maison ? Quels amis ? Quelles fleurs ?</em></p>",
  "<p><strong>Lequel, laquelle, lesquels, lesquelles</strong> est un pronom interrogatif. Il remplace un nom d\u00e9j\u00e0 connu, souvent introduit par <em>de</em>. Il s'accorde lui aussi avec ce nom : <em>Lequel de ces livres ? Laquelle de ces robes ? Lesquels de ces gar\u00e7ons ? Lesquelles de ces filles ?</em></p>",
  "<h3>\u00c0 retenir</h3>",
  "<ul>",
  "<li>Apr\u00e8s <strong>que</strong>, il n'y a pas de nom : <em>Que veux-tu ?</em></li>",
  "<li>Apr\u00e8s <strong>quel</strong>, il y a toujours un nom : <em>Quel g\u00e2teau veux-tu ?</em></li>",
  "<li><strong>lequel</strong> remplace \u00ab quel + nom \u00bb quand le nom est d\u00e9j\u00e0 connu : <em>Lequel de ces g\u00e2teaux veux-tu ?</em></li>",
  "</ul>",
].join("\n");

const INSTRUCTION = "Compl\u00e8te la phrase en choisissant la bonne r\u00e9ponse.";

// Jede Aufgabe: Frage mit genau einer Luecke "___", die richtige Antwort steht
// zuerst, dazu die Beschreibung des Klipy-Bildes und die Bild-URL.
const EXERCISES = [
  {
    bild: "Wizard Cat Eating Pizza",
    imageUrl:
      "https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/6d/ca/75tfE2gT.jpg",
    question: "Regarde le chat magicien : ___ mange-t-il sur l'image ?",
    optionen: ["Que", "Quel", "Quelle", "Quels"],
  },
  {
    bild: "Funny Cat Playing Keyboard",
    imageUrl:
      "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/f9/74/LE9VbcJFKbXO4dbqPshx.jpg",
    question: "Regarde l'image : ___ instrument ce chat joue-t-il ?",
    optionen: ["Quel", "Quelle", "Quels", "Que"],
  },
  {
    bild: "Cat Driving a Car",
    imageUrl:
      "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/3f/d6/nx29A0Wx.jpg",
    question: "Regarde l'image : ___ voiture conduit ce chat ?",
    optionen: ["Quelle", "Quel", "Quels", "Quelles"],
  },
  {
    bild: "Minions Play Football",
    imageUrl:
      "https://static.klipy.com/ii/ce286d05b8e1a47cd4f32b0e1b6dec0e/f2/36/aTbeunqq.jpg",
    question: "___ sports les Minions aiment-ils sur l'image ?",
    optionen: ["Quels", "Quel", "Quelle", "Quelles"],
  },
  {
    bild: "Golden Sunflowers Field at Sunset",
    imageUrl:
      "https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/c8/6a/e1OA6ZVf.jpg",
    question: "___ fleurs voit-on dans le champ sur l'image ?",
    optionen: ["Quelles", "Quel", "Quelle", "Quels"],
  },
  {
    bild: "Decadent Chocolate Layer Cake",
    imageUrl:
      "https://static.klipy.com/ii/a15b48460c436e1e92c85ffc680932cc/19/af/c3f5DfGCs0RPEIHTpM.jpg",
    question:
      "Regarde les g\u00e2teaux : ___ de ces g\u00e2teaux veux-tu pour ton anniversaire ?",
    optionen: ["Lequel", "Quel", "Laquelle", "Lesquels"],
  },
  {
    bild: "Pizza Hut Stuffed Crust Pepperoni Pizza",
    imageUrl:
      "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/94/3c/BslA20raPDf3cqMD.jpg",
    question: "___ de ces pizzas est la plus grande ?",
    optionen: ["Laquelle", "Quelle", "Quel", "Lesquelles"],
  },
  {
    bild: "Big Book Huge Book",
    imageUrl:
      "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/7a/7c/BZw79jCLwLwn3pvTxAUo.jpg",
    question: "___ de ces livres as-tu d\u00e9j\u00e0 lus ?",
    optionen: ["Lesquels", "Quels", "Lequel", "Lesquelles"],
  },
  {
    bild: "Enchanted Garden with Purple and White Flowers",
    imageUrl:
      "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/73/5a/yrQH1NLs.jpg",
    question: "___ de ces fleurs sentent le meilleur ?",
    optionen: ["Lesquelles", "Quelles", "Quelle", "Lesquels"],
  },
  {
    bild: "Study Book",
    imageUrl:
      "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/18/15/KK1tzQqo4f76Zh.jpg",
    question: "Tu as lu ce livre. ___ penses-tu de cette histoire ?",
    optionen: ["Que", "Quel", "Quelle", "Lequel"],
  },
  {
    bild: "Powerful Steam Train 705 Emitting Smoke",
    imageUrl:
      "https://static.klipy.com/ii/2711dd8a75a85be822d136ec94899b3f/33/33/BtQPABPpvSyrjSL.jpg",
    question: "___ de ces trains \u00e0 vapeur est le plus rapide ?",
    optionen: ["Lequel", "Quel", "Que", "Lesquels"],
  },
  {
    bild: "Majestic Snowy Mountain Peaks",
    imageUrl:
      "https://static.klipy.com/ii/2711dd8a75a85be822d136ec94899b3f/7e/0a/OCqfwxUlH0PnmP.jpg",
    question:
      "Regarde la montagne : ___ est le nom de ce sommet enneig\u00e9 ?",
    optionen: ["Quel", "Quelle", "Que", "Lequel"],
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
      console.log(`  wuerde anlegen: ${ex.question}`);
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
