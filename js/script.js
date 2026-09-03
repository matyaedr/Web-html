const audio = document.querySelector('#audio');
const playButton = document.querySelector('.play');
const progress = document.querySelector('.progress');
const progressFill = document.querySelector('.progress-fill');
const time = document.querySelector('.time');

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
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
});

audio.addEventListener('loadedmetadata', updatePlayer);
audio.addEventListener('timeupdate', updatePlayer);
audio.addEventListener('play', () => {
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
