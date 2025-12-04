const router = require("express").Router();
const DatabaseController = require("../controller/databaseController");

router.get("/", (req, res) => {
    res.json({
        name: "OtakuDesu Anime API v2.0",
        version: "v2.0",
        status: "active",
        database: "MySQL",
        base_url: `${req.protocol}://${req.get('host')}/api/v2`,
        endpoints: {
            ongoing: "/ongoing/:page",
            completed: "/completed/:page",
            search: "/search/:q",
            anime_list: "/anime-list",
            detail: "/detail/:endpoint",
            episode: "/episode/:endpoint",
            batch: "/batch/:endpoint",
            genres: "/genres",
            genre_page: "/genres/:genre/:page",
            stats: "/stats",
            scraping_stats: "/scraping-stats",
            admin_trigger: "/admin/trigger/:job",
            admin_full: "/admin/full",
            admin_details: "/admin/details",
            admin_complete_missing: "/admin/complete_missing",
            admin_remove_duplicates: "/admin/remove_duplicates",
            admin_delete_all: "/admin/delete_all",
            progress: "/progress/:jobId",
            all_anime: "/all"
        }
    });
});

router.get("/ongoing/:page", DatabaseController.getOngoing);
router.get("/completed/:page", DatabaseController.getCompleted);
router.get("/search/:q", DatabaseController.getSearch);
router.get("/anime-list", DatabaseController.getAnimeList);
router.get("/detail/:endpoint", DatabaseController.getAnimeDetail);
router.get("/episode/:endpoint", DatabaseController.getAnimeEpisode);
router.get("/batch/:endpoint", DatabaseController.getBatchLink);
router.get("/genres", DatabaseController.getGenreList);
router.get("/genres/:genre/:page", DatabaseController.getGenrePage);
router.get("/stats", DatabaseController.getStats);
router.get("/scraping-stats", DatabaseController.getScrapingStats);
router.get("/admin/trigger/:job", DatabaseController.runScraperJob);
router.get("/admin/full", DatabaseController.runFullScrape);
router.get("/admin/details", DatabaseController.updateAllDetails);
router.get("/admin/complete_missing", DatabaseController.runCompleteMissing);
router.get("/admin/remove_duplicates", DatabaseController.runRemoveDuplicates);
router.delete("/admin/delete_all", DatabaseController.deleteAllDatabase);
router.get("/progress/:jobId", DatabaseController.getJobProgress);
router.get("/all", DatabaseController.getAllAnime);

module.exports = router;