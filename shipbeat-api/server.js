const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, Model, DataTypes } = require('sequelize');
const { loadEnvFile } = require('node:process');

loadEnvFile();

const app = express();
const port = 3443;

const authenticateRequest = (req) => {
  const { secret } = req.query;
  return (secret == process.env.SECRET);
}

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

// Create data models
class Player extends Model {}
Player.init({
  name: DataTypes.STRING,
  totalScore: DataTypes.BIGINT,
}, { sequelize, modelName: 'player' });

class Score extends Model {}
Score.init({
  score: DataTypes.INTEGER,
  bestCombo: DataTypes.INTEGER,
  perfects: DataTypes.INTEGER,
  goods: DataTypes.INTEGER,
  bads: DataTypes.INTEGER,
  misses: DataTypes.INTEGER,
  percentage: DataTypes.NUMBER,
  rank: DataTypes.CHAR,
}, { sequelize, modelName: 'score' });

class Song extends Model {}
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
  const player = await Player.findOne({ where: { name } });
  res.json(player || {});
});

app.post('/players', async (req, res) => {
  if(authenticateRequest(req) == false) return res.status(501).json({ message: 'request is not authenticated.' });
  const player = await Player.create(req.body);
  res.json(player);
});

app.get('/songs', async (req, res) => {
  const songs = await Song.findAll();
  res.json(songs); 
});

app.post('/songs', async (req, res) => {
  if(authenticateRequest(req) == false) return res.status(501).json({ message: 'request is not authenticated.' });
  const { title, artist, creator, bpm, length, difficultyName, difficultyRating, noteCount } = req.body;
  let song = await Song.findOne({ where: { title, difficultyName } });
  if (song) {
    await song.update({
      length,
      difficultyRating,
      noteCount
    });
    res.json(song);
  } else {
    song = await Song.create({
      title,
      artist,
      creator,
      bpm,
      length,
      difficultyName,
      difficultyRating,
      noteCount,
      playCount: 0,
      clearCount: 0
    });
    res.json(song);
  }
});

app.post('/songs/play/:id', async (req, res) => {
  if(authenticateRequest(req) == false) return res.status(501).json({ message: 'request is not authenticated.' });
  let song = await Song.findOne({ where: { title, difficultyName } });
  if (song) {
    const playCount = ++song.playCount;
    await song.update({
      playCount
    })
  } else {
    res.status(404).json({ message: 'Song not found.'});
  }
});

app.post('/songs/clear/:id', async (req, res) => {
  if(authenticateRequest(req) == false) return res.status(501).json({ message: 'request is not authenticated.' });
  let song = await Song.findOne({ where: { title, difficultyName } });
  if (song) {
    const clearCount = ++song.clearCount;
    await song.update({
      clearCount
    })
  } else {
    res.status(404).json({ message: 'Song not found.'});
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});