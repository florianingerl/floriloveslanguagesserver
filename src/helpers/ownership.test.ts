// Tests fuer die Bearbeitungsrechte an Aufgaben (Aufgabe 16 aus
// InstructionsForTheAI.txt): Nur die Besitzerin oder die Admin-Adresse
// imelflorianingerl@gmail.com darf eine Aufgabe aendern oder loeschen.
// Ausfuehren mit: npm run test:ownership
import assert from "assert";
import { AuthenticatedRequest } from "../controllers/TimeIT/AuthController";
import {
  ADMIN_E_MAIL,
  darfBearbeiten,
  istAdminEMail,
} from "./ownership";

const BESITZERIN_ID = "6ac13ec8ad4b9e599155b16e"; // imelflorianingerl@gmail.com
const FREMDE_ID = "64b000000000000000000000";

function anfrage(id?: string): AuthenticatedRequest {
  return { user: id ? { id } : undefined } as AuthenticatedRequest;
}

async function testsAusfuehren(): Promise<void> {
  // Die Konstante ist die Adresse aus der Anweisung.
  assert.strictEqual(ADMIN_E_MAIL, "imelflorianingerl@gmail.com");

  // Die Admin-E-Mail wird gross-/kleinschreibungs- und leerzeichenunempfindlich erkannt.
  assert.strictEqual(istAdminEMail("imelflorianingerl@gmail.com"), true);
  assert.strictEqual(istAdminEMail("  IMELFlorianingerl@Gmail.com "), true);
  assert.strictEqual(istAdminEMail("other@example.com"), false);
  assert.strictEqual(istAdminEMail(undefined), false);
  assert.strictEqual(istAdminEMail(null), false);
  assert.strictEqual(istAdminEMail(""), false);

  // Die Besitzerin darf ihre eigene Aufgabe aendern - die E-Mail wird
  // dafuer nicht einmal aus der Datenbank geladen.
  let emailGeladen = 0;
  const ladeEmail = async (): Promise<string> => {
    emailGeladen += 1;
    return "someone-else@example.com";
  };
  assert.strictEqual(
    await darfBearbeiten(anfrage(BESITZERIN_ID), BESITZERIN_ID, ladeEmail),
    true
  );
  assert.strictEqual(emailGeladen, 0);

  // Ein fremder Benutzer mit normaler E-Mail darf nicht bearbeiten.
  assert.strictEqual(
    await darfBearbeiten(anfrage(FREMDE_ID), BESITZERIN_ID, ladeEmail),
    false
  );
  assert.strictEqual(emailGeladen, 1);

  // Dieselbe Aufgabe darf bearbeitet werden, wenn der aufrufende Benutzer
  // die Admin-Adresse hat (Gross-/Kleinschreibung und Leerzeichen egal).
  assert.strictEqual(
    await darfBearbeiten(
      anfrage(FREMDE_ID),
      BESITZERIN_ID,
      async () => "  imelflorianingerl@GMAIL.com "
    ),
    true
  );

  // Aufgaben ohne Besitzer (Altbestand) darf nur die Admin-Adresse aendern.
  assert.strictEqual(
    await darfBearbeiten(anfrage(FREMDE_ID), undefined, ladeEmail),
    false
  );
  assert.strictEqual(
    await darfBearbeiten(
      anfrage(FREMDE_ID),
      null,
      async () => "imelflorianingerl@gmail.com"
    ),
    true
  );

  // Ohne Token gibt es keine Besitzerin-Zuordnung. In der Produktion
  // liefert besitzPruefenMitAdmin in dem Fall undefined als E-Mail (kein
  // Token, kein Lookup), deshalb ist hier der nicht erwartete Fall:
  assert.strictEqual(
    await darfBearbeiten(anfrage(undefined), BESITZERIN_ID, async () => undefined),
    false
  );

  console.log("ownership tests passed");
}

testsAusfuehren().catch((error) => {
  console.error(error);
  process.exit(1);
});
