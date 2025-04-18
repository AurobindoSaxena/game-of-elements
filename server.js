
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { v4: uuid } = require('uuid');

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const games = {};

io.on('connection', socket => {
  socket.on('createGame', ({ playerName, numPlayers }) => {
    const gameId = uuid().slice(0, 6);
    games[gameId] = { players: {}, numPlayers, choices: {} };
    games[gameId].players[playerName] = socket.id;
    socket.join(gameId);
    socket.emit('gameCreated', { gameId });
  });

  socket.on('joinGame', ({ playerName, gameId }) => {
    const game = games[gameId];
    if (!game) return socket.emit('error', 'Invalid Game ID');
    game.players[playerName] = socket.id;
    socket.join(gameId);
    socket.emit('gameJoined', { gameId });
  });

  socket.on('submitChoice', ({ gameId, playerName, element }) => {
    const game = games[gameId];
    game.choices[playerName] = element;
    if (Object.keys(game.choices).length == game.numPlayers) {
      const results = Object.entries(game.choices).map(([player, choice]) => `${player}: ${choice}`).join(', ');
      io.in(gameId).emit('showResult', { message: `Choices - ${results}` });
      game.choices = {};
    }
  });
});

http.listen(process.env.PORT || 3000, () => console.log('Server running on port 3000'));
