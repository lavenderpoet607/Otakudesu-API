const { Anime, Episode, Batch, Genre, AnimeGenre } = require('../models');
const { Op, Sequelize } = require('sequelize');
const ScraperService = require('../services/scraper');
const scheduler = require('../services/schedular');
const { sequelize } = require('../config/database'); // TAMBAHKAN INI

const DatabaseController = {
    getOngoing: async (req, res) => {
        try {
            const page = parseInt(req.params.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            const { count, rows: ongoing } = await Anime.findAndCountAll({
                where: { status: 'Ongoing' },
                limit,
                offset,
                order: [['updatedAt', 'DESC']]
            });
            return res.status(200).json({
                status: true,
                message: 'success',
                ongoing,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message,
                ongoing: []
            });
        }
    },

    getCompleted: async (req, res) => {
        try {
            const page = parseInt(req.params.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            const { count, rows: completed } = await Anime.findAndCountAll({
                where: { status: 'Completed' },
                limit,
                offset,
                order: [['updatedAt', 'DESC']]
            });
            return res.status(200).json({
                status: true,
                message: 'success',
                completed,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message,
                completed: []
            });
        }
    },

    getSearch: async (req, res) => {
        try {
            const query = req.params.q;
            const search = await Anime.findAll({
                where: {
                    title: {
                        [Op.like]: `%${query}%`
                    }
                },
                include: [{
                    model: Genre,
                    through: { attributes: [] },
                }],
                limit: 30,
                order: [['title', 'ASC']]
            });
            return res.status(200).json({
                status: true,
                message: 'success',
                search,
                query
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message,
                search: []
            });
        }
    },

    getAnimeList: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;
            
            const { count, rows: anime_list } = await Anime.findAndCountAll({
                attributes: ['id', 'title', 'endpoint', 'status'],
                limit,
                offset,
                order: [['title', 'ASC']]
            });
            
            return res.status(200).json({
                status: true,
                message: 'success',
                anime_list,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message,
                anime_list: []
            });
        }
    },

    getAnimeDetail: async (req, res) => {
        try {
            const endpoint = req.params.endpoint;
            let anime = await Anime.findOne({
                where: { endpoint },
                include: [{
                    model: Genre,
                    through: { attributes: [] },
                }]
            });
            
            if (!anime) {
                await ScraperService.scrapeAnimeDetail(endpoint);
                anime = await Anime.findOne({
                    where: { endpoint },
                    include: [{
                        model: Genre,
                        through: { attributes: [] },
                    }]
                });
                
                if (!anime) {
                    return res.status(404).json({
                        status: false,
                        message: 'Anime tidak ditemukan',
                        anime_detail: null,
                        episode_list: []
                    });
                }
            }
            
            const episode_list = await Episode.findAll({
                where: { animeId: anime.id },
                order: [['episode_title', 'DESC']]
            });
            
            const anime_detail = {
                title: anime.title,
                thumb: anime.thumb,
                sinopsis: anime.sinopsis ? anime.sinopsis.split('\n') : [],
                detail: anime.detail ? anime.detail.split('\n') : [],
                genres: anime.Genres ? anime.Genres.map(g => g.name) : [],
                status: anime.status,
                total_episode: anime.total_episode,
                updated_on: anime.updated_on
            };
            
            return res.status(200).json({
                status: true,
                message: 'success',
                anime_detail,
                episode_list,
                endpoint
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message,
                anime_detail: null,
                episode_list: []
            });
        }
    },

    getAnimeEpisode: async (req, res) => {
        try {
            const endpoint = req.params.endpoint;
            let episode = await Episode.findOne({
                where: { episode_endpoint: endpoint },
                include: [{
                    model: Anime,
                    attributes: ['title', 'endpoint']
                }]
            });
            
            if (!episode) {
                const animeEndpointMatch = endpoint.match(/^(.*?)(?:-episode-\d+.*$|$)/);
                let animeEndpoint = animeEndpointMatch ? animeEndpointMatch[1] : null;
                
                if (animeEndpoint) {
                    const anime = await Anime.findOne({ where: { endpoint: animeEndpoint } });
                    if (anime) {
                        await ScraperService.scrapeEpisode(endpoint, anime.id);
                        episode = await Episode.findOne({
                            where: { episode_endpoint: endpoint },
                            include: [{
                                model: Anime,
                                attributes: ['title', 'endpoint']
                            }]
                        });
                    }
                }
                
                if (!episode) {
                    return res.status(404).json({
                        status: false,
                        message: 'Episode tidak ditemukan',
                    });
                }
            }
            
            const relatedEpisodes = await Episode.findAll({
                where: { 
                    animeId: episode.animeId,
                    id: { [Op.ne]: episode.id }
                },
                limit: 5,
                order: [['createdAt', 'DESC']]
            });
            
            const allEpisodes = await Episode.findAll({
                where: { animeId: episode.animeId },
                order: [['episode_title', 'DESC']]
            });
            
            const response = {
                title: episode.episode_title,
                baseUrl: `${req.protocol}://${req.get('host')}/api/v2/episode/${endpoint}`,
                id: episode.id,
                streamLink: episode.streamLink,
                relative: relatedEpisodes.map(ep => ({
                    title_ref: ep.episode_title,
                    link_ref: ep.episode_endpoint
                })),
                list_episode: allEpisodes.map(ep => ({
                    list_episode_title: ep.episode_title,
                    list_episode_endpoint: ep.episode_endpoint
                }))
            };
            
            if (episode.download_links) {
                const downloadLinks = typeof episode.download_links === 'string' 
                    ? JSON.parse(episode.download_links) 
                    : episode.download_links;
                response.quality = downloadLinks;
            }
            
            return res.status(200).json(response);
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    getBatchLink: async (req, res) => {
        try {
            const endpoint = req.params.endpoint;
            let batch = await Batch.findOne({
                where: { batch_endpoint: endpoint },
                include: [{
                    model: Anime,
                    attributes: ['title', 'endpoint']
                }]
            });
            
            if (!batch) {
                const animeEndpointMatch = endpoint.match(/^(.*?)(?:-batch.*$|$)/);
                let animeEndpoint = animeEndpointMatch ? animeEndpointMatch[1] : null;
                
                if (animeEndpoint) {
                    const anime = await Anime.findOne({ where: { endpoint: animeEndpoint } });
                    if (anime) {
                        await ScraperService.scrapeBatchEpisode(endpoint, anime.id);
                        batch = await Batch.findOne({
                            where: { batch_endpoint: endpoint },
                            include: [{
                                model: Anime,
                                attributes: ['title', 'endpoint']
                            }]
                        });
                    }
                }
                
                if (!batch) {
                    return res.status(404).json({
                        status: false,
                        message: 'Batch tidak ditemukan',
                        batch: null
                    });
                }
            }
            
            const response = {
                status: true,
                message: 'success',
                batch: {
                    title: batch.batch_title,
                    status: 'success',
                    baseUrl: `${req.protocol}://${req.get('host')}/api/v2/batch/${endpoint}`
                }
            };
            
            if (batch.download_links) {
                const downloadLinks = typeof batch.download_links === 'string' 
                    ? JSON.parse(batch.download_links) 
                    : batch.download_links;
                response.batch.download_list = downloadLinks;
            }
            
            return res.status(200).json(response);
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message,
                batch: null
            });
        }
    },

    getGenreList: async (req, res) => {
        try {
            const genres = await Genre.findAll({
                order: [['name', 'ASC']]
            });
            
            const formattedGenres = genres.map(genre => ({
                genre: genre.name,
                endpoint: genre.endpoint,
                count: genre.count ? genre.count : 0
            }));
            
            return res.status(200).json({
                status: true,
                message: 'success',
                genres: formattedGenres
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message,
                genres: []
            });
        }
    },

    getGenrePage: async (req, res) => {
        try {
            const genreEndpoint = req.params.genre;
            const page = parseInt(req.params.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            
            const genre = await Genre.findOne({
                where: { endpoint: genreEndpoint }
            });
            
            if (!genre) {
                return res.status(404).json({
                    status: false,
                    message: 'Genre tidak ditemukan',
                    genreAnime: []
                });
            }
            
            const anime = await genre.getAnimes({
                limit,
                offset,
                order: [['title', 'ASC']],
                include: [{
                    model: Genre,
                    through: { attributes: [] }
                }]
            });
            
            const count = await genre.countAnimes();
            
            const genreAnime = anime.map(a => ({
                title: a.title,
                link: a.endpoint,
                studio: '',
                episode: a.total_episode,
                rating: a.rating,
                thumb: a.thumb,
                genre: a.Genres.map(g => g.name),
                sinopsis: a.sinopsis,
                status: a.status
            }));
            
            return res.status(200).json({
                status: true,
                message: 'success',
                genreAnime,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message,
                genreAnime: []
            });
        }
    },

    deleteAllDatabase: async (req, res) => {
        try {
            const { confirmation } = req.body;
            
            if (confirmation !== 'DELETE_ALL') {
                return res.status(400).json({
                    status: false,
                    message: 'Confirmation required'
                });
            }
            
            const transaction = await sequelize.transaction();
            
            try {
                await AnimeGenre.destroy({ where: {}, transaction, force: true });
                await Episode.destroy({ where: {}, transaction, force: true });
                await Batch.destroy({ where: {}, transaction, force: true });
                await Anime.destroy({ where: {}, transaction, force: true });
                await Genre.destroy({ where: {}, transaction, force: true });
                
                await transaction.commit();
                
                return res.status(200).json({
                    status: true,
                    message: 'All database records deleted successfully',
                    deleted: {
                        anime: await Anime.count(),
                        episodes: await Episode.count(),
                        batches: await Batch.count(),
                        genres: await Genre.count()
                    }
                });
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    runScraperJob: async (req, res) => {
        try {
            const { job } = req.params;
            const jobId = Date.now().toString();
            
            if (!job) {
                return res.status(400).json({
                    status: false,
                    message: 'Parameter job diperlukan'
                });
            }
            
            const validJobs = ['initial', 'episodes', 'ongoing', 'completed', 'genres', 'full', 'details', 'complete_missing', 'remove_duplicates'];
            
            if (!validJobs.includes(job)) {
                return res.status(400).json({
                    status: false,
                    message: `Job tidak valid. Pilihan: ${validJobs.join(', ')}`
                });
            }
            
            setTimeout(async () => {
                await scheduler.runJob(job, jobId);
            }, 100);
            
            return res.status(200).json({
                status: true,
                message: `Job ${job} started`,
                jobId,
                monitor: `${req.protocol}://${req.get('host')}/api/v2/progress/${jobId}`
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    runFullScrape: async (req, res) => {
        try {
            const jobId = Date.now().toString();
            
            setTimeout(async () => {
                await scheduler.runJob('full', jobId);
            }, 100);
            
            return res.status(200).json({
                status: true,
                message: 'Full scraping job started',
                jobId,
                monitor: `${req.protocol}://${req.get('host')}/api/v2/progress/${jobId}`
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    updateAllDetails: async (req, res) => {
        try {
            const jobId = Date.now().toString();
            
            setTimeout(async () => {
                await scheduler.runJob('details', jobId);
            }, 100);
            
            return res.status(200).json({
                status: true,
                message: 'Update all details job started',
                jobId,
                monitor: `${req.protocol}://${req.get('host')}/api/v2/progress/${jobId}`
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    runCompleteMissing: async (req, res) => {
        try {
            const jobId = Date.now().toString();
            
            setTimeout(async () => {
                await scheduler.runJob('complete_missing', jobId);
            }, 100);
            
            return res.status(200).json({
                status: true,
                message: 'Complete missing data job started',
                jobId,
                monitor: `${req.protocol}://${req.get('host')}/api/v2/progress/${jobId}`
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    runRemoveDuplicates: async (req, res) => {
        try {
            const jobId = Date.now().toString();
            
            setTimeout(async () => {
                await scheduler.runJob('remove_duplicates', jobId);
            }, 100);
            
            return res.status(200).json({
                status: true,
                message: 'Remove duplicates job started',
                jobId,
                monitor: `${req.protocol}://${req.get('host')}/api/v2/progress/${jobId}`
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    getJobProgress: async (req, res) => {
        try {
            const { jobId } = req.params;
            const progress = scheduler.getJobProgress(jobId);
            
            return res.status(200).json({
                status: true,
                message: 'Job progress retrieved',
                jobId,
                progress
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message
            });
        }
    },

    getStats: async (req, res) => {
        try {
            const totalAnime = await Anime.count();
            const totalEpisodes = await Episode.count();
            const totalBatches = await Batch.count();
            const totalGenres = await Genre.count();
            
            const ongoingAnime = await Anime.count({ where: { status: 'Ongoing' } });
            const completedAnime = await Anime.count({ where: { status: 'Completed' } });
            
            const recentlyAdded = await Anime.findAll({
                limit: 5,
                order: [['createdAt', 'DESC']]
            });
            
            const recentEpisodes = await Episode.findAll({
                limit: 10,
                order: [['createdAt', 'DESC']],
                include: [{
                    model: Anime,
                    attributes: ['title']
                }]
            });
            
            const animePerGenre = await Anime.findAll({
                include: [{
                    model: Genre,
                    through: { attributes: [] },
                    attributes: ['id', 'name']
                }]
            });
            
            const genreStats = {};
            animePerGenre.forEach(anime => {
                if (anime.Genres && anime.Genres.length > 0) {
                    anime.Genres.forEach(genre => {
                        if (!genreStats[genre.name]) {
                            genreStats[genre.name] = 0;
                        }
                        genreStats[genre.name]++;
                    });
                }
            });
            
            const topGenres = Object.entries(genreStats)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name, count]) => ({ name, count }));
            
            const lastScrapeDate = await Anime.max('updatedAt');
            const firstAnimeDate = await Anime.min('createdAt');
            
            const animeGrowthData = await Anime.findAll({
                attributes: [
                    [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
                order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
                limit: 30
            });
            
            const memoryUsage = process.memoryUsage();
            const dbSizeEstimate = (totalAnime * 5 + totalEpisodes * 3 + totalBatches * 4) / 1024;
            
            const stats = {
                totals: {
                    anime: totalAnime,
                    episodes: totalEpisodes,
                    batches: totalBatches,
                    genres: totalGenres,
                    total_records: totalAnime + totalEpisodes + totalBatches + totalGenres
                },
                status_distribution: {
                    ongoing: ongoingAnime,
                    completed: completedAnime,
                    unknown: totalAnime - ongoingAnime - completedAnime
                },
                anime_growth: animeGrowthData.map(item => ({
                    date: item.get('date'),
                    count: parseInt(item.get('count'))
                })),
                top_genres: topGenres,
                recent_activity: {
                    recently_added_anime: recentlyAdded.map(a => ({
                        title: a.title,
                        endpoint: a.endpoint,
                        status: a.status,
                        added_at: a.createdAt
                    })),
                    recent_episodes: recentEpisodes.map(ep => ({
                        title: ep.episode_title,
                        anime: ep.Anime ? ep.Anime.title : 'Unknown',
                        date: ep.createdAt
                    }))
                },
                database: {
                    estimated_size_mb: dbSizeEstimate.toFixed(2),
                    anime_with_episodes: await Anime.count({
                        include: [{
                            model: Episode,
                            required: true
                        }]
                    }),
                    anime_without_episodes: await Anime.count({
                        include: [{
                            model: Episode,
                            required: false
                        }],
                        where: {
                            '$Episodes.id$': null
                        }
                    })
                },
                scraping: {
                    last_scrape_date: lastScrapeDate,
                    first_scrape_date: firstAnimeDate,
                    total_scrape_days: firstAnimeDate ? 
                        Math.ceil((new Date() - new Date(firstAnimeDate)) / (1000 * 60 * 60 * 24)) : 0,
                    estimated_pages_scraped: Math.ceil(totalAnime / 20)
                },
                server: {
                    uptime: process.uptime(),
                    memory: {
                        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                        rss: Math.round(memoryUsage.rss / 1024 / 1024)
                    },
                    version: process.version,
                    platform: process.platform,
                    node_env: process.env.NODE_ENV || 'development'
                },
                system: {
                    api_versions: ['v1', 'v2'],
                    auto_scraping_enabled: process.env.ENABLE_AUTO_SCRAPE === 'true',
                    concurrent_jobs_limit: 1,
                    last_updated: new Date().toISOString()
                }
            };
            
            return res.status(200).json({
                status: true,
                message: 'success',
                stats
            });
        } catch (error) {
            console.error('Error getting stats:', error);
            return res.status(500).json({
                status: false,
                message: error.message,
                stats: null
            });
        }
    },

    getAllAnime: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;
            
            const { count, rows: anime } = await Anime.findAndCountAll({
                limit,
                offset,
                order: [['title', 'ASC']],
                include: [{
                    model: Genre,
                    through: { attributes: [] },
                }]
            });
            
            return res.status(200).json({
                status: true,
                message: 'success',
                anime,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message,
                anime: []
            });
        }
    },

    getScrapingStats: async (req, res) => {
        try {
            const totalAnime = await Anime.count();
            const totalEpisodes = await Episode.count();
            const totalBatches = await Batch.count();
            
            const latestAnime = await Anime.findOne({
                order: [['updatedAt', 'DESC']]
            });
            
            const oldestAnime = await Anime.findOne({
                order: [['createdAt', 'ASC']]
            });
            
            const animeByDate = await Anime.findAll({
                attributes: [
                    [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                ],
                group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
                order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'DESC']],
                limit: 7
            });
            
            const stats = {
                total_scraped: {
                    anime: totalAnime,
                    episodes: totalEpisodes,
                    batches: totalBatches
                },
                time_range: {
                    first_scrape: oldestAnime ? oldestAnime.createdAt : null,
                    last_scrape: latestAnime ? latestAnime.updatedAt : null,
                    days_active: oldestAnime ? 
                        Math.ceil((new Date() - new Date(oldestAnime.createdAt)) / (1000 * 60 * 60 * 24)) : 0
                },
                recent_activity: animeByDate.map(item => ({
                    date: item.get('date'),
                    count: parseInt(item.get('count'))
                })),
                estimated_pages: Math.ceil(totalAnime / 20),
                estimated_data_size: (totalAnime * 5 + totalEpisodes * 3 + totalBatches * 4) / 1024
            };
            
            return res.status(200).json({
                status: true,
                message: 'Scraping statistics retrieved',
                stats
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message,
                stats: null
            });
        }
    }
};

module.exports = DatabaseController;