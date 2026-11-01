import { CONFIG } from './config.js';

const MATCHED_PATH_DEFINITIONS = [
  {
    id: 'matched-a',
    difficulty: 'standard',
    corridorWidth: 64,
    matchedGeometry: {
      start: [120, 540],
      straightLengths: [200, 220, 200, 240, 210, 230, 200],
      turnAnglesDeg: [15, -20, -18, 22, 16, -19],
      turnRadius: 90,
      samplesPerTurn: 40,
    },
  },
  {
    id: 'matched-b',
    difficulty: 'standard',
    corridorWidth: 64,
    matchedGeometry: {
      start: [120, 540],
      straightLengths: [210, 200, 240, 200, 230, 200, 220],
      turnAnglesDeg: [-18, 22, 16, -20, -19, 15],
      turnRadius: 90,
      samplesPerTurn: 40,
    },
  },
];

// Practice paths are mirror images of the matched paths: the same turns in the opposite directions.
// Participants learn the controls on the same kind of path without rehearsing the measured paths.
const PRACTICE_PATH_DEFINITIONS = MATCHED_PATH_DEFINITIONS.map((path) => ({
  id: path.id.replace('matched', 'practice'),
  difficulty: 'practice',
  corridorWidth: path.corridorWidth,
  matchedGeometry: {
    ...path.matchedGeometry,
    turnAnglesDeg: path.matchedGeometry.turnAnglesDeg.map((angle) => -angle),
  },
}));

const LEGACY_MATCHED_PATH_DEFINITIONS = [
  {
    id: 'matched-a',
    difficulty: 'standard',
    corridorWidth: 64,
    matchedGeometry: {
      start: [120, 540],
      straightLengths: [200, 220, 200, 240, 210, 230, 200],
      turnAnglesDeg: [10, -14, -12, 16, 11, -13],
      turnRadius: 90,
      samplesPerTurn: 24,
    },
  },
  {
    id: 'matched-b',
    difficulty: 'standard',
    corridorWidth: 64,
    matchedGeometry: {
      start: [120, 540],
      straightLengths: [210, 200, 240, 200, 230, 200, 220],
      turnAnglesDeg: [-12, 16, 11, -14, -13, 10],
      turnRadius: 90,
      samplesPerTurn: 24,
    },
  },
];

for (const path of [...MATCHED_PATH_DEFINITIONS, ...PRACTICE_PATH_DEFINITIONS, ...LEGACY_MATCHED_PATH_DEFINITIONS]) {
  path.points = buildMatchedPoints(path.matchedGeometry, 1);
}

export const PATHS = [
  {
    id: 'easy-a',
    difficulty: 'easy',
    corridorWidth: 92,
    points: [[150, 540], [360, 470], [620, 585], [890, 505], [1170, 555], [1430, 500], [1690, 540]],
  },
  {
    id: 'easy-b',
    difficulty: 'easy',
    corridorWidth: 92,
    points: [[150, 505], [430, 565], [690, 495], [950, 560], [1210, 500], [1460, 560], [1690, 520]],
  },
  {
    id: 'easy-c',
    difficulty: 'easy',
    corridorWidth: 92,
    points: [[150, 570], [390, 530], [640, 515], [910, 565], [1190, 530], [1450, 520], [1690, 560]],
  },
  {
    id: 'medium-a',
    difficulty: 'medium',
    corridorWidth: 64,
    points: [[150, 555], [330, 430], [560, 655], [790, 470], [1030, 620], [1300, 450], [1690, 555]],
  },
  {
    id: 'medium-b',
    difficulty: 'medium',
    corridorWidth: 64,
    points: [[150, 480], [390, 635], [620, 455], [850, 570], [1100, 420], [1360, 650], [1690, 500]],
  },
  {
    id: 'medium-c',
    difficulty: 'medium',
    corridorWidth: 64,
    points: [[150, 585], [340, 520], [520, 395], [760, 635], [1040, 455], [1320, 625], [1690, 475]],
  },
  {
    id: 'hard-a',
    difficulty: 'hard',
    corridorWidth: 42,
    points: [[150, 540], [300, 380], [470, 690], [650, 405], [840, 675], [1050, 390], [1280, 690], [1490, 430], [1690, 560]],
  },
  {
    id: 'hard-b',
    difficulty: 'hard',
    corridorWidth: 42,
    points: [[150, 475], [330, 670], [485, 390], [700, 625], [880, 410], [1090, 650], [1310, 380], [1510, 670], [1690, 505]],
  },
  {
    id: 'hard-c',
    difficulty: 'hard',
    corridorWidth: 42,
    points: [[150, 590], [310, 430], [510, 615], [670, 365], [900, 705], [1110, 420], [1300, 650], [1500, 400], [1690, 555]],
  },
  ...MATCHED_PATH_DEFINITIONS,
  ...PRACTICE_PATH_DEFINITIONS,
];

