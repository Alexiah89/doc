# Sprint 2 – Firebase, Migration und Abnahme

Diese Anleitung erweitert die bereits funktionierende Anmeldung. Sie verlangt keine neuen Schlüssel im Chat. Die ältere `SPRINT1_SETUP.md` beschreibt den historischen Stand; die verbindliche Nummerierung lautet Sprint 1 Deployment, Sprint 2 Auth/Konto/Onboarding, Sprint 3 Playlist-Import.

## Vercel-Vorschau schrittweise prüfen

1. In GitHub den Branch `sprint-2-auth` öffnen. Noch nicht mit `master` zusammenführen und keine alte Production-Version überschreiben.
2. Im Vercel-Projekt **flowcircle → Environment Variables** öffnen. Bereits vorhandene öffentliche `VITE_FIREBASE_*`-Variablen für **Preview → sprint-2-auth** verfügbar machen: API_KEY, AUTH_DOMAIN, PROJECT_ID, APP_ID und optional MESSAGING_SENDER_ID. `VITE_DEMO_MODE=false` setzen. Werte aus derselben registrierten Firebase-Web-App verwenden.
3. Servervariablen für denselben Preview-Branch freigeben: `FIREBASE_PROJECT_ID` und die bereits funktionierende `FIREBASE_SERVICE_ACCOUNT_JSON` als Secret. Keine neue Schlüsseldatei nötig. Niemals `VITE_FIREBASE_SERVICE_ACCOUNT_JSON` oder andere private `VITE_`-Felder anlegen.
4. Alternativ unterstützt der Server `FIREBASE_CLIENT_EMAIL` und `FIREBASE_PRIVATE_KEY` (PEM; escaped Newlines werden normalisiert). Keine widersprüchlichen Credential-Varianten kombinieren. Auf einer Infrastruktur mit eingerichteter Workload Identity/ADC bevorzugt `FIREBASE_CREDENTIAL_MODE=adc` und passende Projektberechtigung verwenden. Vercel erhält ADC nicht automatisch durch diese Variable.
5. In Firebase **Authentication → Anmeldemethode → Google** prüfen, dass Google aktiv ist. Unter **Authentication → Einstellungen → Autorisierte Domains** den tatsächlichen Vorschauhost ohne `https://` und ohne Pfad ergänzen. Die Production-Domain `flowcircle.vercel.app` beibehalten. Wildcard-Zugriff nicht voraussetzen.
6. In Vercel das neue Branch-Deployment nach Variablenänderungen neu bauen (Redeploy). Ein vorher gebautes Preview enthält die nachträglich ergänzte Vite-Konfiguration nicht.
7. Vorschau über HTTPS öffnen. `GET /api/v1/health` muss JSON liefern. Das ist nur ein HTTP-Check, kein Nachweis der Kontokonfiguration.
8. Google anmelden. Popup muss zur Kontowahl führen. Bei Popupblockade kann die App auf Redirect wechseln. Beide Abläufe auf dem echten Browser testen. Eine noch geschützte Vercel-Vorschau muss für den verwendeten Testbrowser zugänglich sein.
9. Bestehendes Konto prüfen: Name, Bio, Präferenzen, Sprache und abgeschlossener Onboardingstand sollen erhalten bleiben. Der alte technische UID-Benutzername wird durch einen reservierten lesbaren Namen ersetzt.
10. Mit einem eigenen zweiten Testkonto beginnen: Konto wird einmal erstellt, privates Profil, Schritt 1. Schritt 1 speichern, Browser schließen, erneut öffnen/anmelden: Schritt 2 und Auswahl müssen zurückkommen. Schritte 2–4 abschließen; Home erscheint. `/onboarding` und `/login` führen danach zu Home.
11. Einstellungen ändern, neu laden und auf einem zweiten Gerät prüfen. Profil muss eigene Daten anzeigen, keine Demo-Trainingsstatistiken. Beim Wechsel von Demo zu Login darf keine Demo-Auswahl übernommen werden.
12. Abmelden; Browser-Zurück und direkte `/profile`, `/library`, `/settings` müssen Login zeigen. Privates Profil darf nicht kurz aufblitzen. Gastaufruf `/api/v1/users/me` muss 401 liefern.
13. Erst nach erfolgreicher Preview-Abnahme den Code in den vorgesehenen Production-Branch übernehmen und erneut bauen. Production-Variablen separat prüfen, Authorized Domain kontrollieren und den Ablauf wiederholen. In dieser Umsetzung erfolgt keine automatische Übernahme nach Production.

## Firestore-Regeln veröffentlichen

`firestore.rules` sperrt Clients vollständig, auch angemeldete Nutzer. Admin SDK verwendet IAM und muss Kontobesitz/Status selbst prüfen. Die API leitet die UID ausschließlich aus dem verifizierten Token ab. Neue Collection-Namen öffnen keine direkten Browserzugriffe.

Vercel veröffentlicht keine Firestore-Regeln. Vor Live-Abnahme in Firebase **Firestore Database → Regeln** den Repository-Inhalt vergleichen und veröffentlichen. Alternativ mit bewusst ausgewähltem Projekt und berechtigtem Firebase CLI:

```sh
npx firebase deploy --only firestore:rules --project flowcircle-5babe
```

Dieser Befehl ist dokumentiert, wurde hier aber nicht gegen das Nutzerprojekt ausgeführt. Direkte Reads/Writes der privaten Collections müssen abgewiesen werden.

