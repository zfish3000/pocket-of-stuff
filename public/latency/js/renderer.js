import { CONFIG } from './config.js';
import { getGoal, getStart, slicePathPoints, slicePathRange } from './paths.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.canvas.width = CONFIG.stageWidth;
    this.canvas.height = CONFIG.stageHeight;
  }

  // Size of one design-grid pixel in canvas pixels.
  get ui() {
    return this.canvas.width / CONFIG.designWidth;
  }

  clear() {
    this.context.fillStyle = '#071015';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawTrial({ path, version, displayedCursor, targetPosition, trial, elapsedMs, timeoutMs = CONFIG.trialTimeoutMs, progressPx = 0, fillSegments = [], fillColoring = 'solid', wallContact = false, totalTrials, position = null, waitingForStart = false, startPromptText, developerMode, diagnostics }) {
    this.clear();
    if (version?.pathStyle === 'walled' || version?.pathStyle === 'tracking') {
      this.drawCorridor(path, progressPx, wallContact, fillSegments, fillColoring, !waitingForStart);
      this.drawMarker(getStart(path), 'Start', '#7ee787');
      this.drawFinishLine(path);
    } else {
      this.drawPath(path);
      this.drawMarkers(path);
    }
    if (targetPosition) {
      this.drawTarget(targetPosition);
    }
    if (displayedCursor) {
      this.drawCursor(displayedCursor);
    }
    this.drawHud(trial, elapsedMs, totalTrials, timeoutMs, version, position, developerMode);
    if (waitingForStart) {
      this.drawStartPrompt(startPromptText, version?.goal);
    } else if (version?.goal) {
      this.drawGoalReminder(version.goal);
    }
    if (developerMode) {
      this.drawDeveloperPanel(diagnostics);
    }
  }

  // Draws a wide corridor with walls, a faint center line, and the finished part filled in.
  drawCorridor(path, progressPx, wallContact, fillSegments, fillColoring, started) {
    const ctx = this.context;
    const wallWidth = 6 * this.ui;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = wallContact ? '#ff8585' : '#3bd3b9';
    ctx.lineWidth = path.corridorWidth + wallWidth * 2;
    this.strokePolyline(path.points);
    ctx.strokeStyle = '#0d2129';
    ctx.lineWidth = path.corridorWidth;
    this.strokePolyline(path.points);
    if (started) {
      // The round end of the corridor behind Start fills in as soon as the trial begins.
      const firstColor = fillColoring === 'distance' ? centerOffsetColor(fillSegments[0]?.centerOffset ?? 0) : '#30547a';
      this.fillStartCap(path, firstColor);
    }
    // The fill has a flat front edge that stops at the cursor.
    ctx.lineCap = 'butt';
    if (fillColoring === 'distance') {
      // Each stretch is overlapped slightly with the one before it so no seams show on the bends.
      const overlap = 2 * this.ui;
      for (const segment of fillSegments) {
        ctx.strokeStyle = centerOffsetColor(segment.centerOffset);
        this.strokePolyline(slicePathRange(path, Math.max(0, segment.fromPx - overlap), segment.toPx));
      }
    } else if (progressPx > 0) {
      ctx.strokeStyle = '#30547a';
      this.strokePolyline(slicePathPoints(path, progressPx));
    }
    ctx.lineCap = 'round';
    // The center line is the target, so it stays clearly visible over the fill.
    ctx.setLineDash([12 * this.ui, 10 * this.ui]);
    ctx.strokeStyle = 'rgba(230, 250, 245, 0.75)';
    ctx.lineWidth = 3 * this.ui;
    this.strokePolyline(path.points);
    ctx.setLineDash([]);
  }

  fillStartCap(path, color) {
    const ctx = this.context;
    const start = getStart(path);
    const next = path.points[1];
    const forward = Math.atan2(next.y - start.y, next.x - start.x);
    // Overlap the straight fill by a hair so no seam shows where they meet.
    const seam = 0.02;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(start.x, start.y, path.corridorWidth / 2, forward + Math.PI / 2 - seam, forward + (Math.PI * 3) / 2 + seam);
    ctx.closePath();
    ctx.fill();
  }

  drawFinishLine(path) {
    const ctx = this.context;
    const goal = getGoal(path);
    const before = path.points[path.points.length - 2];
    const length = Math.hypot(goal.x - before.x, goal.y - before.y);
    const normal = { x: -(goal.y - before.y) / length, y: (goal.x - before.x) / length };
    const half = path.corridorWidth / 2;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#ffdf6e';
    ctx.lineWidth = 8 * this.ui;
    ctx.beginPath();
    ctx.moveTo(goal.x + normal.x * half, goal.y + normal.y * half);
    ctx.lineTo(goal.x - normal.x * half, goal.y - normal.y * half);
    ctx.stroke();
    ctx.fillStyle = '#ffdf6e';
    ctx.font = `${16 * this.ui}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Finish', goal.x, goal.y - half - 12 * this.ui);
  }

  drawPath(path) {
    const ctx = this.context;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(59, 211, 185, 0.20)';
    ctx.lineWidth = path.corridorWidth;
    this.strokePolyline(path.points);
    ctx.strokeStyle = 'rgba(179, 239, 227, 0.75)';
    ctx.lineWidth = 3 * this.ui;
    this.strokePolyline(path.points);
  }

  strokePolyline(points) {
    const ctx = this.context;
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x, points[index].y);
    }
    ctx.stroke();
  }

  drawMarkers(path) {
    this.drawMarker(getStart(path), 'Start', '#7ee787');
    this.drawMarker(getGoal(path), 'Goal', '#ffdf6e');
  }

  drawMarker(point, label, color) {
    const ctx = this.context;
    const radius = CONFIG.goalRadiusPx * this.ui;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#061014';
    ctx.font = `${13 * this.ui}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, point.x, point.y);
  }

  drawCursor(cursor) {
    const ctx = this.context;
    ctx.fillStyle = '#69a7ff';
    ctx.strokeStyle = '#d7e8ff';
    ctx.lineWidth = 2 * this.ui;
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, CONFIG.pointerRadiusPx * this.ui, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawTarget(target) {
    const ctx = this.context;
    ctx.fillStyle = '#ffdf6e';
    ctx.strokeStyle = '#17120a';
    ctx.lineWidth = 3 * this.ui;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 14 * this.ui, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawHud(trial, elapsedMs, totalTrials, timeoutMs, version, position = null, developerMode = false) {
    const ctx = this.context;
    const barWidth = this.canvas.width * Math.min(1, elapsedMs / timeoutMs);
    ctx.fillStyle = 'rgba(105, 167, 255, 0.35)';
    ctx.fillRect(0, 0, barWidth, 6 * this.ui);
    ctx.fillStyle = '#d8e6ee';
    ctx.font = `${18 * this.ui}px system-ui`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const counter = position
      ? `${position.isPractice ? 'Practice' : 'Trial'} ${position.number} of ${position.total}`
      : `Trial ${trial.trialNumber} of ${totalTrials}`;
    ctx.fillText(counter, 22 * this.ui, 22 * this.ui);
    if (position?.isPractice) {
      // A practice banner replaces the version label so no one mistakes practice for a scored trial.
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffdf6e';
      ctx.font = `700 ${22 * this.ui}px system-ui`;
      ctx.fillText('PRACTICE: not scored', this.canvas.width / 2, 20 * this.ui);
      ctx.font = `${18 * this.ui}px system-ui`;
      ctx.fillStyle = '#d8e6ee';
    } else if (version && developerMode) {
      // Participants never see which interface version or condition they are in.
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9db4bd';
      ctx.fillText(version.label, this.canvas.width / 2, 22 * this.ui);
      ctx.fillStyle = '#d8e6ee';
    }
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.max(0, (timeoutMs - elapsedMs) / 1000).toFixed(1)} s`, this.canvas.width - 22 * this.ui, 22 * this.ui);
  }

  drawDeveloperPanel(diagnostics) {
    const ctx = this.context;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    const lines = [
      `Latency: ${diagnostics.latencyMs} ms`,
      `Actual age: ${diagnostics.actualAgeMs ?? '-'} ms`,
      `Condition: ${diagnostics.phase} / ${diagnostics.difficulty}`,
      `Path: ${diagnostics.pathId}`,
      `Error: ${diagnostics.trackingErrorPx ?? diagnostics.pathErrorPx ?? '-'} px`,
    ];
    if (diagnostics.speed != null) lines.push(`Speed: ${diagnostics.speed} px/s`);
    if (diagnostics.wallHits != null) lines.push(`Wall hits: ${diagnostics.wallHits}`);
    if (diagnostics.progressPercent != null) lines.push(`Progress: ${diagnostics.progressPercent}%`);
    ctx.fillRect(18 * this.ui, 56 * this.ui, 310 * this.ui, (20 + lines.length * 18) * this.ui);
    ctx.fillStyle = '#a8f0dd';
    ctx.font = `${13 * this.ui}px ui-monospace, monospace`;
    ctx.textAlign = 'left';
    lines.forEach((line, index) => {
      ctx.fillText(line, 32 * this.ui, (72 + index * 18) * this.ui);
    });
  }

  // Before each trial, the goal is shown above the click prompt in a highlighted box.
  drawStartPrompt(message = 'Click to begin this trial', goal = null) {
    const ctx = this.context;
    const centerX = this.canvas.width / 2;
    // The box sits above the highest point of every path, so it never hides part of the corridor.
    const top = goal ? 58 : 72;
    const height = goal ? 96 : 58;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(centerX - 260 * this.ui, top * this.ui, 520 * this.ui, height * this.ui);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (goal) {
      ctx.strokeStyle = '#ffdf6e';
      ctx.lineWidth = 2 * this.ui;
      ctx.strokeRect(centerX - 260 * this.ui, top * this.ui, 520 * this.ui, height * this.ui);
      ctx.fillStyle = '#ffdf6e';
      ctx.font = `700 ${22 * this.ui}px system-ui`;
      ctx.fillText(`Goal: ${goal}`, centerX, 88 * this.ui);
    }
    ctx.fillStyle = '#e5f1f5';
    ctx.font = `${18 * this.ui}px system-ui`;
    ctx.fillText(message, centerX, (goal ? 128 : 101) * this.ui);
  }

  // During a trial, a quiet reminder of the goal stays along the bottom edge.
  drawGoalReminder(goal) {
    const ctx = this.context;
    ctx.fillStyle = 'rgba(255, 223, 110, 0.85)';
    ctx.font = `600 ${18 * this.ui}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Goal: ${goal}`, this.canvas.width / 2, this.canvas.height - 22 * this.ui);
  }

  drawResultsChart(canvas, summaries) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.clientWidth * devicePixelRatio;
    const height = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const normalizedValue = (row) => (typeof row.normalized_mean_progress_error === 'number'
      ? row.normalized_mean_progress_error
      : row.normalized_rms_tracking_error ?? row.normalized_rms_error);
    const rows = summaries.filter((row) => {
      const value = normalizedValue(row);
      return row.phase === 'experimental'
        && value !== ''
        && value != null
        && Number.isFinite(Number(value));
    });
    if (rows.length === 0) {
      return;
    }
    const latencies = [...new Set(rows.map((row) => row.latency_ms))].sort((a, b) => a - b);
    const maxY = Math.max(2, ...rows.map((row) => Number(normalizedValue(row)))) * 1.1;
    const pad = 46 * devicePixelRatio;
    ctx.strokeStyle = '#707070';
    ctx.lineWidth = 1 * devicePixelRatio;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, height - pad);
    ctx.lineTo(width - pad, height - pad);
    ctx.stroke();

    // Dashed line at the meaningful-decline ratio.
    const declineY = height - pad - (CONFIG.declineRatio / maxY) * (height - pad * 2);
    ctx.strokeStyle = '#ffdf6e';
    ctx.setLineDash([8 * devicePixelRatio, 6 * devicePixelRatio]);
    ctx.beginPath();
    ctx.moveTo(pad, declineY);
    ctx.lineTo(width - pad, declineY);
    ctx.stroke();
    ctx.setLineDash([]);

    const colors = { standard: '#fff', easy: '#fff', medium: '#aaa', hard: '#707070' };
    const lineDashes = {
      standard: [],
      easy: [],
      medium: [10 * devicePixelRatio, 6 * devicePixelRatio],
      hard: [2 * devicePixelRatio, 6 * devicePixelRatio],
    };
    const difficulties = [...new Set(rows.map((row) => row.difficulty))];
    for (const difficulty of difficulties) {
      const values = latencies.map((latency) => {
        const matches = rows.filter((row) => row.difficulty === difficulty && row.latency_ms === latency);
        const avg = matches.reduce((sum, row) => sum + Number(normalizedValue(row)), 0) / matches.length;
        return { latency, value: avg };
      }).filter((item) => Number.isFinite(item.value));
      ctx.strokeStyle = colors[difficulty];
      ctx.fillStyle = colors[difficulty];
      ctx.setLineDash(lineDashes[difficulty]);
      ctx.beginPath();
      values.forEach((item, index) => {
        const latencyIndex = latencies.indexOf(item.latency);
        const xRatio = latencies.length === 1 ? 0.5 : latencyIndex / (latencies.length - 1);
        const x = pad + xRatio * (width - pad * 2);
        const y = height - pad - (item.value / maxY) * (height - pad * 2);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        ctx.moveTo(x, y);
        ctx.arc(x, y, 4 * devicePixelRatio, 0, Math.PI * 2);
        ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}

// Green on the center line, yellow halfway out, red against the wall.
export function centerOffsetColor(centerOffset) {
  const hue = 130 * (1 - Math.min(1, Math.max(0, centerOffset)));
  return `hsl(${hue.toFixed(0)}, 55%, 34%)`;
}
