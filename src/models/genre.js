const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Anime = require('./anime');

const Genre = sequelize.define('Genre', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  endpoint: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  timestamps: true
});

const AnimeGenre = sequelize.define('AnimeGenre', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  }
}, {
  timestamps: false
});

Anime.belongsToMany(Genre, { through: AnimeGenre });
Genre.belongsToMany(Anime, { through: AnimeGenre });

module.exports = { Genre, AnimeGenre };