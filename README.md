# FlowCircle

FlowCircle organisiert öffentliche YouTube-Playlists als Trainingsprogramme und ergänzt sie langfristig um persönlichen Fortschritt und freiwillige, programmspezifische Circles. Die Web-App funktioniert responsiv auf Smartphone, Tablet und Desktop. Produktregeln stehen in [PRODUCT.md](PRODUCT.md).

## Aktueller Sprint

**Sprint 1 – Firebase-Konto und persistentes Onboarding (Code vorbereitet, Live-Abnahme ausstehend).** Echte Google-Anmeldung, Abmeldung, geschützte Routen sowie serverseitige Konten-/Onboarding-Endpunkte sind ergänzt. Für die Aktivierung ist zusätzlich eine sichere Serverbindung in Vercel erforderlich. Die Einrichtung und der notwendige Live-Test sind in [docs/SPRINT1_SETUP.md](docs/SPRINT1_SETUP.md) dokumentiert.

Die ursprüngliche **Sprint-0-Foundation** bleibt als getrennter Demo-Modus verfügbar. Im Demo-Modus ausschließlich fiktive Inhalte und lokale Einstellungen. Der ursprüngliche React-/Vite-Stack und die natürliche Gestaltung wurden weiterverwendet, die monolithische App in klar getrennte Verantwortlichkeiten aufgeteilt. Der frühere lokale Sessionabschluss wurde entsprechend der Sprint-0-Abgrenzung entfernt.

## Voraussetzungen und Installation

- Node.js **24** (einschließlich `--env-file-if-exists`) und npm **11**
- Für Browser-Tests: Chromium über Playwright oder einen vorhandenen Browser
- Für die Demo keine Firebase-Zugänge erforderlich; für echte Konten siehe [Sprint-1-Setup](docs/SPRINT1_SETUP.md). Keine YouTube-Schlüssel erforderlich.

```sh
npm ci
# Optional: dokumentierte Standardwerte lokal anpassen
cp .env.example .env
```

`npm install` ist für bewusst gewählte Dependency-Änderungen möglich. Für reproduzierbare Installationen die eingecheckte Lockdatei mit `npm ci` verwenden.

## Entwicklung starten

Aus dem Repository-Stamm (in dieser Cloud: `/workspace/doc`):

```sh
npm run dev
```

Startet gemeinsam die Vite-Web-App (standardmäßig Port 5173) und die Node.js-API (Port 3001). Vite leitet `/api` an den lokalen Server weiter. Beide Prozesse müssen bei einer neuen Cloud-Sitzung erneut gestartet werden; das bestehende Checkout verwenden, keinen zusätzlichen Git-Worktree anlegen, sofern nicht ausdrücklich angefordert.

Einzeln starten:

```sh
npm run dev:web
npm run dev:server
```

Die API ist bei `GET /api/v1/health` bereit, wenn JSON mit `status: "ok"` zurückkommt. Ein laufender Prozess allein ist keine Funktionsprüfung. Lokale Sandbox-Beschränkungen können eine Freigabe für Server, Chromium und den esbuild-Installationscheck erfordern; Proxy, TLS- und Artefaktprüfung nicht umgehen.

## Build und Qualität

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

- TypeScript prüft Client, Server, Tests und Konfiguration strikt; kein explizites `any`.
- `npm test` führt Vitest, React Testing Library und echte lokale HTTP-Tests aus.
- `npm run build` prüft Typen, baut das Web nach `dist/` und den Node-Server nach `dist-server/`.
- `npm run preview` startet die gebaute Web-App; für API-Anfragen zusätzlich `npm run server:start` starten. Vorschau verwendet denselben lokalen API-Proxy.
- ESLint und Prettier stehen mit `npm run lint`, `npm run format` und `npm run format:check` zur Verfügung.

Browser-Tests nach dem Build:

```sh
npx playwright install chromium
npm run test:e2e
```

