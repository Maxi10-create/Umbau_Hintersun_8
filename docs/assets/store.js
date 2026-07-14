/*
=========================================================
 Umbau Hintersun 8 – Store
 Zentrale Datenhaltung + CRUD gegen Google Sheets.
 - haelt DATA im Speicher
 - schreibt SOFORT ins Sheet (append/update/delete)
 - stempelt id / created_at / updated_at
 - loggt ins audit_log
 - benachrichtigt UI via onChange
=========================================================
*/
(function () {
  var A = window.HinterSunDataAdapter;

  // Primaerschluessel je Tab
  var ID_FIELDS = {
    parties: 'party_id', areas: 'unit', budget_estimates: 'estimate_id',
    cost_positions: 'cost_id', offers: 'offer_id', offer_items: 'offer_item_id',
    payments: 'payment_id', financing: 'finance_id', bank_offers: 'bank_offer_id',
    subsidies: 'subsidy_id', task_categories: 'category_id', timeline_tasks: 'task_id', trades: 'trade_id',
    companies: 'company_id', bureaucracy: 'bureau_id', technicians: 'tech_id',
    energy_inputs: 'input_id', energy_results: 'scenario', documents: 'document_id',
    decisions: 'decision_id', settings: 'key', audit_log: 'log_id'
  };

  var state = { data: {}, source: '', online: false, listeners: [], pending: {} };

  // Rows die (noch) nicht ins Backend geschrieben werden konnten, damit sie
  // bei einem erneuten load() nicht still verschwinden (z.B. Kategorien, wenn
  // das Backend den Tab noch nicht kennt / offline).
  function rememberPending(sheet, row) {
    if (!state.pending[sheet]) state.pending[sheet] = [];
    var f = idField(sheet);
    var i = state.pending[sheet].findIndex(function (x) { return String(x[f]) === String(row[f]); });
    if (i >= 0) state.pending[sheet][i] = row; else state.pending[sheet].push(row);
  }
  function clearPending(sheet, idVal) {
    if (!state.pending[sheet]) return;
    var f = idField(sheet);
    state.pending[sheet] = state.pending[sheet].filter(function (x) { return String(x[f]) !== String(idVal); });
  }
  function mergePending() {
    Object.keys(state.pending).forEach(function (sheet) {
      var f = idField(sheet);
      if (!Array.isArray(state.data[sheet])) state.data[sheet] = [];
      state.pending[sheet].forEach(function (row) {
        var exists = state.data[sheet].some(function (x) { return String(x[f]) === String(row[f]); });
        if (!exists) state.data[sheet].push(row);
      });
    });
  }

  function idField(sheet) { return ID_FIELDS[sheet] || 'id'; }
  function nowISO() { return new Date().toISOString(); }
  function today() { return new Date().toISOString().slice(0, 10); }

  function genId(sheet) {
    var pfx = String(sheet).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'ROW';
    var t = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pfx + '-' + t.getFullYear() + pad(t.getMonth() + 1) + pad(t.getDate()) +
           '-' + pad(t.getHours()) + pad(t.getMinutes()) + pad(t.getSeconds()) +
           '-' + Math.floor(Math.random() * 1000);
  }

  function table(sheet) {
    if (!Array.isArray(state.data[sheet])) state.data[sheet] = [];
    return state.data[sheet];
  }

  function onChange(fn) { state.listeners.push(fn); }
  function emit() { state.listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } }); }

  async function load() {
    var res = await A.loadData();
    state.data = res.data || {};
    state.source = res.source || '';
    state.online = !!res.online;
    // sicherstellen, dass alle bekannten Tabs Arrays sind
    Object.keys(ID_FIELDS).forEach(function (s) { if (!Array.isArray(state.data[s])) state.data[s] = []; });
    mergePending();
    emit();
    return state;
  }

  function toast(msg, kind) {
    var el = document.getElementById('toast');
    if (!el) { console.log('[toast]', msg); return; }
    el.textContent = msg;
    el.className = 'toast show ' + (kind || 'ok');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.className = 'toast'; }, 3200);
  }

  async function auditLocalOnly(action, sheet, rowId, details) {
    // Nur lokal spiegeln; das Backend schreibt sein eigenes audit_log serverseitig.
    table('audit_log').unshift({
      log_id: genId('audit_log'), timestamp: nowISO(), user: 'webapp',
      action: action, sheet: sheet, row_id: rowId || '', details: (details || '').slice(0, 300)
    });
  }

  function friendlyError(err, sheet) {
    var s = String(err || '');
    if (s.indexOf('Unknown sheet') >= 0 || s.indexOf('unknown sheet') >= 0) {
      return 'Tab "' + sheet + '" noch nicht im Backend (bitte Code.gs neu bereitstellen + Migration ausführen). Änderung lokal gespeichert.';
    }
    if (s.indexOf('WRITE_TOKEN') >= 0 || s.indexOf('writeToken') >= 0 || s.indexOf('403') >= 0) {
      return 'Schreibschutz: Write-Token fehlt in config.js. Lokal gespeichert.';
    }
    if (s.indexOf('NetworkError') >= 0 || s.indexOf('Failed to fetch') >= 0 || s.indexOf('TypeError') >= 0) {
      return 'Backend nicht erreichbar. Änderung lokal gespeichert.';
    }
    return 'Backend-Fehler: ' + s.slice(0, 80);
  }
  async function create(sheet, values) {
    var f = idField(sheet);
    var row = Object.assign({}, values);
    if (!row[f]) row[f] = genId(sheet);
    if (!row.created_at) row.created_at = nowISO();
    row.updated_at = nowISO();
    if (!row.source) row.source = 'Dashboard';
    table(sheet).push(row);
    await auditLocalOnly('append', sheet, row[f]);
    emit();
    if (A.hasBackend()) {
      var r = await A.appendRow(sheet, row);
      if (r && r.ok) { if (r.id) { row[f] = r.id; emit(); } clearPending(sheet, row[f]); toast('Gespeichert: ' + labelOf(sheet), 'ok'); }
      else {
        rememberPending(sheet, row);
        toast(friendlyError(r && r.error, sheet), 'warn');
      }
      return r;
    }
    rememberPending(sheet, row);
    toast('Lokal gespeichert (kein Backend)', 'warn');
    return { ok: true, offline: true, id: row[f] };
  }

  // ---- UPDATE -----------------------------------------------------------
  async function update(sheet, idValue, patch) {
    var f = idField(sheet);
    var arr = table(sheet);
    var rec = arr.find(function (x) { return String(x[f]) === String(idValue); });
    if (rec) { Object.assign(rec, patch); rec.updated_at = nowISO(); }
    await auditLocalOnly('updateById', sheet, idValue, JSON.stringify(patch));
    emit();
    if (A.hasBackend()) {
      var full = Object.assign({}, patch, { updated_at: nowISO() });
      var r = await A.updateById(sheet, f, idValue, full);
      if (r && r.ok) {
        clearPending(sheet, idValue);
        toast('Aktualisiert: ' + labelOf(sheet), 'ok');
      } else {
        var errMsg = friendlyError(r && r.error, sheet);
        // For unknown-sheet errors, remember the full updated row locally
        if (rec) rememberPending(sheet, rec);
        toast(errMsg, 'warn');
      }
      return r;
    }
    toast('Lokal aktualisiert (kein Backend)', 'warn');
    return { ok: true, offline: true };
  }

  // ---- DELETE -----------------------------------------------------------
  async function remove(sheet, idValue) {
    var f = idField(sheet);
    var arr = table(sheet);
    var i = arr.findIndex(function (x) { return String(x[f]) === String(idValue); });
    if (i >= 0) arr.splice(i, 1);
    await auditLocalOnly('deleteById', sheet, idValue);
    emit();
    if (A.hasBackend()) {
      var r = await A.deleteById(sheet, f, idValue);
      toast(r && r.ok ? 'Geloescht' : 'Loesch-Fehler: ' + (r && r.error), r && r.ok ? 'ok' : 'warn');
      return r;
    }
    toast('Lokal geloescht (kein Backend)', 'warn');
    return { ok: true, offline: true };
  }

  // ---- AUFTRAG ERTEILEN (Angebot -> aktive Kostenposition) --------------
  // Fachlogik: pro Vergleichsgruppe nur EIN aktiver Auftrag.
  async function awardOffer(offerId) {
    var offers = table('offers');
    var offer = offers.find(function (o) { return String(o.offer_id) === String(offerId); });
    if (!offer) return { ok: false, error: 'Angebot nicht gefunden' };

    var group = (offer.compare_group || offer.trade || '').trim();

    // 1) Bisherigen aktiven Auftrag derselben Gruppe deaktivieren
    var siblings = offers.filter(function (o) {
      return (String(o.compare_group || o.trade || '').trim() === group);
    });
    for (var i = 0; i < siblings.length; i++) {
      var s = siblings[i];
      if (String(s.offer_id) !== String(offerId) && String(s.status) === 'Auftrag erteilt') {
        await update('offers', s.offer_id, { status: 'Angebot erfasst', final: 'FALSE' });
        // zugehoerige aktive Kostenposition deaktivieren
        var oldCost = table('cost_positions').find(function (c) { return String(c.offer_id) === String(s.offer_id) && String(c.active).toUpperCase() !== 'FALSE'; });
        if (oldCost) await update('cost_positions', oldCost.cost_id, { active: 'FALSE', status: 'ersetzt' });
      }
    }

    // 2) Angebot auf Auftrag setzen
    await update('offers', offerId, { status: 'Auftrag erteilt', final: 'TRUE' });

    // 3) Aktive Kostenposition anlegen (oder reaktivieren)
    var existing = table('cost_positions').find(function (c) { return String(c.offer_id) === String(offerId); });
    if (existing) {
      await update('cost_positions', existing.cost_id, { active: 'TRUE', status: 'beauftragt', gross: offer.gross, net: offer.net });
      return { ok: true, cost_id: existing.cost_id, reactivated: true };
    }
    var cost = {
      category: group || offer.trade || 'Sonstiges',
      subcategory: '', item: (offer.trade || '') + ' – ' + (offer.supplier || ''),
      supplier: offer.supplier || '', status: 'beauftragt', source_type: 'Auftrag',
      net: offer.net || 0, vat_rate: offer.vat_rate || 22, gross: offer.gross || 0,
      party_assignment: offer.party_assignment || 'projekt',
      split_key: offer.split_key || '', share_w1: offer.share_w1 || '', share_w2: offer.share_w2 || '',
      offer_id: offerId, compare_group: group, active: 'TRUE',
      final: 'TRUE', paid: 'FALSE', document_id: offer.document_id || '', risk: offer.excluded || ''
    };
    var r = await create('cost_positions', cost);
    return { ok: true, cost_id: r && r.id, created: true };
  }

  var LABELS = {
    parties: 'Partei', areas: 'Einheit', budget_estimates: 'Kostenschätzung',
    cost_positions: 'Kostenposition', offers: 'Angebot', payments: 'Zahlung',
    financing: 'Finanzierung', bank_offers: 'Bankangebot', subsidies: 'Förderung',
    timeline_tasks: 'Aufgabe', task_categories: 'Kategorie', trades: 'Gewerk', companies: 'Firma',
    bureaucracy: 'Bürokratie', technicians: 'Techniker', energy_inputs: 'Energieparameter',
    energy_results: 'Szenario', documents: 'Dokument', decisions: 'Entscheidung'
  };
  function labelOf(sheet) { return LABELS[sheet] || sheet; }

  window.HinterSunStore = {
    state: state, load: load, onChange: onChange,
    table: table, idField: idField, labelOf: labelOf, today: today,
    create: create, update: update, remove: remove, awardOffer: awardOffer, toast: toast
  };
})();
