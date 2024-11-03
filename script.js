// Select the canvas and set up initial values
const canvas = document.getElementById("snakeGame");
const context = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const playAgainButton = document.getElementById("playAgainButton");
const closeGameButton = document.getElementById("closeGameButton");
let score = 0;
let highScore = 0; // Initialize high score
let snake = [];
let direction = { x: 1, y: 0 };
let food = {};
let gameInterval;
const cellSize = 20;

// Start the Snake game
function startGame() {
    // Reset score and direction
    score = 0;
    direction = { x: 1, y: 0 };

    // Set canvas size to match the window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Calculate grid size based on cell size
    const gridWidth = Math.floor(canvas.width / cellSize);
    const gridHeight = Math.floor(canvas.height / cellSize);

    // Center the snake
    const startX = Math.floor(gridWidth / 2);
    const startY = Math.floor(gridHeight / 2);
    snake = [{ x: startX, y: startY }];

    // Initialize food
    food = { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };

    // Update display elements
    scoreDisplay.textContent = "Score: " + score;
    highScoreDisplay.textContent = "High Score: " + highScore;
    highScoreDisplay.style.display = "block"; // Show high score display

    // Show the overlay
    document.getElementById("gameOverlay").style.display = "block";
    canvas.style.display = "block";
    scoreDisplay.style.display = "block";
    playAgainButton.style.display = "none"; // Hide play again button
    closeGameButton.style.display = "none"; // Hide close game button
    gameInterval = setInterval(() => updateGame(gridWidth, gridHeight), 100);
}

// Update the game state
function updateGame(gridWidth, gridHeight) {
    // Move snake
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    snake.unshift(head);

    // Check if snake eats food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreDisplay.textContent = "Score: " + score;
        food = { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };
    } else {
        snake.pop(); // Remove tail if no food is eaten
    }

    // Check collision with walls or self
    if (
        head.x < 0 || head.x >= gridWidth || 
        head.y < 0 || head.y >= gridHeight || 
        snake.slice(1).some(part => part.x === head.x && part.y === head.y)
    ) {
        endGame();
    }

    // Draw everything
    drawGame(gridWidth, gridHeight);
}

// Draw the game (snake, food, score)
function drawGame(gridWidth, gridHeight) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw snake
    context.fillStyle = "#4CAF50";
    snake.forEach(part => context.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize));
    
    // Draw food
    context.fillStyle = "#FF5733";
    context.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
}

// End the game and reset
function endGame() {
    clearInterval(gameInterval);
    if (score > highScore) {
        highScore = score; // Update high score
    }
    highScoreDisplay.textContent = "High Score: " + highScore; // Display high score

    // Show the play again and close game buttons
    playAgainButton.style.display = "block"; // Show play again button
    closeGameButton.style.display = "block"; // Show close game button

    // Ensure the overlay is displayed
    document.getElementById("gameOverlay").style.display = "flex"; // Display overlay
}

// Handle arrow key controls
window.addEventListener("keydown", e => {
    switch (e.key) {
        case "ArrowUp": if (direction.y === 0) direction = { x: 0, y: -1 }; break;
        case "ArrowDown": if (direction.y === 0) direction = { x: 0, y: 1 }; break;
        case "ArrowLeft": if (direction.x === 0) direction = { x: -1, y: 0 }; break;
        case "ArrowRight": if (direction.x === 0) direction = { x: 1, y: 0 }; break;
    }
});

// Close the game overlay and return to homepage
function closeGame() {
    document.getElementById("gameOverlay").style.display = "none"; // Hide game overlay
}