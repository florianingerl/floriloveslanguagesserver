// Repariert Multiple-Choice-Aufgaben in der Datenbank:
//
//   1. Aufgaben vom Typ "multipleChoice", die ueberhaupt keine Optionen haben
//      (weder options noch optionsEn noch optionsFr), sind unbrauchbar und
//      werden geloescht. Im Quiz wuerde eine solche Aufgabe ohne Kaestchen
//      erscheinen, sodass die Validierung nicht funktioniert.
//   2. Aufgaben vom Typ "multipleChoice" mit mehreren als richtig markierten
//      Optionen werden auf genau eine richtige Option reduziert: die erste als
//      richtig markierte Option bleibt richtig, alle weiteren werden falsch.
//      Sonst bleibt eine richtig angekreuzte Antwort ohne Rueckmeldung.
//
// Vor dem Aendern wird die exercises-Collection als EJSON gesichert.
//
// Aufruf (auf dem Server, damit die Produktions-Verbindung genutzt wird):
//   NODE_ENV=production npx ts-node scripts/fix-multiple-choice.ts --dry-run
//   NODE_ENV=production npx ts-node scripts/fix-multiple-choice.ts
//
// Mit --dry-run wird nur gelesen; es wird nichts geaendert.

import { MongoClient, Db } from "mongodb";
import { EJSON } from "bson";
import * as fs from "fs";
import * as path from "path";
import dbConfig from "../src/config/db.config";

const dryRun = process.argv.includes("--dry-run");

// Sichert die exercises-Collection als EJSON (erhaelt ObjectId- und Datumstypen).
async function backup(db: Db): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(__dirname, "..", "backups", stamp);
  fs.mkdirSync(dir, { recursive: true });
  const docs = await db.collection("exercises").find({}).toArray();
  fs.writeFileSync(
    path.join(dir, "exercises.json"),
    EJSON.stringify(docs, undefined, 2),
  );
  console.log(`Backup exercises: ${docs.length} Dokumente -> ${dir}`);
  return dir;
}

type Option = { option?: string; correct?: boolean };

// Hat die Aufgabe ueberhaupt keine Optionen in irgendeiner Sprache?
function hatKeineOptionen(exercise: Record<string, unknown>): boolean {
  for (const feld of ["options", "optionsEn", "optionsFr"]) {
    const liste = exercise[feld];
    if (Array.isArray(liste) && liste.length > 0) return false;
  }
  return true;
}

// Reduziert eine Optionsliste auf genau eine richtige Option (die erste).
// Gibt true zurueck, wenn etwas geaendert wurde.
function normalisiere(liste: unknown): boolean {
  if (!Array.isArray(liste)) return false;
  const richtigeIndizes: number[] = [];
  liste.forEach((o: Option, i: number) => {
    if (o && o.correct === true) richtigeIndizes.push(i);
  });
  if (richtigeIndizes.length <= 1) return false;
  const behalten = richtigeIndizes[0];
  liste.forEach((o: Option, i: number) => {
    if (o && o.correct === true && i !== behalten) o.correct = false;
  });
  return true;
}

async function main(): Promise<void> {
  const client = new MongoClient(dbConfig.URL);
  await client.connect();
  const db = client.db();
  console.log(`Verbunden mit Datenbank "${db.databaseName}".`);
  if (dryRun) console.log("DRY RUN: es wird nichts geaendert.");

  const exCol = db.collection("exercises");

  if (!dryRun) await backup(db);

  const alleMc = await exCol.find({ type: "multipleChoice" }).toArray();
  console.log(`${alleMc.length} Multiple-Choice-Aufgaben gefunden.`);

  // 1) Unbrauchbare Aufgaben ohne jede Option loeschen.
  const kaputt = alleMc.filter(hatKeineOptionen);
  for (const e of kaputt) {
    const frage = String(e.question ?? "").slice(0, 60);
    console.log(`  Loesche Aufgabe ${e._id} (Fach="${e.subject}", Frage="${frage}")`);
    if (!dryRun) await exCol.deleteOne({ _id: e._id });
  }
  console.log(`${kaputt.length} Aufgabe(n) ohne Optionen ${dryRun ? "wuerden geloescht" : "geloescht"}.`);

  // 2) Aufgaben mit mehreren richtigen Optionen reduzieren.
  let normalisiert = 0;
  for (const e of alleMc) {
    if (hatKeineOptionen(e)) continue;
    const set: Record<string, unknown> = {};
    for (const feld of ["options", "optionsEn", "optionsFr"]) {
      if (normalisiere(e[feld])) set[feld] = e[feld];
    }
    if (Object.keys(set).length === 0) continue;
    const frage = String(e.question ?? "").slice(0, 60);
    const felder = Object.keys(set).join(", ");
    console.log(`  Normalisiere Aufgabe ${e._id} (Felder: ${felder}, Frage="${frage}")`);
    if (!dryRun) await exCol.updateOne({ _id: e._id }, { $set: set });
    normalisiert++;
  }
  console.log(
    `${normalisiert} Aufgabe(n) mit mehreren richtigen Optionen ${dryRun ? "wuerden normalisiert" : "normalisiert"}.`,
  );

  await client.close();
  console.log(dryRun ? "Dry run abgeschlossen." : "Fertig.");
}

main().catch((e) => {
  console.error("Fehlgeschlagen:", e?.message ?? e);
  process.exit(1);
});
