/*
 * mongosh-Skript: legt im Quiz "Web programming" (webprogramming) das Thema
 * "collapsible overlay button" unter "web design -> css" an und fuegt 10
 * Multiple-Choice-Aufgaben dazu ein.
 *
 * Der Baum wird also:  web design -> css -> collapsible overlay button
 *
 * Aufruf (Verbindungszeichenkette aus .env.production):
 *   mongosh "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/test" --quiet --file insert-collapsible-overlay-button.js
 *
 * Idempotent: Thema und Aufgaben werden nur angelegt, wenn sie noch nicht
 * vorhanden sind (Thema: gleicher Titel im Quiz, Aufgabe: gleiche Frage im Quiz).
 */

const OWNER = ObjectId("6ac13ec8ad4b9e599155b16e"); // Florian Ingerl
const WEBPROG_QUIZ = ObjectId("6acdcb46372d2c9a295ad6f8"); // Quiz "Web programming"
const CSS_TOPIC = ObjectId("6ad0e13287e8be3e7e86b01e"); // Thema "css"
const TITLE = "collapsible overlay button";

const TOPIC = {
  subject: "webprogramming",
  title: TITLE,
  quiz: WEBPROG_QUIZ,
  parentId: CSS_TOPIC,
  user: OWNER,
  tutorial:
    '<a href="https://developer.mozilla.org/en-US/docs/Web/CSS/position">MDN: position</a> · ' +
    '<a href="https://developer.mozilla.org/en-US/docs/Web/CSS/z-index">MDN: z-index</a>',
};

const IMG = (n) =>
  "assets/img/css/collapsible-overlay-button/collapsible-overlay-button-" +
  String(n).padStart(2, "0") +
  ".svg";

const EXERCISES = [
  {
    n: 1,
    question: "What is a collapsible overlay button?",
    correct:
      "A button that toggles a panel which floats on top of the page content instead of pushing it aside.",
    wrong: [
      "A button that permanently hides itself after the first click.",
      "A button that scrolls the page back to the very top.",
      "A button that expands to cover the whole browser window.",
    ],
  },
  {
    n: 2,
    question: "What does the trigger button of a collapsible overlay actually toggle?",
    correct: "A boolean state that shows or hides the overlay panel.",
    wrong: [
      "The z-index of every element on the page.",
      "The color theme of the whole website.",
      "The scroll position of the page.",
    ],
  },
  {
    n: 3,
    question:
      "Which CSS is typically used to make the panel float above the rest of the page?",
    correct: "position: absolute (or fixed) together with a high z-index.",
    wrong: [
      "display: inline-block together with a fixed height.",
      "position: static together with a high z-index.",
      "float: left together with clear: both.",
    ],
  },
  {
    n: 4,
    question:
      "The topic filter's overlay uses z-index: 1000. What is the purpose of z-index here?",
    correct:
      "It controls the stacking order so the overlay is painted on top of the page content.",
    wrong: [
      "It sets the width of the overlay in pixels.",
      "It delays the opening animation by 1000 ms.",
      "It limits the overlay to 1000 characters of text.",
    ],
  },
  {
    n: 5,
    question:
      "The overlay uses top: 100% and left: 0. What does top: 100% mean here?",
    correct:
      "The overlay's top edge starts at the bottom edge of its (position: relative) parent, i.e. directly below the button.",
    wrong: [
      "It moves the overlay 100 pixels down from the top of the page.",
      "It makes the overlay 100% as wide as the viewport.",
      "It shifts the overlay to the right by 100%.",
    ],
  },
  {
    n: 6,
    question: "Which of these is a typical way to close a collapsible overlay?",
    correct: "Clicking outside the overlay (or pressing Escape).",
    wrong: [
      "Scrolling the page sideways.",
      "Moving the mouse across the page.",
      "Resizing the browser window.",
    ],
  },
  {
    n: 7,
    question:
      "In VueTopicFilter.vue, how is the topic tree made to float over the rest of the UI?",
    correct:
      "Through the .topic-tree-overlay class with position: absolute and z-index: 1000.",
    wrong: [
      "Through the .topic-filter class with position: relative.",
      "Through a prop called overlay on the PrimeVue Tree component.",
      "Through the Bootstrap class btn-link on the button.",
    ],
  },
  {
    n: 8,
    question:
      "What is the difference between an overlay panel and a normal expanding section?",
    correct:
      "The overlay is taken out of the normal flow and covers the content, while an expanding section pushes the surrounding content down.",
    wrong: [
      "The overlay pushes the content down, while an expanding section covers it.",
      "Both always push the surrounding content down.",
      "The overlay can only hold images, an expanding section only text.",
    ],
  },
  {
    n: 9,
    question:
      "What is a main advantage of using an overlay instead of an expanding section?",
    correct:
      "It does not reflow the rest of the page, so the layout stays in place.",
    wrong: [
      "It makes the page load faster.",
      "It removes the need for JavaScript entirely.",
      "It replaces the need for any CSS positioning.",
    ],
  },
  {
    n: 10,
    question: "Which of these user interfaces is an example of a collapsible overlay?",
    correct: "A dropdown menu that opens on top of the page content.",
    wrong: [
      "A paragraph of normal text in the document flow.",
      "A fixed-width image inside a grid.",
      "A page footer at the very bottom of the document.",
    ],
  },
];

print("Datenbank: " + db.getName());
print("");

// ---- Thema anlegen bzw. wiederverwenden -----------------------------------
let topic = db.topics.findOne({
  subject: TOPIC.subject,
  title: TOPIC.title,
  quiz: WEBPROG_QUIZ,
  parentId: CSS_TOPIC,
});

if (topic) {
  print('Thema vorhanden: "' + TITLE + '" -> ' + topic._id);
} else {
  const jetzt = new Date();
  const res = db.topics.insertOne(
    Object.assign({}, TOPIC, { createdAt: jetzt, updatedAt: jetzt })
  );
  topic = db.topics.findOne({ _id: res.insertedId });
  print('Thema angelegt : "' + TITLE + '" -> ' + topic._id);
}
print("");

// ---- Aufgaben anlegen -----------------------------------------------------
let neu = 0;
let uebersprungen = 0;

EXERCISES.forEach((ex) => {
  const vorhanden = db.exercises.findOne({
    quiz: WEBPROG_QUIZ,
    question: ex.question,
  });
  if (vorhanden) {
    uebersprungen++;
    print("  vorhanden : " + ex.question);
    return;
  }

  const options = [{ option: ex.correct, correct: true }].concat(
    ex.wrong.map((w) => ({ option: w, correct: false }))
  );

  const jetzt = new Date();
  db.exercises.insertOne({
    quiz: WEBPROG_QUIZ,
    subject: "webprogramming",
    type: "multipleChoice",
    imageUrl: IMG(ex.n),
    topic: topic._id,
    instruction: "Choose the correct answer.",
    question: ex.question,
    options: options,
    optionsEn: [],
    optionsFr: [],
    sentences: [],
    guessedSentences: [],
    user: OWNER,
    createdAt: jetzt,
    updatedAt: jetzt,
    __v: 0,
  });
  neu++;
  print("  angelegt  : " + ex.question);
});

print("");
print("Fertig. Neu: " + neu + ", uebersprungen: " + uebersprungen + ".");
print("Thema _id: " + topic._id);
