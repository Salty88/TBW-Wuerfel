# TBW · Dein Lernwürfel

Ein browserbasierter Lernwürfel für den Technischen Betriebswirt. Wähle Themen oder Prüfungsfächer und lass die nächste Aufgabe beziehungsweise Prüfung auslosen. Der Würfel funktioniert lokal. Die Gruppensynchronisation verwendet GitHub.

## Starten

`index.html` zusammen mit `styles.css`, `data.js` und `app.js` in einem Ordner behalten und im aktuellen Browser öffnen. Alternativ den gesamten Ordner statisch hosten, beispielsweise über GitHub Pages. Es ist kein Build erforderlich.

Für eine lokale HTTP-Vorschau mit Python:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Danach `http://127.0.0.1:8765/` öffnen.

## Aufgaben verwalten

Die ursprünglichen 70 Aufgaben in elf Themenfeldern sind bereits enthalten. Über **Themen verwalten** kannst du Themen hinzufügen oder umbenennen. Über **Aufgabe hinzufügen** erstellst du Aufgaben und ordnest sie einem Thema zu. **Liste bearbeiten** zeigt alle Einträge, auch aus nicht ausgewählten Themen, und bietet Bearbeiten und Löschen an. Umbenennen und Neuzuordnen erhalten den Erledigt-Status. Es werden Bezeichnungen verwaltet, keine Aufgabentexte oder PDF-Dateien.

## Prüfungen verwalten

1. Auf **Prüfungen** wechseln.
2. Unter **Fächer verwalten** ein Fach anlegen, beispielsweise VWL.
3. **Prüfung hinzufügen**: Fach auswählen, Termin (z. B. Frühjahr), vierstelliges Jahr (z. B. 2024) und optional einen Zusatz eintragen.
4. Das Ergebnis lautet beispielsweise **VWL – Frühjahr 2024**.

Prüfungsfächer sind unabhängig von den bisherigen Aufgabenthemen. Der Bereich beginnt bewusst leer. Termine können frei benannt werden, etwa „Nachprüfung“. Doppelte Fächer und identische Einträge werden verhindert. Ein Fach/Thema kann nur gelöscht werden, wenn keine Einträge mehr zugeordnet sind.

## Würfeln und Fortschritt

- Die Häkchen bestimmen, welche Themen oder Prüfungsfächer im Würfeltopf sind. Mehrfachauswahl, „Alle auswählen“ und „Keine“ werden unterstützt.
- Ohne Auswahl oder verfügbare Einträge ist Würfeln deaktiviert.
- **Erledigte nicht mehr würfeln** schließt bereits erledigte Einträge aus; durch Ausschalten werden sie wieder berücksichtigt.
- Jede verfügbare Aufgabe/Prüfung hat dieselbe Auswahlchance. Wenn mehrere verfügbar sind, wird eine direkte Wiederholung vermieden.
- Aufgaben und Prüfungen haben getrennte Auswahl und getrennten Fortschritt. Der Fortschrittsbalken bezieht sich auf die angezeigten Einträge; im Bearbeitungsmodus werden alle angezeigt.
- Änderungen während einer Würfelanimation brechen den laufenden Wurf ab, damit kein veraltetes Ergebnis angezeigt wird.
- **Fortschritt dieses Modus zurücksetzen** setzt nach Bestätigung alle Markierungen des aktuellen Modus zurück, auch außerhalb der Auswahl. Inhalte werden nicht gelöscht.
- Die Systemeinstellung für reduzierte Bewegung wird berücksichtigt.

## Export und Import

**Exportieren** lädt eine JSON-Sicherung herunter. Sie enthält sämtliche Aufgaben, Themen, Prüfungen, Prüfungsfächer, Auswahl, den zuletzt gewählten Modus und beide Fortschritte. Das Datenformat hat eine feste Kennung (`tbw-wuerfel`) und Version (`1`).

**Importieren** prüft zunächst die vollständige Datei (maximal 5 MB), Pflichtfelder, IDs und Zuordnungen. Ungültige Dateien werden abgelehnt, ohne den aktuellen Datenbestand zu verändern. Nach erfolgreicher Prüfung erscheint eine Zusammenfassung. Dort kannst du zuerst deinen bisherigen Stand exportieren. Erst nach Ankreuzen der Zustimmung und **Sicherung übernehmen** ersetzt die Datei den gesamten bisherigen Zustand. Es findet keine Zusammenführung statt. Abbrechen verändert nichts.

Zum Gerätewechsel: Auf dem ersten Gerät exportieren, die Datei übertragen und auf dem zweiten Gerät importieren. Regelmäßige Sicherungen sind sinnvoll, insbesondere vor Löschen oder Import.

## Lokale Speicherung und bestehender Fortschritt

Gespeichert wird ausschließlich in `localStorage` des jeweiligen Browsers unter `tbw-wuerfel-v1`. Beim ersten Start ohne neue Daten werden alte Markierungen aus `aufgaben-wuerfel-erledigt` den ursprünglichen Aufgaben zugeordnet. Der alte Schlüssel bleibt erhalten; die Migration erfolgt nur einmal, solange der neue Datenbestand vorhanden ist.

