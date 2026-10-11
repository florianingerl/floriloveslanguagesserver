import { Request, Response } from "express";
import axios from "axios";

// Nur diese *facile.com-Seiten dürfen angesprochen werden. Ohne diese Liste wäre
// die Route ein offener Weiterleiter, mit dem beliebige Websites erreicht werden.
const SEITEN = [
  "anglaisfacile.com",
  "allemandfacile.com",
  "espagnolfacile.com",
  "francaisfacile.com",
  "italien-facile.com",
] as const;

// Auch der Pfad ist fest verdrahtet, damit die Route nichts anderes treffen kann.
const PFAD = /^\/cgi2\/myexam\/edit2\.php$/;

// Ein Test braucht 30 Sekunden für die Antwort der Gegenseite.
const TIMEOUT_MS = 30_000;

// Das sind die Seiten, die eine nicht angemeldete Sitzung zurückbekommt.
const ANMELDE_MARKER =
  /Connectez-vous|Please log in|Merci de vous connecter|Identifiez-vous/i;

// Antwortet edit2.php mit diesem Text, wurde nichts gespeichert. Das passiert
// bei unbekannter Test-ID und bei einem Body, den die Seite nicht versteht.
const ABGELEHNT = /exercice non trouv|test non trouv|introuvable/i;

interface ExportAnfrage {
  site?: unknown;
  testId?: unknown;
  cookie?: unknown;
  body?: unknown;
}

function alsText(wert: unknown): string {
  return typeof wert === "string" ? wert : "";
}

// Der Client schickt die Test-ID als Zahl, manche Aufrufe als Text. Beides wird
// hier zu einem String normalisiert; die Prüfung auf reine Ziffern bleibt streng,
// damit weiterhin nichts in den Pfad oder die Fremd-URL einschleusen kann.
function testIdAlsText(wert: unknown): string {
  if (typeof wert === "number") {
    return Number.isSafeInteger(wert) ? String(wert) : "";
  }
  return typeof wert === "string" ? wert.trim() : "";
}

function istZiffern(wert: unknown): wert is string {
  return /^\d{1,12}$/.test(testIdAlsText(wert));
}

// Der Cookie wird unverändert weitergereicht. Alles, was die Seite selbst
// zusätzlich verlangt, steht bereits in den DevTools und wird mitkopiert.
function cookieBereinigen(cookie: string): string {
  return cookie.replace(/[\r\n]/g, "").replace(/;\s*$/, "");
}

export const exportToFacile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { site, testId, cookie, body } = (req.body ?? {}) as ExportAnfrage;

  const seite = alsText(site).trim().toLowerCase();
  if (!(SEITEN as readonly string[]).includes(seite)) {
    res.status(400).json({
      ok: false,
      message: `Unbekannte Seite "${seite}". Erlaubt sind: ${SEITEN.join(", ")}.`,
    });
    return;
  }

  const testIdText = testIdAlsText(testId);
  if (!istZiffern(testIdText)) {
    res.status(400).json({ ok: false, message: "Die Test-ID fehlt." });
    return;
  }

  const pfad = `/cgi2/myexam/edit2.php?id=${testIdText}`;
  if (!PFAD.test(pfad.split("?")[0])) {
    res.status(400).json({ ok: false, message: "Unzulässiger Pfad." });
    return;
  }

  const inhalt = alsText(body);
  if (inhalt === "") {
    res.status(400).json({ ok: false, message: "Der Inhalt der Anfrage fehlt." });
    return;
  }

  const sitzung = alsText(cookie).trim();
  if (sitzung === "") {
    res.status(400).json({
      ok: false,
      message:
        "Kein Sitzungs-Cookie. Bitte den kompletten Cookie-Text aus den DevTools kopieren.",
    });
    return;
  }

  // Ohne dieses Cookie kennt die Seite den Benutzer nicht und antwortet mit der
  // anonymen Seite, auch wenn die anderen Sitzungs-Cookies stimmen.
  if (!/(^|;\s*)auteur_cookies=/i.test(sitzung)) {
    res.status(400).json({
      ok: false,
      message:
        "Im Cookie fehlt \"auteur_cookies\". Das ist auf *facile.com der Cookie, der den Benutzer zuordnet; sessionid, sessionid2 und PHPSESSID allein reichen nicht. Bitte den kompletten Cookie kopieren, zum Beispiel \"auteur_cookies=flori10; sessionid=…\".",
    });
    return;
  }

  const ziel = `https://www.${seite}${pfad}`;

  try {
    const antwort = await axios.post(ziel, inhalt, {
      timeout: TIMEOUT_MS,
      // Die Seite darf auf die Anmeldeseite umleiten, das ist keine Ausnahme.
      maxRedirects: 5,
      // Wir wollen den Status selbst prüfen und nicht eine Exception.
      validateStatus: () => true,
      responseType: "text",
      transformResponse: (daten) => (typeof daten === "string" ? daten : String(daten ?? "")),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8,fr;q=0.6",
        Referer: `https://www.${seite}${pfad}`,
        "Upgrade-Insecure-Requests": "1",
        Cookie: cookieBereinigen(sitzung),
      },
    });

    const html = antwort.data as string;

    if (antwort.status < 200 || antwort.status >= 300) {
      res.status(502).json({
        ok: false,
        status: antwort.status,
        message: `Die Seite hat mit HTTP ${antwort.status} geantwortet.`,
      });
      return;
    }

    // Die Seite hat den Test abgelehnt. Sie nennt sich in <title> immer nach der
    // Test-ID, das ist deshalb die verlaesslichste Bestaetigung.
    if (ABGELEHNT.test(html)) {
      res.status(400).json({
        ok: false,
        status: antwort.status,
        message: `Die Seite hat den Test ${testIdText} nicht angenommen ("exercice non trouvé"). Bitte die Test-ID und die Fragen prüfen.`,
      });
      return;
    }

    if (ANMELDE_MARKER.test(html)) {
      res.status(401).json({
        ok: false,
        angemeldet: false,
        status: antwort.status,
        message:
          "Die Seite kennt den Benutzer nicht und hat nichts gespeichert. Meist fehlt im Cookie \"auteur_cookies\" oder er ist abgelaufen. Bitte bei *facile.com neu anmelden und den kompletten Cookie neu kopieren.",
      });
      return;
    }

    // Nach dem Speichern liefert edit2.php den Test ohne das Eingabeformular und
    // mit der Test-ID als Titel. Genau daran erkennen wir den Erfolg.
    const titel = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const gespeichert = Boolean(titel && titel[1].trim() === testIdText);

    res.json({
      ok: true,
      status: antwort.status,
      seite,
      testId: testIdText,
      gespeichert,
      bytes: html.length,
    });
  } catch (err) {
    const meldung =
      axios.isAxiosError(err) && err.code === "ECONNABORTED"
        ? `Keine Antwort von der Seite nach ${TIMEOUT_MS / 1000} Sekunden.`
        : err instanceof Error
          ? err.message
          : "Unbekannter Fehler";
    res.status(502).json({ ok: false, message: `Anfrage fehlgeschlagen: ${meldung}` });
  }
};
