/* =====================================================================
 * Data contoh (dummy) untuk mockup e-Kinerja – Perencanaan Kinerja.
 * Semua data disimpan di localStorage browser setelah ada perubahan.
 * Gunakan menu profil > "Reset Data Demo" untuk kembali ke data awal.
 * ===================================================================== */
(function () {
  'use strict';

  let uidSeq = 0;
  const uid = () => 'u' + (++uidSeq);

  // Bentuk satu baris KPI pada template / lembar perencanaan
  function it(kategori, kpiId, bobot, target, label, locked) {
    return {
      uid: uid(), kategori, kpiId, bobot,
      target: [target[0] ?? '', target[1] ?? '', target[2] ?? '', target[3] ?? ''],
      label: [label[0] ?? '', label[1] ?? '', label[2] ?? '', label[3] ?? ''],
      locked: !!locked
    };
  }

  // ---------------- Template Scorecard (KPI A2) ----------------
  const T01_ITEMS = () => [
    it('A2', 'K06', 12, [85, 90, 95, 98], ['≥ 85%', '≥ 90%', '≥ 95%', '≥ 98%'], true),
    it('A2', 'K07', 8, [48, 52], ['48–51 laporan tepat waktu', '52 laporan tepat waktu (100%)'], true),
    it('A2', 'K08', 10, [8000, 9000, 10000, 11000], ['≥ 8.000 m²', '≥ 9.000 m²', '≥ 10.000 m²', '≥ 11.000 m²'], true)
  ];
  const T02_ITEMS = () => [
    it('A2', 'K06', 10, [80, 88, 94, 97], ['≥ 80%', '≥ 88%', '≥ 94%', '≥ 97%'], true),
    it('A2', 'K09', 10, [60, 75, 90, 100], ['Desain & BRD selesai (60%)', 'UAT selesai (75%)', 'Go-live parsial (90%)', 'Go-live penuh (100%)'], true),
    it('A2', 'K10', 10, [30, 40], ['30–39 jam pelatihan', '≥ 40 jam pelatihan'], true)
  ];

  // ---------------- KPI A1 contoh untuk pegawai cabang ----------------
  const A1_FULL = () => [
    it('A1', 'K01', 25, [40e9, 45e9, 50e9, 55e9], ['≥ Rp 40 M', '≥ Rp 45 M', '≥ Rp 50 M', '≥ Rp 55 M']),
    it('A1', 'K02', 15, [85, 80, 75, 70], ['≤ 85%', '≤ 80%', '≤ 75%', '≤ 70%']),
    it('A1', 'K04', 20, [20, 24, 28, 32], ['≥ 20 box/jam', '≥ 24 box/jam', '≥ 28 box/jam', '≥ 32 box/jam']),
    it('A1', 'K05', 10, [2, 0], ['Maks. 2 kejadian', 'Zero accident'])
  ];

  const lockA2 = items => items.map(i => Object.assign(i, { locked: true }));

  const SEED = {
    version: 1,
    periode: 2027,
    session: 'HC01',
    company: 'PT Contoh Nusantara (Persero)',

    // ---------------- Bobot Kategori per Jenis Organisasi ----------------
    jenisOrg: [
      { id: 'KP', nama: 'Kantor Pusat / Divisi', ket: 'Unit kerja di level kantor pusat',
        a1: { bobot: 60, min: 3, max: 6 }, a2: { bobot: 40, min: 2, max: 5 } },
      { id: 'CB', nama: 'Cabang (Branch)', ket: 'Unit operasional di seluruh branch',
        a1: { bobot: 70, min: 3, max: 6 }, a2: { bobot: 30, min: 2, max: 4 } },
      { id: 'UP', nama: 'Unit Pendukung / Proyek', ket: 'Unit penunjang & proyek strategis',
        a1: { bobot: 50, min: 2, max: 5 }, a2: { bobot: 50, min: 2, max: 5 } }
    ],

    units: [
      { id: 'KP-HC', nama: 'Divisi Human Capital', jenisOrg: 'KP' },
      { id: 'KP-KEU', nama: 'Divisi Keuangan', jenisOrg: 'KP' },
      { id: 'KP-OPS', nama: 'Divisi Operasi', jenisOrg: 'KP' },
      { id: 'BR-JKT', nama: 'Branch Jakarta', jenisOrg: 'CB' },
      { id: 'BR-SBY', nama: 'Branch Surabaya', jenisOrg: 'CB' },
      { id: 'BR-MKS', nama: 'Branch Makassar', jenisOrg: 'CB' },
      { id: 'BR-MDN', nama: 'Branch Medan', jenisOrg: 'CB' },
      { id: 'BR-BPN', nama: 'Branch Balikpapan', jenisOrg: 'CB' },
      { id: 'UP-TI', nama: 'Unit Teknologi Informasi', jenisOrg: 'UP' }
    ],

    jabatan: ['Planner', 'Supervisor Operasi', 'Branch Manager', 'Staf Keuangan', 'Manager Keuangan', 'Staf Human Capital'],

    employees: [
      { nip: 'P001', nama: 'Budi Santoso', jabatan: 'Planner', unit: 'BR-JKT', atasan: 'P010' },
      { nip: 'P002', nama: 'Siti Rahmawati', jabatan: 'Planner', unit: 'BR-SBY', atasan: 'P011' },
      { nip: 'P003', nama: 'Andi Wijaya', jabatan: 'Planner', unit: 'BR-MKS', atasan: 'P012' },
      { nip: 'P004', nama: 'Dewi Lestari', jabatan: 'Planner', unit: 'BR-MDN', atasan: 'P013' },
      { nip: 'P005', nama: 'Rudi Hartono', jabatan: 'Planner', unit: 'BR-BPN', atasan: 'P014' },
      { nip: 'P006', nama: 'Fajar Nugroho', jabatan: 'Supervisor Operasi', unit: 'BR-JKT', atasan: 'P010' },
      { nip: 'P007', nama: 'Maya Putri', jabatan: 'Supervisor Operasi', unit: 'BR-SBY', atasan: 'P011' },
      { nip: 'P008', nama: 'Hendra Gunawan', jabatan: 'Staf Keuangan', unit: 'KP-KEU', atasan: 'P015' },
      { nip: 'P009', nama: 'Yoga Pratama', jabatan: 'Supervisor Operasi', unit: 'BR-MKS', atasan: 'P012' },
      { nip: 'P010', nama: 'Agus Salim', jabatan: 'Branch Manager', unit: 'BR-JKT', atasan: null },
      { nip: 'P011', nama: 'Rina Kusuma', jabatan: 'Branch Manager', unit: 'BR-SBY', atasan: null },
      { nip: 'P012', nama: 'Yusuf Habibi', jabatan: 'Branch Manager', unit: 'BR-MKS', atasan: null },
      { nip: 'P013', nama: 'Lina Marlina', jabatan: 'Branch Manager', unit: 'BR-MDN', atasan: null },
      { nip: 'P014', nama: 'Joko Susilo', jabatan: 'Branch Manager', unit: 'BR-BPN', atasan: null },
      { nip: 'P015', nama: 'Ratna Sari', jabatan: 'Manager Keuangan', unit: 'KP-KEU', atasan: null },
      { nip: 'HC01', nama: 'Nadia Pratiwi', jabatan: 'Staf Human Capital', unit: 'KP-HC', atasan: null }
    ],

    // Akun yang bisa dipilih pada menu "Masuk sebagai" (simulasi peran)
    logins: [
      { id: 'HC01', role: 'hc', ket: 'Admin / Tim HC' },
      { id: 'P001', role: 'pegawai', ket: 'Pegawai – status Menunggu HC' },
      { id: 'P004', role: 'pegawai', ket: 'Pegawai – status Ditolak HC' },
      { id: 'P005', role: 'pegawai', ket: 'Pegawai – status Draft' },
      { id: 'P007', role: 'pegawai', ket: 'Pegawai – diubah oleh HC' },
      { id: 'P010', role: 'atasan', ket: 'Atasan (Branch Manager Jakarta)' }
    ],

    // ---------------- Kamus Sasaran Strategi ----------------
    sasaran: [
      { id: 'SS01', kode: 'SS-F01', perspektif: 'Financial', nama: 'Meningkatkan Pendapatan Usaha', deskripsi: 'Pertumbuhan pendapatan dari layanan inti dan layanan bernilai tambah.' },
      { id: 'SS02', kode: 'SS-F02', perspektif: 'Financial', nama: 'Efisiensi Biaya Operasional', deskripsi: 'Pengendalian biaya operasi agar rasio biaya terhadap pendapatan menurun.' },
      { id: 'SS03', kode: 'SS-C01', perspektif: 'Customer', nama: 'Meningkatkan Kepuasan Pelanggan', deskripsi: 'Memberikan pengalaman layanan yang andal dan responsif bagi pelanggan.' },
      { id: 'SS04', kode: 'SS-C02', perspektif: 'Customer', nama: 'Ketepatan Waktu Layanan', deskripsi: 'Pemenuhan service level agreement (SLA) dan komitmen waktu layanan.' },
      { id: 'SS05', kode: 'SS-I01', perspektif: 'Internal Business Process', nama: 'Meningkatkan Produktivitas Operasional', deskripsi: 'Optimalisasi penggunaan alat, lapangan dan SDM operasional.' },
      { id: 'SS06', kode: 'SS-I02', perspektif: 'Internal Business Process', nama: 'Akurasi Perencanaan Operasi', deskripsi: 'Rencana operasi yang akurat dan dapat dieksekusi sesuai realisasi.' },
      { id: 'SS07', kode: 'SS-I03', perspektif: 'Internal Business Process', nama: 'Kepatuhan K3 & Tata Kelola', deskripsi: 'Pemenuhan standar keselamatan kerja, SOP, dan GCG.' },
      { id: 'SS08', kode: 'SS-L01', perspektif: 'Learning & Growth', nama: 'Peningkatan Kompetensi SDM', deskripsi: 'Pengembangan kompetensi teknis dan kepemimpinan pegawai.' },
      { id: 'SS09', kode: 'SS-L02', perspektif: 'Learning & Growth', nama: 'Digitalisasi Proses Kerja', deskripsi: 'Transformasi proses manual menjadi berbasis sistem/aplikasi.' }
    ],

    // ---------------- Kamus KPI ----------------
    kpi: [
      { id: 'K01', kode: 'KPI-001', sasaranId: 'SS01', nama: 'Pendapatan Usaha Cabang', deskripsi: 'Total pendapatan usaha yang dibukukan cabang dalam satu periode.', tipe: 'Exact', kategori: 'A1', uom: 'IDR', polarisasi: 'Maximize 4 target', sumberData: 'Laporan Keuangan (ERP)', formula: 'Σ Pendapatan usaha periode berjalan', pic: 'Branch Manager', frekuensi: 'Bulanan' },
      { id: 'K02', kode: 'KPI-002', sasaranId: 'SS02', nama: 'Rasio Biaya Operasional terhadap Pendapatan', deskripsi: 'Perbandingan biaya operasional dengan pendapatan usaha.', tipe: 'Exact', kategori: 'A1', uom: '%', polarisasi: 'Minimize 4 target', sumberData: 'Laporan Keuangan (ERP)', formula: 'Biaya Operasional ÷ Pendapatan Usaha × 100%', pic: 'Branch Manager', frekuensi: 'Bulanan' },
      { id: 'K03', kode: 'KPI-003', sasaranId: 'SS03', nama: 'Indeks Kepuasan Pelanggan', deskripsi: 'Hasil survei kepuasan pelanggan skala 1–5.', tipe: 'Proxy', kategori: 'A1', uom: 'Rasio', polarisasi: 'Maximize 4 target', sumberData: 'Survei Pihak Independen', formula: 'Rata-rata skor survei', pic: 'Divisi Komersial', frekuensi: 'Semesteran' },
      { id: 'K04', kode: 'KPI-004', sasaranId: 'SS05', nama: 'Produktivitas Bongkar Muat', deskripsi: 'Rata-rata jumlah box yang ditangani per jam kerja alat.', tipe: 'Exact', kategori: 'A1', uom: 'unit', polarisasi: 'Maximize 4 target', sumberData: 'Terminal Operating System', formula: 'Σ Box ÷ Σ Jam kerja alat', pic: 'Manager Operasi', frekuensi: 'Bulanan' },
      { id: 'K05', kode: 'KPI-005', sasaranId: 'SS07', nama: 'Jumlah Kecelakaan Kerja (Zero Accident)', deskripsi: 'Jumlah kejadian kecelakaan kerja yang menyebabkan hilangnya hari kerja.', tipe: 'Exact', kategori: 'A1', uom: 'unit', polarisasi: 'Minimize 2 target', sumberData: 'Laporan K3', formula: 'Σ Kejadian kecelakaan kerja (LTI)', pic: 'Fungsi HSSE', frekuensi: 'Bulanan' },
      { id: 'K06', kode: 'KPI-006', sasaranId: 'SS06', nama: 'Akurasi Rencana Operasi Harian', deskripsi: 'Kesesuaian rencana operasi harian dengan realisasi.', tipe: 'Exact', kategori: 'A2', uom: '%', polarisasi: 'Maximize 4 target', sumberData: 'Aplikasi Planning & TOS', formula: 'Σ Aktivitas sesuai rencana ÷ Σ Aktivitas direncanakan × 100%', pic: 'Planner', frekuensi: 'Bulanan' },
      { id: 'K07', kode: 'KPI-007', sasaranId: 'SS04', nama: 'Ketepatan Penyampaian Laporan Rencana Mingguan', deskripsi: 'Jumlah laporan rencana mingguan yang disampaikan tepat waktu.', tipe: 'Activity', kategori: 'A2', uom: 'dokumen', polarisasi: 'Maximize 2 target', sumberData: 'Arsip Laporan / e-Office', formula: 'Σ Laporan tepat waktu (maks. 52/tahun)', pic: 'Planner', frekuensi: 'Triwulanan' },
      { id: 'K08', kode: 'KPI-008', sasaranId: 'SS05', nama: 'Optimalisasi Area Penumpukan', deskripsi: 'Luas area penumpukan yang berhasil dioptimalkan melalui re-layout.', tipe: 'Proxy', kategori: 'A2', uom: 'm²', polarisasi: 'Maximize 4 target', sumberData: 'Yard Planning System', formula: 'Σ Luas area hasil re-layout', pic: 'Planner', frekuensi: 'Semesteran' },
      { id: 'K09', kode: 'KPI-009', sasaranId: 'SS09', nama: 'Progres Implementasi Digitalisasi Perencanaan', deskripsi: 'Persentase progres implementasi aplikasi perencanaan operasi.', tipe: 'Activity', kategori: 'A2', uom: '%', polarisasi: 'Maximize 4 target', sumberData: 'Laporan Proyek TI', formula: 'Bobot milestone tercapai ÷ total milestone × 100%', pic: 'Supervisor Operasi', frekuensi: 'Triwulanan' },
      { id: 'K10', kode: 'KPI-010', sasaranId: 'SS08', nama: 'Jam Pelatihan Pegawai', deskripsi: 'Jumlah jam pelatihan yang diikuti pegawai dalam satu tahun.', tipe: 'Activity', kategori: 'A2', uom: 'unit', polarisasi: 'Maximize 2 target', sumberData: 'Learning Management System', formula: 'Σ Jam pelatihan', pic: 'Pegawai ybs', frekuensi: 'Tahunan' },
      { id: 'K11', kode: 'KPI-011', sasaranId: 'SS07', nama: 'Penyusunan / Review SOP', deskripsi: 'Jumlah SOP yang disusun atau direview dan disahkan.', tipe: 'Activity', kategori: 'A2', uom: 'dokumen', polarisasi: 'Maximize 2 target', sumberData: 'e-Office (SK Direksi)', formula: 'Σ SOP disahkan', pic: 'Pegawai ybs', frekuensi: 'Tahunan' },
      { id: 'K12', kode: 'KPI-012', sasaranId: 'SS01', nama: 'Realisasi Penagihan Piutang Valas', deskripsi: 'Nilai piutang pelanggan luar negeri yang berhasil ditagih.', tipe: 'Exact', kategori: 'A2', uom: 'USD', polarisasi: 'Maximize 4 target', sumberData: 'Modul AR (ERP)', formula: 'Σ Penerimaan piutang valas', pic: 'Staf Keuangan', frekuensi: 'Bulanan' }
    ],

    // ---------------- Template Scorecard ----------------
    templates: [
      { id: 'T01', kode: 'SC-2027-001', nama: 'Scorecard Planner – Branch', periode: 2027, jenisOrg: 'CB', jabatan: 'Planner', ket: 'Berlaku untuk seluruh Planner di seluruh branch.', status: 'Aktif', items: T01_ITEMS(),
        assignments: [{ tgl: '2026-10-14 09:00', oleh: 'Nadia Pratiwi', jabatan: 'Planner', units: ['BR-JKT', 'BR-SBY', 'BR-MKS', 'BR-MDN', 'BR-BPN'], jumlah: 5 }] },
      { id: 'T02', kode: 'SC-2027-002', nama: 'Scorecard Supervisor Operasi – Branch', periode: 2027, jenisOrg: 'CB', jabatan: 'Supervisor Operasi', ket: '', status: 'Aktif', items: T02_ITEMS(),
        assignments: [{ tgl: '2026-10-14 09:30', oleh: 'Nadia Pratiwi', jabatan: 'Supervisor Operasi', units: ['BR-JKT', 'BR-SBY'], jumlah: 2 }] },
      { id: 'T03', kode: 'SC-2027-003', nama: 'Scorecard Staf Keuangan – Kantor Pusat', periode: 2027, jenisOrg: 'KP', jabatan: 'Staf Keuangan', ket: 'Masih draft – total bobot A2 belum sesuai.', status: 'Draft',
        items: [
          it('A2', 'K12', 20, [1500000, 1750000, 2000000, 2250000], ['≥ USD 1,5 jt', '≥ USD 1,75 jt', '≥ USD 2 jt', '≥ USD 2,25 jt'], true),
          it('A2', 'K11', 10, [1, 2], ['1 SOP disahkan', '≥ 2 SOP disahkan'], true)
        ],
        assignments: [] }
    ],

    // ---------------- Lembar Perencanaan Pegawai ----------------
    plans: []
  };

  const hAssign = (tplKode, tgl) => ({ tgl, oleh: 'Sistem', aksi: 'Template ' + tplKode + ' di-assign oleh Tim HC (KPI A2 terkunci)', catatan: '' });

  SEED.plans = [
    { id: 'PL001', nip: 'P001', periode: 2027, templateId: 'T01', status: 'HC',
      items: [...lockA2(T01_ITEMS()), ...A1_FULL()],
      approvals: { pegawai: '2026-10-20 10:12', atasan: '2026-10-22 08:45', hc: null },
      history: [hAssign('SC-2027-001', '2026-10-14 09:00'),
        { tgl: '2026-10-20 10:12', oleh: 'Budi Santoso', aksi: 'Pegawai menyetujui & mengajukan perencanaan', catatan: '' },
        { tgl: '2026-10-22 08:45', oleh: 'Agus Salim', aksi: 'Atasan menyetujui perencanaan', catatan: 'Sudah sesuai target cabang.' }],
      hcChanges: null, catatanTolak: null, catatanAtasan: null, ack: false },

    { id: 'PL002', nip: 'P002', periode: 2027, templateId: 'T01', status: 'HC',
      items: [...lockA2(T01_ITEMS()), ...A1_FULL().map((x, i) => (i === 0 ? Object.assign(x, { bobot: 30 }) : i === 2 ? Object.assign(x, { bobot: 15 }) : x))],
      approvals: { pegawai: '2026-10-21 14:03', atasan: '2026-10-23 16:20', hc: null },
      history: [hAssign('SC-2027-001', '2026-10-14 09:00'),
        { tgl: '2026-10-21 14:03', oleh: 'Siti Rahmawati', aksi: 'Pegawai menyetujui & mengajukan perencanaan', catatan: '' },
        { tgl: '2026-10-23 16:20', oleh: 'Rina Kusuma', aksi: 'Atasan menyetujui perencanaan', catatan: '' }],
      hcChanges: null, catatanTolak: null, catatanAtasan: null, ack: false },

    { id: 'PL003', nip: 'P003', periode: 2027, templateId: 'T01', status: 'OK',
      items: [...lockA2(T01_ITEMS()), ...A1_FULL()],
      approvals: { pegawai: '2026-10-16 09:00', atasan: '2026-10-17 11:30', hc: { tgl: '2026-10-24 13:10', nama: 'Nadia Pratiwi' } },
      history: [hAssign('SC-2027-001', '2026-10-14 09:00'),
        { tgl: '2026-10-16 09:00', oleh: 'Andi Wijaya', aksi: 'Pegawai menyetujui & mengajukan perencanaan', catatan: '' },
        { tgl: '2026-10-17 11:30', oleh: 'Yusuf Habibi', aksi: 'Atasan menyetujui perencanaan', catatan: '' },
        { tgl: '2026-10-24 13:10', oleh: 'Nadia Pratiwi', aksi: 'Tim HC menyetujui perencanaan', catatan: '' }],
      hcChanges: null, catatanTolak: null, catatanAtasan: null, ack: false },

    { id: 'PL004', nip: 'P004', periode: 2027, templateId: 'T01', status: 'TOLAK',
      items: [...lockA2(T01_ITEMS()),
        it('A1', 'K01', 30, [40e9, 45e9, 50e9, 55e9], ['≥ Rp 40 M', '≥ Rp 45 M', '≥ Rp 50 M', '≥ Rp 55 M']),
        it('A1', 'K02', 15, [85, 80, 75, 70], ['≤ 85%', '≤ 80%', '≤ 75%', '≤ 70%']),
        it('A1', 'K04', 25, [18, 22, 26, 30], ['≥ 18 box/jam', '≥ 22 box/jam', '≥ 26 box/jam', '≥ 30 box/jam'])],
      approvals: { pegawai: null, atasan: null, hc: null },
      history: [hAssign('SC-2027-001', '2026-10-14 09:00'),
        { tgl: '2026-10-18 15:40', oleh: 'Dewi Lestari', aksi: 'Pegawai menyetujui & mengajukan perencanaan', catatan: '' },
        { tgl: '2026-10-21 09:05', oleh: 'Lina Marlina', aksi: 'Atasan menyetujui perencanaan', catatan: '' },
        { tgl: '2026-10-25 10:30', oleh: 'Nadia Pratiwi', aksi: 'Tim HC menolak perencanaan', catatan: 'KPI Zero Accident (KPI-005) wajib dicantumkan pada A1 minimal bobot 10% sesuai arahan K3 korporat. Mohon sesuaikan bobot KPI lain dan ajukan kembali.' }],
      hcChanges: null, catatanTolak: 'KPI Zero Accident (KPI-005) wajib dicantumkan pada A1 minimal bobot 10% sesuai arahan K3 korporat. Mohon sesuaikan bobot KPI lain dan ajukan kembali.', catatanAtasan: null, ack: false },

    { id: 'PL005', nip: 'P005', periode: 2027, templateId: 'T01', status: 'DRAFT',
      items: [...lockA2(T01_ITEMS()),
        it('A1', 'K01', 25, [30e9, 34e9, 38e9, 42e9], ['≥ Rp 30 M', '≥ Rp 34 M', '≥ Rp 38 M', '≥ Rp 42 M']),
        it('A1', 'K04', 20, [18, 21, 24, 27], ['≥ 18 box/jam', '≥ 21 box/jam', '≥ 24 box/jam', '≥ 27 box/jam'])],
      approvals: { pegawai: null, atasan: null, hc: null },
      history: [hAssign('SC-2027-001', '2026-10-14 09:00')],
      hcChanges: null, catatanTolak: null, catatanAtasan: null, ack: false },

    { id: 'PL006', nip: 'P006', periode: 2027, templateId: 'T02', status: 'ATASAN',
      items: [...lockA2(T02_ITEMS()), ...A1_FULL()],
      approvals: { pegawai: '2026-10-26 08:20', atasan: null, hc: null },
      history: [hAssign('SC-2027-002', '2026-10-14 09:30'),
        { tgl: '2026-10-26 08:20', oleh: 'Fajar Nugroho', aksi: 'Pegawai menyetujui & mengajukan perencanaan', catatan: '' }],
      hcChanges: null, catatanTolak: null, catatanAtasan: null, ack: false }
  ];

  // PL007 – contoh perencanaan yang sudah diubah oleh Tim HC
  (function () {
    const a2 = lockA2(T02_ITEMS());
    a2[0].target = [85, 90, 95, 98];
    a2[0].label = ['≥ 85%', '≥ 90%', '≥ 95%', '≥ 98%'];
    const a1 = A1_FULL();
    a1[0].bobot = 20; a1[2].bobot = 25;
    SEED.plans.push({
      id: 'PL007', nip: 'P007', periode: 2027, templateId: 'T02', status: 'REVISI',
      items: [...a2, ...a1],
      approvals: { pegawai: '2026-10-19 13:00', atasan: '2026-10-20 09:10', hc: { tgl: '2026-10-26 15:45', nama: 'Nadia Pratiwi' } },
      history: [hAssign('SC-2027-002', '2026-10-14 09:30'),
        { tgl: '2026-10-19 13:00', oleh: 'Maya Putri', aksi: 'Pegawai menyetujui & mengajukan perencanaan', catatan: '' },
        { tgl: '2026-10-20 09:10', oleh: 'Rina Kusuma', aksi: 'Atasan menyetujui perencanaan', catatan: '' },
        { tgl: '2026-10-26 15:45', oleh: 'Nadia Pratiwi', aksi: 'Tim HC mengubah & menyetujui perencanaan (3 perubahan)', catatan: 'Penyesuaian target & bobot mengikuti RKAP 2027 Branch Surabaya.' }],
      hcChanges: {
        tgl: '2026-10-26 15:45', oleh: 'Nadia Pratiwi',
        catatan: 'Penyesuaian target & bobot mengikuti RKAP 2027 Branch Surabaya.',
        rows: [
          { kategori: 'A2', kpi: 'Akurasi Rencana Operasi Harian', jenis: 'Target', dari: '80% / 88% / 94% / 97%', ke: '85% / 90% / 95% / 98%', catatan: 'Disesuaikan dengan baseline realisasi 2026 (93%).' },
          { kategori: 'A1', kpi: 'Pendapatan Usaha Cabang', jenis: 'Bobot', dari: '25%', ke: '20%', catatan: 'Fokus Supervisor pada produktivitas.' },
          { kategori: 'A1', kpi: 'Produktivitas Bongkar Muat', jenis: 'Bobot', dari: '20%', ke: '25%', catatan: 'Fokus Supervisor pada produktivitas.' }
        ]
      },
      catatanTolak: null, catatanAtasan: null, ack: false
    });
  })();

  window.SEED = SEED;
})();
