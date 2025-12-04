const cron = require('node-cron');
const ScraperService = require('./scraper');
const { sequelize } = require('../config/database');
const { initModels } = require('../models');
const { Anime, Episode, Batch, Genre } = require('../models');
const services = require('../helper/sevice');
const baseUrl = require('../constant/url');
const cheerio = require('cheerio');

class ProgressManager {
    static jobs = new Map();
    
    static setProgress(jobId, progress) {
        this.jobs.set(jobId, progress);
    }
    
    static getProgress(jobId) {
        return this.jobs.get(jobId);
    }
    
    static clearProgress(jobId) {
        this.jobs.delete(jobId);
    }
}

class Scheduler {
    constructor() {
        this.jobs = {};
        this.initialized = false;
        this.activeJob = null;
    }

    async init() {
        if (this.initialized) return;

        try {
            await initModels();
            this.setupJobs();
            this.initialized = true;
        } catch (error) {
        }
    }

    setupJobs() {
        this.jobs.hourlyCheck = cron.schedule('0 * * * *', async () => {
            await this.runEpisodeCheck();
        });

        this.jobs.dailyOngoingUpdate = cron.schedule('0 1 * * *', async () => {
            await this.runJob('ongoing');
        });

        this.jobs.dailyCompletedUpdate = cron.schedule('0 2 * * *', async () => {
            await this.runJob('completed');
        });

        this.jobs.weeklyGenreUpdate = cron.schedule('0 3 * * 0', async () => {
            await ScraperService.scrapeGenres();
        });

        this.jobs.monthlyFullUpdate = cron.schedule('0 4 1 * *', async () => {
            await this.runJob('full');
        });
    }

    async runRemoveDuplicates(jobId) {
        try {
            ProgressManager.setProgress(jobId, { 
                status: 'starting',
                message: 'Memulai penghapusan duplikat...',
                progress: 0,
                total: 100,
                current: 0
            });
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: 'Mencari anime duplikat berdasarkan endpoint...',
                progress: 10,
                total: 100,
                current: 10
            });
            
            let totalDeleted = 0;
            let animeDeleted = 0;
            let episodesDeleted = 0;
            let batchesDeleted = 0;
            
            const allAnime = await Anime.findAll({
                order: [['createdAt', 'ASC']]
            });
            
            const animeMap = new Map();
            const duplicateAnimeIds = [];
            
