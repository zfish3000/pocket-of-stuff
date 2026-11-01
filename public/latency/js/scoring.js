import { CONFIG } from './config.js';

export function summarizeTrial({ participantId, sessionId, interfaceVersion = 'classic', trial, samples, goalReached, timedOut, wallHits = 0, progressSliceErrors = [], progressPercent = null }) {
  const errors = samples.map((sample) => sample.pathErrorPx);
  const mean = errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : 0;
  const rms = errors.length ? Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length) : 0;
  const inside = samples.filter((sample) => sample.insideCorridor).length;
  const touching = samples.filter((sample) => sample.wallContact).length;
  const finalSample = samples[samples.length - 1] ?? { elapsedMs: 0, distanceToGoalPx: 0 };
  const speeds = samples.map((sample) => sample.speedPxS).filter((speed) => Number.isFinite(speed));
  const progressMean = progressSliceErrors.length
    ? progressSliceErrors.reduce((sum, value) => sum + value, 0) / progressSliceErrors.length
    : 0;

  return {
    participant_id: participantId,
    session_id: sessionId,
    interface_version: interfaceVersion,
    trial_number: trial.trialNumber,
    phase: trial.phase,
    difficulty: trial.difficulty,
    path_id: trial.pathId,
    latency_ms: trial.latencyMs,
    repeat_number: trial.repeatNumber,
    goal_reached: Boolean(goalReached),
    timed_out: Boolean(timedOut),
    completion_time_ms: round(finalSample.elapsedMs),
    progress_percent: progressPercent === null ? '' : round(progressPercent),
    mean_progress_error_px: round(progressMean),
    progress_slice_count: progressSliceErrors.length,
    mean_speed_px_s: speeds.length ? round(speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length) : '',
    mean_path_error_px: round(mean),
    rms_path_error_px: round(rms),
    max_path_error_px: round(errors.length ? Math.max(...errors) : 0),
    inside_corridor_percent: round(errors.length ? (inside / errors.length) * 100 : 0),
    outside_corridor_percent: round(errors.length ? ((errors.length - inside) / errors.length) * 100 : 0),
    endpoint_error_px: round(finalSample.distanceToGoalPx),
    wall_hits: wallHits,
    wall_contact_percent: round(errors.length ? (touching / errors.length) * 100 : 0),
    ...summarizeFrameTiming(samples, trial.latencyMs),
    baseline_mean_progress_error_px: '',
    normalized_mean_progress_error: '',
    baseline_rms_error_px: '',
    normalized_rms_error: '',
  };
}

export function summarizeTrackingTrial({ participantId, sessionId, interfaceVersion, trial, samples, trialDurationMs }) {
  const errors = samples.map((sample) => sample.trackingErrorPx);
  const rms = errors.length
    ? Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length)
    : 0;

  return {
    participant_id: participantId,
    session_id: sessionId,
    interface_version: interfaceVersion,
    trial_number: trial.trialNumber,
    phase: trial.phase,
    difficulty: trial.difficulty,
    path_id: trial.pathId,
    latency_ms: trial.latencyMs,
    repeat_number: trial.repeatNumber,
    trial_duration_ms: trialDurationMs,
    error_metric: 'rms_cursor_to_target_distance_px',
    rms_tracking_error_px: round(rms),
    ...summarizeFrameTiming(samples, trial.latencyMs),
    baseline_rms_tracking_error_px: '',
    normalized_rms_tracking_error: '',
  };
}

export function normalizeSummaries(summaries) {
  const pathBaselines = collectBaselineMeans(summaries, 'rms_path_error_px');
  const progressBaselines = collectBaselineMeans(summaries, 'mean_progress_error_px');
  const trackingBaselines = collectBaselineMeans(summaries, 'rms_tracking_error_px');

  return summaries.map((summary) => {
    if (typeof summary.rms_tracking_error_px === 'number') {
      const baseline = trackingBaselines.get(summary.difficulty);
      if (!baseline) return { ...summary };
      return {
        ...summary,
        baseline_rms_tracking_error_px: baseline,
        normalized_rms_tracking_error: round(summary.rms_tracking_error_px / baseline),
      };
    }
    const normalized = { ...summary };
    const baseline = pathBaselines.get(summary.difficulty);
    if (baseline) {
      normalized.baseline_rms_error_px = baseline;
      normalized.normalized_rms_error = round(summary.rms_path_error_px / baseline);
    }
    const progressBaseline = progressBaselines.get(summary.difficulty);
    if (progressBaseline && typeof summary.mean_progress_error_px === 'number') {
      normalized.baseline_mean_progress_error_px = progressBaseline;
      normalized.normalized_mean_progress_error = round(summary.mean_progress_error_px / progressBaseline);
    }
    return normalized;
  });
}

// Records the distance from the center line once per equal slice of forward progress, so every part of
// the path counts the same no matter how fast or slowly the participant moves. When the ball crosses
// several slices in one frame, the values in between are interpolated.
//
// Each slice also becomes one point of the progress trace: where the displayed ball was, when, and how
// fast it moved. The trace is the saved motion record, so it is the same size on every screen.
export function createProgressSlices(slicePx, start = { x: 0, y: 0 }) {
  return { slicePx, nextPx: slicePx, lastPx: 0, last: { errorPx: 0, x: start.x, y: start.y, elapsedMs: 0 }, errors: [], points: [] };
}

