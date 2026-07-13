# Umbau Hintersun 8 – Schritt für Schritt

Komplettes, lauffähiges Paket. Du löschst auf GitHub den alten Stand und lädst diesen hoch. Die bestehende Web-App-URL bleibt erhalten – sie steht bereits in `docs/assets/js/config.js`.

**Reihenfolge unbedingt einhalten: erst Backend, dann Frontend.**

---

## Teil A – Backend (Google Apps Script + Sheet)

**A1. Code ersetzen**
Apps-Script-Projekt öffnen → gesamten Inhalt von `google-apps-script/Code.gs` markieren und löschen → kompletten neuen Inhalt aus diesem Paket (`google-apps-script/Code.gs`) einfügen → **Speichern** (Diskettensymbol).

**A2. Neu bereitstellen (gleiche URL behalten)**
Oben rechts **Bereitstellen → Bereitstellungen verwalten** → bei der bestehenden Web-App auf **✎ (Bearbeiten)** → unter *Version* **„Neue Version"** wählen → **Bereitstellen**.
→ Die URL ändert sich dabei **nicht**. (Nur wenn du eine *neue* Bereitstellung anlegst, ändert sie sich – das willst du nicht.)

**A3. Migration einmalig ausführen**
Das Google Sheet öffnen (Tabelle, an der das Skript hängt). Ggf. Seite neu laden, damit das Menü erscheint.
Menü **„Umbau H8 Backend" → „Migration: Schema aktualisieren (v2)"** anklicken → beim ersten Mal Zugriff **autorisieren** → laufen lassen.
Das legt den neuen Tab `budget_estimates` an, ergänzt neue Spalten (u. a. `compare_group`, `share_w1`, `share_w2`, `active`, `offer_id`, `is_blocker`, `created_at`, `updated_at`) und ordnet die Kopfzeilen. **Bestehende Daten bleiben erhalten**; mehrfaches Ausführen schadet nicht.

**A4. Kurztest**
Diese Adresse im Browser öffnen (deine URL + `?action=health`):
```
…/exec?action=health
```
Erwartung: `{"ok":true,"version":"2.0.0",…}`. Wenn Version **2.0.0** kommt, ist das Backend live.

---

## Teil B – Frontend (GitHub Pages)

> Ziel: alten Stand im Ordner `docs/` durch den neuen ersetzen. Die einfachste Variante:

**Variante 1 – im Browser (empfohlen, keine Tools nötig)**
1. Auf GitHub ins Repository → Ordner **`docs`** öffnen.
2. Alte Dateien löschen: pro Datei/Ordner → **⋯ / Papierkorb-Symbol → Commit**. (Mindestens `docs/index.html` und den Ordner `docs/assets/js/` müssen weg – am saubersten den ganzen `docs`-Inhalt.)
   Die Bilder in `docs/assets/img/` kannst du liegen lassen, wenn sie unverändert sind – dieses Paket enthält sie aber ebenfalls.
3. **Add file → Upload files** → aus diesem Paket den kompletten Inhalt von `docs/` per Drag-and-drop hochladen (inkl. Unterordner `assets/…`) → unten **Commit changes**.

**Variante 2 – mit Git (falls du lokal arbeitest)**
```
# im Repo-Ordner, alten docs-Stand ersetzen
rm -rf docs
cp -r /Pfad/zu/diesem/Paket/docs ./docs
git add -A
git commit -m "Dashboard v2: CRUD, Auftragslogik, Gantt, Energie, neues Design"
git push
```

**B1. Wichtig – Cache leeren**
Nach dem Push 1–2 Minuten warten (GitHub Pages baut), dann das Dashboard mit **Strg + Shift + R** (Hard Reload) öffnen. Sonst lädt der Browser evtl. noch die alte `config.js`.

**B2. Erfolgskontrolle**
Unten links im Dashboard steht die Datenquelle. Richtig ist:
> ● **Google Sheets Backend**

Steht dort „Fallback-Daten", ist entweder Teil A (Bereitstellung) offen oder der Browser-Cache alt → Hard Reload wiederholen, ansonsten Konsole (F12) prüfen:
```js
window.UMB_HINTERSUN_CONFIG.apiUrl      // muss die script.google.com-URL zeigen
window.HinterSunDataAdapter.loadData().then(console.log)   // online:true?
```

---

## Optionaler Schreibschutz (Token)

Ohne Token kann jeder mit der URL schreiben. Wenn du das absichern willst:
1. Backend-Menü **„API Token setzen"** → im Ausführungs-Log erscheint ein `WRITE_TOKEN`.
2. Diesen Wert in `docs/assets/js/config.js` bei `writeToken: ""` eintragen → committen.
Solange kein Token gesetzt ist, funktioniert alles ohne diesen Schritt.

---

## Was neu ist (Kurzüberblick)

- **Kritischer Bug behoben:** Die Backend-URL wurde vorher nie gelesen – deshalb kam nichts im Sheet an. Jetzt schreibt jede Aktion direkt ins Google Sheet.
- **Voll bearbeitbar:** Anlegen / Bearbeiten / Löschen für Angebote, Kostenpositionen, Schätzungen, Zahlungen, Finanzierung, Bankangebote, Förderungen, Aufgaben, Gewerke, Firmen, Entscheidungen, Energieparameter.
- **Angebot → Auftrag:** Angebote zählen erst nach „Auftrag erteilen". Pro Vergleichsgruppe bleibt genau ein aktiver Auftrag; ein Wechsel ersetzt den alten automatisch.
- **Prognose ohne Doppelzählung:** je Budgetblock = max(Schätzung, Auftrag, Rechnung, Zahlung).
- **W1/W2 frei aufteilbar:** Vorlagen 46,6/53,4 · 50/50 · 100/0 · 0/100, jede Position frei mit Live-Prüfung Σ = 100 %.
- **Echter Gantt-Zeitstrahl** mit setzbarem (vorläufigem) Baubeginn Sept 2026, Heute-Marker, kritischem Pfad und Blockern.
- **Energie-Engine** rechnet live aus den Parametern. Hinweis: vereinfachtes Monatsmodell (kein Stundenprofil) – belastbarer Richtwert, kein Ingenieurgutachten.
