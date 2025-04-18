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

const games = {};

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/game/:gameId', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('createGame', ({ playerName, totalPlayers }, callback) => {
    const gameId = uuidv4();
    games[gameId] = { players: [{name: playerName}], choices: {}, totalPlayers: +totalPlayers, round:1, status:'waiting' };
    socket.join(gameId);
    socket.playerName = playerName;
    socket.gameId = gameId;
    callback({ gameId });
    io.to(gameId).emit('updatePlayers', { players: games[gameId].players.map(p=>p.name), choices: games[gameId].choices });
  });

  socket.on('joinGame', ({ gameId, playerName }, callback) => {
    if (!games[gameId]) return callback({ error:'Game not found' });
    if (games[gameId].players.length>=games[gameId].totalPlayers) return callback({ error:'Game is full' });
    if (games[gameId].players.some(p=>p.name===playerName)) return callback({ error:'Name already taken' });
    games[gameId].players.push({name:playerName});
    socket.join(gameId);
    socket.playerName = playerName;
    socket.gameId = gameId;
    io.to(gameId).emit('updatePlayers', { players: games[gameId].players.map(p=>p.name), choices:games[gameId].choices });
    callback({ success:true });
    if (games[gameId].players.length===games[gameId].totalPlayers) {
      games[gameId].status='playing';
      io.to(gameId).emit('startRound',{ round: games[gameId].round });
    }
  });

  socket.on('submitChoice', ({ gameId, playerName, element }) => {
    if (!games[gameId]||games[gameId].status!=='playing') return;
    games[gameId].choices[playerName] = element;
    io.to(gameId).emit('updatePlayers',{ players: games[gameId].players.map(p=>p.name), choices: games[gameId].choices });
    if (Object.keys(games[gameId].choices).length===games[gameId].players.length) {
      const result = calculateResult(games[gameId].choices, games[gameId].players);
      games[gameId].status = 'result';
      io.to(gameId).emit('showResult',{ result, choices:games[gameId].choices, round:games[gameId].round });
    }
  });

  socket.on('nextRound', ({ gameId }) => {
    if (!games[gameId]) return;
    games[gameId].round++;
    games[gameId].status='playing';
    games[gameId].choices={};
    io.to(gameId).emit('startRound',{ round: games[gameId].round });
    io.to(gameId).emit('updatePlayers',{ players: games[gameId].players.map(p=>p.name), choices:games[gameId].choices });
  });

  socket.on('newGame', ({ gameId }) => {
    if (!games[gameId]) return;
    games[gameId].choices={};
    games[gameId].round=1;
    games[gameId].status='waiting';
    io.to(gameId).emit('resetGame');
  });
});

const winConditions = {
  Fire:['Earth','Ether'],
  Water:['Fire','Earth'],
  Earth:['Air','Water'],
  Air:['Water','Ether'],
  Ether:['Air','Fire']
};
const winDescriptions = {
  Fire:{Earth:'burns',Ether:'purifies'},
  Water:{Fire:'extinguishes',Earth:'erodes'},
  Earth:{Air:'grounds',Water:'absorbs'},
  Air:{Water:'disrupts',Ether:'scatters'},
  Ether:{Air:'transcends',Fire:'controls'}
};

function calculateResult(choices, players) {
  let allSame = new Set(Object.values(choices)).size===1;
  if(allSame) return { result:'Draw! All players chose '+Object.values(choices)[0]+'.', explanation:['No one beats another since all selected the same element.'] };
  let winners=[];
  for(let p of players){
    let win=true;
    for(let o of players){
      if(o.name!==p.name && winConditions[choices[o.name]].includes(choices[p.name])){ win=false; break; }
    }
    if(win) winners.push({player:p.name,element:choices[p.name]});
  }
  let explanation=[];
  let result='';
  if(!winners.length||winners.length===players.length){
    result='Draw! No clear winner.';
    explanation.push(!winners.length?'No element is unbeaten; each is countered by another.':'All players are unbeaten, resulting in a tie.');
  } else {
    result='Winner(s): '+winners.map(w=>w.player+' ('+w.element+')').join(', ');
    for(let w of winners){
      let beats=players.filter(p=>p.name!==w.player && winConditions[w.element].includes(choices[p.name]))
        .map(p=>w.element+' '+winDescriptions[w.element][choices[p.name]]+' '+choices[p.name]+' ('+p.name+')');
      explanation.push(w.player+' wins: '+beats.join(', '));
    }
  }
  return {result,explanation};
}

const PORT = process.env.PORT||3000;
server.listen(PORT,()=>console.log('Server running on port '+PORT));
