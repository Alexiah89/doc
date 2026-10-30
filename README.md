# FlowCircle

Responsive React-/TypeScript-Web-App für Smartphone, Tablet und Desktop. FlowCircle wird öffentliche YouTube-Playlists als Trainingsprogramme organisieren. Produktregeln: [PRODUCT.md](PRODUCT.md).

## Aktueller Stand

**Sprint 2 – Authentifizierung, Nutzerkonten und persistentes Onboarding.** Die bestehende Firebase-Anbindung wurde erweitert, ohne den React-/Vite-/Node-Stack oder die Deployment-Infrastruktur zu ersetzen. Sprint 1 bezeichnet verbindlich den Deployment-Sprint; Sprint 3 ist der noch nicht begonnene Playlist-Import.

Die bisherige Anmeldung und Speicherung wurden vom Nutzer live bestätigt. Die neue Sprint-2-Version benötigt eine eigene Vercel-Vorschau und erneute Live-Abnahme. Der offizielle Auth Emulator wurde erfolgreich getestet. Firestore-Emulator und Rules-Tests sind vorbereitet, konnten hier wegen eines HTTP-403 beim offiziellen Emulator-Download nicht ausgeführt werden. Deshalb ist Sprint 2 noch nicht vollständig live abgenommen.

## Installation und Entwicklung

Node.js 24, npm 11; für Emulatoren zusätzlich Java 21. Keine YouTube-Schlüssel erforderlich.

```sh
npm ci
cp .env.example .env
npm run dev
```

Web: Port 5173, API: 3001. Vite leitet `/api` same-origin an die API weiter. `GET /api/v1/health` liefert JSON. Alternativ `npm run dev:web` und `npm run dev:server` einzeln starten. Bei einer neuen Cloud-Sitzung Prozesse erneut starten; vorhandenes Checkout verwenden.

Ohne Firebase-Konfiguration ist eine verständliche Anmeldemeldung sichtbar. Über „Demo ansehen“ lässt sich die App ohne Zugangsdaten ausprobieren. Es gibt keinen stillen Fake-Login. Die vorbereitete Cloud-Konfiguration kann Netzwerk-/Prozessfreigaben für npm, Server und Chromium benötigen; Proxy- und TLS-Prüfungen nicht umgehen.

## Firebase und Deployment

Die vollständige Schritt-für-Schritt-Anleitung steht in [docs/SPRINT2_SETUP.md](docs/SPRINT2_SETUP.md), einschließlich Migration, Autorisierungsdomains, Emulatoren und Live-Abnahme.

