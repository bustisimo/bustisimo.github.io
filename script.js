// ===== Haptic Feedback =====
// Uses Vibration API on Android, hidden-checkbox trick on iOS Safari
var _hapticLabel = null;
var _hapticInput = null;
var _isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

function _setupIOSHaptic() {
  if (_hapticLabel) return;
  _hapticInput = document.createElement('input');
  _hapticInput.type = 'checkbox';
  _hapticInput.id = '__haptic';
  _hapticInput.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;width:0;height:0;';
  _hapticLabel = document.createElement('label');
  _hapticLabel.setAttribute('for', '__haptic');
  _hapticLabel.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;width:0;height:0;';
  document.body.appendChild(_hapticInput);
  document.body.appendChild(_hapticLabel);
}

function haptic(type) {
  // Android / Chrome — Vibration API
  if (navigator.vibrate) {
    switch (type) {
      case 'light':   navigator.vibrate(8);  break;
      case 'medium':  navigator.vibrate(20); break;
      case 'heavy':   navigator.vibrate(35); break;
      case 'success': navigator.vibrate([8, 50, 8]); break;
      case 'error':   navigator.vibrate([40, 30, 40, 30, 40]); break;
      default:        navigator.vibrate(8);  break;
    }
    return;
  }
  // iOS Safari — hidden checkbox click triggers native haptic tick
  if (_isIOS && _hapticLabel) {
    _hapticLabel.click();
  }
}

// ===== Dark Mode Toggle =====
(function initTheme() {
  var saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

function updateThemeColor() {
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  meta.content = isDark ? '#000000' : '#f5f5f7';
}

function updateThemeIcon() {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
  btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon();
  updateThemeColor();
  haptic('medium');
}

document.addEventListener('DOMContentLoaded', function () {
  // Set up iOS haptic elements now that body exists
  if (_isIOS) _setupIOSHaptic();

  updateThemeIcon();
  updateThemeColor();

  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
});

// ===== Mobile Nav Toggle =====
var menuToggle = document.getElementById('menu-toggle');
var navLinks = document.getElementById('nav-links');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', function () {
    navLinks.classList.toggle('show');
    var isOpen = navLinks.classList.contains('show');
    menuToggle.innerHTML = isOpen ? '&#10005;' : '&#9776;';
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    haptic('light');
  });

  // Auto-close nav when a link is tapped
  var navLinkItems = navLinks.querySelectorAll('a');
  for (var i = 0; i < navLinkItems.length; i++) {
    navLinkItems[i].addEventListener('click', function () {
      if (navLinks.classList.contains('show')) {
        navLinks.classList.remove('show');
        menuToggle.innerHTML = '&#9776;';
        menuToggle.setAttribute('aria-expanded', 'false');
        haptic('light');
      }
    });
  }
}

// ===== Active Page Highlighting =====
(function highlightActivePage() {
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  var links = document.querySelectorAll('#nav-links a');
  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute('href');
    if (href === currentPage) {
      links[i].classList.add('active');
    }
  }
})();

// ===== Scroll Reveal =====
document.addEventListener('DOMContentLoaded', function () {
  var reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  var observer = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        entries[i].target.classList.add('visible');
        observer.unobserve(entries[i].target);
      }
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  for (var i = 0; i < reveals.length; i++) {
    observer.observe(reveals[i]);
  }
});

// ===== Snake Game =====
var canvas = document.getElementById('snakeGame');
var nav = document.querySelector('nav');
var dpad = document.getElementById('dpad');
var isTouchDevice = 'ontouchstart' in window;

// Only initialize game variables if the canvas exists on this page
if (canvas) {
  var context = canvas.getContext('2d');
  var scoreDisplay = document.getElementById('scoreDisplay');
  var highScoreDisplay = document.getElementById('highScoreDisplay');
  var playAgainButton = document.getElementById('playAgainButton');
  var closeGameButton = document.getElementById('closeGameButton');
}

// Game state variables
var score = 0;
var highScore = localStorage.getItem('snakeHighScore')
  ? parseInt(localStorage.getItem('snakeHighScore'), 10)
  : 0;
var snake = [];
var direction = { x: 1, y: 0 };
var food = {};
var gameInterval;
var cellSize = 20;