In Linux-Umgebungen gegebenenfalls die offiziellen Playwright-Systemabhängigkeiten installieren. Ein bereits installierter Chromium kann alternativ verwendet werden:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Playwright startet isolierte Web-/Vorschau-Server auf 5174/4174 sowie die API auf 3001 und beendet sie nach dem Lauf. Diese Ports vorher freihalten. Die Prüfungen umfassen echte responsive Navigation, Touch-Ziele, Direktaufrufe, Reload-Persistenz, Tastaturbedienung, reduzierte Bewegung, schmales Reflow-Layout und den Development-/Production-Unterschied. Ein 320px-Reflow-Test entspricht der verfügbaren Layoutbreite bei 200 % Zoom eines 640px-Fensters; er ersetzt keine vollständige Browser-/Screenreader-Matrix. Browser-Artefakte liegen ignoriert in `test-results/`.

## Kontomodus, Demo-Modus und Speicherung

`VITE_DEMO_MODE=true` ist ohne `.env` der anfängliche Demo-Modus. `false` wählt zunächst den Kontomodus. Der explizite Demo-Einstieg bleibt verfügbar; die Auswahl wird im Session Storage gespeichert. `SessionProvider` verwaltet Firebase-Identität und API-Konto getrennt von Demo-Daten, `RepositoryProvider` wählt zentral die passenden Implementierungen aus. Unangemeldete Kontobesucher werden zu `/login` geleitet. Fehlende Konfiguration wird verständlich angezeigt.

Echte Anmeldung: vier öffentliche `VITE_FIREBASE_*`-Variablen, serverseitiges `FIREBASE_PROJECT_ID` sowie `FIREBASE_SERVICE_ACCOUNT_JSON` oder geeignete ADC. Profile und Onboarding werden ausschließlich über `/api/v1/me` geladen/gespeichert. `shared/account.ts` enthält strikte Schemas, serverseitige Revisionen verhindern verlorene parallele Änderungen. Firestore-Regeln sperren direkte Clientzugriffe. Echte Konten zeigen keine fiktiven Trainingsdaten; Interessen und Profil stammen aus dem eigenen Konto.

- Welcome → „Demo ansehen“ startet das lokale Onboarding; nach dessen Abschluss führt derselbe Button zu Home.
- `DemoAuthRepository` liefert ausschließlich eine fiktive Demo-Person; `getCurrentUser()` bleibt dort `null`. Der separate Google-Button nutzt das offizielle Firebase Auth SDK. Ohne Konfiguration gibt es keinen Fake-Login.
- Demo-Onboarding (Schritt, Auswahl, Abschluss und private Voreinstellung) sowie Demo-Einstellungen werden unter `flowcircle.demo.v1.*` im Local Storage gespeichert. Fehler und ungültige Daten werden behandelt.
- Die Demo-Bibliothek ist im Arbeitsspeicher. Speichern/Entfernen über Entdecken bleibt nur innerhalb der aktuellen Sitzung erhalten; beim Neuladen erscheint die Ausgangs-Demo wieder.
- Programmfortschritt, Reviews, Circles und Aktivitäten sind unveränderliche Beispieldarstellungen. Es gibt keine Sessionabschluss-, Schreib- oder Social-Aktionen.
- In der Demo wird kein API-Key und kein echtes Konto gespeichert. Private Notizen sind immer privat; es werden keine Notizen erfasst.
- Sprache: Deutsch vollständig und standardmäßig, Englisch teilweise mit deutschem Fallback. Fiktive Inhaltstexte wie Programmtitel und Beiträge werden nicht übersetzt.

## Routen

Die folgenden Inhaltsangaben beschreiben den Demo-Modus. Im Kontomodus sind persönliche Routen geschützt, Home/Profil/Einstellungen zeigen echte Kontodaten und die übrigen Bereiche einen ehrlichen Entwicklungszustand.

