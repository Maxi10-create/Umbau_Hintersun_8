/*
=========================================================
 Umbau Hintersun 8 – Charts
=========================================================
*/
(function () {
  var charts = {};
  function destroy(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }
  function make(id, type, data, options) {
    var el = document.getElementById(id); if (!el || !window.Chart) return;
    destroy(id);
    charts[id] = new Chart(el, {
      type: type, data: data,
      options: Object.assign({
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#dbe8fa' } }, tooltip: { mode: 'index', intersect: false } },
        scales: { x: { ticks: { color: '#9fb1c9' }, grid: { color: 'rgba(255,255,255,.06)' } }, y: { ticks: { color: '#9fb1c9' }, grid: { color: 'rgba(255,255,255,.06)' } } }
      }, options || {})
    });
  }

  function renderAll(data, calc, energyOverrides) {
    var months = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    var costs = calc.calcCosts(data), fin = calc.calcFinancing(data), energy = calc.calcEnergy(data, null, energyOverrides), prog = calc.calcProgress(data);
    var pv = calc.monthlyPV(data, energyOverrides), load = calc.monthlyLoad(data, energyOverrides);
    var aut = months.map(function (m, i) { return Math.min(95, Math.round(Math.min(pv[i], load[i]) / (load[i] || 1) * 100)); });

    make('chart-costs', 'doughnut', { labels: Object.keys(costs.byCat), datasets: [{ data: Object.values(costs.byCat), backgroundColor: ['#66e3c4', '#5fb1ff', '#b78cff', '#ffb84d', '#ff6b6b', '#51d88a', '#ffe066', '#8ac6ff'] }] }, { scales: {} });

    make('chart-finance', 'bar', { labels: ['Eigenkapital', 'Förderungen', 'Kredite', 'Lücke'], datasets: [{ label: 'EUR', data: [fin.equity, fin.confirmedSubs, fin.confirmedLoans, fin.gap], backgroundColor: ['#66e3c4', '#51d88a', '#5fb1ff', '#ff6b6b'] }] }, { plugins: { legend: { display: false } } });

    make('chart-month', 'bar', { labels: months, datasets: [{ label: 'PV', data: pv, backgroundColor: 'rgba(102,227,196,.65)' }, { label: 'Last', data: load, backgroundColor: 'rgba(95,177,255,.45)' }] }, {});

    make('chart-autarky', 'line', { labels: months, datasets: [
      { label: 'Autarkie %', data: aut, borderColor: '#66e3c4', backgroundColor: 'rgba(102,227,196,.15)', tension: .35, fill: true },
      { label: 'Ziel 50%', data: months.map(function () { return 50; }), borderColor: '#ffb84d', borderDash: [6, 6], pointRadius: 0 },
      { label: 'Ziel 65%', data: months.map(function () { return 65; }), borderColor: '#51d88a', borderDash: [6, 6], pointRadius: 0 }
    ] }, { scales: { y: { min: 0, max: 100, ticks: { color: '#9fb1c9', callback: function (v) { return v + '%'; } } } } });

    make('chart-progress', 'bar', { labels: ['Zeit bis Baubeginn', 'Aufgaben', 'Zeit bis Erstbezug'], datasets: [{ label: '%', data: [prog.timeToBuild, prog.taskProgress, prog.timeToOcc], backgroundColor: ['#5fb1ff', '#66e3c4', '#b78cff'] }] }, { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100, ticks: { callback: function (v) { return v + '%'; }, color: '#9fb1c9' } } } });

    make('chart-energy', 'bar', { labels: ['Strombedarf', 'PV-Ertrag', 'Netzbezug', 'Einspeisung'], datasets: [{ label: 'kWh/a', data: [energy.total, energy.pvAnnual, energy.grid, energy.feedIn], backgroundColor: ['#5fb1ff', '#66e3c4', '#ff6b6b', '#ffe066'] }] }, { plugins: { legend: { display: false } } });

    var batt = [0, 5, 8, 10, 12, 14, 16, 20].map(function (b) { return Math.min(85, Math.round(30 + Math.log1p(b) * 12 + (energy.maxKwp - 7) * 2)); });
    make('chart-battery', 'line', { labels: [0, 5, 8, 10, 12, 14, 16, 20].map(function (x) { return x + ' kWh'; }), datasets: [{ label: 'Autarkie %', data: batt, borderColor: '#66e3c4', backgroundColor: 'rgba(102,227,196,.16)', fill: true, tension: .35 }] }, { scales: { y: { min: 0, max: 100, ticks: { callback: function (v) { return v + '%'; }, color: '#9fb1c9' } } } });
  }

  window.HinterSunCharts = { renderAll: renderAll };
})();
