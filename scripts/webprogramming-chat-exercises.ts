// Inhalt der Multiple-Choice-Aufgaben zu allgemeinen Web-Programmier-Themen,
// die im Chat vom heutigen Tag besprochen wurden (Fach "webprogramming").
//
// Bewusst allgemeine Fragen zu CSS und HTML/Accessibility, NICHT zu diesem
// Projekt. Die Aufgaben sind auf Englisch. Jede Aufgabe bekommt ein Bild, das
// thematisch passt (verlinkte Bilder).
//
// Dieses Modul wird vom Einfuege-Skript (add-webprogramming-chat-exercises.ts)
// benutzt.

export type Option = { option: string; correct: boolean };

export type Frage = {
  // Der englische Fragetext.
  frage: string;
  // Die erste Option ist die richtige.
  optionen: string[];
  // An welcher Stelle (0..4) die richtige Option stehen soll.
  position: number;
  // Das Bild der Aufgabe.
  bild: string;
  // Der Titel des Themas, zu dem die Aufgabe gehoert.
  thema: string;
};

export const INSTRUCTION = "Choose the correct answer.";

// Themen. Das Skript legt sie an, falls sie noch nicht vorhanden sind.
export const THEMEN: { titel: string; tutorial: string }[] = [
  {
    titel: "CSS - white-space property",
    tutorial:
      '<a href="https://developer.mozilla.org/en-US/docs/Web/CSS/white-space">MDN: white-space</a>',
  },
  {
    titel: "CSS - cursor and clickable elements",
    tutorial:
      '<a href="https://developer.mozilla.org/en-US/docs/Web/CSS/cursor">MDN: cursor</a>',
  },
  {
    titel: "HTML - links, buttons and keyboard accessibility",
    tutorial:
      '<a href="https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets">MDN: Keyboard-navigable JavaScript widgets</a>',
  },
];

// Themenbilder (Wikimedia Commons, direkte Dateiverweise).
const BILD_WHITESPACE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/HTML5_logo_and_wordmark.svg/512px-HTML5_logo_and_wordmark.svg.png";
const BILD_CURSOR =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Computer_mouse.jpg/640px-Computer_mouse.jpg";
const BILD_LINK =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Chain_link_icon.svg/512px-Chain_link_icon.svg.png";

export const FRAGEN: Frage[] = [
  // --- Thema: CSS - white-space property ---
  {
    frage:
      "In CSS, what does the white-space property actually control?",
    optionen: [
      "How whitespace characters in text are treated and where lines may wrap",
      "The background color behind the text",
      "The font size of a text element",
      "The distance between two block elements",
    ],
    position: 2,
    bild: BILD_WHITESPACE,
    thema: "CSS - white-space property",
  },
  {
    frage:
      "Why is the CSS property called white-space?",
    optionen: [
      "Historically it refers to the empty room (whitespace) on a page",
      "It only applies to elements with a white background",
      "It sets the color of the space between words",
      "It was the name of the company that invented CSS",
    ],
    position: 1,
    bild: BILD_WHITESPACE,
    thema: "CSS - white-space property",
  },
  {
    frage:
      "Which white-space value collapses whitespace as usual but never allows the text to wrap?",
    optionen: [
      "normal",
      "pre",
      "nowrap",
      "pre-wrap",
    ],
    position: 3,
    bild: BILD_WHITESPACE,
    thema: "CSS - white-space property",
  },
  {
    frage:
      "Which white-space value preserves spaces and newlines and still allows lines to wrap?",
    optionen: [
      "pre-wrap",
      "nowrap",
      "normal",
      "pre-line",
    ],
    position: 0,
    bild: BILD_WHITESPACE,
    thema: "CSS - white-space property",
  },
  // --- Thema: CSS - cursor and clickable elements ---
  {
    frage:
      "Which CSS property is the main signal to a user that an element is clickable?",
    optionen: [
      "cursor: pointer",
      "overflow: hidden",
      "white-space: nowrap",
      "position: absolute",
    ],
    position: 0,
    bild: BILD_CURSOR,
    thema: "CSS - cursor and clickable elements",
  },
  {
    frage:
      "Which cursor value is commonly used to show that an element looks clickable but is currently disabled?",
    optionen: [
      "cursor: grab",
      "cursor: not-allowed",
      "cursor: text",
      "cursor: crosshair",
    ],
    position: 1,
    bild: BILD_CURSOR,
    thema: "CSS - cursor and clickable elements",
  },
  {
    frage:
      "Why is user-select: none often set on button-like elements?",
    optionen: [
      "To prevent text selection when the element is clicked repeatedly",
      "To make the text bold",
      "To disable the element completely",
      "To change the text color on hover",
    ],
    position: 3,
    bild: BILD_CURSOR,
    thema: "CSS - cursor and clickable elements",
  },
  // --- Thema: HTML - links, buttons and keyboard accessibility ---
  {
    frage:
      "Which HTML element is semantically correct when clicking navigates the user to another page?",
    optionen: [
      "<a> (a link)",
      "<button>",
      "<div> with cursor: pointer",
      "<span>",
    ],
    position: 1,
    bild: BILD_LINK,
    thema: "HTML - links, buttons and keyboard accessibility",
  },
  {
    frage:
      "How does a native HTML <button> differ from a link when it comes to keyboard activation?",
    optionen: [
      "A button can be activated with Enter and Space, a link with Enter",
      "A button can only be activated with the mouse",
      "A link can be activated with Enter and Space, a button only with Enter",
      "Neither can be activated with the keyboard",
    ],
    position: 0,
    bild: BILD_LINK,
    thema: "HTML - links, buttons and keyboard accessibility",
  },
  {
    frage:
      "What is the purpose of the tabindex attribute on an element?",
    optionen: [
      "It sets the tab order / whether the element can be focused with the keyboard",
      "It sets the font style of the element",
      "It defines the background image of the element",
      "It hides the element from screen readers",
    ],
    position: 2,
    bild: BILD_LINK,
    thema: "HTML - links, buttons and keyboard accessibility",
  },
  {
    frage:
      "What does the :focus-visible CSS pseudo-class allow you to do?",
    optionen: [
      "Style the focus ring only when focus should be visible to the user",
      "Hide an element when it is focused",
      "Make an element larger when hovered",
      "Disable focus on an element",
    ],
    position: 3,
    bild: BILD_LINK,
    thema: "HTML - links, buttons and keyboard accessibility",
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
