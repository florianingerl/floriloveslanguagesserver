// Regeln fuer das Hochladen von Bildern aus der Zwischenablage.
//
// Jeder Benutzer darf pro Tag hoechstens MAX_UPLOADS_PRO_TAG Bilder hochladen.
// Der Benutzer mit dieser E-Mail-Adresse hat kein Limit. Die Tagesgrenze gilt
// fuer den UTC-Kalendertag.

export const UNBEGRENZTE_EMAIL = "imelflorianingerl@gmail.com";
export const MAX_UPLOADS_PRO_TAG = 2;

// true, wenn der Benutzer heute noch ein Bild hochladen darf.
export function darfBildHochladen(
  email: string | undefined | null,
  uploadsHeute: number
): boolean {
  if (email && email.trim().toLowerCase() === UNBEGRENZTE_EMAIL) return true;
  return uploadsHeute < MAX_UPLOADS_PRO_TAG;
}

// true, wenn fuer diesen Benutzer ueberhaupt kein Tageslimit gilt.
export function hatUnbegrenztesLimit(email: string | undefined | null): boolean {
  return !!email && email.trim().toLowerCase() === UNBEGRENZTE_EMAIL;
}

// Beginn des laufenden UTC-Kalendertages. Alles, was seitdem hochgeladen
// wurde, zaehlt fuer das Tageslimit.
export function tagesBeginn(jetzt: Date = new Date()): Date {
  return new Date(
    Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate())
  );
}