| Route         | Inhalt                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| `/`           | Welcome, Vorteile, Anmeldungshinweis, Demo-Einstieg                                         |
| `/login`      | Google-Anmeldung mit Konfigurations-/Fehlerhinweisen                                        |
| `/onboarding` | Vier lokal persistierte Schritte, zurück/überspringen/abschließen                           |
| `/home`       | „Als Nächstes“, Inner Awakening, Session 8/30, 27 %, Woche, Programme, Circles              |
| `/discover`   | Suche nur in Beispielprogrammen/Creatorn, Kategorien, redaktionelle Bereiche, Importhinweis |
| `/library`    | Aktuell, Gespeichert, Pausiert, Abgeschlossen, Favoriten; Karten/Liste, Sortierung          |
| `/circles`    | Vier fiktive Program Circles und Beispielaktivitäten                                        |
| `/profile`    | Fiktives Profil, Programme, Statistik, Aktivitäten, Reviews                                 |
| `/settings`   | Lokale Demo-Einstellungen, Privatsphäre, Darstellung, Sprache und Hinweise                  |
| `/dev/demo`   | Nur Development: Konfiguration, Breakpoint, Backend-Health, Datenzahlen, Komponentenstates  |
| unbekannt     | Not-Found-Seite mit Rückweg                                                                 |

Mobile Navigation unter 600px, Navigation Rail ab 600px, Sidebar ab 1200px. Die fünf Haupteinträge heißen ausschließlich Home, Entdecken, Bibliothek, Circles, Profil. Einstellungen sind separat erreichbar. `/dev/demo` erhält in Production die Not-Found-Seite; der Diagnose-Chunk wird nicht in den Production-Build aufgenommen.

## Projektstruktur

```text
src/
  app/              Konfiguration, Provider, Routing und App Shell
  design-system/    Zentrale Tokens, Komponenten und Karten-/Ladepatterns
  features/         Seiten nach Fachbereich
  data/
    models/         Domain-Modelle
    repositories/   Austauschbare Interfaces
    demo/           Fiktive Fixtures und Demo-Implementierungen
    api/            Validierender API-Client und Fehlerklasse
  i18n/             de-DE, en-US, typisierte Schlüssel und Fallback
  hooks/            Asynchroner Datenzugriff, Online-Zustand
  utils/            Validierte lokale Speicherung
  test/             UI-, Repository- und Übersetzungstests
server/
  app/              Gemeinsamer HTTP-Handler und HTTP-Tests
  routes/           REST-Routing
  middleware/       Einheitliche Fehlerantworten
  services/         Health-Metadaten
  config/           Serverkonfiguration
  types/            API-Vertrag
api/v1/             Vercel-Adapter für denselben HTTP-Handler
tests/e2e/          Playwright-Browserprüfungen
```

Seiten importieren keine Demo-Fixtures. Sie verwenden `useRepositories()` beziehungsweise den zentralen `useCatalog()`-Hook. `AuthRepository`, `ProgramRepository`, `LibraryRepository`, `ProfileRepository`, `CircleRepository` und `SettingsRepository` trennen Datenzugriff von UI. Spätere API-Repositories werden zentral im Provider eingesetzt. Alle sichtbaren UI-Texte liegen in Übersetzungskatalogen; Inhaltsdaten bleiben bei den Repositories.

## Designsystem

Die zentrale Palette und Skalen liegen in `src/design-system/tokens/tokens.css` (4px-Raster, Typografie, Radien und Farben). Gemeinsame Komponenten: Button (primary/secondary/ghost/destructive/disabled/loading), IconButton, Card, Chip, ProgressBar, Avatar, EmptyState, ErrorState, LoadingState, Skeleton, PageHeader und SectionHeader. ProgramCard und SessionCard ergänzen Fachpatterns. Fokuszustände, semantische Navigation, Labels, 44px-Touch-Ziele und reduzierte Bewegung sind berücksichtigt. Neue Features verwenden diese Komponenten statt eigener Button-/Kartenvarianten.

## Environment Variables

Siehe `.env.example`; keine echten Werte einchecken.

| Name             | Standard                      | Zweck                                                              |
| ---------------- | ----------------------------- | ------------------------------------------------------------------ |
| `APP_ENV`        | `NODE_ENV` oder `development` | API-Umgebung                                                       |
| `APP_VERSION`    | `0.1.0`                       | API-Version                                                        |
| `VITE_DEMO_MODE` | `true`                        | Anfänglicher UI-Modus; Vite-Buildzeit                              |
| `PORT`           | `3001`                        | Optionaler lokaler API-Port; bei Änderung auch Vite-Proxy anpassen |
| `CHROMIUM_PATH`  | Playwright-Browser            | Optionaler Browserpfad nur für Tests                               |

