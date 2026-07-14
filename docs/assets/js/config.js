/*
=========================================================
 Umbau Hintersun 8
 Dashboard Configuration
 -> Bestehende Web-App-URL bleibt unveraendert erhalten.
 -> Neu: writeToken (nur ausfuellen, wenn im Apps Script setApiToken() genutzt wird)
=========================================================
*/

window.UMB_HINTERSUN_CONFIG = {

    // ----------------------------------------------------
    // Google Apps Script Backend (UNVERAENDERT)
    // ----------------------------------------------------
    apiUrl: "https://script.google.com/macros/s/AKfycbyIAoBR1EkpcZtWCrDA05ZvBVtBD6C3O9rmoD93wM2yH_svSXCBjdf4b2mH7qNt2BEc/exec",

    // Schreibschutz-Token. Leer lassen, solange im Apps Script KEIN Token gesetzt wurde.
    // Falls setApiToken() im Backend ausgefuehrt wurde, hier den erzeugten Wert eintragen.
    writeToken: "",

    // Aktiviert Google Sheets Backend
    useGoogleBackend: true,

    // Projektname
    projectName: "Umbau Hintersun 8",

    // interner Projektschlüssel
    projectKey: "umbau-hintersun-8",

    // Debugmodus
    debug: false,

    // Standard-Sprache
    language: "de",

    // Datumsformat
    dateFormat: "dd.MM.yyyy",

    // Währung
    currency: "EUR",

    // Tausendtrennzeichen / Dezimalzeichen
    numberFormat: "de-DE",

    // Auto-Speichern
    autoSave: true,

    // Auto-Refresh (Sekunden)
    autoRefreshInterval: 30

};
