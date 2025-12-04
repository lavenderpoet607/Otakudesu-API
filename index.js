const express = require('express');
const cors = require('cors');
const app = express();
const { inject } = require("@vercel/analytics");
const path = require('path');
require('dotenv').config();

const originalRoute = require("./src/router/route");
const dbRoute = require("./src/router/db.router");
const { testConnection } = require('./src/config/database');
const scheduler = require('./src/services/schedular');

inject();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v1', originalRoute);
app.use('/api/v2', dbRoute);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/anime', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'anime.html'));
});

app.get('/console', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'console.html'));
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'checking...'
    });
});

const port = process.env.PORT || 3000;

const server = app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    console.log(`API v1: http://localhost:${port}/api/v1`);
    console.log(`API v2: http://localhost:${port}/api/v2`);
    console.log(`Admin: http://localhost:${port}/admin`);
    
    try {
        const dbConnected = await testConnection();
        
        if (dbConnected) {
            console.log('Database connected successfully');
            if (process.env.ENABLE_AUTO_SCRAPE === 'true') {
                await scheduler.init();
                console.log('Auto-scraping scheduler initialized');
            }
        } else {
            console.log('Database connection failed, running in limited mode');
        }
    } catch (error) {
        console.log('Server initialized with database connection error:', error.message);
    }
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use. Trying ${parseInt(port) + 1}...`);
        server.listen(parseInt(port) + 1);
    } else {
        console.log('Server error:', error.message);
    }
});

process.on('SIGTERM', () => {
    scheduler.stopAll();
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    scheduler.stopAll();
    server.close(() => {
        process.exit(0);
    });
});