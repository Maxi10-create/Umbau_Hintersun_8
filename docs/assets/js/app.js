/*
=========================================================
 Umbau Hintersun 8 – App (Wiring & Rendering)
=========================================================
*/
(function () {
  var S = window.HinterSunStore;
  var F = window.HinterSunForms;
  var G = window.HinterSunGantt;
  var C = window.HinterSunCalc;
  var Charts = window.HinterSunCharts;

  function byId(id) { return document.getElementById(id); }
  function qsa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(v) { return String(v == null ? '' : v).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); }
  function tag(status) {
    var s = String(status || '').toLowerCase(); var cls = 'blue';
    if (s.indexOf('erledigt') >= 0 || s.indexOf('bezahlt') >= 0 || s.indexOf('beauftragt') >= 0 || s.indexOf('zugesagt') >= 0 || s.indexOf('auftrag erteilt') >= 0) cls = 'ok';
    else if (s.indexOf('kritisch') >= 0 || s.indexOf('blockiert') >= 0 || s.indexOf('gefährdet') >= 0 || s.indexOf('verworfen') >= 0) cls = 'danger';
    else if (s.indexOf('offen') >= 0 || s.indexOf('wartet') >= 0 || s.indexOf('angebot') >= 0 || s.indexOf('nötig') >= 0 || s.indexOf('rückfrage') >= 0) cls = 'warn';
    return '<span class="tag ' + cls + '">' + esc(status) + '</span>';
  }
  function eur(v) { return C.euro(v); }

  var DATA;
  var energyOverrides = {};

  // ---- generischer Tabellen-Renderer mit Aktionen ----------------------
  function section(containerId, sheet, cols, opts) {
    opts = opts || {};
    var el = byId(containerId); if (!el) return;
    var rows = (DATA[sheet] || []).slice();
    if (opts.filter) rows = rows.filter(opts.filter);
    if (opts.sort) rows.sort(opts.sort);
    var idf = S.idField(sheet);
    var head = cols.map(function (c) { return '<th>' + esc(c.h) + '</th>'; }).join('') + '<th class="actions-col"></th>';
    var body = rows.map(function (r) {
      var tds = cols.map(function (c) { return '<td>' + (c.get(r) == null ? '' : c.get(r)) + '</td>'; }).join('');
      var extra = opts.rowActions ? opts.rowActions(r) : '';
      var actions = '<td class="actions">' + extra +
        '<button class="icon-btn" title="Bearbeiten" data-edit="' + esc(r[idf]) + '">✎</button>' +
        '<button class="icon-btn danger" title="Löschen" data-del="' + esc(r[idf]) + '">🗑</button></td>';
      return '<tr>' + tds + actions + '</tr>';
    }).join('');
    var addBtn = opts.noAdd ? '' : '<button class="btn small" data-add>+ ' + esc(S.labelOf(sheet)) + '</button>';
    el.innerHTML =
      '<div class="section-tools">' + (opts.note ? '<span class="mini muted">' + opts.note + '</span>' : '<span></span>') + addBtn + '</div>' +
      '<div class="table-wrap"><table><thead><tr>' + head + '</tr></thead><tbody>' +
      (body || '<tr><td colspan="' + (cols.length + 1) + '" class="muted">Keine Einträge – oben hinzufügen.</td></tr>') +
      '</tbody></table></div>';
    var add = el.querySelector('[data-add]'); if (add) add.addEventListener('click', function () { F.open(sheet); });
    el.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { F.open(sheet, b.getAttribute('data-edit')); }); });
    el.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', async function () { if (confirm('Eintrag löschen?')) await S.remove(sheet, b.getAttribute('data-del')); }); });
    if (opts.wire) opts.wire(el);
  }

  // ---- KPIs & Übersicht -------------------------------------------------
  function renderOverview() {
    var prog = C.calcProgress(DATA), costs = C.calcCosts(DATA), fin = C.calcFinancing(DATA), en = C.calcEnergy(DATA), s = C.settingsObj(DATA);
    var ampel = C.calcAmpel(DATA);
    byId('source-pill').innerHTML = '<span class="status-dot ' + (S.state.online ? 'on' : '') + '"></span>' + esc(S.state.source);
    byId('kpi-progress').textContent = C.pct(prog.taskProgress);
    byId('kpi-progress-sub').textContent = 'Zeit bis Erstbezug ' + C.pct(prog.timeToOcc) + ' · ' + prog.risk;
    byId('kpi-cost').textContent = eur(costs.forecast);
    byId('kpi-cost-sub').innerHTML = 'W1 ' + eur(costs.w1) + ' · W2 ' + eur(costs.w2);
    byId('kpi-finance').textContent = eur(fin.gap);
    byId('kpi-finance-sub').textContent = 'Rate ~' + eur(fin.totalRate) + '/Monat';
    byId('kpi-energy').textContent = C.pct(en.autarky);
    byId('kpi-energy-sub').textContent = 'PV ' + en.maxKwp.toFixed(1) + ' kWp · Batterie ' + en.batteryRecommendation;

    // Mehrdimensionale Projektampel
    function lampCls(l) { return l === 'gruen' ? 'ok' : l === 'gelb' ? 'warn' : 'danger'; }
    function lamp(title, a) {
      return '<div class="ampel-item ' + lampCls(a.level) + '">' +
        '<span class="ampel-light"></span>' +
        '<div class="ampel-text"><strong>' + esc(title) + '</strong><span class="ampel-label">' + esc(a.label) + '</span>' +
        '<span class="ampel-detail">' + esc(a.detail) + '</span></div></div>';
    }
    byId('overview-summary').innerHTML =
      '<div class="ampel-head"><span class="ampel-overall ' + lampCls(ampel.overall) + '">' +
        (ampel.overall === 'gruen' ? 'Gesamt: auf Kurs' : ampel.overall === 'gelb' ? 'Gesamt: Achtung' : 'Gesamt: kritisch') +
      '</span><span class="tag blue">' + prog.daysToBuild + ' Tage bis Baubeginn</span>' +
      '<span class="tag blue">' + prog.daysToOcc + ' Tage bis Erstbezug</span></div>' +
      '<div class="ampel-grid">' +
        lamp('Zeit', ampel.zeit) + lamp('Kosten', ampel.kosten) +
        lamp('Bürokratie', ampel.buero) + lamp('Vergabe', ampel.vergabe) +
      '</div>' +
      '<div class="hr"></div><div class="progress ' + (prog.diff < 0 ? 'warn' : '') + '"><span style="width:' + Math.round(prog.taskProgress) + '%"></span></div>' +
      '<p class="mini muted">Aufgabenfortschritt ' + C.pct(prog.taskProgress) + ' vs. Zeitfortschritt ' + C.pct(prog.timeToOcc) + '. Jede Ampel hat ein eigenes, nachvollziehbares Kriterium (kein Sammelwert).</p>';

    var next = (DATA.timeline_tasks || []).filter(function (t) { return String(t.status).toLowerCase().indexOf('erledigt') < 0; })
      .sort(function (a, b) { return prio(b.priority) - prio(a.priority) || String(a.due_date).localeCompare(String(b.due_date)); }).slice(0, 6);
    byId('overview-next').innerHTML = next.map(function (t) { return '<div class="task" data-open="' + esc(t.task_id) + '"><strong>' + esc(t.task) + '</strong><small>' + esc(t.phase) + ' · ' + tag(t.status) + ' · ' + esc(t.priority) + '</small></div>'; }).join('') || '<p class="muted">Keine offenen Aufgaben.</p>';
    byId('overview-next').querySelectorAll('[data-open]').forEach(function (n) { n.addEventListener('click', function () { F.open('timeline_tasks', n.getAttribute('data-open')); }); });
  }
  function prio(p) { return { kritisch: 4, hoch: 3, mittel: 2, niedrig: 1 }[String(p).toLowerCase()] || 0; }

  // ---- Projekt & Parteien ----------------------------------------------
  function renderProject() {
    section('party-table', 'areas', [
      { h: 'Einheit', get: function (r) { return esc(r.unit); } },
      { h: 'Partei', get: function (r) { return esc(r.party); } },
      { h: 'Wohnfläche', get: function (r) { return esc(r.real_area_m2) + ' m²'; } },
      { h: 'virt. Fläche', get: function (r) { return esc(r.virtual_area_m2); } },
      { h: 'Tausendstel', get: function (r) { return '<strong>' + esc(r.thousandths) + '/1000</strong>'; } },
      { h: 'Notiz', get: function (r) { return esc(r.notes); } }
    ], { note: 'Standard-Aufteilung W1/W2: 46,6 / 53,4 (frei editierbar je Position).' });
  }

  // ---- Kosten & Finanzierung -------------------------------------------
  // ==== KOSTENSCHÄTZUNG (Tab estimate) =================================
  function renderEstimate() {
    var costs = C.calcCosts(DATA);
    var b = costs.budget;
    byId('estimate-summary').innerHTML =
      '<div class="grid auto">' +
      card('Grobschätzung (Baseline)', eur(b.totals.baseline), 'W1 ' + eur(b.totals.baselineW1) + ' · W2 ' + eur(b.totals.baselineW2)) +
      card('Aktuelle Prognose', eur(b.totals.forecast), 'Baseline + Ist-Abgleich') +
      cardSplit('Prognose W1 / Ingrid', eur(b.totals.forecastW1), 'Prognose W2 / Maximilian', eur(b.totals.forecastW2)) +
      card('Δ zur Baseline', (b.totals.varianceToBaseline > 0 ? '+' : '') + eur(b.totals.varianceToBaseline), 'Prognose − Grobschätzung', b.totals.varianceToBaseline > 1 ? 'danger' : 'ok') +
      '</div>';

    var blockRows = b.rows.map(function (r) {
      var varc = r.varianceToBaseline, varCls = varc > 1 ? 'neg' : varc < -1 ? 'pos' : '';
      return '<tr>' +
        '<td><strong>' + esc(r.block) + '</strong>' + (r.currentEstVersion ? '<small class="muted"> · ' + esc(r.currentEstVersion) + '</small>' : '') + '</td>' +
        '<td class="muted">' + eur(r.baseline) + '</td>' +
        '<td class="w1cell">' + eur(r.baselineW1) + '</td><td class="w2cell">' + eur(r.baselineW2) + '</td>' +
        '<td>' + eur(r.paid) + '</td>' +
        '<td><strong>' + eur(r.forecast) + '</strong></td>' +
        '<td class="var ' + varCls + '">' + (varc > 0 ? '+' : '') + eur(varc) + '</td>' +
        '<td class="w1cell">' + eur(r.forecastW1) + '</td><td class="w2cell">' + eur(r.forecastW2) + '</td>' +
        '</tr>';
    }).join('');
    var tv = b.totals.varianceToBaseline;
    byId('budget-blocks').innerHTML =
      '<div class="section-note mini muted">Grobschätzung (Baseline) bleibt als Referenz. Prognose gleicht laufend mit den tatsächlichen Kosten ab. W1 = Wohnung A / Ingrid, W2 = Wohnung B / Maximilian.</div>' +
      '<div class="table-wrap"><table class="budget-table"><thead><tr>' +
      '<th>Budgetblock</th><th class="muted">Baseline</th><th class="w1cell">Base W1</th><th class="w2cell">Base W2</th><th>Bezahlt</th><th>Prognose</th><th>Δ</th>' +
      '<th class="w1cell">Prog. W1</th><th class="w2cell">Prog. W2</th></tr></thead><tbody>' +
      (blockRows || '<tr><td colspan="9" class="muted">Noch keine Kostenblöcke.</td></tr>') +
      '<tr class="total-row"><td>Summe</td><td class="muted">' + eur(b.totals.baseline) + '</td>' +
      '<td class="w1cell">' + eur(b.totals.baselineW1) + '</td><td class="w2cell">' + eur(b.totals.baselineW2) + '</td>' +
      '<td>' + eur(b.totals.paid) + '</td><td><strong>' + eur(b.totals.forecast) + '</strong></td>' +
      '<td class="var ' + (tv > 1 ? 'neg' : tv < -1 ? 'pos' : '') + '">' + (tv > 0 ? '+' : '') + eur(tv) + '</td>' +
      '<td class="w1cell"><strong>' + eur(b.totals.forecastW1) + '</strong></td><td class="w2cell"><strong>' + eur(b.totals.forecastW2) + '</strong></td></tr>' +
      '</tbody></table></div>';

    section('budget-estimates-table', 'budget_estimates', [
      { h: 'Version', get: function (r) { return esc(r.version); } },
      { h: 'Art', get: function (r) { return esc(r.estimate_type); } },
      { h: 'Block', get: function (r) { return esc(r.budget_block); } },
      { h: 'Position', get: function (r) { return esc(r.category); } },
      { h: 'Brutto', get: function (r) { return eur(r.amount_gross); } },
      { h: 'W1 / Ingrid', get: function (r) { return '<span class="w1cell">' + eur(C.num(r.amount_gross) * (C.num(r.share_w1) || 0) / 100) + '</span>'; } },
      { h: 'W2 / Maximilian', get: function (r) { return '<span class="w2cell">' + eur(C.num(r.amount_gross) * (C.num(r.share_w2) || 0) / 100) + '</span>'; } },
      { h: 'Baseline', get: function (r) { return String(r.is_baseline).toUpperCase() === 'TRUE' ? '<span class="tag blue">Baseline</span>' : ''; } }
    ], { note: 'Erste Grobschätzung als Baseline. Detaillierte Schätzung als neue Version mit gleichem Budgetblock ergänzen – Baseline bleibt erhalten.', sort: function (a, b2) { return String(a.budget_block).localeCompare(String(b2.budget_block)); } });
  }

  // ==== KOSTEN IST (Tab costs) =========================================
  function renderCostsIst() {
    var costs = C.calcCosts(DATA), saldo = C.calcSaldo(DATA);
    byId('cost-summary').innerHTML =
      '<div class="grid auto">' +
      card('Bisher bezahlt', eur(saldo.paidByW1 + saldo.paidByW2), 'alle tatsächlichen Ausgaben') +
      cardSplit('Ingrid (W1) bezahlt', eur(saldo.paidByW1), 'Maximilian (W2) bezahlt', eur(saldo.paidByW2)) +
      cardSplit('Kostenanteil W1', eur(saldo.oweW1), 'Kostenanteil W2', eur(saldo.oweW2)) +
      '</div>';

    // Saldo-Panel
    var dir = saldo.direction;
    var msg = dir === 'ausgeglichen' ? 'Ausgeglichen – keine Verrechnung nötig.'
      : dir === 'W2→W1' ? 'Maximilian (W2) schuldet Ingrid (W1) noch ' + eur(saldo.amount) + '.'
      : 'Ingrid (W1) schuldet Maximilian (W2) noch ' + eur(saldo.amount) + '.';
    byId('saldo-panel').innerHTML =
      '<div class="saldo-box ' + (dir === 'ausgeglichen' ? 'ok' : 'warn') + '">' +
      '<div class="saldo-amount">' + (dir === 'ausgeglichen' ? '0 €' : eur(saldo.amount)) + '</div>' +
      '<div class="saldo-dir">' + esc(msg) + '</div></div>' +
      '<p class="mini muted" style="margin-top:10px">Berechnung je Position: der Zahler trägt zunächst den vollen Betrag, geschuldet ist aber nur der eigene Kostenschlüssel-Anteil. Die Differenz ergibt den Ausgleich. Schlüssel je Position frei einstellbar.</p>';

    section('cost-positions-table', 'cost_positions', [
      { h: 'Datum', get: function (r) { return esc(r.date || ''); } },
      { h: 'Kategorie', get: function (r) { return esc(r.category); } },
      { h: 'Position', get: function (r) { return esc(r.item); } },
      { h: 'Betrag', get: function (r) { return eur(r.gross); } },
      { h: 'Bezahlt von', get: function (r) { return esc(r.paid_by || '—'); } },
      { h: 'Schlüssel', get: function (r) { return (r.share_w1 != null && r.share_w1 !== '') ? (r.share_w1 + '/' + r.share_w2) : '—'; } },
      { h: 'W1 / Ingrid', get: function (r) { return '<span class="w1cell">' + eur(C.shareOf(r, 'w1')) + '</span>'; } },
      { h: 'W2 / Maximilian', get: function (r) { return '<span class="w2cell">' + eur(C.shareOf(r, 'w2')) + '</span>'; } },
      { h: 'Status', get: function (r) { return tag(r.status); } }
    ], { note: 'Tatsächliche Ausgaben (Bürokratie, Planung/Architekt, Bau …). Bei jeder Position: wer bezahlt hat und der Kostenschlüssel W1/W2 – daraus der Saldo oben.', sort: function (a, b) { return String(a.date).localeCompare(String(b.date)); } });

    section('payments-table', 'payments', [
      { h: 'Datum', get: function (r) { return esc(r.date); } },
      { h: 'Empfänger', get: function (r) { return esc(r.supplier); } },
      { h: 'Betrag', get: function (r) { return eur(r.amount_gross); } },
      { h: 'Bezahlt von', get: function (r) { return esc(r.paid_by); } },
      { h: 'Bezug', get: function (r) { return esc(r.comment || r.related_cost_id || ''); } }
    ]);
  }

  // ==== FINANZIERUNG (Tab finance) =====================================
  function renderFinance() {
    var costs = C.calcCosts(DATA), fin = C.calcFinancing(DATA);
    byId('finance-summary').innerHTML =
      '<div class="grid auto">' +
      card('Gesamtbedarf', eur(fin.totalNeed), 'Prognose + Reserve') +
      card('Gesichert', eur(fin.equity + fin.confirmedSubs + fin.confirmedLoans + fin.paid), 'EK + Förderung + Kredit + bezahlt') +
      card('Finanzierungslücke', eur(fin.gap), 'noch zu decken', fin.gap > 0 ? 'danger' : 'ok') +
      card('Monatsrate gesamt', eur(fin.totalRate), 'alle Kredit-/Darlehensbausteine') +
      '</div>';

    // Gruppierung nach Typ-Kategorie
    var groups = { 'Eigenkapital': [], 'Förderung': [], 'Darlehen & Kredit': [], 'Steuerabschreibung': [] };
    (DATA.financing || []).forEach(function (f) {
      var t = String(f.type).toLowerCase();
      if (t.indexOf('eigenkapital') >= 0) groups['Eigenkapital'].push(f);
      else if (t.indexOf('förder') >= 0 || t.indexOf('zuschuss') >= 0) groups['Förderung'].push(f);
      else if (t.indexOf('steuer') >= 0 || t.indexOf('bonus') >= 0) groups['Steuerabschreibung'].push(f);
      else groups['Darlehen & Kredit'].push(f);
    });
    var sum = function (arr) { return arr.reduce(function (a, f) { return a + C.num(f.amount); }, 0); };
    byId('finance-detail').innerHTML = '<div class="grid auto">' +
      Object.keys(groups).map(function (k) {
        return card(k, eur(sum(groups[k])), groups[k].length + ' Baustein(e)');
      }).join('') + '</div>';

    section('financing-table', 'financing', [
      { h: 'Kategorie', get: function (r) { return esc(r.type); } },
      { h: 'Partei', get: function (r) { return esc(r.party); } },
      { h: 'Betrag', get: function (r) { return eur(r.amount); } },
      { h: 'Zins', get: function (r) { return r.interest_rate ? r.interest_rate + '%' : ''; } },
      { h: 'Laufzeit', get: function (r) { return r.term_years ? r.term_years + ' J' : ''; } },
      { h: 'Rate', get: function (r) { var a = C.annuity(C.num(r.amount), C.num(r.interest_rate) || 0, C.num(r.term_years) || 0); return a ? eur(a) : ''; } },
      { h: 'Status', get: function (r) { return tag(r.status); } }
    ], { note: 'Eigenkapital, Förderung (Zuschuss + zinsbegünstigtes Darlehen), Bankkredit und Steuerabschreibungen (Sanierung, Möbelbonus …).' });

    section('subsidies-table', 'subsidies', [
      { h: 'Programm', get: function (r) { return esc(r.program); } },
      { h: 'Partei', get: function (r) { return esc(r.party); } },
      { h: 'Erwartet', get: function (r) { return eur(r.expected_amount); } },
      { h: 'Zugesagt', get: function (r) { return eur(r.confirmed_amount); } },
      { h: 'Frist', get: function (r) { return esc(r.deadline); } },
      { h: 'Status', get: function (r) { return tag(r.status); } }
    ]);
    section('bank-offers-table', 'bank_offers', [
      { h: 'Bank', get: function (r) { return esc(r.bank); } },
      { h: 'Partei', get: function (r) { return esc(r.party); } },
      { h: 'Betrag', get: function (r) { return eur(r.amount); } },
      { h: 'Zins', get: function (r) { return (r.interest_rate || '') + '% ' + esc(r.interest_type || ''); } },
      { h: 'Rate', get: function (r) { return r.monthly_rate ? eur(r.monthly_rate) : eur(C.annuity(C.num(r.amount), C.num(r.interest_rate) || 0, C.num(r.term_years) || 0)); } },
      { h: 'Status', get: function (r) { return tag(r.status); } }
    ]);
  }

  function card(label, value, sub, cls) {
    return '<div class="card"><h4>' + esc(label) + '</h4><div class="kpi-value ' + (cls || '') + '">' + value + '</div><div class="kpi-sub">' + esc(sub || '') + '</div></div>';
  }
  function cardSplit(l1, v1, l2, v2) {
    return '<div class="card split-card">' +
      '<div class="split-half w1"><h4>' + esc(l1) + '</h4><div class="kpi-value">' + v1 + '</div></div>' +
      '<div class="split-half w2"><h4>' + esc(l2) + '</h4><div class="kpi-value">' + v2 + '</div></div>' +
      '</div>';
  }

  // ---- Zeitplan (Gantt + Aufgaben + Kategorien) ------------------------
  function renderTimeline() {
    var s = C.settingsObj(DATA);
    byId('build-date').value = s.target_construction_start || '2026-09-01';
    byId('occupancy-date').value = s.target_first_occupancy || '2027-06-30';

    // Kategorien-Filter dynamisch befüllen
    var gf = byId('gantt-filter');
    if (gf) {
      var prev = gf.value;
      var opts = '<option value="">alle Kategorien</option>' +
        (DATA.task_categories || []).map(function (c) { return '<option value="cat:' + esc(c.category_id) + '">' + esc(c.name) + '</option>'; }).join('') +
        '<option value="type:Termin">nur Termine</option><option value="type:Vorgang">nur Vorgänge</option>' +
        '<option value="prio:kritisch">nur kritisch</option>';
      gf.innerHTML = opts;
      gf.value = prev;
    }
    var filterVal = (gf && gf.value) || '';
    var filterFn = null;
    if (filterVal.indexOf('cat:') === 0) { var cid = filterVal.slice(4); filterFn = function (t) { return t.category_id === cid; }; }
    else if (filterVal.indexOf('type:') === 0) { var ty = filterVal.slice(5).toLowerCase(); filterFn = function (t) { return String(t.task_type).toLowerCase() === ty || (ty === 'termin' && t.start_date === t.due_date) || (ty === 'vorgang' && t.start_date !== t.due_date); }; }
    else if (filterVal.indexOf('prio:') === 0) { var pr = filterVal.slice(5).toLowerCase(); filterFn = function (t) { return String(t.priority).toLowerCase() === pr; }; }

    G.render(byId('gantt'), DATA.timeline_tasks || [], {
      data: DATA,
      buildDate: s.target_construction_start, occDate: s.target_first_occupancy,
      filter: filterFn,
      onClick: function (id) { F.open('timeline_tasks', id); }
    });

    // Kategorien verwalten (erstellbar, farblich)
    section('task-categories-table', 'task_categories', [
      { h: 'Farbe', get: function (r) { return '<span class="cat-swatch" style="background:' + esc(r.color || '#888') + '"></span>'; } },
      { h: 'Kategorie', get: function (r) { return '<strong>' + esc(r.name) + '</strong>'; } },
      { h: 'Reihenfolge', get: function (r) { return esc(r.sort); } },
      { h: 'Beschreibung', get: function (r) { return esc(r.comment); } }
    ], { note: 'Hauptkategorien für den Zeitplan – frei erstellbar und farblich unterscheidbar (Architekt, Bauvorgang, Bürokratie, Grundlagen …).' });

    // Aufgabentabelle mit Typ, Kategorie, Beschreibung
    var catNames = {}; (DATA.task_categories || []).forEach(function (c) { catNames[c.category_id] = c; });
    section('tasks-table', 'timeline_tasks', [
      { h: 'Kategorie', get: function (r) { var c = catNames[r.category_id]; return c ? '<span class="cat-pill" style="--catcol:' + esc(c.color) + '">' + esc(c.name) + '</span>' : esc(r.phase); } },
      { h: 'Typ', get: function (r) { var t = String(r.task_type || (r.start_date === r.due_date ? 'Termin' : 'Vorgang')); return '<span class="type-pill ' + (t.toLowerCase() === 'termin' ? 'termin' : 'vorgang') + '">' + esc(t) + '</span>'; } },
      { h: 'Aufgabe', get: function (r) { return '<strong>' + esc(r.task) + '</strong>' + (r.description ? '<br><small class="muted">' + esc(String(r.description).slice(0, 120)) + (String(r.description).length > 120 ? '…' : '') + '</small>' : ''); } },
      { h: 'Verantw.', get: function (r) { return esc(r.owner); } },
      { h: 'Datum / Zeitraum', get: function (r) { return String(r.task_type).toLowerCase() === 'termin' || r.start_date === r.due_date ? '<strong>' + esc(r.start_date) + '</strong>' : esc(r.start_date) + ' → ' + esc(r.due_date); } },
      { h: 'Status', get: function (r) { return tag(r.status) + (String(r.is_blocker).toUpperCase() === 'TRUE' ? ' <span class="tag danger">Blocker</span>' : ''); } },
      { h: 'Prio', get: function (r) { return esc(r.priority); } }
    ], { sort: function (a, b) { return String(a.start_date).localeCompare(String(b.start_date)); } });
  }

  // ---- Gewerke & Firmen -------------------------------------------------
  function renderTrades() {
    // Pro Gewerk: Angebote vergleichen + final vergeben
    var byTrade = {};
    (DATA.trades || []).forEach(function (t) { byTrade[t.trade] = { trade: t, offers: [] }; });
    (DATA.offers || []).forEach(function (o) {
      var key = o.compare_group || o.trade;
      if (!byTrade[key]) byTrade[key] = { trade: { trade: key, status: '' }, offers: [] };
      byTrade[key].offers.push(o);
    });
    var awardHtml = Object.keys(byTrade).map(function (k) {
      var g = byTrade[k];
      var offers = g.offers.slice().sort(function (a, b) { return C.num(a.gross) - C.num(b.gross); });
      var awarded = offers.find(function (o) { return String(o.status) === 'Auftrag erteilt' || String(o.final).toUpperCase() === 'TRUE'; });
      var cheapest = offers[0];
      var offerRows = offers.length ? offers.map(function (o) {
        var isAwd = awarded && o.offer_id === awarded.offer_id;
        var mark = isAwd ? '<span class="tag ok">✓ vergeben</span>' : (o === cheapest ? '<span class="tag blue">günstigstes</span>' : '');
        var btn = isAwd ? '<span class="mini muted">beauftragt</span>'
          : '<button class="btn small award" data-award="' + esc(o.offer_id) + '">vergeben</button>';
        return '<tr><td>' + esc(o.supplier) + '</td><td>' + eur(o.gross) + '</td><td>' + tag(o.status) + ' ' + mark + '</td><td>' + btn + '</td></tr>';
      }).join('') : '<tr><td colspan="4" class="muted">Noch keine Angebote – im Bereich „Angebote" anlegen.</td></tr>';
      return '<div class="trade-award-card">' +
        '<div class="trade-award-head"><strong>' + esc(k) + '</strong>' +
        (awarded ? '<span class="tag ok">vergeben an ' + esc(awarded.supplier) + '</span>' : '<span class="tag warn">offen</span>') + '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>Anbieter</th><th>Brutto</th><th>Status</th><th></th></tr></thead><tbody>' + offerRows + '</tbody></table></div>' +
        '</div>';
    }).join('');
    var el = byId('trades-award');
    el.innerHTML = awardHtml || '<p class="muted">Noch keine Gewerke angelegt.</p>';
    el.querySelectorAll('[data-award]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Dieses Angebot final vergeben? Es wird als Auftrag in „Kosten (Ist)" übernommen; ein bestehender Auftrag derselben Gruppe wird ersetzt.')) return;
        await S.awardOffer(b.getAttribute('data-award'));
      });
    });

    section('trades-table', 'trades', [
      { h: 'Gewerk', get: function (r) { return '<strong>' + esc(r.trade) + '</strong>'; } },
      { h: 'Prio', get: function (r) { return esc(r.priority); } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Ziel Vergabe', get: function (r) { return esc(r.target_award); } },
      { h: 'Baustart', get: function (r) { return String(r.blocks_construction_start).toUpperCase() === 'TRUE' ? tag('blockiert Baustart') : tag('parallel'); } }
    ]);
    section('offers-table', 'offers', [
      { h: 'Gewerk', get: function (r) { return esc(r.trade); } },
      { h: 'Gruppe', get: function (r) { return esc(r.compare_group || '—'); } },
      { h: 'Anbieter', get: function (r) { return esc(r.supplier); } },
      { h: 'Brutto', get: function (r) { return eur(r.gross); } },
      { h: 'Status', get: function (r) { return tag(r.status); } }
    ], {
      note: 'Angebote zählen NICHT automatisch mit. Erst die finale Vergabe oben macht daraus einen Auftrag in „Kosten (Ist)".',
      rowActions: function (r) {
        var awarded = String(r.status) === 'Auftrag erteilt';
        return awarded ? '<span class="tag ok" style="margin-right:6px">beauftragt</span>'
          : '<button class="btn small award" data-award="' + esc(r.offer_id) + '">vergeben</button>';
      },
      wire: function (el2) {
        el2.querySelectorAll('[data-award]').forEach(function (b) {
          b.addEventListener('click', async function () {
            if (!confirm('Angebot final vergeben?')) return;
            await S.awardOffer(b.getAttribute('data-award'));
          });
        });
      }
    });
    section('companies-table', 'companies', [
      { h: 'Gewerk-ID', get: function (r) { return esc(r.trade_id); } },
      { h: 'Firma', get: function (r) { return esc(r.company); } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Final', get: function (r) { return String(r.final).toUpperCase() === 'TRUE' ? tag('final') : ''; } }
    ]);
  }

  // ---- Energie (live, formelbasiert, Schieberegler) --------------------
  function renderEnergy() {
    var scEl = byId('energy-scenario');
    var scenario = (scEl && scEl.value) || 'Pellet + WP';
    var base = C.calcEnergy(DATA, scenario);
    var e = C.calcEnergy(DATA, scenario, energyOverrides);

    // Schieberegler-Definitionen (Startwert = aktueller Wert)
    var sliders = [
      { key: 'pvKwp', label: 'PV-Leistung', unit: 'kWp', min: 0, max: Math.max(12, Math.ceil(base.maxKwp)), step: 0.1, value: e.pvKwp, fmt: function (v) { return v.toFixed(1) + ' kWp'; } },
      { key: 'battery', label: 'Batteriespeicher', unit: 'kWh', min: 0, max: 20, step: 1, value: e.battery, fmt: function (v) { return v + ' kWh'; } },
      { key: 'pelletShare', label: 'Pelletanteil an Heizung', unit: '%', min: 0, max: 100, step: 5, value: Math.round(e.pelletShare * 100), fmt: function (v) { return v + ' %'; }, scale: 0.01 },
      { key: 'heatDemand', label: 'Heizwärmebedarf', unit: 'kWh/a', min: 6000, max: 25000, step: 500, value: e.heatDemand, fmt: function (v) { return Math.round(v).toLocaleString('de-AT') + ' kWh/a'; } },
      { key: 'evCount', label: 'E-Autos', unit: '', min: 0, max: 3, step: 1, value: e.evCount, fmt: function (v) { return v + ' Stk'; } },
      { key: 'household', label: 'Haushaltsstrom', unit: 'kWh/a', min: 2000, max: 10000, step: 250, value: e.household, fmt: function (v) { return Math.round(v).toLocaleString('de-AT') + ' kWh/a'; } },
      { key: 'elecPrice', label: 'Strompreis Netzbezug', unit: '€/kWh', min: 0.10, max: 0.45, step: 0.01, value: e.elecPrice, fmt: function (v) { return v.toFixed(2) + ' €/kWh'; } }
    ];
    var sliderHTML = sliders.map(function (sl) {
      return '<div class="slider-row" data-key="' + sl.key + '" data-scale="' + (sl.scale || 1) + '">' +
        '<label>' + esc(sl.label) + '<span class="slider-val" id="sv-' + sl.key + '">' + sl.fmt(sl.key === 'pelletShare' ? sl.value : sl.value) + '</span></label>' +
        '<input type="range" min="' + sl.min + '" max="' + sl.max + '" step="' + sl.step + '" value="' + sl.value + '">' +
        '</div>';
    }).join('');
    var reset = Object.keys(energyOverrides).length ? '<button class="btn small secondary" id="energy-reset">Auf Ausgangswerte zurücksetzen</button>' : '';

    byId('energy-summary').innerHTML =
      '<div class="grid auto">' +
      card('PV-Ertrag', Math.round(e.pvAnnual).toLocaleString('de-AT') + ' kWh/a', e.pvKwp.toFixed(1) + ' kWp (max ' + e.maxKwp.toFixed(1) + ') · PVGIS-basiert') +
      card('Jahresautarkie', C.pct(e.autarky), 'Direkt + Batterie ' + e.battery + ' kWh') +
      card('Netzbezug', Math.round(e.grid).toLocaleString('de-AT') + ' kWh/a', 'Einspeisung ' + Math.round(e.feedIn).toLocaleString('de-AT') + ' kWh/a') +
      card('Energiekosten', eur(e.energyCost) + '/a', 'Netz − Einspeisung + Pellet', e.energyCost < base.energyCost ? 'ok' : '') +
      card('WP-Deckungsgrad', Math.round(e.wpCoverage) + '%', 'Pelletbedarf ~' + Math.round(e.pelletKg) + ' kg/a') +
      card('Speicher-Empfehlung', e.batteryRecommendation, 'sinnvoller Rahmen') +
      '</div>' +
      '<div class="slider-panel"><div class="slider-panel-head"><h4>Live-Auslegung · Schieberegler</h4>' + reset + '</div>' +
      '<p class="mini muted">Alle Werte werden formelbasiert und live neu berechnet (PVGIS-Ertrag, JAZ/COP, Direktverbrauch + Batterie-Modell). Regler ändern nur die Anzeige – zum dauerhaften Speichern die Werte in „Energieparameter“ unten eintragen.</p>' +
      '<div class="slider-grid">' + sliderHTML + '</div></div>';

    // Slider-Events -> Overrides -> re-render (nur Energie + Charts)
    byId('energy-summary').querySelectorAll('.slider-row input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var row = inp.closest('.slider-row');
        var key = row.getAttribute('data-key');
        var scale = parseFloat(row.getAttribute('data-scale')) || 1;
        var raw = parseFloat(inp.value);
        energyOverrides[key] = raw * scale;
        renderEnergy();
        if (Charts) Charts.renderAll(DATA, C, energyOverrides);
      });
    });
    var rb = byId('energy-reset');
    if (rb) rb.addEventListener('click', function () { energyOverrides = {}; renderEnergy(); if (Charts) Charts.renderAll(DATA, C, energyOverrides); });

    section('energy-inputs-table', 'energy_inputs', [
      { h: 'Modul', get: function (r) { return esc(r.module); } },
      { h: 'Parameter', get: function (r) { return esc(r.name); } },
      { h: 'Wert', get: function (r) { return esc(r.value); } },
      { h: 'Einheit', get: function (r) { return esc(r.unit); } }
    ], { note: 'Basiswerte für alle Formeln. Schieberegler oben überschreiben sie temporär; hier gespeicherte Werte sind die Ausgangsbasis.' });
  }

  // ---- Master render ----------------------------------------------------
  function render() {
    DATA = S.state.data;
    renderOverview(); renderProject();
    renderEstimate(); renderCostsIst(); renderFinance();
    renderTimeline(); renderTrades(); renderEnergy();
    if (Charts && Charts.renderAll) { try { Charts.renderAll(DATA, C, energyOverrides); } catch (e) { console.warn(e); } }
  }

  function setupNav() {
    qsa('.nav button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.nav button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        qsa('.tab').forEach(function (t) { t.classList.remove('active'); });
        byId(btn.dataset.tab).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(function () { if (Charts) Charts.renderAll(DATA, C, energyOverrides); if (byId(btn.dataset.tab).querySelector('#gantt')) renderTimeline(); }, 80);
      });
    });
  }

  function setupControls() {
    byId('build-date').addEventListener('change', function (e) { S.update('settings', 'target_construction_start', { value: e.target.value }); });
    byId('occupancy-date').addEventListener('change', function (e) { S.update('settings', 'target_first_occupancy', { value: e.target.value }); });
    var gf = byId('gantt-filter'); if (gf) gf.addEventListener('change', renderTimeline);
    var es = byId('energy-scenario'); if (es) es.addEventListener('change', function () { energyOverrides = {}; renderEnergy(); if (Charts) Charts.renderAll(DATA, C, energyOverrides); });
  }

  async function init() {
    setupNav();
    S.onChange(render);
    await S.load();
    setupControls();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
