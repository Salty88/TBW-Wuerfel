# Umsetzung: Aufgaben und Prüfungen

Stand: 31.10.2026

- Task 1: vollständig. Versioniertes Datenmodell, 70 Originalaufgaben, Migration, stabile IDs, CRUD und strikte Importvalidierung.
- Task 2: vollständig. Zwei Modi, Mehrfachauswahl, bearbeitbare Listen, lokale Speicherung, bestätigter Import und Export.
- Task 3: vollständig. README, Browser- und Datentests sowie reproduzierbarer Einzeldatei-Export.

## Entscheidungen
- Frischer, separater Checkout unter work/TBW-Wuerfel; Änderungen auf feature/aufgaben-pruefungen. Kein zusätzlicher Worktree notwendig, keine bestehenden Nutzeränderungen vorhanden.
- Fächer/Themen werden unabhängig pro Modus verwaltet; neue Bereiche sind sofort ausgewählt.
- IDs bleiben beim Bearbeiten und Neuzuordnen unverändert. Leere Bereiche können gelöscht werden, belegte Bereiche erst nach Neuzuordnung oder Entfernung der Einträge.
- Import ersetzt nach Prüfung und Bestätigung den gesamten Zustand. Kein automatisches Zusammenführen.
- Der kanonische JSON-Export wird bereits bei jeder Datenänderung auf maximal 5 MiB UTF-8 begrenzt, damit alle akzeptierten Daten auch wiederherstellbar bleiben.
- Die Würfelanimation und ursprünglichen Sprüche bleiben erhalten. Ergebnisse erscheinen direkt im Würfelbereich.
- Kein Push, Merge oder Deployment; lokale Anwendung und Quellcodepaket werden übergeben.

## Prüfung
- 24 reine JavaScript-Verhaltenstests erfolgreich über die verfügbare Node-REPL ausgeführt; Node ist in der Shell nicht auf PATH.
- Insgesamt 40 Tests auf tests/index.html im tatsächlichen Browser bestanden (24 Daten- und 16 UI-Tests).
- Im Browser geprüft: CRUD, getrennte Modi, Fortschritt, Import einschließlich Abbruch und ungültiger Version, Browser-Neuladen, Altdatenmigration, Schutz beschädigter Speicherung, Speicherfehler und Abbruch eines Wurfs bei Auswahländerung.
- Unabhängige Codeprüfung: ein relevanter Befund zur Sicherungsgröße; mit Regressionstests behoben. Keine kritischen Befunde.
- Schmale Ansicht mit 390 × 844 geprüft: Dokumentbreite überschreitet die verfügbare Breite nicht. Dialog per Escape geschlossen; Fokus kehrt zum Auslöser zurück.
- Eigenständige HTML-Ausgabe per lokalem HTTP erfolgreich geöffnet. Direktes file://-Öffnen ist durch die Browserwerkzeug-Richtlinie blockiert und wurde daher nicht getestet.
- Keine Prüfung in zusätzlichen Browserprodukten oder auf physischer Mobilhardware.
