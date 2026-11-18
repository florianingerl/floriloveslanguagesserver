export type ExportTestType = "trous" | "optionsDifferents" | "optionsGleich";

const SEITENNUMMERN: Record<string, string> = {
  english: "0001",
  french: "0002",
  deutsch: "9997",
  espagnol: "9998",
  italiano: "9995",
};

const SEITENTYPEN: Record<ExportTestType, string> = {
  trous: "0",
  optionsDifferents: "3",
  optionsGleich: "1",
};

const TYPOGRAPHIE_ERSATZ: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201B": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u201F": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2026": "...",
};

export interface ExportOption {
  option: string;
  correct?: boolean;
}

export interface ExportUebung {
  type?: string;
  gapText?: string;
  imageUrl?: string;
  questionOrInstruction?: string;
  options?: ExportOption[];
}

export interface FrageAntwort {
  q: string;
  r: string;
}

export interface ExportFacileAnfrage {
  site: string;
  quiz?: string;
  testId: string | number;
  title?: string;
  author?: string;
  topicTutorial?: string;
  testType?: string;
  exercises: ExportUebung[];
  baseUrl?: string;
}

export interface ExportFacileBody {
  body: string;
  fragen: number;
  mehrfachLuecken: boolean;
  type: string;
  numero: string;
}

interface LueckenTreffer {
  index: number;
  ganz: string;
  inhalt: string;
}

function alleLuecken(text: string): LueckenTreffer[] {
  const treffer: LueckenTreffer[] = [];
  const muster = /\{([^{}]*)\}/g;
  let fund: RegExpExecArray | null;
  while ((fund = muster.exec(text)) !== null) {
    treffer.push({ index: fund.index, ganz: fund[0], inhalt: fund[1] });
  }
  return treffer;
}

export function lueckenAnzahl(text: string | undefined): number {
  return alleLuecken(text ?? "").length;
}

function unbalancierteKlammern(text: string): boolean {
  const rest = text.replace(/\{[^{}]*\}/g, "");
  return rest.includes("{") || rest.includes("}");
}

function textOhneLuecken(text: string): string {
  return text.replace(/_{2,}/g, "*").trim();
}

function ohneLuecken(text: string): string {
  return text.replace(/\{[^{}]*\}/g, "*").replace(/_{2,}/g, "*").trim();
}

function absoluteUrl(url: string, basis: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, basis).href;
  } catch {
    return url;
  }
}

function alsBild(ex: ExportUebung, basis: string): string {
  if (!ex.imageUrl) return "";
  const url = absoluteUrl(ex.imageUrl, basis)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
  return `<img src="${url}"> `;
}

export function gapTextZuBloecken(gapText: string, bild = ""): FrageAntwort[] {
  const treffer = alleLuecken(gapText);
  if (treffer.length === 0) return [];

  const bloecke: FrageAntwort[] = [];
  let nachLetzter = 0;

  treffer.forEach((aktuell, index) => {
    const davor = textOhneLuecken(gapText.slice(nachLetzter, aktuell.index));
    const ende = aktuell.index + aktuell.ganz.length;
    const naechster = index + 1 < treffer.length ? treffer[index + 1].index : gapText.length;
    const danach = textOhneLuecken(gapText.slice(ende, naechster));

    let q = index === 0 && davor ? `${davor} *` : "*";
    if (danach) q += ` ${danach}`;
    q = q.replace(/\s+([.,;:!?)\]])/g, "$1");
    if (index === 0) q = bild + q;
    if (index === treffer.length - 1) q += " <br>";

    bloecke.push({ q, r: aktuell.inhalt });
    nachLetzter = ende;
  });

  return bloecke;
}

function optionenMitRichtigerVorne(ex: ExportUebung): string[] {
  const alle = (ex.options ?? []).map((o) => o.option);
  const richtige = (ex.options ?? []).filter((o) => o.correct).map((o) => o.option);
  return [...richtige, ...alle.filter((o) => !richtige.includes(o))];
}

function frageAntwortBauen(
  ex: ExportUebung,
  testType: ExportTestType,
  basis: string
): FrageAntwort[] {
  const bild = alsBild(ex, basis);

  if (ex.type === "multipleChoice") {
    const frage = ex.questionOrInstruction ?? ex.gapText ?? "";
    const text = ohneLuecken(frage);
    if (!text) return [];
    const richtige = (ex.options ?? []).filter((o) => o.correct).map((o) => o.option);
    const antwort =
      testType !== "optionsDifferents" && /_{3,}/.test(frage)
        ? richtige.join("|")
        : optionenMitRichtigerVorne(ex).join("|");
    return [{ q: bild + text, r: antwort }];
  }

  if (ex.type && ex.type !== "gapText") {
    throw new Error(`Unsupported exercise type "${ex.type}".`);
  }

  const gapText = ex.gapText ?? "";
  if (unbalancierteKlammern(gapText)) {
    throw new Error("The gapText has unbalanced braces.");
  }
  const bloecke = gapTextZuBloecken(gapText, bild);
  if (bloecke.length === 0) {
    throw new Error("A gapText exercise needs at least one {answer} marker.");
  }
  return bloecke;
}

