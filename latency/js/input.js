export class MouseInput {
  constructor(canvas, onSample, onInterrupted = () => {}) {
    this.canvas = canvas;
    this.ownerDocument = canvas.ownerDocument;
    this.onSample = onSample;
    this.onInterrupted = onInterrupted;
    this.position = null;
    this.movement = { x: 0, y: 0 };
    this.active = false;
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
  }

  async start(initialPosition) {
    const locked = await acquirePointerLock(this.canvas);
    if (!locked) return false;

    this.position = {
      time: performance.now(),
      x: initialPosition.x,
      y: initialPosition.y,
    };
    this.movement = { x: 0, y: 0 };
    this.active = true;
    this.ownerDocument.addEventListener('pointermove', this.handlePointerMove);
    this.ownerDocument.addEventListener('pointerlockchange', this.handlePointerLockChange);
    return true;
  }

  stop() {
    this.active = false;
    this.ownerDocument.removeEventListener('pointermove', this.handlePointerMove);
    this.ownerDocument.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    if (this.ownerDocument.pointerLockElement === this.canvas) {
      this.ownerDocument.exitPointerLock();
    }
  }

  getPosition() {
    return this.position;
  }

  // Returns the raw mouse movement since the last call, in CSS pixels, and resets it.
  takeMovement() {
    const movement = this.movement;
    this.movement = { x: 0, y: 0 };
    return movement;
  }

  handlePointerMove(event) {
    if (!this.active) return;
    this.movement.x += event.movementX;
    this.movement.y += event.movementY;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.position = {
      time: performance.now(),
      x: clamp(this.position.x + event.movementX * scaleX, 0, this.canvas.width),
      y: clamp(this.position.y + event.movementY * scaleY, 0, this.canvas.height),
    };
    this.onSample(this.position);
  }

  handlePointerLockChange() {
    if (this.active && this.ownerDocument.pointerLockElement !== this.canvas) {
      this.active = false;
      this.ownerDocument.removeEventListener('pointermove', this.handlePointerMove);
      this.ownerDocument.removeEventListener('pointerlockchange', this.handlePointerLockChange);
      this.onInterrupted();
    }
  }
}

function acquirePointerLock(canvas) {
  const ownerDocument = canvas.ownerDocument;
  if (!canvas.requestPointerLock) return Promise.resolve(false);
  if (ownerDocument.pointerLockElement === canvas) return Promise.resolve(true);

  return new Promise((resolve) => {
    const finish = (locked) => {
      ownerDocument.removeEventListener('pointerlockchange', handleChange);
      ownerDocument.removeEventListener('pointerlockerror', handleError);
      resolve(locked);
    };
    const handleChange = () => {
      if (ownerDocument.pointerLockElement === canvas) finish(true);
    };
    const handleError = () => finish(false);

    ownerDocument.addEventListener('pointerlockchange', handleChange);
    ownerDocument.addEventListener('pointerlockerror', handleError);
    try {
      const request = canvas.requestPointerLock();
      request?.catch(handleError);
    } catch {
      finish(false);
    }
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
