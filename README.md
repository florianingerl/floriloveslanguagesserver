# floriloveslanguagesserver

I try to commit something!


With Postman

Make a post request to this url using the json data below!

http://localhost:8080/api/user

{ "name": "Florian",
  "email": "imelflorianingerl@gmail.com",
  "password": "Cool",
  "role": "Student",
  "isAdmin": true
}


# Anmeldung fuer die Schreib-Endpunkte

Die Endpunkte `/api/exercise` und `/api/topic` sind seit dem 03.10.2026 beim
Anlegen, Aendern und Loeschen nur noch mit einem Token erlaubt
(`authMiddleware`). Lesen (`GET`) bleibt frei, damit Besucher ohne Konto das
Quiz sehen koennen.

Das Token kommt aus `POST /api/login` (Feld `token`) und wird als Header
geschickt:

    x-auth-token: <token>

In Postman also unter "Authorization" -> "API Key" mit Key `x-auth-token`
eintragen, oder in den Scripts ueber `src/helpers/authHeader.ts`, die ohne
Zugangsdaten einen Wegwerf-Benutzer anlegt. Das Token gilt nur eine Stunde.


# Besitzer von Topics und Aufgaben

Jedes Topic und jede Aufgabe hat ein Feld `user` mit der `_id` des Benutzers,
der es angelegt hat. Beim Anlegen setzt der Server den Besitzer aus dem Token,
nicht aus dem Request-Body. Beim Aendern und Loeschen wird geprueft, ob der
Benutzer aus dem Token der Besitzer ist; sonst antwortet der Server mit 403
("This topic belongs to someone else, so you can't change it."). Lesen bleibt
fuer alle frei, damit jeder das Quiz machen kann.

Der Besitzer laesst sich nicht uebertragen und nicht faelschen. Ein Dokument
ohne Besitzer (Altbestand) nimmt den Benutzer an, der es zum ersten Mal
aendert.

Der Altbestand wurde mit `migrate-ownership.js` dem Benutzer
imelflorianingerl@gmail.com (`6ac13ec8ad4b9e599155b16e`) zugeschrieben, in der
Entwicklungs- und in der Produktionsdatenbank. Das Skript schreibt ohne
`--apply` nichts:

    npm run migrateownership -- --url=<url> --email=<adresse>
    npm run migrateownership -- --url=<url> --email=<adresse> --apply
    npm run migrateownership -- --copy-user --email=<adresse> --apply

Sicherung vor der Aenderung in der Produktionsdatenbank:
`backups/before-ownership-2026-10-03/` (mongodump).
