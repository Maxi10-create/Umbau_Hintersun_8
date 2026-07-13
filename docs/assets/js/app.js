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
    byId('source-pill').innerHTML = '<span class="status-dot ' + (S.state.online ? 'on' : '') + '"></span>' + esc(S.state.source);
    byId('kpi-progress').textContent = C.pct(prog.taskProgress);
    byId('kpi-progress-sub').textContent = 'Zeit bis Erstbezug ' + C.pct(prog.timeToOcc) + ' · ' + prog.risk;
    byId('kpi-cost').textContent = eur(costs.forecast);
    byId('kpi-cost-sub').textContent = 'Prognose · beauftragt ' + eur(costs.ordered) + ' · bezahlt ' + eur(costs.paid);
    byId('kpi-finance').textContent = eur(fin.gap);
    byId('kpi-finance-sub').textContent = 'Rate ~' + eur(fin.totalRate) + '/Monat';
    byId('kpi-energy').textContent = C.pct(en.autarky);
    byId('kpi-energy-sub').textContent = 'PV ' + en.maxKwp.toFixed(1) + ' kWp · Batterie ' + en.batteryRecommendation;

    byId('overview-summary').innerHTML =
      '<div class="split"><span class="tag ' + (prog.diff >= 0 ? 'ok' : prog.diff < -10 ? 'danger' : 'warn') + '">' + esc(prog.risk) + '</span>' +
      '<span class="tag blue">' + prog.daysToOcc + ' Tage bis Erstbezug</span>' +
      '<span class="tag blue">' + prog.critical + ' kritische offene Aufgaben</span></div>' +
      '<div class="hr"></div><div class="progress ' + (prog.diff < 0 ? 'warn' : '') + '"><span style="width:' + Math.round(prog.taskProgress) + '%"></span></div>' +
      '<p class="mini muted">Aufgabenfortschritt ' + C.pct(prog.taskProgress) + ' vs. Zeitfortschritt ' + C.pct(prog.timeToOcc) + '.</p>';

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
      card('Beauftragt', eur(costs.ordered), 'aktive Aufträge') +
      card('Bezahlt', eur(costs.paid), 'Ist-Zahlungen') +
      card('Finanzierungslücke', eur(fin.gap), 'nach EK, Förderung, Krediten', fin.gap > 0 ? 'danger' : 'ok') +
      '</div>';

    // Budgetblöcke (gestuft)
    var b = costs.budget;
    var blockRows = b.rows.map(function (r) {
      return '<tr><td><strong>' + esc(r.block) + '</strong></td><td>' + eur(r.estimate) + '</td><td>' + eur(r.ordered) +
        '</td><td>' + eur(r.invoiced) + '</td><td>' + eur(r.paid) + '</td><td><strong>' + eur(r.forecast) + '</strong></td></tr>';
    }).join('');
    byId('budget-blocks').innerHTML = '<div class="table-wrap"><table><thead><tr><th>Budgetblock</th><th>Schätzung</th><th>Beauftragt</th><th>Fakturiert</th><th>Bezahlt</th><th>Prognose</th></tr></thead><tbody>' +
      (blockRows || '<tr><td colspan="6" class="muted">Noch keine Kostenblöcke.</td></tr>') +
      '<tr class="total-row"><td>Summe</td><td>' + eur(b.totals.estimate) + '</td><td>' + eur(b.totals.ordered) + '</td><td>' + eur(b.totals.invoiced) + '</td><td>' + eur(b.totals.paid) + '</td><td><strong>' + eur(b.totals.forecast) + '</strong></td></tr>' +
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
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Aktiv', get: function (r) { return String(r.active).toUpperCase() === 'FALSE' ? '<span class="tag">inaktiv</span>' : '<span class="tag ok">aktiv</span>'; } },
      { h: 'Bezahlt', get: function (r) { return String(r.paid).toUpperCase() === 'TRUE' ? '✓' : ''; } }
    ], { note: 'Auftrag/Rechnung/Zahlung – Prognose zählt max je Block, keine Doppelzählung.' });

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

  // ---- Zeitplan (Gantt + Aufgaben) -------------------------------------
  function renderTimeline() {
    var s = C.settingsObj(DATA);
    byId('build-date').value = s.target_construction_start || '2026-09-01';
    byId('occupancy-date').value = s.target_first_occupancy || '2027-06-30';

    var filterVal = (byId('gantt-filter') && byId('gantt-filter').value) || '';
    G.render(byId('gantt'), DATA.timeline_tasks || [], {
      buildDate: s.target_construction_start, occDate: s.target_first_occupancy,
      filter: filterVal ? function (t) { return String(t.phase || '') === filterVal || String(t.priority || '') === filterVal; } : null,
      onClick: function (id) { F.open('timeline_tasks', id); }
    });

    section('tasks-table', 'timeline_tasks', [
      { h: 'Phase', get: function (r) { return esc(r.phase); } },
      { h: 'Aufgabe', get: function (r) { return esc(r.task); } },
      { h: 'Verantw.', get: function (r) { return esc(r.owner); } },
      { h: 'Start', get: function (r) { return esc(r.start_date); } },
      { h: 'Ende', get: function (r) { return esc(r.due_date); } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Prio', get: function (r) { return esc(r.priority); } }
    ]);
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

  // ---- Energie ----------------------------------------------------------
  function renderEnergy() {
    var scEl = byId('energy-scenario');
    var scenario = (scEl && scEl.value) || 'Pellet + WP';
    var e = C.calcEnergy(DATA, scenario);
    byId('energy-summary').innerHTML = '<div class="grid auto">' +
      card('PV maximal', e.maxKwp.toFixed(1) + ' kWp', 'nutzbare Fläche ' + e.usable.toFixed(0) + ' m²') +
      card('PV-Ertrag', Math.round(e.pvAnnual).toLocaleString('de-AT') + ' kWh/a', 'PVGIS-basiert') +
      card('Jahresautarkie', C.pct(e.autarky), 'Direkt + Batterie ' + e.battery + ' kWh') +
      card('Energiekosten', eur(e.energyCost), 'Netz − Einspeisung + Pellet') +
      card('WP-Deckungsgrad', Math.round(e.wpCoverage) + '%', 'Pelletbedarf ~' + Math.round(e.pelletKg) + ' kg/a') +
      card('Speicher-Empfehlung', e.batteryRecommendation, 'sinnvoller Rahmen') +
      '</div>';

    section('energy-inputs-table', 'energy_inputs', [
      { h: 'Modul', get: function (r) { return esc(r.module); } },
      { h: 'Parameter', get: function (r) { return esc(r.name); } },
      { h: 'Wert', get: function (r) { return esc(r.value); } },
      { h: 'Einheit', get: function (r) { return esc(r.unit); } }
    ], { note: 'Alle Berechnungen reagieren live auf diese Parameter.' });
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
    if (Charts && Charts.renderAll) { try { Charts.renderAll(DATA, C); } catch (e) { console.warn(e); } }
  }

  function setupNav() {
    qsa('.nav button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.nav button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        qsa('.tab').forEach(function (t) { t.classList.remove('active'); });
        byId(btn.dataset.tab).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(function () { if (Charts) Charts.renderAll(DATA, C); if (byId(btn.dataset.tab).querySelector('#gantt')) renderTimeline(); }, 80);
      });
    });
  }

  function setupControls() {
    byId('build-date').addEventListener('change', function (e) { S.update('settings', 'target_construction_start', { value: e.target.value }); });
    byId('occupancy-date').addEventListener('change', function (e) { S.update('settings', 'target_first_occupancy', { value: e.target.value }); });
    var gf = byId('gantt-filter'); if (gf) gf.addEventListener('change', renderTimeline);
    var es = byId('energy-scenario'); if (es) es.addEventListener('change', function () { renderEnergy(); if (Charts) Charts.renderAll(DATA, C); });
  }

  async function init() {
    setupNav();
    S.onChange(render);
    await S.load();
    setupControls();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
