(function () {
  const canvas = document.querySelector("#backgroundCanvas");
  const video = document.querySelector("#backgroundSource");

  if (!canvas || !video) return;

  const context = canvas.getContext("2d", { alpha: true });
  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  const cellSize = 12;
  const brightnessFloor = 34;
  const verticalTrim = 0.12;
  const hoverRadius = 96;
  let width = 0;
  let height = 0;
  let columns = 0;
  let rows = 0;
  let pointer = { x: 0, y: 0, active: false };
  let hoverAmounts = new Float32Array();

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    columns = Math.ceil(width / cellSize);
    rows = Math.ceil(height / cellSize);
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    sampleCanvas.width = columns;
    sampleCanvas.height = rows;
    hoverAmounts = new Float32Array(columns * rows);
  }

  function updateHoverAmount(index, x, y) {
    const target = pointer.active && Math.hypot(x - pointer.x, y - pointer.y) <= hoverRadius ? 1 : 0;
    hoverAmounts[index] += (target - hoverAmounts[index]) * 0.18;
    return hoverAmounts[index];
  }

  function draw() {
    if (video.readyState >= 2 && columns && rows) {
      const videoRatio = video.videoWidth / video.videoHeight;
      const canvasRatio = columns / rows;
      let sourceWidth = video.videoWidth;
      let sourceHeight = video.videoHeight * (1 - verticalTrim * 2);
      let sourceX = 0;
      let sourceY = video.videoHeight * verticalTrim;

      const trimmedRatio = sourceWidth / sourceHeight;

      if (trimmedRatio > canvasRatio) {
        sourceWidth = sourceHeight * canvasRatio;
        sourceX = (video.videoWidth - sourceWidth) / 2;
      } else {
        sourceHeight = video.videoWidth / canvasRatio;
        sourceY = (video.videoHeight - sourceHeight) / 2;
      }

      sampleContext.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, columns, rows);
      const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
      context.clearRect(0, 0, width, height);

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const index = (row * columns + column) * 4;
          const cellIndex = row * columns + column;
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const brightness = red * 0.299 + green * 0.587 + blue * 0.114;
          const centerX = column * cellSize + cellSize / 2;
          const centerY = row * cellSize + cellSize / 2;
          const hoverAmount = updateHoverAmount(cellIndex, centerX, centerY);
          const baseAmount = Math.max(0, (brightness - brightnessFloor) / (255 - brightnessFloor));
          const amount = baseAmount + (1 - baseAmount) * hoverAmount;
          if (amount <= 0.02) continue;

          const size = Math.min(cellSize, Math.round(cellSize * amount));
          const x = column * cellSize + (cellSize - size) / 2;
          const y = row * cellSize + (cellSize - size) / 2;
          const drawRed = Math.round(255 + (red - 255) * hoverAmount);
          const drawGreen = Math.round(255 + (green - 255) * hoverAmount);
          const drawBlue = Math.round(255 + (blue - 255) * hoverAmount);
          context.fillStyle = `rgb(${drawRed}, ${drawGreen}, ${drawBlue})`;
          context.fillRect(x, y, size, size);
        }
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointer = { x: event.clientX, y: event.clientY, active: true };
  });
  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  window.addEventListener("blur", () => {
    pointer.active = false;
  });
  video.play().catch(() => {});
  requestAnimationFrame(draw);
})();
