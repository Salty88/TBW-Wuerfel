# Aufgaben- und Prüfungsverwaltung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Aufgaben und Prüfungen individuell pflegen, getrennt würfeln und vollständig exportieren/importieren.

**Architecture:** Statische Anwendung ohne Server. Ein versioniertes Datenmodell mit stabilen IDs trennt Aufgabenthemen, Prüfungsfächer, Einträge, Auswahl und Fortschritt. Eine reine Datenlogik validiert sämtliche Änderungen und Importe, die Darstellung speichert über localStorage.

**Tech Stack:** HTML, CSS, JavaScript; keine Laufzeitabhängigkeiten.

**Spec:** docs/superpowers/specs/2026-10-31-aufgaben-pruefungen-design.md

## Global Constraints
- Die vorhandenen 70 Aufgaben in elf Themenfeldern bleiben erhalten.
- Zwei Modi: Übungsaufgaben und Prüfungen.
- Keine zusätzlichen Laufzeitabhängigkeiten.
- Kein automatischer Geräteabgleich, keine PDF-Verwaltung.

## Review Focus
- Alte Erledigt-Daten müssen beim ersten Start übernommen werden.
- Leere Auswahl und vollständig erledigte Bereiche dürfen keine ungültige Zufallsauswahl auslösen.
- Fehlerhafte oder unbekannte Importversionen dürfen keine Daten überschreiben.
- Umbenennen muss die Identität und den Fortschritt erhalten.
- Frei eingegebener Text muss als Text statt als HTML dargestellt werden.

---

### Task 1: Datenmodell, Migration und Sicherung
**Files:** Create `data.js`, `tests/data.test.js`.
**Interfaces:** `createInitialState(legacyDone)`, `validateState(input)`, `getCandidates(state, mode)`, `exportState(state)`, `importState(json)`; exportierte Funktionen verwenden dieselbe versionierte Zustandsstruktur.
- [x] Tests für 70 Ausgangsaufgaben, Altdatenmigration und getrennte Modi schreiben und scheitern sehen.
- [x] Ausgangsdaten und stabile IDs sowie Kandidatenfilter implementieren.
- [x] Tests für Export/Import-Rundlauf, doppelte IDs, ungültige Beziehungen, unbekannte Versionen und fehlerhafte Pflichtfelder schreiben und scheitern sehen.
- [x] Strikte Importvalidierung implementieren und gesamte Daten-Tests grün ausführen.

### Task 2: Verwaltung und Würfeloberfläche
**Files:** Modify `index.html`; Create `app.js`, `styles.css`, `tests/ui.test.js`.
**Interfaces:** Verwendet die Datenfunktionen aus Task 1; sämtliche UI-Änderungen erhalten stabile IDs.
- [x] Verhaltenstests für Hinzufügen/Bearbeiten/Löschen, Auswahl und Fortschritt schreiben und scheitern sehen.
- [x] Moduswechsel, Mehrfachauswahl, Verwaltung und gefilterte Listen implementieren.
- [x] Würfeln und getrenntes Erledigen integrieren; Umbenennen erhält den Status.
- [x] Importvorschau mit Bestätigung, Export und sichtbare Speicherfehler integrieren.
- [x] Sicherstellen, dass Benutzereingaben ausschließlich als Text ausgegeben werden und Auswahländerungen während einer Animation keine veralteten Ergebnisse erzeugen.
- [x] Tests vollständig ausführen; manuell Desktop, schmale Ansicht und Tastaturfluss prüfen, soweit Browserzugriff verfügbar ist.

### Task 3: Dokumentation und Übergabe
**Files:** Modify `README.md`.
- [x] Anleitung für lokale Nutzung, Datenpflege, Migration, Export/Import und Speichergrenzen ergänzen.
- [x] Gesamte Tests ausführen und Diff auf unbeabsichtigte Änderungen prüfen.
- [x] Eine lokal nutzbare Ausgabe einschließlich sämtlicher Assets bereitstellen. Änderungen nicht ohne gesonderte Beauftragung nach GitHub pushen oder veröffentlichen.
