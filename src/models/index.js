const { sequelize } = require('../config/database');
const Anime = require('./anime');
const Episode = require('./episode');
const Batch = require('./batch');
const { Genre, AnimeGenre } = require('./genre');

const initModels = async () => {
    try {
        await sequelize.sync({ force: false, alter: true });
        return true;
    } catch (error) {
        return false;
    }
};

module.exports = {
    initModels,
    Anime,
    Episode,
    Batch,
    Genre,
    AnimeGenre
};