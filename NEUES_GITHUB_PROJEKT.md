# Neues GitHub-Projekt komplett neu aufsetzen

Du legst ein frisches Repository an, lädst dieses Paket hoch und schaltest GitHub Pages ein. Das Backend (Google) bleibt bestehen – nur die Website wird neu gehostet.

**Wichtig vorab:** Wenn der neue Repo-Name **gleich** heißt wie der alte, bleibt auch die Adresse gleich (`https://<dein-name>.github.io/<repo-name>/`). Nur dann musst du an der Web-App-URL in `config.js` nichts ändern. Empfehlung: **gleicher Name wie bisher** (z. B. `umbau-hintersun-8`).

---

## Schritt 1 – Altes Repo entfernen (optional)
Falls das alte noch existiert und den Namen belegt:
Repo öffnen → **Settings** → ganz unten **Danger Zone** → **Delete this repository** → Repo-Namen zur Bestätigung eintippen.
(Erst löschen, dann das neue mit demselben Namen anlegen – sonst ist der Name blockiert.)

## Schritt 2 – Neues Repository anlegen
1. Oben rechts auf **+** → **New repository**.
2. **Repository name:** `umbau-hintersun-8` (oder dein Wunschname).
3. **Public** wählen (GitHub Pages braucht bei kostenlosen Konten öffentlich).
4. Haken bei **„Add a README file"** setzen (damit das Repo nicht leer ist).
5. **Create repository**.

## Schritt 3 – Dateien hochladen
1. Im neuen Repo: **Add file → Upload files**.
2. Aus diesem Paket den **gesamten Inhalt** hineinziehen – am einfachsten den entpackten Ordner öffnen und alles markieren (`docs/`, `google-apps-script/`, `google-sheets/`, `data/`, `README.md`, die Anleitungen, `manifest.json`, `LICENSE`).
   - GitHub übernimmt Unterordner beim Drag-and-drop automatisch.
   - Wichtig ist vor allem der Ordner **`docs/`** – der wird zur Website.
3. Unten **Commit changes**.

> Die vorhandene README aus Schritt 2 wird dabei durch die aus dem Paket ersetzt – das ist gewollt.

## Schritt 4 – GitHub Pages einschalten
1. Im Repo: **Settings → Pages** (linke Leiste).
2. Unter **Build and deployment → Source:** „Deploy from a branch".
3. **Branch:** `main` auswählen, **Ordner:** `/docs` → **Save**.
4. 1–2 Minuten warten. Oben auf der Pages-Seite erscheint dann der Link:
   `https://<dein-name>.github.io/umbau-hintersun-8/`

## Schritt 5 – Prüfen
Den Pages-Link mit **Strg + Shift + R** öffnen. Unten links im Dashboard muss stehen:
> ● **Google Sheets Backend**

Steht dort „Fallback-Daten", ist meist das Backend noch nicht neu bereitgestellt (siehe unten) oder der Cache alt → Hard Reload wiederholen.

---

## Backend nicht vergessen (einmalig)
Das Google-Backend ist unabhängig vom GitHub-Repo, muss aber auf den neuen Code:
1. Apps Script: Inhalt von `google-apps-script/Code.gs` ersetzen → **Speichern**.
2. **Bereitstellen → Bereitstellungen verwalten → ✎ → Version: „Neue Version" → Bereitstellen** (die Web-App-URL bleibt gleich).
3. Im Sheet-Menü **„Umbau H8 Backend → Migration: Schema aktualisieren (v2)"** einmal ausführen.
4. Test: `…/exec?action=health` muss `"version":"2.0.0"` liefern.

Ausführliche Fassung: siehe `SCHRITT_FUER_SCHRITT.md`.

---

## Falls der neue Name doch abweicht
Ändert sich der Repo-Name, ändert sich nur die **Website-Adresse**, nicht die Google-Backend-URL. Die Backend-URL in `docs/assets/js/config.js` (`apiUrl:`) bleibt also unverändert – dort ist nichts anzupassen. Du musst dir nur den neuen Pages-Link merken.
