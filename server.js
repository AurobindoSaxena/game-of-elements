const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(__dirname));

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const games = {};
const rules = {
  Fire: ['Earth', 'Ether'],
  Water: ['Fire', 'Earth'],
  Earth: ['Air', 'Water'],
  Air: ['Water', 'Ether'],
  Ether: ['Air', 'Fire']
};

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('createGame', (callback) => {
    const gameId = uuidv4().slice(0, 6);
    games[gameId] = { players: [], choices: {}, round: 1 };
    const link = `${socket.handshake.headers.referer.split('?')[0]}?gameId=${gameId}`;
    callback({ gameId, link });
  });

  socket.on('joinGame', ({ gameId, playerName }, callback) => {
    const game = games[gameId];
    if (!game) return callback({ error: 'Game not found' });
    if (game.players.includes(playerName)) return callback({ error: 'Name already taken' });
    game.players.push(playerName);
    io.to(socket.id).emit('updatePlayers', game.players);
    io.emit('updatePlayers', game.players);
    callback({ success: true });
  });

  socket.on('startRound', ({ gameId }) => {
    const game = games[gameId];
    if (!game) return;
    game.choices = {};
    io.emit('startRound', { round: game.round });
  });

  socket.on('submitChoice', ({ gameId, playerName, element }) => {
    const game = games[gameId];
    if (!game) return;
    game.choices[playerName] = element;
    if (Object.keys(game.choices).length === game.players.length) {
      const result = evaluateGame(game.choices);
      io.emit('showResult', { result, choices: game.choices, round: game.round });
      game.round++;
    }
  });

  socket.on('nextRound', ({ gameId }) => {
    const game = games[gameId];
    if (!game) return;
    io.emit('startRound', { round: game.round });
  });

  socket.on('newGame', ({ gameId }) => {
    const game = games[gameId];
    if (!game) return;
    game.choices = {};
    game.round = 1;
    io.emit('resetGame');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

function evaluateGame(choices) {
  const results = {};
  const explanation = [];
  const players = Object.keys(choices);
  players.forEach(p1 => {
    results[p1] = players.reduce((count, p2) => {
      return count + (p1 !== p2 && rules[choices[p1]].includes(choices[p2]) ? 1 : 0);
    }, 0);
  });
  const maxScore = Math.max(...Object.values(results));
  const winners = players.filter(p => results[p] === maxScore);
  let resultText = winners.length === 1
    ? `${winners[0]} wins!`
    : "It's a draw!";
  players.forEach(p1 => {
    players.forEach(p2 => {
      if (p1 !== p2 && rules[choices[p1]].includes(choices[p2])) {
        explanation.push(`${p1}'s ${choices[p1]} beats ${p2}'s ${choices[p2]}`);
      }
    });
  });
  return { result: resultText, explanation };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
