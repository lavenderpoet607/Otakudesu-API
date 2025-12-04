const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

const Service = {
    fetchService: async (url, maxRetries = 3) => {
        let retries = 0;
        while (retries < maxRetries) {
            try {
                const httpsAgent = new https.Agent({ 
                    rejectUnauthorized: false,
                    keepAlive: true 
                });
                
                const response = await axios({
                    url,
                    method: 'get',
                    timeout: 30000,
                    httpsAgent,
                    headers: {
                        'User-Agent': getRandomUserAgent(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    validateStatus: (status) => status >= 200 && status < 500
                });
                
                if (response.status === 200) {
                    const $ = cheerio.load(response.data);
                    let hasNextPage = false;
                    let totalPages = 1;
                    
                    const pagination = $('.pagination, .pagenavix, .pagenavi');
                    if (pagination.length > 0) {
                        const nextButton = pagination.find('a:contains("Next"), a:contains("»"), .nextpostslink');
                        hasNextPage = nextButton.length > 0;
                        
                        const pageLinks = pagination.find('a.page-numbers, a.page, a[href*="page"]');
                        if (pageLinks.length > 0) {
                            const pageNumbers = [];
                            pageLinks.each((i, el) => {
                                const href = $(el).attr('href');
                                if (href && href.match(/page\/(\d+)/)) {
                                    const match = href.match(/page\/(\d+)/);
                                    if (match) {
                                        pageNumbers.push(parseInt(match[1]));
                                    }
                                }
                            });
                            if (pageNumbers.length > 0) {
                                totalPages = Math.max(...pageNumbers);
                            }
                        }
                    }
                    
                    return { 
                        ...response, 
                        isLastPage: !hasNextPage,
                        totalPages: totalPages
                    };
                } else if (response.status === 404) {
                    return {
                        status: false,
                        code: 404,
                        message: "Halaman tidak ditemukan",
                        isLastPage: true
                    };
                }
                
                retries++;
                if (retries < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000 * retries));
                }
            } catch (error) {
                retries++;
                if (retries >= maxRetries) {
                    return {
                        status: false,
                        code: error.code || 500,
                        message: error.message || "Gagal mengambil data",
                        isLastPage: true
                    };
                }
                await new Promise(resolve => setTimeout(resolve, 2000 * retries));
            }
        }
    }
};

module.exports = Service;