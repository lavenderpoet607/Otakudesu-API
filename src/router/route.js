const router = require("express").Router();
const Services = require("../controller/services");

router.get("/", (req, res) => {
    res.json({
        name: "OtakuDesu Anime API v1.0",
        version: "v1.0",
        status: "active",
        base_url: `${req.protocol}://${req.get('host')}/api/v1`,
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
            streaming: "/streaming/:content"
        }
    });
});

router.get("/ongoing/:page", Services.getOngoing);
router.get("/completed/:page", Services.getCompleted);
router.get("/search/:q", Services.getSearch);
router.get("/anime-list", Services.getAnimeList);
router.get("/detail/:endpoint", Services.getAnimeDetail);
router.get("/episode/:endpoint", Services.getAnimeEpisode);
router.get("/batch/:endpoint", Services.getBatchLink);
router.get("/genres", Services.getGenreList);
router.get("/genres/:genre/:page", Services.getGenrePage);
router.get("/streaming/:content", Services.getEmbedByContent);

module.exports = router;