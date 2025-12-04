# OtakuDesu Anime API
Anime Database with MySQL Backend & Auto-Scraping System

![API Status](https://img.shields.io/badge/API-Online-green.svg)
![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![Database](https://img.shields.io/badge/database-MySQL-orange.svg)
![Backend](https://img.shields.io/badge/backend-Node.js-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

## ✨ Features
- **Dual API System**: v2 (Database) & v1 (Direct Scraping)
- **MySQL Database**: Structured data storage
- **Auto-Scraping**: Scheduled scraping system
- **Web Interface**: Dashboard, Browser, Admin Panel
- **Real-time Statistics**: Live monitoring

## 🚀 Quick Installation

### Prerequisites
- Node.js 14+
- MySQL 5.7+
- Git

### 1. Clone Repository
```bash
git clone https://github.com/lavenderpoet607/Otakudesu-API.git
cd Otakudesu-API
2. Install Dependencies
bash
npm install
3. Setup Database
sql
CREATE DATABASE otakudesu_db;
4. Configure Environment
bash
cp .env.example .env
Edit .env file with your database credentials.

5. Run Application
bash
npm start
Access at: http://localhost:3000

🌐 API Endpoints
API v2 (Database-Powered)
http
GET    /api/v2/ongoing/:page
GET    /api/v2/completed/:page
GET    /api/v2/search/:q
GET    /api/v2/detail/:endpoint
GET    /api/v2/episode/:endpoint
GET    /api/v2/genres
GET    /api/v2/stats
API v1 (Direct Scraping)
http
GET    /api/v1/ongoing/:page
GET    /api/v1/completed/:page
GET    /api/v1/search/:q
GET    /api/v1/detail/:endpoint
🛠️ Web Interface
Dashboard (/): Real-time statistics

Anime Browser (/anime): Browse with API selector

Admin Panel (/admin): Manage scraping jobs

System Console (/console): Terminal interface

🔧 Scraping Jobs
initial - Initial scraping

full - Full scraping

episodes - Check new episodes

ongoing - Update ongoing anime

completed - Update completed anime

📦 Dependencies
json
{
  "express": "^4.18.2",
  "mysql2": "^3.6.0",
  "sequelize": "^6.32.1",
  "axios": "^1.6.0",
  "cheerio": "^1.0.0-rc.12",
  "node-cron": "^3.0.3"
}
🚀 Deployment
Vercel
bash
npm i -g vercel
vercel --prod
Docker
dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first.

📄 License
MIT

👤 Author
LavenderPoet607

GitHub: @lavenderpoet607

⚠️ Disclaimer
For educational purposes only. Use responsibly.

Made with ❤️ by LavenderPoet607

If this project is helpful, give it a ⭐ on GitHub!
