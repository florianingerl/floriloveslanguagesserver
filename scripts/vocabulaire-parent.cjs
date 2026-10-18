// Kontrolliert die franzoesischen Themen in der Produktionsdatenbank:
//   1. Legt das Elternthema "Vocabulaire" an (falls nicht vorhanden).
//   2. Haengt das bestehende Thema "Vocabulaire chapitre 2" darunter.
//   3. Benennt "Vocabulaire chapitre 2" zu "Decouvertes 1 vocabulaire chapitre 2" um.
//
// Aufruf auf dem VPS (dort ist die Datenbank erreichbar):
//   NODE_PATH=/var/www/floriloveslanguagesserver/node_modules node /tmp/vocabulaire.cjs --dry-run
//   NODE_PATH=/var/www/floriloveslanguagesserver/node_modules node /tmp/vocabulaire.cjs
//
// Die Umbedeutung der Aufgaben bleibt erhalten: Aufgaben hängen an der _id.

const path = require("path");
try {
  // Kandidaten: lokal (Skript liegt in scripts/) und auf dem VPS (Datei in /tmp).
  const kandidaten = [
    path.join(__dirname, "..", ".env.production"),
    path.join("/var/www/floriloveslanguagesserver", ".env.production"),
  ].filter((p) => require("fs").existsSync(p));
  if (kandidaten.length) require("dotenv").config({ path: kandidaten[0] });
} catch {
  // dotenv oder .env.production fehlt; dann muss MONGODB_URL schon im env stehen.
}
const { MongoClient } = require("mongodb");

const SUBJECT = "french";
const PARENT_TITLE = "Vocabulaire";
const CHILD_OLD_TITLE = "Vocabulaire chapitre 2";
const CHILD_NEW_TITLE = "Découvertes 1 vocabulaire chapitre 2";
const OWNER_EMAIL = "imelflorianingerl@gmail.com";
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const url = process.env.MONGODB_URL;
  if (!url) throw new Error("MONGODB_URL ist nicht gesetzt.");
  const client = new MongoClient(url, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db();
  console.log(`Verbunden mit Datenbank "${db.databaseName}"${dryRun ? " (DRY RUN)" : ""}.`);

  const topics = db.collection("topics");

  const quiz = await db.collection("quizzes").findOne({ website: "web", subject: SUBJECT });
  if (!quiz) throw new Error(`Kein Quiz mit subject "${SUBJECT}" gefunden.`);
  const quizId = quiz._id;

  const owner = await db.collection("users").findOne({ email: OWNER_EMAIL });
  if (!owner) throw new Error(`Kein Benutzer mit E-Mail ${OWNER_EMAIL} gefunden.`);
  const ownerId = owner._id;

  // 1) Elternthema "Vocabulaire" anlegen (falls noetig).
  let parent = await topics.findOne({ subject: SUBJECT, title: PARENT_TITLE });
  if (parent) {
    console.log(`Elternthema vorhanden: ${PARENT_TITLE} (${parent._id})`);
  } else if (dryRun) {
    console.log(`Elternthema wuerde angelegt: ${PARENT_TITLE}`);
  } else {
    const res = await topics.insertOne({
      subject: SUBJECT,
      title: PARENT_TITLE,
      tutorial: "",
      quiz: quizId,
      user: ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    parent = await topics.findOne({ _id: res.insertedId });
    console.log(`Elternthema angelegt: ${PARENT_TITLE} (${res.insertedId})`);
  }

  // 2) Kindthema suchen - nach alter UND neuer Ueberschrift, damit der
  //    Lauf nach einem Abbruch noch greift.
  const kind =
    (await topics.findOne({ subject: SUBJECT, title: CHILD_NEW_TITLE })) ??
    (await topics.findOne({ subject: SUBJECT, title: CHILD_OLD_TITLE }));
  if (!kind) {
    throw new Error(
      `Kindthema "${CHILD_OLD_TITLE}" bzw. "${CHILD_NEW_TITLE}" nicht gefunden.`,
    );
  }
  console.log(`Kindthema: ${kind.title} (${kind._id}), bisheriger Elternteil: ${kind.parentId ?? "-"}`);

  const neu = { parentId: parent ? parent._id : undefined, title: CHILD_NEW_TITLE };
  const setzbar = neu.parentId && String(neu.parentId) !== String(kind.parentId ?? "");
  const umbenennbar = kind.title !== CHILD_NEW_TITLE;

  if (dryRun) {
    if (setzbar) console.log(`  -> parentId wuerde auf ${neu.parentId} gesetzt.`);
    if (umbenennbar) console.log(`  -> Titel wuerde zu "${CHILD_NEW_TITLE}" geaendert.`);
    if (!setzbar && !umbenennbar) console.log("  -> nichts zu aendern.");
  } else if (setzbar || umbenennbar) {
    const $set = { updatedAt: new Date() };
    if (setzbar) $set.parentId = neu.parentId;
    if (umbenennbar) $set.title = CHILD_NEW_TITLE;
    await topics.updateOne({ _id: kind._id }, { $set });
    console.log(`Kindthema aktualisiert (${Object.keys($set).join(", ")}).`);
  } else {
    console.log("Kindthema ist bereits korrekt, nichts zu aendern.");
  }

  // 3) Kontrolle: alle franzoesischen Themen mit Elternbezug ausgeben.
  console.log("\nFranzoesische Themen nach der Aenderung:");
  const alle = await topics
    .find({ subject: SUBJECT, $or: [{ title: PARENT_TITLE }, { title: CHILD_NEW_TITLE }] })
    .toArray();
  const titel = new Map(alle.map((t) => [String(t._id), t.title]));
  for (const t of alle) {
    console.log(
      `  ${t.title} | _id=${t._id} | parent=${t.parentId ? titel.get(String(t.parentId)) ?? t.parentId : "-"}`,
    );
  }

  // 4) Zaehlen, wie viele Aufgaben am Kindthema haengen.
  const n = await db.collection("exercises").countDocuments({ topic: kind._id });
  console.log(`\nAufgaben am Kindthema: ${n}`);

  await client.close();
}

main().catch((e) => {
  console.error("Fehlgeschlagen:", e && e.message ? e.message : e);
  process.exit(1);
});
