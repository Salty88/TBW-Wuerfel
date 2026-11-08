# TBW · Dein Lernwürfel

Ein browserbasierter Lernwürfel für den Technischen Betriebswirt. Wähle Themen oder Prüfungsfächer und lass die nächste Aufgabe beziehungsweise Prüfung auslosen. Ohne Konto, Server oder externe Bibliotheken.

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

## Gemeinsamen Lernstand bereitstellen

Die Gruppenfunktion wird über den mitgelieferten Node.js-Server bereitgestellt.
Der Server liefert die Webseite aus, meldet Mitglieder über GitHub an und
speichert Aufgaben, Themen, Fächer, Prüfungen und den Erledigt-Status
im privaten Daten-Repository. Der Würfelmodus und die Auswahl bleiben pro Browser.

1. Ein separates **privates** GitHub-Repository mit initialisiertem Standardbranch anlegen.
   Alle Mitglieder als Mitwirkende mit Schreibzugriff einladen. Der Standardbranch
   muss Änderungen über die Contents-API erlauben.
2. Eine GitHub-App registrieren. Als Callback die öffentliche HTTPS-Adresse mit
   `/auth/callback` eintragen. Nur die Repository-Berechtigung **Contents: Read and write**
   erteilen. Webhooks deaktivieren. Die App ausschließlich im privaten Daten-Repository
   installieren.
3. Den Server auf einem Node.js-Host (Node.js 22 oder neuer, eine Instanz) starten.
   Die öffentliche Adresse muss HTTPS verwenden. Die folgenden Werte als
   Umgebungsvariablen beim Hoster hinterlegen. Das Client-Secret als Geheimnis
   im Hoster speichern.

   | Variable | Wert |
   | --- | --- |
   | `TBW_ORIGIN` | Öffentliche Basisadresse ohne abschließenden Schrägstrich |
   | `TBW_GITHUB_CLIENT_ID` | Client-ID der GitHub-App |
   | `TBW_GITHUB_CLIENT_SECRET` | Client-Secret der GitHub-App |
   | `TBW_DATA_REPO` | Privates Daten-Repository im Format `Besitzer/Repository` |
   | `TBW_INITIALIZER` | GitHub-Anmeldename der Person, die den ersten Stand übernimmt |
   | `PORT` | Port des Hosters, Standardwert 8080 |

   Startbefehl: `node server.cjs`. Die Sitzung dauert bis zu acht Stunden
   und endet auch bei einem Serverneustart.

4. Die Gruppenleitung öffnet die bereitgestellte Webseite, meldet sich mit
   GitHub an und klickt auf **Synchronisieren**. Beim ersten Mal bestätigt sie
   **Gruppenstand anlegen**. Existiert der bisherige Lernstand bereits unter
   derselben Webadresse, kann die App ihn direkt aus dem Browser übernehmen.
   Für eine bisher heruntergeladene HTML-Datei oder eine andere Webadresse
   ist einmalig der vorhandene Export und Import nötig, weil Browser den
   Speicher je Adresse trennen.
5. Danach können alle Mitglieder dieselbe Webseite öffnen, sich anmelden und
   auf **Synchronisieren** klicken. Der Browser hält einen Entwurf samt letztem
   Synchronisationsstand, damit Änderungen bei einer unterbrochenen Verbindung
   erneut gesendet werden können. **Synchronisieren** aktualisiert auch den
   gemeinsamen Erledigt-Status.

Die von GitHub gespeicherte Versionskennung verhindert, dass ein gleichzeitiger
Schreibvorgang fremde Änderungen überschreibt. Bei einem Konflikt kann erneut
synchronisiert werden. Wenn sich parallele Änderungen fachlich widersprechen,
etwa wenn ein Thema gelöscht und zugleich ein neuer Eintrag dafür angelegt
wurde, muss die Zuordnung vor dem erneuten Synchronisieren korrigiert werden.

Tests: `node tests/run.cjs` und `node --test tests/sync.test.cjs`.