export function getPathsByDifficulty(difficulty) {
  return PATHS.filter((path) => path.difficulty === difficulty);
}

export function getPathById(pathId, configVersion = CONFIG.configVersion) {
  if (configVersion === '2026-11-01-matched-paths') {
    const legacyPath = LEGACY_MATCHED_PATH_DEFINITIONS.find((path) => path.id === pathId);
    if (legacyPath) return legacyPath;
  }
  return PATHS.find((path) => path.id === pathId);
}

export function getMatchedPaths() {
  return PATHS.filter((path) => path.difficulty === 'standard');
}

export function getPracticePaths() {
  return PATHS.filter((path) => path.difficulty === 'practice');
}

// Changes a path's shape before it is scaled to the canvas.
// bendScale stretches each point's distance from the middle of the screen, so the path bends more.
// smooth replaces every corner with a curve gentle enough that the corridor walls never fold over.
export function shapePath(path, { bendScale = 1, smooth = false } = {}) {
  if (path.matchedGeometry) {
    return { ...path, points: buildMatchedPoints(path.matchedGeometry, bendScale) };
  }
  const middle = CONFIG.designHeight / 2;
  let points = path.points.map(([x, y]) => [x, middle + (y - middle) * bendScale]);
  if (smooth) {
    points = smoothPoints(points, (path.corridorWidth / 2) * 1.15);
  }
  return { ...path, points };
}

function buildMatchedPoints({ start, straightLengths, turnAnglesDeg, turnRadius, samplesPerTurn }, bendScale) {
  let [x, y] = start;
  let heading = 0;
  const points = [[x, y]];

  for (let index = 0; index < straightLengths.length; index += 1) {
    x += straightLengths[index] * Math.cos(heading);
    y += straightLengths[index] * Math.sin(heading);
    points.push([x, y]);

    if (index >= turnAnglesDeg.length) continue;
    const turn = turnAnglesDeg[index] * bendScale * Math.PI / 180;
    const direction = Math.sign(turn);
    const startX = x;
    const startY = y;
    for (let sample = 1; sample <= samplesPerTurn; sample += 1) {
      const sampleTurn = turn * sample / samplesPerTurn;
      points.push([
        startX + direction * turnRadius * (Math.sin(heading + sampleTurn) - Math.sin(heading)),
        startY - direction * turnRadius * (Math.cos(heading + sampleTurn) - Math.cos(heading)),
      ]);
    }
    x = points.at(-1)[0];
    y = points.at(-1)[1];
    heading += turn;
  }

  return points;
}

// Rounds every corner, then keeps easing the curve until its tightest bend has at least minRadius.
export function smoothPoints(points, minRadius, spacing = 10, maxPasses = 5000) {
  let dense = resamplePoints(smoothCorners(points), spacing);
  for (let pass = 0; pass < maxPasses && tightestRadius(dense) < minRadius; pass += 1) {
    dense = relaxPoints(dense);
  }
  return dense;
}

// Rounds each corner with a quadratic curve that runs from the middle of the segment before it
// to the middle of the segment after it. Start and Goal stay where they are.
export function smoothCorners(points, samplesPerCorner = 24) {
  const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const smoothed = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    const from = midpoint(points[index - 1], points[index]);
    const corner = points[index];
    const to = midpoint(points[index], points[index + 1]);
    for (let step = 0; step <= samplesPerCorner; step += 1) {
      const t = step / samplesPerCorner;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      smoothed.push([a * from[0] + b * corner[0] + c * to[0], a * from[1] + b * corner[1] + c * to[1]]);
    }
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
}

