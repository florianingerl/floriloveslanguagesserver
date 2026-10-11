// Migriert die bestehenden Daten auf das Quiz-Dokument-Modell und legt das
// Beispiel-Buch an:
//
//   1. Für jeden alten Quiz-Namen (Exercise.quiz als String, z.B. "deutsch")
//      wird ein Quiz-Dokument { website: "web", name, language } angelegt.
//   2. Exercise.quiz zeigt danach auf die _id des Quiz-Dokuments, zusätzlich
//      wird Exercise.language gesetzt.
//   3. Topic.quiz wird zu Topic.subject umbenannt.
//   4. Das Beispiel-Buch "Meine erste Geschichte" (Fach "deutsch") mit zwei
//      Quizzen und je fünf Aufgaben wird nur angelegt, wenn es noch nicht da ist.
//
// Aufruf:  npm run migrate:quiz
// Mit "-- --force" wird die Quiz-Collection vorher geleert und neu aufgebaut.

import { Types } from "mongoose";
import {
  Book,
  Exercise,
  Quiz,
  Topic,
} from "../src/models/LanguageLearningModel";

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  if (force) {
    await Quiz.deleteMany({});
    console.log("Quiz-Collection geleert (--force).");
  }

  // 1) Quiz-Dokumente für die vorhandenen Website-Quiz-Namen. Vor der Migration
  // steht in Exercise.quiz eine Zeichenkette, danach eine ObjectId.
  const alteNamen = (await Exercise.distinct("quiz")) as unknown as (
    | string
    | Types.ObjectId
  )[];
  const namen: string[] = alteNamen.filter(
    (n: unknown) => typeof n === "string"
  ) as string[];
  console.log(`Bekannte Quiz-Namen: ${namen.join(", ") || "(keine)"}`);

  const quizByName = new Map<string, Types.ObjectId>();
  for (const name of namen) {
    let quiz = await Quiz.findOne({ website: "web", name });
    if (!quiz) {
      quiz = await Quiz.create({ website: "web", name, language: name });
      console.log(`Quiz "${name}" angelegt (${quiz._id}).`);
    }
    quizByName.set(name, new Types.ObjectId(String(quiz._id)));
  }

  // 2) Aufgaben umstellen: quiz -> _id des Quiz-Dokuments, language setzen.
  const aufgaben = await Exercise.find({});
  for (const aufgabe of aufgaben) {
    const wert = aufgabe.quiz as unknown;
    if (typeof wert === "string") {
      const id = quizByName.get(wert);
      if (!id) continue;
      await Exercise.updateOne(
        { _id: aufgabe._id },
        { quiz: id, language: wert }
      );
      console.log(`Aufgabe ${aufgabe._id}: quiz "${wert}" -> ${id}`);
    } else if (wert && !aufgabe.language) {
      const quiz = await Quiz.findById(wert);
      if (quiz?.language) {
        await Exercise.updateOne(
          { _id: aufgabe._id },
          { language: quiz.language }
        );
      }
    }
  }

  // 3) Themen: quiz -> subject umbenennen.
  const themen = await Topic.find({});
  for (const thema of themen) {
    const alt = (thema as unknown as { quiz?: string }).quiz;
    if (alt === undefined) continue;
    await Topic.updateOne({ _id: thema._id }, { $set: { subject: alt }, $unset: { quiz: "" } });
  }
  console.log(`${themen.length} Themen geprüft: quiz -> subject.`);

  // 4) Beispiel-Buch anlegen (falls noch nicht vorhanden).
  const vorhandenesBuch = await Book.findOne({ name: "Meine erste Geschichte" });
  if (vorhandenesBuch) {
    console.log("Beispiel-Buch existiert bereits, Schritt 4 übersprungen.");
  } else {
    const quiz1 = await Quiz.create({
      website: "book",
      language: "deutsch",
      name: "Wortschatz: Sterne",
    });
    const quiz2 = await Quiz.create({
      website: "book",
      language: "deutsch",
      name: "Grammatik: Präteritum",
    });
    const buch = await Book.create({
      name: "Meine erste Geschichte",
      subject: "deutsch",
      paragraphs: [
        "<p>Es war einmal ein kleiner Junge, der jeden Abend am Fenster stand und die Sterne zaehlte. Er fragte sich, ob die Sterne wohl zurueckzaehlten, wenn er sie ansah.</p>",
        "<p>Eines Tages fand er ein altes Buch in der Bibliothek seiner Grossmutter. Auf der ersten Seite stand nur ein einziger Satz: &bdquo;Wer erzaehlt, der lebt zweimal.&ldquo;</p>",
        "<p>Von diesem Moment an begann er, jeden Tag eine kleine Geschichte zu schreiben. Und mit jeder Geschichte wurde seine Welt ein bisschen groesser.</p>",
      ],
      quizzes: [quiz1._id, quiz2._id],
    });
    const aufgaben1 = [
      ["Was zaehlte der Junge am Fenster?", ["Sterne", "Schaafe", "Wolken"], 0],
      ["Wie fuehlte sich der Junge, wenn er schrieb?", ["traurig", "gluecklich", "muede"], 1],
      ["Wie alt war das Buch?", ["brandneu", "alt", "leer"], 1],
      ["Wo hatte der Junge sein Buch gefunden?", ["Bibliothek", "Keller", "Garten"], 0],
      ["Was wuchs mit jeder Geschichte?", ["seine Angst", "seine Welt", "sein Hunger"], 1],
    ] as const;
    const aufgaben2 = [
      ["Der Junge ___ jeden Abend am Fenster.", ["stand", "steht", "stehen"], 0],
      ["Er ___ ein altes Buch.", ["findet", "fand", "finden"], 1],
      ["Seine Welt ___ groesser.", ["wurde", "werden", "wird"], 0],
      ["Er ___ die Sterne.", ["zaehlt", "zaehlte", "zaehlen"], 1],
      ["Am Abend ___ er am Fenster.", ["steht", "stand", "stehen"], 1],
    ] as const;

    async function aufgabenEinlegen(
      quizId: Types.ObjectId,
      liste: readonly (readonly [string, readonly string[], number])[]
    ): Promise<void> {
      for (let i = 0; i < liste.length; i++) {
        const [frage, optionen, richtig] = liste[i]!;
        await Exercise.create({
          quiz: quizId,
          language: "deutsch",
          type: "multipleChoice",
          imageUrl: "",
          instruction: "Waehle die richtige Antwort.",
          question: frage,
          options: optionen.map((option, index) => ({
            option,
            correct: index === richtig,
          })),
        });
      }
    }

    await aufgabenEinlegen(new Types.ObjectId(String(quiz1._id)), aufgaben1);
    await aufgabenEinlegen(new Types.ObjectId(String(quiz2._id)), aufgaben2);
    console.log(
      `Beispiel-Buch "Meine erste Geschichte" angelegt (${buch._id}) mit ${quiz1._id} und ${quiz2._id}.`
    );
  }

  await Exercise.db.close();
  console.log("Migration abgeschlossen.");
}

main().catch(async (e) => {
  console.error("Migration fehlgeschlagen:", e.message ?? e);
  await Exercise.db.close();
  process.exit(1);
});