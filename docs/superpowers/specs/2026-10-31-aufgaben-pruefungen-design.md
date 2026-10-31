# Aufgaben und Prüfungen verwalten

Stand: 31.10.2026. Grundlage: vom Nutzer gewählte Browser-Variante mit Export/Import.

## Ziel
Die vorhandene Anwendung wird um eine bearbeitbare Aufgabenliste, frei pflegbare Prüfungsfächer und Prüfungen sowie eine Mehrfachauswahl für den Würfeltopf erweitert. Die vorhandenen 70 Aufgaben in elf Themenfeldern bleiben erhalten.

## Bedienung
- Zwei Modi: Übungsaufgaben und Prüfungen. Jeder Modus hat eigene Auswahl und eigenen Erledigt-Status.
- Themen beziehungsweise Prüfungsfächer mit Häkchen auswählen; alle oder keine auswählen. Ohne Auswahl kein Würfeln.
- Verwaltung der Übungsaufgaben: Hinzufügen, Bearbeiten, Löschen und Zuordnen zu einem Themenfeld. Themenfelder ebenfalls anlegen und umbenennen.
- Prüfungsverwaltung: Fächer unabhängig von den vorhandenen Aufgabenthemen anlegen und umbenennen. Prüfungen bestehen aus Fach, frei bearbeitbarem Termin, vierstelligem Jahr und optionalem Zusatz.
- Beispielausgabe: VWL – Frühjahr 2024. Es werden vollständige Prüfungseinträge ausgewählt, keine einzelnen Prüfungsaufgaben.
- Prüfungsbereich startet leer; keine erfundenen Prüfungen als reale Inhalte übernehmen.
- Listen zeigen die ausgewählten Bereiche und deren Fortschritt. Bearbeitung bleibt für sämtliche Einträge erreichbar.
- Löschen erfordert Bestätigung. Belegte Themen/Fächer können erst nach Entfernung oder Neuzuordnung ihrer Einträge gelöscht werden.

## Speicherung und Sicherung
- Lokale Speicherung von Inhalten, Auswahl und Fortschritt im Browser. Bestehende Erledigt-Markierungen werden anhand der bisherigen Aufgabenkennungen übernommen.
- Stabile interne IDs erhalten den Fortschritt beim Umbenennen und Bearbeiten.
- Export lädt eine versionierte JSON-Datei mit allen Daten herunter.
- Import prüft zuerst das vollständige Format, Beziehungen, IDs und Pflichtfelder. Bei Fehlern bleiben die aktuellen Daten unverändert.
- Ein gültiger Import ersetzt nach ausdrücklicher Bestätigung den gesamten Datenbestand einschließlich Fortschritt und Auswahl. Vorher wird ein Export angeboten.
- Fehler beim Speichern werden sichtbar gemeldet; keine stille Zusicherung einer erfolgreichen Speicherung.

## Technische Entscheidung und Alternativen
Gewählt: Browser-Speicherung mit Export/Import, ohne Anmeldung und ohne Server. Alternative: zentrale Speicherung mit Anmeldung, die mehr Einrichtung benötigt und für diesen Umfang zurückgestellt ist. Die bestehende statische HTML/CSS/JavaScript-Basis bleibt erhalten; die Umsetzung darf Datenlogik, Darstellung und Formatierung auf wenige Dateien verteilen. Keine zusätzlichen Laufzeitabhängigkeiten.

## Grenzen und Umsetzungsspielraum
Kein automatischer Geräteabgleich, keine PDF-Verwaltung, keine inhaltliche Prüfung der Prüfungsaufgaben. Darstellung und Feldanordnung legt die Umsetzung passend zum bestehenden Erscheinungsbild fest. Tastaturbedienung, sichere Textausgabe und reduzierte Animation berücksichtigen.

## Abnahme
Aufgaben und Prüfungen können unabhängig gepflegt und gewürfelt werden. Nicht ausgewählte und erledigte Einträge werden ausgeschlossen. Bearbeiten erhält Fortschritt; Export und anschließender Import stellen den Zustand wieder her. Fehlerhafte Importe verändern keine Daten. Die ursprünglichen Aufgaben und ihr vorhandener Fortschritt bleiben bei der Umstellung erhalten.