Die Übernahme funktioniert nur auf derselben Browser-Adresse (Origin) wie die bisherige Anwendung. Eine lokal geöffnete Kopie kann nicht auf den Speicher einer GitHub-Pages-Seite zugreifen. Bei lokaler Dateinutzung kann sich der Speicher je nach Browser auch nach Dateipfad unterscheiden. Private Fenster, gelöschte Browserdaten oder ein anderer Browser können den Lernstand verlieren. Die Sicherungsdatei ist die portable Kopie; es gibt keinen automatischen Geräteabgleich.

Speicherfehler werden sichtbar gemeldet. Änderungen bleiben dann möglicherweise nur in der laufenden Sitzung: sofort exportieren. Sind gespeicherte Daten beschädigt oder nicht lesbar, wird ein vorläufiger Ausgangsstand angezeigt, ohne die gespeicherten Daten zu überschreiben; eine gültige Sicherung kann importiert werden. Verwende zum Bearbeiten möglichst nur einen geöffneten Tab, da es keinen Abgleich gleichzeitig geöffneter Tabs gibt.

## Einzeldatei erstellen

Mit `python3 scripts/build-standalone.py Lernwuerfel.html` entsteht eine vollständige HTML-Datei mit eingebettetem CSS und JavaScript. Diese Datei kann allein weitergegeben und im Browser geöffnet werden. Für dieselbe Anwendung möglichst immer denselben Dateipfad verwenden; Daten auf andere Kopien per Export/Import übertragen.

## Tests

Reine Verhaltenstests für Datenmodell, Altdatenmigration, CRUD, Filter, Zufallsauswahl und sichere Sicherungsformate:

```sh
node tests/run.cjs
```

Zusätzlich mit dem oben genannten lokalen Server `http://127.0.0.1:8765/tests/` öffnen und **Tests starten** anklicken. Diese Seite testet echte Browser-Abläufe einschließlich Formularen, Neuladen, Importbestätigung, ungültigem Import, Auswahländerung während eines Wurfs, Löschen und Speicherfehlern. Die Tests ersetzen den lokalen Zustand kurzzeitig durch Testdaten und stellen ihn anschließend wieder her. Nur auf einer separaten lokalen Vorschau-Adresse ausführen; keine weiteren Anwendungstabs gleichzeitig dort bearbeiten.

## Gemeinsamen Lernstand mit GitHub nutzen

Der Würfel kann über GitHub Pages oder als heruntergeladene HTML-Datei
geöffnet werden. Für die Gruppensynchronisation braucht er eine Verbindung
zu GitHub. Aufgaben, Themen, Fächer, Prüfungen und Erledigt-Markierungen
werden gemeinsam gespeichert. Die Würfelauswahl bleibt pro Browser.

1. Ein privates Repository in einer **GitHub-Organisation** erstellen und den
   Standardbranch mit einer README initialisieren. Die Lernenden als
   Organisationsmitglieder aufnehmen und ihnen Schreibzugriff nur auf das
   Daten-Repository geben. GitHub unterstützt Fine-grained Tokens für
   reine Repository-Mitwirkende außerhalb der Organisation nicht.
2. Jedes Mitglied erstellt in seinen GitHub-Einstellungen einen **Fine-grained
   personal access token**. Als Resource Owner die Organisation auswählen,
   den Zugriff auf das private Daten-Repository beschränken und für
   **Contents** die Berechtigung **Read and write** setzen. Die Organisation
   muss den Token gegebenenfalls genehmigen. Der Token bleibt beim Würfeln
   nur im Arbeitsspeicher des Browsers.
3. Den Würfel öffnen, **GitHub verbinden** wählen und den Namen des
   privaten Repositories sowie den eigenen Token eingeben. Die Gruppenleitung
   benötigt Adminrechte im Daten-Repository und bestätigt einmalig
   **Gruppenstand anlegen**. Der ausgewählte Startstand wird dann direkt
   gespeichert.
4. Nach Änderungen **Synchronisieren** wählen. Änderungen an verschiedenen
   Einträgen werden zusammengeführt. Bei widersprüchlichen Änderungen am
   selben Eintrag fragt der Würfel nach der gewünschten Fassung. Wenn ein
   anderer Schreibvorgang dazwischenkommt, erneut synchronisieren.

Für GitHub Pages im öffentlichen Code-Repository unter **Settings → Pages**
den Standardbranch und den Ordner **/ (root)** auswählen. Für die
heruntergeladene Ausgabe im Repository **TBW-Lernwuerfel.html** öffnen und
herunterladen. Soll ein vorhandener Lernstand von einer anderen Adresse
übernommen werden, braucht es einmalig den eingebauten Export und Import.
Browser trennen den lokalen Speicher nach Adresse.

Tests: `node tests/run.cjs` und `node --test tests/sync.test.cjs`.
