# FlowCircle – Produktkontext

FlowCircle ist eine Social-Tracking-Anwendung für kostenlose Trainingsprogramme aus öffentlichen YouTube-Playlists. Playlist-ID und Programm-ID sind langfristig identisch; Playlist-Elemente sind Sessions. Eine Playlist darf nicht mehrfach als eigenständiges Programm importiert werden.

## Produktregeln

- Ausschließlich öffentliche Playlists; keine allgemeine YouTube-Suche oder eigenständigen Videos als Programme.
- Kategorien: Yoga, Pilates, Mobility, Stretching.
- YouTube bleibt Quelle und Host. Später ausschließlich offizieller Player, sichtbares Branding, kein Download und kein eigener Stream.
- Programme besitzen versionierte Snapshots; persönliche Durchläufe behalten ihre Version.
- Fortschritt wird später serverseitig aus eindeutig abgeschlossenen trackbaren Sessions berechnet. Wiederholungen erhöhen den Fortschritt nicht mehrfach. Überspringen ist kein Abschluss; dauerhaft nicht verfügbare Sessions verhindern 100 Prozent nicht.
- Ein Videoende allein darf nie eine Session abschließen. Aktiver Durchlauf höchstens einmal je Nutzer/Programm.
- Check-ins sind standardmäßig privat. Freitextnotizen bleiben immer privat und werden niemals automatisch in öffentliche Inhalte oder Analytics übernommen.
- Pro Programm genau ein freiwilliger Program Circle; Programmstart und Circle-Beitritt sind unabhängig. Keine frei erstellbaren Gruppen.
- Keine automatische Veröffentlichung von Fortschritt. Keine Ranglisten, keine negative Sprache bei Pausen.
- Reviews später nach mindestens einer abgeschlossenen Session; nur öffentliche Reviews fließen in öffentliche Aggregate ein. Creator-Seiten dürfen keine Partnerschaft suggerieren.
- Profile und einzelne Bereiche erhalten kontrollierte Sichtbarkeit. Privat ist die Voreinstellung.

## Architektur

Responsive React-/TypeScript-Web-App; langfristig optional Kotlin/Compose-Client. Gemeinsames Node.js-REST-Backend unter `/api/v1`, später Firebase Authentication, Firestore und Firebase Admin. Sensible/globale Daten sind server-authoritative; keine direkten sensiblen Firestore-Schreibzugriffe im Client.

## Sprint 0 – Foundation

Technische und visuelle Grundlage mit Routing, Designsystem, typisierten Demo-Repositories, lokalem Demo-Onboarding, i18n, API-Health und bewusst nicht implementierten Import-Stubs. Fiktive Personen und Programme, keine echten Integrationen oder Social-Aktionen. Der bisherige lokale Demo-Sessionabschluss wird bewusst entfernt, da Sessionabschlüsse nicht Teil dieses Sprints sind.

Sprint 1 ist separat: Firebase Authentication, echtes Nutzerkonto, persistentes Onboarding und geschützte Routen. Nicht automatisch beginnen.
