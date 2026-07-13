/*
=========================================================
 Umbau Hintersun 8 – Data Adapter (robust)
 - Liest die Backend-URL aus BEIDEN Config-Schreibweisen:
     window.UMB_HINTERSUN_CONFIG.apiUrl        (bestehende config.js)
     window.HINTERSUN_CONFIG.GAS_WEBAPP_URL    (Template-Schreibweise)
 - Bestehende config.js / Web-App-URL bleiben unveraendert nutzbar.
=========================================================
*/
(function () {
  function cfg() {
    return window.UMB_HINTERSUN_CONFIG || window.HINTERSUN_CONFIG || {};
  }
  function endpoint() {
    var c = cfg();
    return String(c.apiUrl || c.GAS_WEBAPP_URL || '').trim();
  }
  function token() {
    var c = cfg();
    return String(c.writeToken || c.WRITE_TOKEN || '').trim();
  }
  function fallback() {
    return window.HINTERSUN_SAMPLE_DATA ||
           (window.UMB_HINTERSUN_SAMPLE_DATA) || {};
  }

  async function loadData() {
    var ep = endpoint();
    if (ep) {
      try {
        var url = ep + (ep.includes('?') ? '&' : '?') + 'action=readAll&ts=' + Date.now();
        var res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Backend HTTP ' + res.status);
        var json = await res.json();
        if (json && json.ok && json.data) {
          return { data: json.data, source: 'Google Sheets Backend', online: true };
        }
        throw new Error(json && json.error ? json.error : 'ungueltige Backend-Antwort');
      } catch (err) {
        console.warn('[H8] Backend nicht erreichbar, Fallback aktiv:', err);
        return { data: fallback(), source: 'Fallback-Daten (Backend-Fehler)', online: false, error: String(err) };
      }
    }
    return { data: fallback(), source: 'Fallback-Daten (keine URL)', online: false };
  }

  async function post(payload) {
    var ep = endpoint();
    if (!ep) return { ok: false, error: 'Keine Backend-URL in config.js gesetzt (apiUrl).' };
    payload.token = token();
    try {
      var res = await fetch(ep, {
        method: 'POST',
        // text/plain vermeidet CORS-Preflight bei Apps Script
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return { ok: false, error: 'HTTP ' + res.status };
      return await res.json();
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  window.HinterSunDataAdapter = {
    loadData: loadData,
    hasBackend: function () { return !!endpoint(); },
    appendRow: function (sheet, row) { return post({ action: 'append', sheet: sheet, data: row }); },
    updateById: function (sheet, idField, idValue, patch) { return post({ action: 'updateById', sheet: sheet, idField: idField, idValue: idValue, data: patch }); },
    upsertRow: function (sheet, idField, idValue, row) { return post({ action: 'upsert', sheet: sheet, idField: idField, idValue: idValue, data: row }); },
    deleteById: function (sheet, idField, idValue) { return post({ action: 'deleteById', sheet: sheet, idField: idField, idValue: idValue }); },
    awardOffer: function (offerId) { return post({ action: 'awardOffer', offerId: offerId }); },
    raw: post
  };
})();
