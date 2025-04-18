
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const elements = ['Fire', 'Water', 'Earth', 'Air', 'Ether'];
const winConditions = {
  Fire: ['Earth', 'Ether'],
  Water: ['Fire', 'Earth'],
  Earth: ['Air', 'Water'],
  Air: ['Water', 'Ether'],
  Ether: ['Air', 'Fire'],
};

export default function GameOfElements() {
  const [player1Name, setPlayer1Name] = useState('');
  const [gameId, setGameId] = useState('');
  const [player2Joined, setPlayer2Joined] = useState(false);
  const [choices, setChoices] = useState({});
  const [timer, setTimer] = useState(15);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let interval;
    if (player2Joined && timer > 0) {
      interval = setInterval(() => setTimer(timer - 1), 1000);
    } else if (timer === 0) {
      determineWinner();
    }
    return () => clearInterval(interval);
  }, [player2Joined, timer]);

  const createGame = () => {
    const newGameId = uuidv4();
    setGameId(newGameId);
  };

  const joinGame = () => {
    setPlayer2Joined(true);
  };

  const handleChoice = (player, choice) => {
    setChoices(prev => ({ ...prev, [player]: choice }));
  };

  const determineWinner = () => {
    const p1Choice = choices['Player 1'];
    const p2Choice = choices['Player 2'];
    if (p1Choice === p2Choice || (!winConditions[p1Choice]?.includes(p2Choice) && !winConditions[p2Choice]?.includes(p1Choice))) {
      setResult("It's a draw!");
    } else if (winConditions[p1Choice]?.includes(p2Choice)) {
      setResult(`${player1Name} wins! ${p1Choice} beats ${p2Choice}.`);
    } else {
      setResult(`Player 2 wins! ${p2Choice} beats ${p1Choice}.`);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-gray-100 rounded-xl shadow-lg mt-8">
      <h1 className="text-2xl font-bold text-center">Game of Elements</h1>
      <p className="text-center mb-6">Envisioned by Aurobindo Saxena</p>

      {!gameId && (
        <div>
          <h2 className="font-semibold mb-4">Game Rules:</h2>
          <ul className="mb-4 list-disc ml-6">
            <li>Fire burns Earth and purifies Ether</li>
            <li>Water extinguishes Fire and erodes Earth</li>
            <li>Earth grounds Air and absorbs Water</li>
            <li>Air disrupts Water and scatters Ether</li>
            <li>Ether transcends Air and controls Fire</li>
          </ul>
          <input
            className="w-full mb-4 p-2 border rounded"
            placeholder="Player 1 name"
            value={player1Name}
            onChange={(e) => setPlayer1Name(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={createGame}
          >
            Create Game
          </button>
        </div>
      )}

      {gameId && !player2Joined && (
        <div className="text-center">
          <p className="mb-2">Game created! Share this Game ID:</p>
          <p className="font-bold mb-4">{gameId}</p>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded"
            onClick={joinGame}
          >
            Simulate Player 2 Join
          </button>
        </div>
      )}

      {player2Joined && timer > 0 && (
        <div>
          <p className="mb-4">Time remaining: {timer}s</p>
          {['Player 1', 'Player 2'].map(player => (
            !choices[player] && (
              <div key={player}>
                <p className="mb-2">{player}, select your element:</p>
                <select
                  className="w-full p-2 border rounded mb-4"
                  onChange={(e) => handleChoice(player, e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Select an element</option>
                  {elements.map(el => <option key={el} value={el}>{el}</option>)}
                </select>
              </div>
            )
          ))}
        </div>
      )}

      {result && (
        <div className="text-center">
          <h2 className="text-xl font-semibold my-4">{result}</h2>
          <p>{player1Name} selected {choices['Player 1']}, Player 2 selected {choices['Player 2']}.</p>
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded mt-4"
            onClick={() => window.location.reload()}
          >
            New Game
          </button>
        </div>
      )}
    </div>
  );
}
