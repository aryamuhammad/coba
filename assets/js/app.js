/* =====================================================================
 * e-Kinerja – Mockup Modul Perencanaan Kinerja
 * Single page app sederhana (hash routing) tanpa backend.
 * ===================================================================== */
(function () {
  'use strict';

  const LS_KEY = 'ekinerja-mockup-v1';
  const clone = o => JSON.parse(JSON.stringify(o));
  let S = load();
  let EDIT = null; // salinan kerja untuk editor (template / revisi HC)

  // ------------------------------------------------------------------
  // Konstanta
  // ------------------------------------------------------------------
  const PERSPEKTIF = ['Financial', 'Customer', 'Internal Business Process', 'Learning & Growth'];
  const PERSP_CLS = { 'Financial': 'F', 'Customer': 'C', 'Internal Business Process': 'I', 'Learning & Growth': 'L' };
  const TIPE = ['Exact', 'Proxy', 'Activity'];
  const KATEGORI = { A1: 'A1. KPI Division', A2: 'A2. KPI Inisiatif / Action Plan' };
  const UOM = ['%', 'IDR', 'USD', 'Rasio', 'unit', 'm²', 'dokumen'];
  const POLAR = ['Maximize 4 target', 'Maximize 2 target', 'Minimize 4 target', 'Minimize 2 target'];
  const FREKUENSI = ['Bulanan', 'Triwulanan', 'Semesteran', 'Tahunan'];
  const STATUS = {
    DRAFT: { label: 'Draft – Pengisian Pegawai', cls: 'text-bg-secondary', icon: 'pencil-square' },
    ATASAN: { label: 'Menunggu Persetujuan Atasan', cls: 'text-bg-warning', icon: 'hourglass-split' },
    KEMBALI: { label: 'Dikembalikan Atasan', cls: 'text-bg-dark', icon: 'arrow-return-left' },
    HC: { label: 'Menunggu Persetujuan HC', cls: 'text-bg-info', icon: 'hourglass-top' },
    TOLAK: { label: 'Ditolak HC', cls: 'text-bg-danger', icon: 'x-circle' },
    OK: { label: 'Disetujui HC', cls: 'text-bg-success', icon: 'check-circle' },
    REVISI: { label: 'Disetujui (Diubah HC)', cls: 'text-bg-primary', icon: 'pencil-fill' }
  };
  const EDITABLE_BY_PEGAWAI = ['DRAFT', 'TOLAK', 'KEMBALI'];
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // ------------------------------------------------------------------
  // Penyimpanan
  // ------------------------------------------------------------------
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const d = JSON.parse(raw); if (d.version === window.SEED.version) return d; }
    } catch (e) { /* abaikan */ }
    return clone(window.SEED);
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* abaikan */ } }

  // ------------------------------------------------------------------
  // Helper umum
  // ------------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isBlank = v => v === null || v === undefined || v === '';
  const fmtNum = n => isBlank(n) ? '' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  function fmtVal(v, uom) {
    if (isBlank(v)) return '–';
    const n = fmtNum(v);
    switch (uom) {
      case '%': return n + '%';
      case 'IDR': return 'Rp ' + n;
      case 'USD': return 'USD ' + n;
      case 'Rasio': return n;
      default: return n + ' ' + uom;
    }
  }
  function nowStr() {
    const d = new Date(), p = x => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function fmtDate(s) {
    if (!s) return '–';
    const [d, t] = s.split(' '); const [y, m, dd] = d.split('-');
    return `${Number(dd)} ${BULAN[Number(m) - 1]} ${y}${t ? ' ' + t : ''}`;
  }
  const newUid = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function nextId(prefix, list, pad = 2) {
    const max = list.reduce((m, x) => Math.max(m, Number(String(x.id).replace(/\D/g, '')) || 0), 0);
    return prefix + String(max + 1).padStart(pad, '0');
  }

  // Lookup
  const getKpi = id => S.kpi.find(k => k.id === id);
  const getSS = id => S.sasaran.find(x => x.id === id);
  const getEmp = nip => S.employees.find(e => e.nip === nip);
  const getUnit = id => S.units.find(u => u.id === id);
  const getJenis = id => S.jenisOrg.find(j => j.id === id);
  const empJenis = e => getJenis(getUnit(e.unit).jenisOrg);
  const getTpl = id => S.templates.find(t => t.id === id);
  const getPlan = id => S.plans.find(p => p.id === id);
  const me = () => getEmp(S.session);
  const myLogin = () => S.logins.find(l => l.id === S.session) || { role: 'pegawai' };
  const isHC = () => myLogin().role === 'hc';
  const subordinates = nip => S.employees.filter(e => e.atasan === nip);

  // Polarisasi & target
  const nTarget = p => (p || '').includes('2 target') ? 2 : 4;
  const isMax = p => (p || '').startsWith('Maximize');
  function autoLabel(p, uom, v) { return isBlank(v) ? '' : (isMax(p) ? '≥ ' : '≤ ') + fmtVal(v, uom); }
  function checkTargets(p, t) {
    const n = nTarget(p);
    const v = t.slice(0, n).map(x => isBlank(x) ? NaN : Number(x));
    if (v.some(isNaN)) return `Target 1–${n} wajib diisi angka.`;
    for (let i = 1; i < n; i++) {
      if (isMax(p) ? !(v[i] > v[i - 1]) : !(v[i] < v[i - 1]))
        return isMax(p) ? 'Polarisasi Maximize: nilai target harus naik (Target 1 < Target 2 < …).' : 'Polarisasi Minimize: nilai target harus turun (Target 1 > Target 2 > …).';
    }
    return null;
  }

  // Validasi bobot kategori
  function catCheck(items, jenis, kat) {
    const its = items.filter(i => i.kategori === kat);
    const total = its.reduce((a, i) => a + Number(i.bobot || 0), 0);
    const rule = jenis[kat.toLowerCase()];
    const okB = Math.abs(total - rule.bobot) < 0.001;
    const okN = its.length >= rule.min && its.length <= rule.max;
    return { kat, total, req: rule.bobot, count: its.length, min: rule.min, max: rule.max, okB, okN, ok: okB && okN };
  }
  function validateItems(items, jenis, kats = ['A1', 'A2']) {
    const rows = kats.map(k => catCheck(items, jenis, k));
    const tgtErr = items.map(i => { const k = getKpi(i.kpiId); return k ? checkTargets(k.polarisasi, i.target) : 'KPI belum dipilih'; }).filter(Boolean);
    return { rows, tgtErr, ok: rows.every(r => r.ok) && tgtErr.length === 0 };
  }
  function validationHtml(v, jenis) {
    const rows = v.rows.map(r => {
      const pct = Math.min(100, r.req ? r.total / r.req * 100 : 0);
      const over = r.total > r.req;
      return `<div class="valid-row">
        <div class="d-flex justify-content-between small">
          <span class="fw-semibold">${KATEGORI[r.kat]}</span>
          <span class="${r.okB ? 'text-success' : 'text-danger'} fw-semibold">${fmtNum(r.total)}% / ${r.req}% ${r.okB ? '<i class="bi bi-check-circle-fill"></i>' : '<i class="bi bi-exclamation-circle-fill"></i>'}</span>
        </div>
        <div class="progress my-1"><div class="progress-bar ${r.okB ? 'bg-success' : over ? 'bg-danger' : 'bg-warning'}" style="width:${pct}%"></div></div>
        <div class="small ${r.okN ? 'text-muted' : 'text-danger'}">Jumlah KPI: <b>${r.count}</b> (min. ${r.min}, maks. ${r.max}) ${r.okN ? '' : '<i class="bi bi-exclamation-circle-fill"></i>'}</div>
      </div>`;
    }).join('');
    const tg = v.tgtErr.length ? `<div class="small text-danger mt-2"><i class="bi bi-exclamation-triangle"></i> ${v.tgtErr.length} KPI memiliki target tidak valid.</div>` : '';
    return `<div class="valid-box">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="fw-semibold small"><i class="bi bi-shield-check"></i> Validasi Bobot Kategori <span class="text-muted fw-normal">(${esc(jenis.nama)})</span></span>
        ${v.ok ? '<span class="badge text-bg-success">Valid</span>' : '<span class="badge text-bg-danger">Belum Valid</span>'}
      </div>${rows}${tg}</div>`;
  }

  // Elemen UI kecil
  const perspBadge = p => p ? `<span class="persp persp-${PERSP_CLS[p]}">${esc(p)}</span>` : '';
  const statusBadge = s => `<span class="badge ${STATUS[s].cls}"><i class="bi bi-${STATUS[s].icon}"></i> ${STATUS[s].label}</span>`;
  const katBadge = k => `<span class="badge ${k === 'A1' ? 'text-bg-primary' : 'text-bg-warning'}">${k}</span>`;
  const initials = n => n.split(' ').map(x => x[0]).slice(0, 2).join('');
  function pageHead(title, crumb, actions = '') {
    return `<div class="page-head"><div><div class="crumb">${crumb}</div><h1>${title}</h1></div><div class="d-flex flex-wrap gap-2">${actions}</div></div>`;
  }
  function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0`;
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    $('#toastArea').appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3500 }); t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }

  // Modal generik
  let modalObj = null;
  function modal({ title, body, footer = '', size = 'lg' }) {
    const el = $('#appModal');
    el.querySelector('.modal-dialog').className = 'modal-dialog modal-dialog-scrollable modal-' + size;
    $('#appModalTitle').innerHTML = title;
    $('#appModalBody').innerHTML = body;
    $('#appModalFooter').innerHTML = footer || '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>';
    modalObj = bootstrap.Modal.getOrCreateInstance(el);
    modalObj.show();
    $('#appModalBody').scrollTop = 0;
    return el;
  }
  const closeModal = () => modalObj && modalObj.hide();
  function confirmBox(title, msg, yesLabel, yesCls, onYes) {
    modal({
      title, size: 'md', body: `<p class="mb-0">${msg}</p>`,
      footer: `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn ${yesCls}" id="cfYes">${yesLabel}</button>`
    });
    $('#cfYes').onclick = () => { onYes(); };
  }

  // ------------------------------------------------------------------
  // Menu atas
  // ------------------------------------------------------------------
  function menuDef() {
    const l = myLogin();
    const m = [{ href: '#/', key: '', icon: 'house', label: 'Beranda' }];
    if (l.role === 'hc') {
      m.push({
        label: 'Master Perencanaan', icon: 'gear-wide-connected', key: 'master', children: [
          { href: '#/bobot', key: 'bobot', icon: 'pie-chart', label: 'Bobot Kategori', ket: 'Total bobot & jumlah KPI A1/A2 per jenis organisasi' },
          { href: '#/sasaran', key: 'sasaran', icon: 'flag', label: 'Kamus Sasaran Strategi', ket: 'Database sasaran strategi per perspektif' },
          { href: '#/kpi', key: 'kpi', icon: 'journal-text', label: 'Kamus KPI', ket: 'Database KPI A1 & A2' },
          { href: '#/template', key: 'template', icon: 'ui-checks-grid', label: 'Template Scorecard', ket: 'Scorecard KPI A2 & assign ke pegawai' },
          { href: '#/persetujuan', key: 'persetujuan', icon: 'clipboard-check', label: 'Persetujuan Perencanaan', ket: 'Setujui / ubah / tolak perencanaan pegawai' }
        ]
      });
    } else {
      const ch = [{ href: '#/lembar', key: 'lembar', icon: 'file-earmark-text', label: 'Lembar Perencanaan Saya', ket: 'Isi KPI A1 & ajukan persetujuan' }];
      if (subordinates(S.session).length) ch.push({ href: '#/tim', key: 'tim', icon: 'people', label: 'Persetujuan Tim (Atasan)', ket: 'Setujui perencanaan bawahan langsung' });
      m.push({ label: 'Perencanaan Kinerja', icon: 'clipboard-data', key: 'perencanaan', children: ch });
    }
    m.push({ label: 'Penilaian Kinerja', icon: 'graph-up-arrow', key: 'penilaian', disabled: true });
    m.push({ label: 'Laporan', icon: 'bar-chart', key: 'laporan', disabled: true });
    return m;
  }
  function renderNav(page) {
    const items = menuDef().map(m => {
      if (m.disabled) return `<li class="nav-item"><a class="nav-link disabled" title="Di luar cakupan mockup"><i class="bi bi-${m.icon}"></i> ${m.label}</a></li>`;
      if (!m.children) return `<li class="nav-item"><a class="nav-link ${page === m.key ? 'active' : ''}" href="${m.href}"><i class="bi bi-${m.icon}"></i> ${m.label}</a></li>`;
      const active = m.children.some(c => c.key === page);
      return `<li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle ${active ? 'active' : ''}" href="#" role="button" data-bs-toggle="dropdown"><i class="bi bi-${m.icon}"></i> ${m.label}</a>
        <ul class="dropdown-menu shadow">${m.children.map(c => `<li><a class="dropdown-item py-2 ${c.key === page ? 'active' : ''}" href="${c.href}"><i class="bi bi-${c.icon} me-1"></i> ${c.label}<small>${c.ket}</small></a></li>`).join('')}</ul></li>`;
    }).join('');
    $('#navMenu').innerHTML = items;
    $('#navPeriode').textContent = S.periode;

    // notifikasi
    const notifs = notifications();
    $('#navNotif').innerHTML = `<a class="nav-link position-relative" href="#" data-bs-toggle="dropdown" title="Notifikasi"><i class="bi bi-bell fs-5"></i>${notifs.length ? `<span class="badge rounded-pill text-bg-danger notif-dot">${notifs.length}</span>` : ''}</a>
      <ul class="dropdown-menu dropdown-menu-end shadow" style="min-width:320px">
        <li><h6 class="dropdown-header">Notifikasi</h6></li>
        ${notifs.length ? notifs.map(n => `<li><a class="dropdown-item py-2" href="${n.href}"><i class="bi bi-${n.icon} me-1"></i> ${n.text}</a></li>`).join('') : '<li><span class="dropdown-item-text small text-muted">Tidak ada notifikasi.</span></li>'}
      </ul>`;

    // user / simulasi peran
    const u = me();
    $('#navUser').innerHTML = `<a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" data-bs-toggle="dropdown">
        <span class="avatar">${initials(u.nama)}</span><span class="lh-sm text-start"><span class="d-block">${esc(u.nama)}</span><small class="opacity-75">${esc(myLogin().ket)}</small></span></a>
      <ul class="dropdown-menu dropdown-menu-end shadow">
        <li><h6 class="dropdown-header">Simulasi: Masuk sebagai</h6></li>
        ${S.logins.map(l => { const e = getEmp(l.id); return `<li><a class="dropdown-item ${l.id === S.session ? 'active' : ''}" href="#" onclick="App.switchUser('${l.id}');return false;"><b>${esc(e.nama)}</b> – ${esc(e.jabatan)}<small>${esc(l.ket)}</small></a></li>`; }).join('')}
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item text-danger" href="#" onclick="App.resetDemo();return false;"><i class="bi bi-arrow-counterclockwise"></i> Reset Data Demo</a></li>
      </ul>`;
  }
  function notifications() {
    const out = [];
    if (isHC()) {
      const n = S.plans.filter(p => p.status === 'HC').length;
      if (n) out.push({ href: '#/persetujuan', icon: 'clipboard-check', text: `${n} perencanaan menunggu persetujuan HC` });
    } else {
      const p = S.plans.find(x => x.nip === S.session && x.periode === S.periode);
      if (p && p.status === 'TOLAK') out.push({ href: '#/lembar', icon: 'x-circle text-danger', text: 'Perencanaan Anda ditolak HC – mohon sesuaikan' });
      if (p && p.status === 'KEMBALI') out.push({ href: '#/lembar', icon: 'arrow-return-left', text: 'Perencanaan Anda dikembalikan atasan' });
      if (p && p.status === 'REVISI' && !p.ack) out.push({ href: '#/lembar', icon: 'pencil-fill text-primary', text: 'Perencanaan Anda diubah oleh Tim HC' });
      if (p && p.status === 'DRAFT') out.push({ href: '#/lembar', icon: 'pencil-square', text: 'Lengkapi KPI A1 & ajukan perencanaan' });
      const n = S.plans.filter(x => x.status === 'ATASAN' && getEmp(x.nip).atasan === S.session).length;
      if (n) out.push({ href: '#/tim', icon: 'people', text: `${n} perencanaan bawahan menunggu persetujuan Anda` });
    }
    return out;
  }

  // ------------------------------------------------------------------
  // Router
  // ------------------------------------------------------------------
  const HC_PAGES = ['bobot', 'sasaran', 'kpi', 'template', 'persetujuan'];
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const page = parts[0] || '';
    let html;
    if (HC_PAGES.includes(page) && !isHC()) html = denied();
    else switch (page) {
      case '': html = pageHome(); break;
      case 'bobot': html = pageBobot(); break;
      case 'sasaran': html = pageSasaran(); break;
      case 'kpi': html = pageKpi(); break;
      case 'template': html = parts[1] ? pageTemplateEditor(parts[1]) : pageTemplateList(); break;
      case 'persetujuan': html = parts[2] === 'edit' ? pageHcEditor(parts[1]) : pagePersetujuan(); break;
      case 'lembar': html = pageLembar(); break;
      case 'tim': html = pageTim(); break;
      default: html = `<div class="empty"><i class="bi bi-signpost-split"></i>Halaman tidak ditemukan.</div>`;
    }
    renderNav(page);
    $('#app').innerHTML = html;
    afterRender(page, parts);
    window.scrollTo(0, 0);
  }
  function denied() {
    return `<div class="empty"><i class="bi bi-shield-lock"></i>Menu ini hanya untuk <b>Admin / Tim HC</b>.<br>Gunakan menu profil (kanan atas) untuk masuk sebagai Tim HC.</div>`;
  }
  function afterRender(page, parts) {
    if (page === 'template' && parts[1]) bindTemplateEditor();
    if (page === 'persetujuan' && parts[2] === 'edit') bindHcEditor();
    $$('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
  }

  // ------------------------------------------------------------------
  // BERANDA
  // ------------------------------------------------------------------
  function pageHome() {
    const u = me();
    const flow = `<div class="card mb-4"><div class="card-header"><i class="bi bi-diagram-3"></i> Alur Perencanaan Kinerja</div><div class="card-body"><div class="flow">
      ${[['Bobot Kategori', 'HC atur bobot A1/A2 per jenis organisasi'], ['Kamus Sasaran Strategi', 'HC kelola sasaran per perspektif BSC'], ['Kamus KPI', 'HC kelola KPI A1 & A2'], ['Template Scorecard', 'HC susun KPI A2 + target & label, lalu assign'], ['Pengisian Pegawai', 'Pegawai isi KPI A1 (A2 terkunci) & ajukan'], ['Persetujuan Atasan', 'Atasan setujui / kembalikan'], ['Persetujuan HC', 'HC setujui, ubah (dgn catatan) atau tolak']]
        .map((x, i) => `<div class="f"><span class="n">${i + 1}</span><b>${x[0]}</b>${x[1]}</div>`).join('')}
      </div></div></div>`;

    if (isHC()) {
      const cnt = s => S.plans.filter(p => p.status === s).length;
      const stat = (label, val, icon, cls, href) => `<div class="col-6 col-lg-3"><a href="${href}" class="text-decoration-none"><div class="card stat-card h-100"><div class="card-body d-flex justify-content-between align-items-center"><div><div class="small text-muted">${label}</div><div class="stat-val ${cls}">${val}</div></div><i class="bi bi-${icon} stat-icon ${cls}"></i></div></div></a></div>`;
      const byStatus = Object.keys(STATUS).map(s => `<tr><td>${statusBadge(s)}</td><td class="text-end fw-semibold">${cnt(s)}</td></tr>`).join('');
      const pending = S.plans.filter(p => p.status === 'HC').map(p => { const e = getEmp(p.nip); return `<tr><td>${esc(e.nama)}<div class="small text-muted">${esc(e.jabatan)} · ${esc(getUnit(e.unit).nama)}</div></td><td class="small">${fmtDate(p.approvals.atasan)}</td><td><button class="btn btn-sm btn-outline-primary" onclick="App.viewPlan('${p.id}')">Tinjau</button></td></tr>`; }).join('');
      return pageHead(`Selamat datang, ${esc(u.nama)}`, 'Beranda · Admin / Tim HC') + `
        <div class="row g-3 mb-4">
          ${stat('Sasaran Strategi', S.sasaran.length, 'flag', 'text-success', '#/sasaran')}
          ${stat('KPI di Kamus', S.kpi.length, 'journal-text', 'text-primary', '#/kpi')}
          ${stat('Template Scorecard', S.templates.length, 'ui-checks-grid', 'text-warning', '#/template')}
          ${stat('Menunggu Persetujuan HC', cnt('HC'), 'hourglass-top', 'text-danger', '#/persetujuan')}
        </div>${flow}
        <div class="row g-3">
          <div class="col-lg-5"><div class="card h-100"><div class="card-header">Status Perencanaan Periode ${S.periode}</div><div class="card-body p-0"><table class="table table-sm mb-0"><tbody>${byStatus}</tbody></table></div></div></div>
          <div class="col-lg-7"><div class="card h-100"><div class="card-header d-flex justify-content-between">Antrian Persetujuan HC <a href="#/persetujuan" class="small">Lihat semua</a></div><div class="card-body p-0"><table class="table table-sm mb-0"><thead><tr><th>Pegawai</th><th>Disetujui Atasan</th><th></th></tr></thead><tbody>${pending || '<tr><td colspan="3" class="text-center text-muted py-3">Tidak ada antrian.</td></tr>'}</tbody></table></div></div></div>
        </div>`;
    }
    const p = S.plans.find(x => x.nip === S.session && x.periode === S.periode);
    const sub = subordinates(S.session);
    const pendTeam = S.plans.filter(x => x.status === 'ATASAN' && sub.some(s => s.nip === x.nip)).length;
    return pageHead(`Selamat datang, ${esc(u.nama)}`, `Beranda · ${esc(u.jabatan)} – ${esc(getUnit(u.unit).nama)}`) + `
      <div class="row g-3 mb-4">
        <div class="col-md-6"><div class="card h-100"><div class="card-body">
          <div class="small text-muted mb-1">Lembar Perencanaan Kinerja ${S.periode}</div>
          ${p ? `<div class="mb-3">${statusBadge(p.status)}</div><a href="#/lembar" class="btn btn-primary btn-sm">Buka Lembar Perencanaan</a>` : '<div class="text-muted">Belum ada scorecard yang di-assign oleh Tim HC.</div>'}
        </div></div></div>
        ${sub.length ? `<div class="col-md-6"><div class="card h-100"><div class="card-body"><div class="small text-muted mb-1">Persetujuan Tim</div><div class="stat-val text-warning mb-2">${pendTeam}</div><div class="small mb-2">perencanaan bawahan menunggu persetujuan Anda</div><a href="#/tim" class="btn btn-outline-primary btn-sm">Buka Persetujuan Tim</a></div></div></div>` : ''}
      </div>${flow}`;
  }

  // ------------------------------------------------------------------
  // MASTER: BOBOT KATEGORI
  // ------------------------------------------------------------------
  function pageBobot() {
    const rows = S.jenisOrg.map(j => {
      const units = S.units.filter(u => u.jenisOrg === j.id);
      const tot = j.a1.bobot + j.a2.bobot;
      return `<tr>
        <td><div class="fw-semibold">${esc(j.nama)}</div><div class="small text-muted">${esc(j.ket || '')}</div></td>
        <td class="text-center fw-semibold">${j.a1.bobot}%</td><td class="text-center">${j.a1.min} – ${j.a1.max}</td>
        <td class="text-center fw-semibold">${j.a2.bobot}%</td><td class="text-center">${j.a2.min} – ${j.a2.max}</td>
        <td><div class="d-flex align-items-center gap-2"><div class="bar-stack flex-grow-1"><div class="a1" style="width:${j.a1.bobot}%"></div><div class="a2" style="width:${j.a2.bobot}%"></div></div><span class="badge ${tot === 100 ? 'text-bg-success' : 'text-bg-danger'}">${tot}%</span></div></td>
        <td class="small">${units.map(u => `<span class="badge text-bg-light border me-1 mb-1">${esc(u.nama)}</span>`).join('') || '–'}</td>
        <td class="text-nowrap"><button class="btn btn-sm btn-outline-primary" onclick="App.editBobot('${j.id}')" title="Ubah"><i class="bi bi-pencil"></i></button></td>
      </tr>`;
    }).join('');
    return pageHead('Bobot Kategori', 'Master Perencanaan › Bobot Kategori', `<button class="btn btn-primary" onclick="App.editBobot()"><i class="bi bi-plus-lg"></i> Tambah Jenis Organisasi</button>`) + `
      <div class="alert alert-info small"><i class="bi bi-info-circle"></i> Penentuan <b>total bobot</b> dan <b>jumlah (angka) KPI</b> untuk kategori <b>A1. KPI Division</b> dan <b>A2. KPI Inisiatif / Action Plan</b> berdasarkan jenis organisasi. Ketentuan ini menjadi dasar validasi pada <b>Template Scorecard</b> dan <b>Lembar Perencanaan</b>. Total bobot A1 + A2 wajib 100%.</div>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0">
        <thead><tr><th rowspan="2">Jenis Organisasi</th><th colspan="2" class="text-center border-start">A1. KPI Division</th><th colspan="2" class="text-center border-start">A2. KPI Inisiatif / Action Plan</th><th rowspan="2">Komposisi (<span class="text-primary">A1</span>/<span class="text-warning">A2</span>)</th><th rowspan="2">Unit Organisasi</th><th rowspan="2"></th></tr>
        <tr><th class="text-center border-start">Bobot</th><th class="text-center">Jml KPI (min–maks)</th><th class="text-center border-start">Bobot</th><th class="text-center">Jml KPI (min–maks)</th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>`;
  }
  function editBobot(id) {
    const j = id ? getJenis(id) : { id: '', nama: '', ket: '', a1: { bobot: 50, min: 2, max: 5 }, a2: { bobot: 50, min: 2, max: 5 } };
    const unitChk = S.units.map(u => `<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" name="bkUnit" value="${u.id}" id="bu${u.id}" ${u.jenisOrg === j.id ? 'checked' : ''}><label class="form-check-label small" for="bu${u.id}">${esc(u.nama)}</label></div>`).join('');
    const grp = (k, lbl) => `<div class="col-md-6"><div class="border rounded p-2"><div class="fw-semibold small mb-2">${lbl}</div>
      <div class="row g-2"><div class="col-4"><label class="form-label small">Bobot (%)</label><input type="number" class="form-control" id="bk${k}b" value="${j[k].bobot}" min="0" max="100"></div>
      <div class="col-4"><label class="form-label small">Min. KPI</label><input type="number" class="form-control" id="bk${k}min" value="${j[k].min}" min="0"></div>
      <div class="col-4"><label class="form-label small">Maks. KPI</label><input type="number" class="form-control" id="bk${k}max" value="${j[k].max}" min="0"></div></div></div></div>`;
    modal({
      title: id ? 'Ubah Bobot Kategori' : 'Tambah Jenis Organisasi',
      body: `<div class="row g-3">
        <div class="col-md-6"><label class="form-label">Jenis Organisasi <span class="text-danger">*</span></label><input class="form-control" id="bkNama" value="${esc(j.nama)}"></div>
        <div class="col-md-6"><label class="form-label">Keterangan</label><input class="form-control" id="bkKet" value="${esc(j.ket)}"></div>
        ${grp('a1', KATEGORI.A1)}${grp('a2', KATEGORI.A2)}
        <div class="col-12"><div class="alert alert-light border py-2 mb-0 small">Total bobot: <b id="bkTot"></b> <span class="text-muted">(wajib 100%)</span></div></div>
        <div class="col-12"><label class="form-label">Unit organisasi yang termasuk jenis ini</label><div>${unitChk}</div></div>
      </div><div class="text-danger small mt-2" id="bkErr"></div>`,
      footer: `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-primary" id="bkSave"><i class="bi bi-save"></i> Simpan</button>`
    });
    const upd = () => { const t = Number($('#bka1b').value) + Number($('#bka2b').value); $('#bkTot').textContent = t + '%'; $('#bkTot').className = t === 100 ? 'text-success' : 'text-danger'; };
    ['#bka1b', '#bka2b'].forEach(s => $(s).addEventListener('input', upd)); upd();
    $('#bkSave').onclick = () => {
      const g = k => ({ bobot: Number($(`#bk${k}b`).value), min: Number($(`#bk${k}min`).value), max: Number($(`#bk${k}max`).value) });
      const d = { nama: $('#bkNama').value.trim(), ket: $('#bkKet').value.trim(), a1: g('a1'), a2: g('a2') };
      const err = !d.nama ? 'Nama jenis organisasi wajib diisi.' : d.a1.bobot + d.a2.bobot !== 100 ? 'Total bobot A1 + A2 harus 100%.' : (d.a1.min > d.a1.max || d.a2.min > d.a2.max) ? 'Jumlah min. KPI tidak boleh melebihi maks.' : '';
      if (err) { $('#bkErr').textContent = err; return; }
      let target = j;
      if (!id) { target = Object.assign({ id: nextId('J', S.jenisOrg) }, d); S.jenisOrg.push(target); } else Object.assign(j, d);
      $$('input[name=bkUnit]').forEach(c => { const u = getUnit(c.value); if (c.checked) u.jenisOrg = target.id; });
      save(); closeModal(); route(); toast('Bobot kategori disimpan.');
    };
  }

  // ------------------------------------------------------------------
  // MASTER: KAMUS SASARAN STRATEGI
  // ------------------------------------------------------------------
  const F = { ssP: '', ssQ: '', kpiK: '', kpiP: '', kpiT: '', kpiQ: '', apS: '', apU: '', apJ: '', apQ: '' };
  function pageSasaran() {
    const list = S.sasaran.filter(s => (!F.ssP || s.perspektif === F.ssP) && (!F.ssQ || (s.nama + s.kode + s.deskripsi).toLowerCase().includes(F.ssQ.toLowerCase())));
    const tabs = ['', ...PERSPEKTIF].map(p => `<li class="nav-item"><a class="nav-link ${F.ssP === p ? 'active' : ''}" href="#" onclick="App.setF('ssP','${p}');return false;">${p || 'Semua'} <span class="badge text-bg-light border">${S.sasaran.filter(s => !p || s.perspektif === p).length}</span></a></li>`).join('');
    const rows = list.map(s => {
      const used = S.kpi.filter(k => k.sasaranId === s.id).length;
      return `<tr><td class="text-nowrap fw-semibold">${esc(s.kode)}</td><td>${perspBadge(s.perspektif)}</td><td class="fw-semibold">${esc(s.nama)}</td><td class="small text-muted">${esc(s.deskripsi)}</td>
        <td class="text-center"><a href="#/kpi" onclick="App.setFq('kpiQ','');App.setFq('kpiP','${s.perspektif}')">${used}</a></td>
        <td class="text-nowrap"><button class="btn btn-sm btn-outline-primary" onclick="App.editSasaran('${s.id}')" title="Ubah"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" ${used ? 'disabled title="Dipakai oleh KPI"' : ''} onclick="App.delSasaran('${s.id}')"><i class="bi bi-trash"></i></button></td></tr>`;
    }).join('');
    return pageHead('Kamus Sasaran Strategi', 'Master Perencanaan › Kamus Sasaran Strategi', `<button class="btn btn-primary" onclick="App.editSasaran()"><i class="bi bi-plus-lg"></i> Tambah Sasaran Strategi</button>`) + `
      <div class="card"><div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <ul class="nav nav-pills small">${tabs}</ul>
        <input class="form-control form-control-sm" style="max-width:260px" placeholder="Cari sasaran strategi…" value="${esc(F.ssQ)}" onchange="App.setF('ssQ',this.value)">
      </div><div class="table-responsive"><table class="table table-hover mb-0">
        <thead><tr><th>Kode</th><th>Perspektif</th><th>Nama Sasaran Strategi</th><th>Deskripsi</th><th class="text-center">Jml KPI</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="empty">Data tidak ditemukan.</td></tr>'}</tbody></table></div></div>`;
  }
  function editSasaran(id) {
    const s = id ? getSS(id) : { kode: '', perspektif: PERSPEKTIF[0], nama: '', deskripsi: '' };
    modal({
      title: id ? 'Ubah Sasaran Strategi' : 'Tambah Sasaran Strategi',
      body: `<div class="row g-3">
        <div class="col-md-4"><label class="form-label">Kode</label><input class="form-control" id="ssKode" value="${esc(s.kode)}" placeholder="otomatis"></div>
        <div class="col-md-8"><label class="form-label">Perspektif <span class="text-danger">*</span></label><select class="form-select" id="ssP">${PERSPEKTIF.map(p => `<option ${p === s.perspektif ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        <div class="col-12"><label class="form-label">Nama Sasaran Strategi <span class="text-danger">*</span></label><input class="form-control" id="ssNama" value="${esc(s.nama)}"></div>
        <div class="col-12"><label class="form-label">Deskripsi</label><textarea class="form-control" rows="3" id="ssDesk">${esc(s.deskripsi)}</textarea></div>
      </div><div class="text-danger small mt-2" id="ssErr"></div>`,
      footer: `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-primary" id="ssSave"><i class="bi bi-save"></i> Simpan</button>`
    });
    $('#ssSave').onclick = () => {
      const d = { kode: $('#ssKode').value.trim(), perspektif: $('#ssP').value, nama: $('#ssNama').value.trim(), deskripsi: $('#ssDesk').value.trim() };
      if (!d.nama) { $('#ssErr').textContent = 'Nama sasaran strategi wajib diisi.'; return; }
      if (!d.kode) d.kode = 'SS-' + PERSP_CLS[d.perspektif] + String(S.sasaran.filter(x => x.perspektif === d.perspektif).length + 1).padStart(2, '0');
      if (id) Object.assign(s, d); else S.sasaran.push(Object.assign({ id: nextId('SS', S.sasaran) }, d));
      save(); closeModal(); route(); toast('Sasaran strategi disimpan.');
    };
  }
  function delSasaran(id) {
    confirmBox('Hapus Sasaran Strategi', `Hapus <b>${esc(getSS(id).nama)}</b>?`, 'Hapus', 'btn-danger', () => {
      S.sasaran = S.sasaran.filter(s => s.id !== id); save(); closeModal(); route(); toast('Sasaran strategi dihapus.', 'secondary');
    });
  }

  // ------------------------------------------------------------------
  // MASTER: KAMUS KPI
  // ------------------------------------------------------------------
  function pageKpi() {
    const q = F.kpiQ.toLowerCase();
    const list = S.kpi.filter(k => {
      const s = getSS(k.sasaranId) || {};
      return (!F.kpiK || k.kategori === F.kpiK) && (!F.kpiP || s.perspektif === F.kpiP) && (!F.kpiT || k.tipe === F.kpiT) && (!q || (k.nama + k.kode + k.pic + (s.nama || '')).toLowerCase().includes(q));
    });
    const sel = (key, opts, ph) => `<select class="form-select form-select-sm" style="max-width:220px" onchange="App.setF('${key}',this.value)"><option value="">${ph}</option>${opts.map(o => `<option value="${o[0]}" ${F[key] === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    const rows = list.map(k => {
      const s = getSS(k.sasaranId) || {};
      return `<tr><td class="text-nowrap fw-semibold">${esc(k.kode)}</td>
        <td><div class="fw-semibold">${esc(k.nama)}</div><div class="small text-muted text-truncate" style="max-width:320px">${esc(k.deskripsi)}</div></td>
        <td>${perspBadge(s.perspektif)}<div class="small">${esc(s.nama)}</div></td>
        <td>${katBadge(k.kategori)}</td><td>${esc(k.tipe)}</td><td>${esc(k.uom)}</td><td class="small text-nowrap">${esc(k.polarisasi)}</td><td class="small">${esc(k.pic)}</td>
        <td class="text-nowrap"><button class="btn btn-sm btn-outline-secondary" onclick="App.viewKpi('${k.id}')" title="Detail"><i class="bi bi-eye"></i></button>
        <button class="btn btn-sm btn-outline-primary" onclick="App.editKpi('${k.id}')" title="Ubah"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="App.delKpi('${k.id}')" title="Hapus"><i class="bi bi-trash"></i></button></td></tr>`;
    }).join('');
    return pageHead('Kamus KPI', 'Master Perencanaan › Kamus KPI', `<button class="btn btn-primary" onclick="App.editKpi()"><i class="bi bi-plus-lg"></i> Tambah KPI</button>`) + `
      <div class="card"><div class="card-header d-flex flex-wrap gap-2 align-items-center">
        ${sel('kpiK', [['A1', KATEGORI.A1], ['A2', KATEGORI.A2]], 'Semua Kategori')}
        ${sel('kpiP', PERSPEKTIF.map(p => [p, p]), 'Semua Perspektif')}
        ${sel('kpiT', TIPE.map(p => [p, p]), 'Semua Tipe')}
        <input class="form-control form-control-sm ms-auto" style="max-width:260px" placeholder="Cari KPI / PIC…" value="${esc(F.kpiQ)}" onchange="App.setF('kpiQ',this.value)">
      </div><div class="table-responsive"><table class="table table-hover mb-0">
        <thead><tr><th>Kode</th><th>Nama KPI</th><th>Sasaran Strategi</th><th>Kategori</th><th>Tipe</th><th>UoM</th><th>Polarisasi</th><th>PIC</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" class="empty">Data tidak ditemukan.</td></tr>'}</tbody></table></div>
        <div class="card-footer small text-muted bg-white">${list.length} dari ${S.kpi.length} KPI</div></div>`;
  }
  function kpiFormHtml(k, lockKat) {
    const ssOpts = PERSPEKTIF.map(p => `<optgroup label="${p}">${S.sasaran.filter(s => s.perspektif === p).map(s => `<option value="${s.id}" ${s.id === k.sasaranId ? 'selected' : ''}>${esc(s.kode)} – ${esc(s.nama)}</option>`).join('')}</optgroup>`).join('');
    const opt = (arr, v) => arr.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('');
    return `<div class="row g-3">
      <div class="col-12"><label class="form-label">Sasaran Strategi <span class="text-danger">*</span> <small class="text-muted">(dari Kamus Sasaran Strategi)</small></label><select class="form-select" id="kfSS"><option value="">– Pilih sasaran strategi –</option>${ssOpts}</select><div class="form-text" id="kfPersp"></div></div>
      <div class="col-md-3"><label class="form-label">Kode KPI</label><input class="form-control" id="kfKode" value="${esc(k.kode)}" placeholder="otomatis"></div>
      <div class="col-md-9"><label class="form-label">Nama KPI <span class="text-danger">*</span></label><input class="form-control" id="kfNama" value="${esc(k.nama)}"></div>
      <div class="col-12"><label class="form-label">Deskripsi KPI</label><textarea class="form-control" rows="2" id="kfDesk">${esc(k.deskripsi)}</textarea></div>
      <div class="col-md-4"><label class="form-label">Tipe KPI <span class="text-danger">*</span></label><select class="form-select" id="kfTipe">${opt(TIPE, k.tipe)}</select></div>
      <div class="col-md-8"><label class="form-label">Kategori KPI <span class="text-danger">*</span></label><select class="form-select" id="kfKat" ${lockKat ? 'disabled' : ''}>${Object.entries(KATEGORI).map(([v, l]) => `<option value="${v}" ${v === k.kategori ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="col-md-4"><label class="form-label">UoM <span class="text-danger">*</span></label><select class="form-select" id="kfUom">${opt(UOM, k.uom)}</select></div>
      <div class="col-md-4"><label class="form-label">Polarisasi <span class="text-danger">*</span></label><select class="form-select" id="kfPol">${opt(POLAR, k.polarisasi)}</select></div>
      <div class="col-md-4"><label class="form-label">Frekuensi Pengukuran</label><select class="form-select" id="kfFrek">${opt(FREKUENSI, k.frekuensi)}</select></div>
      <div class="col-md-6"><label class="form-label">Sumber Data</label><input class="form-control" id="kfSumber" value="${esc(k.sumberData)}"></div>
      <div class="col-md-6"><label class="form-label">PIC</label><input class="form-control" id="kfPic" value="${esc(k.pic)}"></div>
      <div class="col-12"><label class="form-label">Formula</label><input class="form-control" id="kfFormula" value="${esc(k.formula)}" placeholder="mis. Realisasi ÷ Rencana × 100%"></div>
    </div><div class="text-danger small mt-2" id="kfErr"></div>`;
  }
  function bindKpiForm() {
    const upd = () => { const s = getSS($('#kfSS').value); $('#kfPersp').innerHTML = s ? 'Perspektif: ' + perspBadge(s.perspektif) : ''; };
    $('#kfSS').addEventListener('change', upd); upd();
  }
  function readKpiForm() {
    const d = {
      sasaranId: $('#kfSS').value, kode: $('#kfKode').value.trim(), nama: $('#kfNama').value.trim(), deskripsi: $('#kfDesk').value.trim(),
      tipe: $('#kfTipe').value, kategori: $('#kfKat').value, uom: $('#kfUom').value, polarisasi: $('#kfPol').value, frekuensi: $('#kfFrek').value,
      sumberData: $('#kfSumber').value.trim(), pic: $('#kfPic').value.trim(), formula: $('#kfFormula').value.trim()
    };
    if (!d.sasaranId) return { err: 'Sasaran strategi wajib dipilih.' };
    if (!d.nama) return { err: 'Nama KPI wajib diisi.' };
    if (!d.kode) d.kode = 'KPI-' + String(S.kpi.length + 1).padStart(3, '0');
    return { d };
  }
  function blankKpi(kat) { return { sasaranId: '', kode: '', nama: '', deskripsi: '', tipe: 'Exact', kategori: kat || 'A1', uom: '%', polarisasi: POLAR[0], frekuensi: 'Bulanan', sumberData: '', pic: '', formula: '' }; }
  function editKpi(id) {
    const k = id ? getKpi(id) : blankKpi();
    modal({
      title: id ? 'Ubah KPI' : 'Tambah KPI ke Kamus', size: 'lg', body: kpiFormHtml(k),
      footer: `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-primary" id="kfSave"><i class="bi bi-save"></i> Simpan</button>`
    });
    bindKpiForm();
    $('#kfSave').onclick = () => {
      const r = readKpiForm(); if (r.err) { $('#kfErr').textContent = r.err; return; }
      if (id) Object.assign(k, r.d); else S.kpi.push(Object.assign({ id: nextId('K', S.kpi) }, r.d));
      save(); closeModal(); route(); toast('KPI disimpan ke kamus.');
    };
  }
  function kpiDetailHtml(k) {
    const s = getSS(k.sasaranId) || {};
    const r = (a, b) => `<dt class="col-sm-4">${a}</dt><dd class="col-sm-8">${b || '–'}</dd>`;
    return `<dl class="row mb-0 small">${r('Kode', esc(k.kode))}${r('Nama KPI', `<b>${esc(k.nama)}</b>`)}${r('Deskripsi', esc(k.deskripsi))}${r('Perspektif', perspBadge(s.perspektif))}${r('Sasaran Strategi', esc(s.kode) + ' – ' + esc(s.nama))}
      ${r('Kategori', KATEGORI[k.kategori])}${r('Tipe', esc(k.tipe))}${r('UoM', esc(k.uom))}${r('Polarisasi', esc(k.polarisasi))}${r('Frekuensi', esc(k.frekuensi))}${r('Sumber Data', esc(k.sumberData))}${r('Formula', esc(k.formula))}${r('PIC', esc(k.pic))}</dl>`;
  }
  function viewKpi(id) { modal({ title: 'Detail KPI', size: 'lg', body: kpiDetailHtml(getKpi(id)) }); }
  function delKpi(id) {
    const used = S.templates.some(t => t.items.some(i => i.kpiId === id)) || S.plans.some(p => p.items.some(i => i.kpiId === id));
    if (used) { toast('KPI tidak dapat dihapus karena dipakai pada template / lembar perencanaan.', 'danger'); return; }
    confirmBox('Hapus KPI', `Hapus <b>${esc(getKpi(id).nama)}</b> dari kamus?`, 'Hapus', 'btn-danger', () => {
      S.kpi = S.kpi.filter(k => k.id !== id); save(); closeModal(); route(); toast('KPI dihapus.', 'secondary');
    });
  }

  // ------------------------------------------------------------------
  // Tabel KPI (dipakai di template, lembar, persetujuan)
  // ------------------------------------------------------------------
  function itemsTable(items, o = {}) {
    if (!items.length) return `<div class="text-muted small p-3 border rounded bg-white">Belum ada KPI pada kategori ini.</div>`;
    const rows = items.map((it, i) => {
      const k = getKpi(it.kpiId) || {}; const s = getSS(k.sasaranId) || {}; const n = nTarget(k.polarisasi);
      const tg = [0, 1, 2, 3].map(x => x < n
        ? `<td class="tgt">${esc(it.label[x] || autoLabel(k.polarisasi, k.uom, it.target[x]))}${o.showNum ? `<div class="tgt-num">batas: ${fmtVal(it.target[x], k.uom)}</div>` : ''}</td>`
        : `<td class="tgt na">–</td>`).join('');
      return `<tr class="${it.locked && o.markLock ? 'row-locked' : ''}"><td>${i + 1}</td>
        <td>${perspBadge(s.perspektif)}<div class="small mt-1">${esc(s.nama)}</div></td>
        <td><div class="fw-semibold">${it.locked && o.markLock ? '<i class="bi bi-lock-fill lock-ico" data-bs-toggle="tooltip" title="Ditetapkan Tim HC melalui Template Scorecard – tidak dapat diubah"></i> ' : ''}${esc(k.nama)}</div><div class="small text-muted">${esc(k.kode)} · ${esc(k.tipe)} · <a href="#" onclick="App.viewKpi('${k.id}');return false;">detail</a></div></td>
        <td>${esc(k.uom)}</td><td class="small">${esc(k.polarisasi)}</td><td class="text-end fw-semibold">${fmtNum(it.bobot)}%</td>${tg}
        ${o.actions ? `<td class="text-nowrap">${o.actions(it, i)}</td>` : ''}</tr>`;
    }).join('');
    const tot = items.reduce((a, i) => a + Number(i.bobot || 0), 0);
    return `<div class="table-responsive"><table class="table table-bordered table-sheet bg-white mb-0">
      <thead><tr><th>No</th><th>Perspektif & Sasaran Strategi</th><th>KPI</th><th>UoM</th><th>Polarisasi</th><th class="text-end">Bobot</th><th>Target 1</th><th>Target 2</th><th>Target 3</th><th>Target 4</th>${o.actions ? '<th></th>' : ''}</tr></thead>
      <tbody>${rows}</tbody><tfoot><tr class="table-light"><td colspan="5" class="text-end fw-semibold">Total Bobot</td><td class="text-end fw-bold">${fmtNum(tot)}%</td><td colspan="${4 + (o.actions ? 1 : 0)}"></td></tr></tfoot></table></div>`;
  }

  // Modal tambah/ubah baris KPI (target 1-4 + label)
  function openItemModal({ kategori, item, onSave, title, allowNew }) {
    const it = item ? clone(item) : { uid: newUid(), kategori, kpiId: '', bobot: '', target: ['', '', '', ''], label: ['', '', '', ''], locked: kategori === 'A2' };
    const opts = PERSPEKTIF.map(p => {
      const ks = S.kpi.filter(k => k.kategori === kategori && (getSS(k.sasaranId) || {}).perspektif === p);
      return ks.length ? `<optgroup label="${p}">${ks.map(k => `<option value="${k.id}" ${k.id === it.kpiId ? 'selected' : ''}>${esc(k.kode)} – ${esc(k.nama)}</option>`).join('')}</optgroup>` : '';
    }).join('');
    const RATING = ['Rating 1', 'Rating 2', 'Rating 3', 'Rating 4'];
    modal({
      title: title || (item ? 'Ubah KPI' : 'Tambah KPI') + ' – ' + KATEGORI[kategori], size: 'xl',
      body: `<div class="row g-3">
        <div class="col-lg-5">
          <label class="form-label">Pilih KPI dari Kamus KPI <span class="text-danger">*</span></label>
          <select class="form-select" id="imKpi"><option value="">– Pilih KPI (${kategori}) –</option>${opts}</select>
          ${allowNew ? `<div class="form-text">KPI belum ada? <a href="#" id="imNew"><i class="bi bi-plus-circle"></i> Buat KPI baru</a> (otomatis tersimpan ke Kamus KPI)</div>` : ''}
          <div class="kpi-detail mt-2" id="imDetail"></div>
          <label class="form-label mt-3">Bobot (%) <span class="text-danger">*</span></label>
          <input type="number" class="form-control" id="imBobot" value="${esc(it.bobot)}" min="0" max="100" step="0.5" style="max-width:160px">
        </div>
        <div class="col-lg-7">
          <div class="d-flex justify-content-between align-items-center mb-1"><label class="form-label mb-0">Target & Label</label><button type="button" class="btn btn-sm btn-outline-secondary" id="imAuto"><i class="bi bi-magic"></i> Buat semua label otomatis</button></div>
          <div class="form-text mt-0 mb-2">Target = <b>angka batas terendah</b> untuk mendapatkan nilai rating. Label (teks) adalah yang <b>ditampilkan pada lembar perencanaan</b>.</div>
          <table class="table table-sm table-bordered target-grid mb-1"><thead><tr><th style="width:90px">Target</th><th style="width:160px">Batas (angka)</th><th>Label (teks tampil)</th></tr></thead>
          <tbody>${[0, 1, 2, 3].map(x => `<tr id="imRow${x}"><td class="fw-semibold">Target ${x + 1}<div class="small text-muted fw-normal">${RATING[x]}</div></td>
            <td><div class="input-group input-group-sm"><input type="number" step="any" class="form-control" id="imT${x}" value="${esc(it.target[x])}"><span class="input-group-text imUom"></span></div></td>
            <td><div class="input-group input-group-sm"><input class="form-control" id="imL${x}" value="${esc(it.label[x])}" placeholder="mis. ≥ 90%"><button class="btn btn-outline-secondary" type="button" data-auto="${x}" title="Label otomatis"><i class="bi bi-magic"></i></button></div></td></tr>`).join('')}</tbody></table>
          <div class="small text-muted" id="imPolHint"></div>
        </div></div><div class="text-danger small mt-2" id="imErr"></div>`,
      footer: `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-primary" id="imSave"><i class="bi bi-check-lg"></i> Simpan KPI</button>`
    });
    const refresh = () => {
      const k = getKpi($('#imKpi').value);
      $('#imDetail').innerHTML = k ? kpiDetailHtml(k) : '<span class="text-muted">Pilih KPI untuk melihat detail (sasaran strategi, tipe, UoM, polarisasi, formula, PIC).</span>';
      const n = k ? nTarget(k.polarisasi) : 4;
      [0, 1, 2, 3].forEach(x => { const dis = x >= n; $('#imT' + x).disabled = dis; $('#imL' + x).disabled = dis; $('#imRow' + x).classList.toggle('opacity-50', dis); if (dis) { $('#imT' + x).value = ''; $('#imL' + x).value = ''; } });
      $$('.imUom').forEach(e => e.textContent = k ? k.uom : '');
      $('#imPolHint').innerHTML = k ? `<i class="bi bi-info-circle"></i> Polarisasi <b>${k.polarisasi}</b>: ${isMax(k.polarisasi) ? 'semakin tinggi semakin baik → Target 1 &lt; Target 2 …' : 'semakin rendah semakin baik → Target 1 &gt; Target 2 …'}${n === 2 ? ' · hanya Target 1 & 2 yang digunakan.' : ''}` : '';
    };
    const autoOne = x => { const k = getKpi($('#imKpi').value); if (k) $('#imL' + x).value = autoLabel(k.polarisasi, k.uom, $('#imT' + x).value); };
    $('#imKpi').addEventListener('change', refresh);
    $('#imAuto').onclick = () => [0, 1, 2, 3].forEach(x => !$('#imT' + x).disabled && autoOne(x));
    $$('[data-auto]').forEach(b => b.onclick = () => autoOne(Number(b.dataset.auto)));
    if (allowNew) $('#imNew').onclick = e => { e.preventDefault(); openNewKpiThenItem({ kategori, onSave, title, allowNew, bobot: $('#imBobot').value }); };
    refresh();
    $('#imSave').onclick = () => {
      const k = getKpi($('#imKpi').value);
      if (!k) { $('#imErr').textContent = 'KPI wajib dipilih.'; return; }
      const bobot = Number($('#imBobot').value);
      if (!(bobot > 0)) { $('#imErr').textContent = 'Bobot wajib diisi (> 0).'; return; }
      const target = [0, 1, 2, 3].map(x => $('#imT' + x).value === '' ? '' : Number($('#imT' + x).value));
      const e = checkTargets(k.polarisasi, target); if (e) { $('#imErr').textContent = e; return; }
      const label = [0, 1, 2, 3].map(x => $('#imL' + x).value.trim() || autoLabel(k.polarisasi, k.uom, target[x]));
      Object.assign(it, { kpiId: k.id, bobot, target, label });
      onSave(it);
    };
  }
  function openNewKpiThenItem(cfg) {
    modal({
      title: 'Buat KPI Baru – ' + KATEGORI[cfg.kategori], size: 'lg', body: `<div class="alert alert-info small py-2"><i class="bi bi-info-circle"></i> KPI baru akan disimpan ke <b>Kamus KPI</b> lalu langsung ditambahkan.</div>` + kpiFormHtml(blankKpi(cfg.kategori), true),
      footer: `<button class="btn btn-secondary" id="nkBack"><i class="bi bi-arrow-left"></i> Kembali</button><button class="btn btn-primary" id="nkSave"><i class="bi bi-save"></i> Simpan & Lanjut Isi Target</button>`
    });
    bindKpiForm();
    $('#nkBack').onclick = () => openItemModal(cfg);
    $('#nkSave').onclick = () => {
      const r = readKpiForm(); if (r.err) { $('#kfErr').textContent = r.err; return; }
      r.d.kategori = cfg.kategori;
      const k = Object.assign({ id: nextId('K', S.kpi) }, r.d); S.kpi.push(k); save();
      toast(`KPI "${esc(k.nama)}" ditambahkan ke Kamus KPI.`);
      openItemModal(Object.assign({}, cfg, { item: { uid: newUid(), kategori: cfg.kategori, kpiId: k.id, bobot: cfg.bobot || '', target: ['', '', '', ''], label: ['', '', '', ''], locked: cfg.kategori === 'A2' } }));
    };
  }

  // ------------------------------------------------------------------
  // MASTER: TEMPLATE SCORECARD
  // ------------------------------------------------------------------
  function assignedCount(t) { return S.plans.filter(p => p.templateId === t.id && p.periode === t.periode).length; }
  function pageTemplateList() {
    const rows = S.templates.map(t => {
      const j = getJenis(t.jenisOrg); const v = validateItems(t.items, j, ['A2']); const r = v.rows[0];
      return `<tr><td class="fw-semibold text-nowrap">${esc(t.kode)}</td><td><div class="fw-semibold">${esc(t.nama)}</div><div class="small text-muted">${esc(t.ket || '')}</div></td>
        <td>${esc(t.jabatan)}</td><td class="small">${esc(j.nama)}</td><td class="text-center">${t.items.length}</td>
        <td class="text-nowrap"><span class="${r.okB ? 'text-success' : 'text-danger'} fw-semibold">${fmtNum(r.total)}% / ${r.req}%</span> ${v.ok ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-exclamation-circle-fill text-danger" title="Belum sesuai Bobot Kategori"></i>'}</td>
        <td><span class="badge ${t.status === 'Aktif' ? 'text-bg-success' : 'text-bg-secondary'}">${t.status}</span></td>
        <td class="text-center">${assignedCount(t)} <span class="small text-muted">pegawai</span></td>
        <td class="text-nowrap"><a class="btn btn-sm btn-outline-primary" href="#/template/${t.id}" title="Ubah"><i class="bi bi-pencil"></i></a>
          <button class="btn btn-sm btn-success" onclick="App.assignTemplate('${t.id}')" ${v.ok ? '' : 'disabled'} title="Assign ke pegawai"><i class="bi bi-person-check"></i> Assign</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="App.dupTemplate('${t.id}')" title="Duplikat"><i class="bi bi-copy"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="App.delTemplate('${t.id}')" title="Hapus"><i class="bi bi-trash"></i></button></td></tr>`;
    }).join('');
    return pageHead('Template Scorecard', 'Master Perencanaan › Template Scorecard', `<a class="btn btn-primary" href="#/template/baru"><i class="bi bi-plus-lg"></i> Buat Template Scorecard</a>`) + `
      <div class="alert alert-info small"><i class="bi bi-info-circle"></i> Template scorecard berisi <b>KPI A2 (Inisiatif / Action Plan)</b> lengkap dengan bobot, target 1–4 dan labelnya. Total bobot A2 divalidasi terhadap <a href="#/bobot">Bobot Kategori</a>. Setelah valid, template di-<b>assign</b> ke pegawai (mis. jabatan Planner di seluruh branch); KPI A2 pada lembar perencanaan pegawai akan <b>terkunci</b>.</div>
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0">
        <thead><tr><th>Kode</th><th>Nama Template</th><th>Jabatan</th><th>Jenis Organisasi</th><th class="text-center">Jml KPI A2</th><th>Bobot A2</th><th>Status</th><th class="text-center">Di-assign</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" class="empty">Belum ada template.</td></tr>'}</tbody></table></div></div>`;
  }
  function pageTemplateEditor(id) {
    if (!EDIT || EDIT.kind !== 'tpl' || EDIT.id !== id) {
      const t = id === 'baru' ? { id: 'baru', kode: '', nama: '', periode: S.periode, jenisOrg: 'CB', jabatan: 'Planner', ket: '', status: 'Draft', items: [], assignments: [] } : getTpl(id);
      if (!t) return `<div class="empty"><i class="bi bi-question-circle"></i>Template tidak ditemukan.</div>`;
      EDIT = { kind: 'tpl', id, t: clone(t) };
    }
    const t = EDIT.t;
    return pageHead(id === 'baru' ? 'Buat Template Scorecard' : 'Ubah Template Scorecard', `Master Perencanaan › <a href="#/template">Template Scorecard</a> › ${id === 'baru' ? 'Baru' : esc(t.kode)}`,
      `<a href="#/template" class="btn btn-outline-secondary" onclick="App.discardEdit()">Batal</a>
       <button class="btn btn-outline-primary" onclick="App.previewTemplate()"><i class="bi bi-eye"></i> Pratinjau Lembar</button>
       <button class="btn btn-primary" onclick="App.saveTemplate(false)"><i class="bi bi-save"></i> Simpan</button>
       <button class="btn btn-success" id="tplSaveAssign" onclick="App.saveTemplate(true)"><i class="bi bi-person-check"></i> Simpan & Assign ke Pegawai</button>`) + `
      <div class="row g-3">
        <div class="col-lg-8"><div class="card"><div class="card-header">Informasi Template</div><div class="card-body"><div class="row g-3">
          <div class="col-md-8"><label class="form-label">Nama Template <span class="text-danger">*</span></label><input class="form-control" id="tfNama" value="${esc(t.nama)}" placeholder="mis. Scorecard Planner – Branch"></div>
          <div class="col-md-4"><label class="form-label">Periode</label><input type="number" class="form-control" id="tfPeriode" value="${t.periode}"></div>
          <div class="col-md-4"><label class="form-label">Jenis Organisasi <span class="text-danger">*</span></label><select class="form-select" id="tfJenis">${S.jenisOrg.map(j => `<option value="${j.id}" ${j.id === t.jenisOrg ? 'selected' : ''}>${esc(j.nama)}</option>`).join('')}</select></div>
          <div class="col-md-4"><label class="form-label">Jabatan Sasaran <span class="text-danger">*</span></label><select class="form-select" id="tfJabatan">${S.jabatan.map(j => `<option ${j === t.jabatan ? 'selected' : ''}>${esc(j)}</option>`).join('')}</select></div>
          <div class="col-md-4"><label class="form-label">Status</label><select class="form-select" id="tfStatus">${['Draft', 'Aktif'].map(s => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="col-12"><label class="form-label">Keterangan</label><input class="form-control" id="tfKet" value="${esc(t.ket)}"></div>
        </div></div></div></div>
        <div class="col-lg-4" id="tplValid"></div>
      </div>
      <div class="card mt-3"><div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span><span class="badge text-bg-warning">A2</span> KPI Inisiatif / Action Plan</span>
        <div class="d-flex gap-2"><button class="btn btn-sm btn-primary" onclick="App.tplAddItem(false)"><i class="bi bi-journal-plus"></i> Pilih dari Kamus KPI</button><button class="btn btn-sm btn-outline-primary" onclick="App.tplAddItem(true)"><i class="bi bi-plus-circle"></i> Buat KPI Baru</button></div>
      </div><div class="card-body" id="tplItems"></div></div>`;
  }
  function tplReadHeader() {
    const t = EDIT.t;
    t.nama = $('#tfNama').value.trim(); t.periode = Number($('#tfPeriode').value); t.jenisOrg = $('#tfJenis').value;
    t.jabatan = $('#tfJabatan').value; t.status = $('#tfStatus').value; t.ket = $('#tfKet').value.trim();
  }
  function tplRenderParts() {
    const t = EDIT.t; const j = getJenis(t.jenisOrg); const v = validateItems(t.items, j, ['A2']);
    $('#tplValid').innerHTML = validationHtml(v, j) + `<div class="small text-muted mt-2">Ketentuan dari menu <a href="#/bobot">Bobot Kategori</a>: A2 = <b>${j.a2.bobot}%</b>, ${j.a2.min}–${j.a2.max} KPI.</div>`;
    $('#tplItems').innerHTML = itemsTable(t.items, {
      showNum: true,
      actions: (it, i) => `<button class="btn btn-sm btn-outline-primary" onclick="App.tplEditItem(${i})"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger" onclick="App.tplDelItem(${i})"><i class="bi bi-trash"></i></button>`
    });
    $('#tplSaveAssign').disabled = !v.ok;
  }
  function bindTemplateEditor() {
    if (!EDIT || EDIT.kind !== 'tpl') return;
    ['#tfNama', '#tfPeriode', '#tfJenis', '#tfJabatan', '#tfStatus', '#tfKet'].forEach(s => $(s).addEventListener('change', () => { tplReadHeader(); tplRenderParts(); }));
    tplRenderParts();
  }
  function tplAddItem(asNew) {
    tplReadHeader();
    const cfg = { kategori: 'A2', allowNew: true, onSave: it => { it.locked = true; EDIT.t.items.push(it); closeModal(); tplRenderParts(); } };
    if (asNew) openNewKpiThenItem(cfg); else openItemModal(cfg);
  }
  function tplEditItem(i) {
    openItemModal({ kategori: 'A2', item: EDIT.t.items[i], allowNew: false, onSave: it => { EDIT.t.items[i] = it; closeModal(); tplRenderParts(); } });
  }
  function tplDelItem(i) { EDIT.t.items.splice(i, 1); tplRenderParts(); }
  function saveTemplate(thenAssign) {
    tplReadHeader();
    const t = EDIT.t;
    if (!t.nama) { toast('Nama template wajib diisi.', 'danger'); return; }
    const v = validateItems(t.items, getJenis(t.jenisOrg), ['A2']);
    if (thenAssign && !v.ok) { toast('Template belum valid terhadap Bobot Kategori.', 'danger'); return; }
    if (t.id === 'baru') { t.id = nextId('T', S.templates); t.kode = `SC-${t.periode}-${String(S.templates.length + 1).padStart(3, '0')}`; S.templates.push(t); }
    else S.templates[S.templates.findIndex(x => x.id === t.id)] = t;
    if (thenAssign) t.status = 'Aktif';
    save(); EDIT = null;
    toast(v.ok ? 'Template disimpan.' : 'Template disimpan sebagai draft (bobot belum valid).', v.ok ? 'success' : 'warning');
    location.hash = '#/template';
    if (thenAssign) setTimeout(() => assignTemplate(t.id), 50);
  }
  function previewTemplate() {
    tplReadHeader();
    const t = EDIT.t;
    modal({ title: 'Pratinjau KPI A2 pada Lembar Perencanaan Pegawai', size: 'xl', body: `<p class="small text-muted">Beginilah KPI A2 akan tampil pada lembar perencanaan pegawai (label target ditampilkan, baris terkunci).</p><div class="cat-title">${KATEGORI.A2}</div>${itemsTable(t.items.map(i => Object.assign({}, i, { locked: true })), { markLock: true })}` });
    $$('#appModal [data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
  }
  function dupTemplate(id) {
    const t = clone(getTpl(id)); t.id = nextId('T', S.templates); t.kode = `SC-${t.periode}-${String(S.templates.length + 1).padStart(3, '0')}`;
    t.nama += ' (salinan)'; t.status = 'Draft'; t.assignments = []; t.items.forEach(i => i.uid = newUid());
    S.templates.push(t); save(); route(); toast('Template diduplikat.');
  }
  function delTemplate(id) {
    if (assignedCount(getTpl(id))) { toast('Template sudah di-assign ke pegawai dan tidak dapat dihapus.', 'danger'); return; }
    confirmBox('Hapus Template', `Hapus template <b>${esc(getTpl(id).nama)}</b>?`, 'Hapus', 'btn-danger', () => { S.templates = S.templates.filter(t => t.id !== id); save(); closeModal(); route(); });
  }

  // Assign template ke pegawai
  function assignTemplate(id) {
    const t = getTpl(id); const j = getJenis(t.jenisOrg);
    const units = S.units.filter(u => u.jenisOrg === t.jenisOrg);
    modal({
      title: `Assign Scorecard – ${esc(t.nama)}`, size: 'xl',
      body: `<div class="row g-3">
        <div class="col-lg-4">
          <div class="border rounded p-3 bg-light small mb-3"><div><b>${esc(t.kode)}</b> · ${esc(j.nama)}</div><div>${t.items.length} KPI A2 · total bobot ${fmtNum(t.items.reduce((a, i) => a + i.bobot, 0))}%</div></div>
          <label class="form-label">Jabatan</label>
          <select class="form-select mb-3" id="asJab">${S.jabatan.map(x => `<option ${x === t.jabatan ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
          <label class="form-label">Unit / Branch</label>
          <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="asAll" checked><label class="form-check-label fw-semibold" for="asAll">Seluruh unit (${esc(j.nama)})</label></div>
          <div class="ps-3">${units.map(u => `<div class="form-check"><input class="form-check-input asUnit" type="checkbox" value="${u.id}" id="as${u.id}" checked><label class="form-check-label" for="as${u.id}">${esc(u.nama)}</label></div>`).join('')}</div>
          <div class="alert alert-warning small mt-3 mb-0"><i class="bi bi-lock"></i> KPI A2 dari template ini akan <b>terkunci</b> pada lembar perencanaan pegawai (tidak dapat diubah pegawai).</div>
        </div>
        <div class="col-lg-8"><div class="fw-semibold mb-2">Pegawai yang akan menerima scorecard <span class="badge text-bg-primary" id="asCount"></span></div><div id="asPreview"></div></div>
      </div>`,
      footer: `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-success" id="asGo"><i class="bi bi-person-check"></i> Assign</button>`
    });
    const calc = () => {
      const jab = $('#asJab').value; const us = $$('.asUnit').filter(c => c.checked).map(c => c.value);
      const emps = S.employees.filter(e => e.jabatan === jab && us.includes(e.unit));
      return emps.map(e => {
        const p = S.plans.find(x => x.nip === e.nip && x.periode === t.periode);
        let aksi, cls;
        if (!p) { aksi = 'Lembar perencanaan baru dibuat'; cls = 'success'; }
        else if (EDITABLE_BY_PEGAWAI.includes(p.status)) { aksi = 'KPI A2 diganti dengan template ini'; cls = 'primary'; }
        else { aksi = 'Dilewati – perencanaan sedang/sudah diproses (' + STATUS[p.status].label + ')'; cls = 'secondary'; }
        return { e, p, aksi, cls, skip: cls === 'secondary' };
      });
    };
    const render = () => {
      const r = calc(); const n = r.filter(x => !x.skip).length;
      $('#asCount').textContent = n + ' pegawai';
      $('#asPreview').innerHTML = r.length ? `<div class="table-responsive"><table class="table table-sm table-bordered"><thead><tr><th>NIP</th><th>Nama</th><th>Unit</th><th>Tindakan</th></tr></thead><tbody>${r.map(x => `<tr class="${x.skip ? 'text-muted' : ''}"><td>${x.e.nip}</td><td>${esc(x.e.nama)}</td><td>${esc(getUnit(x.e.unit).nama)}</td><td><span class="badge text-bg-${x.cls}">${x.aksi}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><i class="bi bi-people"></i>Tidak ada pegawai dengan jabatan & unit tersebut.</div>';
      $('#asGo').disabled = n === 0;
      $('#asAll').checked = $$('.asUnit').every(c => c.checked);
    };
    $('#asJab').onchange = render;
    $('#asAll').onchange = e => { $$('.asUnit').forEach(c => c.checked = e.target.checked); render(); };
    $$('.asUnit').forEach(c => c.onchange = render);
    render();
    $('#asGo').onclick = () => {
      const r = calc().filter(x => !x.skip); const tgl = nowStr();
      r.forEach(({ e, p }) => {
        const a2 = clone(t.items).map(i => Object.assign(i, { uid: newUid(), locked: true }));
        const h = { tgl, oleh: me().nama, aksi: `Template ${t.kode} di-assign oleh Tim HC (KPI A2 terkunci)`, catatan: '' };
        if (!p) S.plans.push({ id: nextId('PL', S.plans, 3), nip: e.nip, periode: t.periode, templateId: t.id, status: 'DRAFT', items: a2, approvals: { pegawai: null, atasan: null, hc: null }, history: [h], hcChanges: null, catatanTolak: null, catatanAtasan: null, ack: false });
        else { p.items = [...a2, ...p.items.filter(i => i.kategori !== 'A2')]; p.templateId = t.id; p.history.push(h); }
      });
      t.assignments.push({ tgl, oleh: me().nama, jabatan: $('#asJab').value, units: $$('.asUnit').filter(c => c.checked).map(c => c.value), jumlah: r.length });
      t.status = 'Aktif';
      save(); closeModal(); route(); toast(`Scorecard berhasil di-assign ke ${r.length} pegawai.`);
    };
  }

  // ------------------------------------------------------------------
  // Tampilan lembar perencanaan (dipakai pegawai, atasan, HC)
  // ------------------------------------------------------------------
  function planHeaderHtml(p) {
    const e = getEmp(p.nip); const at = e.atasan ? getEmp(e.atasan) : null; const t = getTpl(p.templateId);
    const c = (l, v) => `<div class="col-sm-6 col-lg-3"><div class="small text-muted">${l}</div><div class="fw-semibold">${v}</div></div>`;
    return `<div class="row g-2 mb-2">${c('Pegawai', `${esc(e.nama)} <span class="text-muted fw-normal">(${e.nip})</span>`)}${c('Jabatan / Unit', `${esc(e.jabatan)} – ${esc(getUnit(e.unit).nama)}`)}${c('Atasan Langsung', at ? esc(at.nama) : '–')}${c('Template Scorecard', t ? `${esc(t.kode)} – ${esc(t.nama)}` : '–')}</div>`;
  }
  function stepperHtml(p) {
    const st = p.status;
    const idx = { DRAFT: 0, TOLAK: 0, KEMBALI: 0, ATASAN: 1, HC: 2, OK: 4, REVISI: 4 }[st];
    const steps = ['Pengisian & Persetujuan Pegawai', 'Persetujuan Atasan', 'Persetujuan Tim HC', 'Final'];
    return `<div class="stepper mb-3">${steps.map((s, i) => {
      let cls = i < idx ? 'done' : i === idx ? 'current' : '';
      if (i === 0 && (st === 'TOLAK' || st === 'KEMBALI')) cls = 'bad';
      if (i === 3 && idx === 4) cls = 'done';
      return `<div class="step ${cls}"><span class="num">${cls === 'done' ? '<i class="bi bi-check"></i>' : i + 1}</span>${s}</div>`;
    }).join('')}</div>`;
  }
  function approvalTableHtml(p) {
    const e = getEmp(p.nip); const at = e.atasan ? getEmp(e.atasan) : null; const a = p.approvals;
    const rejected = p.status === 'TOLAK'; const returned = p.status === 'KEMBALI';
    const row = (tahap, nama, tgl, waitTxt, extra) => `<tr><td>${tahap}</td><td>${nama}</td><td>${tgl ? `<span class="text-success"><i class="bi bi-check-circle-fill"></i> Disetujui</span>` : extra || `<span class="text-muted">${waitTxt}</span>`}</td><td>${fmtDate(tgl)}</td></tr>`;
    return `<table class="table table-sm table-bordered bg-white mb-0"><thead><tr><th>Tahap</th><th>Nama</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>
      ${row('Pegawai', esc(e.nama), a.pegawai, 'Belum diajukan')}
      ${row('Atasan Langsung', at ? esc(at.nama) : '–', a.atasan, 'Menunggu', returned ? '<span class="text-danger"><i class="bi bi-arrow-return-left"></i> Dikembalikan</span>' : '')}
      ${row('Tim HC', a.hc ? esc(a.hc.nama) : 'Tim Human Capital', a.hc && a.hc.tgl, 'Menunggu', rejected ? '<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Ditolak</span>' : '')}
      </tbody></table>${p.status === 'REVISI' ? '<div class="small text-primary mt-1"><i class="bi bi-pencil-fill"></i> Disetujui HC dengan perubahan.</div>' : ''}`;
  }
  function historyHtml(p) {
    return `<ul class="list-unstyled small mb-0">${p.history.slice().reverse().map(h => `<li class="mb-2 border-start border-3 ps-2"><div class="text-muted">${fmtDate(h.tgl)} · ${esc(h.oleh)}</div><div class="fw-semibold">${esc(h.aksi)}</div>${h.catatan ? `<div class="fst-italic">“${esc(h.catatan)}”</div>` : ''}</li>`).join('')}</ul>`;
  }
  function changesTableHtml(c) {
    return `<div class="table-responsive"><table class="table table-sm table-bordered bg-white mb-0"><thead><tr><th>Kat.</th><th>KPI</th><th>Perubahan</th><th>Sebelum</th><th>Sesudah</th><th>Catatan HC</th></tr></thead><tbody>
      ${c.rows.map(r => `<tr><td>${katBadge(r.kategori)}</td><td>${esc(r.kpi)}</td><td>${esc(r.jenis)}</td><td class="text-danger">${esc(r.dari)}</td><td class="text-success fw-semibold">${esc(r.ke)}</td><td class="small">${esc(r.catatan || '–')}</td></tr>`).join('')}
      </tbody></table></div>`;
  }
  function sheetBodyHtml(p, o = {}) {
    const j = empJenis(getEmp(p.nip));
    const a1 = p.items.filter(i => i.kategori === 'A1'); const a2 = p.items.filter(i => i.kategori === 'A2');
    return `<div class="cat-title">${KATEGORI.A2} <span class="text-muted small fw-normal">– bobot ${j.a2.bobot}% · ditetapkan Tim HC</span></div>${itemsTable(a2, { markLock: true, showNum: o.showNum })}
      <div class="cat-title d-flex justify-content-between align-items-center"><span>${KATEGORI.A1} <span class="text-muted small fw-normal">– bobot ${j.a1.bobot}%</span></span>${o.a1Btn || ''}</div>${itemsTable(a1, { showNum: o.showNum, actions: o.a1Actions })}`;
  }

  // ------------------------------------------------------------------
  // PEGAWAI: LEMBAR PERENCANAAN SAYA
  // ------------------------------------------------------------------
  function pageLembar() {
    const p = S.plans.find(x => x.nip === S.session && x.periode === S.periode);
    const head = pageHead(`Lembar Perencanaan Kinerja ${S.periode}`, 'Perencanaan Kinerja › Lembar Perencanaan Saya', p ? `<button class="btn btn-outline-danger" onclick="App.exportPdf('${p.id}')"><i class="bi bi-file-earmark-pdf"></i> Export PDF</button>` : '');
    if (!p) return head + `<div class="card"><div class="empty"><i class="bi bi-inbox"></i>Belum ada Template Scorecard yang di-assign oleh Tim HC untuk Anda pada periode ${S.periode}.</div></div>`;
    const j = empJenis(getEmp(p.nip));
    const editable = EDITABLE_BY_PEGAWAI.includes(p.status);
    const v = validateItems(p.items, j);
    let banner = '';
    if (p.status === 'TOLAK') banner = `<div class="alert alert-danger"><h6 class="alert-heading"><i class="bi bi-x-circle-fill"></i> Perencanaan ditolak oleh Tim HC</h6><div>${esc(p.catatanTolak)}</div><hr><div class="small mb-0">Lembar perencanaan telah <b>aktif kembali</b>. Silakan sesuaikan KPI A1 Anda lalu ajukan persetujuan kembali.</div></div>`;
    if (p.status === 'KEMBALI') banner = `<div class="alert alert-warning"><h6 class="alert-heading"><i class="bi bi-arrow-return-left"></i> Dikembalikan oleh atasan</h6>${esc(p.catatanAtasan)}</div>`;
    if (p.status === 'REVISI' && p.hcChanges) banner = `<div class="alert ${p.ack ? 'alert-light border' : 'alert-primary'}"><h6 class="alert-heading"><i class="bi bi-pencil-fill"></i> Perencanaan Anda telah diubah & disetujui oleh Tim HC</h6>
      <div class="small mb-2">Oleh ${esc(p.hcChanges.oleh)} pada ${fmtDate(p.hcChanges.tgl)}. Catatan: <i>“${esc(p.hcChanges.catatan)}”</i></div>${changesTableHtml(p.hcChanges)}
      ${p.ack ? '<div class="small text-success mt-2"><i class="bi bi-check2-all"></i> Anda telah menerima perubahan ini.</div>' : `<button class="btn btn-primary btn-sm mt-2" onclick="App.ackChanges('${p.id}')"><i class="bi bi-check2-all"></i> Saya telah membaca & menerima perubahan</button>`}</div>`;
    if (p.status === 'DRAFT') banner = `<div class="alert alert-info small"><i class="bi bi-info-circle"></i> KPI A2 telah ditetapkan Tim HC (terkunci <i class="bi bi-lock-fill"></i>). Lengkapi <b>KPI A1</b> sesuai ketentuan bobot kategori, lalu klik <b>Setujui & Ajukan ke Atasan</b>.</div>`;

    const actions = editable ? `<div class="d-flex flex-wrap gap-2 justify-content-end mt-3">
      <button class="btn btn-success" onclick="App.submitPlan('${p.id}')" ${v.ok ? '' : 'disabled'}><i class="bi bi-send-check"></i> Setujui & Ajukan ke Atasan</button></div>
      ${v.ok ? '' : '<div class="text-end small text-danger mt-1">Tombol ajukan aktif setelah validasi bobot kategori terpenuhi.</div>'}` : '';
    return head + stepperHtml(p) + banner + `
      <div class="row g-3">
        <div class="col-12"><div class="card"><div class="card-body">
          <div class="d-flex justify-content-between flex-wrap gap-2 mb-2"><div>${statusBadge(p.status)}</div></div>
          ${planHeaderHtml(p)}
          ${sheetBodyHtml(p, {
            a1Btn: editable ? `<span class="d-flex gap-2"><button class="btn btn-sm btn-primary" onclick="App.pgAddA1('${p.id}')"><i class="bi bi-plus-lg"></i> Tambah KPI A1</button></span>` : '',
            a1Actions: editable ? (it) => `<button class="btn btn-sm btn-outline-primary" onclick="App.pgEditA1('${p.id}','${it.uid}')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger" onclick="App.pgDelA1('${p.id}','${it.uid}')"><i class="bi bi-trash"></i></button>` : null
          })}
          ${actions}
        </div></div></div>
        <div class="col-lg-4">${validationHtml(v, j)}</div>
        <div class="col-lg-4"><div class="card h-100"><div class="card-header">Status Persetujuan</div><div class="card-body p-2">${approvalTableHtml(p)}</div></div></div>
        <div class="col-lg-4"><div class="card h-100"><div class="card-header">Riwayat</div><div class="card-body">${historyHtml(p)}</div></div></div>
      </div>`;
  }
  function pgAddA1(pid) {
    openItemModal({ kategori: 'A1', onSave: it => { it.locked = false; getPlan(pid).items.push(it); save(); closeModal(); route(); toast('KPI A1 ditambahkan.'); } });
  }
  function pgEditA1(pid, uid) {
    const p = getPlan(pid); const idx = p.items.findIndex(i => i.uid === uid);
    openItemModal({ kategori: 'A1', item: p.items[idx], onSave: it => { p.items[idx] = it; save(); closeModal(); route(); toast('KPI A1 diperbarui.'); } });
  }
  function pgDelA1(pid, uid) { const p = getPlan(pid); p.items = p.items.filter(i => i.uid !== uid); save(); route(); }
  function submitPlan(pid) {
    const p = getPlan(pid);
    confirmBox('Setujui & Ajukan Perencanaan', 'Dengan mengajukan, Anda <b>menyetujui</b> lembar perencanaan kinerja ini dan meneruskannya ke atasan langsung untuk disetujui.', 'Ajukan', 'btn-success', () => {
      p.status = 'ATASAN'; p.approvals = { pegawai: nowStr(), atasan: null, hc: null }; p.catatanTolak = null; p.catatanAtasan = null;
      p.history.push({ tgl: nowStr(), oleh: getEmp(p.nip).nama, aksi: 'Pegawai menyetujui & mengajukan perencanaan', catatan: '' });
      save(); closeModal(); route(); toast('Perencanaan diajukan ke atasan.');
    });
  }
  function ackChanges(pid) {
    const p = getPlan(pid); p.ack = true;
    p.history.push({ tgl: nowStr(), oleh: getEmp(p.nip).nama, aksi: 'Pegawai menerima perubahan dari Tim HC', catatan: '' });
    save(); route(); toast('Perubahan diterima.');
  }

  // ------------------------------------------------------------------
  // ATASAN: PERSETUJUAN TIM
  // ------------------------------------------------------------------
  function pageTim() {
    const sub = subordinates(S.session);
    const rows = sub.map(e => {
      const p = S.plans.find(x => x.nip === e.nip && x.periode === S.periode);
      return `<tr><td>${e.nip}</td><td class="fw-semibold">${esc(e.nama)}</td><td>${esc(e.jabatan)}</td><td>${p ? statusBadge(p.status) : '<span class="text-muted small">Belum di-assign</span>'}</td><td>${p ? fmtDate(p.approvals.pegawai) : '–'}</td>
        <td class="text-nowrap">${p ? `<button class="btn btn-sm ${p.status === 'ATASAN' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="App.viewPlan('${p.id}')">${p.status === 'ATASAN' ? 'Tinjau & Setujui' : 'Lihat'}</button> <button class="btn btn-sm btn-outline-danger" onclick="App.exportPdf('${p.id}')" title="Export PDF"><i class="bi bi-file-earmark-pdf"></i></button>` : ''}</td></tr>`;
    }).join('');
    return pageHead('Persetujuan Tim', 'Perencanaan Kinerja › Persetujuan Tim (Atasan)') + `
      <div class="card"><div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>NIP</th><th>Nama</th><th>Jabatan</th><th>Status</th><th>Diajukan</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty">Tidak ada bawahan langsung.</td></tr>'}</tbody></table></div></div>`;
  }

  // ------------------------------------------------------------------
  // HC: PERSETUJUAN PERENCANAAN
  // ------------------------------------------------------------------
  function pagePersetujuan() {
    const q = F.apQ.toLowerCase();
    const list = S.plans.filter(p => {
      const e = getEmp(p.nip);
      return p.periode === S.periode && (!F.apS || p.status === F.apS) && (!F.apU || e.unit === F.apU) && (!F.apJ || e.jabatan === F.apJ) && (!q || (e.nama + e.nip).toLowerCase().includes(q));
    });
    const chips = ['', ...Object.keys(STATUS)].map(s => {
      const n = S.plans.filter(p => p.periode === S.periode && (!s || p.status === s)).length;
      return `<button class="btn btn-sm ${F.apS === s ? 'btn-dark' : 'btn-outline-secondary'}" onclick="App.setF('apS','${s}')">${s ? STATUS[s].label : 'Semua'} <span class="badge text-bg-light">${n}</span></button>`;
    }).join('');
    const rows = list.map(p => {
      const e = getEmp(p.nip); const j = empJenis(e); const v = validateItems(p.items, j); const t = getTpl(p.templateId);
      const tot = k => p.items.filter(i => i.kategori === k).reduce((a, i) => a + i.bobot, 0);
      return `<tr>
        <td>${p.status === 'HC' ? `<input class="form-check-input apChk" type="checkbox" value="${p.id}" ${v.ok ? '' : 'disabled'}>` : ''}</td>
        <td><div class="fw-semibold">${esc(e.nama)}</div><div class="small text-muted">${e.nip}</div></td>
        <td>${esc(e.jabatan)}<div class="small text-muted">${esc(getUnit(e.unit).nama)}</div></td>
        <td class="small">${t ? esc(t.kode) : '–'}</td>
        <td class="small text-nowrap">A1 ${fmtNum(tot('A1'))}% · A2 ${fmtNum(tot('A2'))}% ${v.ok ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-exclamation-circle-fill text-danger" title="Belum sesuai bobot kategori"></i>'}</td>
        <td class="small">${fmtDate(p.approvals.pegawai)}</td><td class="small">${fmtDate(p.approvals.atasan)}</td>
        <td>${statusBadge(p.status)}</td>
        <td class="text-nowrap"><button class="btn btn-sm btn-outline-primary" onclick="App.viewPlan('${p.id}')" title="Lihat"><i class="bi bi-eye"></i></button>
          ${['HC', 'OK', 'REVISI'].includes(p.status) ? `<a class="btn btn-sm btn-outline-warning" href="#/persetujuan/${p.id}/edit" title="Ubah (Form Editor)"><i class="bi bi-pencil-square"></i></a>` : ''}
          ${p.status === 'HC' ? `<button class="btn btn-sm btn-outline-success" onclick="App.hcApprove('${p.id}')" title="Setujui"><i class="bi bi-check-lg"></i></button> <button class="btn btn-sm btn-outline-danger" onclick="App.hcReject('${p.id}')" title="Tolak"><i class="bi bi-x-lg"></i></button>` : ''}
          <button class="btn btn-sm btn-outline-dark" onclick="App.exportPdf('${p.id}')" title="Export PDF"><i class="bi bi-file-earmark-pdf"></i></button></td></tr>`;
    }).join('');
    const sel = (key, opts, ph) => `<select class="form-select form-select-sm" style="max-width:200px" onchange="App.setF('${key}',this.value)"><option value="">${ph}</option>${opts.map(o => `<option value="${esc(o[0])}" ${F[key] === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
    return pageHead('Persetujuan Perencanaan', 'Master Perencanaan › Persetujuan Perencanaan', `<button class="btn btn-success" onclick="App.hcBulkApprove()"><i class="bi bi-check2-all"></i> Setujui Terpilih</button>`) + `
      <div class="alert alert-info small"><i class="bi bi-info-circle"></i> Daftar lembar perencanaan yang telah <b>disetujui pegawai dan atasan</b>. Tim HC dapat <b>menyetujui</b>, <b>mengubah</b> (KPI, bobot, target – disertai catatan) atau <b>menolak</b>. Jika ditolak, lembar perencanaan aktif kembali dan pegawai wajib menyesuaikan lalu mengajukan ulang.</div>
      <div class="d-flex flex-wrap gap-1 mb-3">${chips}</div>
      <div class="card"><div class="card-header d-flex flex-wrap gap-2">
        ${sel('apU', S.units.map(u => [u.id, u.nama]), 'Semua Unit / Branch')}
        ${sel('apJ', S.jabatan.map(j => [j, j]), 'Semua Jabatan')}
        <input class="form-control form-control-sm ms-auto" style="max-width:240px" placeholder="Cari nama / NIP…" value="${esc(F.apQ)}" onchange="App.setF('apQ',this.value)">
      </div><div class="table-responsive"><table class="table table-hover mb-0">
        <thead><tr><th><input class="form-check-input" type="checkbox" onclick="document.querySelectorAll('.apChk:not(:disabled)').forEach(c=>c.checked=this.checked)"></th><th>Pegawai</th><th>Jabatan / Unit</th><th>Template</th><th>Bobot</th><th>Disetujui Pegawai</th><th>Disetujui Atasan</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" class="empty">Tidak ada data.</td></tr>'}</tbody></table></div></div>`;
  }

  // Detail lembar (modal) – dipakai HC & atasan
  function viewPlan(pid) {
    const p = getPlan(pid); const e = getEmp(p.nip); const j = empJenis(e); const v = validateItems(p.items, j);
    const hc = isHC(); const isAtasan = e.atasan === S.session;
    let footer = `<button class="btn btn-outline-dark me-auto" onclick="App.exportPdf('${p.id}')"><i class="bi bi-file-earmark-pdf"></i> Export PDF</button><button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>`;
    if (hc && p.status === 'HC') footer += `<button class="btn btn-danger" onclick="App.hcReject('${p.id}')"><i class="bi bi-x-lg"></i> Tolak</button><a class="btn btn-warning" href="#/persetujuan/${p.id}/edit" onclick="App.closeModal()"><i class="bi bi-pencil-square"></i> Ubah</a><button class="btn btn-success" onclick="App.hcApprove('${p.id}')"><i class="bi bi-check-lg"></i> Setujui</button>`;
    else if (hc && ['OK', 'REVISI'].includes(p.status)) footer += `<a class="btn btn-warning" href="#/persetujuan/${p.id}/edit" onclick="App.closeModal()"><i class="bi bi-pencil-square"></i> Ubah</a>`;
    if (isAtasan && p.status === 'ATASAN') footer += `<button class="btn btn-outline-danger" onclick="App.atasanReturn('${p.id}')"><i class="bi bi-arrow-return-left"></i> Kembalikan</button><button class="btn btn-success" onclick="App.atasanApprove('${p.id}')"><i class="bi bi-check-lg"></i> Setujui</button>`;
    modal({
      title: `Lembar Perencanaan Kinerja ${p.periode} – ${esc(e.nama)}`, size: 'xl',
      body: `${stepperHtml(p)}<div class="mb-2">${statusBadge(p.status)}</div>${planHeaderHtml(p)}
        ${p.status === 'TOLAK' ? `<div class="alert alert-danger small"><b>Alasan penolakan HC:</b> ${esc(p.catatanTolak)}</div>` : ''}
        ${p.status === 'REVISI' && p.hcChanges ? `<div class="alert alert-primary small"><b>Diubah HC:</b> ${esc(p.hcChanges.catatan)}<div class="mt-2">${changesTableHtml(p.hcChanges)}</div></div>` : ''}
        ${sheetBodyHtml(p, { showNum: hc })}
        <div class="row g-3 mt-1"><div class="col-lg-4">${validationHtml(v, j)}</div><div class="col-lg-4"><div class="fw-semibold small mb-1">Status Persetujuan</div>${approvalTableHtml(p)}</div><div class="col-lg-4"><div class="fw-semibold small mb-1">Riwayat</div>${historyHtml(p)}</div></div>`,
      footer
    });
    $$('#appModal [data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
  }
  function atasanApprove(pid) {
    const p = getPlan(pid);
    p.status = 'HC'; p.approvals.atasan = nowStr();
    p.history.push({ tgl: nowStr(), oleh: me().nama, aksi: 'Atasan menyetujui perencanaan', catatan: '' });
    save(); closeModal(); route(); toast('Perencanaan disetujui & diteruskan ke Tim HC.');
  }
  function atasanReturn(pid) {
    const p = getPlan(pid);
    modal({ title: 'Kembalikan ke Pegawai', size: 'md', body: `<label class="form-label">Catatan untuk pegawai <span class="text-danger">*</span></label><textarea class="form-control" rows="3" id="rtNote"></textarea><div class="text-danger small mt-1" id="rtErr"></div>`, footer: `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-danger" id="rtGo">Kembalikan</button>` });
    $('#rtGo').onclick = () => {
      const n = $('#rtNote').value.trim(); if (!n) { $('#rtErr').textContent = 'Catatan wajib diisi.'; return; }
      p.status = 'KEMBALI'; p.catatanAtasan = n; p.approvals = { pegawai: null, atasan: null, hc: null };
      p.history.push({ tgl: nowStr(), oleh: me().nama, aksi: 'Atasan mengembalikan perencanaan', catatan: n });
      save(); closeModal(); route(); toast('Perencanaan dikembalikan ke pegawai.', 'warning');
    };
  }
  function hcApprove(pid) {
    const p = getPlan(pid); const e = getEmp(p.nip);
    if (!validateItems(p.items, empJenis(e)).ok) { toast('Bobot belum sesuai ketentuan Bobot Kategori. Gunakan Ubah atau Tolak.', 'danger'); return; }
    modal({ title: 'Setujui Perencanaan', size: 'md', body: `<p>Setujui lembar perencanaan <b>${esc(e.nama)}</b> (${esc(e.jabatan)} – ${esc(getUnit(e.unit).nama)})?</p><label class="form-label">Catatan (opsional)</label><textarea class="form-control" rows="2" id="apNote"></textarea>`, footer: `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-success" id="apGo"><i class="bi bi-check-lg"></i> Setujui</button>` });
    $('#apGo').onclick = () => { doHcApprove(p, $('#apNote').value.trim()); save(); closeModal(); route(); toast('Perencanaan disetujui.'); };
  }
  function doHcApprove(p, note) {
    p.status = 'OK'; p.approvals.hc = { tgl: nowStr(), nama: me().nama };
    p.history.push({ tgl: nowStr(), oleh: me().nama, aksi: 'Tim HC menyetujui perencanaan', catatan: note || '' });
  }
  function hcBulkApprove() {
    const ids = $$('.apChk').filter(c => c.checked).map(c => c.value);
    if (!ids.length) { toast('Pilih minimal satu perencanaan berstatus Menunggu Persetujuan HC.', 'warning'); return; }
    confirmBox('Setujui Terpilih', `Setujui <b>${ids.length}</b> lembar perencanaan terpilih?`, 'Setujui', 'btn-success', () => {
      ids.forEach(id => doHcApprove(getPlan(id), '')); save(); closeModal(); route(); toast(`${ids.length} perencanaan disetujui.`);
    });
  }
  function hcReject(pid) {
    const p = getPlan(pid); const e = getEmp(p.nip);
    modal({
      title: 'Tolak Perencanaan', size: 'md',
      body: `<p class="small">Perencanaan <b>${esc(e.nama)}</b> akan dikembalikan dan <b>aktif kembali</b>. Pegawai wajib menyesuaikan KPI lalu mengajukan persetujuan ulang (melalui atasan).</p>
        <label class="form-label">Alasan penolakan <span class="text-danger">*</span></label><textarea class="form-control" rows="4" id="rjNote" placeholder="Jelaskan KPI / bobot / target yang perlu disesuaikan…"></textarea><div class="text-danger small mt-1" id="rjErr"></div>`,
      footer: `<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button class="btn btn-danger" id="rjGo"><i class="bi bi-x-lg"></i> Tolak</button>`
    });
    $('#rjGo').onclick = () => {
      const n = $('#rjNote').value.trim(); if (!n) { $('#rjErr').textContent = 'Alasan penolakan wajib diisi.'; return; }
      p.status = 'TOLAK'; p.catatanTolak = n; p.approvals = { pegawai: null, atasan: null, hc: null };
      p.history.push({ tgl: nowStr(), oleh: me().nama, aksi: 'Tim HC menolak perencanaan', catatan: n });
      save(); closeModal(); route(); toast('Perencanaan ditolak & dikembalikan ke pegawai.', 'danger');
    };
  }

  // ------------------------------------------------------------------
  // HC: FORM EDITOR PERUBAHAN PERENCANAAN
  // ------------------------------------------------------------------
  function pageHcEditor(pid) {
    const p = getPlan(pid);
    if (!p) return `<div class="empty"><i class="bi bi-question-circle"></i>Perencanaan tidak ditemukan.</div>`;
    if (!['HC', 'OK', 'REVISI'].includes(p.status)) return `<div class="empty"><i class="bi bi-lock"></i>Perencanaan ini belum disetujui pegawai & atasan sehingga belum dapat diubah HC.</div>`;
    if (!EDIT || EDIT.kind !== 'hc' || EDIT.id !== pid) EDIT = { kind: 'hc', id: pid, orig: clone(p.items), items: clone(p.items), notes: {} };
    return pageHead('Form Editor Perubahan Perencanaan', `Master Perencanaan › <a href="#/persetujuan">Persetujuan Perencanaan</a> › Ubah`,
      `<a class="btn btn-outline-secondary" href="#/persetujuan" onclick="App.discardEdit()">Batal</a><button class="btn btn-outline-secondary" onclick="App.edReset()"><i class="bi bi-arrow-counterclockwise"></i> Kembalikan ke Semula</button>`) + `
      <div class="alert alert-warning small"><i class="bi bi-exclamation-triangle"></i> Perubahan yang dilakukan Tim HC (KPI, bobot, target & label) akan <b>langsung berlaku</b> dan diterima oleh pegawai beserta catatan perubahannya. Baris yang diubah ditandai <span class="badge text-bg-warning chg-badge">Diubah</span>, baris baru <span class="badge text-bg-success chg-badge">Baru</span>.</div>
      <div class="card mb-3"><div class="card-body">${statusBadge(p.status)}<div class="mt-2">${planHeaderHtml(p)}</div></div></div>
      <div class="card"><div class="card-body" id="edTables"></div></div>
      <div class="row g-3 mt-0"><div class="col-lg-4">
        <div id="edValid"></div></div>
        <div class="col-lg-4"><div class="card h-100"><div class="card-header">Catatan Perubahan HC <span class="text-danger">*</span></div><div class="card-body">
          <textarea class="form-control" rows="4" id="edNote" placeholder="Ringkasan alasan perubahan (akan diterima pegawai)…">${esc(EDIT.note || '')}</textarea>
          <div class="small text-muted mt-1">Catatan per KPI dapat diisi pada kolom "Catatan" di setiap baris.</div>
          <div class="text-danger small mt-2" id="edErr"></div>
          <button class="btn btn-success w-100 mt-2" onclick="App.edSave()"><i class="bi bi-check2-circle"></i> Simpan Perubahan & Setujui</button>
        </div></div></div>
        <div class="col-lg-4"><div class="card h-100"><div class="card-header">Ringkasan Perubahan</div><div class="card-body small" id="edDiff"></div></div></div>
      </div>`;
  }
  function edRowState(it) {
    const o = EDIT.orig.find(x => x.uid === it.uid);
    if (!o) return 'added';
    return (o.kpiId !== it.kpiId || Number(o.bobot) !== Number(it.bobot) || JSON.stringify(o.target.map(String)) !== JSON.stringify(it.target.map(String)) || JSON.stringify(o.label) !== JSON.stringify(it.label)) ? 'changed' : '';
  }
  function edTableHtml(kat) {
    const its = EDIT.items.filter(i => i.kategori === kat);
    const opts = sel => PERSPEKTIF.map(p => { const ks = S.kpi.filter(k => k.kategori === kat && (getSS(k.sasaranId) || {}).perspektif === p); return ks.length ? `<optgroup label="${p}">${ks.map(k => `<option value="${k.id}" ${k.id === sel ? 'selected' : ''}>${esc(k.kode)} – ${esc(k.nama)}</option>`).join('')}</optgroup>` : ''; }).join('');
    const rows = its.map((it, i) => {
      const k = getKpi(it.kpiId) || {}; const n = nTarget(k.polarisasi); const st = edRowState(it); const terr = k.id ? checkTargets(k.polarisasi, it.target) : 'Pilih KPI';
      return `<tr id="edr-${it.uid}" class="${st}"><td>${i + 1}<div>${st === 'changed' ? '<span class="badge text-bg-warning chg-badge">Diubah</span>' : st === 'added' ? '<span class="badge text-bg-success chg-badge">Baru</span>' : ''}</div></td>
        <td style="min-width:230px"><select class="form-select" onchange="App.edSet('${it.uid}','kpiId',this.value)"><option value="">– Pilih KPI –</option>${opts(it.kpiId)}</select>
          <div class="small text-muted mt-1">${k.id ? `${esc(k.uom)} · ${esc(k.polarisasi)}` : ''}</div><div class="small text-danger" id="ede-${it.uid}">${terr || ''}</div></td>
        <td style="width:80px"><input type="number" class="form-control" value="${esc(it.bobot)}" oninput="App.edSet('${it.uid}','bobot',this.value)"></td>
        ${[0, 1, 2, 3].map(x => x < n ? `<td class="tgt-cell"><input type="number" step="any" class="form-control" value="${esc(it.target[x])}" placeholder="angka" oninput="App.edSet('${it.uid}','t${x}',this.value)"><input class="form-control" value="${esc(it.label[x])}" placeholder="label" id="edl-${it.uid}-${x}" oninput="App.edSet('${it.uid}','l${x}',this.value)"></td>` : '<td class="text-center text-muted">–</td>').join('')}
        <td style="min-width:150px"><input class="form-control" value="${esc(EDIT.notes[it.uid] || '')}" placeholder="Catatan perubahan" oninput="App.edSet('${it.uid}','note',this.value)"></td>
        <td class="text-nowrap"><button class="btn btn-sm btn-outline-secondary" title="Label otomatis" onclick="App.edAutoLabel('${it.uid}')"><i class="bi bi-magic"></i></button> <button class="btn btn-sm btn-outline-danger" title="Hapus KPI" onclick="App.edDel('${it.uid}')"><i class="bi bi-trash"></i></button></td></tr>`;
    }).join('');
    return `<div class="cat-title d-flex justify-content-between align-items-center"><span>${KATEGORI[kat]}</span><button class="btn btn-sm btn-outline-primary" onclick="App.edAdd('${kat}')"><i class="bi bi-plus-lg"></i> Tambah KPI ${kat}</button></div>
      <div class="table-responsive"><table class="table table-bordered table-sm editor-table bg-white"><thead><tr><th>No</th><th>KPI</th><th>Bobot %</th><th>Target 1</th><th>Target 2</th><th>Target 3</th><th>Target 4</th><th>Catatan</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9" class="text-center text-muted">Belum ada KPI.</td></tr>'}</tbody></table></div>`;
  }
  function edRender() { $('#edTables').innerHTML = edTableHtml('A2') + edTableHtml('A1'); edRefresh(); }
  function edRefresh() {
    const p = getPlan(EDIT.id); const j = empJenis(getEmp(p.nip));
    $('#edValid').innerHTML = validationHtml(validateItems(EDIT.items, j), j);
    const d = diffItems(EDIT.orig, EDIT.items);
    $('#edDiff').innerHTML = d.length ? `<ul class="mb-0 ps-3">${d.map(r => `<li><b>${esc(r.jenis)}</b> – ${esc(r.kpi)}<div class="text-muted">${esc(r.dari)} → ${esc(r.ke)}</div></li>`).join('')}</ul>` : '<span class="text-muted">Belum ada perubahan.</span>';
  }
  function bindHcEditor() {
    if (!EDIT || EDIT.kind !== 'hc') return;
    edRender();
    $('#edNote').addEventListener('input', e => EDIT.note = e.target.value);
  }
  function edSet(uid, field, val) {
    const it = EDIT.items.find(i => i.uid === uid);
    if (field === 'note') { EDIT.notes[uid] = val; return; }
    if (field === 'kpiId') {
      it.kpiId = val; const k = getKpi(val);
      if (k) { const n = nTarget(k.polarisasi); for (let x = n; x < 4; x++) { it.target[x] = ''; it.label[x] = ''; } it.label = it.label.map((l, x) => x < n ? autoLabel(k.polarisasi, k.uom, it.target[x]) : ''); }
      edRender(); return;
    }
    if (field === 'bobot') it.bobot = val === '' ? '' : Number(val);
    else if (field[0] === 't') it.target[Number(field[1])] = val === '' ? '' : Number(val);
    else if (field[0] === 'l') it.label[Number(field[1])] = val;
    const tr = $('#edr-' + uid); const st = edRowState(it);
    tr.className = st;
    tr.cells[0].querySelector('div').innerHTML = st === 'changed' ? '<span class="badge text-bg-warning chg-badge">Diubah</span>' : st === 'added' ? '<span class="badge text-bg-success chg-badge">Baru</span>' : '';
    const k = getKpi(it.kpiId); $('#ede-' + uid).textContent = k ? (checkTargets(k.polarisasi, it.target) || '') : 'Pilih KPI';
    edRefresh();
  }
  function edAutoLabel(uid) {
    const it = EDIT.items.find(i => i.uid === uid); const k = getKpi(it.kpiId); if (!k) return;
    for (let x = 0; x < nTarget(k.polarisasi); x++) { it.label[x] = autoLabel(k.polarisasi, k.uom, it.target[x]); const el = $(`#edl-${uid}-${x}`); if (el) el.value = it.label[x]; }
    edSet(uid, 'bobot', String(it.bobot));
  }
  function edAdd(kat) { EDIT.items.push({ uid: newUid(), kategori: kat, kpiId: '', bobot: '', target: ['', '', '', ''], label: ['', '', '', ''], locked: kat === 'A2' }); edRender(); }
  function edDel(uid) { EDIT.items = EDIT.items.filter(i => i.uid !== uid); edRender(); }
  function edReset() { EDIT.items = clone(EDIT.orig); EDIT.notes = {}; edRender(); }
  const tStr = (it, k) => it.target.slice(0, nTarget(k.polarisasi)).map(v => fmtVal(v, k.uom)).join(' / ');
  function diffItems(orig, cur) {
    const out = [];
    cur.forEach(c => {
      const k = getKpi(c.kpiId); if (!k) return;
      const o = orig.find(x => x.uid === c.uid);
      const add = (jenis, dari, ke) => out.push({ uid: c.uid, kategori: c.kategori, kpi: k.nama, jenis, dari, ke, catatan: EDIT.notes[c.uid] || '' });
      if (!o) { add('KPI Ditambahkan', '–', `${k.nama} (bobot ${fmtNum(c.bobot)}%, target ${tStr(c, k)})`); return; }
      const ok = getKpi(o.kpiId);
      if (o.kpiId !== c.kpiId) add('KPI Diganti', ok.nama, k.nama);
      if (Number(o.bobot) !== Number(c.bobot)) add('Bobot', fmtNum(o.bobot) + '%', fmtNum(c.bobot) + '%');
      if (tStr(o, ok) !== tStr(c, k)) add('Target', tStr(o, ok), tStr(c, k));
      else if (o.label.join('|') !== c.label.join('|')) add('Label Target', o.label.filter(Boolean).join(' | '), c.label.filter(Boolean).join(' | '));
    });
    orig.forEach(o => { if (!cur.find(c => c.uid === o.uid)) { const k = getKpi(o.kpiId); out.push({ uid: o.uid, kategori: o.kategori, kpi: k.nama, jenis: 'KPI Dihapus', dari: `${k.nama} (bobot ${fmtNum(o.bobot)}%)`, ke: '–', catatan: EDIT.notes[o.uid] || '' }); } });
    return out;
  }
  function edSave() {
    const p = getPlan(EDIT.id); const j = empJenis(getEmp(p.nip));
    const note = $('#edNote').value.trim(); const d = diffItems(EDIT.orig, EDIT.items); const v = validateItems(EDIT.items, j);
    const err = !d.length ? 'Belum ada perubahan. Gunakan tombol Setujui pada daftar jika tanpa perubahan.' : EDIT.items.some(i => !i.kpiId) ? 'Masih ada baris tanpa KPI.' : !v.ok ? 'Perencanaan belum valid terhadap Bobot Kategori / target.' : !note ? 'Catatan perubahan HC wajib diisi.' : '';
    if (err) { $('#edErr').textContent = err; return; }
    EDIT.items.forEach(i => { const k = getKpi(i.kpiId); i.label = i.label.map((l, x) => x < nTarget(k.polarisasi) ? (l || autoLabel(k.polarisasi, k.uom, i.target[x])) : ''); if (i.kategori === 'A2') i.locked = true; });
    const tgl = nowStr();
    p.items = EDIT.items; p.status = 'REVISI'; p.ack = false;
    p.approvals.hc = { tgl, nama: me().nama };
    p.hcChanges = { tgl, oleh: me().nama, catatan: note, rows: d.map(({ uid, ...r }) => r) };
    p.history.push({ tgl, oleh: me().nama, aksi: `Tim HC mengubah & menyetujui perencanaan (${d.length} perubahan)`, catatan: note });
    save(); EDIT = null; location.hash = '#/persetujuan'; toast('Perubahan disimpan. Pegawai akan menerima perubahan beserta catatannya.');
  }

  // ------------------------------------------------------------------
  // EXPORT PDF
  // ------------------------------------------------------------------
  function pdfHtml(p) {
    const e = getEmp(p.nip); const j = empJenis(e); const at = e.atasan ? getEmp(e.atasan) : null; const t = getTpl(p.templateId);
    const stColor = { DRAFT: '#6c757d', ATASAN: '#b58105', KEMBALI: '#343a40', HC: '#0a8aa8', TOLAK: '#dc3545', OK: '#198754', REVISI: '#0d6efd' }[p.status];
    const tbl = kat => {
      const its = p.items.filter(i => i.kategori === kat);
      const rows = its.map((it, i) => {
        const k = getKpi(it.kpiId); const s = getSS(k.sasaranId); const n = nTarget(k.polarisasi);
        return `<tr><td>${i + 1}</td><td>${esc(s.perspektif)}</td><td>${esc(s.nama)}</td><td><b>${esc(k.nama)}</b><br><span style="color:#666">${esc(k.kode)} · ${esc(k.tipe)}</span></td><td>${esc(k.uom)}</td><td>${esc(k.polarisasi)}</td><td style="text-align:right">${fmtNum(it.bobot)}%</td>${[0, 1, 2, 3].map(x => `<td>${x < n ? esc(it.label[x] || autoLabel(k.polarisasi, k.uom, it.target[x])) : '–'}</td>`).join('')}</tr>`;
      }).join('') || '<tr><td colspan="11" style="text-align:center;color:#888">Belum ada KPI</td></tr>';
      const tot = its.reduce((a, i) => a + Number(i.bobot), 0);
      return `<div class="pdf-h">${KATEGORI[kat]} (Ketentuan bobot ${j[kat.toLowerCase()].bobot}%)</div>
        <table><thead><tr><th style="width:24px">No</th><th style="width:90px">Perspektif</th><th style="width:140px">Sasaran Strategi</th><th>KPI</th><th style="width:50px">UoM</th><th style="width:80px">Polarisasi</th><th style="width:48px">Bobot</th><th>Target 1</th><th>Target 2</th><th>Target 3</th><th>Target 4</th></tr></thead>
        <tbody>${rows}<tr><td colspan="6" style="text-align:right"><b>Total Bobot ${kat}</b></td><td style="text-align:right"><b>${fmtNum(tot)}%</b></td><td colspan="4"></td></tr></tbody></table>`;
    };
    const a = p.approvals;
    const apRow = (tahap, nama, jab, tgl, fallback) => `<tr><td>${tahap}</td><td>${nama}</td><td>${jab}</td><td>${tgl ? '<b style="color:#198754">Disetujui</b>' : fallback}</td><td>${fmtDate(tgl)}</td></tr>`;
    const signs = [['Pegawai', e.nama, a.pegawai], ['Atasan Langsung', at ? at.nama : '–', a.atasan], ['Tim Human Capital', a.hc ? a.hc.nama : '', a.hc && a.hc.tgl]];
    return `<div class="pdf-doc">
      <div class="pdf-head"><div><div class="pdf-org">${esc(S.company)}</div><div class="pdf-title">LEMBAR PERENCANAAN KINERJA PEGAWAI</div><div>Periode Penilaian ${p.periode} · No. Dokumen: ${p.id}/${p.periode}</div></div>
        <div class="pdf-stamp" style="border-color:${stColor};color:${stColor}">STATUS PERSETUJUAN<b>${STATUS[p.status].label.toUpperCase()}</b>Dicetak: ${fmtDate(nowStr())}</div></div>
      <table class="noborder"><tbody>
        <tr><td style="width:130px">NIP / Nama</td><td>: <b>${e.nip} – ${esc(e.nama)}</b></td><td style="width:130px">Atasan Langsung</td><td>: ${at ? `${at.nip} – ${esc(at.nama)}` : '–'}</td></tr>
        <tr><td>Jabatan</td><td>: ${esc(e.jabatan)}</td><td>Jenis Organisasi</td><td>: ${esc(j.nama)} (A1 ${j.a1.bobot}% · A2 ${j.a2.bobot}%)</td></tr>
        <tr><td>Unit / Branch</td><td>: ${esc(getUnit(e.unit).nama)}</td><td>Template Scorecard</td><td>: ${t ? `${esc(t.kode)} – ${esc(t.nama)}` : '–'}</td></tr>
      </tbody></table>
      ${tbl('A2')}${tbl('A1')}
      <div class="pdf-h">Status Persetujuan</div>
      <table><thead><tr><th>Tahap</th><th>Nama</th><th>Jabatan</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>
        ${apRow('1. Pegawai', esc(e.nama), esc(e.jabatan), a.pegawai, p.status === 'TOLAK' || p.status === 'KEMBALI' ? 'Perlu penyesuaian' : 'Belum diajukan')}
        ${apRow('2. Atasan Langsung', at ? esc(at.nama) : '–', at ? esc(at.jabatan) : '–', a.atasan, p.status === 'KEMBALI' ? '<b style="color:#dc3545">Dikembalikan</b>' : 'Menunggu')}
        ${apRow('3. Tim Human Capital', a.hc ? esc(a.hc.nama) : '–', 'Tim HC', a.hc && a.hc.tgl, p.status === 'TOLAK' ? '<b style="color:#dc3545">Ditolak</b>' : 'Menunggu')}
      </tbody></table>
      ${p.status === 'TOLAK' ? `<div class="pdf-h">Alasan Penolakan Tim HC</div><table><tr><td>${esc(p.catatanTolak)}</td></tr></table>` : ''}
      ${p.status === 'KEMBALI' ? `<div class="pdf-h">Catatan Atasan</div><table><tr><td>${esc(p.catatanAtasan)}</td></tr></table>` : ''}
      ${p.status === 'REVISI' && p.hcChanges ? `<div class="pdf-h">Catatan Perubahan oleh Tim HC (${fmtDate(p.hcChanges.tgl)} – ${esc(p.hcChanges.oleh)})</div><table><tr><td colspan="6"><i>${esc(p.hcChanges.catatan)}</i></td></tr><tr><th>Kat.</th><th>KPI</th><th>Perubahan</th><th>Sebelum</th><th>Sesudah</th><th>Catatan</th></tr>${p.hcChanges.rows.map(r => `<tr><td>${r.kategori}</td><td>${esc(r.kpi)}</td><td>${esc(r.jenis)}</td><td>${esc(r.dari)}</td><td><b>${esc(r.ke)}</b></td><td>${esc(r.catatan || '–')}</td></tr>`).join('')}</table>` : ''}
      <div class="pdf-sign">${signs.map(s => `<div><div>${s[0]}</div><div style="color:${s[2] ? '#198754' : '#999'};font-size:10px;margin-top:8px">${s[2] ? '✔ Disetujui secara elektronik<br>' + fmtDate(s[2]) : 'Belum disetujui'}</div><div class="who">${esc(s[1] || ' ')}</div></div>`).join('')}</div>
      <div class="pdf-h">Riwayat Proses</div>
      <table><thead><tr><th style="width:120px">Tanggal</th><th style="width:150px">Oleh</th><th>Aktivitas</th><th>Catatan</th></tr></thead><tbody>${p.history.map(h => `<tr><td>${fmtDate(h.tgl)}</td><td>${esc(h.oleh)}</td><td>${esc(h.aksi)}</td><td>${esc(h.catatan || '–')}</td></tr>`).join('')}</tbody></table>
    </div>`;
  }
  function exportPdf(pid) {
    const p = getPlan(pid); const e = getEmp(p.nip);
    const html = pdfHtml(p);
    const filename = `Lembar_Perencanaan_${p.periode}_${e.nip}_${e.nama.replace(/\s+/g, '_')}.pdf`;
    if (window.html2pdf) {
      const holder = document.createElement('div');
      holder.innerHTML = html;
      toast('Menyiapkan PDF…', 'secondary');
      window.html2pdf().set({
        margin: [8, 8, 8, 8], filename, image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' }
      }).from(holder.firstElementChild).save().catch(() => printFallback(html));
    } else printFallback(html);
  }
  function printFallback(html) {
    $('#printArea').innerHTML = html;
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  }

  // ------------------------------------------------------------------
  // Aksi umum
  // ------------------------------------------------------------------
  function setF(k, v) { F[k] = v; route(); }
  function setFq(k, v) { F[k] = v; }
  function switchUser(id) {
    S.session = id; save(); EDIT = null;
    const r = S.logins.find(l => l.id === id).role;
    location.hash = r === 'hc' ? '#/persetujuan' : r === 'atasan' ? '#/tim' : '#/lembar';
    route();
    toast(`Masuk sebagai ${esc(getEmp(id).nama)}.`, 'secondary');
  }
  function resetDemo() {
    confirmBox('Reset Data Demo', 'Semua perubahan akan dihapus dan data kembali ke kondisi awal.', 'Reset', 'btn-danger', () => {
      try { localStorage.removeItem(LS_KEY); } catch (e) { /* abaikan */ }
      S = clone(window.SEED); EDIT = null; closeModal(); location.hash = '#/'; route(); toast('Data demo direset.');
    });
  }
  function discardEdit() { EDIT = null; }

  window.App = {
    switchUser, resetDemo, setF, setFq, closeModal, discardEdit,
    editBobot, editSasaran, delSasaran, editKpi, viewKpi, delKpi,
    tplAddItem, tplEditItem, tplDelItem, saveTemplate, previewTemplate, dupTemplate, delTemplate, assignTemplate,
    pgAddA1, pgEditA1, pgDelA1, submitPlan, ackChanges,
    viewPlan, atasanApprove, atasanReturn, hcApprove, hcBulkApprove, hcReject,
    edSet, edAdd, edDel, edReset, edSave, edAutoLabel,
    exportPdf
  };

  window.addEventListener('hashchange', route);
  route();
})();
