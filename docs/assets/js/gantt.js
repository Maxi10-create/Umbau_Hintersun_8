/*
=========================================================
 Umbau Hintersun 8 – Gantt
 Echter horizontaler Zeitstrahl mit Monatsachse, Heute-Linie,
 Statusfarben, Abhängigkeiten, kritischem Pfad, Klick-zum-Bearbeiten.
=========================================================
*/
(function () {
  var C = null;
  function calc() { return window.HinterSunCalc; }
  function num(v) { return calc().num(v); }
  function d(x) { var t = new Date(x); return isNaN(t) ? null : t; }
  function low(v) { return String(v || '').toLowerCase(); }

  function statusColor(status) {
    var s = low(status);
    if (s.indexOf('erledigt') >= 0 || s.indexOf('bezahlt') >= 0) return 'done';
    if (s.indexOf('blockiert') >= 0) return 'blocked';
    if (s.indexOf('arbeit') >= 0) return 'active';
    if (s.indexOf('wartet') >= 0 || s.indexOf('offen') >= 0 || s.indexOf('rückfrage') >= 0) return 'wait';
    return 'plan';
  }

  // sehr einfacher kritischer Pfad: längste Kette nach Dauer über depends_on
  function criticalPath(tasks) {
    var byId = {}; tasks.forEach(function (t) { byId[t.task_id] = t; });
    var memo = {}, best = { len: -1, id: null };
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
    tasks = (tasks || []).filter(function (t) { return t.task; });
    if (opts.filter) tasks = tasks.filter(opts.filter);
    // Datumsbereich bestimmen
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
    function xPct(dt) { return clamp((d(dt) - min) / span * 100, 0, 100); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // Monatsraster
    var months = [];
    var cur = new Date(min);
    while (cur <= max) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
    var mNames = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    var headCells = months.map(function (mo, i) {
      var w = 100 / months.length;
      return '<div class="g-month" style="width:' + w + '%">' + mNames[mo.getMonth()] + ' ' + String(mo.getFullYear()).slice(2) + '</div>';
    }).join('');
    var gridLines = months.map(function (mo) {
      return '<div class="g-grid" style="left:' + xPct(mo) + '%"></div>';
    }).join('');

    var crit = criticalPath(tasks);
    var todayPct = xPct(today);

    var rows = tasks.map(function (t) {
      var a = d(t.start_date), b = d(t.due_date);
      if (!a && b) a = new Date(b.getTime() - 5 * 86400000);
      if (a && !b) b = new Date(a.getTime() + 5 * 86400000);
      var left = a ? xPct(a) : 0, right = b ? xPct(b) : left + 3;
      var width = Math.max(1.2, right - left);
      var col = statusColor(t.status);
      var isCrit = crit[t.task_id];
      var isBlocker = String(t.is_blocker).toUpperCase() === 'TRUE' || col === 'blocked';
      var label = (t.task || '') + (t.owner ? ' · ' + t.owner : '');
      var bar = a ? ('<div class="g-bar ' + col + (isCrit ? ' crit' : '') + (isBlocker ? ' blocker' : '') + '" ' +
        'style="left:' + left + '%;width:' + width + '%" data-id="' + t.task_id + '" ' +
        'title="' + escapeAttr(label + ' (' + (t.start_date || '?') + ' → ' + (t.due_date || '?') + ')') + '">' +
        '<span class="g-bar-label">' + escapeHtml(t.task) + '</span></div>') :
        '<div class="g-bar plan" style="left:0;width:2%" data-id="' + t.task_id + '" title="ohne Datum"></div>';
      return '<div class="g-row">' +
        '<div class="g-name" data-id="' + t.task_id + '">' + escapeHtml(t.task) +
          '<small>' + escapeHtml(t.owner || '') + (isCrit ? ' · kritisch' : '') + '</small></div>' +
        '<div class="g-track">' + gridLines + bar + '</div></div>';
    }).join('');

    var markers = '<div class="g-today" style="left:' + todayPct + '%"><span>heute</span></div>';
    if (opts.buildDate && d(opts.buildDate)) markers += '<div class="g-milestone build" style="left:' + xPct(opts.buildDate) + '%"><span>Baubeginn</span></div>';
    if (opts.occDate && d(opts.occDate)) markers += '<div class="g-milestone occ" style="left:' + xPct(opts.occDate) + '%"><span>Erstbezug</span></div>';

    container.innerHTML =
      '<div class="gantt">' +
        '<div class="g-head"><div class="g-name-head">Aufgabe</div><div class="g-months">' + headCells +
          '<div class="g-overlay">' + markers + '</div></div></div>' +
        '<div class="g-body">' + rows + '</div>' +
        '<div class="g-legend"><span class="dot plan"></span>geplant <span class="dot active"></span>in Arbeit ' +
        '<span class="dot wait"></span>wartet <span class="dot blocked"></span>blockiert ' +
        '<span class="dot done"></span>erledigt <span class="dot crit-dot"></span>kritischer Pfad</div>' +
      '</div>';

    container.querySelectorAll('[data-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (opts.onClick) opts.onClick(el.getAttribute('data-id'));
      });
    });
  }

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

  window.HinterSunGantt = { render: render };
})();
