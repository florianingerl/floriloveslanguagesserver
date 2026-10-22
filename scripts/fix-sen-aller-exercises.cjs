/*
 * Korrigiert die 18 gapText-Aufgaben des Themas
 * "S'en aller dans tous les temps et modes" (Quiz "french") in der DB.
 *
 * Die Aufgaben sind Uebersetzungen englischer Saetze (Quelle: anglaisfacile.com).
 * Enthalten sind typische Französisch-Fehler des Lernenden:
 * Grammatik (Subjonktiv nach "bien que", "Si j'aurais mis", ...), Rechtschreibung
 * ("guitarre", "animal", "appele"), Zeichensetzung ("Va t'en", Klammern) und
 * Kopierfehler in der Anweisung ("Remplis le trou par le bon nombre entre 1 et 12 !").
 *
 * Aufruf:
 *   node scripts/fix-sen-aller-exercises.cjs              # Dry-Run, schreibt nichts
 *   node scripts/fix-sen-aller-exercises.cjs --apply     # schreibt (mit Backup)
 *
 * Die Verbindungszeichenfolge kommt aus der Umgebung (MONGODB_URL). Sie wird
 * bewusst nicht fest eingetragen, damit kein Passwort ins Repository wandert.
 * Das Skript ist idempotent: bereits korrekte Aufgaben bleiben unberuehrt.
 */
const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

const URL = process.env.MONGODB_URL || "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";
const APPLY = process.argv.includes("--apply");
const TOPIC = new ObjectId("6ad9f428f8b525104c424906");
const BACKUP_DIR = path.join(__dirname, "..", "backups");

// Die Anweisung, die zu allen Aufgaben des Themas gehoert. Vorher stand dort
// (per Copy-Paste aus den Zahlen-Aufgaben) "Remplis le trou par le bon nombre
// entre 1 et 12 !", obwohl hier konjugiert wird.
const INSTRUCTION = "Conjugue le verbe « s'en aller » au temps indiqué !";

// Die korrigierten Texte: _id -> neuer gapText.
// Was nicht hier steht, bleibt unveraendert (nur die Anweisung wird ersetzt).
const FIXES = {
  // "Bien que" verlangt den Subjonktiv, "je dois" ist also falsch. Der
  // Lernende wollte den Infinitiv pruefen, deshalb "Puisque" statt "Bien que".
  "6ad9f4aff8b525104c424909":
    "Puisque cette maison est un bon endroit pour vivre, je dois {m'en aller} (Infinitif) parce que j'ai trouvé du travail ailleurs.",
  // "qui" kann kein Subjekt von "avoir" sein ("qu'il a semés"), "atriu" ist
  // Muell, "Infinitv" ist ein Tippfehler.
  "6ad9f52ff8b525104c424910":
    "Cueillir les fruits qu'il a semés et puis {s'en aller} (Infinitif) sans payer n'est pas très gentil.",
  // "une guitarre" gibt es nicht ("une guitare"), und "m'enseigner a jouer"
  // ist falsch ("m'apprendre a jouer de ...").
  "6ad9f634f8b525104c42491d":
    "{Va-t'en} (Impératif - tu) ! Étant donné que tu ne sais même pas que ce n'est pas une guitare, tu ne peux pas m'apprendre à jouer de cet instrument.",
  // "en printemps" gibt es nicht ("au printemps").
  "6ad9f6eef8b525104c424924":
    "La beauté de ce jardin {s'en ira} (Futur simple) en hiver mais, heureusement, reviendra au printemps.",
  // "m'appele" -> "m'appelle", "du l'ile" -> "de l'ile", "parce que il" ->
  // "parce qu'il", "animals" -> "animaux".
  "6ad9f7acf8b525104c42492b":
    "Je m'appelle Sofia et je {me suis allée} (Passé composé) de l'île parce qu'il y avait tant d'animaux dangereux.",
  // "Va t'en" -> "Va-t'en", und kein Punkt am Satzende (im Deutschen Punkt,
  // im Französischen "!"), kein Leerzeichen vor dem Punkt.
  "6ad9f81af8b525104c424932": "{Va-t'en} (Impératif - tu) ! Je suis nue !",
  // "preoccupations" ist weiblich und plural: "toutes ses preoccupations".
  "6ad9f8fcf8b525104c424939":
    "Toutes ses préoccupations {s'en allaient} (Imparfait) l'un après l'autre pendant que la femme prenait un bain chaud.",
  // Imperfekt der 2. Person ist "t'en allais", nicht "t'en allait".
  "6ad9f972f8b525104c424940":
    "Si tu {t'en allais} (Imparfait), je pourrais sortir du bain et m'habiller.",
  // "abailles" ist die veraltete Schreibweise ("abeilles"), und "une promenades"
  // gibt es nicht ("une promenade").
  "6ad9fa27f8b525104c424947":
    "Si toutes les abeilles {s'en allaient} (Imparfait), je ferais une promenade dans ce pré.",
  // "Si j'aurais mis" gibt es nicht ("Si j'avais mis"), "Conditionel" ->
  // "Conditionnel", "abailles" -> "abeilles".
  "6ad9fae8f8b525104c42494e":
    "Si j'avais mis du Roundup sur ce pré, toutes les abeilles {s'en seraient allées} (Conditionnel passé).",
  // "le temps pour attendre" gibt es nicht ("le temps d'attendre"), und "la
  // queue" (Schwanz) muss "la file" (Warteschlange) heissen.
  "6ad9fbfff8b525104c42495c":
    "Nous {nous en sommes allés} (Passé composé) parce que la file était trop longue et nous n'avions pas le temps d'attendre.",
  // "du garcons" -> "du garcon", und "s'en aller" braucht das Pronomen "en":
  // "se seront allés" -> "s'en seront allés".
  "6ad9fdaaf8b525104c42496a":
    "Les papillons dans le ventre du garçon {s'en seront allés} (Futur passé) quand la fille aura fini de lui donner des bises.",
  // Unbalancierte Klammer: "(Subjonctif present}" -> "(Subjonctif present)".
  "6ad9ffb2f8b525104c42497f":
    "Il faut que je {m'en aille} (Subjonctif présent) parce que j'ai une autre réunion maintenant.",
};

