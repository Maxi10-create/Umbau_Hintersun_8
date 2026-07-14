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
  function renderCosts() {
    var costs = C.calcCosts(DATA), fin = C.calcFinancing(DATA);
    byId('cost-finance-summary').innerHTML =
      '<div class="grid auto">' +
      card('Prognose gesamt', eur(costs.forecast), 'max(Schätzung, Auftrag, Rechnung) je Block') +
      cardSplit('davon W1 / Ingrid', eur(costs.w1), 'davon W2 / Maximilian', eur(costs.w2)) +
      card('Bezahlt', eur(costs.paid), 'W1 ' + eur(costs.paidW1) + ' · W2 ' + eur(costs.paidW2)) +
      card('Finanzierungslücke', eur(fin.gap), 'W1 ' + eur(fin.gapW1) + ' · W2 ' + eur(fin.gapW2), fin.gap > 0 ? 'danger' : 'ok') +
      '</div>';

    // Budgetblöcke (gestuft) mit W1/W2-Spalten und Baseline-Abgleich
    var b = costs.budget;
    var blockRows = b.rows.map(function (r) {
      var varc = r.varianceToBaseline;
      var varCls = varc > 1 ? 'neg' : varc < -1 ? 'pos' : '';
      var varTxt = (varc > 0 ? '+' : '') + eur(varc);
      return '<tr>' +
        '<td><strong>' + esc(r.block) + '</strong>' + (r.currentEstVersion ? '<small class="muted"> · ' + esc(r.currentEstVersion) + '</small>' : '') + '</td>' +
        '<td class="muted">' + eur(r.baseline) + '</td>' +
        '<td>' + eur(r.estimate) + '</td>' +
        '<td>' + eur(r.ordered) + '</td>' +
        '<td>' + eur(r.paid) + '</td>' +
        '<td><strong>' + eur(r.forecast) + '</strong></td>' +
        '<td class="var ' + varCls + '">' + varTxt + '</td>' +
        '<td class="w1cell">' + eur(r.forecastW1) + '</td>' +
        '<td class="w2cell">' + eur(r.forecastW2) + '</td>' +
        '</tr>';
    }).join('');
    var tv = b.totals.varianceToBaseline;
    byId('budget-blocks').innerHTML =
      '<div class="section-note mini muted">Grobschätzung (Baseline) bleibt als Referenz stehen; Prognose = Ist-Abgleich in Echtzeit. Δ zeigt Abweichung Prognose − Baseline.</div>' +
      '<div class="table-wrap"><table class="budget-table"><thead><tr>' +
      '<th>Budgetblock</th><th class="muted">Baseline</th><th>Akt. Schätzung</th><th>Beauftragt</th><th>Bezahlt</th><th>Prognose</th><th>Δ Baseline</th>' +
      '<th class="w1cell">W1 / Ingrid</th><th class="w2cell">W2 / Maximilian</th></tr></thead><tbody>' +
      (blockRows || '<tr><td colspan="9" class="muted">Noch keine Kostenblöcke.</td></tr>') +
      '<tr class="total-row"><td>Summe</td><td class="muted">' + eur(b.totals.baseline) + '</td><td>' + eur(b.totals.estimate) + '</td><td>' + eur(b.totals.ordered) + '</td><td>' + eur(b.totals.paid) + '</td>' +
      '<td><strong>' + eur(b.totals.forecast) + '</strong></td><td class="var ' + (tv > 1 ? 'neg' : tv < -1 ? 'pos' : '') + '">' + (tv > 0 ? '+' : '') + eur(tv) + '</td>' +
      '<td class="w1cell"><strong>' + eur(b.totals.forecastW1) + '</strong></td><td class="w2cell"><strong>' + eur(b.totals.forecastW2) + '</strong></td></tr>' +
      '</tbody></table></div>';

    // Angebote + Vergleichsgruppen + Auftrag erteilen
    section('offers-table', 'offers', [
      { h: 'Gewerk', get: function (r) { return esc(r.trade); } },
      { h: 'Gruppe', get: function (r) { return esc(r.compare_group || '—'); } },
      { h: 'Anbieter', get: function (r) { return esc(r.supplier); } },
      { h: 'Brutto', get: function (r) { return eur(r.gross); } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'W1/W2', get: function (r) { return (r.share_w1 != null && r.share_w1 !== '') ? (r.share_w1 + '/' + r.share_w2) : esc(r.party_assignment || ''); } }
    ], {
      note: 'Angebote zählen NICHT automatisch. "Auftrag erteilen" erzeugt eine aktive Kostenposition (nur 1 pro Gruppe).',
      rowActions: function (r) {
        var awarded = String(r.status) === 'Auftrag erteilt';
        return awarded ? '<span class="tag ok" style="margin-right:6px">beauftragt</span>'
          : '<button class="btn small award" data-award="' + esc(r.offer_id) + '">Auftrag erteilen</button>';
      },
      wire: function (el) {
        el.querySelectorAll('[data-award]').forEach(function (b) {
          b.addEventListener('click', async function () {
            var id = b.getAttribute('data-award');
            if (!confirm('Angebot beauftragen? Ein bestehender Auftrag derselben Vergleichsgruppe wird ersetzt.')) return;
            await S.awardOffer(id);
          });
        });
      }
    });

    // Vergleichsgruppen-Panel
    var groups = C.compareGroups(DATA).filter(function (g) { return g.count > 1; });
    byId('compare-groups').innerHTML = groups.length ? groups.map(function (g) {
      var items = g.offers.map(function (o) {
        var mark = g.awarded && o.offer_id === g.awarded.offer_id ? ' ✓' : (o === g.cheapest ? ' (günstigstes)' : '');
        return '<li>' + esc(o.supplier) + ' – ' + eur(o.gross) + ' ' + tag(o.status) + mark + '</li>';
      }).join('');
      return '<div class="compare-card"><h4>' + esc(g.group) + '</h4><ul>' + items + '</ul></div>';
    }).join('') : '<p class="muted mini">Mehrere Angebote einer Vergleichsgruppe erscheinen hier als Vergleich (z.B. Küche Resch vs. Küche Stampfl).</p>';

    // Kostenpositionen (nur aktive standardmäßig, alle anzeigbar)
    section('cost-positions-table', 'cost_positions', [
      { h: 'Block', get: function (r) { return esc(r.category); } },
      { h: 'Position', get: function (r) { return esc(r.item); } },
      { h: 'Art', get: function (r) { return esc(r.source_type); } },
      { h: 'Brutto', get: function (r) { return eur(r.gross); } },
      { h: 'W1 / Ingrid', get: function (r) { return '<span class="w1cell">' + eur(C.shareOf(r, 'w1')) + '</span>'; } },
      { h: 'W2 / Maximilian', get: function (r) { return '<span class="w2cell">' + eur(C.shareOf(r, 'w2')) + '</span>'; } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Aktiv', get: function (r) { return String(r.active).toUpperCase() === 'FALSE' ? '<span class="tag">inaktiv</span>' : '<span class="tag ok">aktiv</span>'; } }
    ], { note: 'Auftrag/Rechnung/Zahlung – Prognose zählt max je Block, keine Doppelzählung. W1/W2 aus der Aufteilung je Position.' });

    // Versionierte Schätzungen
    section('budget-estimates-table', 'budget_estimates', [
      { h: 'Version', get: function (r) { return esc(r.version); } },
      { h: 'Art', get: function (r) { return esc(r.estimate_type); } },
      { h: 'Block', get: function (r) { return esc(r.budget_block); } },
      { h: 'Brutto', get: function (r) { return eur(r.amount_gross); } },
      { h: 'Baseline', get: function (r) { return String(r.is_baseline).toUpperCase() === 'TRUE' ? '<span class="tag blue">Baseline</span>' : ''; } },
      { h: 'Aktiv', get: function (r) { return String(r.active).toUpperCase() === 'FALSE' ? '' : '✓'; } }
    ], { note: 'Erste Grobschätzung als Baseline behalten; Detailschätzungen als neue Version ergänzen.' });

    // Finanzierung, Bankangebote, Förderungen, Zahlungen
    section('financing-table', 'financing', [
      { h: 'Partei', get: function (r) { return esc(r.party); } },
      { h: 'Typ', get: function (r) { return esc(r.type); } },
      { h: 'Betrag', get: function (r) { return eur(r.amount); } },
      { h: 'Zins', get: function (r) { return r.interest_rate ? r.interest_rate + '%' : ''; } },
      { h: 'Laufzeit', get: function (r) { return r.term_years ? r.term_years + ' J' : ''; } },
      { h: 'Rate', get: function (r) { var a = C.annuity(C.num(r.amount), C.num(r.interest_rate) || 0, C.num(r.term_years) || 0); return a ? eur(a) : ''; } },
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
    section('subsidies-table', 'subsidies', [
      { h: 'Programm', get: function (r) { return esc(r.program); } },
      { h: 'Partei', get: function (r) { return esc(r.party); } },
      { h: 'Erwartet', get: function (r) { return eur(r.expected_amount); } },
      { h: 'Zugesagt', get: function (r) { return eur(r.confirmed_amount); } },
      { h: 'Frist', get: function (r) { return esc(r.deadline); } },
      { h: 'Status', get: function (r) { return tag(r.status); } }
    ]);
    section('payments-table', 'payments', [
      { h: 'Datum', get: function (r) { return esc(r.date); } },
      { h: 'Empfänger', get: function (r) { return esc(r.supplier); } },
      { h: 'Betrag', get: function (r) { return eur(r.amount_gross); } },
      { h: 'Von', get: function (r) { return esc(r.paid_by); } },
      { h: 'Status', get: function (r) { return tag(r.status); } }
    ]);

    // Finanzierungslücke je Partei + Liquidität
    byId('finance-detail').innerHTML =
      '<div class="grid auto">' +
      card('Lücke W1 / Ingrid', eur(fin.gapW1), 'Kostenanteil − EK − Förderung') +
      card('Lücke W2 / Maximilian', eur(fin.gapW2), 'Kostenanteil − EK − Förderung') +
      card('Reserve', eur(fin.reserve), 'Contingency auf Prognose') +
      card('Monatsrate gesamt', eur(fin.totalRate), 'alle Kredit-/Darlehensbausteine') +
      '</div>';
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
    section('trades-table', 'trades', [
      { h: 'Gewerk', get: function (r) { return '<strong>' + esc(r.trade) + '</strong>'; } },
      { h: 'Prio', get: function (r) { return esc(r.priority); } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Anfrage', get: function (r) { return esc(r.target_request); } },
      { h: 'Vergabe', get: function (r) { return esc(r.target_award); } },
      { h: 'Baustart', get: function (r) { return String(r.blocks_construction_start).toUpperCase() === 'TRUE' ? tag('blockiert Baustart') : tag('parallel'); } }
    ]);
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

  // ---- Szenarien & Entscheidungen --------------------------------------
  function renderScenarios() {
    var scen = C.scenarios(DATA);
    byId('scenarios-table').innerHTML = '<div class="table-wrap"><table><thead><tr><th>Szenario</th><th>PV kWp</th><th>Autarkie</th><th>Netzbezug</th><th>Pellet</th><th>Kosten/a</th></tr></thead><tbody>' +
      scen.map(function (s) {
        return '<tr><td><strong>' + esc(s.scenario) + '</strong></td><td>' + s.pvKwp.toFixed(1) + '</td><td>' + C.pct(s.autarky) +
          '</td><td>' + Math.round(s.grid).toLocaleString('de-AT') + ' kWh</td><td>' + Math.round(s.pelletKg) + ' kg</td><td>' + eur(s.energyCost) + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    section('decisions-table', 'decisions', [
      { h: 'Bereich', get: function (r) { return esc(r.area); } },
      { h: 'Entscheidung', get: function (r) { return esc(r.decision); } },
      { h: 'Empfehlung', get: function (r) { return esc(r.recommendation); } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Prio', get: function (r) { return esc(r.priority); } },
      { h: 'Deadline', get: function (r) { return esc(r.deadline); } }
    ]);
  }

  function renderDocs() {
    section('docs-table', 'documents', [
      { h: 'Kategorie', get: function (r) { return esc(r.category); } },
      { h: 'Dokument', get: function (r) { return r.file_url ? '<a href="' + esc(r.file_url) + '" target="_blank" rel="noopener">' + esc(r.title) + '</a>' : esc(r.title); } },
      { h: 'Datum', get: function (r) { return esc(r.date); } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Quelle', get: function (r) { return esc(r.source_note); } }
    ]);
  }

  // ---- Master render ----------------------------------------------------
  function render() {
    DATA = S.state.data;
    renderOverview(); renderProject(); renderCosts(); renderTimeline();
    renderTrades(); renderEnergy(); renderScenarios(); renderDocs();
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