// point: { errorPx, x, y, elapsedMs } are interpolated; speedPxS and wallContact come from the current frame.
export function addProgressSlices(slices, toPx, point) {
  const current = typeof point === 'number' ? { ...slices.last, errorPx: point } : point;
  const fromPx = slices.lastPx;
  const mix = (key, t) => slices.last[key] + (current[key] - slices.last[key]) * t;
  while (slices.nextPx <= toPx) {
    const t = toPx === fromPx ? 1 : (slices.nextPx - fromPx) / (toPx - fromPx);
    const errorPx = mix('errorPx', t);
    slices.errors.push(errorPx);
    slices.points.push({
      progressPx: slices.nextPx,
      errorPx,
      x: mix('x', t),
      y: mix('y', t),
      elapsedMs: mix('elapsedMs', t),
      speedPxS: current.speedPxS ?? null,
      wallContact: Boolean(current.wallContact),
    });
    slices.nextPx += slices.slicePx;
  }
  slices.lastPx = toPx;
  slices.last = { errorPx: current.errorPx, x: current.x, y: current.y, elapsedMs: current.elapsedMs };
}

// Dropped frames show up as gaps between rendered samples that are much longer than the typical gap.
// Delay accuracy only uses frames after the first requestedLatencyMs of the trial: before then, no
// sample is old enough yet, so the displayed ball is necessarily less delayed than requested.
export function summarizeFrameTiming(samples, requestedLatencyMs = 0) {
  const intervals = [];
  for (let index = 1; index < samples.length; index += 1) {
    intervals.push(samples[index].elapsedMs - samples[index - 1].elapsedMs);
  }
  const median = intervals.length ? [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length / 2)] : 0;
  const longFrames = intervals.filter((interval) => interval > median * 1.5).length;
  const ages = samples
    .filter((sample) => sample.elapsedMs >= requestedLatencyMs)
    .map((sample) => sample.actualSampleAgeMs)
    .filter((age) => Number.isFinite(age));
  const meanAge = ages.length ? ages.reduce((sum, age) => sum + age, 0) / ages.length : null;
  return {
    frame_count: samples.length,
    median_frame_interval_ms: round(median),
    estimated_refresh_hz: median > 0 ? round(1000 / median) : '',
    long_frame_percent: round(intervals.length ? (longFrames / intervals.length) * 100 : 0),
    max_frame_interval_ms: round(intervals.length ? Math.max(...intervals) : 0),
    mean_actual_sample_age_ms: meanAge === null ? '' : round(meanAge),
    mean_delay_error_ms: meanAge === null ? '' : round(meanAge - requestedLatencyMs),
  };
}

// The threshold is the shortest delay at which the participant's average normalized error reaches the
// decline ratio and stays there at every longer delay. A trial that times out counts as a decline.
export function findLatencyThreshold(summaries, { ratio = CONFIG.declineRatio } = {}) {
  const measured = summaries.filter((summary) => summary.phase === 'experimental'
    && typeof summary.normalized_mean_progress_error === 'number');
  const latencies = [...new Set(measured.map((summary) => summary.latency_ms))].sort((a, b) => a - b);
  const levels = latencies.map((latencyMs) => {
    const rows = measured.filter((summary) => summary.latency_ms === latencyMs);
    const meanNormalized = rows.reduce((sum, row) => sum + row.normalized_mean_progress_error, 0) / rows.length;
    const timedOutTrials = rows.filter((row) => row.timed_out).length;
    return {
      latency_ms: latencyMs,
      trials: rows.length,
      mean_normalized_error: round(meanNormalized),
      timed_out_trials: timedOutTrials,
      declined: timedOutTrials > 0 || meanNormalized >= ratio,
    };
  });
  let thresholdMs = null;
  for (let index = levels.length - 1; index >= 0 && levels[index].declined; index -= 1) {
    thresholdMs = levels[index].latency_ms;
  }
  return {
    measure: 'mean_progress_error_px normalized to the two 0 ms trials',
    decline_ratio: ratio,
    threshold_ms: thresholdMs,
    first_decline_ms: levels.find((level) => level.declined)?.latency_ms ?? null,
    baseline_timed_out: summaries.some((summary) => summary.phase === 'baseline' && summary.timed_out),
    levels,
  };
}

function collectBaselineMeans(summaries, field) {
  const valuesByDifficulty = new Map();
  for (const summary of summaries) {
    if (summary.phase !== 'baseline' || typeof summary[field] !== 'number') continue;
    const values = valuesByDifficulty.get(summary.difficulty) ?? [];
    values.push(summary[field]);
    valuesByDifficulty.set(summary.difficulty, values);
  }
  return new Map([...valuesByDifficulty.entries()].map(([difficulty, values]) => [
    difficulty,
    round(values.reduce((sum, value) => sum + value, 0) / values.length),
  ]));
}

export function isTimedOut(elapsedMs, timeoutMs) {
  return elapsedMs >= timeoutMs;
}

export function isGoalReached(distanceToGoalPx, goalRadiusPx) {
  return distanceToGoalPx <= goalRadiusPx;
}

export function round(value) {
  return Math.round(value * 1000) / 1000;
}
