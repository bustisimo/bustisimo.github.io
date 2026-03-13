// ===== Haptic Feedback =====
// iOS: toggle a native <input type="checkbox" switch> to trigger Taptic Engine
// Android: navigator.vibrate()

var hapticLabel = null;

(function initHaptic() {
  if (typeof document === 'undefined') return;
  var id = '_haptic';
  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.setAttribute('switch', '');
  cb.id = id;
  // Position off-screen but fully rendered (no display:none, no opacity:0)
  cb.style.cssText = 'position:fixed;top:-200px;left:-200px;';

  var lbl = document.createElement('label');
  lbl.setAttribute('for', id);
  lbl.style.cssText = 'position:fixed;top:-200px;left:-200px;';

  lbl.appendChild(cb);
  document.body.appendChild(lbl);
  hapticLabel = lbl;
})();

function hapticTap() {
  if (hapticLabel) hapticLabel.click();
}

function haptic(type) {
  // Android vibrate
  if (navigator.vibrate) {
    switch (type) {
      case 'light':   navigator.vibrate(15); break;
      case 'medium':  navigator.vibrate(25); break;
      case 'heavy':   navigator.vibrate(35); break;
      case 'success': navigator.vibrate([20, 60, 30]); break;
      case 'error':   navigator.vibrate([30, 40, 30, 40, 30]); break;
      default:        navigator.vibrate(15);
    }
  }

  // iOS: single tap for light/medium/heavy, multi-tap for patterns
  switch (type) {
    case 'light':
    case 'medium':
    case 'heavy':
      hapticTap();
      break;
    case 'success':
      hapticTap();
      setTimeout(hapticTap, 80);
      break;
    case 'error':
      hapticTap();
      setTimeout(hapticTap, 80);
      setTimeout(hapticTap, 160);
      break;
    default:
      hapticTap();
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

// ===== Global Haptic on All Buttons & Links =====
document.addEventListener('click', function (e) {
  var target = e.target.closest('button, a, .project-link, .contact-links a, .interest-card');
  if (target) haptic('light');
}, true);

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

if (canvas) {
  var context = canvas.getContext('2d');
  var scoreDisplay = document.getElementById('scoreDisplay');
  var highScoreDisplay = document.getElementById('highScoreDisplay');
  var playAgainButton = document.getElementById('playAgainButton');
  var closeGameButton = document.getElementById('closeGameButton');
}

var score = 0;
var highScore = localStorage.getItem('snakeHighScore')
  ? parseInt(localStorage.getItem('snakeHighScore'), 10)
  : 0;
var snake = [];
var direction = { x: 1, y: 0 };
var food = {};
var gameInterval;
var cellSize = 20;

// Queue for haptics that need to fire from a user gesture context (iOS)
var pendingGameHaptic = null;

function startGame() {
  if (!canvas) return;

  document.body.style.overflow = 'hidden';
  if (nav) nav.style.display = 'none';

  score = 0;
  direction = { x: 1, y: 0 };

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var gridWidth = Math.floor(canvas.width / cellSize);
  var gridHeight = Math.floor(canvas.height / cellSize);

  var startX = Math.floor(gridWidth / 2);
  var startY = Math.floor(gridHeight / 2);
  snake = [{ x: startX, y: startY }];

  food = {
    x: Math.floor(Math.random() * gridWidth),
    y: Math.floor(Math.random() * gridHeight),
  };

  scoreDisplay.textContent = 'Score: ' + score;
  highScoreDisplay.textContent = 'High Score: ' + highScore;
  highScoreDisplay.style.display = 'block';

  document.getElementById('gameOverlay').style.display = 'block';
  canvas.style.display = 'block';
  scoreDisplay.style.display = 'block';

  playAgainButton.style.display = 'none';
  closeGameButton.style.display = 'none';

  clearInterval(gameInterval);
  gameInterval = setInterval(function () { updateGame(gridWidth, gridHeight); }, 100);

  haptic('medium');
}

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
    pendingGameHaptic = 'success';
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

function drawGame(gridWidth, gridHeight) {
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#4CAF50';
  snake.forEach(function (part) {
    context.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize);
  });

  context.fillStyle = '#FF5733';
  context.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
}

function endGame() {
  clearInterval(gameInterval);

  pendingGameHaptic = 'error';

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snakeHighScore', highScore);
  }
  highScoreDisplay.textContent = 'High Score: ' + highScore;

  playAgainButton.style.display = 'block';
  closeGameButton.style.display = 'block';

  document.getElementById('gameOverlay').style.display = 'flex';
}

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
if (canvas) {
  var touchStartX = 0;
  var touchStartY = 0;

  canvas.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();

    // Fire any queued game haptics within this user gesture
    if (pendingGameHaptic) {
      haptic(pendingGameHaptic);
      pendingGameHaptic = null;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();

    // Fire any queued game haptics within this user gesture
    if (pendingGameHaptic) {
      haptic(pendingGameHaptic);
      pendingGameHaptic = null;
    }

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

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    haptic('light');
  }, { passive: false });

  canvas.addEventListener('touchend', function () {
    // Fire any queued game haptics (e.g. game over on collision)
    if (pendingGameHaptic) {
      haptic(pendingGameHaptic);
      pendingGameHaptic = null;
    }
  });
}

function closeGame() {
  document.getElementById('gameOverlay').style.display = 'none';
  document.body.style.overflow = '';
  if (nav) nav.style.display = '';
  haptic('light');
}
