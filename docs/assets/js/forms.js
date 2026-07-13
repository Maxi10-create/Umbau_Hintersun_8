/*
=========================================================
 Umbau Hintersun 8 – Forms
 Schema-getriebene Modal-/Drawer-Formulare fuer CRUD.
 Ein Formular fuer alle Entitaeten -> mobil bedienbar.
=========================================================
*/
(function () {
  var S = window.HinterSunStore;

  var STATUS = ['nicht gestartet','Anfrage vorbereitet','Anfrage gesendet','Angebot erfasst',
    'Rückfrage offen','Entscheidung nötig','Auftrag erteilt','in Arbeit','wartet auf Dritte',
    'blockiert','erledigt','Rechnung erhalten','bezahlt','verworfen'];
  var PRIO = ['kritisch','hoch','mittel','niedrig'];
  var PARTY = ['W1','W2','gemeinsam','projekt'];
  var BOOL = ['TRUE','FALSE'];
  var SOURCETYPE = ['Grobkostenschätzung','Detailkostenschätzung','Angebot','Auftrag','Rechnung','Zahlung','Ist','Prognose'];

  // Feld-Definitionen je Tab. type: text|number|date|select|textarea|bool|split
  var SCHEMAS = {
    offers: { title: 'Angebot', fields: [
      { k: 'trade', l: 'Gewerk', t: 'text', req: true },
      { k: 'compare_group', l: 'Vergleichsgruppe', t: 'text', hint: 'z.B. "Küche" – mehrere Angebote derselben Gruppe werden verglichen, nicht doppelt gezählt' },
      { k: 'supplier', l: 'Anbieter / Firma', t: 'text', req: true },
      { k: 'date', l: 'Datum', t: 'date' },
      { k: 'valid_until', l: 'Gültig bis', t: 'date' },
      { k: 'net', l: 'Netto €', t: 'number' },
      { k: 'vat_rate', l: 'MwSt %', t: 'number', def: 22 },
      { k: 'gross', l: 'Brutto € (leer = auto)', t: 'number' },
      { k: 'status', l: 'Status', t: 'select', opt: STATUS, def: 'Angebot erfasst' },
      { k: 'party_assignment', l: 'Zuordnung', t: 'select', opt: PARTY },
      { k: 'split', l: 'Aufteilung W1/W2', t: 'split' },
      { k: 'score', l: 'Bewertung', t: 'text' },
      { k: 'excluded', l: 'Nicht enthalten / Risiko', t: 'textarea' },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]},
    cost_positions: { title: 'Kostenposition', fields: [
      { k: 'category', l: 'Budgetblock / Kategorie', t: 'text', req: true },
      { k: 'subcategory', l: 'Unterkategorie', t: 'text' },
      { k: 'item', l: 'Position', t: 'text', req: true },
      { k: 'supplier', l: 'Firma', t: 'text' },
      { k: 'source_type', l: 'Kostenart', t: 'select', opt: SOURCETYPE, def: 'Detailkostenschätzung' },
      { k: 'status', l: 'Status', t: 'select', opt: STATUS },
      { k: 'net', l: 'Netto €', t: 'number' },
      { k: 'vat_rate', l: 'MwSt %', t: 'number', def: 22 },
      { k: 'gross', l: 'Brutto € (leer = auto)', t: 'number' },
      { k: 'party_assignment', l: 'Zuordnung', t: 'select', opt: PARTY },
      { k: 'split', l: 'Aufteilung W1/W2', t: 'split' },
      { k: 'active', l: 'Aktiv (zählt zur Prognose)', t: 'bool', def: 'TRUE' },
      { k: 'final', l: 'Final', t: 'bool', def: 'FALSE' },
      { k: 'paid', l: 'Bezahlt', t: 'bool', def: 'FALSE' },
      { k: 'risk', l: 'Risiko / Hinweis', t: 'textarea' }
    ]},
    budget_estimates: { title: 'Kostenschätzung (Version)', fields: [
      { k: 'version', l: 'Version', t: 'text', req: true, hint: 'z.B. v1 Grob, v2 Detail' },
      { k: 'estimate_type', l: 'Art', t: 'select', opt: ['Grobkostenschätzung','Detailkostenschätzung'], def: 'Grobkostenschätzung' },
      { k: 'budget_block', l: 'Budgetblock', t: 'text', req: true },
      { k: 'amount_gross', l: 'Betrag brutto €', t: 'number', req: true },
      { k: 'is_baseline', l: 'Baseline (unveränderlich)', t: 'bool', def: 'FALSE' },
      { k: 'active', l: 'Aktive Version', t: 'bool', def: 'TRUE' },
      { k: 'split', l: 'Aufteilung W1/W2', t: 'split' },
      { k: 'date', l: 'Datum', t: 'date' },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]},
    payments: { title: 'Zahlung', fields: [
      { k: 'date', l: 'Datum', t: 'date', req: true },
      { k: 'supplier', l: 'Empfänger', t: 'text', req: true },
      { k: 'amount_gross', l: 'Betrag brutto €', t: 'number', req: true },
      { k: 'paid_by', l: 'Bezahlt von', t: 'select', opt: PARTY },
      { k: 'related_cost_id', l: 'Kostenposition-ID', t: 'text' },
      { k: 'status', l: 'Status', t: 'select', opt: ['geplant','angewiesen','bezahlt'], def: 'bezahlt' },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]},
    financing: { title: 'Finanzierungsbaustein', fields: [
      { k: 'party', l: 'Partei', t: 'select', opt: PARTY },
      { k: 'type', l: 'Typ', t: 'select', opt: ['Eigenkapital','Landesförderung','Zinsbegünstigtes Darlehen','Bankkredit','Zwischenfinanzierung','Kreditkarte','Förderungsrückfluss'] },
      { k: 'amount', l: 'Betrag €', t: 'number', req: true },
      { k: 'interest_rate', l: 'Zinssatz %', t: 'number' },
      { k: 'term_years', l: 'Laufzeit Jahre', t: 'number' },
      { k: 'status', l: 'Status', t: 'select', opt: ['geplant','angefragt','Angebot erhalten','zugesagt','ausgezahlt'] },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]},
    bank_offers: { title: 'Bankangebot', fields: [
      { k: 'bank', l: 'Bank', t: 'text', req: true },
      { k: 'contact', l: 'Ansprechpartner', t: 'text' },
      { k: 'date', l: 'Datum', t: 'date' },
      { k: 'party', l: 'Partei', t: 'select', opt: PARTY },
      { k: 'amount', l: 'Betrag €', t: 'number' },
      { k: 'interest_type', l: 'Zinsart', t: 'select', opt: ['fix','variabel'] },
      { k: 'interest_rate', l: 'Zinssatz %', t: 'number' },
      { k: 'term_years', l: 'Laufzeit Jahre', t: 'number' },
      { k: 'monthly_rate', l: 'Monatsrate € (leer=auto)', t: 'number' },
      { k: 'status', l: 'Status', t: 'select', opt: ['geplant','angefragt','Angebot erhalten','zugesagt','ausgezahlt'] },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]},
    subsidies: { title: 'Förderung', fields: [
      { k: 'program', l: 'Programm', t: 'text', req: true },
      { k: 'party', l: 'Partei', t: 'select', opt: PARTY },
      { k: 'expected_amount', l: 'Erwartet €', t: 'number' },
      { k: 'confirmed_amount', l: 'Zugesagt €', t: 'number' },
      { k: 'status', l: 'Status', t: 'select', opt: ['geplant','angefragt','Angebot erhalten','zugesagt','ausgezahlt'] },
      { k: 'deadline', l: 'Frist', t: 'date' },
      { k: 'requirements', l: 'Voraussetzungen', t: 'textarea' },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]},
    timeline_tasks: { title: 'Aufgabe', fields: [
      { k: 'phase', l: 'Phase', t: 'text' },
      { k: 'workstream', l: 'Workstream', t: 'text' },
      { k: 'task', l: 'Aufgabe', t: 'text', req: true },
      { k: 'owner', l: 'Verantwortlich', t: 'text' },
      { k: 'start_date', l: 'Start', t: 'date' },
      { k: 'due_date', l: 'Ende / Deadline', t: 'date' },
      { k: 'status', l: 'Status', t: 'select', opt: STATUS },
      { k: 'priority', l: 'Priorität', t: 'select', opt: PRIO },
      { k: 'progress_weight', l: 'Gewicht', t: 'number', def: 1 },
      { k: 'depends_on', l: 'Hängt ab von (Task-ID)', t: 'text' },
      { k: 'blocks', l: 'Blockiert', t: 'text' },
      { k: 'is_blocker', l: 'Blocker', t: 'bool', def: 'FALSE' },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]},
    trades: { title: 'Gewerk', fields: [
      { k: 'trade', l: 'Gewerk', t: 'text', req: true },
      { k: 'priority', l: 'Priorität', t: 'select', opt: PRIO },
      { k: 'owner', l: 'Verantwortlich', t: 'text' },
      { k: 'target_request', l: 'Ziel Anfrage', t: 'date' },
      { k: 'target_award', l: 'Ziel Vergabe', t: 'date' },
      { k: 'status', l: 'Status', t: 'select', opt: STATUS },
      { k: 'blocks_construction_start', l: 'Blockiert Baustart', t: 'bool', def: 'FALSE' },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]},
    companies: { title: 'Firma', fields: [
      { k: 'trade_id', l: 'Gewerk-ID', t: 'text' },
      { k: 'company', l: 'Firma', t: 'text', req: true },
      { k: 'contact', l: 'Kontakt', t: 'text' },
      { k: 'status', l: 'Status', t: 'select', opt: STATUS },
      { k: 'offer_id', l: 'Angebot-ID', t: 'text' },
      { k: 'final', l: 'Final', t: 'bool', def: 'FALSE' },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]},
    decisions: { title: 'Entscheidung', fields: [
      { k: 'area', l: 'Bereich', t: 'text', req: true },
      { k: 'decision', l: 'Entscheidung', t: 'text', req: true },
      { k: 'options', l: 'Optionen', t: 'textarea' },
      { k: 'recommendation', l: 'Empfehlung', t: 'textarea' },
      { k: 'status', l: 'Status', t: 'select', opt: STATUS },
      { k: 'priority', l: 'Priorität', t: 'select', opt: PRIO },
      { k: 'deadline', l: 'Deadline', t: 'date' },
      { k: 'cost_impact', l: 'Kostenwirkung €', t: 'number' },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]},
    energy_inputs: { title: 'Energieparameter', fields: [
      { k: 'module', l: 'Modul', t: 'select', opt: ['PV','WP','Batterie','Pellet','Haushalt','EV','Klima','Preise','System'] },
      { k: 'name', l: 'Bezeichnung', t: 'text', req: true },
      { k: 'value', l: 'Wert', t: 'text', req: true },
      { k: 'unit', l: 'Einheit', t: 'text' },
      { k: 'editable', l: 'Editierbar', t: 'bool', def: 'TRUE' },
      { k: 'comment', l: 'Notiz', t: 'textarea' }
    ]}
  };

  var SPLIT_TEMPLATES = [
    { l: '46,6 / 53,4', w1: 46.6, w2: 53.4 },
    { l: '50 / 50', w1: 50, w2: 50 },
    { l: '100 / 0', w1: 100, w2: 0 },
    { l: '0 / 100', w1: 0, w2: 100 }
  ];

  function esc(v) { return String(v == null ? '' : v).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function fieldHTML(f, rec) {
    var v = rec ? rec[f.k] : (f.def != null ? f.def : '');
    var hint = f.hint ? '<span class="fhint">' + esc(f.hint) + '</span>' : '';
    if (f.t === 'split') {
      var w1 = rec && rec.share_w1 !== '' && rec.share_w1 != null ? rec.share_w1 : 46.6;
      var w2 = rec && rec.share_w2 !== '' && rec.share_w2 != null ? rec.share_w2 : 53.4;
      var tpl = SPLIT_TEMPLATES.map(function (t) {
        return '<button type="button" class="chip" data-w1="' + t.w1 + '" data-w2="' + t.w2 + '">' + t.l + '</button>';
      }).join('');
      return '<div class="field span2"><label>' + esc(f.l) + '</label>' +
        '<div class="split-templates">' + tpl + '</div>' +
        '<div class="split-inputs"><span>W1 %</span><input type="number" step="0.1" name="share_w1" value="' + esc(w1) + '">' +
        '<span>W2 %</span><input type="number" step="0.1" name="share_w2" value="' + esc(w2) + '">' +
        '<span class="split-sum" id="split-sum">Σ –</span></div>' + hint + '</div>';
    }
    if (f.t === 'select') {
      var opts = (f.opt || []).map(function (o) { return '<option ' + (String(v) === String(o) ? 'selected' : '') + '>' + esc(o) + '</option>'; }).join('');
      return '<div class="field"><label>' + esc(f.l) + '</label><select name="' + f.k + '"><option value=""></option>' + opts + '</select>' + hint + '</div>';
    }
    if (f.t === 'bool') {
      var b = (v === '' || v == null) ? f.def : v;
      return '<div class="field"><label>' + esc(f.l) + '</label><select name="' + f.k + '">' +
        BOOL.map(function (o) { return '<option ' + (String(b) === o ? 'selected' : '') + '>' + o + '</option>'; }).join('') +
        '</select>' + hint + '</div>';
    }
    if (f.t === 'textarea') {
      return '<div class="field span2"><label>' + esc(f.l) + '</label><textarea name="' + f.k + '" rows="2">' + esc(v) + '</textarea>' + hint + '</div>';
    }
    var type = f.t === 'number' ? 'number' : (f.t === 'date' ? 'date' : 'text');
    var step = f.t === 'number' ? ' step="any"' : '';
    return '<div class="field"><label>' + esc(f.l) + (f.req ? ' *' : '') + '</label><input type="' + type + '"' + step + ' name="' + f.k + '" value="' + esc(v) + '">' + hint + '</div>';
  }

  function open(sheet, idValue) {
    var def = SCHEMAS[sheet];
    if (!def) { S.toast('Kein Formular für ' + sheet, 'warn'); return; }
    var rec = null;
    if (idValue != null) {
      var f = S.idField(sheet);
      rec = S.table(sheet).find(function (x) { return String(x[f]) === String(idValue); });
    }
    var body = def.fields.map(function (fl) { return fieldHTML(fl, rec); }).join('');
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<div class="modal-head"><h3>' + (rec ? 'Bearbeiten: ' : 'Neu: ') + esc(def.title) + '</h3>' +
          '<button class="icon-btn" data-close>✕</button></div>' +
        '<form class="modal-body">' + body + '</form>' +
        '<div class="modal-foot">' +
          (rec ? '<button class="btn danger-btn" data-del>Löschen</button>' : '<span></span>') +
          '<div class="split"><button class="btn secondary" data-close>Abbrechen</button>' +
          '<button class="btn" data-save>Speichern</button></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var form = overlay.querySelector('form');
    function recalcSum() {
      var w1 = form.querySelector('[name=share_w1]'), w2 = form.querySelector('[name=share_w2]'), sum = overlay.querySelector('#split-sum');
      if (!w1 || !sum) return;
      var s = (parseFloat(w1.value) || 0) + (parseFloat(w2.value) || 0);
      sum.textContent = 'Σ ' + s.toFixed(1) + '%';
      sum.className = 'split-sum ' + (Math.abs(s - 100) < 0.05 ? 'ok' : 'bad');
    }
    overlay.querySelectorAll('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        form.querySelector('[name=share_w1]').value = c.dataset.w1;
        form.querySelector('[name=share_w2]').value = c.dataset.w2;
        recalcSum();
      });
    });
    overlay.querySelectorAll('[name=share_w1],[name=share_w2]').forEach(function (i) { i.addEventListener('input', recalcSum); });
    recalcSum();

    function close() { overlay.remove(); }
    overlay.addEventListener('click', function (e) { if (e.target === overlay || e.target.hasAttribute('data-close')) close(); });

    overlay.querySelector('[data-save]').addEventListener('click', async function () {
      var values = {};
      def.fields.forEach(function (fl) {
        if (fl.t === 'split') return;
        var el = form.querySelector('[name=' + fl.k + ']');
        if (el) values[fl.k] = el.value;
      });
      var w1el = form.querySelector('[name=share_w1]');
      if (w1el) {
        var w1 = parseFloat(w1el.value) || 0, w2 = parseFloat(form.querySelector('[name=share_w2]').value) || 0;
        if (Math.abs(w1 + w2 - 100) > 0.05) { S.toast('Aufteilung W1+W2 muss 100% ergeben (aktuell ' + (w1 + w2).toFixed(1) + '%)', 'warn'); return; }
        values.share_w1 = w1; values.share_w2 = w2;
      }
      // Brutto automatisch aus Netto+MwSt, falls leer
      if ((values.gross === '' || values.gross == null) && values.net) {
        values.gross = (parseFloat(values.net) * (1 + (parseFloat(values.vat_rate) || 0) / 100)).toFixed(2);
      }
      // Pflichtfelder
      var missing = def.fields.filter(function (fl) { return fl.req && !String(values[fl.k] || '').trim(); });
      if (missing.length) { S.toast('Pflichtfeld fehlt: ' + missing[0].l, 'warn'); return; }

      var btn = overlay.querySelector('[data-save]'); btn.disabled = true; btn.textContent = 'Speichern…';
      if (rec) await S.update(sheet, idValue, values);
      else await S.create(sheet, values);
      close();
    });

    var delBtn = overlay.querySelector('[data-del]');
    if (delBtn) delBtn.addEventListener('click', async function () {
      if (!confirm('Diesen Eintrag wirklich löschen?')) return;
      await S.remove(sheet, idValue);
      close();
    });
  }

  window.HinterSunForms = { open: open, SCHEMAS: SCHEMAS };
})();