Öffentliche Web-Konfiguration (Vite-Buildzeit):

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_DEMO_MODE=false
```

Serverkonfiguration (niemals `VITE_`): `FIREBASE_PROJECT_ID` und bevorzugt Application Default Credentials. Alternativ `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` oder die bereits verwendete `FIREBASE_SERVICE_ACCOUNT_JSON`. `.env.example` enthält ausschließlich Platzhalter; `.env` ist ignoriert. `APP_ENV` und `APP_VERSION` steuern sichere API-Metadaten. Eine bloß vorhandene Konfiguration beweist noch keinen funktionierenden Datenbankzugriff.

Firebase Authentication muss Google als Provider aktivieren. Firebase Authorized Domains enthalten die tatsächlichen HTTPS-Production- und Preview-Hosts. Auf Vercel müssen Client- und Servervariablen für den jeweils getesteten Branch verfügbar sein; Änderungen erfordern einen neuen Build. Das Admin SDK bleibt ausschließlich auf dem Server. Die Web-App nutzt Bearer-ID-Tokens über HTTPS, keine selbstgebauten Session-Cookies und keine offenen Cross-Origin-Freigaben.

## Authentifizierung und Konten

`FirebaseAuthRepository` implementiert das vorhandene `AuthRepository`; Firebase-Rohobjekte werden auf ein eigenes `AuthUser`-Modell abgebildet. `AuthProvider`/`useAuth` sind die öffentliche Schnittstelle zum bestehenden zentralen `SessionProvider`. Es gibt nur eine Session-Verwaltung.

Login und Reload: Firebase stellt die Identität wieder her → ID-Token → `POST /users/bootstrap` → `GET /users/me` → serverbasierte Routingentscheidung. Während Restore, Bootstrap und Laden bleiben private Inhalte verborgen. Abgebrochene Popups werden neutral behandelt; blockierte Popups können den vorbereiteten Redirect-Fallback nutzen. Ein erfolgreicher Google-Login allein öffnet noch keine geschützte Seite.

Der authentifizierte API-Client bindet Requests an die aktuelle UID, prüft Antworten, begrenzt Wartezeit und versucht bei 401 genau einmal eine Token-Erneuerung. Ein zweiter 401 beendet die Session. Logout bricht private Requests ab, leert den Kontocache und private Storage-Einträge, meldet Firebase ab und entfernt private Inhalte auch beim Browser-Zurück.

Firestore-Datenmodell, vollständig serververwaltet:

- `users/{uid}`: privater Status, Rolle, Sprache, Präferenzen, Draft, Sichtbarkeit, serverseitige Timestamps und Revision.
- `profiles/{uid}`: Anzeigename, Avatar, Bio, Interessen, Profilstatus und anfangs null Social-Aktivitäten/Zähler 0.
- `usernames/{normalizedUsername}`: transaktional reservierter Name; kein UID-/E-Mail-Fallback.
- `auditLogs/{id}`: Kontoerstellung, Onboardingabschluss, Sichtbarkeitsänderung; keine Tokens, Header oder Freitexte.
- `rateLimits/{id}`: transaktionaler Basisschutz je authentifiziertem Nutzer und Aktion.

Bootstrap ist atomar und idempotent, auch bei parallelen Aufrufen. Bestehende `accounts/{uid}` werden beim ersten Bootstrap transaktional übernommen; Präferenzen, Abschluss, Bio, Sprache, Erstellzeit und Revision bleiben erhalten. Die alten Dokumente bleiben als Migrationsquelle bestehen, werden danach aber nicht weitergeschrieben. Alte REST-Routen bleiben kompatibel und projizieren den neuen Kontostand. Details und Rollback-Grenzen siehe Setup-Dokument.

## Onboarding und Einstellungen

Die vorhandenen vier Schritte bleiben: Trainingsarten; Dauer/Häufigkeit; Schwerpunkte; Sichtbarkeit. Private Sichtbarkeit ist Standard; Notizen und Fortschritt bleiben privat. Typisierte kanonische Werte und strikte Schemas liegen in `shared/users.ts`; bestehende Demo-Werte werden zentral abgebildet.

„Weiter“ speichert zuerst den Draft und wechselt erst bei Erfolg den Schritt. Fehler erhalten die Eingaben und erlauben Retry. Reload oder ein zweites Gerät lädt den serverseitigen Stand. Abschluss übernimmt Interessen und Sichtbarkeit ins Profil, bereinigt den Draft und ist bei identischer Wiederholung idempotent. Revisionen verhindern unbemerkte parallele Überschreibungen. Spätere Änderungen erfolgen in Einstellungen, nicht durch erneutes Onboarding.

Profil und Einstellungen verwenden echte Kontodaten, einschließlich Sprache, Trainingspräferenzen und Profilstatus. Trainingsdaten erscheinen im echten Konto als noch nicht verfügbar; sie werden nicht aus der Demo übernommen. Einstellungen speichern Präferenzen und Sichtbarkeit in zwei aufeinanderfolgenden Requests; bei einem Fehler kann der erste bereits erfolgreich sein, ein Retry ist möglich.

## Routen und Demo

Öffentlich: `/`, `/login`. Geschützt: `/home`, `/library`, `/circles`, `/profile`, `/settings` und vorerst auch `/discover` (bewusste Beibehaltung der bestehenden Kontoguards; später öffentlich). Gäste landen mit sicherer interner Return-URL bei Login. Unvollständige Konten erreichen `/onboarding`; abgeschlossene Konten gelangen von Login/Onboarding zu Home. Gesperrte, gelöschte und zur Löschung vorgemerkte Konten erhalten ausschließlich einen passenden Statushinweis. Es gibt noch keinen Löschprozess.

`VITE_DEMO_MODE` ist standardmäßig `false`. Der explizite Demo-Einstieg verwendet eigene Repositories und lokale `flowcircle.demo.v1.*`-Daten. Demo-Onboarding und Trainingsdaten werden niemals automatisch hochgeladen. Die Demo-Bibliothek bleibt nur im Arbeitsspeicher. Beispielprogramme, Fortschritt, Reviews und Circles sind klar gekennzeichnete, fiktive Ansichten.

Mobile Navigation unter 600px, Rail ab 600px, Sidebar ab 1200px. Hauptnavigation: Home, Entdecken, Bibliothek, Circles, Profil. Einstellungen separat. Deutsch ist vollständig; Englisch nutzt teilweise deutschen Fallback. Tokens und gemeinsame Komponenten liegen in `src/design-system/`. Das helle Design bleibt unverändert; keine installierbare PWA/garantierte Offline-Funktion.

`/dev/demo` zeigt nur in Development maskierte Diagnosezustände, Konfigurationspräsenz und Emulatorflags. Keine Tokens oder Credentials. Production liefert Not Found, der Diagnose-Chunk wird nicht gebaut. Der Health-Endpunkt veröffentlicht Admin-Konfigurationshinweise ebenfalls nur in Development.

## API

Alle Pfade beginnen mit `/api/v1`; alle Kontorouten verlangen einen serverseitig verifizierten Firebase-ID-Token einschließlich Widerrufs-/Deaktivierungsprüfung.

| Methode | Pfad                                     | Zweck                                            |
| ------- | ---------------------------------------- | ------------------------------------------------ |
| GET     | `/health`                                | Metadaten, kein Beweis einer Firebase-Verbindung |
| POST    | `/users/bootstrap`                       | Konto atomar anlegen oder wiedererkennen         |
| GET     | `/users/me`                              | Minimale eigene Kontoprojektion                  |
| PATCH   | `/users/me/onboarding`                   | Partieller Draft und Schritt 1–4                 |
| POST    | `/users/me/onboarding/complete`          | Validierter Abschluss                            |
| PATCH   | `/users/me/preferences`                  | Whitelist-Präferenzen und Sprache                |
| PATCH   | `/users/me/privacy`                      | Profilstatus                                     |
| GET     | `/me`                                    | Legacy-Kontoprojektion/Bootstrap                 |
| PUT     | `/me/onboarding`                         | Legacy-Onboarding                                |
| PATCH   | `/me/profile`                            | Anzeigename/Bio                                  |
| POST    | `/playlists/inspect`, `/programs/import` | Weiterhin 501                                    |

UID kommt ausschließlich aus dem Token; mitgesendete UID/Rollen oder unbekannte Felder werden abgelehnt. Keine fremden Kontodaten, Audit Logs oder Admin-Felder in Antworten. Standardfehler: `{code,userMessageKey,retryable,details}`; alle neuen Fehler besitzen deutsche Übersetzungen. 401 ungültige Authentifizierung; 403 Kontosperre; 409 Revision/Status; 429 Rate-Limit. Antworten sind `no-store`, Payloads auf 8KB begrenzt. Keine internen Exceptions/Stacktraces an den Browser.

Explizite Vercel-Funktionsdateien bilden sämtliche verschachtelten Pfade ab; kein Catch-all für Schreibpfade. Insgesamt 12 Funktionen. `vercel.json` behandelt direkte SPA-Routen getrennt von API-Pfaden. Infrastruktur wurde nicht umgebaut.

## Emulatoren und Rules

```sh
npm run emulators:start
# in separatem Terminal mit der im Setup beschriebenen lokalen .env:
npm run dev
npm run test:auth-emulator
npm run test:emulator
```

Der Launcher verwendet ausschließlich `demo-flowcircle`, localhost Auth 9099/Firestore 8080 und entfernt echte Credentials aus dem Kindprozess. Client- und Serverflags sind explizit, Production verbietet Emulatoren. Für Firestore ist der offizielle JAR-Download erforderlich. `firestore.rules` sperrt direkte Reads/Writes aller privaten Collections auch für angemeldete Clients; Zugriff nur über Admin und autorisierte REST-Routen. Rules werden separat im Firebase-Projekt veröffentlicht, nicht automatisch durch Vercel.

## Prüfungen

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e
npm run test:auth-emulator
npm run test:emulator
```

