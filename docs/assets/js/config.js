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
    apiUrl: "https://script.google.com/macros/s/AKfycby18mAikh4V8KWL1e_DRRBxCDQAPtD3U6gifWZ3QK7fai-hCu7-azFko8Pzbkv-roAa/exec",

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
