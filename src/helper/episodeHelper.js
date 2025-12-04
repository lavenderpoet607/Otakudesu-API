const { default: Axios } = require("axios");
const cheerio = require("cheerio");
const baseUrl = require("../constant/url");
const qs = require("qs");

const episodeHelper = {
    getNonce: async () => {
        let payload = {
            action: "aa1208d27f29ca340c92c66d1926f13f"
        }

        try {
            let url = `${baseUrl}/wp-admin/admin-ajax.php`
            const response = await Axios.post(url, qs.stringify(payload), {
                headers: {
                    'Origin': baseUrl,
                    'Cookie':'_ga=GA1.2.826878888.1673844093; _gid=GA1.2.1599003702.1674031831; _gat=1',
                    'Referer': baseUrl,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            })
            
            return response.data.data
        } catch (error) {
            console.log("Error getting nonce:", error.message)
            return null
        }
    },
    getUrlAjax: async (content, nonce) => {
        try {
            let _e = JSON.parse(Buffer.from(content, 'base64').toString('utf-8'))
            let payload = {
                ..._e,
                nonce: nonce,
                action: "2a3505c93b0035d3f455df82bf976b84"
            }

            let url = `${baseUrl}/wp-admin/admin-ajax.php`
            const response = await Axios.post(url, qs.stringify(payload), {
                headers: {
                    'Origin': baseUrl,
                    'Cookie':'_ga=GA1.2.826878888.1673844093; _gid=GA1.2.1599003702.1674031831; _gat=1',
                    'Referer': baseUrl,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            })
            

            return Buffer.from(response.data.data, 'base64').toString('utf-8')
        } catch (error) {
            console.log("Error getting URL ajax:", error.message)
            return null;
        }
    },
    get: async (url) => {
        try {
          const response = await Axios.get(url, {
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
          });
          const $ = cheerio.load(response.data);
          let source1 = $.html().search('"file":');
          let source2 = $.html().search("'file':");
       
          if (source1 !== -1) {
            const end = $.html().indexOf('","');
            return $.html().substring(source1 + 8, end);
          } else if (source2 !== -1) {
            const end = $.html().indexOf("','");
            return $.html().substring(source2 + 8, end);
          }
          return "-";
        } catch (error) {
          return "-";
        }
    },
    extractAllQualityLinks: (res) => {
        const $ = cheerio.load(res);
        const qualities = {
            low_quality: { quality: '360p', size: '', download_links: [] },
            medium_quality: { quality: '480p', size: '', download_links: [] },
            high_quality: { quality: '720p', size: '', download_links: [] }
        };
        
        const extractFromElement = (element) => {
            $(element).find('ul').each((ulIndex, ul) => {
                $(ul).find('li').each((liIndex, li) => {
                    const text = $(li).text();
                    const qualityMatch = text.match(/(360p|480p|720p|1080p)/i);
                    const sizeMatch = text.match(/\[([^\]]+)\]/g);
                    
                    if (qualityMatch) {
                        const quality = qualityMatch[0].toLowerCase();
                        const size = sizeMatch && sizeMatch[1] ? sizeMatch[1].replace(/[\[\]]/g, '') : '';
                        
                        const links = [];
                        $(li).find('a').each((linkIndex, link) => {
                            const host = $(link).text().trim();
                            const url = $(link).attr('href');
                            if (host && url) {
                                links.push({ host, link: url });
                            }
                        });
                        
                        if (quality.includes('360')) {
                            qualities.low_quality = { quality: '360p', size, download_links: links };
                        } else if (quality.includes('480')) {
                            qualities.medium_quality = { quality: '480p', size, download_links: links };
                        } else if (quality.includes('720') || quality.includes('1080')) {
                            qualities.high_quality = { quality: '720p', size, download_links: links };
                        }
                    }
                });
            });
        };
        
        extractFromElement('.download');
        extractFromElement('.batchlink');
        extractFromElement('.mirrorstream');
        
        if (qualities.low_quality.download_links.length === 0) {
            qualities.low_quality = episodeHelper.notFoundQualityHandler(res, 0);
        }
        if (qualities.medium_quality.download_links.length === 0) {
            qualities.medium_quality = episodeHelper.notFoundQualityHandler(res, 1);
        }
        if (qualities.high_quality.download_links.length === 0) {
            qualities.high_quality = episodeHelper.notFoundQualityHandler(res, 2);
        }
        
        return qualities;
    },
    notFoundQualityHandler: (res, num) => {
        const $ = cheerio.load(res);
        const download_links = [];
        const element = $('.download')
        let response = { quality: '', size: '', download_links: [] };

        element.filter(function () {
            if ($(this).find('.anime-box > .anime-title').eq(0).text() === '') {
                $(this).find('.yondarkness-box').filter(function () {
                    const quality = $(this).find('.yondarkness-title').eq(num).text().split('[')[1].split(']')[0];
                    const size = $(this).find('.yondarkness-title').eq(num).text().split(']')[1].split('[')[1];
                    $(this).find('.yondarkness-item').eq(num).find('a').each((idx, el) => {
                        const _list = {
                            host: $(el).text(),
                            link: $(el).attr("href"),
                        };
                        download_links.push(_list);
                        response = { quality, size, download_links };
                    })
                })
            } else {
                $(this).find('.anime-box').filter(function () {
                    const quality = $(this).find('.anime-title').eq(num).text().split('[')[1].split(']')[0];
                    const size = $(this).find('.anime-title').eq(num).text().split(']')[1].split('[')[1];
                    $(this).find('.anime-item').eq(num).find('a').each((idx, el) => {
                        const _list = {
                            host: $(el).text(),
                            link: $(el).attr("href"),
                        };
                        download_links.push(_list);
                        response = { quality, size, download_links };
                    })
                })
            }
        })
        return response;
    },
    epsQualityFunction: (num, res) => {
        const $ = cheerio.load(res);
        const element = $(".download");
        const download_links = [];
        let response = { quality: '', size: '', download_links: [] };

        element.find("ul").filter(function () {
            const quality = $(this).find("li").eq(num).find("strong").text();
            const size = $(this).find("li").eq(num).find("i").text();
            $(this).find("li").eq(num).find("a").each(function () {
                const _list = {
                    host: $(this).text(),
                    link: $(this).attr("href"),
                };
                download_links.push(_list);
                response = { quality, size, download_links };
            });
        });
        return response;
    },
    batchQualityFunction: (num, res) => {
        const $ = cheerio.load(res);
        const element = $(".batchlink");
        const download_links = [];
        let response = { quality: '', size: '', download_links: [] };
        
        element.find("ul").filter(function () {
            const quality = $(this).find("li").eq(num).find("strong").text();
            const size = $(this).find("li").eq(num).find("i").text();
            $(this).find("li").eq(num).find("a").each(function () {
                const _list = {
                    host: $(this).text(),
                    link: $(this).attr("href"),
                };
                download_links.push(_list);
                response = { quality, size, download_links };
            });
        });
        return response;
    }
}

module.exports = episodeHelper