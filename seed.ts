// Schreibt die Fragen aus seed/exercises.json in die Datenbank (URL aus db.config.ts bzw. MONGODB_URL).
// Bricht ab, wenn schon Fragen vorhanden sind – mit --force wird die Collection vorher geleert.
import fs from "fs";
import path from "path";
import { Exercise } from "./src/models/LanguageLearningModel";

async function main(): Promise<void> {
  const datei = path.join(__dirname, "seed", "exercises.json");
  const fragen = JSON.parse(fs.readFileSync(datei, "utf8"));
  const force = process.argv.includes("--force");

  const vorhanden = await Exercise.countDocuments();
  if (vorhanden > 0 && !force) {
    console.log(`Die Collection enthält schon ${vorhanden} Fragen. Mit "npm run seed -- --force" wird sie vorher geleert.`);
    await Exercise.db.close();
    process.exit(1);
  }
  if (vorhanden > 0) {
    await Exercise.deleteMany({});
    console.log(`${vorhanden} vorhandene Fragen gelöscht.`);
  }

  const ergebnis = await Exercise.insertMany(fragen);
  console.log(`${ergebnis.length} Fragen eingefügt.`);
  await Exercise.db.close();
}

main().catch((e) => {
  console.error("Seed fehlgeschlagen:", e.message ?? e);
  process.exit(1);
});
