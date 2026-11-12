/* Sidvin table pagination: pages every list table in the app (search and filters still cover all rows). */
(() => {
  const SIZES = [10, 25, 50, 100];
  const KEY = 'sidvinPageSize';
  const state = new WeakMap(); // table -> {page, count, pager}
  const pagers = new Set();
  let size = 25;
  try { const v = Number(localStorage.getItem(KEY)); if (SIZES.includes(v)) size = v; } catch (e) {}

  const rowsOf = (t) => {
    const out = [];
    for (const b of t.tBodies) for (const r of b.rows) out.push(r);
    // a single "no records" row spanning all columns is not a data row
    if (out.length === 1 && out[0].cells.length === 1 && out[0].cells[0].colSpan > 1) return [];
    return out;
  };
  const skip = (t) => t.closest('form, [data-no-paginate], .sidvin-no-paginate') || t.closest('[role="dialog"]');

  const btn = (label, on, disabled, active) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = 'sp-btn' + (active ? ' sp-on' : '');
    b.disabled = !!disabled;
    if (!disabled) b.addEventListener('click', on);
    return b;
  };
  const pageList = (cur, total) => {
    const set = new Set([1, total, cur - 1, cur, cur + 1]);
    const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out = [];
    nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push('\u2026'); out.push(n); });
    return out;
  };

  const render = (t, st, rows) => {
    const total = Math.max(1, Math.ceil(rows.length / size));
    if (st.page > total) st.page = total;
    const start = (st.page - 1) * size;
    rows.forEach((r, i) => {
      const hide = i < start || i >= start + size;
      if (hide !== r.hidden) r.hidden = hide;
    });
    let p = st.pager;
    if (!p || !p.isConnected) {
      p = document.createElement('div');
      p.className = 'sp-pager';
      p.setAttribute('data-export-ignore', 'true');
      const anchor = t.closest('.overflow-x-auto, .overflow-auto') || t;
      anchor.insertAdjacentElement('afterend', p);
      st.pager = p;
      pagers.add(p);
      p._table = t;
    }
    p.textContent = '';
    const info = document.createElement('span');
    info.className = 'sp-info';
    info.textContent = `Showing ${start + 1}\u2013${Math.min(start + size, rows.length)} of ${rows.length}`;
    const sizeWrap = document.createElement('label');
    sizeWrap.className = 'sp-size';
    sizeWrap.append('Rows ');
    const sel = document.createElement('select');
    SIZES.forEach((n) => { const o = document.createElement('option'); o.value = n; o.textContent = n; if (n === size) o.selected = true; sel.append(o); });
    sel.addEventListener('change', () => {
      size = Number(sel.value);
      try { localStorage.setItem(KEY, String(size)); } catch (e) {}
      st.page = 1;
      applyAll();
    });
    sizeWrap.append(sel);
    const nav = document.createElement('div');
    nav.className = 'sp-nav';
    const go = (n) => () => { st.page = n; applyAll(); const a = t.closest('.overflow-x-auto, .overflow-auto') || t; const top = a.getBoundingClientRect().top; if (top < 0) window.scrollBy({ top: top - 90, behavior: 'smooth' }); };
    nav.append(btn('\u2039 Prev', go(st.page - 1), st.page <= 1));
    pageList(st.page, total).forEach((n) => {
      if (n === '\u2026') { const s = document.createElement('span'); s.className = 'sp-gap'; s.textContent = '\u2026'; nav.append(s); }
      else nav.append(btn(String(n), go(n), false, n === st.page));
    });
    nav.append(btn('Next \u203a', go(st.page + 1), st.page >= total));
    p.append(info, sizeWrap, nav);
  };

  const clear = (t, st) => {
    rowsOf(t).forEach((r) => { if (r.hidden) r.hidden = false; });
    if (st && st.pager) { st.pager.remove(); pagers.delete(st.pager); st.pager = null; }
  };

  let observer = null;
  const root = () => document.getElementById('root') || document.body;
  function applyAll() {
    if (observer) observer.disconnect();
    try {
      pagers.forEach((p) => { if (!p._table || !p._table.isConnected) { p.remove(); pagers.delete(p); } });
      root().querySelectorAll('table').forEach((t) => {
        let st = state.get(t);
        if (!st) { st = { page: 1, count: -1, sig: '', pager: null }; state.set(t, st); }
        if (skip(t)) { clear(t, st); return; }
        const rows = rowsOf(t);
        // new search/filter result -> back to page 1
        const sig = rows.length + '|' + (rows[0] ? rows[0].textContent.slice(0, 60) : '');
        if (st.count !== -1 && sig !== st.sig && rows.length !== st.count) st.page = 1;
        st.count = rows.length; st.sig = sig;
        if (rows.length <= size) { st.page = 1; clear(t, st); return; }
        render(t, st, rows);
      });
    } finally {
      if (observer) observer.observe(root(), { childList: true, subtree: true, characterData: true });
    }
  }

  let queued = false;
  const schedule = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; applyAll(); }); };

  // exports (print / PDF of an on-screen table) must include every row
  window.sidvinPagerShowAll = (el) => {
    if (observer) observer.disconnect();
    (el || root()).querySelectorAll('tr[hidden]').forEach((r) => { r.hidden = false; });
    setTimeout(applyAll, 400);
  };

  const start = () => {
    observer = new MutationObserver(schedule);
    applyAll();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
