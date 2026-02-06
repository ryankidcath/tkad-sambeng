# Tanah Kas Aset Desa Sambeng (PWA)

Aplikasi mobile GIS berbasis Progressive Web App (PWA) untuk menampilkan peta poligon Tanah Kas Aset Desa Sambeng, Kec. Gunung Jati, Kab. Cirebon. Dibangun dengan Leaflet, OpenStreetMap, dan stack gratis lainnya.

## Fitur

- Peta interaktif (Leaflet + OpenStreetMap)
- Tampilan poligon dari data GeoJSON (konversi dari Shapefile)
- Popup dan panel atribut saat poligon diklik
- PWA: bisa di-install di Android, dukungan offline setelah sekali dibuka

## Menambahkan Data Anda (Konversi SHP ke GeoJSON)

Data saat ini menggunakan file `data/tanah_kas_aset_sambeng.geojson`. Untuk memakai hasil pengukuran Anda:

1. **Dengan Mapshaper (tanpa instalasi)**
   - Buka [mapshaper.org](https://mapshaper.org)
   - Drag & drop file `.shp` (plus `.dbf` dan `.shx` akan terbaca otomatis jika satu folder)
   - Export → Format: **GeoJSON** → Export
   - Simpan hasil sebagai `data/tanah_kas_aset_sambeng.geojson` (ganti file yang ada)

2. **Dengan QGIS**
   - Buka layer Shapefile di QGIS
   - Klik kanan layer → Export → Save Features As…
   - Format: **GeoJSON** → pilih lokasi `data/tanah_kas_aset_sambeng.geojson`

3. **Dengan GDAL (command line)**
   ```bash
   ogr2ogr -f GeoJSON data/tanah_kas_aset_sambeng.geojson namafile.shp
   ```

Pastikan koordinat dalam WGS84 (EPSG:4326). Jika data Anda proyeksi lain (mis. DGN95), lakukan reproject ke WGS84 saat konversi (QGIS/ogr2ogr mendukung ini).

## Menjalankan di Komputer (Pengembangan)

PWA membutuhkan **HTTPS** atau **localhost** agar service worker dan instalasi berfungsi.

- **Opsi 1:** Jalankan server lokal, misalnya:
  ```bash
  npx serve .
  ```
  Lalu buka `http://localhost:3000` (atau port yang ditampilkan).

- **Opsi 2:** Gunakan ekstensi "Live Server" di VS Code dan buka folder proyek.

Jangan buka `index.html` langsung dari `file://` — service worker tidak akan terdaftar.

## Deploy (Hosting Gratis)

Deploy ke hosting HTTPS agar PWA bisa di-install di Android:

- **GitHub Pages:** Push repo ke GitHub → Settings → Pages → Source: branch `main` / folder `root` atau `docs`
- **Netlify:** Drag & drop folder proyek ke [app.netlify.com](https://app.netlify.com) atau hubungkan repo Git
- **Vercel:** Import proyek dari Git atau deploy dengan CLI

Setelah deploy, akses aplikasi lewat URL HTTPS (mis. `https://username.github.io/Mobile-GIS-Sambeng-v2/`). Jika pakai subpath, sesuaikan `start_url` dan scope di `manifest.json` bila perlu.

## Install di Android

1. Buka **URL aplikasi** di Chrome Android (harus HTTPS).
2. Menu Chrome (⋮) → **"Install app"** atau **"Add to Home screen"**.
3. Konfirmasi. Ikon "GIS Sambeng" akan muncul di launcher; aplikasi bisa dipakai seperti aplikasi native dan mendukung penggunaan offline setelah data pernah dimuat.

## Struktur Proyek

```
├── index.html
├── manifest.json
├── sw.js
├── css/style.css
├── js/app.js
├── data/tanah_kas_aset_sambeng.geojson
├── icons/icon-192.png, icon-512.png
└── README.md
```

## Mengganti Icon PWA

Icon saat ini berupa placeholder (warna solid). Untuk icon kustom:

- Gunakan [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) atau generator favicon/PWA lain.
- Ganti file `icons/icon-192.png` dan `icons/icon-512.png` dengan ukuran yang sama.

## Lisensi

Gratis untuk penggunaan pribadi dan desa. Leaflet dan OpenStreetMap mengikuti lisensi masing-masing.
