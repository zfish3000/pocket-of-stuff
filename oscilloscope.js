const canvas = document.getElementById('oscilloscope');
const ctx = canvas.getContext('2d');

const fileInput = document.getElementById('audioFile');
const playPauseButton = document.getElementById('playPause');
const seekSlider = document.getElementById('seek');
const timeDisplay = document.getElementById('timeDisplay');
const colorPicker = document.getElementById('colorPicker');
const modeSelect = document.getElementById('modeSelect');



function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.getElementById('controls').offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let audioCtx;
let audioElement;
let analyserLeft, analyserRight;
let animationId;
let isPlaying = false;
let lineColor = colorPicker.value;
let mode = modeSelect.value;

colorPicker.addEventListener('input', () => {
  lineColor = colorPicker.value;
});

modeSelect.addEventListener('change', () => {
  mode = modeSelect.value;
});


function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  if (audioCtx) {
    audioCtx.close();
    cancelAnimationFrame(animationId);
  }
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
  }

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioElement = new Audio(URL.createObjectURL(file));
  audioElement.crossOrigin = 'anonymous';
  audioElement.controls = false;
  audioElement.load();

  const track = audioCtx.createMediaElementSource(audioElement);

  const splitter = audioCtx.createChannelSplitter(2);
  analyserLeft = audioCtx.createAnalyser();
  analyserRight = audioCtx.createAnalyser();

  analyserLeft.fftSize = 1024;
  analyserRight.fftSize = 1024;

  const bufferLength = analyserLeft.fftSize;
  const leftData = new Float32Array(bufferLength);
  const rightData = new Float32Array(bufferLength);

  track.connect(splitter);
  splitter.connect(analyserLeft, 0);
  splitter.connect(analyserRight, 1);
  track.connect(audioCtx.destination);

  playPauseButton.disabled = false;
  playPauseButton.textContent = 'Play';


  /*function draw() {
    animationId = requestAnimationFrame(draw);

    analyserLeft.getFloatTimeDomainData(leftData);
    analyserRight.getFloatTimeDomainData(rightData);

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 2;

    if (mode === 'xy') {
      // XY Oscilloscope mode: left channel X, right channel Y
      for (let i = 0; i < bufferLength; i++) {
        const x = centerX + leftData[i] * scale * 0.8;
        const y = centerY - rightData[i] * scale * 0.8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else if (mode === 'waveform') {
      // Waveform mode: left channel amplitude over time
      for (let i = 0; i < bufferLength; i++) {
        const x = (i / bufferLength) * width;
        const y = centerY - leftData[i] * centerY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Update time and seek slider
    const duration = audioElement.duration || 0;
    const currentTime = audioElement.currentTime || 0;
    seekSlider.max = duration;
    seekSlider.value = currentTime;
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  }*/

  function draw() {
  animationId = requestAnimationFrame(draw);

  analyserLeft.getFloatTimeDomainData(leftData);
  analyserRight.getFloatTimeDomainData(rightData);

  // Draw semi-transparent black overlay for persistence effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / 2;

  if (mode === 'xy') {
    for (let i = 0; i < bufferLength; i++) {
      const x = centerX + leftData[i] * scale * 0.8;
      const y = centerY - rightData[i] * scale * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  } else if (mode === 'waveform') {
    for (let i = 0; i < bufferLength; i++) {
      const x = (i / bufferLength) * width;
      const y = centerY - leftData[i] * centerY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }

  ctx.stroke();

  // Update time and slider
  const duration = audioElement.duration || 0;
  const currentTime = audioElement.currentTime || 0;
  seekSlider.max = duration;
  seekSlider.value = currentTime;
  timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
}


  playPauseButton.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (isPlaying) {
      audioElement.pause();
      playPauseButton.textContent = 'Play';
      isPlaying = false;
    } else {
      audioElement.play();
      playPauseButton.textContent = 'Pause';
      isPlaying = true;
    }
  };

  seekSlider.oninput = () => {
    audioElement.currentTime = seekSlider.value;
  };

  audioElement.onended = () => {
    playPauseButton.textContent = 'Play';
    isPlaying = false;
  };

  audioElement.onplay = () => {
    isPlaying = true;
    playPauseButton.textContent = 'Pause';
    draw();
  };

  audioElement.onpause = () => {
    isPlaying = false;
    playPauseButton.textContent = 'Play';
  };
});
