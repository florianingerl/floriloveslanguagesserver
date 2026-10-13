// Tests fuer die Tagesgrenze beim Bild-Upload. Ausfuehren mit:
//   npm run test:imagelimit
import assert from "assert";
import {
  darfBildHochladen,
  hatUnbegrenztesLimit,
  MAX_UPLOADS_PRO_TAG,
  tagesBeginn,
  UNBEGRENZTE_EMAIL,
} from "./imageLimit";

// Ein normaler Benutzer darf zweimal, danach nicht mehr.
assert.strictEqual(darfBildHochladen("user@example.com", 0), true);
assert.strictEqual(darfBildHochladen("user@example.com", 1), true);
assert.strictEqual(darfBildHochladen("user@example.com", 2), false);
assert.strictEqual(darfBildHochladen("user@example.com", 3), false);

// Die Ausnahme-Adresse hat kein Limit, unabhaengig von Schreibweise und
// umgebenden Leerzeichen.
assert.strictEqual(darfBildHochladen(UNBEGRENZTE_EMAIL, 0), true);
assert.strictEqual(darfBildHochladen(UNBEGRENZTE_EMAIL, 100), true);
assert.strictEqual(darfBildHochladen("  IMELFlorianingerl@Gmail.com ", 100), true);
assert.strictEqual(hatUnbegrenztesLimit(UNBEGRENZTE_EMAIL), true);
assert.strictEqual(hatUnbegrenztesLimit("other@example.com"), false);

// Ohne E-Mail (z.B. Benutzer nicht gefunden) gilt das normale Limit.
assert.strictEqual(darfBildHochladen(undefined, 1), true);
assert.strictEqual(darfBildHochladen(undefined, 2), false);

// Der Tagesbeginn liegt auf Mitternacht UTC.
const beginn = tagesBeginn(new Date("2026-10-13T15:30:45.123Z"));
assert.strictEqual(beginn.toISOString(), "2026-10-13T00:00:00.000Z");
assert.strictEqual(MAX_UPLOADS_PRO_TAG, 2);

console.log("imageLimit tests passed");