## Datenmodell und Übernahme bestehender Konten

Bootstrap liest `users/{uid}`, `profiles/{uid}` und das bestehende `accounts/{uid}` innerhalb einer Transaktion. Ist noch kein neues Konto vorhanden, werden User, Profil, Namensreservierung und Erstellungsaudit atomar erzeugt. Kollidierende Namen erhalten einen Zufallssuffix; Firestore-Konflikte werden transaktional wiederholt. UID wird für Dokumentpfade URL-kodiert.

Legacy-Präferenzen und Sichtbarkeit werden kanonisch umgerechnet. Bio, Abschluss, Schritt, Sprache, Erstellzeit und Revision bleiben erhalten. Unvollständige Daten bleiben Draft; Interessen werden erst beim Abschluss ins Profil übernommen. Ein beschädigtes vorhandenes Legacy-Dokument führt zum sicheren Fehler statt zur stillen Neuerstellung. Rolle ist bei Migration stets user; ein neues Konto hat private Sichtbarkeit und Zähler 0.

Nach der Migration ist `users`/`profiles` maßgeblich. Alte `/me`-Routen projizieren dieselbe Quelle; das alte `accounts`-Dokument bleibt unverändert. Nicht einfach auf einen älteren Code ohne diese Adapter zurückrollen: dieser würde wieder veraltete Legacy-Daten lesen. Vor Production-Migration Datenbank-Backup nach eigener Betriebsrichtlinie erstellen; im Fehlerfall neue Migration korrigieren, keine Nutzerdokumente löschen. Es gibt keinen destruktiven Batch-Migrationsjob.

Revisionen schützen Clientänderungen vor verlorenen Updates. Bei Konflikt wird der aktuelle Serverstand geladen und ein Hinweis angezeigt; keine automatische Überschreibung. Identische Abschlusswiederholungen bleiben auch mit alter Revision erfolgreich und erzeugen kein zweites Abschlussaudit.

Basisschutz pro UID/Minute: Bootstrap 60, Draft 240, Abschluss/Präferenzen/Privatsphäre/Profil je 120. Keine IP-/Header-/Tokenprotokollierung. Rate-Limit-Dokumente bleiben klein und werden wiederverwendet; keine automatische Kontolöschung oder Moderationsabläufe.

## Lokale Emulatoren

Java 21 und Node 24 verwenden. Nach `npm ci`:

```sh
npm run emulators:start
```

Der Launcher startet offizielle Auth-/Firestore-Emulatoren mit `demo-flowcircle`. Der erste Firestore-Start benötigt den JAR-Download von `storage.googleapis.com`. In dieser Cloud war dieser Download mit HTTP 403 gesperrt. Keine alternative Quelle oder TLS-Abschaltung verwenden; die Firestore-/Rules-Tests sind dadurch hier offen.

Für eine getrennte lokale `.env` ohne echte Servercredentials:

```dotenv
APP_ENV=development
VITE_DEMO_MODE=false
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=demo-flowcircle.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-flowcircle
VITE_FIREBASE_APP_ID=demo-app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_USE_FIREBASE_EMULATORS=true
FIREBASE_PROJECT_ID=demo-flowcircle
FIREBASE_USE_EMULATORS=true
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

Dann separat `npm run dev`. Die Emulator-UI der offiziellen Auth-Anmeldung ersetzt Google nur lokal. In `/dev/demo` Emulatorflags kontrollieren. Die Clientflag ist Vite-Buildzeit; echte Production-Konfiguration darf sie niemals enthalten. Der Server verlangt beide Loopbackhosts, ein `demo-*`-Projekt und Development; Production lehnt Emulatorbetrieb ab.

Tests starten/stoppen eigene Emulatorprozesse:

```sh
npm run test:auth-emulator
npm run test:emulator
```

Auth-only prüft echte SDK-Tokens und gefälschte Tokens. Die vollständige Suite prüft zusätzlich Firestore-Regeln für anonyme/angemeldete Clients sowie echte parallele Bootstrap-Transaktionen und idempotente Completion. Die normalen Vitest-Transaktionstests nutzen dagegen eine explizite In-Memory-Testdatenbank; sie ersetzen diese Emulatorprüfung nicht.

## Diagnose ohne Secrets

`/dev/demo` und Development-Health zeigen nur Konfigurationspräsenz, maskierte UID, Status und Emulatorflags. Eine vorhandene Konfiguration beweist weder IAM-Berechtigung noch Erreichbarkeit. Production veröffentlicht keine Admin-Diagnosen.

Bei Fehlern nur Statuscode und JSON-Antwort des betroffenen Requests betrachten. Keine Authorization-Header, Tokens, Service-Account-JSON oder privaten Schlüssel in Issues/Chat kopieren. `account-not-configured`/Konfigurationsfehler erfordern eine Prüfung der branchbezogenen Serverbindung; HTML/NOT_FOUND bei Schreibpfaden weist auf ein falsches/altes Deployment hin. Alle neuen verschachtelten Pfade haben eigene Vercel-Adapter.

Noch offene Abnahme: neue Vercel-Version, echtes Google Popup/Redirect, Firestore-Migration und Speicherung auf zwei Geräten; offizielle Firestore-Rules-/Transaktionstests nach freigegebenem Emulator-Download. Die frühere Produktionsversion wurde vom Nutzer als funktionierend bestätigt; diese Bestätigung ersetzt die neue Abnahme nicht.
