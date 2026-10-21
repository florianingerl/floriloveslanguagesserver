import assert from "assert";
import { baueRohNachricht } from "./gmail";
import {
  CODE_LAENGE,
  CODE_GUELTIGKEIT_MS,
  erzeugeVerifizierungscode,
  frontendBestaetigungslink,
  hashVerifizierungscode,
  istCodeAbgelaufen,
  stimmtVerifizierungscodeUeberein,
  verifizierungsEmail,
} from "./verification";

function testsAusfuehren(): void {
  const code1 = erzeugeVerifizierungscode();
  assert.strictEqual(code1.length, CODE_LAENGE);
  assert.match(code1, /^\d{6}$/);

  const codes = new Set<string>();
  for (let i = 0; i < 50; i += 1) {
    codes.add(erzeugeVerifizierungscode());
  }
  assert.ok(codes.size > 1, "Codes muessen sich unterscheiden");

  const hash1 = hashVerifizierungscode(code1);
  assert.strictEqual(hashVerifizierungscode(code1), hash1);
  assert.notStrictEqual(hashVerifizierungscode(erzeugeVerifizierungscode()), hash1);
  assert.match(hash1, /^[0-9a-f]{64}$/);

  assert.strictEqual(stimmtVerifizierungscodeUeberein(code1, hash1), true);
  const falscherCode = code1 === "999999" ? "888888" : "999999";
  assert.strictEqual(
    stimmtVerifizierungscodeUeberein(falscherCode, hash1),
    false,
  );
  const hashFuehrendeNullen = hashVerifizierungscode("000123");
  assert.strictEqual(
    stimmtVerifizierungscodeUeberein("000123", hashFuehrendeNullen),
    true,
  );
  assert.strictEqual(stimmtVerifizierungscodeUeberein("000123", ""), false);
  assert.strictEqual(
    stimmtVerifizierungscodeUeberein("000123", "kein-hash"),
    false,
  );

  const jetzt = new Date("2026-10-21T12:00:00Z");
  assert.strictEqual(
    istCodeAbgelaufen(new Date(jetzt.getTime() - 1), jetzt),
    true,
  );
  assert.strictEqual(
    istCodeAbgelaufen(new Date(jetzt.getTime() + 1), jetzt),
    false,
  );
  assert.strictEqual(istCodeAbgelaufen(undefined, jetzt), true);
  assert.strictEqual(istCodeAbgelaufen(null, jetzt), true);
  assert.strictEqual(
    istCodeAbgelaufen(new Date(jetzt.getTime() + CODE_GUELTIGKEIT_MS), jetzt),
    false,
  );

  const link = frontendBestaetigungslink("test+tag@example.com", "https://example.org/");
  assert.strictEqual(
    link,
    "https://example.org/verify-email?email=test%2Btag%40example.com",
  );
  const linkOhneSlash = frontendBestaetigungslink("a@b.de", "https://example.org");
  assert.ok(linkOhneSlash.startsWith("https://example.org/verify-email?email="));

  const mail = verifizierungsEmail("Guenter", "123456", link);
  assert.ok(mail.text.includes("123456"));
  assert.ok(mail.text.includes(link));
  assert.ok(mail.betreff.length > 0);

  const roh = baueRohNachricht(
    "empfaenger@example.com",
    mail.betreff,
    mail.text,
  );
  const entschluesselt = Buffer.from(roh, "base64url").toString("utf8");
  const teile = entschluesselt.split("\r\n\r\n");
  assert.strictEqual(teile.length, 2);
  const kopf = teile[0];
  const koerperBase64 = teile[1].replace(/\r\n/g, "");
  const koerper = Buffer.from(koerperBase64, "base64").toString("utf8");
  assert.ok(kopf.includes("To: empfaenger@example.com"));
  assert.ok(kopf.includes(`Subject: ${mail.betreff}`));
  assert.ok(kopf.includes("Content-Transfer-Encoding: base64"));
  assert.strictEqual(koerper, mail.text);

  console.log("Alle Tests fuer die E-Mail-Verifizierung bestanden.");
}

testsAusfuehren();