// Start or restart the Snake game
function startGame() {
  if (!canvas) return;

  // Lock body scroll
  document.body.style.overflow = 'hidden';

  // Hide navigation so game takes full screen
  if (nav) nav.style.display = 'none';

  // Reset score and direction
  score = 0;
  direction = { x: 1, y: 0 };

  // Resize canvas to fill viewport
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Determine grid dimensions based on cell size
  var gridWidth = Math.floor(canvas.width / cellSize);
  var gridHeight = Math.floor(canvas.height / cellSize);

  // Initialize snake in the center of the grid
  var startX = Math.floor(gridWidth / 2);
  var startY = Math.floor(gridHeight / 2);
  snake = [{ x: startX, y: startY }];

  // Place initial food at a random position
  food = {
    x: Math.floor(Math.random() * gridWidth),
    y: Math.floor(Math.random() * gridHeight),
  };

  // Update on-screen scores
  scoreDisplay.textContent = 'Score: ' + score;
  highScoreDisplay.textContent = 'High Score: ' + highScore;
  highScoreDisplay.style.display = 'block';

  // Show game overlay and canvas
  document.getElementById('gameOverlay').style.display = 'block';
  canvas.style.display = 'block';
  scoreDisplay.style.display = 'block';

  // Hide control buttons until game ends
  playAgainButton.style.display = 'none';
  closeGameButton.style.display = 'none';

  // Show D-pad on touch devices
  if (dpad && isTouchDevice) {
    dpad.style.display = 'grid';
  }

  // Start the game loop
  clearInterval(gameInterval);
  gameInterval = setInterval(function () { updateGame(gridWidth, gridHeight); }, 100);

  haptic('medium');
}

// Game update loop
function updateGame(gridWidth, gridHeight) {
  var head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreDisplay.textContent = 'Score: ' + score;
    food = {
      x: Math.floor(Math.random() * gridWidth),
      y: Math.floor(Math.random() * gridHeight),
    };
    haptic('light');
  } else {
    snake.pop();
  }

  var hitWall = head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight;
  var hitSelf = snake.slice(1).some(function (part) { return part.x === head.x && part.y === head.y; });
  if (hitWall || hitSelf) {
    endGame();
  }

  drawGame(gridWidth, gridHeight);
}

// Draw snake, food and background
function drawGame(gridWidth, gridHeight) {
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#4CAF50';
  snake.forEach(function (part) {
    context.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize);
  });

  context.fillStyle = '#FF5733';
  context.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
}

// Handle game over logic
function endGame() {
  clearInterval(gameInterval);

  haptic('error');

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snakeHighScore', highScore);
  }
  highScoreDisplay.textContent = 'High Score: ' + highScore;

  playAgainButton.style.display = 'block';
  closeGameButton.style.display = 'block';

  // Hide D-pad when game ends
  if (dpad) dpad.style.display = 'none';

  document.getElementById('gameOverlay').style.display = 'flex';
}

// Arrow key control handling
window.addEventListener('keydown', function (e) {
  switch (e.key) {
    case 'ArrowUp':
      if (direction.y === 0) direction = { x: 0, y: -1 };
      break;
    case 'ArrowDown':
      if (direction.y === 0) direction = { x: 0, y: 1 };
      break;
    case 'ArrowLeft':
      if (direction.x === 0) direction = { x: -1, y: 0 };
      break;
    case 'ArrowRight':
      if (direction.x === 0) direction = { x: 1, y: 0 };
      break;
  }
});

// ===== Snake Touch / Swipe Controls =====
// Processes direction on touchmove (not touchend) for instant response
if (canvas) {
  var touchStartX = 0;
  var touchStartY = 0;

  canvas.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    var dx = e.touches[0].clientX - touchStartX;
    var dy = e.touches[0].clientY - touchStartY;
    var minSwipe = 20;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && direction.x === 0) direction = { x: 1, y: 0 };
      else if (dx < 0 && direction.x === 0) direction = { x: -1, y: 0 };
    } else {
      if (dy > 0 && direction.y === 0) direction = { x: 0, y: 1 };
      else if (dy < 0 && direction.y === 0) direction = { x: 0, y: -1 };
    }

    // Reset origin so user can chain swipes without lifting finger
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    haptic('light');
  }, { passive: false });
}

// ===== D-Pad Controls (instant tap, no swipe delay) =====
if (dpad) {
  var dpadBtns = dpad.querySelectorAll('.dpad-btn');
  for (var i = 0; i < dpadBtns.length; i++) {
    (function (btn) {
      btn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (btn.classList.contains('dpad-up') && direction.y === 0)    direction = { x: 0, y: -1 };
        if (btn.classList.contains('dpad-down') && direction.y === 0)  direction = { x: 0, y: 1 };
        if (btn.classList.contains('dpad-left') && direction.x === 0)  direction = { x: -1, y: 0 };
        if (btn.classList.contains('dpad-right') && direction.x === 0) direction = { x: 1, y: 0 };
        haptic('light');
      }, { passive: false });
    })(dpadBtns[i]);
  }
}

// Close the game overlay and show navigation again
function closeGame() {
  document.getElementById('gameOverlay').style.display = 'none';
  document.body.style.overflow = '';
  if (nav) nav.style.display = '';
  if (dpad) dpad.style.display = 'none';
  haptic('light');
}
