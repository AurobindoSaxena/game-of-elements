// Game variables
let playerScore = 0;
let computerScore = 0;
let playerChoice = "";
let computerChoice = "";
let gameOver = false;
const maxScore = 5;

// DOM elements
const playerScoreDisplay = document.getElementById("player-score");
const computerScoreDisplay = document.getElementById("computer-score");
const resultDisplay = document.getElementById("result");
const choiceButtons = document.querySelectorAll(".choice");
const resetButton = document.getElementById("reset-button");
const playerChoiceDisplay = document.getElementById("player-choice");
const computerChoiceDisplay = document.getElementById("computer-choice");
const gameOverModal = document.getElementById("game-over-modal");
const gameOverText = document.getElementById("game-over-text");
const closeModalButton = document.getElementById("close-modal");

// Game elements with their strengths
const elements = {
    fire: ["air", "Ether"],
    water: ["fire", "earth"],
    earth: ["air", "Ether"],
    air: ["water", "fire"],
    Ether: ["water", "earth"]
};

// Setup event listeners
function setupEventListeners() {
    choiceButtons.forEach(button => {
        button.addEventListener("click", () => {
            if (!gameOver) {
                playerChoice = button.id;
                playRound();
            }
        });
    });
    
    resetButton.addEventListener("click", resetGame);
    closeModalButton.addEventListener("click", closeModal);
}

// Initialize the game
function initGame() {
    updateScoreDisplay();
    setupEventListeners();
}

// Get computer choice
function getComputerChoice() {
    const choices = Object.keys(elements);
    return choices[Math.floor(Math.random() * choices.length)];
}

// Determine the winner of a round
function determineWinner(player, computer) {
    if (player === computer) {
        return "tie";
    } else if (elements[player].includes(computer)) {
        return "player";
    } else {
        return "computer";
    }
}

// Play a round
function playRound() {
    computerChoice = getComputerChoice();
    
    // Update choice displays
    playerChoiceDisplay.textContent = `You chose: ${playerChoice}`;
    computerChoiceDisplay.textContent = `Computer chose: ${computerChoice}`;
    
    const winner = determineWinner(playerChoice, computerChoice);
    
    // Update score and result display
    if (winner === "player") {
        playerScore++;
        resultDisplay.textContent = `You win! ${playerChoice} beats ${computerChoice}.`;
    } else if (winner === "computer") {
        computerScore++;
        resultDisplay.textContent = `You lose! ${computerChoice} beats ${playerChoice}.`;
    } else {
        resultDisplay.textContent = `It's a tie! Both chose ${playerChoice}.`;
    }
    
    updateScoreDisplay();
    
    // Check if game is over
    if (playerScore >= maxScore || computerScore >= maxScore) {
        endGame();
    }
}

// Update score display
function updateScoreDisplay() {
    playerScoreDisplay.textContent = playerScore;
    computerScoreDisplay.textContent = computerScore;
}

// End the game
function endGame() {
    gameOver = true;
    
    if (playerScore >= maxScore) {
        gameOverText.textContent = "Congratulations! You won the game!";
    } else {
        gameOverText.textContent = "Game over! The computer won.";
    }
    
    gameOverModal.style.display = "flex";
}

// Close the modal
function closeModal() {
    gameOverModal.style.display = "none";
}

// Reset the game
function resetGame() {
    playerScore = 0;
    computerScore = 0;
    playerChoice = "";
    computerChoice = "";
    gameOver = false;
    
    playerChoiceDisplay.textContent = "Make your choice!";
    computerChoiceDisplay.textContent = "Waiting for your move...";
    resultDisplay.textContent = "Choose an element to start the game!";
    
    updateScoreDisplay();
    closeModal();
}

// Initialize the game
initGame();
