// Der Inhalt der Multiple-Choice-Aufgaben zum Thema
// "TypeScript - destructuring expressions" (Fach "webprogramming").
//
// Die Aufgaben beruhen auf dem Medium-Artikel
// https://medium.com/@taitasciore/es6-destructuring-in-depth-when-using-typescript-bdf7c899768a
// und sind auf Englisch. Als Bild bekommt jede Aufgabe das Bild, das im Artikel
// im jeweiligen Absatz angezeigt wird (die Code-Screenshots bzw. das Titelbild).
//
// Dieses Modul wird sowohl vom Seed-Skript (add-webprogramming-quiz.ts) als
// auch vom Uebersetzungsskript (translate-webprogramming-quiz.ts) benutzt, damit
// der Inhalt nur an einer Stelle steht.

export type Option = { option: string; correct: boolean };

export type Frage = {
  // Der englische Fragetext.
  frage: string;
  // Die erste Option ist die richtige.
  optionen: string[];
  // An welcher Stelle (0..3) die richtige Option stehen soll.
  position: number;
  // Das Bild des Absatzes im Artikel (zugleich der Schluessel zum Wiederfinden).
  bild: string;
};

export const INSTRUCTION = "Choose the correct answer.";

// Bilder aus dem Artikel (in Reihenfolge des Erscheinens).
const MIRO = "https://miro.medium.com/v2/resize:fit:1400/";
const BILD_TITEL = MIRO + "1*00N9Hs5KCX9IwNepd7Id4A.jpeg";
const BILD_RES_CODE = MIRO + "1*CyOusrkRxuYbXG0klN2xiw.png";
const BILD_OBJ_DESTR = MIRO + "1*cHp71O-8SQW9R8Q5ABXluA.png";
const BILD_RENAME = MIRO + "1*wj60dY1g_3-3mqRMaLhKAA.png";
const BILD_DEFAULT = MIRO + "1*MVcm13tA_01gTXjOSFtBlA.png";
const BILD_DEFAULT_TYP = MIRO + "1*w9VaZ1qWsm8WycCCwF1gKQ.png";
const BILD_NESTED = MIRO + "1*buZ5Remlz2sL45RSYSrB1g.png";
const BILD_NESTED_TYP = MIRO + "1*1LvRSvwMWuuH2L4tXK4-IQ.png";
const BILD_ARRAY = MIRO + "1*SZJG9ut3NKOki9M7OkUIQw.png";
const BILD_ARRAY_ALT = MIRO + "1*be1xCNDJB6BVXAvrTo9HAA.png";
const BILD_ARRAY_DEFAULT = MIRO + "1*G33u7jQOE-7bUOXI1Vzohg.png";
const BILD_OMIT = MIRO + "1*RS6f8kYA6LeQimG9Jx0Kmw.png";
const BILD_SWAP = MIRO + "1*Doxv126PYAij1GzBB4sUIw.png";