// Returns the radius of the tightest bend, measured through each set of three neighboring points.
export function tightestRadius(points) {
  let tightest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length - 1; index += 1) {
    const [a, b, c] = [points[index - 1], points[index], points[index + 1]];
    const twiceArea = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    if (twiceArea < 1e-9) continue;
    const sides = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]) * Math.hypot(a[0] - c[0], a[1] - c[1]);
    tightest = Math.min(tightest, sides / (2 * twiceArea));
  }
  return tightest;
}

// Places points at an even spacing along the line.
function resamplePoints(points, spacing) {
  const resampled = [points[0]];
  let carried = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const [start, end] = [points[index], points[index + 1]];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    let along = spacing - carried;
    while (along < length) {
      const ratio = along / length;
      resampled.push([start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio]);
      along += spacing;
    }
    carried = length - (along - spacing);
  }
  resampled.push(points[points.length - 1]);
  return resampled;
}

// Moves each inner point a little toward its neighbors, which widens tight bends. Start and Goal stay fixed.
function relaxPoints(points) {
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point;
    const [before, after] = [points[index - 1], points[index + 1]];
    return [(before[0] + 2 * point[0] + after[0]) / 4, (before[1] + 2 * point[1] + after[1]) / 4];
  });
}

export function scalePath(path, width, height) {
  const sx = width / CONFIG.designWidth;
  const sy = height / CONFIG.designHeight;
  return {
    ...path,
    corridorWidth: path.corridorWidth * Math.min(sx, sy),
    points: path.points.map(([x, y]) => ({ x: x * sx, y: y * sy })),
  };
}

export function getStart(path) {
  return path.points[0];
}

export function getGoal(path) {
  return path.points[path.points.length - 1];
}

export function distanceToPolyline(point, path) {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < path.points.length - 1; index += 1) {
    const distance = distanceToSegment(point, path.points[index], path.points[index + 1]);
    best = Math.min(best, distance);
  }
  return best;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return distance(point, start);
  }
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getPathLength(path) {
  let total = 0;
  for (let index = 0; index < path.points.length - 1; index += 1) {
    total += distance(path.points[index], path.points[index + 1]);
  }
  return total;
}

// Returns the centerline position at an arc-length distance from Start.
export function pointAtDistance(path, distanceAlong) {
  const totalLength = getPathLength(path);
  const targetDistance = Math.min(totalLength, Math.max(0, distanceAlong));
  let travelled = 0;

  for (let index = 0; index < path.points.length - 1; index += 1) {
    const start = path.points[index];
    const end = path.points[index + 1];
    const length = distance(start, end);
    if (travelled + length >= targetDistance) {
      const ratio = length === 0 ? 0 : (targetDistance - travelled) / length;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    travelled += length;
  }

  return { ...path.points.at(-1) };
}

// Returns the nearest point on the centerline, its distance, and how far along the path it lies.
export function closestPointOnPath(point, path) {
  let best = { x: path.points[0].x, y: path.points[0].y, distance: Number.POSITIVE_INFINITY, distanceAlong: 0 };
  let travelled = 0;
  for (let index = 0; index < path.points.length - 1; index += 1) {
    const start = path.points[index];
    const end = path.points[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    const length = Math.sqrt(lengthSq);
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
    const nearest = { x: start.x + t * dx, y: start.y + t * dy };
    const gap = distance(point, nearest);
    if (gap < best.distance) {
      best = { ...nearest, distance: gap, distanceAlong: travelled + t * length };
    }
    travelled += length;
  }
  return best;
}

// Returns the centerline points from Start up to a distance along the path.
export function slicePathPoints(path, distanceAlong) {
  return slicePathRange(path, 0, distanceAlong);
}

// Returns the centerline points between two distances along the path.
export function slicePathRange(path, fromDistance, toDistance) {
  const points = [];
  let travelled = 0;
  for (let index = 0; index < path.points.length - 1 && travelled < toDistance; index += 1) {
    const start = path.points[index];
    const end = path.points[index + 1];
    const length = distance(start, end);
    const pointAt = (along) => {
      const ratio = length === 0 ? 0 : (along - travelled) / length;
      return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
    };
    if (travelled + length >= fromDistance) {
      if (points.length === 0) points.push(pointAt(Math.max(fromDistance, travelled)));
      points.push(pointAt(Math.min(toDistance, travelled + length)));
    }
    travelled += length;
  }
  return points;
}
