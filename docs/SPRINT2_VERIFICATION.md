# Sprint 2 – Prüfstand vom 30. Oktober 2026

## Erfolgreich ausgeführt

| Prüfung                                                   | Ergebnis                                                                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                  | Reproduzierbare Installation, 982 Pakete                                                                                                                  |
| `npm ls --depth=0`                                        | Keine ungültigen direkten Abhängigkeiten                                                                                                                  |
| `npm run typecheck` / Typecheck innerhalb `npm run build` | Client, Server und Tests fehlerfrei                                                                                                                       |
| `npm run lint`                                            | Erfolgreich                                                                                                                                               |
| `npm run format:check`                                    | Erfolgreich                                                                                                                                               |
| `npm test`                                                | 112 Tests bestanden, keine fehlgeschlagenen Suites                                                                                                        |
| `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`        | 9 Chromium-Tests bestanden                                                                                                                                |
| `npm run test:auth-emulator`                              | 1 Test mit offiziellem Auth Emulator bestanden                                                                                                            |
| `npm run build`                                           | Vite-Production-Bundle und Node-Server gebaut                                                                                                             |
| Repository-/Bundle-/Log-Prüfung                           | Keine echten API-Schlüssel, PEM-Inhalte oder Tokenwerte im geprüften Quellstand/Build/Testlogs gefunden; kein Admin SDK/privates Credential im Web-Bundle |
| `git diff --check`                                        | Keine Whitespace-Fehler                                                                                                                                   |

Normale Tests umfassen die früheren Regressionen und neue Auth-/Routing-/HTTP-/Bootstrap-/Onboarding-/Security-/Migrationstests. Transaktionslogik nutzt dabei eine explizite In-Memory-Testdatenbank, nicht Cloud Firestore. Chromium prüft Demo-Onboarding, responsive Layouts, direkte Routen, Gastschutz im Production-Build, Tastatur, Fokus und schmalen Reflow. RTL prüft echten Kontomodus mit Test-Identitäten und API-Doubles, einschließlich wiederhergestellter Einstellungen, Logout und Browser-Zurück.

Der Auth Emulator prüft echte SDK-Tokenverifikation und verworfene gefälschte Tokens; er bestätigt kein interaktives Google-OAuth auf der Production-Domain.

## Blockiert beziehungsweise noch offen

- **Firestore Emulator/Rules:** Der offizielle Firestore-Emulator-Download von `storage.googleapis.com` wird durch die Cloud-Netzwerkrichtlinie mit HTTP 403 abgewiesen. Vorbereitete Tests in `tests/emulator/firestore.test.ts` wurden deshalb nicht ausgeführt. Keine Behauptung, diese Prüfung sei bestanden.
- **Neue Vercel-Vorschau/Production:** In dieser Cloud sind keine Firebase-Projektzugangsdaten/Identitäten gebunden, Vercel-Ziele sind nicht freigegeben. Kein Live-Google-Login, keine neue echte Firestore-Migration, keine Rules-Veröffentlichung und kein Test auf zwei Geräten durch diese Umsetzung. Der Nutzer hat die vorherige Version bereits als funktionierend bestätigt.
- **Weitere Browser/Accessibility:** Chromium und automatisierte semantische Prüfungen; keine vollständige Safari-/Firefox-/Screenreader-/Systemschriftprüfung.

Sprint 2 ist implementiert und lokal geprüft, aber diese offenen Abnahmepunkte müssen vor einer vollständigen Freigabe abgeschlossen werden. Siehe [Schritt-für-Schritt-Setup](SPRINT2_SETUP.md). Production wurde nicht automatisch ersetzt; Sprint 3 wurde nicht begonnen.
