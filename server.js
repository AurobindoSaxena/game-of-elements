
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', socket => {
  socket.on('createGame', ({ playerName, expectedPlayers }) => {
    const gameId = uuidv4().slice(0, 6);
    socket.join(gameId);
    io.to(gameId).emit('gameCreated', { gameId, playerName, expectedPlayers });
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
