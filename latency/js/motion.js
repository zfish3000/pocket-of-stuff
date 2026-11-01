import { closestPointOnPath } from './paths.js';

// A cursor driven like a puck: mouse movement adds velocity, and drag slows it down over time.
export class VelocityCursor {
  constructor({ x, y, gain, drag, maxSpeed, maxStepPx = 4 }) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.gain = gain;
    this.drag = drag;
    this.maxSpeed = maxSpeed;
    this.maxStepPx = maxStepPx;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  push(dx, dy) {
    this.vx += dx * this.gain;
    this.vy += dy * this.gain;
    const speed = this.speed;
    if (speed > this.maxSpeed) {
      this.vx *= this.maxSpeed / speed;
      this.vy *= this.maxSpeed / speed;
    }
  }

  // Moves the cursor in small sub-steps so it cannot tunnel through a wall.
  step(dtMs, constrain) {
    const dt = dtMs / 1000;
    const steps = Math.max(1, Math.ceil((this.speed * dt) / this.maxStepPx));
    let contact = false;
    for (let index = 0; index < steps; index += 1) {
      this.x += (this.vx * dt) / steps;
      this.y += (this.vy * dt) / steps;
      const result = constrain({ x: this.x, y: this.y });
      if (!result.contact) continue;
      contact = true;
      this.x = result.point.x;
      this.y = result.point.y;
      // Cancel only the velocity that pushes into the wall, so the cursor slides along it.
      const outward = this.vx * result.normal.x + this.vy * result.normal.y;
      if (outward > 0) {
        this.vx -= outward * result.normal.x;
        this.vy -= outward * result.normal.y;
      }
    }
    const decay = Math.exp(-this.drag * dt);
    this.vx *= decay;
    this.vy *= decay;
    return { contact };
  }
}

// Keeps a round cursor of the given radius inside the walled corridor around the path.
export function constrainToCorridor(point, path, cursorRadius, tolerancePx = 0.5) {
  const nearest = closestPointOnPath(point, path);
  const limit = path.corridorWidth / 2 - cursorRadius;
  if (nearest.distance < limit - tolerancePx || nearest.distance === 0) {
    return { point, contact: false };
  }
  const normal = {
    x: (point.x - nearest.x) / nearest.distance,
    y: (point.y - nearest.y) / nearest.distance,
  };
  const clamped = nearest.distance > limit
    ? { x: nearest.x + normal.x * limit, y: nearest.y + normal.y * limit }
    : point;
  return { point: clamped, contact: true, normal };
}

// Keeps the cursor on the canvas when a version has no walls.
export function constrainToRect(point, width, height) {
  const x = Math.min(width, Math.max(0, point.x));
  const y = Math.min(height, Math.max(0, point.y));
  if (x === point.x && y === point.y) {
    return { point, contact: false };
  }
  const normal = { x: Math.sign(point.x - x), y: Math.sign(point.y - y) };
  const length = Math.hypot(normal.x, normal.y);
  return { point: { x, y }, contact: true, normal: { x: normal.x / length, y: normal.y / length } };
}
