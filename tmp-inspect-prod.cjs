const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.production") });
const { MongoClient } = require("mongodb");
const URL = process.env.MONGODB_URL || "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";

(async () => {
  const c = new MongoClient(URL, { serverSelectionTimeoutMS: 20000 });
  await c.connect();
  const db = c.db();

  console.log("=== Topic overflow ===");
  const of = await db.collection("topics").findOne({ _id: new (require("mongodb").ObjectId)("6ad1c81d5b867002f6d8611c") });
  console.log(JSON.stringify(of, null, 2));

  console.log("\n=== webprogramming exercises by topic ===");
  const exs = await db.collection("exercises").find({ subject: "webprogramming" }).toArray();
  const byTopic = {};
  for (const e of exs) {
    const k = String(e.topic ?? "-");
    byTopic[k] = (byTopic[k] || 0) + 1;
  }
  const topics = await db.collection("topics").find({ subject: "webprogramming" }).toArray();
  const tmap = new Map(topics.map((t) => [String(t._id), t.title]));
  for (const [k, n] of Object.entries(byTopic)) {
    console.log(`  topic ${k} (${tmap.get(k) ?? "??"}) : ${n}`);
  }

  console.log("\n=== Alle webprogramming-Exercises (Frage, Typ, Bild) ===");
  for (const e of exs) {
    console.log(`  [${tmap.get(String(e.topic)) ?? "??"}] ${e.type} | ${String(e.question).slice(0, 80)}`);
    console.log(`     img=${String(e.imageUrl).slice(0, 110)}`);
    console.log(`     options=${(e.options || []).map((o) => (o.correct ? "*" : "") + o.option).join(" | ")}`);
  }

  console.log("\n=== uploadedimages ===");
  for (const im of await db.collection("uploadedimages").find({}).project({ _id: 1, contentType: 1, user: 1 }).toArray()) {
    console.log(`  ${im._id} | ${im.contentType} | user=${im.user}`);
  }

  await c.close();
})().catch((e) => {
  console.error("FEHLER:", e.message);
  process.exit(1);
});
