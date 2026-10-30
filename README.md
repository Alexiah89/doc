# FlowCircle

Responsive React-/TypeScript-Web-App für Handy, Tablet und Desktop. Social Tracking für Programme aus öffentlichen YouTube-Playlists, mit Fortschritt ohne Druck.

## Starten

Node.js 24 und npm 11 verwenden:

```sh
npm ci
npm run dev -- --port 5173
```

## Produktionsbuild

```sh
npm run build
```

## Aktueller Stand

Interaktive Vorschau mit fünf Hauptbereichen, Kategorie-Filtern, Speichern von Beispielprogrammen und bewusstem Abschließen/Rückgängigmachen von Beispiel-Sessions. Alle Programme sind Beispieldaten. Der Zustand bleibt nur bis zum Neuladen erhalten.

Noch nicht implementiert: echte YouTube-Importe, Videoplayer, Firebase-Anmeldung, Backend, Reviews und Community-Funktionen. Die Anwendung ist noch keine installierbare PWA und noch nicht öffentlich bereitgestellt.

## Geplante Architektur

- Web: React und TypeScript; responsive Navigation für Smartphone, Tablet und Desktop
- Backend: Node.js, REST unter `/api/v1`, Firebase Authentication und Cloud Firestore
- Öffentliche YouTube-Playlists als Programme; keine allgemeine YouTube-Suche
- Offizieller YouTube-IFrame-Player; kein Herunterladen oder eigenes Hosting
- Serverseitige Programmversionen, persönliche Durchläufe und Fortschrittsberechnung
- Private Check-ins und Notizen; keine automatische Veröffentlichung
- Programmbezogene Reviews und freiwillige Circles

Videoende allein schließt keine Session ab. Wiederholungen erhöhen den Programmfortschritt nicht erneut. Private Notizen werden nie automatisch in öffentliche Inhalte übernommen.