function fuelleAufMindestzahl(fragen: FrageAntwort[]): FrageAntwort[] {
  const gefuellt = [...fragen];
  while (gefuellt.length > 0 && gefuellt.length < 10) {
    gefuellt.push(gefuellt[gefuellt.length - 1]);
  }
  return gefuellt;
}

function normalisiereTypographie(text: string): string {
  return text.replace(
    /[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2013\u2014\u2026]/g,
    (zeichen) => TYPOGRAPHIE_ERSATZ[zeichen] ?? zeichen,
  );
}

function alsIso8859Formular(urlencoded: string): string {
  return urlencoded.replace(/(?:%[0-9A-Fa-f]{2})+/g, (lauf) => {
    const bytes = (lauf.match(/%[0-9A-Fa-f]{2}/g) ?? []).map((b) =>
      parseInt(b.slice(1), 16),
    );
    if (bytes.every((b) => b < 0x80)) return lauf;

    let text: string;
    try {
      text = normalisiereTypographie(decodeURIComponent(lauf));
    } catch {
      return lauf;
    }

    let ergebnis = "";
    for (const zeichen of text) {
      const punkt = zeichen.codePointAt(0) ?? 0;
      ergebnis +=
        punkt <= 0xff
          ? "%" + ("0" + punkt.toString(16).toUpperCase()).slice(-2)
          : encodeURIComponent(zeichen);
    }
    return ergebnis;
  });
}

export function baueExportFacileBody(anfrage: ExportFacileAnfrage): ExportFacileBody {
  const exercises = anfrage.exercises;
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error("At least one exercise is needed for the export.");
  }
  if (exercises.length > 200) {
    throw new Error("Too many exercises for one export.");
  }

  const testType = (anfrage.testType ?? "trous") as ExportTestType;
  const seitentyp = SEITENTYPEN[testType] ?? SEITENTYPEN.trous;
  const testId = String(anfrage.testId).trim();
  const basis = anfrage.baseUrl ?? `https://www.${anfrage.site}/`;

  const alleBloecke: FrageAntwort[] = [];
  for (const ex of exercises) {
    for (const block of frageAntwortBauen(ex, testType, basis)) {
      alleBloecke.push(block);
    }
  }
  if (alleBloecke.length === 0) {
    throw new Error("No exportable question was found in the exercises.");
  }

  const mehrfachLuecken = exercises.some((ex) => lueckenAnzahl(ex.gapText) > 1);
  const gefuellt = fuelleAufMindestzahl(alleBloecke);
  const titel = anfrage.title ?? "";

  const felder = new URLSearchParams();
  felder.set("statut", "r");
  felder.set("top2", "");
  felder.set("auteur2", anfrage.author ?? "");
  felder.set("liaison2", "#adverbe#conjonction#");
  felder.set("casier", `clone du test ${testId}`);
  felder.set("anciensite", "0001");
  felder.set("yenamarre", SEITENNUMMERN[anfrage.quiz ?? ""] ?? "0001");
  felder.set("genre", "g");
  felder.set("difficulte", "2");
  felder.set("type", seitentyp);
  felder.set("titre", titel);
  felder.set("titreenglish", titel);
  felder.set("ancientitreenglish", titel);
  felder.set("numero", mehrfachLuecken ? "3" : "0");
  felder.set("message_textarea", anfrage.topicTutorial ?? "");
  felder.set("confirmer", "0");

  gefuellt.forEach((frage, index) => {
    const nummer = index + 1;
    felder.set(`q${nummer}`, frage.q);
    felder.set(`r${nummer}`, frage.r);
    felder.set(`e${nummer}`, "");
  });

  felder.set("mychoice", String(gefuellt.length));
  felder.set("grander", "");
  felder.set("nol2", "");
  felder.set("vieuxconfirm", "0");
  felder.set("forcer2", "");
  felder.set("enbaspage", "");
  felder.set("enbas", "");

  return {
    body: alsIso8859Formular(felder.toString()),
    fragen: gefuellt.length,
    mehrfachLuecken,
    type: seitentyp,
    numero: mehrfachLuecken ? "3" : "0",
  };
}
