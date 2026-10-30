# Sprint 1 – Firebase und Vercel verbinden

Der Code enthält echte Firebase-Auth- und Firestore-Adapter. Die automatisierten Auth-/Account-Prüfungen verwenden explizite Testdoubles. Ohne die unten genannten Serverbindungen ist der Live-Account-Workflow nicht bereit. Ein erfolgreicher Build oder ein Health-200 bestätigt keinen Zugriff auf das konkrete Firebase-Projekt.

## Bereits vom Nutzer vorbereitet

- Firebase-Projekt `flowcircle-5babe`, Web-App registriert.
- Google-Anbieter in Firebase Authentication aktiviert.
- `flowcircle.vercel.app` als autorisierte Domain hinzugefügt.
- Standard-Firestore-Datenbank im Produktionsmodus angelegt.
- Vier öffentliche `VITE_FIREBASE_*`-Werte in Vercel gespeichert.

Diese Angaben stammen vom Nutzer; Console- und Deployment-Einstellungen sind hier nicht direkt einsehbar. Die Web-Konfiguration enthält keinen Admin-Zugang. Ihr API-Key ist kein Ersatz für serverseitige Berechtigungen.

## Server-Konfiguration in Vercel

Unter Projekt → Settings → Environment Variables:

1. `FIREBASE_PROJECT_ID` auf `flowcircle-5babe` setzen.
2. `FIREBASE_SERVICE_ACCOUNT_JSON` als **serverseitiges Secret** hinterlegen. Der Wert ist die komplette Dienstkonto-JSON-Datei mit `project_id`, `client_email`, `private_key` und den übrigen Originalfeldern. Keine zusätzlichen äußeren Anführungszeichen und kein Markdown einfügen. Den Inhalt niemals im Chat, Sourcecode oder in einem `VITE_`-Feld speichern.
3. Für ein Dienstkonto lassen sich Schlüssel in Firebase → Einstellungen → Dienstkonten → Firebase Admin SDK → „Neuen privaten Schlüssel generieren“ erzeugen. Die Datei außerhalb des Repositories aufbewahren und ihren Inhalt ausschließlich in das sichere Vercel-Eingabefeld übernehmen. Alternativ ist auf geeigneter vertrauenswürdiger Infrastruktur Application Default Credentials möglich; eine Umgebungsvariable allein beweist keine funktionierende Bindung.
4. Der Server benötigt Firestore-Datenzugriff (`roles/datastore.user`) und für die Prüfung auf widerrufene/gesperrte Anmeldungen Lesezugriff auf Firebase Auth (`roles/firebaseauth.viewer`). Für einen produktiven Zugang bevorzugt ein entsprechend eingeschränktes eigenes Dienstkonto verwenden. Ein Dienstkonto-Schlüssel erbt die tatsächlichen Rollen seines Kontos.
5. Nur die benötigten Deployments mit diesen Werten versorgen. Preview und Production mit demselben Firebase-Projekt greifen auf dieselben Konten zu; für getrennte Testdaten ein eigenes Preview-Projekt verwenden.

Kein Schlüssel muss an den Agenten übermittelt werden. Für dieses Projekt ist in der aktuellen Cloud kein passender Admin-Zugang bestätigt. Den tatsächlichen Zugriff nach dem Deployment testen.

## Firestore-Regeln

Alle Kontodokumente liegen unter `accounts/{uid}`. Die UID wird aus dem verifizierten Token bestimmt; die Client-Anfrage enthält keine frei wählbare Ziel-UID. Der Server verwendet das Admin SDK und Firestore-Transaktionen.

`firestore.rules` verweigert sämtliche direkten Clientzugriffe. In der Firebase Console unter Firestore → Regeln prüfen, dass diese Deny-all-Regeln aktiv sind; ein Produktionsmodus mit bereits gesperrten Regeln muss dafür nicht geöffnet werden. Für einen CLI-Workflow ist `firebase.json` vorbereitet. Der Agent veröffentlicht Regeln nicht ohne geeigneten Zugriff und Auftrag.

## Aktivierung und Prüfung

Erst den Sprint-1-Branch als Vorschau bereitstellen. Die konkrete Preview-Domain muss in Firebase Authentication autorisiert sein; die Freigabe der Produktionsdomain gilt nicht automatisch für wechselnde Preview-URLs. Die Vorschau zunächst für den vorgesehenen Testzugang verwenden.

1. Client- und Servervariablen im gewünschten Vercel-Environment speichern und das Deployment mit dem neuen Code neu bauen. Vite-Variablen werden beim Build eingebettet.
2. `VITE_DEMO_MODE=false` als Standardmodus wählen, wenn der echte Zugang bereit ist. Der explizite Button „Demo ansehen“ bleibt erhalten. Der Modus ist nur eine UI-Auswahl; er ersetzt weder Tokenprüfung noch Datenbankrechte.
3. Google-Anmeldung im normalen Browser auf dem Handy testen. Popups für die Website erlauben, falls der Browser das Anmeldefenster blockiert.
4. Nach dem Login muss `/api/v1/me` mit einem gültigen Firebase-ID-Token ein privates Konto anlegen/laden. Ohne Token muss 401 zurückkommen. In Firestore sollte genau ein eigenes Kontodokument erscheinen.
5. Onboarding wählen, Seite neu laden und auf einem zweiten Gerät mit demselben Google-Konto anmelden. Schritt und Auswahl müssen serverseitig erhalten bleiben.
6. Anzeigename/Bio bearbeiten, neu laden und prüfen. Danach abmelden: geschützte Seiten müssen zur Anmeldung führen. Mit einem zweiten Google-Konto dürfen keine Daten des ersten Kontos erscheinen.
7. Parallele Änderungen auf zwei Geräten müssen bei veralteter Revision einen verständlichen Konflikthinweis liefern, statt neuere Daten unbemerkt zu überschreiben.

Erst nach diesem Live-Test den Stand zur Hauptversion übernehmen. Die im Repository enthaltenen Tests ersetzen keinen echten OAuth-/Firestore-Test und prüfen die Regeln noch nicht gegen einen Firebase-Emulator.

## Funktionsgrenzen

Live: Google-Anmeldung, Wiederherstellung durch Firebase, Abmeldung, eigenes Profil, privates Onboarding mit serverseitiger Validierung und Versionsprüfung, geschützte Routen. Keine lokalen Demo-Präferenzen werden automatisch hochgeladen.

Demo: bisherige acht Programme, lokale Demo-Einstellungen und Beispiele. Der Live-Modus verwendet keine fiktiven Fortschritts-/Follower-/Circle-Daten. Öffentliche Profile, echte Programme, YouTube-Importe, Player und Social-Schreibaktionen bleiben spätere Aufgaben.

Tokens werden nur über Firebase verwaltet und als Bearer-Header an die eigene API gesendet. Der App-Code schreibt Tokens nicht selbst in Local Storage oder Logs. Der Sessionmodus wird separat im Session Storage gespeichert. Echte Kontodaten werden im App-Code nicht lokal persistiert; Firebase selbst nutzt seine dokumentierte Browser-Authentifizierungspersistenz.
