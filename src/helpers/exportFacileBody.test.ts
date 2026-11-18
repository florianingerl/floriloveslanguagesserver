import assert from "assert";
import {
  baueExportFacileBody,
  gapTextZuBloecken,
  lueckenAnzahl,
} from "./exportFacileBody";

const BILD = "https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/b3/71/IvGpjFm5.jpg";

const mehrfach = {
  type: "gapText",
  imageUrl: BILD,
  gapText:
    "Asim is {more} intelligent than a duck, in fact, he is the {most} intelligent software developer from Pakistan.",
};

const bloecke = gapTextZuBloecken(mehrfach.gapText, `<img src="${BILD}"> `);
assert.strictEqual(bloecke.length, 2);
assert.strictEqual(
  bloecke[0].q,
  `<img src="${BILD}"> Asim is * intelligent than a duck, in fact, he is the`,
);
assert.strictEqual(bloecke[0].r, "more");
assert.strictEqual(bloecke[1].q, "* intelligent software developer from Pakistan. <br>");
assert.strictEqual(bloecke[1].r, "most");

const exportiert = baueExportFacileBody({
  site: "anglaisfacile.com",
  quiz: "english",
  testId: 131880,
  title: "Playing around a bit",
  author: "flori10",
  testType: "optionsGleich",
  exercises: [mehrfach],
});
const felder = new URLSearchParams(exportiert.body);
assert.strictEqual(exportiert.mehrfachLuecken, true);
assert.strictEqual(exportiert.type, "1");
assert.strictEqual(exportiert.numero, "3");
assert.strictEqual(exportiert.fragen, 10);
assert.strictEqual(felder.get("type"), "1");
assert.strictEqual(felder.get("numero"), "3");
assert.strictEqual(felder.get("mychoice"), "10");
assert.strictEqual(felder.get("q1"), bloecke[0].q);
assert.strictEqual(felder.get("r1"), "more");
assert.strictEqual(felder.get("q2"), bloecke[1].q);
assert.strictEqual(felder.get("r2"), "most");
assert.strictEqual(felder.get("auteur2"), "flori10");
assert.strictEqual(felder.get("casier"), "clone du test 131880");
assert.strictEqual(felder.get("yenamarre"), "0001");

const ohneTypZwang = baueExportFacileBody({
  site: "anglaisfacile.com",
  testId: 131880,
  testType: "trous",
  exercises: [mehrfach],
});
assert.strictEqual(ohneTypZwang.type, "0");
assert.strictEqual(ohneTypZwang.numero, "3");

const mitOptionen = baueExportFacileBody({
  site: "anglaisfacile.com",
  testId: 131880,
  testType: "optionsDifferents",
  exercises: [
    {
      type: "gapText",
      gapText: "La femme {qui|que} tient le livre.",
    },
  ],
});
const optionsFelder = new URLSearchParams(mitOptionen.body);
assert.strictEqual(optionsFelder.get("r1"), "qui|que");
assert.strictEqual(optionsFelder.get("q1"), "La femme * tient le livre. <br>");
assert.strictEqual(optionsFelder.get("type"), "3");
assert.strictEqual(optionsFelder.get("numero"), "0");

const einzeln = baueExportFacileBody({
  site: "francaisfacile.com",
  quiz: "french",
  testId: 42,
  testType: "trous",
  exercises: [{ type: "gapText", gapText: "Il est {grand}." }],
});
const einzelFelder = new URLSearchParams(einzeln.body);
assert.strictEqual(einzelFelder.get("q1"), "Il est *. <br>");
assert.strictEqual(einzeln.mehrfachLuecken, false);
assert.strictEqual(einzeln.numero, "0");
assert.strictEqual(einzelFelder.get("yenamarre"), "0002");

const mehrfachAuswahl = baueExportFacileBody({
  site: "anglaisfacile.com",
  testId: 131880,
  testType: "trous",
  exercises: [
    {
      type: "multipleChoice",
      questionOrInstruction: "Choose ___",
      options: [
        { option: "wrong", correct: false },
        { option: "right", correct: true },
      ],
    },
  ],
});
const auswahlFelder = new URLSearchParams(mehrfachAuswahl.body);
assert.strictEqual(auswahlFelder.get("q1"), "Choose *");
assert.strictEqual(auswahlFelder.get("r1"), "right");

const mitAllenOptionen = baueExportFacileBody({
  site: "anglaisfacile.com",
  testId: 131880,
  testType: "optionsDifferents",
  exercises: [
    {
      type: "multipleChoice",
      questionOrInstruction: "Choose ___",
      options: [
        { option: "wrong", correct: false },
        { option: "right", correct: true },
      ],
    },
  ],
});
assert.strictEqual(new URLSearchParams(mitAllenOptionen.body).get("r1"), "right|wrong");

const iso = baueExportFacileBody({
  site: "anglaisfacile.com",
  testId: 131880,
  title: "Café d’été",
  exercises: [{ type: "gapText", gapText: "Il est {grand}." }],
});
assert.ok(iso.body.includes("%E9"));
assert.ok(!iso.body.includes("%C3%A9"));
assert.ok(!iso.body.includes("%E2%80%99"));

const viele = baueExportFacileBody({
  site: "anglaisfacile.com",
  testId: 131880,
  exercises: Array.from({ length: 11 }, () => ({
    type: "gapText",
    gapText: "Word {one}.",
  })),
});
assert.strictEqual(viele.fragen, 11);
assert.strictEqual(new URLSearchParams(viele.body).get("mychoice"), "11");

assert.strictEqual(lueckenAnzahl(mehrfach.gapText), 2);
assert.throws(
  () =>
    baueExportFacileBody({
      site: "anglaisfacile.com",
      testId: 1,
      exercises: [],
    }),
  /At least one exercise/,
);
assert.throws(
  () =>
    baueExportFacileBody({
      site: "anglaisfacile.com",
      testId: 1,
      exercises: [{ type: "gapText", gapText: "no gaps here" }],
    }),
  /at least one \{answer\}/,
);
assert.throws(
  () =>
    baueExportFacileBody({
      site: "anglaisfacile.com",
      testId: 1,
      exercises: [{ type: "gapText", gapText: "unbalanced {brace" }],
    }),
  /unbalanced braces/,
);

console.log("exportFacileBody tests passed");
