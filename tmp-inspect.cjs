const { MongoClient } = require("mongodb");
const URL = "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";
(async () => {
  const c = new MongoClient(URL, { serverSelectionTimeoutMS: 20000 });
  await c.connect();
  const db = c.db();
  console.log("Verbunden mit DB:", db.databaseName);
  const quizzes = await db.collection("quizzes").find({ website: "web" }).toArray();
  console.log("Website-Quizzes:", JSON.stringify(quizzes.map((q) => ({ id: q._id, subject: q.subject, name: q.name })), null, 2));
  const topics = await db.collection("topics").find({ subject: { $in: ["informatics", "webprogramming"] } }).toArray();
  console.log("Topics informatics/webprogramming:");
  for (const t of topics) console.log("  ", t.subject, "|", t.title, "| parent:", t.parentId ?? "-");
  await c.close();
})().catch((e) => {
  console.error("FEHLER:", e.message);
  process.exit(1);
});
