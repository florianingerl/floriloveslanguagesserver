// migrate-question-or-instruction.cjs
//
// Fuehrt die Zusammenfuehrung der Felder instruction und question zu
// questionOrInstruction durch (siehe InstructionsForTheAI.txt, Punkt 27).
//
//   Nur ansehen (Standard):
//     node migrate-question-or-instruction.cjs
//
//   Schreiben (Produktion):
//     node migrate-question-or-instruction.cjs --apply
//
// Regel: Bei multipleChoice-Aufgaben zaehlt question, bei allen anderen
// Typen zaehlt instruction. Fehlt das relevante Feld, wird das andere
// genutzt. Fehlen beide, wird "" gespeichert. questionEn und questionFr
// bleiben unveraendert. Vor dem Schreiben wird ein Backup der betroffenen
// Dokumente nach backups/ geschrieben.

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.production") });
const { MongoClient } = require("mongodb");

const URL = process.env.MONGODB_URL;
const ANWENDEN = process.argv.includes("--apply");

function zusammenfuehren(exercise) {
  if (exercise.type === "multipleChoice") {
    return exercise.question ?? exercise.instruction ?? "";
  }
  return exercise.instruction ?? exercise.question ?? "";
}

(async () => {
  if (!URL) throw new Error("MONGODB_URL fehlt in .env.production");
  const client = new MongoClient(URL, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db();
  const exercises = db.collection("exercises");

  const gesamt = await exercises.countDocuments();

  const kandidaten = await exercises
    .find({
      $or: [
        { instruction: { $exists: true } },
        { question: { $exists: true } },
        { questionOrInstruction: { $exists: true } },
      ],
    })
    .toArray();

  const operationen = [];
  let zusammengefuehrt = 0;
  let alteFelderEntfernt = 0;

  for (const ex of kandidaten) {
    const hatAlteFelder =
      ex.instruction !== undefined || ex.question !== undefined;

    if (ex.questionOrInstruction === undefined && hatAlteFelder) {
      operationen.push({
        updateOne: {
          filter: { _id: ex._id },
          update: {
            $set: { questionOrInstruction: zusammenfuehren(ex) },
            $unset: { instruction: "", question: "" },
          },
        },
      });
      zusammengefuehrt++;
      continue;
    }

    if (ex.questionOrInstruction !== undefined && hatAlteFelder) {
      operationen.push({
        updateOne: {
          filter: { _id: ex._id },
          update: { $unset: { instruction: "", question: "" } },
        },
      });
      alteFelderEntfernt++;
    }
  }

  console.log("Dokumente in der exercises-Collection: " + gesamt);
  console.log("Kandidaten mit alten/neuen Feldern:   " + kandidaten.length);
  console.log("Zusammenzufuehren:                    " + zusammengefuehrt);
  console.log("Nur alte Felder zu entfernen:         " + alteFelderEntfernt);

  if (!ANWENDEN) {
    console.log("Nur-Ansicht-Modus: es wurde nichts geaendert. Mit --apply schreiben.");
    await client.close();
    return;
  }

  if (operationen.length > 0) {
    const backupPfad = path.join(
      __dirname,
      "backups",
      "exercises-before-question-or-instruction-" +
        new Date().toISOString().replace(/[:.]/g, "-") +
        ".json",
    );
    const betroffeneIds = operationen.map((o) => o.updateOne.filter._id);
    const vorher = await exercises.find({ _id: { $in: betroffeneIds } }).toArray();
    fs.writeFileSync(backupPfad, JSON.stringify(vorher, null, 2));
    console.log("Backup geschrieben: " + backupPfad + " (" + vorher.length + " Dokumente)");

    const ergebnis = await exercises.bulkWrite(operationen);
    console.log("Angewandt: modified=" + ergebnis.modifiedCount);
  } else {
    console.log("Nichts zu tun.");
  }

  const verbleibend = await exercises.countDocuments({
    $or: [{ instruction: { $exists: true } }, { question: { $exists: true } }],
  });
  console.log("Verbleibende Dokumente mit instruction/question: " + verbleibend);

  await client.close();
})().catch((e) => {
  console.error("FEHLER:", e.message);
  process.exit(1);
});
