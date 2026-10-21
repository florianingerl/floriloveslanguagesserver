const fs = require("fs");
const path = require("path");
const { authenticate } = require("@google-cloud/local-auth");

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(
      "credentials.json nicht gefunden (erwartet im Wurzelverzeichnis des Servers).\n" +
        "Erstelle in der Google Cloud Console einen OAuth-Client (Typ 'Desktop app'),\n" +
        "aktiviere den Gmail-Scope und lade die JSON-Datei herunter.",
    );
    process.exit(1);
  }

  const auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  const refreshToken =
    auth.credentials && auth.credentials.refresh_token
      ? auth.credentials.refresh_token
      : null;

  if (!refreshToken) {
    console.error(
      "Kein refresh_token erhalten. Pruefe, dass der Client-Typ 'Desktop app' ist\n" +
        "und versuche es erneut (ggf. vorher https://myaccount.google.com/permissions\n" +
        "den Testzugang widerrufen, sonst bekommst du evtl. keinen neuen Token).",
    );
    process.exit(1);
  }

  console.log("Refresh-Token (in die .env als GMAIL_REFRESH_TOKEN eintragen):");
  console.log(refreshToken);
}

main().catch((fehler) => {
  console.error("FEHLER:", fehler.message);
  process.exit(1);
});
