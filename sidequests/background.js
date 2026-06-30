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
  let width = 0;
  let height = 0;
  let columns = 0;
  let rows = 0;

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
      context.fillStyle = "#ffffff";

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const index = (row * columns + column) * 4;
          const brightness = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
          const amount = Math.max(0, (brightness - brightnessFloor) / (255 - brightnessFloor));
          if (amount <= 0.02) continue;

          const size = Math.min(cellSize, Math.round(cellSize * amount));
          const x = column * cellSize + (cellSize - size) / 2;
          const y = row * cellSize + (cellSize - size) / 2;
          context.fillRect(x, y, size, size);
        }
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  video.play().catch(() => {});
  requestAnimationFrame(draw);
})();