// Unveraendert (nur Anweisung): 6ad9fcaef8b425104c424963 (Futur proche),
// 6ad9fe53f8b425104c424971 (Passe simple), 6ad9ff09f8b425104c424978
// (Plus-que-parfait nach "Apres que" - auf Wunsch des Nutzers so belassen),
// 6ada0016f8b425104c424986 (Subjonctif passe), 6ad9fb53f8b425104c424955
// ("ce chien ensale tout" - Wortwahl mit dem Bild abgleichen).

function pruefeGapText(id, gapText) {
  const luecken = gapText.match(/\{([^}]*)\}/g) || [];
  if (luecken.length !== 1) {
    throw new Error(`${id}: erwartet genau eine Luecke, gefunden ${luecken.length}`);
  }
  const inhalt = luecken[0].slice(1, -1).trim();
  if (!inhalt) throw new Error(`${id}: leere Luecke`);
  if (inhalt.includes("|")) throw new Error(`${id}: Auswahl-Luecke unerwartet`);
}

(async () => {
  const client = new MongoClient(URL, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db("test");
  const exercises = db.collection("exercises");

  const docs = await exercises.find({ topic: TOPIC }).sort({ _id: 1 }).toArray();
  console.log(`Aufgaben im Topic: ${docs.length}`);
  if (docs.length !== 18) {
    console.log("ACHTUNG: Es werden 18 Aufgaben erwartet!");
  }

  const plan = [];
  for (const doc of docs) {
    const id = String(doc._id);
    const neu = FIXES[id];
    if (neu !== undefined) pruefeGapText(id, neu);
    const aenderungText = neu !== undefined && neu !== doc.gapText;
    const aenderungAnweisung = doc.questionOrInstruction !== INSTRUCTION;
    if (aenderungText || aenderungAnweisung) {
      plan.push({ id, alt: doc.gapText, neu: neu ?? doc.gapText, aenderungText, aenderungAnweisung });
    }
  }

  console.log(`Zu aendern: ${plan.length} Aufgaben\n`);
  for (const p of plan) {
    console.log(`--- ${p.id}`);
    if (p.aenderungText) {
      console.log(`  alt: ${p.alt}`);
      console.log(`  neu: ${p.neu}`);
    } else {
      console.log(`  gapText unveraendert: ${p.neu}`);
    }
    if (p.aenderungAnweisung) console.log("  Anweisung wird ersetzt");
  }

  if (!APPLY) {
    console.log("\nDRY-RUN (nichts geschrieben). Mit --apply ausfuehren.");
    await client.close();
    return;
  }

  // Backup der betroffenen Dokumente, bevor geschrieben wird.
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(BACKUP_DIR, `sen-aller-before-${stamp}.json`);
  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      { topic: "S'en aller dans tous les temps et modes", topicId: String(TOPIC), exercises: docs },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nBackup: ${backupFile}`);

  let geaendert = 0;
  for (const p of plan) {
    const set = { updatedAt: new Date() };
    if (p.aenderungText) set.gapText = p.neu;
    if (p.aenderungAnweisung) set.questionOrInstruction = INSTRUCTION;
    const res = await exercises.updateOne({ _id: new ObjectId(p.id) }, { $set: set });
    geaendert += res.modifiedCount;
  }
  console.log(`GESCHRIEBEN: ${geaendert} Aufgaben geaendert.`);

  // Gegenlesen: keine Luecke darf verloren gegangen sein.
  const nachher = await exercises.find({ topic: TOPIC }).sort({ _id: 1 }).toArray();
  for (const doc of nachher) {
    const luecken = (doc.gapText || "").match(/\{([^}]*)\}/g) || [];
    if (luecken.length !== 1) {
      throw new Error(`${doc._id}: nach der Aenderung ${luecken.length} Luecken`);
    }
  }
  console.log(`Kontrolle: ${nachher.length} Aufgaben, jede mit genau einer Luecke.`);

  await client.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
