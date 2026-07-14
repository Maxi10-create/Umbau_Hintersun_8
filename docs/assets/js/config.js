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
    apiUrl: "https://script.google.com/macros/s/AKfycbyjLlO8HLsrPCK1Hm1bHC6lNhxYuWa2KWU2Itij7vSqDXLWKIi9QOqslkvF3N_Klr9F/exec",

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
