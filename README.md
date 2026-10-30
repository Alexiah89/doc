# FlowCircle

FlowCircle organisiert öffentliche YouTube-Playlists als Trainingsprogramme und ergänzt sie langfristig um persönlichen Fortschritt und freiwillige, programmspezifische Circles. Die Web-App funktioniert responsiv auf Smartphone, Tablet und Desktop. Produktregeln stehen in [PRODUCT.md](PRODUCT.md).

## Aktueller Sprint

**Sprint 0 – Foundation.** Ausschließlich fiktive Demo-Inhalte und lokale Einstellungen, keine echten Produktintegrationen. Der ursprüngliche React-/Vite-Stack und die natürliche Gestaltung wurden weiterverwendet, die monolithische App in klar getrennte Verantwortlichkeiten aufgeteilt. Der frühere lokale Sessionabschluss wurde entsprechend der Sprint-0-Abgrenzung entfernt.

## Voraussetzungen und Installation

- Node.js **24** (einschließlich `--env-file-if-exists`) und npm **11**
- Für Browser-Tests: Chromium über Playwright oder einen vorhandenen Browser
- Keine Firebase-Projekte, YouTube-Schlüssel oder anderen Secrets erforderlich

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

## Demo-Modus und Speicherung

`VITE_DEMO_MODE=true` ist der Standard, auch ohne `.env`. `RepositoryProvider` wählt zentral die Demo-Implementierungen aus. `false` zeigt einen eindeutigen Hinweis, dass echte Dienste fehlen; es wird kein funktionierender Live-Modus simuliert.

- Welcome → „Demo ansehen“ startet das lokale Onboarding; nach dessen Abschluss führt derselbe Button zu Home.
- `DemoAuthRepository` liefert eine ausdrücklich fiktive Person; `getCurrentUser()` bleibt `null`. Ein echtes Login wird nie vorgetäuscht.
- Onboarding (Schritt, Auswahl, Abschluss und private Voreinstellung) sowie Einstellungen werden unter `flowcircle.demo.v1.*` im Local Storage gespeichert. Fehler und ungültige Daten werden behandelt.
- Die Demo-Bibliothek ist im Arbeitsspeicher. Speichern/Entfernen über Entdecken bleibt nur innerhalb der aktuellen Sitzung erhalten; beim Neuladen erscheint die Ausgangs-Demo wieder.
- Programmfortschritt, Reviews, Circles und Aktivitäten sind unveränderliche Beispieldarstellungen. Es gibt keine Sessionabschluss-, Schreib- oder Social-Aktionen.
- Kein API-Key und kein echtes Konto werden gespeichert. Private Notizen sind immer privat; es werden keine Notizen erfasst.
- Sprache: Deutsch vollständig und standardmäßig, Englisch teilweise mit deutschem Fallback. Fiktive Inhaltstexte wie Programmtitel und Beiträge werden nicht übersetzt.

## Routen

| Route         | Inhalt                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| `/`           | Welcome, Vorteile, Anmeldungshinweis, Demo-Einstieg                                         |
| `/login`      | Ehrlicher Platzhalter für spätere echte Anmeldung                                           |
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
| `VITE_DEMO_MODE` | `true`                        | Zentrale Client-Auswahl; Vite-Buildzeit                            |
| `PORT`           | `3001`                        | Optionaler lokaler API-Port; bei Änderung auch Vite-Proxy anpassen |
| `CHROMIUM_PATH`  | Playwright-Browser            | Optionaler Browserpfad nur für Tests                               |

Die Clientversion kommt aus `package.json`; die Clientumgebung aus dem Vite-Modus. Firebase-Konfiguration ist lediglich kommentiert vorbereitet. Es gibt keine aktive Firebase- oder YouTube-Konfiguration.

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

Keine externen Dienste werden aufgerufen. Antworten sind JSON mit `Cache-Control: no-store`; interne Exceptions werden nicht an Nutzer durchgereicht. Der Browser greift same-origin zu. Auf Vercel übernimmt `api/v1/[...path].ts` den Node-Handler. `vercel.json` stellt direkte SPA-Routen wieder her und schließt API-Pfade vom SPA-Fallback aus. Der lokale Vite-Preview-Server ist kein Ersatz für eine Vercel-Deployment-Prüfung.

## Bekannte Einschränkungen

- Fiktive, nicht mit realen YouTube-Playlists verknüpfte Inhalte; keine Partnerschaften mit Creatorn.
- Kein echtes Login, keine geschützten Kontorouten, keine Firestore-Persistenz.
- Kein Player, Import, Sessionabschluss, echter Fortschritt oder Social-Schreibaktionen.
- Englische Texte teilweise auf Deutsch zurückfallend.
- Nur helle Darstellung in Sprint 0. „System“ speichert die Präferenz, verwendet derzeit ebenfalls das helle Design.
- Keine installierbare PWA und keine garantierte Offline-Verfügbarkeit; nur ein verständlicher Offline-Hinweis.
- Browser-Tests laufen in Chromium; Safari, Firefox und vollständige assistive-Technologie-Tests sind nicht enthalten.

## Nächster Sprint

**Sprint 1 – Firebase Authentication, echtes Nutzerkonto, persistentes Onboarding und geschützte Routen.** Separate Aufgabe; nicht Bestandteil von Sprint 0.
