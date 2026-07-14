/*
=========================================================
 Umbau Hintersun 8 – Gantt / Zeitplan
 Horizontaler Zeitstrahl mit Monatsachse und Heute-Linie.
 - Termine (fixes Datum, task_type=Termin): als Raute-Meilenstein
 - Vorgänge (mit Dauer, task_type=Vorgang): als Balken
 - Farbe je Hauptkategorie (task_categories: category_id -> color)
 - kritischer Pfad, Blocker, Klick zum Bearbeiten
 - nach Kategorien gruppierte Zeilen (Swimlanes)
=========================================================
*/
(function () {
  var C = null;
  function calc() { return window.HinterSunCalc; }
  function d(x) { var t = new Date(x); return isNaN(t) ? null : t; }
  function low(v) { return String(v || '').toLowerCase(); }
  function isTermin(t) { return low(t.task_type) === 'termin' || (t.start_date && t.due_date && t.start_date === t.due_date); }

  function statusMod(status) {
    var s = low(status);
    if (s.indexOf('erledigt') >= 0 || s.indexOf('bezahlt') >= 0) return 'done';
    if (s.indexOf('blockiert') >= 0) return 'blocked';
    if (s.indexOf('arbeit') >= 0) return 'active';
    if (s.indexOf('wartet') >= 0 || s.indexOf('offen') >= 0 || s.indexOf('rückfrage') >= 0 || s.indexOf('prüfen') >= 0) return 'wait';
    return 'plan';
  }

  // Kategorien-Map: category_id -> {name,color}
  function catMap(data) {
    var m = {};
    (data.task_categories || []).forEach(function (c) { m[c.category_id] = { name: c.name, color: c.color || '#3E6B8B' }; });
    return m;
  }

  // sehr einfacher kritischer Pfad: längste Kette nach Dauer über depends_on
  function criticalPath(tasks) {
    var byId = {}; tasks.forEach(function (t) { byId[t.task_id] = t; });
    var memo = {}, best = { len: -1, id: null, path: [] };
    function dur(t) {
      var a = d(t.start_date), b = d(t.due_date);
      return (a && b) ? Math.max(1, (b - a) / 86400000) : 1;
    }
    function walk(id, seen) {
      if (memo[id]) return memo[id];
      var t = byId[id]; if (!t || seen[id]) return { len: 0, path: [] };
      seen[id] = true;
      var deps = String(t.depends_on || '').split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean);
      var bestDep = { len: 0, path: [] };
      deps.forEach(function (dp) { var r = walk(dp, Object.assign({}, seen)); if (r.len > bestDep.len) bestDep = r; });
      var res = { len: bestDep.len + dur(t), path: bestDep.path.concat([id]) };
      memo[id] = res; return res;
    }
    tasks.forEach(function (t) { var r = walk(t.task_id, {}); if (r.len > best.len) best = { len: r.len, id: t.task_id, path: r.path }; });
    var set = {}; (best.path || []).forEach(function (id) { set[id] = true; });
    return set;
  }

  function render(container, tasks, opts) {
    opts = opts || {};
    C = calc();
    if (!container) return;
    var data = opts.data || {};
    var cats = catMap(data);
    tasks = (tasks || []).filter(function (t) { return t.task; });
    if (opts.filter) tasks = tasks.filter(opts.filter);

    // Datumsbereich
    var dates = [];
    tasks.forEach(function (t) { var a = d(t.start_date), b = d(t.due_date); if (a) dates.push(a); if (b) dates.push(b); });
    var today = new Date();
    dates.push(today);
    if (opts.buildDate) { var bd = d(opts.buildDate); if (bd) dates.push(bd); }
    if (opts.occDate) { var od = d(opts.occDate); if (od) dates.push(od); }
    if (!dates.length) { container.innerHTML = '<p class="muted">Noch keine terminierten Aufgaben. Aufgabe anlegen und Start/Ende setzen.</p>'; return; }
    var min = new Date(Math.min.apply(null, dates)), max = new Date(Math.max.apply(null, dates));
    min = new Date(min.getFullYear(), min.getMonth(), 1);
    max = new Date(max.getFullYear(), max.getMonth() + 2, 0);
    var span = max - min;
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function xPct(dt) { return clamp((d(dt) - min) / span * 100, 0, 100); }

    // Monatsraster
    var months = [];
    var cur = new Date(min);
    while (cur <= max) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
    var mNames = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    var headCells = months.map(function (mo) {
      var w = 100 / months.length;
      var jan = mo.getMonth() === 0 ? ' year-start' : '';
      return '<div class="g-month' + jan + '" style="width:' + w + '%">' + mNames[mo.getMonth()] + ' ' + String(mo.getFullYear()).slice(2) + '</div>';
    }).join('');
    var gridLines = months.map(function (mo) {
      return '<div class="g-grid" style="left:' + xPct(mo) + '%"></div>';
    }).join('');

    var crit = criticalPath(tasks);
    var todayPct = xPct(today);

    // nach Kategorie gruppieren (Swimlanes), Reihenfolge nach category sort
    var order = (data.task_categories || []).slice().sort(function (a, b) { return (C.num(a.sort) || 99) - (C.num(b.sort) || 99); }).map(function (c) { return c.category_id; });
    var groups = {};
    tasks.forEach(function (t) { var k = t.category_id || 'ohne'; (groups[k] = groups[k] || []).push(t); });
    var groupKeys = order.filter(function (k) { return groups[k]; });
    Object.keys(groups).forEach(function (k) { if (groupKeys.indexOf(k) < 0) groupKeys.push(k); });

    function taskRow(t) {
      var a = d(t.start_date), b = d(t.due_date);
      var cat = cats[t.category_id] || { name: t.phase || '', color: '#7A8B99' };
      var mod = statusMod(t.status);
      var isCrit = crit[t.task_id];
      var isBlk = String(t.is_blocker).toUpperCase() === 'TRUE' || mod === 'blocked';
      var termin = isTermin(t);
      var bar;
      var titleTxt = t.task + (t.owner ? ' · ' + t.owner : '') + ' (' + (t.start_date || '?') + (termin ? '' : ' → ' + (t.due_date || '?')) + ')';
      if (termin && a) {
        // Meilenstein / fixer Termin -> Raute
        var lp = xPct(a);
        bar = '<div class="g-milestone-pt ' + mod + (isCrit ? ' crit' : '') + (isBlk ? ' blocker' : '') + '" ' +
          'style="left:' + lp + '%;--catcol:' + cat.color + '" data-id="' + t.task_id + '" title="' + escapeAttr(titleTxt) + '">' +
          '<span class="g-diamond"></span></div>' +
          '<span class="g-pt-label" style="left:' + lp + '%">' + escapeHtml(t.task) + '</span>';
      } else {
        if (!a && b) a = new Date(b.getTime() - 5 * 86400000);
        if (a && !b) b = new Date(a.getTime() + 5 * 86400000);
        var left = a ? xPct(a) : 0, right = b ? xPct(b) : left + 3;
        var width = Math.max(1.5, right - left);
        bar = '<div class="g-bar ' + mod + (isCrit ? ' crit' : '') + (isBlk ? ' blocker' : '') + '" ' +
          'style="left:' + left + '%;width:' + width + '%;--catcol:' + cat.color + '" data-id="' + t.task_id + '" ' +
          'title="' + escapeAttr(titleTxt) + '"><span class="g-bar-label">' + escapeHtml(t.task) + '</span></div>';
      }
      return '<div class="g-row">' +
        '<div class="g-name" data-id="' + t.task_id + '">' +
          '<span class="g-type-ico">' + (termin ? '◆' : '▬') + '</span>' + escapeHtml(t.task) +
          '<small>' + escapeHtml(t.owner || '') + (isCrit ? ' · kritisch' : '') + (isBlk ? ' · Blocker' : '') + '</small></div>' +
        '<div class="g-track">' + gridLines + bar + '</div></div>';
    }

    var body = groupKeys.map(function (k) {
      var cat = cats[k] || { name: 'ohne Kategorie', color: '#7A8B99' };
      var rows = groups[k].sort(function (a, b) { return String(a.start_date).localeCompare(String(b.start_date)); }).map(taskRow).join('');
      return '<div class="g-lane">' +
        '<div class="g-lane-head" style="--catcol:' + cat.color + '"><span class="g-lane-dot"></span>' + escapeHtml(cat.name) + '</div>' +
        rows + '</div>';
    }).join('');

    var markers = '<div class="g-today" style="left:' + todayPct + '%"><span>heute</span></div>';
    if (opts.buildDate && d(opts.buildDate)) markers += '<div class="g-vmark build" style="left:' + xPct(opts.buildDate) + '%"><span>Baubeginn</span></div>';
    if (opts.occDate && d(opts.occDate)) markers += '<div class="g-vmark occ" style="left:' + xPct(opts.occDate) + '%"><span>Erstbezug</span></div>';

    var catLegend = (data.task_categories || []).slice().sort(function (a, b) { return (C.num(a.sort) || 99) - (C.num(b.sort) || 99); })
      .map(function (c) { return '<span class="g-cat-leg"><span class="dot" style="background:' + (c.color || '#888') + '"></span>' + escapeHtml(c.name) + '</span>'; }).join('');

    container.innerHTML =
      '<div class="gantt">' +
        '<div class="g-head"><div class="g-name-head">Aufgabe</div><div class="g-months">' + headCells +
          '<div class="g-overlay">' + markers + '</div></div></div>' +
        '<div class="g-body">' + body + '</div>' +
        '<div class="g-legend">' +
          '<div class="g-legend-row"><strong>Typ:</strong> <span class="g-type-ico">◆</span> Termin (fixes Datum) &nbsp; <span class="g-type-ico">▬</span> Vorgang (mit Dauer)</div>' +
          '<div class="g-legend-row"><strong>Kategorie:</strong> ' + catLegend + '</div>' +
          '<div class="g-legend-row"><strong>Status:</strong> <span class="dot plan"></span>geplant <span class="dot active"></span>in Arbeit <span class="dot wait"></span>wartet <span class="dot blocked"></span>blockiert <span class="dot done"></span>erledigt <span class="dot crit-dot"></span>kritischer Pfad</div>' +
        '</div>' +
      '</div>';

    container.querySelectorAll('[data-id]').forEach(function (el) {
      el.addEventListener('click', function () { if (opts.onClick) opts.onClick(el.getAttribute('data-id')); });
    });
  }

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

  window.HinterSunGantt = { render: render };
})();
