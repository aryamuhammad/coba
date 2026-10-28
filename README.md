# e-Kinerja – Mockup Modul Perencanaan Kinerja

Mockup aplikasi web (HTML + Bootstrap + JavaScript, tanpa backend) untuk modul **Perencanaan Kinerja**.
Semua data adalah data contoh dan tersimpan di `localStorage` browser.

## Cara menjalankan

Buka `index.html` langsung di browser, atau jalankan server statis:

```bash
python3 -m http.server 8000
```

lalu buka <http://localhost:8000>. Semua library (Bootstrap, Bootstrap Icons, html2pdf) sudah disertakan di `assets/vendor`, jadi bisa dipakai offline.

## Simulasi peran

Menu profil di kanan atas → **Masuk sebagai**:

| Akun | Peran | Kondisi contoh |
|---|---|---|
| Nadia Pratiwi | Admin / Tim HC | Akses menu **Master Perencanaan** |
| Budi Santoso | Pegawai (Planner) | Menunggu persetujuan HC |
| Dewi Lestari | Pegawai (Planner) | Ditolak HC → lembar aktif kembali |
| Rudi Hartono | Pegawai (Planner) | Draft, KPI A1 belum lengkap |
| Maya Putri | Pegawai (Supervisor) | Diubah oleh HC (perlu menerima perubahan) |
| Agus Salim | Atasan (Branch Manager) | Ada bawahan menunggu persetujuan |

**Reset Data Demo** (di menu profil) mengembalikan data ke kondisi awal.

## Menu

Menu ada di bagian atas (navbar).

**Master Perencanaan** (khusus Admin / Tim HC)
1. **Bobot Kategori** – total bobot dan jumlah (min–maks) KPI untuk A1 (KPI Division) dan A2 (KPI Inisiatif / Action Plan) per jenis organisasi. Total A1 + A2 wajib 100%.
2. **Kamus Sasaran Strategi** – perspektif (Financial, Customer, Internal Business Process, Learning & Growth), nama, dan deskripsi.
3. **Kamus KPI** – memilih sasaran strategi dari kamus, lalu mengisi nama, deskripsi, tipe (Exact/Proxy/Activity), kategori (A1/A2), UoM (%, IDR, USD, Rasio, unit, m², dokumen), polarisasi (Maximize/Minimize 4 atau 2 target), sumber data, formula, PIC, dan frekuensi.
4. **Template Scorecard** – menyusun KPI A2 dari kamus atau membuat KPI baru, lengkap dengan bobot, target 1–4 (angka batas terendah untuk tiap rating), dan label teks per target yang tampil di lembar perencanaan. Total bobot divalidasi terhadap Bobot Kategori. Template lalu di-**assign** per jabatan dan unit/branch, dan KPI A2 jadi terkunci bagi pegawai.
5. **Persetujuan Perencanaan** – HC bisa menyetujui (satu per satu atau sekaligus), **mengubah** lewat form editor (KPI, bobot, target, label, dengan catatan per baris dan catatan umum), atau **menolak** dengan alasan. Lembar yang ditolak aktif kembali untuk pegawai.

**Perencanaan Kinerja** (pegawai / atasan)
- **Lembar Perencanaan Saya** – pegawai mengisi KPI A1 (KPI A2 terkunci), melihat validasi bobot, lalu menyetujui dan mengajukan ke atasan. Pegawai juga menerima perubahan dari HC dan melihat alasan penolakan.
- **Persetujuan Tim** – atasan menyetujui atau mengembalikan perencanaan bawahan.

**Export PDF** tersedia di lembar pegawai, detail persetujuan, dan daftar persetujuan. PDF memuat KPI A1/A2, status persetujuan per tahap, catatan perubahan/penolakan HC, kolom pengesahan, dan riwayat proses.

## Alur status

`Draft` → `Menunggu Persetujuan Atasan` → `Menunggu Persetujuan HC` → `Disetujui HC` / `Disetujui (Diubah HC)`
- Atasan mengembalikan → `Dikembalikan Atasan` (pegawai merevisi lalu mengajukan lagi)
- HC menolak → `Ditolak HC` (pegawai menyesuaikan lalu mengajukan lagi)

## Struktur

```
index.html              # kerangka halaman + menu atas
assets/css/style.css    # gaya tampilan + layout PDF
assets/js/data.js       # data contoh
assets/js/app.js        # routing, halaman, validasi, alur persetujuan, export PDF
assets/vendor/          # Bootstrap 5.3.3, Bootstrap Icons 1.11.3, html2pdf.js 0.10.1
```
