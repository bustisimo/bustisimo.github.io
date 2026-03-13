// ===== Haptic Feedback (Web-Haptics Style) =====
// PWM-modulated clicks for intensity simulation on iOS Safari

var TOGGLE_MIN = 16; // ms at intensity 1
var TOGGLE_MAX = 184; // range above min
var PWM_CYCLE = 20; // ms per modulation cycle

var HapticController = (function () {
  var hapticLabel = null;
  var hapticCheckbox = null;
  var rafId = null;

  function ensureDOM() {
    if (hapticLabel) return;

    var id = '__haptic-' + Math.random().toString(36).slice(2);

    hapticCheckbox = document.createElement('input');
    hapticCheckbox.type = 'checkbox';
    hapticCheckbox.setAttribute('switch', '');
    hapticCheckbox.id = id;
    hapticCheckbox.style.all = 'initial';
    hapticCheckbox.style.appearance = 'auto';
    // Keep in render tree (not display:none) so iOS toggle animation fires Taptic Engine
    hapticCheckbox.style.position = 'fixed';
    hapticCheckbox.style.bottom = '0';
    hapticCheckbox.style.left = '0';
    hapticCheckbox.style.opacity = '0';
    hapticCheckbox.style.pointerEvents = 'none';
    hapticCheckbox.style.zIndex = '-1';

    hapticLabel = document.createElement('label');
    hapticLabel.setAttribute('for', id);
    hapticLabel.style.position = 'fixed';
    hapticLabel.style.bottom = '0';
    hapticLabel.style.left = '0';
    hapticLabel.style.opacity = '0';
    hapticLabel.style.pointerEvents = 'none';
    hapticLabel.style.zIndex = '-1';

    hapticLabel.appendChild(hapticCheckbox);
    document.body.appendChild(hapticLabel);
  }

  function modulateVibration(duration, intensity) {
    if (intensity >= 1) return [duration];
    if (intensity <= 0) return [];

    var onTime = Math.max(1, Math.round(PWM_CYCLE * intensity));
    var offTime = PWM_CYCLE - onTime;
    var result = [];
    var remaining = duration;

    while (remaining >= PWM_CYCLE) {
      result.push(onTime);
      result.push(offTime);
      remaining -= PWM_CYCLE;
    }
    if (remaining > 0) {
      var remOn = Math.max(1, Math.round(remaining * intensity));
      result.push(remOn);
      var remOff = remaining - remOn;
      if (remOff > 0) result.push(remOff);
    }

    return result;
  }

  function toVibratePattern(vibrations, defaultIntensity) {
    var result = [];

    for (var i = 0; i < vibrations.length; i++) {
      var vib = vibrations[i];
      var intensity = Math.max(0, Math.min(1, vib.intensity !== undefined ? vib.intensity : defaultIntensity));
      var delay = vib.delay || 0;

      if (delay > 0) {
        if (result.length > 0 && result.length % 2 === 0) {
          result[result.length - 1] += delay;
        } else {
          if (result.length === 0) result.push(0);
          result.push(delay);
        }
      }

      var modulated = modulateVibration(vib.duration, intensity);

      if (modulated.length === 0) {
        if (result.length > 0 && result.length % 2 === 0) {
          result[result.length - 1] += vib.duration;
        } else if (vib.duration > 0) {
          result.push(0);
          result.push(vib.duration);
        }
        continue;
      }

      for (var j = 0; j < modulated.length; j++) {
        result.push(modulated[j]);
      }
    }

    return result;
  }

  function runPattern(vibrations, defaultIntensity, firstClickFired) {
    return new Promise(function (resolve) {
      ensureDOM();
      if (!hapticLabel) {
        resolve();
        return;
      }

      // Build phases
      var phases = [];
      var cumulative = 0;
      for (var i = 0; i < vibrations.length; i++) {
        var vib = vibrations[i];
        var intensity = Math.max(0, Math.min(1, vib.intensity !== undefined ? vib.intensity : defaultIntensity));
        var delay = vib.delay || 0;
        if (delay > 0) {
          cumulative += delay;
          phases.push({ end: cumulative, isOn: false, intensity: 0 });
        }
        cumulative += vib.duration;
        phases.push({ end: cumulative, isOn: true, intensity: intensity });
      }
      var totalDuration = cumulative;

      var startTime = 0;
      var lastToggleTime = -1;

      function loop(time) {
        if (startTime === 0) startTime = time;
        var elapsed = time - startTime;

        if (elapsed >= totalDuration) {
          rafId = null;
          resolve();
          return;
        }

        // Find current phase
        var phase = phases[0];
        for (var i = 0; i < phases.length; i++) {
          if (elapsed < phases[i].end) {
            phase = phases[i];
            break;
          }
        }

        if (phase.isOn) {
          var toggleInterval = TOGGLE_MIN + (1 - phase.intensity) * TOGGLE_MAX;

          if (lastToggleTime === -1) {
            lastToggleTime = time;
            if (!firstClickFired) {
              hapticLabel.click();
              firstClickFired = true;
            }
          } else if (time - lastToggleTime >= toggleInterval) {
            hapticLabel.click();
            lastToggleTime = time;
          }
        } else {
          lastToggleTime = -1;
        }

        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);
    });
  }

  return {
    trigger: function (input, options) {
      var defaultIntensity = options && options.intensity ? options.intensity : 0.5;
      var vibrations = [];

      if (typeof input === 'number') {
        vibrations = [{ duration: input }];
      } else if (Array.isArray(input)) {
        if (typeof input[0] === 'number') {
          for (var i = 0; i < input.length; i += 2) {
            vibrations.push({ duration: input[i], delay: i > 0 ? input[i - 1] : 0 });
          }
        } else {
          vibrations = input;
        }
      } else if (input && typeof input === 'object' && input.pattern) {
        vibrations = input.pattern;
      }

      if (vibrations.length === 0) return;

      // Apply default intensity to vibrations
      for (var i = 0; i < vibrations.length; i++) {
        if (vibrations[i].intensity === undefined) {
          vibrations[i].intensity = defaultIntensity;
        }
      }

      // Android: navigator.vibrate
      if (navigator.vibrate) {
        navigator.vibrate(toVibratePattern(vibrations, defaultIntensity));
      }

      // iOS Safari: toggle hidden switch checkbox to trigger Taptic Engine
      // Fire first click synchronously so it runs within user gesture context
      ensureDOM();
      if (!hapticLabel) return;

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      var firstDelay = vibrations[0].delay || 0;
      var firstClickFired = false;
      if (firstDelay === 0) {
        hapticLabel.click();
        firstClickFired = true;
      }

      return runPattern(vibrations, defaultIntensity, firstClickFired);
    },

    cancel: function () {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (navigator.vibrate) navigator.vibrate(0);
    }
  };
})();

function haptic(type) {
  switch (type) {
    case 'light':
      HapticController.trigger([{ duration: 20, intensity: 0.4 }]);
      break;
    case 'medium':
      HapticController.trigger([{ duration: 30, intensity: 0.7 }]);
      break;
    case 'heavy':
      HapticController.trigger([{ duration: 40, intensity: 0.9 }]);
      break;
    case 'success':
      HapticController.trigger([
        { duration: 20, intensity: 0.6 },
        { duration: 50, intensity: 0 },
        { duration: 20, intensity: 0.6 }
      ]);
      break;
    case 'error':
      HapticController.trigger([
        { duration: 40, intensity: 0.8 },
        { duration: 30, intensity: 0 },
        { duration: 40, intensity: 0.8 },
        { duration: 30, intensity: 0 },
        { duration: 40, intensity: 0.8 }
      ]);
      break;
    default:
      HapticController.trigger([{ duration: 20, intensity: 0.4 }]);
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
    haptic('success');
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

  haptic('error');

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

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    haptic('light');
  }, { passive: false });
}

function closeGame() {
  document.getElementById('gameOverlay').style.display = 'none';
  document.body.style.overflow = '';
  if (nav) nav.style.display = '';
  haptic('light');
}
