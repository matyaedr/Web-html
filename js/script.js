const audio = document.querySelector('#audio');
const playButton = document.querySelector('.play');
const progress = document.querySelector('.progress');
const progressFill = document.querySelector('.progress-fill');
const time = document.querySelector('.time');
const visualizer = document.querySelector('#visualizer');
const visualizerContext = visualizer.getContext('2d');
const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--acid').trim();
const gameCanvas = document.querySelector('#game-canvas');
const gameContext = gameCanvas.getContext('2d');
const retryButton = document.querySelector('#retry-button');
const scoreElement = document.querySelector('#score');
let audioContext;
let analyser;
let audioSource;
let visualizerFrame;
let frequencyData;
let gameLastTime = 0;
let gameElapsed = 0;
let gameNextDrop = 0;
let gameScore = 0;
let gameOver = false;
let playerPosition = .5;
const fallingObjects = [];
const pressedKeys = new Set();

const resizeVisualizer = () => {
  const pixelRatio = window.devicePixelRatio || 1;
  visualizer.width = visualizer.clientWidth * pixelRatio;
  visualizer.height = visualizer.clientHeight * pixelRatio;
  visualizerContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
};

const drawVisualizer = () => {
  const width = visualizer.clientWidth;
  const height = visualizer.clientHeight;
  visualizerContext.clearRect(0, 0, width, height);

  if (analyser && !audio.paused) {
    analyser.getByteFrequencyData(frequencyData);
    const barWidth = width / frequencyData.length;
    frequencyData.forEach((frequency, index) => {
      const barHeight = Math.max(2, frequency / 255 * height);
      visualizerContext.globalAlpha = .3 + frequency / 255 * .7;
      visualizerContext.fillStyle = accentColor;
      visualizerContext.fillRect(index * barWidth, height - barHeight, Math.max(1, barWidth - 3), barHeight);
    });
    visualizerContext.globalAlpha = 1;
  }

  visualizerFrame = requestAnimationFrame(drawVisualizer);
};

const resizeGame = () => {
  const pixelRatio = window.devicePixelRatio || 1;
  gameCanvas.width = gameCanvas.clientWidth * pixelRatio;
  gameCanvas.height = gameCanvas.clientHeight * pixelRatio;
  gameContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
};

const resetGame = () => {
  fallingObjects.length = 0;
  gameScore = 0;
  gameOver = false;
  playerPosition = .5;
  gameElapsed = 0;
  gameNextDrop = 0;
  retryButton.hidden = true;
  scoreElement.textContent = '000';
};

const getMusicEnergy = () => {
  if (!analyser || !frequencyData) return .35 + Math.sin(audio.currentTime * 8) * .15;
  analyser.getByteFrequencyData(frequencyData);
  const total = frequencyData.reduce((sum, value) => sum + value, 0);
  return total / frequencyData.length / 255;
};

const spawnObject = (energy) => {
  fallingObjects.push({ x: Math.random(), y: -20, size: 10 + Math.random() * 8, speed: 105 + energy * 150 + Math.random() * 35 });
};

const drawGame = () => {
  const width = gameCanvas.clientWidth;
  const height = gameCanvas.clientHeight;
  gameContext.clearRect(0, 0, width, height);
  gameContext.fillStyle = '#252523';
  gameContext.fillRect(0, height - 2, width, 2);
  fallingObjects.forEach((object) => {
    gameContext.fillStyle = accentColor;
    gameContext.globalAlpha = .75;
    gameContext.fillRect(object.x * width - object.size / 2, object.y, object.size, object.size);
  });
  gameContext.globalAlpha = 1;

  const playerX = playerPosition * width;
  const playerY = height - 28;
  gameContext.fillStyle = '#fffaf2';
  gameContext.beginPath();
  gameContext.arc(playerX, playerY - 13, 5, 0, Math.PI * 2);
  gameContext.fill();
  gameContext.fillRect(playerX - 2, playerY - 7, 4, 13);
  gameContext.fillRect(playerX - 10, playerY - 4, 20, 3);
  gameContext.fillRect(playerX - 7, playerY + 6, 3, 10);
  gameContext.fillRect(playerX + 4, playerY + 6, 3, 10);

  if (gameOver) {
    gameContext.fillStyle = '#aaa9a2';
    gameContext.font = '11px DM Mono, monospace';
    gameContext.textAlign = 'center';
    gameContext.fillText('ZACHYCENO - SPUST ZNOVU', width / 2, height / 2);
  }
};

