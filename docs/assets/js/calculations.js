/*
=========================================================
 Umbau Hintersun 8 – Calculations
 - gestufte Kostenlogik (Schätzung/Auftrag/Rechnung/Zahlung/Prognose)
 - Prognose je Budgetblock = max(...) ohne Doppelzählung
 - W1/W2-Aufteilung je Block explizit mitgeführt (nicht nur Gesamt)
 - Baseline- vs. aktuelle Kostenschätzung, immer mit Ist abgeglichen
 - Mehrdimensionale Projektampel (Zeit/Kosten/Bürokratie/Vergabe)
 - dynamische Energie-Auslegung aus energy_inputs (live, formelbasiert,
   mit optionalen Live-Overrides für Schieberegler)
=========================================================
*/
(function () {
  var euro = function (v) { return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0)); };
  // robuster Zahl-Parser: akzeptiert "1.234,56" und "1234.56"
  function n(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    var s = String(v).trim();
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    var f = parseFloat(s); return isNaN(f) ? 0 : f;
  }
  var pct = function (v) { return Math.round(Number(v || 0)) + '%'; };
  function settingsObj(data) { var o = {}; (data.settings || []).forEach(function (r) { o[r.key] = r.value; }); return o; }
  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
  function daysBetween(a, b) { return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000)); }
  function isActive(r) { return String(r.active == null ? 'TRUE' : r.active).toUpperCase() !== 'FALSE'; }
  function isTrue(v) { return String(v).toUpperCase() === 'TRUE'; }
  function low(v) { return String(v || '').toLowerCase(); }

  // ---------- Aufteilung W1/W2 (flexibel, editierbar je Position) -------
  function shareOf(rec, party) {
    var g = n(rec.gross || rec.amount || rec.amount_gross || 0);
    var w1 = rec.share_w1, w2 = rec.share_w2;
    if (w1 !== '' && w1 != null && !isNaN(parseFloat(w1))) {
      return party === 'w1' ? g * parseFloat(w1) / 100 : g * (parseFloat(w2) || (100 - parseFloat(w1))) / 100;
    }
    // Fallback: alte split_key / party_assignment-Logik
    var key = low(rec.split_key), pa = low(rec.party_assignment);
    if (key === '100_w1' || pa === 'w1') return party === 'w1' ? g : 0;
    if (key === '100_w2' || pa === 'w2') return party === 'w2' ? g : 0;
    if (key.indexOf('thousandths') >= 0 || key.indexOf('466') >= 0) return party === 'w1' ? g * 0.466 : g * 0.534;
    if (key === '50_50') return g * 0.5;
    if (pa === 'gemeinsam') return g * (party === 'w1' ? 0.466 : 0.534);
    return 0;
  }
  function splitPctOf(rec) {
    var w1 = parseFloat(rec.share_w1);
    if (!isNaN(w1) && rec.share_w1 !== '' && rec.share_w1 != null) return { w1: w1, w2: parseFloat(rec.share_w2) || (100 - w1) };
    var key = low(rec.split_key), pa = low(rec.party_assignment);
    if (key === '100_w1' || pa === 'w1') return { w1: 100, w2: 0 };
    if (key === '100_w2' || pa === 'w2') return { w1: 0, w2: 100 };
    if (pa === 'gemeinsam' || key.indexOf('thousandths') >= 0 || key.indexOf('466') >= 0) return { w1: 46.6, w2: 53.4 };
    if (key === '50_50') return { w1: 50, w2: 50 };
    return { w1: 0, w2: 0 };
  }

  // ---------- Fortschritt -----------------------------------------------
  function calcProgress(data) {
    var s = settingsObj(data);
    var start = new Date(s.project_start || '2025-07-30');
    var build = new Date(s.target_construction_start || '2026-09-01');
    var occ = new Date(s.target_first_occupancy || '2027-06-30');
    var today = new Date();
    var timeToBuild = clamp(((today - start) / (build - start)) * 100, 0, 100);
    var timeToOcc = clamp(((today - start) / (occ - start)) * 100, 0, 100);
    var tasks = data.timeline_tasks || [];
    var total = tasks.reduce(function (a, t) { return a + n(t.progress_weight || 1); }, 0) || 1;
    var done = tasks.filter(function (t) { return low(t.status).indexOf('erledigt') >= 0 || low(t.status).indexOf('bezahlt') >= 0; })
      .reduce(function (a, t) { return a + n(t.progress_weight || 1); }, 0);
    var taskProgress = clamp(done / total * 100, 0, 100);
    var critical = tasks.filter(function (t) { return ['kritisch', 'hoch'].indexOf(low(t.priority)) >= 0 && low(t.status).indexOf('erledigt') < 0; }).length;
    var blockers = tasks.filter(function (t) { return isTrue(t.is_blocker) && low(t.status).indexOf('erledigt') < 0; });
    var diff = taskProgress - timeToOcc;
    var risk = diff >= 5 ? 'im Plan' : diff >= 0 ? 'leicht hinter Plan' : diff >= -10 ? 'kritisch' : 'Zieltermin gefährdet';
    return { timeToBuild: timeToBuild, timeToOcc: timeToOcc, taskProgress: taskProgress, critical: critical, diff: diff, risk: risk,
      blockers: blockers, daysToBuild: daysBetween(today, build), daysToOcc: daysBetween(today, occ) };
  }

  // ---------- Kosten je Budgetblock (gestuft, W1/W2 explizit) -----------
  // Prognose je Block = max(aktive Schätzung, aktive Aufträge, Rechnung, Zahlung)
  // Baseline (grobe Erst-Schätzung) bleibt unveränderlich sichtbar, auch
  // wenn eine Detailschätzung sie als "aktuell" ablöst – Abgleich ist immer live.
  function calcBudget(data) {
    var costs = (data.cost_positions || []).filter(isActive);
    var estimates = (data.budget_estimates || []);
    var blocks = {};
    function block(name) {
      name = name || 'Sonstiges';
      if (!blocks[name]) blocks[name] = {
        block: name,
        estimate: 0, estimateW1: 0, estimateW2: 0,
        baseline: 0, baselineW1: 0, baselineW2: 0, baselineVersion: '', baselineDate: '',
        currentEstVersion: '', currentEstDate: '', hasDetail: false,
        ordered: 0, orderedW1: 0, orderedW2: 0,
        invoiced: 0, invoicedW1: 0, invoicedW2: 0,
        paid: 0, paidW1: 0, paidW2: 0
      };
      return blocks[name];
    }
    // Schätzungen: je Budgetblock die einzelnen Positionen SUMMIEREN.
    // Mehrere Versionen derselben Position (gleiche category im selben Block)
    // -> nur die neueste/höchste zählt (max), damit Detail eine Grobposition ersetzt.
    var estBaseGroups = {}, estActiveGroups = {};
    estimates.forEach(function (e) {
      var blk = e.budget_block || 'Sonstiges';
      var posKey = blk + '||' + (e.category || e.estimate_id); // Position innerhalb des Blocks
      var g = n(e.amount_gross), sp = splitPctOf(e);
      var entry = { g: g, w1: g * sp.w1 / 100, w2: g * sp.w2 / 100, version: e.version, date: e.date, block: blk };
      if (isTrue(e.is_baseline)) {
        var pb = estBaseGroups[posKey];
        if (!pb || g >= pb.g) estBaseGroups[posKey] = entry; // neueste Version der Position
      }
      if (isActive(e)) {
        var pa = estActiveGroups[posKey];
        if (!pa || g >= pa.g) estActiveGroups[posKey] = entry;
        if (!isTrue(e.is_baseline)) block(blk).hasDetail = true;
      }
    });
    Object.keys(estBaseGroups).forEach(function (k) {
      var e = estBaseGroups[k], b = block(e.block);
      b.baseline += e.g; b.baselineW1 += e.w1; b.baselineW2 += e.w2; b.baselineVersion = e.version; b.baselineDate = e.date;
    });
    Object.keys(estActiveGroups).forEach(function (k) {
      var e = estActiveGroups[k], b = block(e.block);
      b.estimate += e.g; b.estimateW1 += e.w1; b.estimateW2 += e.w2; b.currentEstVersion = e.version; b.currentEstDate = e.date;
    });
    // Kostenpositionen nach Stufe (mit W1/W2-Anteil je Zeile)
    costs.forEach(function (c) {
      var b = block(c.category);
      var st = low(c.source_type), stat = low(c.status);
      var g = n(c.gross);
      var w1 = shareOf(c, 'w1'), w2 = shareOf(c, 'w2');
      if (st === 'grobkostenschätzung' || st === 'detailkostenschätzung' || stat.indexOf('schätzung') >= 0) {
        if (g >= b.estimate) { b.estimate = g; b.estimateW1 = w1; b.estimateW2 = w2; }
      } else if (st === 'auftrag' || stat.indexOf('beauftragt') >= 0 || stat === 'auftrag erteilt' || stat === 'in arbeit') {
        b.ordered += g; b.orderedW1 += w1; b.orderedW2 += w2;
      } else if (st === 'rechnung' || stat.indexOf('rechnung') >= 0) {
        b.invoiced += g; b.invoicedW1 += w1; b.invoicedW2 += w2;
      }
      if (isTrue(c.paid) || stat.indexOf('bezahlt') >= 0) { b.paid += g; b.paidW1 += w1; b.paidW2 += w2; }
    });

    var rows = Object.keys(blocks).map(function (k) {
      var b = blocks[k];
      b.forecast = Math.max(b.estimate, b.ordered, b.invoiced, b.paid);
      b.forecastW1 = Math.max(b.estimateW1, b.orderedW1, b.invoicedW1, b.paidW1);
      b.forecastW2 = Math.max(b.estimateW2, b.orderedW2, b.invoicedW2, b.paidW2);
      // grobe Baseline nur zeigen wenn abweichend von aktueller Zahl (sonst redundant)
      if (!b.baseline) { b.baseline = b.estimate; b.baselineW1 = b.estimateW1; b.baselineW2 = b.estimateW2; }
      b.varianceToBaseline = b.forecast - b.baseline;
      return b;
    });
    var totals = rows.reduce(function (a, b) {
      a.estimate += b.estimate; a.ordered += b.ordered; a.invoiced += b.invoiced; a.paid += b.paid; a.forecast += b.forecast;
      a.forecastW1 += b.forecastW1; a.forecastW2 += b.forecastW2;
      a.baseline += b.baseline; a.baselineW1 += b.baselineW1; a.baselineW2 += b.baselineW2;
      a.paidW1 += b.paidW1; a.paidW2 += b.paidW2;
      a.orderedW1 += b.orderedW1; a.orderedW2 += b.orderedW2;
      return a;
    }, { estimate: 0, ordered: 0, invoiced: 0, paid: 0, forecast: 0, forecastW1: 0, forecastW2: 0,
         baseline: 0, baselineW1: 0, baselineW2: 0, paidW1: 0, paidW2: 0, orderedW1: 0, orderedW2: 0 });
    totals.varianceToBaseline = totals.forecast - totals.baseline;
    return { rows: rows.sort(function (a, b) { return b.forecast - a.forecast; }), totals: totals };
  }

  function calcCosts(data) {
    var budget = calcBudget(data);
    var active = (data.cost_positions || []).filter(isActive);
    var gross = active.reduce(function (a, c) { return a + n(c.gross); }, 0);
    var byCat = {}; budget.rows.forEach(function (b) { byCat[b.block] = b.forecast; });
    return { gross: gross, forecast: budget.totals.forecast, ordered: budget.totals.ordered,
      invoiced: budget.totals.invoiced, paid: budget.totals.paid, estimate: budget.totals.estimate,
      baseline: budget.totals.baseline, varianceToBaseline: budget.totals.varianceToBaseline,
      open: budget.totals.forecast - budget.totals.paid, byCat: byCat,
      w1: budget.totals.forecastW1, w2: budget.totals.forecastW2,
      paidW1: budget.totals.paidW1, paidW2: budget.totals.paidW2,
      orderedW1: budget.totals.orderedW1, orderedW2: budget.totals.orderedW2,
      budget: budget };
  }

  // ---------- Angebotsvergleich (Vergleichsgruppen) ---------------------
  function compareGroups(data) {
    var groups = {};
    (data.offers || []).forEach(function (o) {
      var g = (o.compare_group || o.trade || 'ohne Gruppe').trim();
      (groups[g] = groups[g] || []).push(o);
    });
    return Object.keys(groups).map(function (k) {
      var offers = groups[k].slice().sort(function (a, b) { return n(a.gross) - n(b.gross); });
      var awarded = offers.find(function (o) { return low(o.status) === 'auftrag erteilt' || isTrue(o.final); });
      return { group: k, offers: offers, awarded: awarded, cheapest: offers[0], count: offers.length };
    });
  }

  // ---------- Finanzierung ----------------------------------------------
  function annuity(amount, annualRate, years) {
    if (!amount || !years) return 0;
    var r = annualRate / 100 / 12, m = years * 12;
    return r === 0 ? amount / m : amount * r / (1 - Math.pow(1 + r, -m));
  }
  function calcFinancing(data) {
    var s = settingsObj(data);
    var fin = data.financing || [];
    var subs = data.subsidies || [];
    var costs = calcCosts(data);
    var reserve = costs.forecast * (n(s.contingency_rate) || 0) / 100;
    var totalNeed = costs.forecast + reserve;

    var equity = fin.filter(function (f) { return low(f.type).indexOf('eigenkapital') >= 0; }).reduce(function (a, f) { return a + n(f.amount); }, 0);
    var confirmedSubs = subs.reduce(function (a, x) { return a + n(x.confirmed_amount); }, 0)
      + fin.filter(function (f) { return low(f.type).indexOf('förder') >= 0 && low(f.status) === 'zugesagt'; }).reduce(function (a, f) { return a + n(f.amount); }, 0);
    var confirmedLoans = fin.filter(function (f) { return (low(f.type).indexOf('darlehen') >= 0 || low(f.type).indexOf('kredit') >= 0) && ['zugesagt', 'ausgezahlt'].indexOf(low(f.status)) >= 0; })
      .reduce(function (a, f) { return a + n(f.amount); }, 0);
    var paid = costs.paid;

    var gap = Math.max(0, totalNeed - paid - equity - confirmedSubs - confirmedLoans);

    // Monatsrate über alle Kredit-/Darlehensbausteine
    var totalRate = fin.filter(function (f) { return low(f.type).indexOf('darlehen') >= 0 || low(f.type).indexOf('kredit') >= 0; })
      .reduce(function (a, f) { return a + annuity(n(f.amount), n(f.interest_rate) || 3, n(f.term_years) || 25); }, 0);

    // je Partei
    function needByParty(p) {
      var c = data.cost_positions || [];
      var partyCost = c.filter(isActive).reduce(function (a, x) { return a + shareOf(x, p); }, 0);
      var partyEq = fin.filter(function (f) { return low(f.type).indexOf('eigenkapital') >= 0 && low(f.party).indexOf(p) >= 0; }).reduce(function (a, f) { return a + n(f.amount); }, 0);
      var partySub = subs.filter(function (x) { return low(x.party).indexOf(p) >= 0; }).reduce(function (a, x) { return a + n(x.confirmed_amount || x.expected_amount); }, 0);
      return Math.max(0, partyCost - partyEq - partySub);
    }

    return { totalNeed: totalNeed, reserve: reserve, equity: equity, confirmedSubs: confirmedSubs,
      confirmedLoans: confirmedLoans, paid: paid, gap: gap, totalRate: totalRate,
      gapW1: needByParty('w1'), gapW2: needByParty('w2') };
  }

  // ---------- Projektampel (mehrdimensional) -----------------------------
  // Statt einer einzelnen Kennzahl: getrennte Ampeln fuer Zeit, Kosten,
  // Buerokratie/Genehmigungen und Vergabe/Ausschreibungen - jede mit
  // eigenem, nachvollziehbarem Kriterium.
  function calcAmpel(data) {
    var prog = calcProgress(data);
    var costs = calcCosts(data);
    var trades = data.trades || [];

    // Zeit: Aufgabenfortschritt vs. Zeitfortschritt bis Erstbezug
    var zeitLevel = prog.diff >= 0 ? 'gruen' : prog.diff >= -10 ? 'gelb' : 'rot';
    var zeit = { level: zeitLevel, label: prog.risk, detail: 'Aufgaben ' + pct(prog.taskProgress) + ' vs. Zeit ' + pct(prog.timeToOcc) };

    // Kosten: Prognose vs. grobe Baseline-Schaetzung (+ Reserve)
    var baselinePlusReserve = costs.baseline * 1.12;
    var costRatio = costs.baseline > 0 ? costs.forecast / baselinePlusReserve : 0;
    var kostenLevel = costRatio <= 1.0 ? 'gruen' : costRatio <= 1.1 ? 'gelb' : 'rot';
    var kosten = { level: kostenLevel,
      label: costRatio <= 1.0 ? 'im Rahmen der Grobschätzung' : costRatio <= 1.1 ? 'leicht über Grobschätzung' : 'deutlich über Grobschätzung',
      detail: 'Prognose ' + euro(costs.forecast) + ' vs. Baseline+Reserve ' + euro(baselinePlusReserve) };

    // Buerokratie/Genehmigungen: offene Blocker in Grundlagen/Buerokratie/Foerderung
    var bueroCats = ['CAT-GRUND', 'CAT-BUERO', 'CAT-FOERD'];
    var bueroBlockers = prog.blockers.filter(function (t) { return bueroCats.indexOf(t.category_id) >= 0 || ['grundlagen', 'buerokratie', 'foerderung', 'bürokratie'].indexOf(low(t.phase)) >= 0; });
    var openBlockers = bueroBlockers.length;
    var bueroLevel = openBlockers === 0 ? 'gruen' : openBlockers <= 2 ? 'gelb' : 'rot';
    var buero = { level: bueroLevel,
      label: openBlockers === 0 ? 'keine offenen Genehmigungs-Blocker' : openBlockers + ' offene Blocker',
      detail: bueroBlockers.slice(0, 3).map(function (t) { return t.task; }).join(', ') || '–' };

    // Vergabe/Ausschreibung: Anteil vergebener/beauftragter Gewerke
    var totalTrades = trades.length || 1;
    var awardedTrades = trades.filter(function (t) { return low(t.status).indexOf('beauftragt') >= 0 || low(t.status).indexOf('vergeben') >= 0; }).length;
    var openTrades = trades.filter(function (t) { return low(t.status).indexOf('ausschreibung') >= 0 || low(t.status) === 'offen'; }).length;
    var awardRatio = awardedTrades / totalTrades;
    var daysToBuild = prog.daysToBuild;
    var vergabeLevel = awardRatio >= 0.5 ? 'gruen' : (daysToBuild > 45 ? 'gelb' : 'rot');
    var vergabe = { level: vergabeLevel,
      label: awardedTrades + ' von ' + totalTrades + ' Gewerken vergeben',
      detail: openTrades + ' Ausschreibungen offen, ' + daysToBuild + ' Tage bis Baubeginn' };

    var levels = [zeit.level, kosten.level, buero.level, vergabe.level];
    var overall = levels.indexOf('rot') >= 0 ? 'rot' : levels.indexOf('gelb') >= 0 ? 'gelb' : 'gruen';

    return { zeit: zeit, kosten: kosten, buero: buero, vergabe: vergabe, overall: overall };
  }

  // ---------- Saldo zwischen W1 und W2 (wer hat für wen vorgestreckt) ----
  // Für jede bezahlte Ist-Position: Zahler trägt den vollen Betrag, geschuldet
  // ist aber nur der eigene Kostenschlüssel-Anteil. Differenz = Ausgleich.
  function calcSaldo(data) {
    var costs = (data.cost_positions || []).filter(function (c) { return isTrue(c.paid) || low(c.status).indexOf('bezahlt') >= 0; });
    var paidByW1 = 0, paidByW2 = 0, oweW1 = 0, oweW2 = 0;
    var rows = [];
    costs.forEach(function (c) {
      var g = n(c.gross);
      var pb = low(c.paid_by || '');
      var payer = (pb.indexOf('ingrid') >= 0 || pb === 'w1') ? 'W1' : ((pb.indexOf('maxi') >= 0 || pb === 'w2') ? 'W2' : '');
      var w1 = shareOf(c, 'w1'), w2 = shareOf(c, 'w2');
      if (payer === 'W1') paidByW1 += g; else if (payer === 'W2') paidByW2 += g;
      oweW1 += w1; oweW2 += w2;
      rows.push({ item: c.item, gross: g, payer: payer, shareW1: w1, shareW2: w2, date: c.date, paidBy: c.paid_by });
    });
    var balanceW1 = paidByW1 - oweW1; // >0: W1 hat zu viel getragen
    var settle = balanceW1;           // Betrag, den W2 an W1 zahlen muss (wenn >0)
    return { paidByW1: paidByW1, paidByW2: paidByW2, oweW1: oweW1, oweW2: oweW2,
      balanceW1: balanceW1, settle: settle, rows: rows,
      direction: settle > 0.5 ? 'W2→W1' : (settle < -0.5 ? 'W1→W2' : 'ausgeglichen'),
      amount: Math.abs(settle) };
  }

  // ---------- Energie (dynamisch aus energy_inputs, formelbasiert) ------
  // overrides erlaubt Live-Schieberegler ohne Sheet-Schreibzugriff bei
  // jeder Bewegung: dieselbe Formel, nur mit temporär ersetzten Werten.
  function energyInputs(data) {
    var map = {};
    (data.energy_inputs || []).forEach(function (r) {
      var key = low(r.name).replace(/[^a-z0-9]+/g, '_');
      map[key] = { value: r.value, num: n(r.value), module: r.module, unit: r.unit, raw: r };
      if (r.input_id) map[low(r.input_id)] = map[key];
    });
    return map;
  }
  function pick(map, s, names, def) {
    for (var i = 0; i < names.length; i++) {
      var k = String(names[i]).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      for (var mk in map) { if (mk.indexOf(k) >= 0) return map[mk].num; }
    }
    if (s && s[names[0]] != null) return n(s[names[0]]);
    return def == null ? 0 : def;
  }

  function calcEnergy(data, scenario, overrides) {
    var s = settingsObj(data);
    var m = energyInputs(data);
    scenario = scenario || 'Pellet + WP';
    overrides = overrides || {};
    function val(key, names, def) { return overrides[key] != null ? overrides[key] : pick(m, s, names, def); }

    var roofUsable = pick(m, s, ['nutzbare_dachflaeche', 'nutzbare dachfläche', 'pv_roof'], n(s.pv_roof_gross_sw) - n(s.pv_roof_deduction_obstacles) || 32);
    var density = pick(m, s, ['pv_leistungsdichte', 'pv_power_density'], n(s.pv_power_density) || 0.19);
    var yieldPerKwp = pick(m, s, ['pvgis_ertrag', 'pvgis'], n(s.pvgis_yield_per_kwp) || 1296.61);
    var maxKwp = roofUsable * density;
    var pvKwp = val('pvKwp', ['pv_leistung', 'pv_kwp'], maxKwp) || maxKwp;
    // Auto-Default wird auf Dachmaximum begrenzt; ein expliziter Override
    // (Schieberegler) darf das Dachmaximum bewusst überschreiten (Was-wäre-wenn).
    if (overrides.pvKwp == null && pvKwp > maxKwp) pvKwp = maxKwp;
    var pvAnnual = pvKwp * yieldPerKwp;

    var hhW1 = pick(m, s, ['haushaltsstrom_w1', 'haushalt_w1'], 2800);
    var hhW2 = pick(m, s, ['haushaltsstrom_w2', 'haushalt_w2'], 2700);
    var household = val('household', ['haushaltsstrom'], (hhW1 + hhW2) || 5500);
    var evCount = val('evCount', ['e_autos', 'ev_anzahl'], 1);
    var evPerCar = pick(m, s, ['ev_verbrauch', 'ev_kwh'], 2500);
    var ev = evCount * evPerCar;
    var cooling = pick(m, s, ['klima', 'kuehlstrom'], 380);
    var cop = pick(m, s, ['cop', 'jaz'], 3.6);
    var heatDemand = val('heatDemand', ['heizwaermebedarf', 'heizwärmebedarf'], 14000);
    var pelletShareDefault = scenario === 'nur WP' ? 0 : (scenario === 'winteroptimiert' ? 0.55 : pick(m, s, ['pelletanteil'], 0.35));
    var pelletShare = overrides.pelletShare != null ? overrides.pelletShare : pelletShareDefault;
    var wpHeat = heatDemand * (1 - pelletShare);
    var wpElec = wpHeat / cop;
    var pelletHeat = heatDemand * pelletShare;
    var pelletKg = pelletHeat / 4.8; // kWh/kg
    var battery = val('battery', ['batterie'], 12);

    var totalElec = household + ev + cooling + wpElec + 200;
    // Direktverbrauch + Batterie-Effekt (vereinfachtes Monatsmodell)
    var directFrac = 0.34, battFrac = clamp(Math.log1p(battery) * 0.09, 0, 0.30);
    if (scenario === 'autarkieoptimiert') battFrac = clamp(battFrac + 0.06, 0, 0.4);
    var selfUse = Math.min(pvAnnual * (directFrac + battFrac), totalElec);
    var autarky = clamp(selfUse / totalElec * 100, 0, 95);
    var grid = Math.max(0, totalElec - selfUse);
    var feedIn = Math.max(0, pvAnnual - selfUse);

    var elecPrice = val('elecPrice', ['strompreis'], 0.28);
    var feedPrice = pick(m, s, ['einspeise'], 0.08);
    var pelletPrice = pick(m, s, ['pelletpreis'], 0.34); // €/kg
    var energyCost = grid * elecPrice - feedIn * feedPrice + pelletKg * pelletPrice;

    var batteryRec = maxKwp < 6 ? '5–8 kWh' : maxKwp < 9 ? '8–12 kWh' : '10–14 kWh';

    return { scenario: scenario, usable: roofUsable, maxKwp: maxKwp, pvKwp: pvKwp, pvAnnual: pvAnnual,
      household: household, ev: ev, cooling: cooling, wpElec: wpElec, total: totalElec,
      pelletKg: pelletKg, pelletShare: pelletShare, wpCoverage: (1 - pelletShare) * 100, autarky: autarky, grid: grid, feedIn: feedIn,
      selfUse: selfUse, energyCost: energyCost, battery: battery, heatDemand: heatDemand, evCount: evCount, elecPrice: elecPrice,
      batteryRecommendation: batteryRec };
  }

  function scenarios(data) {
    return ['Pellet + WP', 'nur WP', 'autarkieoptimiert', 'winteroptimiert'].map(function (sc) { return calcEnergy(data, sc); });
  }

  function monthlyPV(data, overrides) {
    var e = calcEnergy(data, null, overrides);
    var shape = [4.6, 6.2, 9.1, 10.4, 11.6, 12.1, 12.4, 11.2, 9.0, 6.6, 4.4, 3.8]; // % je Monat ~ Summe 100+
    var sum = shape.reduce(function (a, b) { return a + b; }, 0);
    return shape.map(function (v) { return e.pvAnnual * v / sum; });
  }
  function monthlyLoad(data, overrides) {
    var e = calcEnergy(data, null, overrides);
    var shape = [11.5, 10.6, 9.2, 7.3, 6.4, 6.1, 6.3, 6.2, 6.6, 8.3, 10.4, 11.1];
    var sum = shape.reduce(function (a, b) { return a + b; }, 0);
    return shape.map(function (v) { return e.total * v / sum; });
  }

  window.HinterSunCalc = {
    euro: euro, num: n, pct: pct, settingsObj: settingsObj, clamp: clamp, shareOf: shareOf, splitPctOf: splitPctOf,
    calcProgress: calcProgress, calcBudget: calcBudget, calcCosts: calcCosts, compareGroups: compareGroups,
    calcFinancing: calcFinancing, calcAmpel: calcAmpel, calcSaldo: calcSaldo, calcEnergy: calcEnergy, scenarios: scenarios,
    monthlyPV: monthlyPV, monthlyLoad: monthlyLoad, annuity: annuity
  };
})();
