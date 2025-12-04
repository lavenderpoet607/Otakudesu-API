OtakuDesu Anime API
Anime Database dengan Backend MySQL & Sistem Auto-Scraping

https://img.shields.io/badge/API-Online-green.svg
https://img.shields.io/badge/version-2.0-blue.svg
https://img.shields.io/badge/database-MySQL-orange.svg
https://img.shields.io/badge/backend-Node.js-brightgreen.svg
https://img.shields.io/badge/license-MIT-yellow.svg

✨ Fitur Utama
Sistem API Ganda: v2 (Database) & v1 (Direct Scraping)

Database MySQL: Penyimpanan data terstruktur

Auto-Scraping: Sistem scraping terjadwal

Antarmuka Web: Dashboard, Browser, dan Panel Admin

Statistik Real-time: Monitoring langsung

📋 Daftar Isi
Instalasi Cepat

Konfigurasi Database

Endpoint API

Antarmuka Web

Sistem Scraping

Deployment

Struktur Proyek

Kontribusi

🚀 Instalasi Cepat
Prasyarat
Node.js 14 atau lebih tinggi

MySQL 5.7 atau lebih tinggi

Git

Langkah 1: Clone Repository
bash
git clone https://github.com/lavenderpoet607/Otakudesu-API.git
cd Otakudesu-API
Langkah 2: Instal Dependencies
bash
npm install
Langkah 3: Konfigurasi Environment
bash
cp .env.example .env
Edit file .env dengan kredensial database Anda:

env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=otakudesu_db
DB_PORT=3306
PORT=3000
SCRAPING_ENABLED=true
Langkah 4: Setup Database
sql
CREATE DATABASE otakudesu_db;
Langkah 5: Jalankan Aplikasi
bash
# Mode development
npm run dev

# Mode production
npm start
Aplikasi akan berjalan di: http://localhost:3000

🗄️ Konfigurasi Database
Struktur Tabel
animes - Data anime utama

episodes - Data episode per anime

genres - Kategori genre

anime_genres - Relasi banyak-ke-banyak anime-genre

scraping_logs - Log aktivitas scraping

Inisialisasi Database
bash
# Reset database (hati-hati!)
npm run db:reset

# Sync database
npm run db:sync
🌐 Endpoint API
API v2 (Database-Powered)
text
GET    /api/v2/ongoing/:page          # Anime ongoing dengan pagination
GET    /api/v2/completed/:page        # Anime completed dengan pagination
GET    /api/v2/search/:query          # Pencarian anime
GET    /api/v2/detail/:endpoint       # Detail anime lengkap
GET    /api/v2/episode/:endpoint      # Detail episode
GET    /api/v2/genres                 # Daftar semua genre
GET    /api/v2/genre/:genre/:page     # Anime berdasarkan genre
GET    /api/v2/stats                  # Statistik sistem
GET    /api/v2/recent-episodes/:page  # Episode terbaru
API v1 (Direct Scraping)
text
GET    /api/v1/ongoing/:page
GET    /api/v1/completed/:page
GET    /api/v1/search/:query
GET    /api/v1/detail/:endpoint
Contoh Response
json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 10,
    "total_items": 100
  }
}
🖥️ Antarmuka Web
Dashboard (/)
Statistik real-time sistem

Monitoring scraping jobs

Status database

Anime Browser (/anime)
Browser anime dengan filter

Pemilih API (v1/v2)

Preview data anime

Admin Panel (/admin)
Manajemen scraping jobs

Konfigurasi sistem

Log monitoring

System Console (/console)
Terminal interface

Eksekusi command

Debugging tools

🔧 Sistem Scraping
Jenis Jobs
Job	Deskripsi	Interval
initial	Scraping data awal	Sekali
full	Scraping lengkap	Harian
episodes	Cek episode baru	30 menit
ongoing	Update anime ongoing	6 jam
completed	Update anime completed	Harian
Konfigurasi Schedule
javascript
// Konfigurasi cron job di config/schedule.js
module.exports = {
  episodes: '*/30 * * * *',    // Setiap 30 menit
  ongoing: '0 */6 * * *',      // Setiap 6 jam
  completed: '0 2 * * *',      // Setiap hari jam 02:00
  full: '0 4 * * *'            // Setiap hari jam 04:00
};
Manual Execution
bash
# Jalankan scraping manual
npm run scrape:initial
npm run scrape:episodes
npm run scrape:ongoing
📦 Deployment
Vercel
bash
# Instal Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
Docker
dockerfile
# Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
bash
# Build image
docker build -t otakudesu-api .

# Run container
docker run -p 3000:3000 --env-file .env otakudesu-api
PM2 (Production)
bash
# Instal PM2
npm install -g pm2

# Jalankan dengan PM2
pm2 start ecosystem.config.js
🗂️ Struktur Proyek
text
Otakudesu-API/
├── src/
│   ├── controllers/     # Logic controller API
│   ├── models/         # Model database
│   ├── routes/         # Routing API
│   ├── services/       # Business logic
│   ├── utils/          # Helper functions
│   └── scrapers/       # Scraping modules
├── public/
│   ├── css/           # Stylesheets
│   ├── js/            # Client-side scripts
│   └── views/         # Halaman web
├── config/
│   ├── database.js    # Konfigurasi database
│   └── schedule.js    # Konfigurasi cron jobs
├── migrations/        # Database migrations
├── logs/             # Log files
└── tests/            # Unit tests
🧪 Testing
bash
# Jalankan semua tests
npm test

# Jalankan tests dengan coverage
npm run test:coverage

# Jalankan integration tests
npm run test:integration
🤝 Kontribusi
Fork repository

Buat branch fitur (git checkout -b feature/AmazingFeature)

Commit perubahan (git commit -m 'Add AmazingFeature')

Push ke branch (git push origin feature/AmazingFeature)

Buat Pull Request

Guidelines
Ikuti standar koding yang ada

Tambahkan tests untuk fitur baru

Update dokumentasi

Gunakan commit messages yang deskriptif

📄 Lisensi
Distributed under the MIT License. See LICENSE for more information.

👤 Author
LavenderPoet607

GitHub: @lavenderpoet607

Email: lavenderpoet607@example.com

🙏 Acknowledgments
OtakuDesu sebagai sumber data

Komunitas open source

Semua kontributor

⚠️ Disclaimer
Proyek ini dibuat untuk tujuan edukasi dan pembelajaran. Gunakan dengan bijak dan bertanggung jawab. Pastikan untuk mematuhi terms of service dari sumber data.

<div align="center">
Made with ❤️ by LavenderPoet607

Jika proyek ini membantu Anda, berikan ⭐ di GitHub!

https://img.shields.io/github/stars/lavenderpoet607/Otakudesu-API?style=social
https://img.shields.io/github/forks/lavenderpoet607/Otakudesu-API?style=social

</div>