Die Clientversion kommt aus `package.json`; die Clientumgebung aus dem Vite-Modus. `.env.example` enthält die öffentlichen Firebase-Web-Felder und getrennte serverseitige Bindungen. Werte bleiben außerhalb des Repositories. `FIREBASE_SERVICE_ACCOUNT_JSON` darf niemals einen `VITE_`-Präfix erhalten. Eine YouTube-Konfiguration ist weiterhin nicht enthalten.

## API-Grundlage

| Methode | Route                       | Ergebnis                                                    |
| ------- | --------------------------- | ----------------------------------------------------------- |
| GET     | `/api/v1/health`            | 200 mit `status`, `environment`, `version`, ISO-`timestamp` |
| POST    | `/api/v1/playlists/inspect` | 501, bewusst nicht implementiert                            |
| POST    | `/api/v1/programs/import`   | 501, bewusst nicht implementiert                            |
| sonst   | `/api/v1/*`                 | 404 im gleichen Fehlerformat                                |

```json
{
  "code": "not-implemented",
  "userMessageKey": "errors.notImplemented",
  "retryable": false,
  "details": {}
}
```

Die Health- und Import-Stubs rufen keine externen Dienste auf. Echte Kontorouten verifizieren Firebase-Tokens einschließlich Sperrung/Widerruf und verwenden Firestore über das Admin SDK. Antworten sind JSON mit `Cache-Control: no-store`; interne Exceptions werden nicht an Nutzer durchgereicht. Der Browser greift same-origin zu. Auf Vercel übernimmt `api/v1/[...path].ts` den Node-Handler. `vercel.json` stellt direkte SPA-Routen wieder her und schließt API-Pfade vom SPA-Fallback aus. Der lokale Vite-Preview-Server ist kein Ersatz für eine Vercel-Deployment-Prüfung.

## Bekannte Einschränkungen

- Fiktive, nicht mit realen YouTube-Playlists verknüpfte Inhalte; keine Partnerschaften mit Creatorn.
- Echte Auth-/Firestore-Adapter sind implementiert; der konkrete Zugriff auf das Nutzerprojekt muss nach sicherer Serverkonfiguration noch live abgenommen werden.
- Kein Player, Import, Sessionabschluss, echter Fortschritt oder Social-Schreibaktionen.
- Englische Texte teilweise auf Deutsch zurückfallend.
- Nur helle Darstellung in Sprint 0. „System“ speichert die Präferenz, verwendet derzeit ebenfalls das helle Design.
- Keine installierbare PWA und keine garantierte Offline-Verfügbarkeit; nur ein verständlicher Offline-Hinweis.
- Browser-Tests laufen in Chromium; Safari, Firefox und vollständige assistive-Technologie-Tests sind nicht enthalten.

## Geschützte Account-API

- `GET /api/v1/me`: eigenes Konto laden oder beim ersten Login transaktional anlegen.
- `PUT /api/v1/me/onboarding`: strikt validiertes Onboarding mit `expectedRevision`.
- `PATCH /api/v1/me/profile`: Anzeigename und Bio mit `expectedRevision`.
- Fehlender/ungültiger Token: 401. Ungültige Eingaben: 400, zu große Nutzlast: 413, falscher Content-Type: 415, veraltete Revision: 409. Antworten enthalten keine internen Stacktraces.
- Die UID stammt ausschließlich aus dem serverseitig verifizierten Token. Öffentliche Projektionen und direkte Firestore-Schreibzugriffe werden nicht eingeführt.

## Validierungsgrenzen

Vitest deckt Demo-Regressionen, Konto-UI, API-Zugriff und Firebase-Adapter ab. Authentifizierte UI-/API-Tests und SDK-Adaptertests verwenden explizite Testdoubles; es wird dabei kein echter Google-Login und kein reales Firestore durchgeführt. Playwright prüft weiterhin die Demo auf Chromium einschließlich Production-Routen. Für Live-Abnahme und zweites Gerät siehe das Setup-Dokument.

## Nächste Stufe

Zuerst den echten Login und die geräteübergreifende Speicherung mit der sicheren Vercel-Serverbindung abnehmen. Playlist-Import und Player bleiben separate spätere Aufgaben.
