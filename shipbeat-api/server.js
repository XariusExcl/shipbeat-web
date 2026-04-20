const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, Model, DataTypes } = require('sequelize');
const { loadEnvFile } = require('node:process');
const { totalmem } = require('node:os');

loadEnvFile();

const app = express();
const port = 3443;

const authenticateRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic '))
    return false;

  const credentials = authHeader.slice(6);
  return credentials === process.env.SECRET;
}

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

// Create data models
class Player extends Model { }
Player.init({
  name: DataTypes.STRING,
  totalScore: { type: DataTypes.BIGINT, defaultValue: 0 },
  playCount: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { sequelize, modelName: 'player' });

class Song extends Model { }
Song.init({
  title: DataTypes.STRING,
  artist: DataTypes.STRING,
  creator: DataTypes.STRING,
  bpm: DataTypes.STRING,
  length: DataTypes.FLOAT,
  difficultyName: DataTypes.STRING,
  difficultyRating: DataTypes.INTEGER,
  noteCount: DataTypes.INTEGER,
  playCount: DataTypes.INTEGER,
  clearCount: DataTypes.INTEGER
}, { sequelize, modelName: 'song' });

class Score extends Model { }
Score.init({
  songId: {
    type: DataTypes.INTEGER,
    references: {
      model: Song,
      key: 'id'
    }
  },
  playerId: {
    type: DataTypes.INTEGER,
    references: {
      model: Player,
      key: 'id'
    }
  },
  score: DataTypes.INTEGER,
  bestCombo: DataTypes.INTEGER,
  perfects: DataTypes.INTEGER,
  goods: DataTypes.INTEGER,
  bads: DataTypes.INTEGER,
  misses: DataTypes.INTEGER,
  percentage: DataTypes.NUMBER,
  rank: DataTypes.CHAR,
}, { sequelize, modelName: 'score' });

// Define associations
Score.belongsTo(Player, { foreignKey: 'playerId' });
Score.belongsTo(Song, { foreignKey: 'songId' });
Player.hasMany(Score, { foreignKey: 'playerId' });
Song.hasMany(Score, { foreignKey: 'songId' });

// Sync models with database
sequelize.sync();

// Middleware for parsing request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send("TUT-0 was here •ω•")
});

app.get('/players/leaderboard/:page', async (req, res) => {
  const page = req.params.page ?? 1;
  const player = await
    Player.findAll({
      order: [['totalScore', 'DESC']],
      limit: 50,
      offset: (page - 1) * 50
    })
  res.json(player);
});

app.get('/players/:name', async (req, res) => {
  const name = req.params.name;
  const player = await Player.findOne({ where: { name } }) ?? await Player.create({ name: name });
  res.json(player);
});

app.get('/songs', async (req, res) => {
  const songs = await Song.findAll();
  res.json(songs);
});

app.get('/scores/song/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid song id.' });

  const scores = await Score.findAll({
    where: { songId: id },
    include: {
      model: Player,
      attributes: ['name']
    },
    order: [['score', 'DESC']],
    limit: 20
  });

  res.json({ scores: scores });
});

app.get('/scores/player/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid player id.' });

  const scores = await Score.findAll({
    where: { playerId: id }
  });

  res.json({ scores: scores });
});

app.post('/songs', async (req, res) => {
  if (authenticateRequest(req) == false) return res.status(401).json({ message: 'request is not authenticated.' });
  const { songs } = req.body;
  const results = { songs: [] };

  for (const songInfo of songs) {
    const { Title, Artist, Creator, BPM, Length, DifficultyName, DifficultyRating, NoteCount } = songInfo;
    let song = await Song.findOne({ where: { title: Title, difficultyName: DifficultyName } });
    if (song) {
      await song.update({
        length: Length,
        difficultyRating: DifficultyRating,
        noteCount: NoteCount
      });
    } else {
      song = await Song.create({
        title: Title,
        artist: Artist,
        creator: Creator,
        bpm: BPM,
        length: Length,
        difficultyName: DifficultyName,
        difficultyRating: DifficultyRating,
        noteCount: NoteCount,
        playCount: 0,
        clearCount: 0
      });
    }
    results.songs.push(song);
  }
  res.json(results);
});

app.post('/songs/play/:id', async (req, res) => {
  if (authenticateRequest(req) == false) return res.status(401).json({ message: 'request is not authenticated.' });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid song id.' });

  let song = await Song.findOne({ where: { id } });
  if (song) {
    const playCount = ++song.playCount;
    await song.update({
      playCount
    })
  } else {
    res.status(404).json({ message: 'Song not found.' });
  }
});

app.post('/songs/clear/:id', async (req, res) => {
  if (authenticateRequest(req) == false) return res.status(401).json({ message: 'request is not authenticated.' });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid player id.' });

  const { PlayerID, Score: playScore, MaxCombo, Perfects, Goods, Bads, Misses, Percentage, Rank } = req.body;
  let song = await Song.findOne({ where: { id } });
  let player = await Player.findOne({ where: { id: PlayerID } });

  if (song && player) {
    const clearCount = ++song.clearCount;
    let isPersonalHighscore, isCabHighscore = false;
    let score = await Score.findOne({ where: { songId: id, playerId: PlayerID } })
    const bestScore = await Score.findOne({ where: { songId: id }, order: [['score', 'DESC']] });

    if (bestScore) { // Existing score
      isCabHighscore = playScore > bestScore.score;
    }

    if (score) { // Existing personal score
      const scoreDiff = playScore - score.score;
      if (scoreDiff <= 0) { res.json({ totalScore: player.totalScore }); return; } // Score was not beaten, don't save
      isPersonalHighscore = true;
      await score.update({
        score: playScore,
        bestCombo: MaxCombo,
        perfects: Perfects,
        goods: Goods,
        bads: Bads,
        misses: Misses,
        percentage: Percentage,
        rank: Rank,
      })
      await player.update({
        totalScore: player.totalScore + scoreDiff
      })
    } else { // New score
      await Score.create({
        songId: id,
        playerId: PlayerID,
        score: playScore,
        bestCombo: MaxCombo,
        perfects: Perfects,
        goods: Goods,
        bads: Bads,
        misses: Misses,
        percentage: Percentage,
        rank: Rank,
      })
      await player.update({
        totalScore: player.totalScore + playScore
      })
    }
    await song.update({
      clearCount
    })

    res.json({ totalScore: player.totalScore, isPersonalHighscore, isCabHighscore });
  } else {
    res.status(404).json({ message: 'Song not found.' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});