export const FRAGEN: Frage[] = [
  {
    frage: "What does destructuring mean in JavaScript/TypeScript?",
    optionen: [
      "Unpacking values from arrays or objects into separate variables",
      "Packing values into arrays or objects",
      "Deep-copying objects and arrays",
      "Checking types at runtime",
    ],
    position: 2,
    bild: BILD_TITEL,
  },
  {
    frage:
      "Why is code like 'res.id, res.title, res.phoneNumber' cumbersome, and what is the advantage of object destructuring?",
    optionen: [
      "With destructuring you can unpack multiple properties into separate variables in one step",
      "Destructuring prevents res from having any properties at all",
      "Destructuring makes the assignment longer and less readable",
      "Destructuring permanently removes the properties from res",
    ],
    position: 1,
    bild: BILD_RES_CODE,
  },
  {
    frage: "Given const { id, title } = res; What happens here?",
    optionen: [
      "id and title are unpacked from res and created as variables with the same names",
      "id and title become new properties of res",
      "res is converted into an array [id, title]",
      "id and title are renamed inside res",
    ],
    position: 3,
    bild: BILD_OBJ_DESTR,
  },
  {
    frage:
      "When destructuring an object, how do you rename the property id to the variable identifier while unpacking it?",
    optionen: [
      "const { id: identifier } = res;",
      "const { id as identifier } = res;",
      "const { id -> identifier } = res;",
      "const { identifier: id } = res;",
    ],
    position: 0,
    bild: BILD_RENAME,
  },
  {
    frage:
      "When destructuring an object, how do you specify a default value in case phoneNumber is missing?",
    optionen: [
      "const { phoneNumber = '000' } = res;",
      "const { phoneNumber: '000' } = res;",
      "const { phoneNumber || '000' } = res;",
      "const { phoneNumber ?? '000' } = res;",
    ],
    position: 2,
    bild: BILD_DEFAULT,
  },
  {
    frage:
      "What type does phoneNumber have when a default value is set: const { phoneNumber = '000' } = res; ?",
    optionen: [
      "string (the type is no longer undefined)",
      "string | undefined",
      "any",
      "undefined",
    ],
    position: 1,
    bild: BILD_DEFAULT_TYP,
  },
  {
    frage:
      "How do you unpack the nested property c from a.b using destructuring?",
    optionen: [
      "const { b: { c } } = a;",
      "const { b.c } = a;",
      "const { b, c } = a;",
      "const { b->c } = a;",
    ],
    position: 3,
    bild: BILD_NESTED,
  },
  {
    frage:
      "How do you type the nested property b while destructuring it at the same time?",
    optionen: [
      "const { b }: { b: B } = a;",
      "const { b: B } = a;",
      "const { b } as B = a;",
      "const B { b } = a;",
    ],
    position: 0,
    bild: BILD_NESTED_TYP,
  },
  {
    frage:
      "Given const range: [number, number] = [0, 10]; How do you unpack both values using array destructuring?",
    optionen: [
      "const [min, max] = range;",
      "const { min, max } = range;",
      "const (min, max) = range;",
      "const [min: max] = range;",
    ],
    position: 2,
    bild: BILD_ARRAY,
  },
  {
    frage:
      "Which code is equivalent to 'const [min, max] = range;' without destructuring?",
    optionen: [
      "const min = range[0]; const max = range[1];",
      "const min = range.min; const max = range.max;",
      "const min = range(0); const max = range(1);",
      "const min = range.first; const max = range.last;",
    ],
    position: 1,
    bild: BILD_ARRAY_ALT,
  },
  {
    frage:
      "How do you set a default value for the first element and collect the rest when destructuring an array?",
    optionen: [
      "const [first = 0, ...rest] = numbers;",
      "const [first: 0, ...rest] = numbers;",
      "const [first || 0, ...rest] = numbers;",
      "const { first = 0, ...rest } = numbers;",
    ],
    position: 3,
    bild: BILD_ARRAY_DEFAULT,
  },
  {
    frage:
      "How do you exclude properties (e.g. someProp) from an object with destructuring and collect the rest?",
    optionen: [
      "const { someProp, ...restProps } = props;",
      "const { someProp: ...restProps } = props;",
      "const [...restProps, someProp] = props;",
      "const { restProps } = omit(props, someProp);",
    ],
    position: 0,
    bild: BILD_OMIT,
  },
  {
    frage:
      "How do you swap the values of two variables a and b using destructuring?",
    optionen: [
      "[a, b] = [b, a];",
      "{ a, b } = { b, a };",
      "swap(a, b);",
      "[a, b] = (b, a);",
    ],
    position: 2,
    bild: BILD_SWAP,
  },
];

// Baut die Optionsliste: die erste Option der Frage ist die richtige und wird
// an die Stelle "position" gesetzt; die uebrigen bleiben in ihrer Reihenfolge.
export function options(f: Frage): Option[] {
  const richtige = f.optionen[0];
  const falsche = f.optionen.slice(1);
  const liste: Option[] = falsche.map((option) => ({ option, correct: false }));
  const pos = Math.max(0, Math.min(f.position, liste.length));
  liste.splice(pos, 0, { option: richtige, correct: true });
  return liste;
}