            for (const anime of allAnime) {
                if (animeMap.has(anime.endpoint)) {
                    duplicateAnimeIds.push(anime.id);
                } else {
                    animeMap.set(anime.endpoint, anime.id);
                }
            }
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: `Ditemukan ${duplicateAnimeIds.length} anime duplikat. Menghapus...`,
                progress: 20,
                total: 100,
                current: 20
            });
            
            if (duplicateAnimeIds.length > 0) {
                const deletedAnimeCount = await Anime.destroy({
                    where: {
                        id: duplicateAnimeIds
                    }
                });
                animeDeleted = deletedAnimeCount;
                totalDeleted += deletedAnimeCount;
            }
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: `Menghapus episode duplikat berdasarkan episode_endpoint...`,
                progress: 40,
                total: 100,
                current: 40
            });
            
            const allEpisodes = await Episode.findAll({
                order: [['createdAt', 'ASC']]
            });
            
            const episodeMap = new Map();
            const duplicateEpisodeIds = [];
            
            for (const episode of allEpisodes) {
                if (episodeMap.has(episode.episode_endpoint)) {
                    duplicateEpisodeIds.push(episode.id);
                } else {
                    episodeMap.set(episode.episode_endpoint, episode.id);
                }
            }
            
            if (duplicateEpisodeIds.length > 0) {
                const deletedEpisodeCount = await Episode.destroy({
                    where: {
                        id: duplicateEpisodeIds
                    }
                });
                episodesDeleted = deletedEpisodeCount;
                totalDeleted += deletedEpisodeCount;
            }
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: `Menghapus batch duplikat berdasarkan batch_endpoint...`,
                progress: 60,
                total: 100,
                current: 60
            });
            
            const allBatches = await Batch.findAll({
                order: [['createdAt', 'ASC']]
            });
            
            const batchMap = new Map();
            const duplicateBatchIds = [];
            
            for (const batch of allBatches) {
                if (batchMap.has(batch.batch_endpoint)) {
                    duplicateBatchIds.push(batch.id);
                } else {
                    batchMap.set(batch.batch_endpoint, batch.id);
                }
            }
            
            if (duplicateBatchIds.length > 0) {
                const deletedBatchCount = await Batch.destroy({
                    where: {
                        id: duplicateBatchIds
                    }
                });
                batchesDeleted = deletedBatchCount;
                totalDeleted += deletedBatchCount;
            }
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: 'Membersihkan anime yang tidak memiliki episode...',
                progress: 80,
                total: 100,
                current: 80
            });
            
            const allAnimeWithEpisodes = await Anime.findAll({
                include: [{
                    model: Episode,
                    required: false
                }]
            });
            
            const animeWithoutEpisodes = [];
            for (const anime of allAnimeWithEpisodes) {
                if (!anime.Episodes || anime.Episodes.length === 0) {
                    animeWithoutEpisodes.push(anime.id);
                }
            }
            
            if (animeWithoutEpisodes.length > 0) {
                const deletedEmptyAnimeCount = await Anime.destroy({
                    where: {
                        id: animeWithoutEpisodes,
                        createdAt: {
                            [Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                });
                totalDeleted += deletedEmptyAnimeCount;
            }
            
            ProgressManager.setProgress(jobId, { 
                status: 'completed',
                message: `Penghapusan duplikat selesai! Total dihapus: ${totalDeleted} (Anime: ${animeDeleted}, Episode: ${episodesDeleted}, Batch: ${batchesDeleted})`,
                progress: 100,
                total: 100,
                current: 100
            });
            
            return { 
                success: true, 
                message: 'Duplicate removal completed',
                totalDeleted,
                animeDeleted,
                episodesDeleted,
                batchesDeleted
            };
        } catch (error) {
            ProgressManager.setProgress(jobId, { 
                status: 'error',
                message: `Error: ${error.message}`,
                progress: 0,
                total: 100,
                current: 0
            });
            return { success: false, message: error.message };
        }
    }

    async runCompleteMissing(jobId) {
        try {
            ProgressManager.setProgress(jobId, { 
                status: 'starting',
                message: 'Memulai pemeriksaan data yang hilang...',
                progress: 0,
                total: 100,
                current: 0
            });
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: 'Mengambil semua anime dari database...',
                progress: 10,
                total: 100,
                current: 10
            });
            
            const allAnime = await Anime.findAll({
                attributes: ['id', 'endpoint', 'title', 'status']
            });
            
            const totalAnime = allAnime.length;
            let missingEpisodesCount = 0;
            let missingAnimeCount = 0;
            let processed = 0;
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: `Memeriksa ${totalAnime} anime untuk episode yang hilang...`,
                progress: 20,
                total: 100,
                current: 20
            });
            
            for (let i = 0; i < totalAnime; i++) {
                const anime = allAnime[i];
                
                ProgressManager.setProgress(jobId, { 
                    status: 'running',
                    message: `Memeriksa episode untuk: ${anime.title} (${i + 1}/${totalAnime})`,
                    progress: 20 + ((i + 1) / totalAnime) * 40,
                    total: 100,
                    current: 20 + Math.floor(((i + 1) / totalAnime) * 40)
                });
                
                try {
                    const url = `${baseUrl}/anime/${anime.endpoint}`;
                    const response = await services.fetchService(url);
                    
                    if (response.status === 200) {
                        const $ = cheerio.load(response.data);
                        
                        const existingEpisodes = await Episode.findAll({
                            where: { animeId: anime.id },
                            attributes: ['episode_endpoint']
                        });
                        
                        const existingEndpoints = existingEpisodes.map(ep => ep.episode_endpoint);
                        
                        $(".episodelist li, .episode-list li, .list-episode li").each(async (index, el) => {
                            let episode_endpoint = $(el).find("span > a, a").attr("href");
                            
                            if (episode_endpoint) {
                                episode_endpoint = episode_endpoint
                                    .replace(`${baseUrl}/episode/`, "")
                                    .replace(`${baseUrl}/batch/`, "")
                                    .replace(`${baseUrl}/lengkap/`, "")
                                    .replace("/", "");
                                
                                if (episode_endpoint && !existingEndpoints.includes(episode_endpoint)) {
                                    missingEpisodesCount++;
                                    
                                    const episode_title = $(el).find("span > a, a").text().trim();
                                    const episode_date = $(el).find(".zeebr, .date").text().trim();
                                    
                                    await ScraperService.scrapeEpisode(episode_endpoint, anime.id, {
                                        episode_title,
                                        episode_date
                                    });
                                }
                            }
                        });
                    }
                } catch (error) {
                    continue;
                }
                
                processed++;
                
                if ((i + 1) % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: `Episode diperiksa. Menemukan ${missingEpisodesCount} episode yang hilang.`,
                progress: 60,
                total: 100,
                current: 60
            });
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: 'Memeriksa anime yang hilang dari daftar semua anime...',
                progress: 65,
                total: 100,
                current: 65
            });
            
            const allAnimeListResponse = await services.fetchService(`${baseUrl}/anime-list/`);
            
            if (allAnimeListResponse.status === 200) {
                const $ = cheerio.load(allAnimeListResponse.data);
                const scrapedAnimeEndpoints = [];
                
                $("#abtext, .anime-list-all, .list-anime").find(".jdlbar, .anime-item, li").each((index, el) => {
                    const link = $(el).find("a");
                    const endpoint = link.attr("href") ? link.attr("href").replace(`${baseUrl}/anime/`, "").replace("/", "") : null;
                    if (endpoint) {
                        scrapedAnimeEndpoints.push(endpoint);
                    }
                });
                
                const dbAnimeEndpoints = allAnime.map(anime => anime.endpoint);
                const missingAnimeEndpoints = scrapedAnimeEndpoints.filter(endpoint => 
                    !dbAnimeEndpoints.includes(endpoint)
                );
                
                missingAnimeCount = missingAnimeEndpoints.length;
                
                ProgressManager.setProgress(jobId, { 
                    status: 'running',
                    message: `Menemukan ${missingAnimeCount} anime yang hilang dari database. Scraping...`,
                    progress: 75,
                    total: 100,
                    current: 75
                });
                
                for (let j = 0; j < missingAnimeEndpoints.length; j++) {
                    const endpoint = missingAnimeEndpoints[j];
                    
                    ProgressManager.setProgress(jobId, { 
                        status: 'running',
                        message: `Scraping anime yang hilang: ${endpoint} (${j + 1}/${missingAnimeEndpoints.length})`,
                        progress: 75 + ((j + 1) / missingAnimeEndpoints.length) * 20,
                        total: 100,
                        current: 75 + Math.floor(((j + 1) / missingAnimeEndpoints.length) * 20)
                    });
                    
                    try {
                        await ScraperService.scrapeAnimeDetail(endpoint, true);
                    } catch (error) {
                        continue;
                    }
                    
                    if ((j + 1) % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            
            ProgressManager.setProgress(jobId, { 
                status: 'completed',
                message: `Pemeriksaan data selesai! Ditemukan ${missingEpisodesCount} episode dan ${missingAnimeCount} anime yang hilang.`,
                progress: 100,
                total: 100,
                current: 100
            });
            
            return { 
                success: true, 
                message: 'Complete missing data job completed',
                missingEpisodes: missingEpisodesCount,
                missingAnime: missingAnimeCount,
                totalProcessed: processed
            };
        } catch (error) {
            ProgressManager.setProgress(jobId, { 
                status: 'error',
                message: `Error: ${error.message}`,
                progress: 0,
                total: 100,
                current: 0
            });
            return { success: false, message: error.message };
        }
    }

    async runFullScrape(jobId) {
        try {
            ProgressManager.setProgress(jobId, { 
                status: 'starting',
                message: 'Memulai scraping lengkap...',
                progress: 0,
                total: 100,
                current: 0
            });
            
            const allAnime = await ScraperService.scrapeAllAnime((progress) => {
                ProgressManager.setProgress(jobId, { 
                    status: 'running',
                    message: progress.message,
                    progress: progress.progress * 0.3,
                    total: 100,
                    current: Math.floor(progress.progress * 0.3)
                });
            });
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: `Ditemukan ${allAnime.total} anime, mengupdate detail...`,
                progress: 30,
                total: 100,
                current: 30
            });
            
            let processed = 0;
            const totalAnime = allAnime.anime_list ? allAnime.anime_list.length : 0;
            
            for (let i = 0; i < totalAnime; i++) {
                const anime = allAnime.anime_list[i];
                
                ProgressManager.setProgress(jobId, { 
                    status: 'running',
                    message: `Memproses: ${anime.title} (${i + 1}/${totalAnime})`,
                    progress: 30 + ((i + 1) / totalAnime) * 70,
                    total: 100,
                    current: 30 + Math.floor(((i + 1) / totalAnime) * 70)
                });
                
                try {
                    await ScraperService.scrapeAnimeDetail(anime.endpoint, false);
                    processed++;
                } catch (error) {
                    continue;
                }
                
                if ((i + 1) % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            ProgressManager.setProgress(jobId, { 
                status: 'completed',
                message: `Scraping lengkap selesai! Diproses: ${processed}/${totalAnime} anime`,
                progress: 100,
                total: 100,
                current: 100
            });
            
            return { 
                success: true, 
                message: 'Scraping lengkap selesai',
                total: totalAnime,
                processed: processed
            };
        } catch (error) {
            ProgressManager.setProgress(jobId, { 
                status: 'error',
                message: `Error: ${error.message}`,
                progress: 0,
                total: 100,
                current: 0
            });
            return { success: false, message: error.message };
        }
    }

    async runUpdateDetails(jobId) {
        try {
            ProgressManager.setProgress(jobId, { 
                status: 'starting',
                message: 'Memulai update detail anime...',
                progress: 0,
                total: 100,
                current: 0
            });
            
            const allAnime = await Anime.findAll({
                attributes: ['id', 'endpoint', 'title']
            });
            
            const totalAnime = allAnime.length;
            
            for (let i = 0; i < totalAnime; i++) {
                const anime = allAnime[i];
                
                ProgressManager.setProgress(jobId, { 
                    status: 'running',
                    message: `Update detail: ${anime.title} (${i + 1}/${totalAnime})`,
                    progress: ((i + 1) / totalAnime) * 100,
                    total: 100,
                    current: Math.floor(((i + 1) / totalAnime) * 100)
                });
                
                try {
                    await ScraperService.scrapeAnimeDetail(anime.endpoint, true);
                } catch (error) {
                    continue;
                }
                
                if ((i + 1) % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            ProgressManager.setProgress(jobId, { 
                status: 'completed',
                message: `Update detail selesai! ${totalAnime} anime diperbarui`,
                progress: 100,
                total: 100,
                current: 100
            });
            
            return { 
                success: true, 
                message: 'Update detail selesai',
                count: totalAnime
            };
        } catch (error) {
            ProgressManager.setProgress(jobId, { 
                status: 'error',
                message: `Error: ${error.message}`,
                progress: 0,
                total: 100,
                current: 0
            });
            throw error;
        }
    }

    async runInitialScrape(jobId) {
        try {
            ProgressManager.setProgress(jobId, { 
                status: 'starting',
                message: 'Memulai scraping awal...',
                progress: 0,
                total: 100,
                current: 0
            });
            
            await ScraperService.scrapeGenres();
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: 'Genre berhasil diambil, scraping ongoing anime...',
                progress: 10,
                total: 100,
                current: 10
            });
            
            const ongoingResult = await ScraperService.scrapeOngoingAnime((progress) => {
                ProgressManager.setProgress(jobId, { 
                    status: 'running',
                    message: progress.message,
                    progress: 10 + (progress.progress * 0.4),
                    total: 100,
                    current: 10 + Math.floor(progress.progress * 0.4)
                });
            });
            
            ProgressManager.setProgress(jobId, { 
                status: 'running',
                message: `Ongoing selesai (${ongoingResult.length} anime), scraping completed...`,
                progress: 50,
                total: 100,
                current: 50
            });
            
            const completedResult = await ScraperService.scrapeCompletedAnime((progress) => {
                ProgressManager.setProgress(jobId, { 
                    status: 'running',
                    message: progress.message,
                    progress: 50 + (progress.progress * 0.4),
                    total: 100,
                    current: 50 + Math.floor(progress.progress * 0.4)
                });
            });
            
            ProgressManager.setProgress(jobId, { 
                status: 'completed',
                message: `Scraping awal selesai! Total: ${ongoingResult.length + completedResult.length} anime`,
                progress: 100,
                total: 100,
                current: 100
            });
            
            return { 
                success: true, 
                message: 'Scraping awal selesai',
                ongoing: ongoingResult.length,
                completed: completedResult.length
            };
        } catch (error) {
            ProgressManager.setProgress(jobId, { 
                status: 'error',
                message: `Error: ${error.message}`,
                progress: 0,
                total: 100,
                current: 0
            });
            return { success: false, message: error.message };
        }
    }

    async runEpisodeCheck(jobId) {
        try {
            ProgressManager.setProgress(jobId, { 
                status: 'starting',
                message: 'Memeriksa episode baru...',
                progress: 0,
                total: 100,
                current: 0
            });
            
            const results = await ScraperService.checkNewEpisodes((progress) => {
                ProgressManager.setProgress(jobId, { 
                    status: 'checking',
                    message: progress.message,
                    progress: progress.progress,
                    total: 100,
                    current: progress.current
                });
            });
            
            ProgressManager.setProgress(jobId, { 
                status: 'completed',
                message: `Ditemukan ${results.length} episode baru`,
                progress: 100,
                total: 100,
                current: 100
            });
            
            return results;
        } catch (error) {
            ProgressManager.setProgress(jobId, { 
                status: 'error',
                message: error.message,
                progress: 0,
                total: 100,
                current: 0
            });
            return [];
        }
    }

    async runOngoingScrape(jobId) {
        try {
            ProgressManager.setProgress(jobId, { 
                status: 'starting',
                message: 'Memulai update ongoing anime...',
                progress: 0,
                total: 100,
                current: 0
            });
            
            const result = await ScraperService.scrapeOngoingAnime((progress) => {
                ProgressManager.setProgress(jobId, { 
                    status: 'scraping',
                    message: progress.message,
                    progress: progress.progress,
                    total: 100,
                    current: progress.current
                });
            });
            
            ProgressManager.setProgress(jobId, { 
                status: 'completed',
                message: `Ongoing anime update selesai! Total: ${result.length} anime`,
                progress: 100,
                total: 100,
                current: 100
            });
            
            return { success: true, message: 'Ongoing anime updated', count: result.length };
        } catch (error) {
            ProgressManager.setProgress(jobId, { 
                status: 'error',
                message: error.message,
                progress: 0,
                total: 100,
                current: 0
            });
            throw error;
        }
    }

    async runCompletedScrape(jobId) {
        try {
            ProgressManager.setProgress(jobId, { 
                status: 'starting',
                message: 'Memulai update completed anime...',
                progress: 0,
                total: 100,
                current: 0
            });
            
            const result = await ScraperService.scrapeCompletedAnime((progress) => {
                ProgressManager.setProgress(jobId, { 
                    status: 'scraping',
                    message: progress.message,
                    progress: progress.progress,
                    total: 100,
                    current: progress.current
                });
            });
            
            ProgressManager.setProgress(jobId, { 
                status: 'completed',
                message: `Completed anime update selesai! Total: ${result.length} anime`,
                progress: 100,
                total: 100,
                current: 100
            });
            
            return { success: true, message: 'Completed anime updated', count: result.length };
        } catch (error) {
            ProgressManager.setProgress(jobId, { 
                status: 'error',
                message: error.message,
                progress: 0,
                total: 100,
                current: 0
            });
            throw error;
        }
    }

    async runJob(jobName, jobId = Date.now().toString()) {
        this.activeJob = jobId;
        
        try {
            switch(jobName) {
                case 'initial':
                    return await this.runInitialScrape(jobId);
                case 'full':
                    return await this.runFullScrape(jobId);
                case 'episodes':
                    return await this.runEpisodeCheck(jobId);
                case 'ongoing':
                    return await this.runOngoingScrape(jobId);
                case 'completed':
                    return await this.runCompletedScrape(jobId);
                case 'details':
                    return await this.runUpdateDetails(jobId);
                case 'complete_missing':
                    return await this.runCompleteMissing(jobId);
                case 'remove_duplicates':
                    return await this.runRemoveDuplicates(jobId);
                case 'genres':
                    await ScraperService.scrapeGenres();
                    ProgressManager.setProgress(jobId, { 
                        status: 'completed',
                        message: 'Genre berhasil diupdate',
                        progress: 100,
                        total: 100,
                        current: 100
                    });
                    return { success: true, message: 'Genres updated' };
                default:
                    throw new Error(`Job tidak dikenal: ${jobName}`);
            }
        } catch (error) {
            ProgressManager.setProgress(jobId, { 
                status: 'error',
                message: error.message,
                progress: 0,
                total: 100,
                current: 0
            });
            throw error;
        }
    }

    getJobProgress(jobId) {
        return ProgressManager.getProgress(jobId) || {
            status: 'not_found',
            message: 'Job tidak ditemukan',
            progress: 0,
            total: 0,
            current: 0
        };
    }

    stopAll() {
        Object.values(this.jobs).forEach(job => job.stop());
        this.activeJob = null;
    }
}

const scheduler = new Scheduler();

module.exports = scheduler;