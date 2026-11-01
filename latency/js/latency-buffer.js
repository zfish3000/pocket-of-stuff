export class LatencyBuffer {
  constructor({ maxAgeMs = 2500 } = {}) {
    this.maxAgeMs = maxAgeMs;
    this.samples = [];
  }

  clear() {
    this.samples = [];
  }

  addSample(sample) {
    if (!Number.isFinite(sample.time) || !Number.isFinite(sample.x) || !Number.isFinite(sample.y)) {
      throw new Error('Latency samples require finite time, x, and y values.');
    }
    this.samples.push({ time: sample.time, x: sample.x, y: sample.y });
    const oldestAllowed = sample.time - this.maxAgeMs;
    while (this.samples.length > 2 && this.samples[0].time < oldestAllowed) {
      this.samples.shift();
    }
  }

  getLatestSample() {
    return this.samples[this.samples.length - 1] ?? null;
  }

  getDelayedSample(currentTime, requestedLatencyMs) {
    if (this.samples.length === 0) {
      return null;
    }

    const targetTime = currentTime - requestedLatencyMs;

    if (requestedLatencyMs <= 0 || targetTime >= this.samples[this.samples.length - 1].time) {
      return this.formatSample(this.samples[this.samples.length - 1], currentTime, requestedLatencyMs);
    }

    if (targetTime <= this.samples[0].time) {
      return this.formatSample(this.samples[0], currentTime, requestedLatencyMs);
    }

    for (let index = this.samples.length - 1; index > 0; index -= 1) {
      const after = this.samples[index];
      const before = this.samples[index - 1];
      if (before.time <= targetTime && targetTime <= after.time) {
        const span = after.time - before.time || 1;
        const ratio = (targetTime - before.time) / span;
        return this.formatSample({
          time: targetTime,
          x: before.x + (after.x - before.x) * ratio,
          y: before.y + (after.y - before.y) * ratio,
        }, currentTime, requestedLatencyMs);
      }
    }

    return this.formatSample(this.samples[0], currentTime, requestedLatencyMs);
  }

  // Treat mouse positions as held until the next input event. This prevents a later event from
  // being interpolated backward through a pause and appearing before its requested delay.
  getDelayedHeldSample(currentTime, requestedLatencyMs) {
    if (this.samples.length === 0) return null;
    const targetTime = currentTime - requestedLatencyMs;
    if (requestedLatencyMs <= 0 || targetTime >= this.samples.at(-1).time) {
      return this.formatSample(this.samples.at(-1), currentTime, requestedLatencyMs);
    }

    let held = this.samples[0];
    for (const sample of this.samples) {
      if (sample.time > targetTime) break;
      held = sample;
    }
    return this.formatSample(held, currentTime, requestedLatencyMs);
  }

  formatSample(sample, currentTime, requestedLatencyMs) {
    return {
      x: round(sample.x),
      y: round(sample.y),
      sampleTime: round(sample.time),
      requestedLatencyMs,
      actualSampleAgeMs: round(currentTime - sample.time),
    };
  }
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