const updateGame = (timestamp) => {
  const delta = Math.min((timestamp - gameLastTime) / 1000, .05);
  gameLastTime = timestamp;
  if (!audio.paused && !gameOver) {
    gameElapsed += delta;
    const energy = getMusicEnergy();
    while (gameElapsed >= gameNextDrop) {
      spawnObject(energy);
      if (Math.random() > .25) spawnObject(energy);
      gameNextDrop += .5;
    }
    const direction = (pressedKeys.has('a') || pressedKeys.has('arrowleft') ? -1 : 0) + (pressedKeys.has('d') || pressedKeys.has('arrowright') ? 1 : 0);
    playerPosition = Math.max(.04, Math.min(.96, playerPosition + direction * delta * .55));
    const playerX = playerPosition * gameCanvas.clientWidth;
    fallingObjects.forEach((object) => { object.y += object.speed * delta; });
    for (let index = fallingObjects.length - 1; index >= 0; index -= 1) {
      const object = fallingObjects[index];
      const objectX = object.x * gameCanvas.clientWidth;
      if (object.y > gameCanvas.clientHeight) {
        fallingObjects.splice(index, 1);
        gameScore += 1;
        scoreElement.textContent = String(gameScore).padStart(3, '0');
      } else if (Math.abs(objectX - playerX) < object.size / 2 + 10 && object.y + object.size > gameCanvas.clientHeight - 45) {
        gameScore = 0;
        scoreElement.textContent = '000';
        gameOver = true;
        retryButton.hidden = false;
      }
    }
  }
  drawGame();
  requestAnimationFrame(updateGame);
};

const prepareVisualizer = () => {
  if (audioContext) {
    audioContext.resume();
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioContext = new AudioContextClass();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  audioSource = audioContext.createMediaElementSource(audio);
  audioSource.connect(analyser);
  analyser.connect(audioContext.destination);
};

resizeVisualizer();
drawVisualizer();
resizeGame();
resetGame();
gameLastTime = performance.now();
requestAnimationFrame(updateGame);
window.addEventListener('resize', () => { resizeVisualizer(); resizeGame(); });
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (!['a', 'd', 'arrowleft', 'arrowright'].includes(key)) return;
  event.preventDefault();
  pressedKeys.add(key);
});
window.addEventListener('keyup', (event) => pressedKeys.delete(event.key.toLowerCase()));
retryButton.addEventListener('click', () => {
  resetGame();
  gameLastTime = performance.now();
});

const formatTime = (seconds) => Number.isFinite(seconds)
  ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
  : '00:00';

const updatePlayer = () => {
  const percentage = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
  progressFill.style.width = `${percentage}%`;
  progress.setAttribute('aria-valuenow', Math.round(percentage));
  time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
};

const seek = (clientX) => {
  if (!audio.duration) return;
  const position = (clientX - progress.getBoundingClientRect().left) / progress.offsetWidth;
  audio.currentTime = Math.max(0, Math.min(1, position)) * audio.duration;
};

playButton.addEventListener('click', () => {
  if (audio.paused) {
    prepareVisualizer();
    audio.play().catch(() => {});
  }
  else audio.pause();
});

audio.addEventListener('loadedmetadata', updatePlayer);
audio.addEventListener('timeupdate', updatePlayer);
audio.addEventListener('play', () => {
  if (gameOver) resetGame();
  gameLastTime = performance.now();
  playButton.setAttribute('aria-pressed', 'true');
  playButton.setAttribute('aria-label', 'Pozastavit beat');
  playButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"></path></svg>';
});
audio.addEventListener('pause', () => {
  playButton.setAttribute('aria-pressed', 'false');
  playButton.setAttribute('aria-label', 'Přehrát beat');
  playButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';
});
audio.addEventListener('ended', updatePlayer);
progress.addEventListener('click', (event) => seek(event.clientX));
progress.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  if (!audio.duration) return;
  if (event.key === 'Home') audio.currentTime = 0;
  else if (event.key === 'End') audio.currentTime = audio.duration;
  else audio.currentTime += event.key === 'ArrowRight' ? 5 : -5;
  updatePlayer();
});