`build` erzeugt `dist/` und `dist-server/`. `npm run preview` plus `npm run server:start` startet den Production-Build lokal. Playwright nutzt Chromium; bei Bedarf `npx playwright install chromium` oder `CHROMIUM_PATH=/usr/bin/chromium`. Die Ports 5174, 4174 und 3001 müssen frei sein.

Tests unterscheiden klar:

- Vitest/RTL und lokale HTTP-Tests: Authzustände, Account-API, Besitzprüfung, Transaktionslogik mit Testdatenbank, strikte Validierung, Migration, Idempotenz, Konflikte und Logout.
- Chromium: Phone/Tablet/Desktop, 320px Reflow, Tastatur-Onboarding, Fokus, reduzierte Bewegung, Direktaufrufe, Reload, Demo-Abgrenzung und Production-Routen. Keine vollständige Safari-/Firefox-/Screenreader-/Systemschrift-Abnahme.
- Offizieller Auth Emulator: echte SDK-Tokenprüfung und Ablehnung gefälschter Tokens; kein interaktiver Google-OAuth-Test.
- Firestore Emulator: vorbereitete direkte Rules-Verweigerungs- und echte Transaktionstests. In dieser Cloud wegen gesperrtem Download **nicht ausgeführt**.
- Neuer Vercel-Live-Test und geräteübergreifende Migration: **noch offen**, keine Admin-Zugangsdaten in dieser Umgebung.

## Projektstruktur

`shared/` enthält DTOs und Schemas; `src/data/` Repositories, Firebase-Client und API; `src/app/` Provider/Guards; `src/features/` UI; `server/services/account/` Kontodienste und Firestore-Adapter; `server/middleware/` Tokenprüfung; `api/v1/` Vercel-Adapter; `tests/emulator/` offizielle Emulatorprüfungen; `tests/e2e/` Browserprüfungen.

Keine YouTube API, kein Import/Player, keine echten Programme/Sessions/Fortschritte, keine Social-Schreibfunktionen, Analytics oder Android-App wurden ergänzt. Nächster Entwicklungs-Sprint: **Sprint 3 – Öffentliche YouTube-Playlists prüfen, importieren und als FlowCircle-Programme speichern**. Er wird nicht automatisch begonnen.
