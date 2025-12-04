const cheerio = require('cheerio');
const services = require('../helper/sevice');
const baseUrl = require('../constant/url');
const episodeHelper = require('../helper/episodeHelper');
const { Anime, Episode, Batch, Genre, AnimeGenre } = require('../models');
const { Op } = require('sequelize');

const ScraperService = {
    scrapeGenres: async () => {
        try {
            const url = `${baseUrl}/genre-list/`;
            const response = await services.fetchService(url);
            
            if (response.status === 200) {
                const $ = cheerio.load(response.data);
                const genrePromises = [];
                
                $('.genres').find("a").each((index, el) => {
                    const name = $(el).text().trim();
                    const href = $(el).attr('href');
                    let endpoint = href ? href.replace("/genres/", "").replace("/", "") : null;
                    
                    if (endpoint && name) {
                        genrePromises.push(
                            Genre.findOrCreate({
                                where: { endpoint },
                                defaults: { name, endpoint }
                            })
                        );
                    }
                });
                
                const results = await Promise.allSettled(genrePromises);
                return results.map(result => result.status === 'fulfilled' ? result.value[0] : null).filter(Boolean);
            }
        } catch (error) {
            return [];
        }
    },
    
    scrapeOngoingAnime: async (progressCallback) => {
        try {
            const animeList = [];
            let page = 1;
            let hasNextPage = true;
            let totalScraped = 0;
            
            while (hasNextPage) {
                const url = page === 1 ? `${baseUrl}/ongoing-anime/` : `${baseUrl}/ongoing-anime/page/${page}/`;
                const response = await services.fetchService(url);
                
                if (response.status !== 200) {
                    hasNextPage = false;
                    continue;
                }
                
                const $ = cheerio.load(response.data);
                const elements = $(".rapi");
                let foundAnime = false;
                
                elements.find("ul > li").each((index, el) => {
                    foundAnime = true;
                    const title = $(el).find("h2").text().trim();
                    const thumb = $(el).find("img").attr("src");
                    const total_episode = $(el).find(".epz").text();
                    const updated_on = $(el).find(".newnime").text();
                    const link = $(el).find(".thumb > a");
                    const endpoint = link.attr("href") ? link.attr("href").replace(`${baseUrl}/anime/`, "").replace("/", "") : null;
                    
                    if (endpoint && title) {
                        animeList.push({
                            title,
                            thumb,
                            total_episode,
                            updated_on,
                            endpoint,
                            status: 'Ongoing'
                        });
                    }
                });
                
                totalScraped += animeList.length;
                
                if (progressCallback) {
                    progressCallback({
                        progress: page === 1 ? 5 : Math.min((page / 50) * 100, 95),
                        total: page * 20,
                        current: animeList.length,
                        page: page,
                        message: `Scraping halaman ${page} ongoing - ${animeList.length} anime`
                    });
                }
                
                hasNextPage = foundAnime && !response.isLastPage;
                page++;
                
                if (page > 100) break;
                
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            const savedAnime = [];
            for (let i = 0; i < animeList.length; i++) {
                const anime = animeList[i];
                
                if (progressCallback) {
                    progressCallback({
                        progress: 95 + ((i + 1) / animeList.length) * 5,
                        total: animeList.length,
                        current: i + 1,
                        message: `Menyimpan ongoing anime: ${anime.title}`
                    });
                }
                
                const [animeRecord, created] = await Anime.findOrCreate({
                    where: { endpoint: anime.endpoint },
                    defaults: anime
                });
                
                if (!created) {
                    await animeRecord.update(anime);
                }
                
                try {
                    const detail = await ScraperService.scrapeAnimeDetail(anime.endpoint, false);
                    if (detail) savedAnime.push(detail);
                } catch (error) {
                    continue;
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            return savedAnime;
        } catch (error) {
            return [];
        }
    },
    
    scrapeCompletedAnime: async (progressCallback) => {
        try {
            const animeList = [];
            let page = 1;
            let hasNextPage = true;
            
            while (hasNextPage) {
                const url = page === 1 ? `${baseUrl}/complete-anime/` : `${baseUrl}/complete-anime/page/${page}/`;
                const response = await services.fetchService(url);
                
                if (response.status !== 200) {
                    hasNextPage = false;
                    continue;
                }
                
                const $ = cheerio.load(response.data);
                const elements = $(".rapi");
                let foundAnime = false;
                
                elements.find("ul > li").each((index, el) => {
                    foundAnime = true;
                    const title = $(el).find("h2").text().trim();
                    const thumb = $(el).find("img").attr("src");
                    const total_episode = $(el).find(".epz").text();
                    const updated_on = $(el).find(".newnime").text();
                    const rating = $(el).find(".epztipe").text().trim();
                    const link = $(el).find(".thumb > a");
                    const endpoint = link.attr("href") ? link.attr("href").replace(`${baseUrl}/anime/`, "").replace("/", "") : null;
                    
                    if (endpoint && title) {
                        animeList.push({
                            title,
                            thumb,
                            total_episode,
                            updated_on,
                            rating,
                            endpoint,
                            status: 'Completed'
                        });
                    }
                });
                
                if (progressCallback) {
                    progressCallback({
                        progress: page === 1 ? 5 : Math.min((page / 50) * 100, 95),
                        total: page * 20,
                        current: animeList.length,
                        page: page,
                        message: `Scraping halaman ${page} completed - ${animeList.length} anime`
                    });
                }
                
                hasNextPage = foundAnime && !response.isLastPage;
                page++;
                
                if (page > 100) break;
                
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            const savedAnime = [];
            for (let i = 0; i < animeList.length; i++) {
                const anime = animeList[i];
                
                if (progressCallback) {
                    progressCallback({
                        progress: 95 + ((i + 1) / animeList.length) * 5,
                        total: animeList.length,
                        current: i + 1,
                        message: `Menyimpan completed anime: ${anime.title}`
                    });
                }
                
                const [animeRecord, created] = await Anime.findOrCreate({
                    where: { endpoint: anime.endpoint },
                    defaults: anime
                });
                
                if (!created) {
                    await animeRecord.update(anime);
                }
                
                try {
                    const detail = await ScraperService.scrapeAnimeDetail(anime.endpoint, false);
                    if (detail) savedAnime.push(detail);
                } catch (error) {
                    continue;
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            return savedAnime;
        } catch (error) {
            return [];
        }
    },
    
    scrapeAllAnime: async (progressCallback) => {
        try {
            const animeList = [];
            let page = 1;
            let hasNextPage = true;
            let totalFound = 0;
            const maxPages = 3000;
            
            while (hasNextPage && page <= maxPages) {
                const url = page === 1 ? `${baseUrl}/anime-list/` : `${baseUrl}/anime-list/page/${page}/`;
                
                try {
                    const response = await services.fetchService(url);
                    
                    if (response.status !== 200) {
                        hasNextPage = false;
                        continue;
                    }
                    
                    const $ = cheerio.load(response.data);
                    let foundAnime = false;
                    let pageAnimeCount = 0;
                    
                    $("#abtext .jdlbar a").each((index, el) => {
                        const link = $(el);
                        const href = link.attr('href');
                        
                        if (href && href.includes('/anime/') && !href.includes('page')) {
                            const title = link.text().trim();
                            const endpoint = href.replace(`${baseUrl}/anime/`, "").replace(/\//g, "");
                            
                            if (title && endpoint && !animeList.some(a => a.endpoint === endpoint)) {
                                animeList.push({
                                    title,
                                    endpoint,
                                    status: 'Unknown',
                                    page_found: page,
                                    scraped_at: new Date().toISOString()
                                });
                                pageAnimeCount++;
                                totalFound++;
                                foundAnime = true;
                            }
                        }
                    });
                    
                    if (progressCallback) {
                        progressCallback({
                            progress: Math.min((page / maxPages) * 100, 95),
                            total: maxPages,
                            current: page,
                            total_found: totalFound,
                            page_anime: pageAnimeCount,
                            message: `Halaman ${page}: ${pageAnimeCount} anime, total: ${totalFound}`
                        });
                    }
                    
                    const nextPageLink = $('.pagination a.next');
                    hasNextPage = nextPageLink.length > 0 && response.totalPages >= page;
                    
                    if (!hasNextPage) {
                        const pageLinks = $('.page-numbers');
                        const maxPageFromLinks = [...pageLinks].reduce((max, el) => {
                            const text = $(el).text();
                            const num = parseInt(text);
                            return !isNaN(num) && num > max ? num : max;
                        }, page);
                        
                        hasNextPage = maxPageFromLinks > page;
                    }
                    
                    page++;
                    
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                } catch (error) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    page++;
                    continue;
                }
            }
            
            if (progressCallback) {
                progressCallback({
                    progress: 100,
                    total: page - 1,
                    current: page - 1,
                    total_found: totalFound,
                    message: `Scraping selesai! Total ditemukan: ${totalFound} anime dari ${page - 1} halaman`
                });
            }
            
            return {
                total: totalFound,
                pages_scraped: page - 1,
                anime_list: animeList,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                error: error.message,
                total: animeList.length,
                anime_list: animeList
            };
        }
    },
    
    scrapeAnimeDetail: async (endpoint, checkExistingEpisodes = true) => {
        try {
            const url = `${baseUrl}/anime/${endpoint}`;
            const response = await services.fetchService(url);
            
            if (response.status === 200) {
                const $ = cheerio.load(response.data);
                
                const title = $(".jdlrx > h1").text();
                const thumb = $(".fotoanime img").attr("src");
                
                let sinopsis = '';
                $(".sinopc > p").each((index, el) => {
                    sinopsis += $(el).text() + '\n';
                });
                sinopsis = sinopsis.trim();
                
                let detail = '';
                $(".infozingle > p").each((index, el) => {
                    detail += $(el).text() + '\n';
                });
                detail = detail.trim();
                
                if (!detail && sinopsis) {
                    detail = sinopsis;
                }
                
                const statusMatch = detail.match(/Status:\s*([^\n]+)/i);
                const status = statusMatch ? 
                    (statusMatch[1] || statusMatch[0]).includes('Ongoing') ? 'Ongoing' : 'Completed' : 
                    'Unknown';
                
                const ratingMatch = detail.match(/Rating:\s*([^\n]+)/i);
                const rating = ratingMatch ? (ratingMatch[1] || ratingMatch[0]).trim() : '';
                
                const totalEpisodeMatch = detail.match(/Total Episode:\s*([^\n]+)/i);
                const total_episode = totalEpisodeMatch ? (totalEpisodeMatch[1] || totalEpisodeMatch[0]).trim() : '';
                
                const [anime, created] = await Anime.findOrCreate({
                    where: { endpoint },
                    defaults: {
                        title,
                        endpoint,
                        thumb,
                        sinopsis,
                        detail,
                        status,
                        rating,
                        total_episode,
                        updated_on: new Date().toLocaleDateString('id-ID')
                    }
                });
                
                if (!created) {
                    await anime.update({
                        title,
                        thumb,
                        sinopsis,
                        detail,
                        status,
                        rating,
                        total_episode,
                        updated_on: new Date().toLocaleDateString('id-ID')
                    });
                }
                
                const genreRegex = /Genre:\s*([^\n]+)/i;
                const genreMatch = detail.match(genreRegex);
                
                if (genreMatch && genreMatch[1]) {
                    await anime.setGenres([]);
                    const genreNames = genreMatch[1].split(',').map(g => g.trim()).filter(g => g.length > 0);
                    
                    for (const genreName of genreNames) {
                        if (!genreName) continue;
                        
                        let genre = await Genre.findOne({
                            where: {
                                [Op.or]: [
                                    { name: { [Op.like]: `%${genreName}%` } },
                                    { endpoint: genreName.toLowerCase().replace(/\s+/g, '-') }
                                ]
                            }
                        });
                        
                        if (!genre) {
                            const genreEndpoint = genreName.toLowerCase().replace(/\s+/g, '-');
                            genre = await Genre.create({
                                name: genreName,
                                endpoint: genreEndpoint
                            });
                        }
                        
                        await anime.addGenre(genre);
                    }
                }
                
                if (checkExistingEpisodes) {
                    const existingEpisodes = await Episode.findAll({
                        where: { animeId: anime.id },
                        attributes: ['episode_endpoint']
                    });
                    
                    const existingEndpoints = existingEpisodes.map(ep => ep.episode_endpoint);
                    
                    const episodePromises = [];
                    
                    $(".episodelist li").each((index, el) => {
                        const episode_title = $(el).find("span > a").text();
                        let episode_endpoint = $(el).find("span > a").attr("href");
                        const episode_date = $(el).find(".zeebr").text();
                        
                        if (episode_endpoint) {
                            episode_endpoint = episode_endpoint
                                .replace(`${baseUrl}/episode/`, "")
                                .replace(`${baseUrl}/batch/`, "")
                                .replace(`${baseUrl}/lengkap/`, "")
                                .replace("/", "");
                            
                            if (episode_endpoint && !existingEndpoints.includes(episode_endpoint)) {
                                if (episode_endpoint.includes('batch')) {
                                    episodePromises.push(
                                        ScraperService.scrapeBatchEpisode(episode_endpoint, anime.id)
                                    );
                                } else {
                                    episodePromises.push(
                                        ScraperService.scrapeEpisode(episode_endpoint, anime.id, {
                                            episode_title,
                                            episode_date
                                        })
                                    );
                                }
                            }
                        }
                    });
                    
                    if (episodePromises.length > 0) {
                        await Promise.allSettled(episodePromises);
                    }
                }
                
                return anime;
            }
        } catch (error) {
            return null;
        }
    },
    
    scrapeEpisode: async (endpoint, animeId, additionalData = {}) => {
        try {
            const existingEpisode = await Episode.findOne({
                where: { episode_endpoint: endpoint }
            });
            
            if (existingEpisode) {
                return existingEpisode;
            }
            
            const url = `${baseUrl}/episode/${endpoint}`;
            const response = await services.fetchService(url);
            
            if (response.status === 200) {
                const $ = cheerio.load(response.data);
                
                const episode_title = $(".venutama > h1").text() || additionalData.episode_title || `Episode ${endpoint}`;
                const episode_date = $(".zeebr").text() || additionalData.episode_date || '';
                const streamLink = $("#lightsVideo #embed_holder .responsive-embed-stream iframe").attr("src") || '';
                
                const episodeData = {
                    animeId,
                    episode_title,
                    episode_endpoint: endpoint,
                    episode_date,
                    streamLink
                };
                
                const downloadLinks = episodeHelper.extractAllQualityLinks(response.data);
                
                episodeData.download_links = downloadLinks;
                
                const [episode, created] = await Episode.findOrCreate({
                    where: { episode_endpoint: endpoint },
                    defaults: episodeData
                });
                
                if (!created) {
                    await episode.update(episodeData);
                }
                
                return episode;
            }
        } catch (error) {
            return null;
        }
    },
    
    scrapeBatchEpisode: async (endpoint, animeId) => {
        try {
            const existingBatch = await Batch.findOne({
                where: { batch_endpoint: endpoint }
            });
            
            if (existingBatch) {
                return existingBatch;
            }
            
            const fullUrl = `${baseUrl}/batch/${endpoint}`;
            const response = await services.fetchService(fullUrl);
            
            if (response.status === 200) {
                const $ = cheerio.load(response.data);
                
                const batchData = {
                    animeId,
                    batch_title: $(".batchlink > h4").text() || `Batch ${endpoint}`,
                    batch_endpoint: endpoint
                };
                
                const downloadLinks = episodeHelper.extractAllQualityLinks(response.data);
                
                batchData.download_links = downloadLinks;
                
                const [batch, created] = await Batch.findOrCreate({
                    where: { batch_endpoint: endpoint },
                    defaults: batchData
                });
                
                if (!created) {
                    await batch.update(batchData);
                }
                
                return batch;
            }
        } catch (error) {
            return null;
        }
    },
    
    checkNewEpisodes: async (progressCallback) => {
        try {
            const ongoingAnime = await Anime.findAll({
                where: { status: 'Ongoing' }
            });
            
            const newEpisodes = [];
            
            for (let i = 0; i < ongoingAnime.length; i++) {
                const anime = ongoingAnime[i];
                
                if (progressCallback) {
                    progressCallback({
                        progress: ((i + 1) / ongoingAnime.length) * 100,
                        total: ongoingAnime.length,
                        current: i + 1,
                        message: `Memeriksa: ${anime.title}`
                    });
                }
                
                const existingEpisodes = await Episode.findAll({
                    where: { animeId: anime.id },
                    attributes: ['episode_endpoint']
                });
                
                const existingEndpoints = existingEpisodes.map(ep => ep.episode_endpoint);
                
                const url = `${baseUrl}/anime/${anime.endpoint}`;
                const response = await services.fetchService(url);
                
                if (response.status === 200) {
                    const $ = cheerio.load(response.data);
                    
                    $(".episodelist li").each((index, el) => {
                        let episode_endpoint = $(el).find("span > a").attr("href");
                        
                        if (episode_endpoint) {
                            episode_endpoint = episode_endpoint
                                .replace(`${baseUrl}/episode/`, "")
                                .replace(`${baseUrl}/batch/`, "")
                                .replace(`${baseUrl}/lengkap/`, "")
                                .replace("/", "");
                            
                            if (episode_endpoint && !existingEndpoints.includes(episode_endpoint)) {
                                newEpisodes.push({
                                    anime: anime.title,
                                    endpoint: anime.endpoint,
                                    episode_endpoint: episode_endpoint
                                });
                            }
                        }
                    });
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            for (let i = 0; i < newEpisodes.length; i++) {
                const item = newEpisodes[i];
                const anime = await Anime.findOne({ where: { endpoint: item.endpoint } });
                if (anime) {
                    await ScraperService.scrapeEpisode(item.episode_endpoint, anime.id);
                }
            }
            
            return newEpisodes;
        } catch (error) {
            return [];
        }
    },
    
    updateAllAnimeDetails: async (progressCallback) => {
        try {
            const allAnime = await Anime.findAll({
                attributes: ['id', 'endpoint', 'title']
            });
            
            for (let i = 0; i < allAnime.length; i++) {
                const anime = allAnime[i];
                
                if (progressCallback) {
                    progressCallback({
                        progress: ((i + 1) / allAnime.length) * 100,
                        total: allAnime.length,
                        current: i + 1,
                        message: `Update detail: ${anime.title}`
                    });
                }
                
                try {
                    await ScraperService.scrapeAnimeDetail(anime.endpoint, true);
                } catch (error) {
                    continue;
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            return { success: true, count: allAnime.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

module.exports = ScraperService;