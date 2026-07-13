/*
=========================================================
 Umbau Hintersun 8 – Calculations
 - gestufte Kostenlogik (Schätzung/Auftrag/Rechnung/Zahlung/Prognose)
 - Prognose je Budgetblock = max(...) ohne Doppelzählung
 - flexible Aufteilung W1/W2 in %
 - dynamische Energie-Auslegung aus energy_inputs (live)
=========================================================
*/
(function () {
  var euro = function (v) { return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0)); };
  var num = function (v) { return Number(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')) || Number(v) || 0; };
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

  // ---------- Aufteilung W1/W2 (flexibel) --------------------------------
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
    var diff = taskProgress - timeToOcc;
    var risk = diff >= 5 ? 'im Plan' : diff >= 0 ? 'leicht hinter Plan' : diff >= -10 ? 'kritisch' : 'Zieltermin gefährdet';
    return { timeToBuild: timeToBuild, timeToOcc: timeToOcc, taskProgress: taskProgress, critical: critical, diff: diff, risk: risk,
      daysToBuild: daysBetween(today, build), daysToOcc: daysBetween(today, occ) };
  }

  // ---------- Kosten je Budgetblock (gestuft) ---------------------------
  // Prognose = max(aktive Schätzung, aktive Aufträge, Rechnung, Zahlung)
  function calcBudget(data) {
    var costs = (data.cost_positions || []).filter(isActive);
    var estimates = (data.budget_estimates || []).filter(isActive);
    var payments = data.payments || [];
    var blocks = {};
    function block(name) {
      name = name || 'Sonstiges';
      if (!blocks[name]) blocks[name] = { block: name, estimate: 0, ordered: 0, invoiced: 0, paid: 0 };
      return blocks[name];
    }
    // Schätzungen (nur aktive Version je Block zählt – wir nehmen Maximum aktiver Versionen)
    estimates.forEach(function (e) {
      var b = block(e.budget_block);
      b.estimate = Math.max(b.estimate, n(e.amount_gross));
    });
    // Kostenpositionen nach Stufe
    costs.forEach(function (c) {
      var b = block(c.category);
      var st = low(c.source_type), stat = low(c.status);
      var g = n(c.gross);
      if (st === 'grobkostenschätzung' || st === 'detailkostenschätzung' || stat.indexOf('schätzung') >= 0) {
        b.estimate = Math.max(b.estimate, g);
      } else if (st === 'auftrag' || stat.indexOf('beauftragt') >= 0 || stat === 'auftrag erteilt' || stat === 'in arbeit') {
        b.ordered += g;
      } else if (st === 'rechnung' || stat.indexOf('rechnung') >= 0) {
        b.invoiced += g;
      }
      if (isTrue(c.paid) || stat.indexOf('bezahlt') >= 0) b.paid += g;
    });
    // Zahlungen zusätzlich verbuchen (falls nicht in cost_positions gespiegelt)
    payments.forEach(function (p) {
      var cid = p.related_cost_id;
      var c = cid && (data.cost_positions || []).find(function (x) { return String(x.cost_id) === String(cid); });
      var name = c ? c.category : 'Sonstiges';
      // nur zählen, wenn nicht schon über cost_positions.paid erfasst
    });

    var rows = Object.keys(blocks).map(function (k) {
      var b = blocks[k];
      b.forecast = Math.max(b.estimate, b.ordered, b.invoiced, b.paid);
      b.diff = b.forecast - b.paid;
      return b;
    });
    var totals = rows.reduce(function (a, b) {
      a.estimate += b.estimate; a.ordered += b.ordered; a.invoiced += b.invoiced; a.paid += b.paid; a.forecast += b.forecast; return a;
    }, { estimate: 0, ordered: 0, invoiced: 0, paid: 0, forecast: 0 });
    return { rows: rows.sort(function (a, b) { return b.forecast - a.forecast; }), totals: totals };
  }

  function calcCosts(data) {
    var budget = calcBudget(data);
    var active = (data.cost_positions || []).filter(isActive);
    var gross = active.reduce(function (a, c) { return a + n(c.gross); }, 0);
    var w1 = active.reduce(function (a, c) { return a + shareOf(c, 'w1'); }, 0);
    var w2 = active.reduce(function (a, c) { return a + shareOf(c, 'w2'); }, 0);
    var byCat = {}; budget.rows.forEach(function (b) { byCat[b.block] = b.forecast; });
    return { gross: gross, forecast: budget.totals.forecast, ordered: budget.totals.ordered,
      invoiced: budget.totals.invoiced, paid: budget.totals.paid, estimate: budget.totals.estimate,
      open: budget.totals.forecast - budget.totals.paid, byCat: byCat, w1: w1, w2: w2, budget: budget };
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
      var partyEq = fin.filter(function (f) { return low(f.type).indexOf('eigenkapital') >= 0 && low(f.party) === p; }).reduce(function (a, f) { return a + n(f.amount); }, 0);
      var partySub = subs.filter(function (x) { return low(x.party) === p; }).reduce(function (a, x) { return a + n(x.confirmed_amount); }, 0);
      return Math.max(0, partyCost - partyEq - partySub);
    }

    return { totalNeed: totalNeed, reserve: reserve, equity: equity, confirmedSubs: confirmedSubs,
      confirmedLoans: confirmedLoans, paid: paid, gap: gap, totalRate: totalRate,
      gapW1: needByParty('w1'), gapW2: needByParty('w2') };
  }

  // ---------- Energie (dynamisch aus energy_inputs) ---------------------
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

  function calcEnergy(data, scenario) {
    var s = settingsObj(data);
    var m = energyInputs(data);
    scenario = scenario || 'Pellet + WP';

    var roofUsable = pick(m, s, ['nutzbare_dachflaeche', 'nutzbare dachfläche', 'pv_roof'], n(s.pv_roof_gross_sw) - n(s.pv_roof_deduction_obstacles) || 32);
    var density = pick(m, s, ['pv_leistungsdichte', 'pv_power_density'], n(s.pv_power_density) || 0.19);
    var yieldPerKwp = pick(m, s, ['pvgis_ertrag', 'pvgis'], n(s.pvgis_yield_per_kwp) || 1296.61);
    var maxKwp = roofUsable * density;
    var pvKwp = pick(m, s, ['pv_leistung', 'pv_kwp'], maxKwp) || maxKwp;
    if (pvKwp > maxKwp) pvKwp = maxKwp;
    var pvAnnual = pvKwp * yieldPerKwp;

    var hhW1 = pick(m, s, ['haushaltsstrom_w1', 'haushalt_w1'], 2800);
    var hhW2 = pick(m, s, ['haushaltsstrom_w2', 'haushalt_w2'], 2700);
    var household = (hhW1 + hhW2) || pick(m, s, ['haushaltsstrom'], 5500);
    var evCount = pick(m, s, ['e_autos', 'ev_anzahl'], 1);
    var evPerCar = pick(m, s, ['ev_verbrauch', 'ev_kwh'], 2500);
    var ev = evCount * evPerCar;
    var cooling = pick(m, s, ['klima', 'kuehlstrom'], 380);
    var cop = pick(m, s, ['cop', 'jaz'], 3.6);
    var heatDemand = pick(m, s, ['heizwaermebedarf', 'heizwärmebedarf'], 14000);
    var pelletShare = scenario === 'nur WP' ? 0 : (scenario === 'winteroptimiert' ? 0.55 : pick(m, s, ['pelletanteil'], 0.35));
    var wpHeat = heatDemand * (1 - pelletShare);
    var wpElec = wpHeat / cop;
    var pelletHeat = heatDemand * pelletShare;
    var pelletKg = pelletHeat / 4.8; // kWh/kg
    var battery = pick(m, s, ['batterie'], 12);

    var totalElec = household + ev + cooling + wpElec + 200;
    // Direktverbrauch + Batterie-Effekt (vereinfachtes Monatsmodell)
    var directFrac = 0.34, battFrac = clamp(Math.log1p(battery) * 0.09, 0, 0.30);
    if (scenario === 'autarkieoptimiert') battFrac = clamp(battFrac + 0.06, 0, 0.4);
    var selfUse = Math.min(pvAnnual * (directFrac + battFrac), totalElec);
    var autarky = clamp(selfUse / totalElec * 100, 0, 95);
    var grid = Math.max(0, totalElec - selfUse);
    var feedIn = Math.max(0, pvAnnual - selfUse);

    var elecPrice = pick(m, s, ['strompreis'], 0.28);
    var feedPrice = pick(m, s, ['einspeise'], 0.08);
    var pelletPrice = pick(m, s, ['pelletpreis'], 0.34); // €/kg
    var energyCost = grid * elecPrice - feedIn * feedPrice + pelletKg * pelletPrice;

    var batteryRec = maxKwp < 6 ? '5–8 kWh' : maxKwp < 9 ? '8–12 kWh' : '10–14 kWh';

    return { scenario: scenario, usable: roofUsable, maxKwp: maxKwp, pvKwp: pvKwp, pvAnnual: pvAnnual,
      household: household, ev: ev, cooling: cooling, wpElec: wpElec, total: totalElec,
      pelletKg: pelletKg, wpCoverage: (1 - pelletShare) * 100, autarky: autarky, grid: grid, feedIn: feedIn,
      selfUse: selfUse, energyCost: energyCost, battery: battery, batteryRecommendation: batteryRec };
  }

  function scenarios(data) {
    return ['Pellet + WP', 'nur WP', 'autarkieoptimiert', 'winteroptimiert'].map(function (sc) { return calcEnergy(data, sc); });
  }

  function monthlyPV(data) {
    var e = calcEnergy(data);
    var shape = [4.6, 6.2, 9.1, 10.4, 11.6, 12.1, 12.4, 11.2, 9.0, 6.6, 4.4, 3.8]; // % je Monat ~ Summe 100+
    var sum = shape.reduce(function (a, b) { return a + b; }, 0);
    return shape.map(function (v) { return e.pvAnnual * v / sum; });
  }
  function monthlyLoad(data) {
    var e = calcEnergy(data);
    var shape = [11.5, 10.6, 9.2, 7.3, 6.4, 6.1, 6.3, 6.2, 6.6, 8.3, 10.4, 11.1];
    var sum = shape.reduce(function (a, b) { return a + b; }, 0);
    return shape.map(function (v) { return e.total * v / sum; });
  }

  window.HinterSunCalc = {
    euro: euro, num: n, pct: pct, settingsObj: settingsObj, clamp: clamp, shareOf: shareOf,
    calcProgress: calcProgress, calcBudget: calcBudget, calcCosts: calcCosts, compareGroups: compareGroups,
    calcFinancing: calcFinancing, calcEnergy: calcEnergy, scenarios: scenarios,
    monthlyPV: monthlyPV, monthlyLoad: monthlyLoad, annuity: annuity
  };
})();
