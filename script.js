// Grab DOM elements needed for the game and UI
const canvas = document.getElementById("snakeGame");
const context = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const playAgainButton = document.getElementById("playAgainButton");
const closeGameButton = document.getElementById("closeGameButton");
const nav = document.querySelector("nav");

// Game state variables
let score = 0;
// Persist high score using localStorage; fall back to zero
let highScore = localStorage.getItem("snakeHighScore")
  ? parseInt(localStorage.getItem("snakeHighScore"), 10)
  : 0;
let snake = [];
let direction = { x: 1, y: 0 };
let food = {};
let gameInterval;
const cellSize = 20;

// Start or restart the Snake game
function startGame() {
  // Hide navigation so game takes full screen
  if (nav) nav.style.display = "none";

  // Reset score and direction
  score = 0;
  direction = { x: 1, y: 0 };

  // Resize canvas to fill viewport
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Determine grid dimensions based on cell size
  const gridWidth = Math.floor(canvas.width / cellSize);
  const gridHeight = Math.floor(canvas.height / cellSize);

  // Initialize snake in the center of the grid
  const startX = Math.floor(gridWidth / 2);
  const startY = Math.floor(gridHeight / 2);
  snake = [{ x: startX, y: startY }];

  // Place initial food at a random position
  food = {
    x: Math.floor(Math.random() * gridWidth),
    y: Math.floor(Math.random() * gridHeight),
  };

  // Update on‑screen scores
  scoreDisplay.textContent = "Score: " + score;
  highScoreDisplay.textContent = "High Score: " + highScore;
  highScoreDisplay.style.display = "block";

  // Show game overlay and canvas
  document.getElementById("gameOverlay").style.display = "block";
  canvas.style.display = "block";
  scoreDisplay.style.display = "block";

  // Hide control buttons until game ends
  playAgainButton.style.display = "none";
  closeGameButton.style.display = "none";

  // Start the game loop
  clearInterval(gameInterval);
  gameInterval = setInterval(() => updateGame(gridWidth, gridHeight), 100);
}

// Game update loop
function updateGame(gridWidth, gridHeight) {
  // Move the snake by adding a new head
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  snake.unshift(head);

  // Check if food is consumed
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreDisplay.textContent = "Score: " + score;
    food = {
      x: Math.floor(Math.random() * gridWidth),
      y: Math.floor(Math.random() * gridHeight),
    };
  } else {
    // Remove tail if no food eaten
    snake.pop();
  }

  // Detect collisions with walls or self
  const hitWall = head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight;
  const hitSelf = snake.slice(1).some((part) => part.x === head.x && part.y === head.y);
  if (hitWall || hitSelf) {
    endGame();
  }

  // Render the current frame
  drawGame(gridWidth, gridHeight);
}

// Draw snake, food and background
function drawGame(gridWidth, gridHeight) {
  // Clear the canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw snake segments
  context.fillStyle = "#4CAF50";
  snake.forEach((part) => {
    context.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize);
  });

  // Draw the food
  context.fillStyle = "#FF5733";
  context.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
}

// Handle game over logic
function endGame() {
  clearInterval(gameInterval);

  // Update high score if necessary and persist it
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("snakeHighScore", highScore);
  }
  highScoreDisplay.textContent = "High Score: " + highScore;

  // Show control buttons
  playAgainButton.style.display = "block";
  closeGameButton.style.display = "block";

  // Reveal the overlay (ensures z‑index layering)
  document.getElementById("gameOverlay").style.display = "flex";
}

// Arrow key control handling
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      if (direction.y === 0) direction = { x: 0, y: -1 };
      break;
    case "ArrowDown":
      if (direction.y === 0) direction = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
      if (direction.x === 0) direction = { x: -1, y: 0 };
      break;
    case "ArrowRight":
      if (direction.x === 0) direction = { x: 1, y: 0 };
      break;
  }
});

// Close the game overlay and show navigation again
function closeGame() {
  document.getElementById("gameOverlay").style.display = "none";
  // Show navigation when exiting the game
  if (nav) nav.style.display = "block";
}

// --- Global click counter functionality ---
// Upon DOM load we register listeners to update and display a global click count.
// The count persists across sessions using the free CountAPI service. Every time
// someone clicks the button on the site, the API increments the count, and
// visitors will see live updates periodically.
document.addEventListener("DOMContentLoaded", () => {
  // Look up click counter container and its nested button/span instead of relying on specific IDs
  const counterDiv = document.getElementById("click-counter");
  const countDisplay = counterDiv ? counterDiv.querySelector("span") : null;
  const clickBtn = counterDiv ? counterDiv.querySelector("button") : null;
  // Proceed only if the counter elements exist on the page
  if (counterDiv && countDisplay && clickBtn) {
    const namespace = "justisdibattista";
    const key = "site_clicks";
    const counterApi = "https://api.counterapi.dev";
    // Fetch and update current count
    function updateCount() {
      fetch(`${counterApi}/get/${namespace}/${key}`)
        .then((res) => res.json())
        .then((data) => {
          countDisplay.textContent = data.value;
        })
        .catch((err) => {
          console.error("Error fetching click count", err);
        });
    }
    // Increment count when user clicks the button
    clickBtn.addEventListener("click", () => {
      fetch(`${counterApi}/hit/${namespace}/${key}`)
        .then((res) => res.json())
        .then((data) => {
          countDisplay.textContent = data.value;
        })
        .catch((err) => {
          console.error("Error updating click count", err);
        });
    });
    // Initial fetch on load
    updateCount();
    // Periodically update the count to reflect other users' clicks (every 5 sec)
    setInterval(updateCount, 5000);
  }
});
