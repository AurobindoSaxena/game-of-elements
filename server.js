const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Store game state
const games = {};

// Serve static files from root directory
app.use(express.static(__dirname));

// Handle root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle game route
app.get('/game/:gameId', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  // Create new game
  socket.on('createGame', ({ playerName, totalPlayers }, callback) => {
    const gameId = uuidv4();
    games[gameId] = {
      players: [{ name: playerName }],
      choices: {},
      totalPlayers: parseInt(totalPlayers),
      round: 1,
      status: 'waiting'
    };
    socket.join(gameId);
    socket.playerName = playerName;
    socket.gameId = gameId;
    callback({ gameId, link: `https://${process.env.DOMAIN || 'localhost:3000'}/game/${gameId}` });
    io.to(gameId).emit('updatePlayers', {
      players: games[gameId].players.map(p => p.name),
      choices: games[gameId].choices
    });
  });

  // Join game
  socket.on('joinGame', ({ gameId, playerName }, callback) => {
    if (!games[gameId]) {
      callback({ error: 'Game not found' });
      return;
    }
    if (games[gameId].players.length >= games[gameId].totalPlayers) {
      callback({ error: 'Game is full' });
      return;
    }
    if (games[gameId].players.some(p => p.name === playerName)) {
      callback({ error: 'Name already taken' });
      return;
    }
    games[gameId].players.push({ name: playerName });
    socket.join(gameId);
    socket.playerName = playerName;
    socket.gameId = gameId;
    io.to(gameId).emit('updatePlayers', {
      players: games[gameId].players.map(p => p.name),
      choices: games[gameId].choices
    });
    callback({ success: true });

    // Start round if all players have joined
    if (games[gameId].players.length === games[gameId].totalPlayers) {
      games[gameId].status = 'playing';
      io.to(gameId).emit('startRound', { round: games[gameId].round });
    }
  });

  // Submit choice
  socket.on('submitChoice', ({ gameId, playerName, element }) => {
    if (!games[gameId] || games[gameId].status !== 'playing') return;
    games[gameId].choices[playerName] = element;
    io.to(gameId).emit('updatePlayers', {
      players: games[gameId].players.map(p => p.name),
      choices: games[gameId].choices
    });

    if (Object.keys(games[gameId].choices).length === games[gameId].players.length) {
      const result = calculateResult(games[gameId].choices, games[gameId].players);
      games[gameId].status = 'result';
      io.to(gameId).emit('showResult', {
        result,
        choices: games[gameId].choices,
        round: games[gameId].round
      });
    }
  });

  // Next round
  socket.on('nextRound', ({ gameId }) => {
    if (!games[gameId]) return;
    games[gameId].round += 1;
    games[gameId].status = 'playing';
    games[gameId].choices = {};
    io.to(gameId).emit('startRound', { round: games[gameId].round });
    io.to(gameId).emit('updatePlayers', {
      players: games[gameId].players.map(p => p.name),
      choices: games[gameId].choices
    });
  });

  // New game
  socket.on('newGame', ({ gameId }) => {
    if (!games[gameId]) return;
    games[gameId] = {
      players: games[gameId].players,
      choices: {},
      totalPlayers: games[gameId].totalPlayers,
      round: 1,
      status: 'waiting'
    };
    io.to(gameId).emit('resetGame');
  });
});

// Win conditions and result calculation unchanged...

const winConditions = {
  Fire: ['Earth', 'Ether'],
  Water: ['Fire', 'Earth'],
  Earth: ['Air', 'Water'],
  Air: ['Water', 'Ether'],
  Ether: ['Air', 'Fire']
};

const winDescriptions = {
  Fire: { Earth: 'burns', Ether: 'purifies' },
  Water: { Fire: 'extinguishes', Earth: 'erodes' },
  Earth: { Air: 'grounds', Water: 'absorbs' },
  Air: { Water: 'disrupts', Ether: 'scatters' },
  Ether: { Air: 'transcends', Fire: 'controls' }
};

function calculateResult(choices, players) {
  let result = '';
  let explanation = [];
  const uniqueChoices = [...new Set(Object.values(choices))];
  const allSame = uniqueChoices.length === 1;

  if (allSame) {
    result = `Draw! All players chose ${choices[players[0].name]}.`;
    explanation.push(`No one beats another since all selected the same element.`);
  } else if (uniqueChoices.length === players.length && players.length > 2) {
    let winners = [];
    for (let player of players) {
      let isWinner = true;
      for (let otherPlayer of players) {
        if (otherPlayer.name !== player.name &&
            winConditions[choices[otherPlayer.name]]?.includes(choices[player.name])) {
          isWinner = false;
          break;
        }
      }
      if (isWinner) winners.push({ player: player.name, element: choices[player.name] });
    }
    if (!winners.length) {
      result = 'Draw! No dominant element.';
      explanation.push(`The choices (${uniqueChoices.join(', ')}) form a cycle or no element beats all others.`);
    } else {
      result = `Winner(s): ${winners.map(w => \`\${w.player} (\${w.element})\`).join(', ')}`;
      winners.forEach(w => {
        const beatsList = players
          .filter(p => p.name !== w.player && winConditions[w.element].includes(choices[p.name]))
          .map(p => \`\${w.element} \${winDescriptions[w.element][choices[p.name]]} \${choices[p.name]} (\${p.name})\`);
        explanation.push(\`\${w.player} wins: \${beatsList.join(', ')}\`);
      });
    }
  } else {
    let winners = [];
    for (let player of players) {
      let isWinner = true;
      for (let otherPlayer of players) {
        if (otherPlayer.name !== player.name &&
            winConditions[choices[otherPlayer.name]]?.includes(choices[player.name])) {
          isWinner = false;
          break;
        }
      }
      if (isWinner) winners.push({ player: player.name, element: choices[player.name] });
    }
    if (!winners.length || winners.length === players.length) {
      result = 'Draw! No clear winner.';
      explanation.push(!winners.length
        ? `No element is unbeaten; each is countered by another.`
        : `All players are unbeaten, resulting in a tie.`);
    } else {
      result = `Winner(s): ${winners.map(w => \`\${w.player} (\${w.element})\`).join(', ')}`;
      winners.forEach(w => {
        const beatsList = players
          .filter(p => p.name !== w.player && winConditions[w.element].includes(choices[p.name]))
          .map(p => \`\${w.element} \${winDescriptions[w.element][choices[p.name]]} \${choices[p.name]} (\${p.name})\`);
        explanation.push(\`\${w.player} wins: \${beatsList.join(', ')}\`);
      });
    }
  }

  return { result, explanation };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
